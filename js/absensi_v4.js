// ============================================================
// absensi_v4.js — GPS Fix Lengkap + Fallback + Debug Tool
// ============================================================

let _streamV4    = null;
let _lastGPSPos  = null;

// ─── TOMBOL ABSEN UTAMA ───────────────────────────────────────
async function mulaiAbsenMasuk() {
  const btn = document.getElementById('btn-absen-masuk');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  try {
    // 1. Cek lokasi dulu sebelum buka GPS
    const status = await callAPI('getStatusAbsenHariIni', {});
    if (status?.sudah_absen_masuk) {
      showToast('Sudah absen masuk pukul ' + status.jam_masuk, 'warning');
      return;
    }

    // 2. Coba dapatkan GPS
    let posisi = null;
    try {
      posisi = await _dapatkanGPS('masuk');
    } catch(gpsErr) {
      // GPS gagal — tawarkan solusi
      _tutupKamera();
      await _tampilGPSGagal(gpsErr.message, 'masuk');
      return;
    }

    // 3. GPS berhasil — lanjut ke kamera
    await _prosesAbsenDenganFotoV4('masuk', posisi);
    await loadStatusAbsenHariIni();
  } catch(e) {
    if (e.message !== 'DIBATALKAN') showToast(e.message, 'error', 7000);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

async function mulaiAbsenKeluar() {
  const btn = document.getElementById('btn-absen-keluar');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  try {
    let posisi = null;
    try {
      posisi = await _dapatkanGPS('keluar');
    } catch(e) {
      posisi = _lastGPSPos; // Keluar: pakai GPS terakhir jika ada
    }
    await _prosesAbsenDenganFotoV4('keluar', posisi);
    await loadStatusAbsenHariIni();
  } catch(e) {
    if (e.message !== 'DIBATALKAN') showToast(e.message, 'error', 7000);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

// ─── GPS ENGINE — Multi-retry dengan fallback ────────────────
async function _dapatkanGPS(tipe) {
  // Cek HTTPS
  if (location.protocol !== 'https:' &&
      !['localhost','127.0.0.1'].includes(location.hostname)) {
    throw new Error(
      '🔒 GPS membutuhkan HTTPS!\n\n' +
      'Akses aplikasi menggunakan URL https://... bukan http://...\n' +
      'Atau buka melalui: https://USERNAME.github.io/...'
    );
  }

  // Cek permission
  if (navigator.permissions) {
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      if (perm.state === 'denied') {
        throw new Error(
          '❌ Izin GPS Ditolak!\n\n' +
          '📱 Android Chrome:\n' +
          '   Ketuk 🔒 di address bar → Izin → Lokasi → Izinkan\n\n' +
          '📱 iPhone/iPad Safari:\n' +
          '   Settings → Privacy → Location Services → Safari → Allow\n\n' +
          'Setelah mengizinkan, muat ulang halaman.'
        );
      }
    } catch(pe) {
      if (pe.message.includes('GPS') || pe.message.includes('Izin') ||
          pe.message.includes('HTTPS') || pe.message.includes('Ditolak')) throw pe;
    }
  }

  _showGPSStatus('📡 Mendapatkan koordinat GPS...');

  // 4 percobaan dengan seting berbeda
  const opts = [
    { enableHighAccuracy: true,  timeout: 10000, maximumAge: 0     },
    { enableHighAccuracy: true,  timeout: 15000, maximumAge: 5000  },
    { enableHighAccuracy: false, timeout: 18000, maximumAge: 15000 },
    { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 }
  ];

  let lastErr = null;
  for (let i = 0; i < opts.length; i++) {
    try {
      _showGPSStatus(i === 0
        ? '📡 Mendapatkan GPS...'
        : `🔄 Percobaan ${i+1}/4 — mohon tunggu...`);
      const pos = await _requestGPS(opts[i]);
      _hideGPSStatus();
      _lastGPSPos = pos;
      return pos;
    } catch(e) {
      lastErr = e;
      // Permission denied — stop immediately
      if (e.code === 1) {
        _hideGPSStatus();
        throw new Error(
          '❌ Izin GPS Ditolak!\n\n' +
          'Aktifkan izin lokasi untuk browser ini, lalu muat ulang halaman.'
        );
      }
      // Coba lagi setelah jeda
      if (i < opts.length - 1) await _tunggu(1200);
    }
  }

  _hideGPSStatus();
  throw new Error(
    '⏱️ GPS Timeout setelah 4 percobaan.\n\n' +
    'Tips memperbaiki:\n' +
    '• Pindah ke tempat terbuka atau dekat jendela\n' +
    '• Aktifkan "Mode Akurasi Tinggi" di Pengaturan GPS HP\n' +
    '• Buka Google Maps sebentar, lalu coba lagi\n' +
    '• Matikan dan nyalakan GPS HP\n' +
    (tipe === 'keluar' ? '\n💡 Untuk absen keluar, coba ketuk tombol lagi.' : '')
  );
}

function _requestGPS(opts) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser tidak mendukung GPS. Gunakan Chrome/Safari terbaru.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

function _tunggu(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── GPS STATUS INDICATOR ─────────────────────────────────────
function _showGPSStatus(msg) {
  let el = document.getElementById('gps-status-pill');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gps-status-pill';
    el.style.cssText = `
      position:fixed;bottom:76px;left:50%;transform:translateX(-50%);
      background:rgba(30,41,59,.92);color:#fff;padding:9px 18px;
      border-radius:30px;font-size:13px;font-weight:600;z-index:9200;
      display:flex;align-items:center;gap:8px;
      box-shadow:0 4px 20px rgba(0,0,0,.25);backdrop-filter:blur(8px);
      white-space:nowrap;transition:opacity .2s ease`;
    el.innerHTML = `
      <div class="spinner" style="width:14px;height:14px;border:2px solid
        rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;
        animation:spin .7s linear infinite;flex-shrink:0"></div>
      <span id="gps-status-text"></span>`;
    document.body.appendChild(el);
  }
  const t = document.getElementById('gps-status-text');
  if (t) t.textContent = msg;
  el.style.opacity = '1';
}

function _hideGPSStatus() {
  const el = document.getElementById('gps-status-pill');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el?.remove(), 300);
}

// ─── MODAL KETIKA GPS GAGAL ───────────────────────────────────
async function _tampilGPSGagal(errMsg, tipe) {
  // Cek apakah lokasi kantor sudah dikonfigurasi
  let lokasiInfo = '';
  try {
    const status = await callAPI('getStatusAbsenHariIni', {});
    if (status && !status.lokasi_aktif) {
      lokasiInfo = `<div style="background:#FFF8DC;border:1px solid #D97706;border-radius:8px;
        padding:12px;margin-bottom:12px;font-size:13px;color:#92400E;line-height:1.6">
        <strong>⚠️ Lokasi kantor belum dikonfigurasi!</strong><br>
        Hubungi Super Admin untuk mengisi koordinat kantor di menu <strong>Lokasi Kantor</strong>.
        Tanpa konfigurasi ini, absensi GPS tidak bisa berjalan.
      </div>`;
    }
  } catch(e) {}

  const modal = document.createElement('div');
  modal.id    = 'modal-gps-gagal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9500;
    display:flex;align-items:flex-end;backdrop-filter:blur(4px)`;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:24px;width:100%;
      max-height:85vh;overflow-y:auto;animation:slideUp 0.3s ease">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:48px">📡</div>
        <h3 style="font-size:17px;font-weight:700;margin:8px 0 4px;color:#E53E3E">
          GPS Tidak Bisa Digunakan
        </h3>
        <p style="font-size:13px;color:#64748B;line-height:1.5">
          GPS wajib untuk absensi.<br>Silakan perbaiki masalah GPS terlebih dahulu.
        </p>
      </div>

      ${lokasiInfo}

      <div style="background:#FFF5F5;border:1px solid #FCA5A5;border-radius:10px;
        padding:12px;margin-bottom:16px">
        <p style="font-size:12px;color:#C53030;line-height:1.7;white-space:pre-line;margin:0">
${errMsg.substring(0, 400)}
        </p>
      </div>

      <button class="btn btn--primary btn--full btn--lg" style="margin-bottom:10px"
        onclick="document.getElementById('modal-gps-gagal').remove();mulaiAbsenMasuk()">
        🔄 Coba GPS Lagi
      </button>

      <button class="btn btn--ghost btn--full" style="margin-bottom:10px"
        onclick="_tampilPanduanGPS()">
        📖 Cara Mengaktifkan GPS
      </button>

      <button class="btn btn--ghost btn--full"
        onclick="document.getElementById('modal-gps-gagal').remove()">
        Tutup
      </button>

      <div style="background:#F0FFF4;border-radius:8px;padding:10px;margin-top:12px;
        font-size:12px;color:#276749;line-height:1.6;text-align:center">
        💡 Jika bertugas di luar kantor, ajukan <strong>Dinas Luar</strong>
        melalui menu Pengajuan terlebih dahulu.
        Absensi Dinas Luar tidak memerlukan validasi radius.
      </div>
    </div>`;

  document.body.appendChild(modal);
}

function _tampilPanduanGPS() {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isSamsung = /Samsung/i.test(navigator.userAgent);

  showModal('📖 Cara Aktifkan GPS', `
    <div style="line-height:1.8;font-size:13px">
      ${isIOS ? `
      <strong>📱 iPhone / iPad:</strong><br>
      1. Settings → Privacy & Security<br>
      2. Location Services → ON<br>
      3. Safari → While Using the App<br>
      4. Kembali ke browser, muat ulang halaman
      ` : isSamsung ? `
      <strong>📱 Samsung Android:</strong><br>
      1. Tarik notif bar ke bawah → aktifkan ikon Lokasi<br>
      2. Ketuk lama ikon Lokasi → pilih "Akurasi Tinggi"<br>
      3. Buka Chrome → ketuk 🔒 → Izin → Lokasi → Izinkan<br>
      4. Muat ulang halaman aplikasi
      ` : `
      <strong>📱 Android Chrome:</strong><br>
      1. Pastikan GPS HP aktif (ikon 📍 di status bar)<br>
      2. Ketuk 🔒 di address bar Chrome<br>
      3. Ketuk "Izin" → "Lokasi" → "Izinkan"<br>
      4. Muat ulang halaman aplikasi<br><br>
      <strong>🔧 Jika masih gagal:</strong><br>
      • Settings HP → Lokasi → Mode → Akurasi Tinggi<br>
      • Buka Google Maps sebentar untuk "memanaskan" GPS<br>
      • Pindah ke tempat lebih terbuka
      `}
    </div>`
  );
}

// Bypass absen tanpa GPS DIHAPUS — GPS wajib digunakan
// Jika di luar kantor, karyawan harus mengajukan Dinas Luar
// melalui menu Pengajuan terlebih dahulu.

// ─── KAMERA ───────────────────────────────────────────────────
async function _ambilFotoSaja(tipe) {
  return new Promise(async (resolve) => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width:{ideal:640}, height:{ideal:640} },
        audio: false
      });
      _streamV4 = stream;
    } catch(e) {
      showToast(
        e.name === 'NotAllowedError'
          ? '❌ Izin kamera ditolak. Aktifkan kamera di browser.'
          : 'Kamera error: ' + e.message,
        'error'
      );
      resolve(null);
      return;
    }

    _bukaKameraModal(tipe, stream, async (b64) => {
      _tutupKameraV4();
      resolve(b64);
    }, () => {
      _tutupKameraV4();
      resolve(null);
    });
  });
}

async function _prosesAbsenDenganFotoV4(jenis, posisi) {
  return new Promise(async (resolve, reject) => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width:{ideal:640}, height:{ideal:640} },
        audio: false
      });
      _streamV4 = stream;
    } catch(e) {
      reject(new Error(
        e.name === 'NotAllowedError'
          ? '❌ Izin kamera ditolak!\n\nAktifkan izin kamera di pengaturan browser.'
          : 'Kamera error: ' + e.message
      ));
      return;
    }

    _bukaKameraModal(jenis, stream, async (b64) => {
      // Tampilkan loading
      const loadEl = document.getElementById('kamera-loading-v4');
      if (loadEl) loadEl.style.display = 'flex';

      try {
        const lat = posisi?.coords?.latitude  ?? null;
        const lon = posisi?.coords?.longitude ?? null;
        const result = await callAPI(
          jenis === 'masuk' ? 'absenMasuk' : 'absenKeluar',
          { lat, lon, foto_base64: b64 }
        );
        _tutupKameraV4();
        showToast(
          result.message + (result.jarak ? ' (±' + result.jarak + 'm)' : ''),
          result.status === 'terlambat' ? 'warning' : 'success', 7000
        );
        resolve(result);
      } catch(e) {
        if (loadEl) loadEl.style.display = 'none';
        _showKameraError(e.message);
      }
    }, () => {
      _tutupKameraV4();
      reject(new Error('DIBATALKAN'));
    });
  });
}

function _bukaKameraModal(jenis, stream, onFoto, onBatal) {
  const modal  = document.createElement('div');
  modal.id     = 'kamera-modal-v4';
  modal.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;display:flex;flex-direction:column';

  modal.innerHTML = `
    <!-- Header -->
    <div style="position:absolute;top:0;left:0;right:0;z-index:20;
      background:linear-gradient(rgba(0,0,0,.8),transparent);
      padding:20px 16px 40px;text-align:center;color:#fff">
      <div style="font-size:15px;font-weight:700">
        ${jenis==='masuk'?'📷 Foto Absen Masuk':'📷 Foto Absen Keluar'}
      </div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">
        Posisikan wajah Anda di tengah lingkaran
      </div>
    </div>

    <!-- Panduan lingkaran -->
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);
      width:210px;height:210px;border:3px solid rgba(255,255,255,.8);
      border-radius:50%;pointer-events:none;z-index:15;
      box-shadow:0 0 0 9999px rgba(0,0,0,.38)"></div>

    <!-- Video -->
    <video id="kamera-vid-v4" style="flex:1;width:100%;object-fit:cover" autoplay playsinline muted></video>

    <!-- Preview -->
    <div id="preview-wrap-v4" style="display:none;flex:1;background:#000;
      align-items:center;justify-content:center">
      <img id="foto-prev-v4" style="max-width:100%;max-height:100%;object-fit:contain">
    </div>

    <!-- Loading overlay -->
    <div id="kamera-loading-v4" style="display:none;position:absolute;inset:0;
      background:rgba(0,0,0,.75);z-index:30;align-items:center;
      justify-content:center;flex-direction:column;gap:14px;color:#fff">
      <div style="width:52px;height:52px;border:4px solid rgba(255,255,255,.2);
        border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite"></div>
      <div style="font-size:14px;font-weight:600">Menyimpan absensi...</div>
    </div>

    <!-- Error overlay -->
    <div id="kamera-err-v4" style="display:none;position:absolute;top:80px;
      left:12px;right:12px;z-index:35;background:rgba(229,62,62,.95);
      color:#fff;border-radius:12px;padding:14px;font-size:12px;
      text-align:center;white-space:pre-line;line-height:1.5;z-index:40"></div>

    <!-- Kontrol bawah -->
    <div style="background:rgba(0,0,0,.85);padding:20px 24px 40px;
      display:flex;align-items:center;justify-content:space-between;
      position:relative;z-index:20">
      <button id="btn-batal-cam" style="background:rgba(255,255,255,.15);color:#fff;
        border:none;border-radius:10px;padding:12px 20px;font-size:14px;cursor:pointer;
        min-width:80px">✕ Batal</button>

      <button id="btn-capture-v4" style="width:72px;height:72px;border-radius:50%;
        background:#fff;border:5px solid rgba(255,255,255,.4);cursor:pointer;
        flex-shrink:0;transition:.15s">
      </button>

      <div id="btn-setelah-v4" style="display:none;flex-direction:column;gap:8px">
        <button id="btn-ulangi-v4" style="background:rgba(255,255,255,.15);color:#fff;
          border:none;border-radius:10px;padding:10px 16px;font-size:13px;cursor:pointer">
          🔄 Ulangi
        </button>
        <button id="btn-gunakan-v4" style="background:#1A9E74;color:#fff;
          border:none;border-radius:10px;padding:10px 16px;font-size:13px;
          font-weight:700;cursor:pointer">
          ✅ Gunakan
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const video = document.getElementById('kamera-vid-v4');
  video.srcObject = stream;
  video.play().catch(() => {});

  let fotoB64 = null;

  // Tombol ambil foto
  document.getElementById('btn-capture-v4').onclick = () => {
    const c   = document.createElement('canvas');
    c.width   = video.videoWidth  || 640;
    c.height  = video.videoHeight || 640;
    const ctx = c.getContext('2d');
    // Mirror untuk selfie
    ctx.translate(c.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, c.width, c.height);
    c.toBlob(blob => {
      if (!blob) { _showKameraError('Gagal mengambil foto'); return; }
      document.getElementById('foto-prev-v4').src        = URL.createObjectURL(blob);
      document.getElementById('kamera-vid-v4').style.display  = 'none';
      document.getElementById('preview-wrap-v4').style.display = 'flex';
      document.getElementById('btn-capture-v4').style.display  = 'none';
      document.getElementById('btn-setelah-v4').style.display  = 'flex';
      const r   = new FileReader();
      r.onload  = e => { fotoB64 = e.target.result.split(',')[1]; };
      r.readAsDataURL(blob);
    }, 'image/jpeg', 0.78);
  };

  // Tombol ulangi
  document.getElementById('btn-ulangi-v4').onclick = () => {
    document.getElementById('kamera-vid-v4').style.display  = 'block';
    document.getElementById('preview-wrap-v4').style.display = 'none';
    document.getElementById('btn-capture-v4').style.display  = 'block';
    document.getElementById('btn-setelah-v4').style.display  = 'none';
    document.getElementById('kamera-err-v4').style.display   = 'none';
    fotoB64 = null;
  };

  // Tombol gunakan
  document.getElementById('btn-gunakan-v4').onclick = () => {
    if (!fotoB64) { _showKameraError('Ambil foto terlebih dahulu'); return; }
    onFoto(fotoB64);
  };

  // Tombol batal
  document.getElementById('btn-batal-cam').onclick = onBatal;
}

function _showKameraError(msg) {
  const el = document.getElementById('kamera-err-v4');
  if (!el) return;
  el.textContent    = msg;
  el.style.display  = 'block';
  setTimeout(() => { if(el) el.style.display = 'none'; }, 10000);
}

function _tutupKameraV4() {
  if (_streamV4) { _streamV4.getTracks().forEach(t => t.stop()); _streamV4 = null; }
  document.getElementById('kamera-modal-v4')?.remove();
  document.body.style.overflow = '';
}

// ─── RIWAYAT ABSENSI ─────────────────────────────────────────
async function loadHalamanAbsensi() {
  const now  = new Date();
  const el   = document.getElementById('absensi-list');
  if (!el) return;

  // Filter controls
  const filterEl = document.getElementById('absensi-filter-bar');
  if (!filterEl) {
    const bar = document.createElement('div');
    bar.id = 'absensi-filter-bar';
    bar.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap';
    bar.innerHTML = `
      <select class="form-control" id="filter-bulan-absensi" style="flex:1;min-width:120px"
        onchange="loadHalamanAbsensi()">
        ${Array.from({length:12},(_,i)=>`<option value="${i+1}"
          ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
      </select>
      <input type="number" class="form-control" id="filter-tahun-absensi"
        value="${now.getFullYear()}" min="2020" style="width:90px"
        onchange="loadHalamanAbsensi()">
      <button class="btn btn--secondary" style="font-size:13px"
        onclick="loadHalamanAbsensi()">🔍</button>`;
    el.before(bar);
  }

  const bulan = parseInt(document.getElementById('filter-bulan-absensi')?.value || now.getMonth()+1);
  const tahun = parseInt(document.getElementById('filter-tahun-absensi')?.value || now.getFullYear());

  el.innerHTML = skeletonCard(5);
  try {
    const data = await callAPI('getAbsensiKaryawan', { bulan, tahun });
    if (!data || data.length === 0) {
      showEmpty('absensi-list', `Belum ada absensi ${bulanNama(bulan)} ${tahun}`);
      return;
    }

    // Hitung ringkasan
    const ring = {
      hadir:0, terlambat:0, alfa:0, izin:0, sakit:0, cuti:0, dinas_luar:0
    };
    data.forEach(a => { if(ring[a.status]!==undefined) ring[a.status]++; });

    const sorted = [...data].sort((a,b) => String(b.tanggal).localeCompare(String(a.tanggal)));

    el.innerHTML = `
      <!-- Ringkasan -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">
        ${[
          ['✅','Hadir',ring.hadir,'#1A9E74'],
          ['⏰','Telat',ring.terlambat,'#D97706'],
          ['❌','Alfa',ring.alfa,'#E53E3E'],
          ['📝','Izin/Cuti',ring.izin+ring.cuti+ring.sakit+ring.dinas_luar,'#6C63FF']
        ].map(([ic,lb,val,c]) => `
          <div style="background:#fff;border-radius:10px;padding:10px 6px;text-align:center;
            border:1px solid #E2E8F0">
            <div style="font-size:18px">${ic}</div>
            <div style="font-size:18px;font-weight:700;color:${c}">${val}</div>
            <div style="font-size:11px;color:#94A3B8">${lb}</div>
          </div>`).join('')}
      </div>
      <!-- Daftar -->
      ${sorted.map(a => `
        <div style="background:#fff;border-radius:12px;padding:12px 14px;
          margin-bottom:8px;border:1px solid #E2E8F0;
          display:flex;align-items:center;gap:12px">
          <div style="font-size:24px;flex-shrink:0">${_stEmoji(a.status)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px">
              ${formatTanggal(a.tanggal)}
              <span style="color:#94A3B8;font-weight:400;font-size:12px">${a.hari||''}</span>
            </div>
            <div style="font-size:12px;color:#64748B;margin-top:2px">
              ${a.jam_masuk ? '🟢 ' + a.jam_masuk : ''}
              ${a.jam_keluar ? ' → 🔴 ' + a.jam_keluar : ''}
              ${!a.jam_masuk ? '<span style="color:#94A3B8">—</span>' : ''}
            </div>
            ${a.keterangan ? `<div style="font-size:11px;color:#94A3B8;margin-top:2px">${String(a.keterangan).substring(0,60)}</div>` : ''}
          </div>
          <div>${badgeStatus(a.status)}</div>
        </div>`).join('')}`;
  } catch(e) { showError('absensi-list', 'Gagal memuat: ' + e.message); }
}

function _stEmoji(s) {
  return {hadir:'✅',terlambat:'⏰',alfa:'❌',izin:'📝',sakit:'🏥',cuti:'🏖️',dinas_luar:'🚗'}[s] || '❓';
}

// ─── TOOL DEBUG GPS (untuk troubleshooting) ──────────────────
async function debugGPSAdmin() {
  showToast('Mendapatkan posisi GPS...', 'info', 3000);
  try {
    const pos   = await _requestGPS({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    const lat   = pos.coords.latitude;
    const lon   = pos.coords.longitude;
    const hasil = await callAPI('debugGPS', { lat, lon });

    showModal('🔍 Debug GPS', `
      <div style="font-size:13px;line-height:1.8">
        <strong>Posisi Anda:</strong><br>
        Lat: <code>${lat.toFixed(6)}</code> | Lon: <code>${lon.toFixed(6)}</code><br>
        Akurasi: ±${Math.round(pos.coords.accuracy || 0)} meter<br><br>
        <strong>Hasil Validasi Server:</strong><br>
        ${hasil.ok
          ? `<span style="color:#1A9E74;font-weight:700">✅ ${hasil.pesan}</span>`
          : `<span style="color:#E53E3E;font-weight:700">❌ ${hasil.pesan}</span>`}<br><br>
        ${(hasil.lokasi_list || []).map(l => `
          <div style="background:#F8FAFC;border-radius:8px;padding:10px;margin-top:6px">
            <strong>${l.nama}</strong><br>
            Jarak: <strong style="color:${l.dalam_radius?'#1A9E74':'#E53E3E'}">${l.jarak_meter} m</strong>
            (max ${l.radius} m)
            ${l.dalam_radius ? '✅' : '❌'}
          </div>`).join('')}
        ${hasil.solusi ? `<div style="background:#FFF8DC;border-radius:8px;padding:10px;margin-top:8px;color:#B7791F"><strong>💡 Solusi:</strong><br>${hasil.solusi}</div>` : ''}
      </div>`);
  } catch(e) {
    showModal('❌ GPS Gagal', `<p style="font-size:13px;color:#64748B">${e.message}</p>`);
  }
}

// ─── ALIAS untuk kompatibilitas app.js ───────────────────────
async function mulaiAbsenMasukV4() { return mulaiAbsenMasuk(); }
async function mulaiAbsenKeluarV4() { return mulaiAbsenKeluar(); }

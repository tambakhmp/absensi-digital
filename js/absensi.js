
function absSetMode(mode) {
  const btnB = document.getElementById('abs-tab-bln');
  const btnR = document.getElementById('abs-tab-rng');
  const divB = document.getElementById('abs-mode-bln');
  const divR = document.getElementById('abs-mode-rng');
  if (mode === 'bulan') {
    if (divB) divB.style.display = 'flex';
    if (divR) divR.style.display = 'none';
    if (btnB) { btnB.className = 'btn btn--primary'; }
    if (btnR) { btnR.className = 'btn btn--ghost'; }
  } else {
    if (divB) divB.style.display = 'none';
    if (divR) divR.style.display = 'flex';
    if (btnR) { btnR.className = 'btn btn--primary'; }
    if (btnB) { btnB.className = 'btn btn--ghost'; }
  }
}

// ============================================================
// absensi.js v5 — GPS Wajib, Radius Keras, Dinas Luar Berbatas
// - GPS wajib untuk semua absensi, tidak ada bypass
// - Di luar radius = DITOLAK, tidak bisa absen
// - Dinas Luar = GPS wajib tapi radius tidak dicek,
//   hanya berlaku dalam tanggal yang disetujui
// ============================================================

let _streamAbsen = null;
let _lastGPSPos  = null;

// ─── TOMBOL ABSEN MASUK ───────────────────────────────────────
async function mulaiAbsenMasuk() {
  const btn = document.getElementById('btn-absen-masuk');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  let berhasil = false;
  try {
    // Cek status dulu
    const status = await callAPI('getStatusAbsenHariIni', {});
    if (status?.sudah_absen_masuk) {
      showToast('Sudah absen masuk pukul ' + status.jam_masuk + '. Gunakan Absen Keluar.', 'warning');
      _kunciTombolAbsen(true, false); // kunci masuk, buka keluar
      return;
    }

    // GPS wajib — tidak ada fallback
    let posisi;
    try {
      posisi = await _dapatkanGPS('masuk');
    } catch(gpsErr) {
      _tutupKamera();
      await _tampilGPSGagal(gpsErr.message);
      return;
    }

    // Buka kamera & proses absen
    await _prosesAbsenKamera('masuk', posisi);
    berhasil = true;
    await loadStatusAbsenHariIni();

  } catch(e) {
    if (e.message !== 'BATAL') showToast(e.message, 'error', 8000);
  } finally {
    // Re-enable hanya jika tidak berhasil absen
    if (!berhasil) {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  }
}

// ─── TOMBOL ABSEN KELUAR ─────────────────────────────────────
async function mulaiAbsenKeluar() {
  const btn = document.getElementById('btn-absen-keluar');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  try {
    const status = await callAPI('getStatusAbsenHariIni', {});
    if (status?.sudah_absen_keluar) {
      showToast('Sudah absen keluar pukul ' + status.jam_keluar, 'warning');
      return;
    }
    if (!status?.sudah_absen_masuk) {
      showToast('Belum absen masuk. Lakukan absen masuk terlebih dahulu.', 'warning');
      return;
    }

    // Keluar: GPS coba ambil, kalau gagal pakai posisi terakhir
    let posisi = null;
    try { posisi = await _dapatkanGPS('keluar'); }
    catch(e) { posisi = _lastGPSPos; }

    await _prosesAbsenKamera('keluar', posisi);
    await loadStatusAbsenHariIni();

  } catch(e) {
    if (e.message !== 'BATAL') showToast(e.message, 'error', 8000);
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}


// ─── KUNCI/BUKA TOMBOL ABSEN ─────────────────────────────────
// dipanggil setelah berhasil absen atau saat load status
function _kunciTombolAbsen(masukSudah, keluarSudah) {
  const btnM = document.getElementById('btn-absen-masuk');
  const btnK = document.getElementById('btn-absen-keluar');
  if (btnM) {
    btnM.disabled = masukSudah;
    btnM.classList.remove('loading');
    btnM.style.opacity  = masukSudah ? '0.45' : '1';
    btnM.style.cursor   = masukSudah ? 'not-allowed' : 'pointer';
    if (masukSudah) btnM.title = 'Sudah absen masuk hari ini';
  }
  if (btnK) {
    btnK.disabled = keluarSudah || !masukSudah;
    btnK.classList.remove('loading');
    btnK.style.opacity  = (keluarSudah || !masukSudah) ? '0.45' : '1';
    btnK.style.cursor   = (keluarSudah || !masukSudah) ? 'not-allowed' : 'pointer';
    if (keluarSudah) btnK.title = 'Sudah absen keluar hari ini';
    else if (!masukSudah) btnK.title = 'Absen masuk dulu';
  }
}

// ─── GPS ENGINE ───────────────────────────────────────────────
async function _dapatkanGPS(tipe) {
  // Wajib HTTPS
  if (location.protocol !== 'https:' &&
      !['localhost','127.0.0.1'].includes(location.hostname)) {
    throw new Error(
      '🔒 GPS membutuhkan HTTPS.\n\n' +
      'Akses aplikasi melalui URL https://... bukan http://\n' +
      'Pastikan GitHub Pages sudah aktif HTTPS.'
    );
  }

  // Cek permission
  if (navigator.permissions) {
    try {
      const p = await navigator.permissions.query({ name: 'geolocation' });
      if (p.state === 'denied') throw new Error(
        '❌ Izin GPS Ditolak!\n\n' +
        '📱 Android Chrome:\n' +
        '   Ketuk 🔒 di address bar → Izin → Lokasi → Izinkan\n\n' +
        '📱 iPhone Safari:\n' +
        '   Settings → Privacy → Location Services → Safari → Allow\n\n' +
        'Setelah izin diberikan, muat ulang halaman.'
      );
    } catch(pe) {
      if (pe.message.startsWith('❌') || pe.message.startsWith('🔒')) throw pe;
    }
  }

  _showGPSPill('📡 Mendapatkan GPS...');

  // 4 percobaan bertingkat
  const opts = [
    { enableHighAccuracy: true,  timeout: 10000, maximumAge: 0     },
    { enableHighAccuracy: true,  timeout: 15000, maximumAge: 5000  },
    { enableHighAccuracy: false, timeout: 18000, maximumAge: 15000 },
    { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 }
  ];

  let lastErr = null;
  for (let i = 0; i < opts.length; i++) {
    try {
      _showGPSPill(i === 0 ? '📡 Mencari GPS...' : `🔄 Percobaan ${i+1}/4...`);
      const pos = await new Promise((res, rej) => {
        if (!navigator.geolocation) { rej(new Error('Browser tidak mendukung GPS')); return; }
        navigator.geolocation.getCurrentPosition(res, rej, opts[i]);
      });
      _hideGPSPill();
      _lastGPSPos = pos;
      return pos;
    } catch(e) {
      lastErr = e;
      if (e.code === 1) { _hideGPSPill(); throw new Error('❌ Izin GPS ditolak. Aktifkan izin lokasi di browser, lalu muat ulang halaman.'); }
      if (i < opts.length - 1) await new Promise(r => setTimeout(r, 1200));
    }
  }

  _hideGPSPill();
  throw new Error(
    '⏱️ GPS tidak merespons setelah 4 percobaan.\n\n' +
    '• Pindah ke tempat terbuka / dekat jendela\n' +
    '• Aktifkan "Mode Akurasi Tinggi" di pengaturan GPS HP\n' +
    '• Buka Google Maps sebentar lalu coba lagi\n' +
    '• Matikan & nyalakan GPS HP\n' +
    (tipe === 'keluar' ? '\n💡 Untuk absen keluar: coba ketuk tombol lagi.' : '')
  );
}

// ─── GPS STATUS PILL ──────────────────────────────────────────
function _showGPSPill(msg) {
  let el = document.getElementById('gps-pill');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gps-pill';
    el.style.cssText = `position:fixed;bottom:76px;left:50%;transform:translateX(-50%);
      background:rgba(30,41,59,.93);color:#fff;padding:9px 18px;border-radius:30px;
      font-size:13px;font-weight:600;z-index:9200;display:flex;align-items:center;gap:8px;
      box-shadow:0 4px 20px rgba(0,0,0,.25);backdrop-filter:blur(8px);white-space:nowrap`;
    el.innerHTML = `<div class="spinner" style="width:14px;height:14px;border:2px solid
      rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;
      animation:spin .7s linear infinite;flex-shrink:0"></div>
      <span id="gps-pill-txt"></span>`;
    document.body.appendChild(el);
  }
  const t = document.getElementById('gps-pill-txt');
  if (t) t.textContent = msg;
  el.style.opacity = '1';
}

function _hideGPSPill() {
  const el = document.getElementById('gps-pill');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el?.remove(), 300);
}

// ─── MODAL GPS GAGAL (tanpa tombol bypass) ───────────────────
async function _tampilGPSGagal(errMsg) {
  let lokasiWarn = '';
  try {
    const s = await callAPI('getStatusAbsenHariIni', {});
    if (s && !s.lokasi_aktif) {
      lokasiWarn = `<div style="background:#FFF8DC;border:1px solid #D97706;border-radius:8px;
        padding:12px;margin-bottom:12px;font-size:13px;color:#92400E;line-height:1.6">
        <strong>⚠️ Lokasi kantor belum dikonfigurasi!</strong><br>
        Super Admin harus mengisi koordinat kantor di menu <strong>Lokasi Kantor</strong>
        agar GPS bisa divalidasi.
      </div>`;
    }
  } catch(e) {}

  const modal = document.createElement('div');
  modal.id    = 'modal-gps-gagal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9500;
    display:flex;align-items:flex-end;backdrop-filter:blur(4px)`;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:24px;width:100%;
      max-height:88vh;overflow-y:auto;animation:slideUp 0.3s ease">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:48px">📡</div>
        <h3 style="font-size:17px;font-weight:700;margin:8px 0 4px;color:#E53E3E">GPS Tidak Bisa Digunakan</h3>
        <p style="font-size:13px;color:#64748B;line-height:1.5">
          GPS wajib untuk absensi. Silakan perbaiki terlebih dahulu.
        </p>
      </div>
      ${lokasiWarn}
      <div style="background:#FFF5F5;border:1px solid #FCA5A5;border-radius:10px;
        padding:12px;margin-bottom:16px">
        <p style="font-size:12px;color:#C53030;line-height:1.7;white-space:pre-line;margin:0">
${errMsg.substring(0, 400)}</p>
      </div>
      <button class="btn btn--primary btn--full btn--lg" style="margin-bottom:10px"
        onclick="document.getElementById('modal-gps-gagal').remove();mulaiAbsenMasuk()">
        🔄 Coba GPS Lagi
      </button>
      <button class="btn btn--ghost btn--full" style="margin-bottom:10px"
        onclick="_panduanGPS()">📖 Cara Mengaktifkan GPS</button>
      <button class="btn btn--ghost btn--full"
        onclick="document.getElementById('modal-gps-gagal').remove()">Tutup</button>
      <div style="background:#F0FFF4;border-radius:8px;padding:10px;margin-top:12px;
        font-size:12px;color:#276749;text-align:center;line-height:1.6">
        💡 Bertugas di luar kantor? Ajukan <strong>Dinas Luar</strong>
        melalui menu Pengajuan agar radius tidak berlaku.
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function _panduanGPS() {
  const iOS     = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const Samsung = /Samsung/i.test(navigator.userAgent);
  const guide   = iOS ? `
    <strong>📱 iPhone / iPad (Safari):</strong><br>
    1. Settings → Privacy & Security<br>
    2. Location Services → ON<br>
    3. Safari → While Using the App<br>
    4. Muat ulang halaman aplikasi` :
    Samsung ? `
    <strong>📱 Samsung Android:</strong><br>
    1. Tarik notifikasi → aktifkan ikon 📍 Lokasi<br>
    2. Ketuk lama ikon Lokasi → pilih Akurasi Tinggi<br>
    3. Buka Chrome → ketuk 🔒 → Izin → Lokasi → Izinkan<br>
    4. Muat ulang halaman aplikasi` : `
    <strong>📱 Android Chrome:</strong><br>
    1. Aktifkan GPS (ikon 📍 di status bar)<br>
    2. Ketuk 🔒 di address bar → Izin → Lokasi → Izinkan<br>
    3. Muat ulang halaman<br><br>
    <strong>🔧 Jika masih gagal:</strong><br>
    • Settings → Lokasi → Mode → Akurasi Tinggi<br>
    • Buka Google Maps sebentar untuk "pemanasan GPS"<br>
    • Pindah ke tempat lebih terbuka`;

  showModal('📖 Cara Aktifkan GPS', `<div style="font-size:13px;line-height:1.8">${guide}</div>`);
}

// ─── KAMERA MODAL ────────────────────────────────────────────
async function _prosesAbsenKamera(jenis, posisi) {
  return new Promise(async (resolve, reject) => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width:{ideal:640}, height:{ideal:640} },
        audio: false
      });
      _streamAbsen = stream;
    } catch(e) {
      reject(new Error(
        e.name === 'NotAllowedError'
          ? '❌ Izin kamera ditolak. Aktifkan kamera di pengaturan browser.'
          : 'Kamera tidak tersedia: ' + e.message
      ));
      return;
    }

    const modal = document.createElement('div');
    modal.id    = 'modal-kamera-absen';
    modal.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;display:flex;flex-direction:column';
    modal.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;z-index:20;
        background:linear-gradient(rgba(0,0,0,.8),transparent);
        padding:20px 16px 40px;text-align:center;color:#fff">
        <div style="font-size:15px;font-weight:700">
          ${jenis==='masuk'?'📷 Foto Absen Masuk':'📷 Foto Absen Keluar'}
        </div>
        <div style="font-size:12px;opacity:.75;margin-top:4px">Posisikan wajah di tengah</div>
      </div>
      <!-- Lingkaran panduan -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);
        width:210px;height:210px;border:3px solid rgba(255,255,255,.8);border-radius:50%;
        pointer-events:none;z-index:15;box-shadow:0 0 0 9999px rgba(0,0,0,.38)"></div>
      <video id="vid-absen" style="flex:1;width:100%;object-fit:cover" autoplay playsinline muted></video>
      <div id="prev-absen-wrap" style="display:none;flex:1;background:#000;
        align-items:center;justify-content:center">
        <img id="prev-absen-img" style="max-width:100%;max-height:100%;object-fit:contain">
      </div>
      <!-- Loading -->
      <div id="kamera-loading" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.75);
        z-index:30;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#fff">
        <div style="width:52px;height:52px;border:4px solid rgba(255,255,255,.2);
          border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite"></div>
        <div style="font-size:14px;font-weight:600">Menyimpan absensi...</div>
      </div>
      <!-- Error -->
      <div id="kamera-err" style="display:none;position:absolute;top:80px;left:12px;right:12px;
        z-index:40;background:rgba(229,62,62,.95);color:#fff;border-radius:12px;padding:14px;
        font-size:12px;text-align:center;white-space:pre-line;line-height:1.5"></div>
      <!-- Kontrol -->
      <div style="background:rgba(0,0,0,.85);padding:20px 24px 40px;display:flex;
        align-items:center;justify-content:space-between;position:relative;z-index:20">
        <button id="btn-batal-kam" style="background:rgba(255,255,255,.15);color:#fff;
          border:none;border-radius:10px;padding:12px 20px;font-size:14px;cursor:pointer;
          min-width:80px">✕ Batal</button>
        <button id="btn-capture-absen" style="width:72px;height:72px;border-radius:50%;
          background:#fff;border:5px solid rgba(255,255,255,.4);cursor:pointer;flex-shrink:0"></button>
        <div id="btn-setelah" style="display:none;flex-direction:column;gap:8px">
          <button id="btn-ulangi-absen" style="background:rgba(255,255,255,.15);color:#fff;
            border:none;border-radius:10px;padding:10px 16px;font-size:13px;cursor:pointer">
            🔄 Ulangi
          </button>
          <button id="btn-gunakan-absen" style="background:#1A9E74;color:#fff;border:none;
            border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer">
            ✅ Gunakan
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const video = document.getElementById('vid-absen');
    video.srcObject = stream;
    await video.play().catch(() => {});

    let fotoB64 = null;

    // Ambil foto
    document.getElementById('btn-capture-absen').onclick = () => {
      const c = document.createElement('canvas');
      c.width = video.videoWidth || 640; c.height = video.videoHeight || 640;
      const ctx = c.getContext('2d');
      ctx.translate(c.width, 0); ctx.scale(-1, 1); // mirror selfie
      ctx.drawImage(video, 0, 0, c.width, c.height);
      c.toBlob(blob => {
        if (!blob) { _kErr('Gagal mengambil foto. Coba lagi.'); return; }
        document.getElementById('prev-absen-img').src    = URL.createObjectURL(blob);
        document.getElementById('vid-absen').style.display       = 'none';
        document.getElementById('prev-absen-wrap').style.display = 'flex';
        document.getElementById('btn-capture-absen').style.display = 'none';
        document.getElementById('btn-setelah').style.display     = 'flex';
        const r = new FileReader();
        r.onload = e => { fotoB64 = e.target.result.split(',')[1]; };
        r.readAsDataURL(blob);
      }, 'image/jpeg', 0.78);
    };

    // Ulangi
    document.getElementById('btn-ulangi-absen').onclick = () => {
      document.getElementById('vid-absen').style.display        = 'block';
      document.getElementById('prev-absen-wrap').style.display  = 'none';
      document.getElementById('btn-capture-absen').style.display= 'block';
      document.getElementById('btn-setelah').style.display      = 'none';
      document.getElementById('kamera-err').style.display       = 'none';
      fotoB64 = null;
    };

    // Gunakan foto → kirim ke server
    document.getElementById('btn-gunakan-absen').onclick = async () => {
      if (!fotoB64) { _kErr('Ambil foto terlebih dahulu.'); return; }
      document.getElementById('kamera-loading').style.display = 'flex';
      try {
        const lat = posisi?.coords?.latitude  ?? null;
        const lon = posisi?.coords?.longitude ?? null;
        const result = await callAPI(jenis === 'masuk' ? 'absenMasuk' : 'absenKeluar', {
          lat, lon, foto_base64: fotoB64
        });
        _tutupKamera();
        const isWarn = result.status === 'terlambat';
        showToast(
          result.message + (result.jarak && result.jarak > 0 ? ` (±${result.jarak}m)` : ''),
          isWarn ? 'warning' : 'success', 7000
        );
        resolve(result);
      } catch(e) {
        document.getElementById('kamera-loading').style.display = 'none';
        _kErr(e.message);
      }
    };

    // Batal
    document.getElementById('btn-batal-kam').onclick = () => {
      _tutupKamera();
      reject(new Error('BATAL'));
    };

    function _kErr(msg) {
      const el = document.getElementById('kamera-err');
      if (!el) return;
      el.textContent = msg; el.style.display = 'block';
      setTimeout(() => { if(el) el.style.display = 'none'; }, 10000);
    }
  });
}

function _tutupKamera() {
  if (_streamAbsen) { _streamAbsen.getTracks().forEach(t => t.stop()); _streamAbsen = null; }
  document.getElementById('modal-kamera-absen')?.remove();
  document.body.style.overflow = '';
}

// ─── RIWAYAT ABSENSI ─────────────────────────────────────────
async function loadHalamanAbsensi() {
  const el  = document.getElementById('absensi-list');
  if (!el) return;
  const now = new Date();

  // Filter bar dengan opsi rentang tanggal
  if (!document.getElementById('absensi-filter-bar')) {
    const bar = document.createElement('div');
    bar.id = 'absensi-filter-bar';
    bar.style.cssText = 'margin-bottom:14px';
    bar.innerHTML = `
      <!-- Mode tab -->
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button id="abs-tab-bln" class="btn btn--primary"
          style="font-size:12px;padding:6px 14px" onclick="absSetMode('bulan')">
          📅 Per Bulan</button>
        <button id="abs-tab-rng" class="btn btn--ghost"
          style="font-size:12px;padding:6px 14px" onclick="absSetMode('range')">
          📆 Rentang Tanggal</button>
      </div>
      <!-- Per bulan -->
      <div id="abs-mode-bln" style="display:flex;gap:8px;flex-wrap:wrap">
        <select class="form-control" id="filter-bulan-absensi" style="flex:1;min-width:130px"
          onchange="loadHalamanAbsensi()">
          ${Array.from({length:12},(_,i)=>`<option value="${i+1}"
            ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
        </select>
        <input type="number" class="form-control" id="filter-tahun-absensi"
          value="${now.getFullYear()}" min="2020" style="width:90px"
          onchange="loadHalamanAbsensi()">
      </div>
      <!-- Rentang tanggal -->
      <div id="abs-mode-rng" style="display:none;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="date" class="form-control" id="filter-abs-dari"
          value="${new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0]}"
          style="flex:1">
        <span style="font-size:13px;color:#64748B">s/d</span>
        <input type="date" class="form-control" id="filter-abs-ke"
          value="${now.toISOString().split('T')[0]}" style="flex:1">
        <button class="btn btn--secondary" style="font-size:12px" onclick="loadHalamanAbsensi()">
          🔍</button>
      </div>`;
    el.before(bar);
  }

  // Ambil nilai filter sesuai mode aktif
  const modeRng = document.getElementById('abs-mode-rng')?.style.display === 'flex';
  let queryParam = {};
  if (modeRng) {
    const dari = document.getElementById('filter-abs-dari')?.value;
    const ke   = document.getElementById('filter-abs-ke')?.value;
    // Konversi ke format API (dd/MM/yyyy untuk dari-ke, atau pakai bulan/tahun)
    if (dari && ke) {
      const p1 = dari.split('-'); const p2 = ke.split('-');
      queryParam = {
        tanggal_dari: p1[2]+'/'+p1[1]+'/'+p1[0],
        tanggal_ke  : p2[2]+'/'+p2[1]+'/'+p2[0]
      };
    }
  } else {
    queryParam = {
      bulan: parseInt(document.getElementById('filter-bulan-absensi')?.value || now.getMonth()+1),
      tahun: parseInt(document.getElementById('filter-tahun-absensi')?.value || now.getFullYear())
    };
  }
  const bulan = queryParam.bulan || now.getMonth()+1;
  const tahun = queryParam.tahun || now.getFullYear();

  el.innerHTML = skeletonCard(5);
  try {
    const data = modeRng
      ? await callAPI('getAbsensiKaryawan', queryParam)
      : await callAPI('getAbsensiKaryawan', { bulan: queryParam.bulan, tahun: queryParam.tahun });
    if (!data || data.length === 0) {
      showEmpty('absensi-list', `Belum ada absensi ${bulanNama(bulan)} ${tahun}`);
      return;
    }

    // Ringkasan
    const ring = { hadir:0, terlambat:0, alfa:0, izin:0, sakit:0, cuti:0, dinas_luar:0 };
    data.forEach(a => { if (ring[a.status] !== undefined) ring[a.status]++; });

    const sorted = [...data].sort((a,b) => String(b.tanggal).localeCompare(String(a.tanggal)));

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">
        ${[['✅','Hadir',ring.hadir+(ring.terlambat||0),'#1A9E74'],
           ['⏰','Terlambat',ring.terlambat,'#D97706'],
           ['❌','Alfa',ring.alfa,'#E53E3E'],
           ['📁','Izin/Lain',ring.izin+ring.sakit+ring.cuti+ring.dinas_luar,'#6C63FF']
          ].map(([ic,lb,v,c]) => `
          <div style="background:#fff;border-radius:10px;padding:10px 6px;text-align:center;border:1px solid #E2E8F0">
            <div style="font-size:18px">${ic}</div>
            <div style="font-size:18px;font-weight:700;color:${c}">${v}</div>
            <div style="font-size:11px;color:#94A3B8">${lb}</div>
          </div>`).join('')}
      </div>
      ${sorted.map(a => `
        <div style="background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:8px;
          border:1px solid #E2E8F0;display:flex;align-items:center;gap:12px">
          <div style="font-size:24px;flex-shrink:0">${_statusEmoji(a.status)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px">
              ${formatTanggal(a.tanggal)}
              <span style="color:#94A3B8;font-weight:400;font-size:12px"> ${a.hari||''}</span>
            </div>
            <div style="font-size:12px;color:#64748B;margin-top:2px">
              ${a.jam_masuk ? '🟢 '+a.jam_masuk : ''}
              ${a.jam_keluar ? ' → 🔴 '+a.jam_keluar : ''}
              ${!a.jam_masuk ? '<span style="color:#94A3B8">—</span>' : ''}
            </div>
            ${a.keterangan ? `<div style="font-size:11px;color:#94A3B8;margin-top:2px">
              ${String(a.keterangan).substring(0,70)}</div>` : ''}
          </div>
          <div>${badgeStatus(a.status)}</div>
        </div>`).join('')}`;
  } catch(e) { showError('absensi-list', 'Gagal: ' + e.message); }
}

function _statusEmoji(s) {
  return {hadir:'✅',terlambat:'⏰',alfa:'❌',izin:'📝',sakit:'🏥',cuti:'🏖️',dinas_luar:'🚗'}[s]||'❓';
}

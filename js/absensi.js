// ============================================================
// absensi.js — GPS Fix Complete v4.0
// Fix: multi-retry, permission check, shift malam, error detail
// ============================================================

let _stream     = null;
let _lastGPSPos = null;

async function mulaiAbsenMasuk() {
  const btn = document.getElementById('btn-absen-masuk');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  try {
    const posisi = await _dapatkanGPS('masuk');
    await _prosesAbsenDenganFoto('masuk', posisi);
    await loadStatusAbsenHariIni();
  } catch(e) {
    if (e.message !== 'DIBATALKAN') showToast(e.message, 'error', 8000);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

async function mulaiAbsenKeluar() {
  const btn = document.getElementById('btn-absen-keluar');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  try {
    let posisi = null;
    try { posisi = await _dapatkanGPS('keluar'); } catch(e) { posisi = _lastGPSPos; }
    await _prosesAbsenDenganFoto('keluar', posisi);
    await loadStatusAbsenHariIni();
  } catch(e) {
    if (e.message !== 'DIBATALKAN') showToast(e.message, 'error', 8000);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

// ─── GPS ENGINE ───────────────────────────────────────────────
async function _dapatkanGPS(tipe) {
  if (location.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(location.hostname)) {
    throw new Error('🔒 GPS butuh HTTPS. Buka via URL https://...');
  }

  if (navigator.permissions) {
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      if (perm.state === 'denied') {
        throw new Error(
          '❌ Izin GPS ditolak!\n\n' +
          '📱 Chrome Android: Ketuk 🔒 → Izin → Lokasi → Izinkan\n' +
          '📱 Samsung: Pengaturan → Privasi → Izin Lokasi\n' +
          '🍎 iPhone Safari: Settings → Privacy → Location Services → Safari → Allow\n\n' +
          'Setelah aktif, muat ulang halaman.'
        );
      }
    } catch(pe) {
      if (pe.message.includes('GPS') || pe.message.includes('Izin') || pe.message.includes('HTTPS')) throw pe;
    }
  }

  _showGPSToast('📡 Mendapatkan lokasi...');

  const attempts = [
    { timeout: 10000, enableHighAccuracy: true,  maximumAge: 0      },
    { timeout: 15000, enableHighAccuracy: true,  maximumAge: 5000   },
    { timeout: 20000, enableHighAccuracy: false, maximumAge: 15000  },
    { timeout: 25000, enableHighAccuracy: false, maximumAge: 60000  }
  ];

  let lastErr = null;
  for (let i = 0; i < attempts.length; i++) {
    try {
      _showGPSToast(i===0 ? '📡 Mendapatkan GPS...' : `🔄 GPS percobaan ke-${i+1}...`);
      const pos = await _requestGPS(attempts[i]);
      _hideGPSToast();
      _lastGPSPos = pos;
      return pos;
    } catch(e) {
      lastErr = e;
      if (e.code === 1) { // permission denied
        _hideGPSToast();
        throw new Error('❌ Izin GPS ditolak!\n\nAktifkan izin lokasi di pengaturan browser, lalu muat ulang.');
      }
      if (i < attempts.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
  }

  _hideGPSToast();
  throw new Error(
    '⏱️ GPS tidak responsif setelah 4 percobaan.\n\n' +
    'Tips:\n' +
    '• Pindah ke area terbuka / dekat jendela\n' +
    '• Aktifkan "Akurasi Tinggi" di pengaturan GPS HP\n' +
    '• Buka Google Maps lalu coba kembali\n' +
    (tipe==='keluar' ? '\n💡 Untuk absen keluar, coba ketuk tombol lagi.' : '')
  );
}

function _requestGPS(opts) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Browser tidak mendukung GPS')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

function _showGPSToast(msg) {
  let el = document.getElementById('gps-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gps-toast';
    el.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:rgba(30,41,59,.92);color:#fff;padding:10px 18px;border-radius:30px;
      font-size:13px;font-weight:600;z-index:9100;display:flex;align-items:center;gap:8px;
      box-shadow:0 4px 20px rgba(0,0,0,.25);backdrop-filter:blur(8px);white-space:nowrap`;
    el.innerHTML = `<div class="spinner" style="width:14px;height:14px;border:2px solid rgba(255,255,255,.3);
      border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0"></div>
      <span id="gps-toast-text"></span>`;
    document.body.appendChild(el);
  }
  const t = document.getElementById('gps-toast-text');
  if (t) t.textContent = msg;
}

function _hideGPSToast() {
  const el = document.getElementById('gps-toast');
  if (el) { el.style.opacity='0'; setTimeout(()=>el?.remove(), 250); }
}

// ─── KAMERA ───────────────────────────────────────────────────
async function _prosesAbsenDenganFoto(jenis, posisi) {
  return new Promise(async (resolve, reject) => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:'user', width:{ideal:640,max:1280}, height:{ideal:640,max:1280} },
        audio: false
      });
      _stream = stream;
    } catch(e) {
      reject(new Error(
        e.name==='NotAllowedError' ? '❌ Izin kamera ditolak! Aktifkan kamera di browser.' :
        e.name==='NotFoundError'  ? 'Kamera tidak ditemukan.' :
        'Kamera error: ' + e.message
      ));
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'kamera-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;display:flex;flex-direction:column';
    modal.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;z-index:20;
        background:linear-gradient(rgba(0,0,0,.75),transparent);
        padding:16px 16px 32px;text-align:center;color:#fff">
        <div style="font-size:15px;font-weight:700">
          ${jenis==='masuk'?'📷 Foto Absen Masuk':'📷 Foto Absen Keluar'}
        </div>
        <div style="font-size:12px;opacity:.8;margin-top:3px">Posisikan wajah di lingkaran</div>
      </div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);
        width:220px;height:220px;border:3px solid rgba(255,255,255,.7);
        border-radius:50%;pointer-events:none;z-index:15;
        box-shadow:0 0 0 9999px rgba(0,0,0,.35)"></div>
      <video id="kamera-video" style="flex:1;width:100%;object-fit:cover" autoplay playsinline muted></video>
      <div id="foto-preview-wrap" style="display:none;flex:1;background:#000;align-items:center;justify-content:center">
        <img id="foto-preview" style="max-width:100%;max-height:100%;object-fit:contain">
      </div>
      <div id="kamera-loading" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.7);
        z-index:30;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#fff">
        <div style="width:52px;height:52px;border:4px solid rgba(255,255,255,.2);
          border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite"></div>
        <div style="font-size:14px;font-weight:600">Menyimpan absensi...</div>
      </div>
      <div id="kamera-err" style="display:none;position:absolute;top:80px;left:12px;right:12px;z-index:35;
        background:rgba(229,62,62,.95);color:#fff;border-radius:12px;padding:14px;
        font-size:13px;text-align:center;white-space:pre-line;line-height:1.5"></div>
      <div style="background:rgba(0,0,0,.85);padding:20px 24px 36px;display:flex;
        align-items:center;justify-content:space-between;position:relative;z-index:20">
        <button onclick="window._batalAbsen()" style="background:rgba(255,255,255,.15);
          color:#fff;border:none;border-radius:10px;padding:12px 20px;font-size:14px;
          cursor:pointer;min-width:80px">✕ Batal</button>
        <button id="btn-capture" onclick="window._ambilFoto()"
          style="width:72px;height:72px;border-radius:50%;background:#fff;
          border:5px solid rgba(255,255,255,.4);cursor:pointer;flex-shrink:0"></button>
        <div id="btn-after" style="display:none;flex-direction:column;gap:8px">
          <button onclick="window._ulangi()" style="background:rgba(255,255,255,.15);
            color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:13px;cursor:pointer">
            🔄 Ulangi</button>
          <button onclick="window._gunakanFoto()" style="background:#1A9E74;color:#fff;
            border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer">
            ✅ Gunakan</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const video = document.getElementById('kamera-video');
    video.srcObject = stream;
    await video.play().catch(()=>{});

    let fotoB64 = null;

    window._ambilFoto = () => {
      const c = document.createElement('canvas');
      c.width  = video.videoWidth  || 640;
      c.height = video.videoHeight || 640;
      const ctx = c.getContext('2d');
      ctx.translate(c.width,0); ctx.scale(-1,1);
      ctx.drawImage(video,0,0,c.width,c.height);
      c.toBlob(blob => {
        if (!blob) { _kErr('Gagal mengambil foto.'); return; }
        document.getElementById('foto-preview').src = URL.createObjectURL(blob);
        document.getElementById('kamera-video').style.display      = 'none';
        document.getElementById('foto-preview-wrap').style.display = 'flex';
        document.getElementById('btn-capture').style.display       = 'none';
        document.getElementById('btn-after').style.display         = 'flex';
        const r = new FileReader();
        r.onload = e => { fotoB64 = e.target.result.split(',')[1]; };
        r.readAsDataURL(blob);
      }, 'image/jpeg', 0.75);
    };

    window._ulangi = () => {
      document.getElementById('kamera-video').style.display      = 'block';
      document.getElementById('foto-preview-wrap').style.display = 'none';
      document.getElementById('btn-capture').style.display       = 'block';
      document.getElementById('btn-after').style.display         = 'none';
      document.getElementById('kamera-err').style.display        = 'none';
      fotoB64 = null;
    };

    window._gunakanFoto = async () => {
      if (!fotoB64) { _kErr('Foto belum diambil.'); return; }
      document.getElementById('kamera-loading').style.display = 'flex';
      try {
        const lat = posisi?.coords?.latitude  ?? null;
        const lon = posisi?.coords?.longitude ?? null;
        const result = await callAPI(
          jenis==='masuk' ? 'absenMasuk' : 'absenKeluar',
          { lat, lon, foto_base64: fotoB64 }
        );
        _tutupKamera();
        showToast(
          result.message + (result.jarak ? ' (±'+result.jarak+'m)' : ''),
          result.status==='terlambat' ? 'warning' : 'success', 6000
        );
        resolve(result);
      } catch(e) {
        document.getElementById('kamera-loading').style.display = 'none';
        _kErr(e.message);
      }
    };

    window._batalAbsen = () => { _tutupKamera(); reject(new Error('DIBATALKAN')); };

    function _kErr(msg) {
      const el = document.getElementById('kamera-err');
      if (el) { el.textContent=msg; el.style.display='block'; setTimeout(()=>{if(el)el.style.display='none';},10000); }
    }
  });
}

function _tutupKamera() {
  if (_stream) { _stream.getTracks().forEach(t=>t.stop()); _stream=null; }
  document.getElementById('kamera-modal')?.remove();
  document.body.style.overflow = '';
  ['_ambilFoto','_ulangi','_gunakanFoto','_batalAbsen'].forEach(k=>delete window[k]);
}

// ─── RIWAYAT ABSENSI ─────────────────────────────────────────
async function loadHalamanAbsensi() {
  const el = document.getElementById('absensi-list');
  if (!el) return;
  const now   = new Date();
  const bulan = parseInt(document.getElementById('filter-bulan-absensi')?.value || now.getMonth()+1);
  const tahun = parseInt(document.getElementById('filter-tahun-absensi')?.value || now.getFullYear());

  el.innerHTML = skeletonCard(5);
  try {
    const data = await callAPI('getAbsensiKaryawan', { bulan, tahun });
    if (!data || data.length === 0) { showEmpty('absensi-list','Belum ada absensi bulan ini'); return; }
    const sorted = [...data].sort((a,b)=>String(b.tanggal).localeCompare(String(a.tanggal)));
    el.innerHTML = sorted.map(a=>`
      <div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;
        border:1px solid #E2E8F0;display:flex;align-items:center;gap:12px">
        <div style="font-size:26px;flex-shrink:0">${_stEmoji(a.status)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${formatTanggal(a.tanggal)}
            <span style="color:#64748B;font-weight:400;font-size:12px"> ${a.hari||''}</span></div>
          <div style="font-size:12px;color:#64748B;margin-top:2px">
            ${a.jam_masuk?'🟢 '+a.jam_masuk:''}
            ${a.jam_keluar?' → 🔴 '+a.jam_keluar:''}
            ${!a.jam_masuk?'<span style="color:#94A3B8">Tidak ada jam</span>':''}
          </div>
          ${a.keterangan?`<div style="font-size:11px;color:#94A3B8;margin-top:2px">${a.keterangan}</div>`:''}
          ${a.jarak_meter_masuk?`<div style="font-size:11px;color:#94A3B8">📍 ${a.jarak_meter_masuk}m</div>`:''}
        </div>
        <div style="flex-shrink:0">${badgeStatus(a.status)}</div>
      </div>`).join('');
  } catch(e) { showError('absensi-list','Gagal: '+e.message); }
}

function _stEmoji(s) {
  return {hadir:'✅',terlambat:'⏰',alfa:'❌',izin:'📝',sakit:'🏥',cuti:'🏖️',dinas_luar:'🚗'}[s]||'❓';
}

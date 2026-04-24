// ============================================================
// qr_absen.js v2 — QR Permanen di ID Card (v6.8)
// ============================================================
// Fitur:
//   1. bukaAbsenQR()      — admin scan QR di ID card → foto → submit
//   2. bukaGeneratorQR()  — admin cetak QR untuk ID card karyawan
// ============================================================

let _qrScannerInstance = null;
let _qrScannedData = null;
let _qrMediaStream = null;
let _qrLokasiAdmin = null;

// ════════════════════════════════════════════════════════════
// FITUR 1: SCAN QR untuk absen karyawan
// ════════════════════════════════════════════════════════════
async function bukaAbsenQR() {
  if (typeof Html5Qrcode === 'undefined') {
    showToast('Library scanner belum siap. Refresh halaman.', 'warning');
    return;
  }
  if (!navigator.geolocation) {
    showToast('GPS tidak tersedia di browser ini', 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'modal-qr-scanner';
  modal.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;' +
    'display:flex;flex-direction:column;animation:fadeInScale .2s ease';
  modal.innerHTML = `
    <div style="background:#1E293B;color:#fff;padding:14px 18px;
      display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
      <div>
        <div style="font-size:11px;opacity:.7;letter-spacing:.5px">📷 ABSEN VIA QR ID CARD</div>
        <div style="font-size:16px;font-weight:700" id="qr-scan-title">Scan QR di ID card karyawan</div>
      </div>
      <button onclick="tutupAbsenQR()"
        style="background:rgba(255,255,255,.15);border:none;color:#fff;width:36px;height:36px;
          border-radius:50%;cursor:pointer;font-size:18px">✕</button>
    </div>

    <div id="qr-scanner-container" style="flex:1;position:relative;background:#000;overflow:hidden">
      <div id="qr-reader" style="width:100%;height:100%"></div>
    </div>

    <div id="qr-status-bar" style="background:#0F172A;color:#fff;padding:12px 18px;font-size:13px;
      display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:12px;flex-wrap:wrap">
      <div id="qr-status-gps">📍 Menunggu GPS...</div>
      <button onclick="tutupAbsenQR()"
        style="background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.5);color:#FCA5A5;
          padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">Batal</button>
    </div>`;
  document.body.appendChild(modal);

  _requestGPSAdmin();

  try {
    _qrScannerInstance = new Html5Qrcode('qr-reader');
    await _qrScannerInstance.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => _onQRScanned(decodedText),
      () => {}
    );
  } catch(e) {
    showToast('Gagal buka kamera: ' + e.message, 'error', 5000);
    tutupAbsenQR();
  }
}

function _requestGPSAdmin() {
  const el = document.getElementById('qr-status-gps');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      _qrLokasiAdmin = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      };
      if (el) el.innerHTML = `📍 GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (±${Math.round(pos.coords.accuracy)}m)`;
    },
    (err) => {
      if (el) el.innerHTML = '⚠️ GPS gagal: ' + err.message;
      showToast('GPS tidak aktif. Nyalakan GPS HP Anda.', 'error', 6000);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

async function _onQRScanned(decodedText) {
  if (_qrScannerInstance) {
    try { await _qrScannerInstance.stop(); } catch(e) {}
    try { _qrScannerInstance.clear(); } catch(e) {}
    _qrScannerInstance = null;
  }

  let payload;
  try {
    payload = JSON.parse(decodedText);
  } catch(e) {
    showToast('QR tidak valid (format salah)', 'error');
    tutupAbsenQR();
    return;
  }

  // Validasi format QR permanen: {v, id, nik, sig}
  if (!payload.id || !payload.sig) {
    showToast('QR tidak valid (data tidak lengkap)', 'error');
    tutupAbsenQR();
    return;
  }

  _qrScannedData = {
    id_karyawan: payload.id,
    nik: payload.nik || '',
    sig: payload.sig
  };

  // Wait GPS kalau belum dapat
  if (!_qrLokasiAdmin) {
    showToast('GPS belum siap. Tunggu sebentar...', 'warning');
    const start = Date.now();
    while (!_qrLokasiAdmin && (Date.now() - start) < 5000) {
      await new Promise(r => setTimeout(r, 500));
    }
    if (!_qrLokasiAdmin) {
      showToast('GPS tidak bisa didapat. Coba lagi.', 'error');
      tutupAbsenQR();
      return;
    }
  }

  _tampilkanKonfirmasi();
}

async function _tampilkanKonfirmasi() {
  const container = document.getElementById('qr-scanner-container');
  if (!container) return;

  container.innerHTML = `
    <div style="padding:20px;background:#0F172A;color:#fff;height:100%;overflow-y:auto">
      <div style="text-align:center;padding:40px 0;color:#94A3B8">
        <div class="spinner-btn" style="display:inline-block;width:40px;height:40px;
          border:3px solid rgba(255,255,255,.2);border-top-color:#fff;
          border-radius:50%;animation:spin .8s linear infinite"></div><br>
        Memuat data karyawan...
      </div>
    </div>`;

  let karyawan = {};
  try {
    karyawan = await callAPI('getKaryawanById', { id_karyawan: _qrScannedData.id_karyawan });
  } catch(e) {
    container.innerHTML = `
      <div style="padding:40px 20px;text-align:center;color:#FCA5A5;background:#0F172A;height:100%">
        ❌ Data karyawan tidak ditemukan<br>
        <button onclick="tutupAbsenQR()" class="btn btn--ghost" style="margin-top:20px">Tutup</button>
      </div>`;
    return;
  }

  const titleEl = document.getElementById('qr-scan-title');
  if (titleEl) titleEl.textContent = 'Konfirmasi absensi';

  const fotoUrl = karyawan.foto_profil_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(karyawan.foto_profil_url)
        : karyawan.foto_profil_url)
    : '';

  container.innerHTML = `
    <div style="padding:20px;background:#0F172A;color:#fff;height:100%;overflow-y:auto">
      <div style="background:#10B981;color:#fff;padding:10px 14px;border-radius:8px;
        font-size:13px;font-weight:600;text-align:center;margin-bottom:16px">
        ✓ QR ID Card Ter-scan
      </div>

      <div style="background:#1E293B;border-radius:12px;padding:16px;margin-bottom:14px;
        display:flex;gap:14px;align-items:center">
        <div style="width:70px;height:70px;border-radius:50%;background:#334155;overflow:hidden;
          flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:24px">
          ${fotoUrl
            ? `<img src="${fotoUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.parentElement.innerHTML='👤'">`
            : '👤'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:700;margin-bottom:2px">${karyawan.nama_lengkap || '-'}</div>
          <div style="font-size:12px;color:#94A3B8">NIK: ${karyawan.nik || '-'}</div>
          <div style="font-size:12px;color:#94A3B8">${karyawan.jabatan || '-'} · ${karyawan.departemen || '-'}</div>
        </div>
      </div>

      <div style="background:#1E293B;border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px">
        <div style="color:#94A3B8;margin-bottom:6px">📍 Lokasi Admin (radius kantor):</div>
        <div style="color:#E2E8F0;font-family:monospace;font-size:12px">
          ${_qrLokasiAdmin.latitude.toFixed(6)}, ${_qrLokasiAdmin.longitude.toFixed(6)}
          <span style="color:#94A3B8">(±${Math.round(_qrLokasiAdmin.accuracy)}m)</span>
        </div>
      </div>

      <div style="font-size:14px;color:#CBD5E1;margin-bottom:10px;text-align:center">
        Pilih jenis absen:
      </div>

      <div style="display:flex;gap:10px;margin-bottom:12px">
        <button onclick="_pilihJenisAbsen('masuk')"
          style="flex:1;background:#10B981;color:#fff;border:none;padding:14px;border-radius:10px;
            font-size:14px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
          <span style="font-size:22px">🚪</span>
          <span>Absen Masuk</span>
        </button>
        <button onclick="_pilihJenisAbsen('keluar')"
          style="flex:1;background:#F59E0B;color:#fff;border:none;padding:14px;border-radius:10px;
            font-size:14px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
          <span style="font-size:22px">🏠</span>
          <span>Absen Keluar</span>
        </button>
      </div>

      <button onclick="tutupAbsenQR()" style="width:100%;background:rgba(239,68,68,.15);
        border:1px solid rgba(239,68,68,.4);color:#FCA5A5;padding:10px;border-radius:8px;
        font-size:13px;cursor:pointer">Batal</button>
    </div>`;
}

async function _pilihJenisAbsen(jenis) {
  const container = document.getElementById('qr-scanner-container');
  if (!container) return;

  const titleEl = document.getElementById('qr-scan-title');
  if (titleEl) titleEl.textContent = 'Foto wajah karyawan';

  if (_qrMediaStream) {
    _qrMediaStream.getTracks().forEach(t => t.stop());
    _qrMediaStream = null;
  }

  container.innerHTML = `
    <div style="height:100%;display:flex;flex-direction:column;background:#000">
      <div style="flex:1;position:relative;background:#000;overflow:hidden">
        <video id="foto-video" autoplay playsinline muted
          style="width:100%;height:100%;object-fit:cover;background:#000"></video>
        <canvas id="foto-canvas" style="display:none"></canvas>

        <div id="foto-loading"
          style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;gap:12px">
          <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,.2);
            border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite"></div>
          <div style="font-size:13px">Membuka kamera...</div>
        </div>

        <div id="foto-hint" style="display:none;position:absolute;top:16px;left:16px;right:16px;
          background:rgba(0,0,0,.6);color:#fff;padding:10px 14px;border-radius:8px;
          font-size:13px;text-align:center">
          📸 Arahkan kamera ke wajah karyawan<br>
          <span style="font-size:11px;color:#94A3B8">Pastikan wajah terlihat jelas</span>
        </div>

        <div id="foto-preview" style="display:none;position:absolute;inset:0;background:#000;
          align-items:center;justify-content:center">
          <img id="foto-preview-img" style="max-width:100%;max-height:100%">
        </div>
      </div>

      <div style="background:#0F172A;padding:16px;display:flex;gap:10px;align-items:center;flex-shrink:0">
        <button onclick="_tampilkanKonfirmasi()" id="btn-kembali-scan"
          style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;
          padding:10px 14px;border-radius:8px;cursor:pointer;font-size:13px;flex-shrink:0">← Kembali</button>

        <button onclick="_ambilFotoKaryawan('${jenis}')" id="btn-ambil-foto" disabled
          style="flex:1;background:#fff;color:#0F172A;border:none;padding:14px;border-radius:10px;
          font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
          opacity:0.5">
          <span style="font-size:22px">📷</span>
          <span>Menunggu kamera...</span>
        </button>
      </div>
    </div>`;

  await new Promise(r => setTimeout(r, 100));

  const video = document.getElementById('foto-video');
  const loadingEl = document.getElementById('foto-loading');
  const hintEl = document.getElementById('foto-hint');
  const btnAmbil = document.getElementById('btn-ambil-foto');

  try {
    _qrMediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width:  { ideal: 720, max: 1280 },
        height: { ideal: 720, max: 1280 }
      },
      audio: false
    });

    if (!video) throw new Error('Video element tidak ditemukan');
    video.srcObject = _qrMediaStream;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout menunggu kamera')), 10000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        video.play().then(resolve).catch(reject);
      };
      if (video.readyState >= 2) {
        clearTimeout(timeout);
        video.play().then(resolve).catch(reject);
      }
    });

    if (loadingEl) loadingEl.style.display = 'none';
    if (hintEl) hintEl.style.display = 'block';
    if (btnAmbil) {
      btnAmbil.disabled = false;
      btnAmbil.style.opacity = '1';
      btnAmbil.innerHTML = '<span style="font-size:22px">📷</span><span>Ambil Foto</span>';
    }
  } catch(e) {
    console.error('[kamera]', e);
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div style="font-size:40px;margin-bottom:8px">⚠️</div>
        <div style="font-size:14px;font-weight:700;color:#FCA5A5">Gagal buka kamera</div>
        <div style="font-size:12px;color:#94A3B8;max-width:280px;text-align:center">${e.message || 'Unknown error'}</div>
        <button onclick="_tampilkanKonfirmasi()"
          style="margin-top:10px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);
          color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px">Kembali</button>`;
    }
  }
}

async function _ambilFotoKaryawan(jenis) {
  const video = document.getElementById('foto-video');
  const canvas = document.getElementById('foto-canvas');
  const previewWrap = document.getElementById('foto-preview');
  const previewImg = document.getElementById('foto-preview-img');
  if (!video || !canvas) return;

  if (!video.videoWidth || !video.videoHeight) {
    showToast('Kamera belum siap, tunggu sebentar...', 'warning');
    return;
  }

  // Compress: max 480px, JPEG quality 0.5 → ~30-50KB
  const MAX_SIZE = 480;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const ratio = Math.min(MAX_SIZE / vw, MAX_SIZE / vh, 1);
  canvas.width  = Math.round(vw * ratio);
  canvas.height = Math.round(vh * ratio);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const fotoBase64 = canvas.toDataURL('image/jpeg', 0.5);
  const sizeKB = Math.round((fotoBase64.length * 0.75) / 1024);
  console.log('[QR foto] Size:', sizeKB, 'KB, dimensi:', canvas.width, 'x', canvas.height);

  if (_qrMediaStream) {
    _qrMediaStream.getTracks().forEach(t => t.stop());
    _qrMediaStream = null;
  }

  if (previewImg && previewWrap) {
    previewImg.src = fotoBase64;
    previewWrap.style.display = 'flex';
  }
  const hintEl = document.getElementById('foto-hint');
  if (hintEl) hintEl.style.display = 'none';

  const btnAmbil = document.getElementById('btn-ambil-foto');
  const btnKembali = document.getElementById('btn-kembali-scan');
  if (btnAmbil) {
    btnAmbil.innerHTML = '<div style="width:18px;height:18px;border:2px solid rgba(15,23,42,.2);border-top-color:#0F172A;border-radius:50%;animation:spin .8s linear infinite"></div> <span>Mengirim (' + sizeKB + ' KB)...</span>';
    btnAmbil.disabled = true;
    btnAmbil.onclick = null;
    btnAmbil.style.opacity = '0.7';
  }
  if (btnKembali) btnKembali.disabled = true;

  try {
    const result = await callAPI('absenViaQR', {
      id_karyawan: _qrScannedData.id_karyawan,
      nik: _qrScannedData.nik,
      sig: _qrScannedData.sig,
      jenis: jenis,
      latitude: _qrLokasiAdmin.latitude,
      longitude: _qrLokasiAdmin.longitude,
      foto_karyawan_base64: fotoBase64
    });

    if (!result) {
      _tampilkanSukses({
        karyawan: 'Karyawan',
        jam: new Date().toTimeString().substring(0,5),
        status: 'tercatat'
      }, jenis);
      return;
    }

    _tampilkanSukses(result, jenis);
  } catch(e) {
    console.error('[QR submit error]', e);
    _tampilkanError(e.message || 'Terjadi kesalahan saat kirim data', jenis);
  }
}

function _tampilkanSukses(result, jenis) {
  const container = document.getElementById('qr-scanner-container');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:40px 24px;height:100%;background:#0F172A;color:#fff;
      display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <div style="width:80px;height:80px;border-radius:50%;background:#10B981;
        display:flex;align-items:center;justify-content:center;font-size:40px;margin-bottom:20px">
        ✓
      </div>
      <div style="font-size:22px;font-weight:800;margin-bottom:10px">Berhasil!</div>
      <div style="font-size:14px;color:#CBD5E1;margin-bottom:6px">${result.karyawan}</div>
      ${result.status ? `<div style="display:inline-block;background:${result.status==='hadir'?'#10B981':'#F59E0B'};
        color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700;margin-bottom:10px">
        ${result.status.toUpperCase()}</div>` : ''}
      <div style="font-size:13px;color:#94A3B8;margin-bottom:30px">
        Absen ${jenis === 'masuk' ? 'MASUK' : 'KELUAR'} jam ${result.jam || '-'}
      </div>
      <div style="display:flex;gap:10px;width:100%;max-width:300px">
        <button onclick="tutupAbsenQR()"
          style="flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;
          padding:12px;border-radius:8px;font-size:13px;cursor:pointer">Tutup</button>
        <button onclick="tutupAbsenQR();setTimeout(bukaAbsenQR,300)"
          style="flex:1;background:#2D6CDF;border:none;color:#fff;
          padding:12px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Scan Lagi</button>
      </div>
    </div>`;
}

function _tampilkanError(msg, jenis) {
  const container = document.getElementById('qr-scanner-container');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:40px 24px;height:100%;background:#0F172A;color:#fff;
      display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <div style="width:80px;height:80px;border-radius:50%;background:#DC2626;
        display:flex;align-items:center;justify-content:center;font-size:40px;margin-bottom:20px">
        ✕
      </div>
      <div style="font-size:18px;font-weight:800;margin-bottom:10px">Gagal</div>
      <div style="font-size:13px;color:#FCA5A5;margin-bottom:24px;max-width:360px;line-height:1.5">
        ${msg}
      </div>
      <div style="display:flex;gap:10px;width:100%;max-width:300px">
        <button onclick="tutupAbsenQR()"
          style="flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;
          padding:12px;border-radius:8px;font-size:13px;cursor:pointer">Tutup</button>
        <button onclick="tutupAbsenQR();setTimeout(bukaAbsenQR,300)"
          style="flex:1;background:#2D6CDF;border:none;color:#fff;
          padding:12px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Coba Lagi</button>
      </div>
    </div>`;
}

async function tutupAbsenQR() {
  if (_qrScannerInstance) {
    try { await _qrScannerInstance.stop(); } catch(e) {}
    try { _qrScannerInstance.clear(); } catch(e) {}
    _qrScannerInstance = null;
  }
  if (_qrMediaStream) {
    _qrMediaStream.getTracks().forEach(t => t.stop());
    _qrMediaStream = null;
  }
  _qrScannedData = null;
  _qrLokasiAdmin = null;

  const modal = document.getElementById('modal-qr-scanner');
  if (modal) modal.remove();
}

// ════════════════════════════════════════════════════════════
// FITUR 2: GENERATOR QR untuk cetak ID card
// ════════════════════════════════════════════════════════════
async function bukaGeneratorQR() {
  if (typeof QRCode === 'undefined') {
    showToast('Library QRCode belum siap. Refresh halaman.', 'warning');
    return;
  }

  // Modal pilih karyawan dulu
  const modal = document.createElement('div');
  modal.id = 'modal-qr-generator';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;' +
    'display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeInScale .2s ease';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:460px;
      max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="padding:18px 20px;border-bottom:1px solid #E2E8F0;
        display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:11px;color:#94A3B8;letter-spacing:.5px">🆔 GENERATOR QR</div>
          <div style="font-size:16px;font-weight:700;color:#1E293B">Cetak QR untuk ID Card</div>
        </div>
        <button onclick="tutupGeneratorQR()"
          style="background:#F1F5F9;border:none;color:#475569;width:32px;height:32px;
            border-radius:50%;cursor:pointer;font-size:16px">✕</button>
      </div>
      <div id="qr-gen-body" style="padding:20px">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:6px">
            Pilih Karyawan:
          </label>
          <input type="text" id="qr-gen-search" placeholder="Cari nama atau NIK..."
            oninput="_filterKaryawanQR()" autocomplete="off"
            style="width:100%;padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:14px;box-sizing:border-box">
        </div>
        <div id="qr-gen-list" style="max-height:300px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px">
          <div style="padding:40px 20px;text-align:center;color:#94A3B8">
            <div style="width:32px;height:32px;border:3px solid #CBD5E1;border-top-color:#2D6CDF;
              border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 10px"></div>
            Memuat daftar karyawan...
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Load karyawan list
  try {
    const list = await callAPI('getKaryawanAktif', {});
    _renderKaryawanQRList(list || []);
  } catch(e) {
    document.getElementById('qr-gen-list').innerHTML =
      `<div style="padding:20px;color:#DC2626;text-align:center">❌ Gagal load: ${e.message}</div>`;
  }
}

let _karyawanQRCache = [];
function _renderKaryawanQRList(list) {
  _karyawanQRCache = list;
  const el = document.getElementById('qr-gen-list');
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:#94A3B8">Tidak ada karyawan aktif</div>';
    return;
  }
  el.innerHTML = list.map(k => `
    <div onclick="_pilihKaryawanQR('${k.id_karyawan}')"
      style="padding:10px 14px;border-bottom:1px solid #F1F5F9;cursor:pointer;display:flex;gap:10px;align-items:center"
      onmouseover="this.style.background='#F8FAFC'"
      onmouseout="this.style.background='#fff'">
      <div style="width:36px;height:36px;border-radius:50%;background:#E2E8F0;
        display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#64748B;flex-shrink:0">
        ${(k.nama_lengkap || '?').charAt(0)}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k.nama_lengkap || '-'}</div>
        <div style="font-size:11px;color:#64748B">NIK: ${k.nik || '-'} · ${k.jabatan || '-'}</div>
      </div>
      <div style="color:#2D6CDF;font-size:16px">→</div>
    </div>`).join('');
}

function _filterKaryawanQR() {
  const q = (document.getElementById('qr-gen-search').value || '').toLowerCase();
  if (!q) { _renderKaryawanQRList(_karyawanQRCache); return; }
  const filtered = _karyawanQRCache.filter(k =>
    (k.nama_lengkap || '').toLowerCase().includes(q) ||
    (k.nik || '').toLowerCase().includes(q)
  );
  _renderKaryawanQRList(filtered);
}

async function _pilihKaryawanQR(idKaryawan) {
  const body = document.getElementById('qr-gen-body');
  if (!body) return;

  body.innerHTML = `
    <div style="padding:40px 20px;text-align:center;color:#94A3B8">
      <div style="width:32px;height:32px;border:3px solid #CBD5E1;border-top-color:#2D6CDF;
        border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 10px"></div>
      Generate QR...
    </div>`;

  try {
    const data = await callAPI('getQRPayloadKaryawan', { id_karyawan: idKaryawan });
    if (!data || !data.payload) throw new Error('Gagal generate QR');

    body.innerHTML = `
      <div id="qr-print-area" style="text-align:center;padding:10px">
        <div style="display:inline-block;background:#fff;padding:16px;border:1px solid #E2E8F0;border-radius:12px">
          <div id="qr-display-canvas"
            style="display:inline-block;padding:6px;background:#fff"></div>
          <div style="margin-top:10px;font-weight:700;color:#1E293B;font-size:14px">${data.nama}</div>
          <div style="font-size:11px;color:#64748B;margin-top:2px">NIK: ${data.nik || '-'}</div>
          <div style="font-size:11px;color:#64748B">${data.jabatan || '-'}</div>
        </div>
      </div>

      <div style="background:#EFF6FF;border-left:3px solid #2D6CDF;padding:10px 12px;border-radius:6px;
        font-size:11.5px;color:#1E3A8A;margin-top:14px;line-height:1.5">
        💡 <strong>Cara pakai:</strong> Screenshot atau print QR ini, lalu tempel di ID card karyawan.
        QR bersifat <strong>permanen</strong> — cukup cetak sekali saja.
      </div>

      <div style="display:flex;gap:8px;margin-top:14px">
        <button onclick="bukaGeneratorQR()"
          style="flex:1;background:#F1F5F9;border:1px solid #CBD5E1;color:#475569;
          padding:10px;border-radius:8px;cursor:pointer;font-size:13px">← Pilih Lain</button>
        <button onclick="_cetakQR()"
          style="flex:1;background:#2D6CDF;border:none;color:#fff;
          padding:10px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">
          🖨️ Print QR
        </button>
      </div>`;

    // Generate QR code
    const canvas = document.getElementById('qr-display-canvas');
    if (canvas) {
      canvas.innerHTML = '';
      new QRCode(canvas, {
        text: data.payload,
        width: 200,
        height: 200,
        colorDark: '#1E293B',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  } catch(e) {
    body.innerHTML = `<div style="padding:20px;color:#DC2626;text-align:center">❌ ${e.message}</div>`;
  }
}

function _cetakQR() {
  const area = document.getElementById('qr-print-area');
  if (!area) return;
  const w = window.open('', '_blank', 'width=400,height=500');
  w.document.write(`
    <html><head><title>QR ID Card</title>
    <style>
      body{font-family:sans-serif;text-align:center;padding:40px;margin:0}
      @media print { body { padding:20px } button { display:none } }
    </style></head>
    <body>${area.outerHTML}
    <button onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#2D6CDF;color:#fff;border:none;border-radius:8px;cursor:pointer">Print Sekarang</button>
    </body></html>`);
  w.document.close();
}

function tutupGeneratorQR() {
  const m = document.getElementById('modal-qr-generator');
  if (m) m.remove();
}

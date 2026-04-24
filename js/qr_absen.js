// ============================================================
// qr_absen.js — Scanner QR untuk Admin (v6.7)
// Admin scan QR karyawan → foto karyawan → submit absen
// ============================================================

let _qrScannerInstance = null;
let _qrScannedData = null;
let _qrMediaStream = null;
let _qrLokasiAdmin = null;

// ────────────────────────────────────────────────────────────
// STEP 1: Buka menu scanner
// ────────────────────────────────────────────────────────────
async function bukaAbsenQR() {
  // Cek library
  if (typeof Html5Qrcode === 'undefined') {
    showToast('Library scanner belum siap. Refresh halaman.', 'warning');
    return;
  }

  // Cek permission GPS dulu
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
        <div style="font-size:11px;opacity:.7;letter-spacing:.5px">📷 ABSEN VIA QR</div>
        <div style="font-size:16px;font-weight:700" id="qr-scan-title">Arahkan kamera ke QR karyawan</div>
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

  // Request GPS dulu
  _requestGPSAdmin();

  // Mulai scanner
  try {
    _qrScannerInstance = new Html5Qrcode('qr-reader');
    await _qrScannerInstance.start(
      { facingMode: 'environment' }, // Kamera belakang
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => _onQRScanned(decodedText),
      () => {} // silent pada error scan (normal, gak detect setiap frame)
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

// ────────────────────────────────────────────────────────────
// STEP 2: QR ter-scan → validasi & tampilkan konfirmasi
// ────────────────────────────────────────────────────────────
async function _onQRScanned(decodedText) {
  // Hentikan scanner (jangan ulang detect saat modal konfirmasi muncul)
  if (_qrScannerInstance) {
    try { await _qrScannerInstance.stop(); } catch(e) {}
    try { _qrScannerInstance.clear(); } catch(e) {}
    _qrScannerInstance = null;
  }

  // Parse QR data
  let payload;
  try {
    payload = JSON.parse(decodedText);
  } catch(e) {
    showToast('QR tidak valid (format salah)', 'error');
    tutupAbsenQR();
    return;
  }

  if (!payload.id || !payload.ts || !payload.t) {
    showToast('QR tidak valid (data tidak lengkap)', 'error');
    tutupAbsenQR();
    return;
  }

  _qrScannedData = {
    id_karyawan: payload.id,
    timestamp: payload.ts,
    token: payload.t
  };

  // Cek GPS sudah dapat
  if (!_qrLokasiAdmin) {
    showToast('GPS belum siap. Tunggu sebentar...', 'warning');
    // Tunggu max 5 detik
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
        <div class="spinner-btn" style="display:inline-block"></div><br>
        Memvalidasi QR dan memuat data karyawan...
      </div>
    </div>`;

  // Ambil data karyawan untuk tampilan (tidak validasi token di sini,
  // validasi di server saat submit)
  let karyawan = {};
  try {
    karyawan = await callAPI('getKaryawanById', { id_karyawan: _qrScannedData.id_karyawan });
  } catch(e) {
    container.innerHTML = `
      <div style="padding:40px 20px;text-align:center;color:#FCA5A5">
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
        ✓ QR Ter-scan Berhasil
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
        <div style="color:#94A3B8;margin-bottom:6px">📍 Lokasi Admin:</div>
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

// ────────────────────────────────────────────────────────────
// STEP 3: Pilih jenis → buka kamera untuk foto karyawan
// ────────────────────────────────────────────────────────────
async function _pilihJenisAbsen(jenis) {
  const container = document.getElementById('qr-scanner-container');
  if (!container) return;

  const titleEl = document.getElementById('qr-scan-title');
  if (titleEl) titleEl.textContent = 'Foto karyawan';

  container.innerHTML = `
    <div style="height:100%;display:flex;flex-direction:column;background:#000">
      <div style="flex:1;position:relative;background:#000;overflow:hidden">
        <video id="foto-video" autoplay playsinline muted
          style="width:100%;height:100%;object-fit:cover;background:#000"></video>
        <canvas id="foto-canvas" style="display:none"></canvas>

        <div id="kamera-status" style="position:absolute;top:16px;left:16px;right:16px;
          background:rgba(0,0,0,.7);color:#fff;padding:10px 14px;border-radius:8px;
          font-size:13px;text-align:center">
          <div class="spinner-btn" style="display:inline-block;vertical-align:middle"></div>
          <span style="vertical-align:middle;margin-left:6px">Mengaktifkan kamera...</span>
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
          style="flex:1;background:#94A3B8;color:#fff;border:none;padding:14px;border-radius:10px;
          font-size:15px;font-weight:700;cursor:not-allowed;display:flex;align-items:center;justify-content:center;gap:8px">
          <span style="font-size:22px">📷</span>
          <span>Ambil Foto</span>
        </button>
      </div>
    </div>`;

  // PENTING: pastikan scanner QR benar-benar sudah release kamera
  // html5-qrcode.stop() kadang async lambat di beberapa device
  await new Promise(r => setTimeout(r, 400));

  // Buka kamera belakang (lebih jelas untuk foto orang di depan admin)
  // Strategi: coba kamera belakang dulu, kalau gagal → coba apapun
  const statusEl = document.getElementById('kamera-status');
  let stream = null;
  let attempt = 0;

  const tryGetCamera = async (constraints, label) => {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch(e) {
      console.warn('[camera] ' + label + ' gagal:', e.message);
      return null;
    }
  };

  // Attempt 1: kamera belakang dengan resolusi sedang (hemat memory)
  stream = await tryGetCamera(
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 }, height: { ideal: 720 } }, audio: false },
    'environment HD'
  );

  // Attempt 2: kamera belakang tanpa constraint resolusi
  if (!stream) {
    if (statusEl) statusEl.innerHTML = '<span>Mencoba kamera alternatif...</span>';
    await new Promise(r => setTimeout(r, 300));
    stream = await tryGetCamera(
      { video: { facingMode: 'environment' }, audio: false },
      'environment basic'
    );
  }

  // Attempt 3: kamera apapun yang ada (belakang atau depan)
  if (!stream) {
    if (statusEl) statusEl.innerHTML = '<span>Mencoba kamera depan...</span>';
    await new Promise(r => setTimeout(r, 300));
    stream = await tryGetCamera(
      { video: true, audio: false },
      'any camera'
    );
  }

  if (!stream) {
    showToast('Tidak bisa buka kamera. Pastikan izin kamera diberikan & tidak dipakai app lain.', 'error', 7000);
    _tampilkanKonfirmasi();
    return;
  }

  _qrMediaStream = stream;
  const video = document.getElementById('foto-video');
  if (!video) {
    stream.getTracks().forEach(t => t.stop());
    return;
  }

  video.srcObject = stream;

  // Tunggu video benar-benar siap main sebelum enable tombol
  await new Promise((resolve) => {
    let resolved = false;
    const onReady = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };
    video.addEventListener('loadedmetadata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    // Safety timeout 3 detik
    setTimeout(onReady, 3000);
  });

  try { await video.play(); } catch(e) { /* ignore — autoplay biasanya jalan */ }

  // Update status & enable tombol
  if (statusEl) {
    statusEl.innerHTML = '📸 Arahkan kamera ke wajah karyawan' +
      '<br><span style="font-size:11px;color:#94A3B8">Pastikan wajah terlihat jelas</span>';
  }
  const btnAmbil = document.getElementById('btn-ambil-foto');
  if (btnAmbil) {
    btnAmbil.disabled = false;
    btnAmbil.style.background = '#fff';
    btnAmbil.style.color = '#0F172A';
    btnAmbil.style.cursor = 'pointer';
  }
}

async function _ambilFotoKaryawan(jenis) {
  const video = document.getElementById('foto-video');
  const canvas = document.getElementById('foto-canvas');
  const previewWrap = document.getElementById('foto-preview');
  const previewImg = document.getElementById('foto-preview-img');
  if (!video || !canvas) return;

  // Validasi video sudah siap
  if (!video.videoWidth || !video.videoHeight) {
    showToast('Kamera belum siap, tunggu sebentar...', 'warning');
    return;
  }

  // === COMPRESS FOTO ===
  // Target: max 640px dimensi panjang, jpeg quality 0.55
  // Supaya base64 hasilnya < 150 KB (aman untuk POST GAS)
  const MAX_DIMENSION = 640;
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  let dstW, dstH;
  if (srcW > srcH) {
    dstW = Math.min(srcW, MAX_DIMENSION);
    dstH = Math.round(srcH * (dstW / srcW));
  } else {
    dstH = Math.min(srcH, MAX_DIMENSION);
    dstW = Math.round(srcW * (dstH / srcH));
  }

  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, dstW, dstH);

  // Compress jadi JPEG quality 55% (lumayan jelas untuk wajah)
  let fotoBase64 = canvas.toDataURL('image/jpeg', 0.55);

  // Kalau masih > 180KB, turunkan quality lagi
  if (fotoBase64.length > 180 * 1024) {
    fotoBase64 = canvas.toDataURL('image/jpeg', 0.4);
  }
  // Kalau masih > 180KB (sangat jarang), turunkan resolusi
  if (fotoBase64.length > 180 * 1024) {
    canvas.width = Math.round(dstW * 0.75);
    canvas.height = Math.round(dstH * 0.75);
    const ctx2 = canvas.getContext('2d');
    ctx2.drawImage(video, 0, 0, canvas.width, canvas.height);
    fotoBase64 = canvas.toDataURL('image/jpeg', 0.4);
  }

  console.log('[QR] Foto size: ' + Math.round(fotoBase64.length / 1024) + ' KB (' + canvas.width + 'x' + canvas.height + ')');

  // Stop kamera SEBELUM submit (release resource)
  if (_qrMediaStream) {
    _qrMediaStream.getTracks().forEach(t => t.stop());
    _qrMediaStream = null;
  }
  if (video) video.srcObject = null;

  // Tampilkan preview
  if (previewImg && previewWrap) {
    previewImg.src = fotoBase64;
    previewWrap.style.display = 'flex';
  }

  // Ganti tombol jadi loading
  const btnAmbil = document.getElementById('btn-ambil-foto');
  const btnKembali = document.getElementById('btn-kembali-scan');
  if (btnAmbil) {
    btnAmbil.innerHTML = '<div class="spinner-btn"></div> <span>Mengirim...</span>';
    btnAmbil.disabled = true;
    btnAmbil.style.background = '#94A3B8';
    btnAmbil.onclick = null;
  }
  if (btnKembali) btnKembali.disabled = true;

  // Submit ke backend
  try {
    const result = await callAPI('absenViaQR', {
      id_karyawan: _qrScannedData.id_karyawan,
      timestamp: _qrScannedData.timestamp,
      token: _qrScannedData.token,
      jenis: jenis,
      latitude: _qrLokasiAdmin.latitude,
      longitude: _qrLokasiAdmin.longitude,
      foto_karyawan_base64: fotoBase64
    });

    _tampilkanSukses(result, jenis);
  } catch(e) {
    // PENTING: JANGAN biarkan error bikin auto-logout
    // Tampilkan error screen, user bisa coba lagi atau tutup
    console.error('[QR absen] error:', e);
    _tampilkanError(e.message || 'Gagal submit absensi', jenis);
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

// ────────────────────────────────────────────────────────────
// TUTUP: cleanup kamera & scanner
// ────────────────────────────────────────────────────────────
async function tutupAbsenQR() {
  // Stop scanner
  if (_qrScannerInstance) {
    try { await _qrScannerInstance.stop(); } catch(e) {}
    try { _qrScannerInstance.clear(); } catch(e) {}
    _qrScannerInstance = null;
  }
  // Stop kamera
  if (_qrMediaStream) {
    _qrMediaStream.getTracks().forEach(t => t.stop());
    _qrMediaStream = null;
  }
  // Reset state
  _qrScannedData = null;
  _qrLokasiAdmin = null;

  const modal = document.getElementById('modal-qr-scanner');
  if (modal) modal.remove();
}

// ============================================================
// absensi.js — GPS Validasi, Kamera, Foto, Upload Absen
// ============================================================

let _stream = null;

async function mulaiAbsenMasuk() {
  const btn = document.getElementById('btn-absen-masuk');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  try {
    showToast('Mendapatkan lokasi GPS...', 'info', 2000);
    const posisi = await dapatkanGPS();
    await prosesAbsenDenganFoto('masuk', posisi);
  } catch(e) {
    showToast(e.message || 'Gagal absen masuk', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

async function mulaiAbsenKeluar() {
  const btn = document.getElementById('btn-absen-keluar');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  try {
    showToast('Membuka kamera...', 'info', 1500);
    const posisi = await dapatkanGPS().catch(() => ({ coords: { latitude: 0, longitude: 0 } }));
    await prosesAbsenDenganFoto('keluar', posisi);
  } catch(e) {
    showToast(e.message || 'Gagal absen keluar', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

function dapatkanGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS tidak didukung di perangkat ini'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos),
      err => {
        const msg = err.code === 1
      ? '⚠️ Izin GPS ditolak!\n\nCara mengaktifkan:\n• Android Chrome: Klik ikon 🔒 di address bar → Izinkan Lokasi\n• iPhone Safari: Settings → Safari → Location → Allow'
      : err.code === 2
      ? 'GPS tidak tersedia. Pastikan Anda berada di luar ruangan atau dekat jendela untuk sinyal GPS yang lebih baik.'
      : 'GPS timeout. Coba lagi di tempat yang lebih terbuka.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

async function prosesAbsenDenganFoto(jenis, posisi) {
  return new Promise(async (resolve, reject) => {
    // Buka kamera
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false
      });
      _stream = stream;
    } catch(e) {
      reject(new Error('Tidak dapat membuka kamera. ' + e.message));
      return;
    }

    // Buat UI kamera
    const modal = document.createElement('div');
    modal.className = 'kamera-modal';
    modal.id = 'kamera-modal';
    modal.innerHTML = `
      <div style="position:absolute;top:16px;left:0;right:0;z-index:10;
        text-align:center;color:#fff;font-size:14px;font-weight:600;
        text-shadow:0 1px 3px rgba(0,0,0,0.5)">
        ${jenis === 'masuk' ? '📷 Ambil Foto Absen Masuk' : '📷 Ambil Foto Absen Keluar'}
      </div>
      <video id="kamera-video" class="kamera-video" autoplay playsinline muted></video>
      <div id="foto-preview-wrap" style="display:none;flex:1;background:#000;
        align-items:center;justify-content:center">
        <img id="foto-preview" style="max-width:100%;max-height:100%;object-fit:contain">
      </div>
      <div class="kamera-controls">
        <button id="btn-kamera-batal" onclick="tutupKamera()"
          style="background:rgba(255,255,255,0.2);color:#fff;border:none;
          border-radius:8px;padding:10px 16px;font-size:13px;cursor:pointer">
          ✕ Batal
        </button>
        <button id="btn-ambil-foto" class="kamera-capture-btn" title="Ambil foto"></button>
        <button id="btn-ulangi" style="display:none;background:rgba(255,255,255,0.2);
          color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;cursor:pointer"
          onclick="ulangiKamera()">🔄 Ulangi</button>
        <button id="btn-gunakan" style="display:none;background:#1A9E74;color:#fff;
          border:none;border-radius:8px;padding:10px 16px;font-size:13px;
          font-weight:600;cursor:pointer">✅ Gunakan</button>
      </div>
      <div id="loading-upload" style="display:none;position:absolute;inset:0;
        background:rgba(0,0,0,0.7);z-index:20;align-items:center;justify-content:center;
        flex-direction:column;gap:12px;color:#fff">
        <div class="spinner" style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.3);
          border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <span>Memproses absensi...</span>
      </div>`;

    document.body.appendChild(modal);

    const video = document.getElementById('kamera-video');
    video.srcObject = stream;

    let fotoBlob = null;
    let fotoBase64 = null;

    // Tombol ambil foto
    document.getElementById('btn-ambil-foto').onclick = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 640;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async blob => {
        fotoBlob   = blob;
        fotoBase64 = await blobToBase64(blob);

        // Tunjukkan preview
        video.style.display = 'none';
        document.getElementById('foto-preview-wrap').style.display = 'flex';
        document.getElementById('foto-preview').src = URL.createObjectURL(blob);
        document.getElementById('btn-ambil-foto').style.display = 'none';
        document.getElementById('btn-ulangi').style.display = 'block';
        document.getElementById('btn-gunakan').style.display = 'block';
      }, 'image/jpeg', 0.8);
    };

    // Tombol gunakan foto
    document.getElementById('btn-gunakan').onclick = async () => {
      if (!fotoBase64) return;

      // Tampilkan loading
      const loadEl = document.getElementById('loading-upload');
      loadEl.style.display = 'flex';

      try {
        let result;
        if (jenis === 'masuk') {
          result = await callAPI('absenMasuk', {
            lat        : posisi.coords.latitude,
            lon        : posisi.coords.longitude,
            foto_base64: fotoBase64
          });
        } else {
          result = await callAPI('absenKeluar', {
            lat        : posisi.coords.latitude,
            lon        : posisi.coords.longitude,
            foto_base64: fotoBase64
          });
        }

        tutupKamera();
        showToast(result.message || '✅ Absen berhasil!', 'success', 4000);

        // Refresh status
        await loadStatusAbsenHariIni();
        resolve(result);
      } catch(e) {
        loadEl.style.display = 'none';
        showToast(e.message, 'error');
        reject(e);
      }
    };

    // Batal
    document.getElementById('btn-kamera-batal').onclick = () => {
      tutupKamera();
      reject(new Error('Absen dibatalkan'));
    };
  });
}

function tutupKamera() {
  if (_stream) {
    _stream.getTracks().forEach(t => t.stop());
    _stream = null;
  }
  const modal = document.getElementById('kamera-modal');
  if (modal) modal.remove();
}

function ulangiKamera() {
  const video   = document.getElementById('kamera-video');
  const preview = document.getElementById('foto-preview-wrap');
  if (video)   video.style.display = 'block';
  if (preview) preview.style.display = 'none';
  document.getElementById('btn-ambil-foto').style.display = 'block';
  document.getElementById('btn-ulangi').style.display = 'none';
  document.getElementById('btn-gunakan').style.display = 'none';
}

// ─── Halaman Daftar Absensi Karyawan ─────────────────────────
async function loadHalamanAbsensi() {
  const user  = getSession();
  const now   = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const el = document.getElementById('absensi-list');
  if (!el) return;
  el.innerHTML = skeletonCard(5);

  try {
    const data = await callAPI('getAbsensiKaryawan', { bulan, tahun });
    if (!data || data.length === 0) {
      showEmpty('absensi-list', 'Belum ada data absensi bulan ini');
      return;
    }

    const sorted = [...data].sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
    el.innerHTML = sorted.map(a => `
      <div style="background:#fff;border-radius:10px;padding:14px;margin-bottom:10px;
        border:1px solid #E2E8F0;display:flex;align-items:center;gap:12px">
        <div style="font-size:28px">${statusEmoji(a.status)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${formatTanggal(a.tanggal)} · ${a.hari||''}</div>
          <div style="font-size:12px;color:#64748B">
            ${a.jam_masuk ? '🕐 ' + a.jam_masuk : ''}
            ${a.jam_keluar ? ' – ' + a.jam_keluar : ''}
            ${!a.jam_masuk ? 'Tidak ada data jam' : ''}
          </div>
          ${a.keterangan ? `<div style="font-size:12px;color:#94A3B8;margin-top:2px">${a.keterangan}</div>` : ''}
        </div>
        <div>${badgeStatus(a.status)}</div>
      </div>`).join('');
  } catch(e) {
    showError('absensi-list', 'Gagal memuat: ' + e.message);
  }
}

function statusEmoji(status) {
  const map = {
    hadir:'✅', terlambat:'⚠️', alfa:'❌', izin:'📝',
    sakit:'🏥', cuti:'🏖️', dinas_luar:'🚗'
  };
  return map[status] || '❓';
}

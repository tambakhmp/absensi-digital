// ============================================================
// api.js — Komunikasi ke Google Apps Script Backend
// ============================================================

const CONFIG = {
  // ⚠️ GANTI dengan URL deployment GAS Anda
  GAS_URL    : 'https://script.google.com/macros/s/AKfycbylcMYWQPdor-46pRanVfhrpmNka1FFZVX8RzfdHlP5cBbgzicdDywCr3eh4vU9J-GWzg/exec',
  APP_VERSION: '5.0.0'
};

async function callAPI(action, payload = {}) {
  const token    = localStorage.getItem('session_token') || '';
  const deviceId = localStorage.getItem('device_id')    || '';

  // Cek GAS_URL sudah diisi
  if (CONFIG.GAS_URL.includes('GANTI_DENGAN')) {
    console.error('GAS_URL belum diisi di api.js!');
    throw new Error('Konfigurasi API belum diisi. Edit js/api.js dan isi CONFIG.GAS_URL dengan URL deployment GAS Anda.');
  }

  const body = JSON.stringify({ action, token, device_id: deviceId, ...payload });

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 30000); // 30 detik timeout

    const res = await fetch(CONFIG.GAS_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'text/plain' }, // GAS requirement: text/plain
      body,
      signal : controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('Server error: HTTP ' + res.status);

    const data = await res.json();
    if (!data.success) {
      if (data.error && data.error.includes('Sesi tidak valid')) {
        clearSession();
        if (!window.location.hash.includes('login')) {
          window.location.hash = '#login';
          window.location.reload();
        }
        return null;
      }
      throw new Error(data.error || 'Terjadi kesalahan di server');
    }
    return data.data;

  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timeout (30 detik). Periksa koneksi internet Anda.');
    }
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Tidak dapat terhubung ke server API. Periksa koneksi internet atau URL GAS.');
    }
    throw err;
  }
}

function clearSession() {
  localStorage.removeItem('session_token');
  localStorage.removeItem('user_data');
}

// Compress gambar sebelum upload
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio  = Math.min(maxWidth / img.width, 1);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// File ke base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Blob ke base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

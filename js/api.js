// ============================================================
// api.js — Komunikasi ke Google Apps Script Backend
// ============================================================

const CONFIG = {
  // ⚠️ GANTI dengan URL deployment GAS Anda
  GAS_URL    : 'https://script.google.com/macros/s/AKfycbxAxBW-phRZqd_emCupGJKegyyDdUcXArGLAmf_LKg4HOVNrE-7D7hR9Z-BH_sJdxGKuA/exec',
  APP_VERSION: '3.0.0'
};

async function callAPI(action, payload = {}) {
  const token    = localStorage.getItem('session_token') || '';
  const deviceId = localStorage.getItem('device_id')    || '';

  const body = JSON.stringify({ action, token, device_id: deviceId, ...payload });

  try {
    const res  = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // GAS requirement
      body
    });

    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);

    const data = await res.json();
    if (!data.success) {
      // Session expired → auto logout
      if (data.error && data.error.includes('Sesi tidak valid')) {
        clearSession();
        window.location.hash = '#login';
        return null;
      }
      throw new Error(data.error || 'Terjadi kesalahan');
    }
    return data.data;

  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
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

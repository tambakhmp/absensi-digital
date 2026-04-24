// ============================================================
// idcard.js v4 — ID Card via Canvas API Native
// ============================================================
// Strategi: Gambar ID card LANGSUNG ke canvas (bukan HTML->canvas)
// Hasil: 100% predictable, WYSIWYG, tidak bergantung browser render
// Preview: canvas 400x640 scaled-down
// Cetak: canvas 1200x1920 (3x) → download PNG
// ============================================================

const IDC_W = 400;
const IDC_H = 720;  // dinaikkan dari 640 → 720 untuk foto & QR yang lebih besar

// ════════════════════════════════════════════════════════════
// FUNGSI UTAMA: Render ke canvas element
// ════════════════════════════════════════════════════════════
async function renderIDCardToCanvas(canvas, k, instansi, opts) {
  opts = opts || {};
  const scale = opts.scale || 1;
  const includeQR = opts.showQR !== false;

  const W = IDC_W * scale;
  const H = IDC_H * scale;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Data karyawan
  const nama    = (k.nama_lengkap || '-').toUpperCase();
  const jabatan = (k.jabatan      || '-').toUpperCase();
  const dept    = k.departemen    || '-';
  const nik     = String(k.nik    || '-');
  const namaInst = (instansi?.nama_instansi || 'INSTANSI').toUpperCase();
  const tagline  = instansi?.tagline_idcard
                || instansi?.singkatan_instansi
                || 'KARTU TANDA PENGENAL';

  // Helper: scale untuk ukuran
  const s = (v) => v * scale;

  // ══════ BACKGROUND PUTIH ══════
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // ══════ HEADER BIRU (28% atas) ══════
  const headerH = H * 0.28;

  // Gradient biru
  const headerGrad = ctx.createLinearGradient(0, 0, 0, headerH);
  headerGrad.addColorStop(0, '#1E5FBF');
  headerGrad.addColorStop(1, '#2D6CDF');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, W, headerH);

  // ══════ LOAD LOGO ══════
  const logoUrl = instansi?.logo_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(instansi.logo_url || '')
        : instansi.logo_url)
    : '';

  let logoImg = null;
  if (logoUrl) {
    logoImg = await _loadImage(logoUrl).catch(() => null);
  }

  // ══════ HEADER CONTENT ══════
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const headerCenterY = headerH * 0.5;

  // Strategi: Logo di posisi atas header (kecil), nama instansi dibawahnya
  // Ini lebih rapi dan tidak ada issue text kepotong

  let contentY = s(24);  // mulai dari atas

  // Gambar logo di tengah atas (kalau ada)
  if (logoImg) {
    const logoSize = s(32);
    ctx.drawImage(logoImg, W/2 - logoSize/2, contentY, logoSize, logoSize);
    contentY += logoSize + s(8);
  }

  // Nama instansi — auto-fit font, bisa 2 baris kalau panjang
  let fontSize = s(18);
  const maxNamaW = W - s(32);
  ctx.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;
  // Coba fit ke 1 baris dengan size 18
  if (ctx.measureText(namaInst).width > maxNamaW) {
    // Tidak muat 1 baris, kurangi font
    while (ctx.measureText(namaInst).width > maxNamaW && fontSize > s(11)) {
      fontSize -= 1;
      ctx.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;
    }
  }
  // Wrap ke multi-line (max 2)
  ctx.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;
  const namaLines = _wrapText(ctx, namaInst, maxNamaW, fontSize);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  namaLines.forEach((line, i) => {
    ctx.fillText(line, W/2, contentY + i * fontSize * 1.2);
  });
  contentY += namaLines.length * fontSize * 1.2 + s(8);

  // Garis pemisah
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = s(1);
  ctx.beginPath();
  ctx.moveTo(W * 0.2, contentY);
  ctx.lineTo(W * 0.8, contentY);
  ctx.stroke();
  contentY += s(8);

  // Tagline
  ctx.font = `500 ${s(11)}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(tagline, W/2, contentY);

  // ══════ CURVE TRANSITION (dari header ke body putih) ══════
  // Curve bawah header
  ctx.fillStyle = '#1E5FBF';
  ctx.beginPath();
  ctx.moveTo(0, headerH - s(5));
  ctx.quadraticCurveTo(W/4, headerH + s(30), W/2, headerH);
  ctx.quadraticCurveTo(W*3/4, headerH - s(30), W, headerH + s(10));
  ctx.lineTo(W, headerH - s(5));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2D6CDF';
  ctx.beginPath();
  ctx.moveTo(0, headerH - s(15));
  ctx.quadraticCurveTo(W/4, headerH + s(20), W/2, headerH - s(10));
  ctx.quadraticCurveTo(W*3/4, headerH - s(40), W, headerH);
  ctx.lineTo(W, headerH - s(15));
  ctx.closePath();
  ctx.fill();

  // ══════ FOTO BULAT (besar, proporsional) ══════
  const fotoSize = W * 0.42;  // dari 32% → 42% (lebih besar)
  const fotoX = (W - fotoSize) / 2;
  const fotoY = headerH - fotoSize * 0.3;  // overlap sedikit ke header

  // Border putih bulat
  ctx.save();
  ctx.beginPath();
  ctx.arc(W/2, fotoY + fotoSize/2, fotoSize/2 + s(4), 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = s(12);
  ctx.shadowOffsetY = s(4);
  ctx.fill();
  ctx.restore();

  // Clip untuk foto bulat
  ctx.save();
  ctx.beginPath();
  ctx.arc(W/2, fotoY + fotoSize/2, fotoSize/2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Load foto
  const fotoUrl = k.foto_profil_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(k.foto_profil_url)
        : k.foto_profil_url)
    : '';

  let fotoImg = null;
  if (fotoUrl) {
    fotoImg = await _loadImage(fotoUrl).catch(() => null);
  }

  if (fotoImg) {
    // Cover fit (seperti object-fit: cover)
    const imgRatio = fotoImg.width / fotoImg.height;
    let drawW = fotoSize, drawH = fotoSize;
    let drawX = fotoX, drawY = fotoY;
    if (imgRatio > 1) {
      drawW = fotoSize * imgRatio;
      drawX = fotoX - (drawW - fotoSize) / 2;
    } else {
      drawH = fotoSize / imgRatio;
      drawY = fotoY - (drawH - fotoSize) / 2;
    }
    ctx.drawImage(fotoImg, drawX, drawY, drawW, drawH);
  } else {
    // Placeholder inisial
    ctx.fillStyle = '#2D6CDF';
    ctx.fillRect(fotoX, fotoY, fotoSize, fotoSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${s(60)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((nama.charAt(0) || '?'), W/2, fotoY + fotoSize/2);
  }
  ctx.restore();

  // ══════ NAMA + JABATAN + DEPT + NIK ══════
  const bodyStartY = fotoY + fotoSize + s(20);
  let textY = bodyStartY;

  // Nama (auto-fit)
  ctx.fillStyle = '#1E293B';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let namaFontSize = s(22);
  ctx.font = `800 ${namaFontSize}px Arial, Helvetica, sans-serif`;
  while (ctx.measureText(nama).width > W - s(32) && namaFontSize > s(14)) {
    namaFontSize -= 1;
    ctx.font = `800 ${namaFontSize}px Arial, Helvetica, sans-serif`;
  }
  const namaLinesB = _wrapText(ctx, nama, W - s(32), namaFontSize);
  namaLinesB.forEach((line, i) => {
    ctx.fillText(line, W/2, textY + i * namaFontSize * 1.15);
  });
  textY += namaLinesB.length * namaFontSize * 1.15 + s(10);

  // Jabatan (biru)
  ctx.fillStyle = '#2D6CDF';
  ctx.font = `700 ${s(13)}px Arial, Helvetica, sans-serif`;
  // Auto-fit jabatan
  let jabatanFont = s(13);
  while (ctx.measureText(jabatan).width > W - s(32) && jabatanFont > s(9)) {
    jabatanFont -= 1;
    ctx.font = `700 ${jabatanFont}px Arial, Helvetica, sans-serif`;
  }
  ctx.fillText(jabatan, W/2, textY);
  textY += jabatanFont * 1.4;

  // Departemen (abu kecil)
  ctx.fillStyle = '#64748B';
  ctx.font = `500 ${s(11)}px Arial, Helvetica, sans-serif`;
  ctx.fillText(dept, W/2, textY);
  textY += s(14);

  // NIK
  ctx.fillStyle = '#475569';
  ctx.font = `normal ${s(11)}px Arial, Helvetica, sans-serif`;
  const nikLabel = 'NIK: ';
  const nikLabelW = ctx.measureText(nikLabel).width;
  ctx.font = `bold ${s(11)}px Arial, Helvetica, sans-serif`;
  const nikValueW = ctx.measureText(nik).width;
  const nikTotalW = nikLabelW + nikValueW;
  // Gambar NIK: label + value
  const nikStartX = (W - nikTotalW) / 2;
  ctx.textAlign = 'left';
  ctx.font = `normal ${s(11)}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#475569';
  ctx.fillText(nikLabel, nikStartX, textY);
  ctx.font = `bold ${s(11)}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#1E293B';
  ctx.fillText(nik, nikStartX + nikLabelW, textY);
  textY += s(22);

  // ══════ QR CODE (lebih besar, proporsional) ══════
  if (includeQR) {
    try {
      const qrDataUrl = await _generateQRDataURL(k.id_karyawan, s(160));
      if (qrDataUrl) {
        const qrImg = await _loadImage(qrDataUrl);
        const qrSize = s(150);  // dari 108 → 150 (lebih besar)
        const qrX = (W - qrSize) / 2;
        const qrY = textY;

        // Border box putih dengan border tipis
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = s(1);
        ctx.fillRect(qrX - s(8), qrY - s(8), qrSize + s(16), qrSize + s(16));
        ctx.strokeRect(qrX - s(8), qrY - s(8), qrSize + s(16), qrSize + s(16));

        // QR
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      }
    } catch(e) {
      console.warn('[idcard] QR generation failed:', e.message);
    }
  }

  // ══════ FOOTER CURVE + BIRU ══════
  const footerH = H * 0.06;
  const footerY = H - footerH;

  // Curve atas footer
  ctx.fillStyle = '#2D6CDF';
  ctx.beginPath();
  ctx.moveTo(0, footerY + s(2));
  ctx.quadraticCurveTo(W/4, footerY - s(20), W/2, footerY + s(5));
  ctx.quadraticCurveTo(W*3/4, footerY + s(20), W, footerY - s(5));
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Footer solid bagian bawah
  const footerGrad = ctx.createLinearGradient(0, footerY, W, footerY);
  footerGrad.addColorStop(0, '#1E5FBF');
  footerGrad.addColorStop(1, '#2D6CDF');
  ctx.fillStyle = footerGrad;
  ctx.fillRect(0, H - s(14), W, s(14));

  return canvas;
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

// Load image sebagai Image object, return null kalau gagal
function _loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      reject(new Error('Timeout loading image'));
    }, 8000);
    img.onload = () => { clearTimeout(timeout); resolve(img); };
    img.onerror = () => { clearTimeout(timeout); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// Wrap text ke multiple lines kalau tidak muat
function _wrapText(ctx, text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    if (ctx.measureText(testLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Limit max 2 lines
  if (lines.length > 2) {
    return [lines[0], lines.slice(1).join(' ').substring(0, 30)];
  }
  return lines.length > 0 ? lines : [text];
}

// Generate QR code sebagai data URL (pakai qrcodejs library)
async function _generateQRDataURL(idKaryawan, sizePx) {
  if (typeof QRCode === 'undefined') {
    console.warn('[idcard] QRCode library tidak ada');
    return null;
  }
  try {
    const data = await callAPI('getQRPayloadKaryawan', { id_karyawan: idKaryawan });
    if (!data || !data.payload) {
      console.warn('[idcard] QR payload kosong');
      return null;
    }

    // Buat temp div untuk generate QR
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:absolute;top:-9999px;left:-9999px';
    document.body.appendChild(tempDiv);

    new QRCode(tempDiv, {
      text: data.payload,
      width: Math.round(sizePx),
      height: Math.round(sizePx),
      colorDark: '#0F172A',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });

    // Tunggu qrcodejs render (async)
    await new Promise(r => setTimeout(r, 150));

    // Ambil canvas atau img
    const canvas = tempDiv.querySelector('canvas');
    const img = tempDiv.querySelector('img');

    let dataUrl = null;
    if (canvas) {
      dataUrl = canvas.toDataURL('image/png');
    } else if (img && img.src) {
      dataUrl = img.src;
    }

    document.body.removeChild(tempDiv);
    return dataUrl;
  } catch(e) {
    console.warn('[idcard] QR generate error:', e.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════
// LOAD PREVIEW — dipanggil dari profil.js & admin_karyawan.js
// ════════════════════════════════════════════════════════════
async function loadIDCardPreview(containerId, k, instansi, opts) {
  const wrap = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  if (!wrap) return;

  // Clear & setup container
  wrap.innerHTML = '';
  wrap.style.position = 'relative';
  wrap.style.overflow = 'hidden';
  wrap.style.background = '#fff';
  if (!wrap.style.aspectRatio) wrap.style.aspectRatio = '400 / 640';

  // Loading indicator
  const loading = document.createElement('div');
  loading.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:12px;background:#F8FAFC';
  loading.innerHTML = '<div style="text-align:center"><div style="width:28px;height:28px;border:3px solid #CBD5E1;border-top-color:#2D6CDF;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 8px"></div>Memuat ID Card...</div>';
  wrap.appendChild(loading);

  try {
    // Buat canvas
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;position:absolute;inset:0';

    // Render (scale 2 untuk ketajaman di preview)
    await renderIDCardToCanvas(canvas, k, instansi || {}, {
      scale: 2,
      showQR: opts?.showQR !== false
    });

    wrap.removeChild(loading);
    wrap.appendChild(canvas);
  } catch(e) {
    console.error('[loadIDCardPreview]', e);
    loading.innerHTML = '<div style="color:#DC2626;text-align:center;padding:20px">❌ Gagal render<br><small style="color:#94A3B8">' + e.message + '</small></div>';
  }
}

// ════════════════════════════════════════════════════════════
// DOWNLOAD PNG HIGH-RES
// ════════════════════════════════════════════════════════════
async function cetakIDCard(idKaryawan) {
  if (typeof showToast === 'function') showToast('Menyiapkan ID Card...', 'info', 2000);

  try {
    const [k, inst] = await Promise.all([
      callAPI('getKaryawanById', { id_karyawan: idKaryawan }),
      callAPI('getMultipleSetting', {
        keys: 'nama_instansi,singkatan_instansi,alamat_instansi,logo_url,footer_text,tagline_idcard'
      })
    ]);
    if (!k) throw new Error('Data karyawan tidak ditemukan');

    // Render ke canvas dengan scale 3x (1200x1920) untuk kualitas print
    const canvas = document.createElement('canvas');
    await renderIDCardToCanvas(canvas, k, inst, {
      scale: 3,
      showQR: true
    });

    // Convert ke PNG blob
    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Gagal membuat PNG'));
      }, 'image/png', 1.0);
    });

    // Download
    const fileName = 'IDCard_' + (k.nama_lengkap || 'karyawan').replace(/\s+/g, '_') + '.png';
    const url = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (typeof showToast === 'function') showToast('ID Card berhasil didownload! 🪪', 'success');

  } catch(e) {
    console.error('[cetakIDCard]', e);
    if (typeof showToast === 'function') {
      showToast('Gagal cetak ID Card: ' + e.message, 'error', 5000);
    }
  }
}

// ════════════════════════════════════════════════════════════
// BACKWARD COMPAT
// ════════════════════════════════════════════════════════════
async function cetakIDCardSaya() {
  const user = (typeof getSession === 'function') ? getSession() : null;
  if (!user) return;
  return cetakIDCard(user.id_karyawan);
}

// Stub biar tidak error kalau ada tempat yang masih panggil fungsi lama
function _idCardPreviewHTML(k, instansi) {
  return '<div style="padding:20px;color:#94A3B8;text-align:center">ID Card loading via canvas...</div>';
}

// Dummy inject QR function biar backward compat
async function injectQRIDCard() { return true; }

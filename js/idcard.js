// ============================================================
// idcard.js v5 — ID Card Profesional 933×1476px (300 DPI)
// Ukuran: 7.9cm × 12.5cm @ 300 DPI — Standar ID Card
// Warna: Biru Deep + Gold Aksen
// Download: JPG (lebih kecil) + PNG (kualitas print)
// ============================================================

const IDC_W = 933;
const IDC_H = 1476;

// Palet warna
const CLR = {
  blue1    : '#0D3B7A',   // biru deep (header atas)
  blue2    : '#1B5CBF',   // biru medium
  blue3    : '#2D6CDF',   // biru terang
  gold1    : '#B8860B',   // gold deep
  gold2    : '#D4A017',   // gold medium
  gold3    : '#F0C040',   // gold terang
  white    : '#FFFFFF',
  dark     : '#0F172A',
  gray1    : '#334155',
  gray2    : '#64748B',
  gray3    : '#94A3B8',
  bg       : '#F0F6FF',   // background body sangat terang
};

// ════════════════════════════════════════════════════════════
// RENDER UTAMA
// ════════════════════════════════════════════════════════════
async function renderIDCardToCanvas(canvas, k, instansi, opts) {
  opts = opts || {};
  const scale     = opts.scale || 1;
  const includeQR = opts.showQR !== false;

  const W = Math.round(IDC_W * scale);
  const H = Math.round(IDC_H * scale);
  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const s = v => Math.round(v * scale);

  // Data
  const nama     = (k.nama_lengkap   || '-').toUpperCase();
  const jabatan  = (k.jabatan        || '-').toUpperCase();
  const dept     = (k.departemen     || '-').toUpperCase();
  const nik      = String(k.nik      || '-');
  const tglMasuk = String(k.tanggal_masuk || '-');
  const namaInst = (instansi?.nama_instansi || 'INSTANSI').toUpperCase();
  const alamat   = instansi?.alamat_instansi || '';

  // ── BACKGROUND BODY ────────────────────────────────────────
  ctx.fillStyle = CLR.bg;
  ctx.fillRect(0, 0, W, H);

  // ── HEADER (34% tinggi) ────────────────────────────────────
  const headerH = Math.round(H * 0.28);

  // Gradient biru
  const hGrad = ctx.createLinearGradient(0, 0, 0, headerH);
  hGrad.addColorStop(0, CLR.blue1);
  hGrad.addColorStop(0.6, CLR.blue2);
  hGrad.addColorStop(1, CLR.blue3);
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, headerH);

  // Pattern diagonal halus di header (texture)
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = -H; i < W + H; i += s(20)) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.strokeStyle = CLR.white;
    ctx.lineWidth = s(8);
    ctx.stroke();
  }
  ctx.restore();

  // ── LOAD LOGO ──────────────────────────────────────────────
  const logoUrl = instansi?.logo_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(instansi.logo_url)
        : instansi.logo_url)
    : '';
  let logoImg = null;
  if (logoUrl) logoImg = await _loadImage(logoUrl).catch(() => null);

  // ── HEADER CONTENT ─────────────────────────────────────────
  let cY = s(32);

  // Logo besar di tengah
  if (logoImg) {
    const logoSz = s(120);
    // Circle background putih untuk logo
    ctx.save();
    ctx.beginPath();
    ctx.arc(W/2, cY + logoSz/2, logoSz/2 + s(8), 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.restore();
    ctx.drawImage(logoImg, W/2 - logoSz/2, cY, logoSz, logoSz);
    cY += logoSz + s(18);
  } else {
    // Placeholder logo bulat
    ctx.save();
    ctx.beginPath();
    ctx.arc(W/2, cY + s(45), s(45), 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();
    ctx.fillStyle = CLR.white;
    ctx.font = `bold ${s(32)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(namaInst.charAt(0), W/2, cY + s(45));
    ctx.restore();
    cY += s(90) + s(18);
  }

  // Nama instansi
  ctx.fillStyle = CLR.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let fSz = s(30);
  ctx.font = `900 ${fSz}px Arial, sans-serif`;
  while (ctx.measureText(namaInst).width > W - s(40) && fSz > s(16)) {
    fSz--;
    ctx.font = `900 ${fSz}px Arial, sans-serif`;
  }
  const namaLines = _wrapText(ctx, namaInst, W - s(40), fSz);
  namaLines.forEach((line, i) => {
    ctx.fillText(line, W/2, cY + i * fSz * 1.25);
  });
  cY += namaLines.length * fSz * 1.25 + s(12);

  // Garis gold tipis
  const goldGrad = ctx.createLinearGradient(W*0.15, 0, W*0.85, 0);
  goldGrad.addColorStop(0, 'transparent');
  goldGrad.addColorStop(0.2, CLR.gold2);
  goldGrad.addColorStop(0.8, CLR.gold3);
  goldGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = s(2.5);
  ctx.beginPath();
  ctx.moveTo(W*0.15, cY);
  ctx.lineTo(W*0.85, cY);
  ctx.stroke();
  cY += s(10);

  // Tagline / Kartu Tanda Pengenal
  const tagline = (instansi?.tagline_idcard || instansi?.singkatan_instansi || 'KARTU TANDA PENGENAL').toUpperCase();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 ${s(16)}px Arial, sans-serif`;
  ctx.fillText(tagline, W/2, cY);

  // ── GOLD STRIP bawah header ────────────────────────────────
  const stripH = s(10);
  const gStrip = ctx.createLinearGradient(0, 0, W, 0);
  gStrip.addColorStop(0, CLR.gold1);
  gStrip.addColorStop(0.4, CLR.gold3);
  gStrip.addColorStop(0.6, CLR.gold2);
  gStrip.addColorStop(1, CLR.gold1);
  ctx.fillStyle = gStrip;
  ctx.fillRect(0, headerH - stripH, W, stripH);

  // ── CURVED WAVE bawah header ───────────────────────────────
  ctx.fillStyle = CLR.blue3;
  ctx.beginPath();
  ctx.moveTo(0, headerH - stripH - s(2));
  ctx.quadraticCurveTo(W*0.25, headerH + s(20), W*0.5, headerH - s(5));
  ctx.quadraticCurveTo(W*0.75, headerH - s(28), W, headerH + s(15));
  ctx.lineTo(W, headerH - stripH - s(2));
  ctx.closePath();
  ctx.fill();

  // ── FOTO KARYAWAN ──────────────────────────────────────────
  const fotoSz  = Math.round(W * 0.46);  // 46% lebar
  const fotoX   = (W - fotoSz) / 2;
  const fotoY   = headerH - fotoSz * 0.35;  // overlap header lebih besar

  // Shadow foto
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.30)';
  ctx.shadowBlur  = s(20);
  ctx.shadowOffsetY = s(6);
  ctx.beginPath();
  ctx.arc(W/2, fotoY + fotoSz/2, fotoSz/2 + s(7), 0, Math.PI*2);
  ctx.fillStyle = CLR.white;
  ctx.fill();
  ctx.restore();

  // Border gold foto
  const goldBorder = ctx.createLinearGradient(
    fotoX, fotoY, fotoX + fotoSz, fotoY + fotoSz
  );
  goldBorder.addColorStop(0, CLR.gold3);
  goldBorder.addColorStop(0.5, CLR.gold1);
  goldBorder.addColorStop(1, CLR.gold3);
  ctx.save();
  ctx.beginPath();
  ctx.arc(W/2, fotoY + fotoSz/2, fotoSz/2 + s(7), 0, Math.PI*2);
  ctx.strokeStyle = goldBorder;
  ctx.lineWidth   = s(5);
  ctx.stroke();
  ctx.restore();

  // Clip foto bulat
  ctx.save();
  ctx.beginPath();
  ctx.arc(W/2, fotoY + fotoSz/2, fotoSz/2, 0, Math.PI*2);
  ctx.clip();

  const fotoUrl = k.foto_profil_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(k.foto_profil_url)
        : k.foto_profil_url)
    : '';
  let fotoImg = null;
  if (fotoUrl) fotoImg = await _loadImage(fotoUrl).catch(() => null);

  if (fotoImg) {
    const r = fotoImg.width / fotoImg.height;
    let dw = fotoSz, dh = fotoSz, dx = fotoX, dy = fotoY;
    if (r > 1) { dw = fotoSz*r; dx = fotoX-(dw-fotoSz)/2; }
    else { dh = fotoSz/r; dy = fotoY-(dh-fotoSz)/2; }
    ctx.drawImage(fotoImg, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(fotoX, fotoY, fotoSz, fotoSz);
    ctx.fillStyle = CLR.white;
    ctx.font = `bold ${s(80)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nama.charAt(0) || '?', W/2, fotoY + fotoSz/2);
  }
  ctx.restore();

  // ── INFO KARYAWAN ──────────────────────────────────────────
  let tY = fotoY + fotoSz + s(22);

  // Nama
  ctx.fillStyle = CLR.dark;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let nFsz = s(38);
  ctx.font = `900 ${nFsz}px Arial, sans-serif`;
  while (ctx.measureText(nama).width > W - s(40) && nFsz > s(22)) {
    nFsz--;
    ctx.font = `900 ${nFsz}px Arial, sans-serif`;
  }
  const namaBodyLines = _wrapText(ctx, nama, W - s(48), nFsz);
  namaBodyLines.forEach((line, i) => {
    ctx.fillText(line, W/2, tY + i * nFsz * 1.2);
  });
  tY += namaBodyLines.length * nFsz * 1.2 + s(10);

  // Jabatan (biru dengan bg ringan)
  ctx.fillStyle = CLR.blue3;
  let jFsz = s(22);
  ctx.font = `700 ${jFsz}px Arial, sans-serif`;
  while (ctx.measureText(jabatan).width > W - s(40) && jFsz > s(14)) {
    jFsz--;
    ctx.font = `700 ${jFsz}px Arial, sans-serif`;
  }
  ctx.fillText(jabatan, W/2, tY);
  tY += jFsz * 1.5;

  // Departemen
  ctx.fillStyle = CLR.gray2;
  ctx.font = `600 ${s(17)}px Arial, sans-serif`;
  ctx.fillText(dept, W/2, tY);
  tY += s(22);

  // ── DIVIDER GOLD ───────────────────────────────────────────
  const dGrad = ctx.createLinearGradient(W*0.1, 0, W*0.9, 0);
  dGrad.addColorStop(0, 'transparent');
  dGrad.addColorStop(0.3, CLR.gold2);
  dGrad.addColorStop(0.7, CLR.gold2);
  dGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = dGrad;
  ctx.lineWidth = s(1.5);
  ctx.beginPath();
  ctx.moveTo(W*0.1, tY);
  ctx.lineTo(W*0.9, tY);
  ctx.stroke();
  tY += s(16);

  // ── INFO BOX (NIK + Tgl Masuk) ─────────────────────────────
  const boxW  = W - s(60);
  const boxH  = s(82);
  const boxX  = s(30);
  const boxY  = tY;

  // Background box biru sangat terang
  ctx.fillStyle = '#E8F0FE';
  _roundRect(ctx, boxX, boxY, boxW, boxH, s(10));
  ctx.fill();

  // Border biru tipis
  ctx.strokeStyle = '#B8D0F8';
  ctx.lineWidth = s(1);
  _roundRect(ctx, boxX, boxY, boxW, boxH, s(10));
  ctx.stroke();

  // Garis tengah pemisah
  ctx.strokeStyle = '#B8D0F8';
  ctx.lineWidth = s(1);
  ctx.beginPath();
  ctx.moveTo(boxX + boxW/2, boxY + s(10));
  ctx.lineTo(boxX + boxW/2, boxY + boxH - s(10));
  ctx.stroke();

  // NIK (kiri)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CLR.gray2;
  ctx.font = `600 ${s(13)}px Arial, sans-serif`;
  ctx.fillText('NIK', boxX + boxW/4, boxY + s(22));
  ctx.fillStyle = CLR.dark;
  ctx.font = `800 ${s(18)}px Arial, sans-serif`;
  ctx.fillText(nik, boxX + boxW/4, boxY + boxH/2 + s(6));

  // Tanggal Masuk (kanan)
  ctx.fillStyle = CLR.gray2;
  ctx.font = `600 ${s(13)}px Arial, sans-serif`;
  ctx.fillText('TGL MASUK', boxX + boxW*3/4, boxY + s(22));
  ctx.fillStyle = CLR.dark;
  ctx.font = `800 ${s(17)}px Arial, sans-serif`;
  ctx.fillText(tglMasuk, boxX + boxW*3/4, boxY + boxH/2 + s(6));

  tY += boxH + s(20);

  // ── QR CODE ────────────────────────────────────────────────
  if (includeQR) {
    try {
      const qrSz = s(280);
      const qrDataUrl = await _generateQRDataURL(k.id_karyawan, qrSz + s(10));
      if (qrDataUrl) {
        const qrImg = await _loadImage(qrDataUrl);
        const qrX   = (W - qrSz) / 2;
        const qrY2  = tY;

        // Shadow box QR
        ctx.save();
        ctx.shadowColor  = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur   = s(12);
        ctx.shadowOffsetY= s(4);
        ctx.fillStyle    = CLR.white;
        _roundRect(ctx, qrX - s(14), qrY2 - s(14), qrSz + s(28), qrSz + s(28), s(12));
        ctx.fill();
        ctx.restore();

        // Border gold QR
        ctx.strokeStyle = CLR.gold2;
        ctx.lineWidth   = s(2);
        _roundRect(ctx, qrX - s(14), qrY2 - s(14), qrSz + s(28), qrSz + s(28), s(12));
        ctx.stroke();

        // QR image
        ctx.drawImage(qrImg, qrX, qrY2, qrSz, qrSz);
        tY += qrSz + s(14);

        // Teks bawah QR
        ctx.fillStyle    = CLR.gray1;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `700 ${s(15)}px Arial, sans-serif`;
        ctx.fillText('Scan untuk verifikasi identitas', W/2, tY);
        tY += s(14);
        ctx.fillStyle = CLR.gray3;
        ctx.font = `400 ${s(12)}px Arial, sans-serif`;
        ctx.fillText('ID: ' + (k.id_karyawan || '-'), W/2, tY);
      }
    } catch(e) {
      console.warn('[idcard] QR failed:', e.message);
    }
  }

  // ── FOOTER ─────────────────────────────────────────────────
  const footerH = Math.round(H * 0.10);
  const footerY = H - footerH;

  // Curve atas footer
  ctx.fillStyle = CLR.blue2;
  ctx.beginPath();
  ctx.moveTo(0, footerY + s(10));
  ctx.quadraticCurveTo(W*0.25, footerY - s(18), W*0.5, footerY + s(6));
  ctx.quadraticCurveTo(W*0.75, footerY + s(24), W, footerY - s(8));
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Gradient footer
  const fGrad = ctx.createLinearGradient(0, footerY, 0, H);
  fGrad.addColorStop(0, CLR.blue2);
  fGrad.addColorStop(1, CLR.blue1);
  ctx.fillStyle = fGrad;
  ctx.fillRect(0, footerY + s(20), W, H - footerY - s(20));

  // Gold strip atas footer
  ctx.fillStyle = CLR.gold2;
  ctx.fillRect(0, footerY + s(18), W, s(3));

  // Teks footer
  const fMidY = footerY + footerH * 0.45;
  ctx.fillStyle    = CLR.white;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${s(16)}px Arial, sans-serif`;
  ctx.fillText(namaInst, W/2, fMidY);

  if (alamat) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `400 ${s(12)}px Arial, sans-serif`;
    // Potong alamat kalau terlalu panjang
    let alamatText = alamat;
    while (ctx.measureText(alamatText).width > W - s(40) && alamatText.length > 20) {
      alamatText = alamatText.slice(0, -4) + '...';
    }
    ctx.fillText(alamatText, W/2, fMidY + s(20));
  }

  return canvas;
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => reject(new Error('Timeout')), 8000);
    img.onload  = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); reject(new Error('Load failed')); };
    img.src = url;
  });
}

function _wrapText(ctx, text, maxW, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let cur = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    const test = cur + ' ' + words[i];
    if (ctx.measureText(test).width > maxW) { lines.push(cur); cur = words[i]; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) return [lines[0], lines.slice(1).join(' ').slice(0, 35)];
  return lines.length > 0 ? lines : [text];
}

async function _generateQRDataURL(idKaryawan, sizePx) {
  if (typeof QRCode === 'undefined') return null;
  try {
    const data = await callAPI('getQRPayloadKaryawan', { id_karyawan: idKaryawan });
    if (!data || !data.payload) return null;
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
    await new Promise(r => setTimeout(r, 150));
    const cvs = tempDiv.querySelector('canvas');
    const img = tempDiv.querySelector('img');
    const dataUrl = cvs ? cvs.toDataURL('image/png')
                  : (img?.src || null);
    document.body.removeChild(tempDiv);
    return dataUrl;
  } catch(e) {
    console.warn('[idcard] QR error:', e.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════
// PREVIEW
// ════════════════════════════════════════════════════════════
async function loadIDCardPreview(containerId, k, instansi, opts) {
  const wrap = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  if (!wrap) return;

  wrap.innerHTML = '';
  wrap.style.position   = 'relative';
  wrap.style.overflow   = 'hidden';
  wrap.style.background = '#fff';
  if (!wrap.style.aspectRatio) wrap.style.aspectRatio = `${IDC_W} / ${IDC_H}`;

  const loading = document.createElement('div');
  loading.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:12px;background:#F8FAFC';
  loading.innerHTML = '<div style="text-align:center"><div style="width:28px;height:28px;border:3px solid #CBD5E1;border-top-color:#2D6CDF;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 8px"></div>Memuat ID Card...</div>';
  wrap.appendChild(loading);

  try {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;position:absolute;inset:0';

    // Scale untuk preview: sesuaikan dengan container
    const containerW = wrap.offsetWidth || 300;
    const previewScale = Math.min(containerW / IDC_W, 1) * 2; // *2 untuk retina

    await renderIDCardToCanvas(canvas, k, instansi || {}, {
      scale: previewScale,
      showQR: opts?.showQR !== false
    });
    wrap.removeChild(loading);
    wrap.appendChild(canvas);
  } catch(e) {
    console.error('[loadIDCardPreview]', e);
    loading.innerHTML = '<div style="color:#DC2626;text-align:center;padding:20px">Gagal render<br><small style="color:#94A3B8">' + e.message + '</small></div>';
  }
}

// ════════════════════════════════════════════════════════════
// DOWNLOAD — JPG atau PNG, resolusi penuh 933×1476
// ════════════════════════════════════════════════════════════
async function cetakIDCard(idKaryawan, format) {
  format = format || 'jpg'; // default JPG
  if (typeof showToast === 'function') showToast('Menyiapkan ID Card...', 'info', 2000);

  try {
    const [k, inst] = await Promise.all([
      callAPI('getKaryawanById', { id_karyawan: idKaryawan }),
      callAPI('getMultipleSetting', {
        keys: 'nama_instansi,singkatan_instansi,alamat_instansi,logo_url,footer_text,tagline_idcard'
      })
    ]);
    if (!k) throw new Error('Data karyawan tidak ditemukan');

    // Render scale=1 = ukuran asli 933×1476 (300 DPI)
    const canvas = document.createElement('canvas');
    await renderIDCardToCanvas(canvas, k, inst, { scale: 1, showQR: true });

    const isJpg     = format === 'jpg';
    const mimeType  = isJpg ? 'image/jpeg' : 'image/png';
    const quality   = isJpg ? 0.95 : 1.0;
    const ext       = isJpg ? 'jpg' : 'png';

    const blob = await new Promise((res, rej) => {
      canvas.toBlob(b => b ? res(b) : rej(new Error('Gagal buat ' + ext.toUpperCase())), mimeType, quality);
    });

    const fileName = 'IDCard_' + (k.nama_lengkap || 'karyawan').replace(/\s+/g, '_') + '.' + ext;
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (typeof showToast === 'function')
      showToast('ID Card berhasil didownload (' + ext.toUpperCase() + ')!', 'success');
  } catch(e) {
    console.error('[cetakIDCard]', e);
    if (typeof showToast === 'function')
      showToast('Gagal cetak ID Card: ' + e.message, 'error', 5000);
  }
}

// Download JPG
async function cetakIDCardJPG(idKaryawan) { return cetakIDCard(idKaryawan, 'jpg'); }
// Download PNG
async function cetakIDCardPNG(idKaryawan) { return cetakIDCard(idKaryawan, 'png'); }

// ════════════════════════════════════════════════════════════
// BACKWARD COMPAT
// ════════════════════════════════════════════════════════════
async function cetakIDCardSaya() {
  const user = typeof getSession === 'function' ? getSession() : null;
  if (!user) return;
  return cetakIDCard(user.id_karyawan, 'jpg');
}
function _idCardPreviewHTML() {
  return '<div style="padding:20px;color:#94A3B8;text-align:center">ID Card loading...</div>';
}
async function injectQRIDCard() { return true; }

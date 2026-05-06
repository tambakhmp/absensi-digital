// ============================================================
// idcard.js v5 — ID Card Profesional 933×1476px (300 DPI)
// Ukuran: 7.9cm × 12.5cm @ 300 DPI — Standar ID Card
// Warna: Biru Deep + Gold Aksen
// Download: JPG (lebih kecil) + PNG (kualitas print)
// ============================================================

const IDC_W = 933;
const IDC_H = 1750;  // Tinggi dinaikkan agar QR besar dan teks besar bisa muat

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
// Format tanggal: "24/07/2019" → "24 Juli 2019"
function _formatTglID(tgl) {
  if (!tgl || tgl === '-') return '-';
  const BULAN = ['','Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'];
  const p = String(tgl).split('/');
  if (p.length >= 3) {
    const d = parseInt(p[0]), m = parseInt(p[1]), y = p[2];
    if (d && m && y && m <= 12) return d + ' ' + BULAN[m] + ' ' + y;
  }
  // Coba format yyyy-mm-dd
  const p2 = String(tgl).split('-');
  if (p2.length >= 3) {
    const y = p2[0], m = parseInt(p2[1]), d = parseInt(p2[2]);
    if (d && m && y && m <= 12) return d + ' ' + BULAN[m] + ' ' + y;
  }
  return tgl;
}

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

  const s  = v => Math.round(v * scale);
  const cx = W / 2; // center x

  // Data
  const nama     = (k.nama_lengkap   || '-').toUpperCase();
  const jabatan  = (k.jabatan        || '-').toUpperCase();
  const dept     = (k.departemen     || '-').toUpperCase();
  const nik      = String(k.nik      || '-');
  const tglMasuk = _formatTglID(k.tanggal_masuk || '-');
  const namaInst = (instansi?.nama_instansi || 'INSTANSI').toUpperCase();
  const alamat   = instansi?.alamat_instansi || '';

  // ── LAYOUT ZONES (fixed proportions) ───────────────────────
  const HEADER_H  = Math.round(H * 0.26);  // 26%
  const FOOTER_H  = Math.round(H * 0.09);  // 9%
  const FOOTER_Y  = H - FOOTER_H;
  const STRIP_H   = s(10);
  const BODY_Y    = HEADER_H;
  const BODY_H    = FOOTER_Y - BODY_Y;

  // ── BACKGROUND ─────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0,   '#EEF4FF');
  bgGrad.addColorStop(0.5, '#F5F8FF');
  bgGrad.addColorStop(1,   '#EEF4FF');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle dot pattern background
  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let px = s(20); px < W; px += s(28)) {
    for (let py = HEADER_H + s(10); py < FOOTER_Y; py += s(28)) {
      ctx.beginPath();
      ctx.arc(px, py, s(2), 0, Math.PI*2);
      ctx.fillStyle = CLR.blue2;
      ctx.fill();
    }
  }
  ctx.restore();

  // ── HEADER GRADIENT BIRU ───────────────────────────────────
  const hGrad = ctx.createLinearGradient(0, 0, W*0.3, HEADER_H);
  hGrad.addColorStop(0,   '#0A2F6B');
  hGrad.addColorStop(0.5, CLR.blue2);
  hGrad.addColorStop(1,   CLR.blue3);
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, HEADER_H);

  // Diagonal texture header
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = -H; i < W + H; i += s(22)) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = s(9);
    ctx.stroke();
  }
  ctx.restore();

  // ── GOLD STRIP bawah header ────────────────────────────────
  const gStrip = ctx.createLinearGradient(0, 0, W, 0);
  gStrip.addColorStop(0,   CLR.gold1);
  gStrip.addColorStop(0.3, CLR.gold3);
  gStrip.addColorStop(0.7, CLR.gold2);
  gStrip.addColorStop(1,   CLR.gold1);
  ctx.fillStyle = gStrip;
  ctx.fillRect(0, HEADER_H - STRIP_H, W, STRIP_H);

  // ── WAVE bawah header ─────────────────────────────────────
  ctx.fillStyle = CLR.blue3;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H - STRIP_H - s(2));
  ctx.quadraticCurveTo(W*0.25, HEADER_H + s(18), W*0.5, HEADER_H - s(4));
  ctx.quadraticCurveTo(W*0.75, HEADER_H - s(24), W, HEADER_H + s(12));
  ctx.lineTo(W, HEADER_H - STRIP_H - s(2));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // ── LOAD ASSETS ────────────────────────────────────────────
  const logoUrl = instansi?.logo_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(instansi.logo_url)
        : instansi.logo_url) : '';
  let logoImg = null;
  if (logoUrl) logoImg = await _loadImage(logoUrl).catch(() => null);

  const fotoUrl = k.foto_profil_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(k.foto_profil_url)
        : k.foto_profil_url) : '';
  let fotoImg = null;
  if (fotoUrl) fotoImg = await _loadImage(fotoUrl).catch(() => null);

  // ── HEADER CONTENT (Logo + Nama Instansi + Tagline) ────────
  let cY = s(28);

  // Logo
  if (logoImg) {
    const lSz = s(108);
    // Glow lingkaran
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cY + lSz/2, lSz/2 + s(10), 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.restore();
    ctx.drawImage(logoImg, cx - lSz/2, cY, lSz, lSz);
    cY += lSz + s(14);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cY + s(42), s(42), 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.fillStyle = CLR.white;
    ctx.font = `bold \${s(30)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(namaInst.charAt(0), cx, cY + s(42));
    ctx.restore();
    cY += s(84) + s(14);
  }

  // Nama instansi - auto size
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = CLR.white;
  let nInstSz = s(36);
  ctx.font = `900 \${nInstSz}px Arial, sans-serif`;
  while (ctx.measureText(namaInst).width > W - s(50) && nInstSz > s(18)) {
    nInstSz -= 2;
    ctx.font = `900 \${nInstSz}px Arial, sans-serif`;
  }
  const instLines = _wrapText(ctx, namaInst, W - s(50), nInstSz);
  // Letter spacing effect via shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = s(4);
  ctx.shadowOffsetY = s(2);
  instLines.forEach((line, i) => ctx.fillText(line, cx, cY + i * nInstSz * 1.3));
  ctx.restore();
  cY += instLines.length * nInstSz * 1.3 + s(10);

  // Garis gold
  const gg = ctx.createLinearGradient(W*0.15, 0, W*0.85, 0);
  gg.addColorStop(0, 'transparent');
  gg.addColorStop(0.2, CLR.gold3);
  gg.addColorStop(0.8, CLR.gold2);
  gg.addColorStop(1, 'transparent');
  ctx.strokeStyle = gg;
  ctx.lineWidth = s(2);
  ctx.beginPath();
  ctx.moveTo(W*0.15, cY);
  ctx.lineTo(W*0.85, cY);
  ctx.stroke();
  cY += s(9);

  // Tagline
  const tagline = (instansi?.tagline_idcard || instansi?.singkatan_instansi || 'KARTU TANDA PENGENAL').toUpperCase();
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = `700 \${s(15)}px Arial, sans-serif`;
  ctx.fillText(tagline, cx, cY);

  // ── FOTO KARYAWAN (overlap header 35% — sama seperti v4 yg bagus) ──
  const FOTO_SZ  = Math.round(W * 0.37);  // lebih kecil = lebih banyak ruang teks
  const FOTO_CY  = HEADER_H - Math.round(FOTO_SZ * 0.30); // overlap 30%
  const FOTO_X   = cx - FOTO_SZ/2;

  // Shadow
  ctx.save();
  ctx.shadowColor   = 'rgba(13,59,122,0.22)';
  ctx.shadowBlur    = s(24);
  ctx.shadowOffsetY = s(8);
  ctx.beginPath();
  ctx.arc(cx, FOTO_CY + FOTO_SZ/2, FOTO_SZ/2 + s(8), 0, Math.PI*2);
  ctx.fillStyle = CLR.white;
  ctx.fill();
  ctx.restore();

  // Border gold double
  const gb = ctx.createLinearGradient(FOTO_X, FOTO_CY, FOTO_X+FOTO_SZ, FOTO_CY+FOTO_SZ);
  gb.addColorStop(0, CLR.gold3);
  gb.addColorStop(0.5, CLR.gold1);
  gb.addColorStop(1, CLR.gold3);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, FOTO_CY + FOTO_SZ/2, FOTO_SZ/2 + s(8), 0, Math.PI*2);
  ctx.strokeStyle = gb;
  ctx.lineWidth   = s(5);
  ctx.stroke();
  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, FOTO_CY + FOTO_SZ/2, FOTO_SZ/2 + s(13), 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(212,160,23,0.30)';
  ctx.lineWidth   = s(2);
  ctx.stroke();
  ctx.restore();

  // Clip foto
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, FOTO_CY + FOTO_SZ/2, FOTO_SZ/2, 0, Math.PI*2);
  ctx.clip();
  if (fotoImg) {
    const r = fotoImg.width / fotoImg.height;
    let dw = FOTO_SZ, dh = FOTO_SZ, dx = FOTO_X, dy = FOTO_CY;
    if (r > 1) { dw = FOTO_SZ*r; dx = FOTO_X-(dw-FOTO_SZ)/2; }
    else        { dh = FOTO_SZ/r; dy = FOTO_CY-(dh-FOTO_SZ)/2; }
    ctx.drawImage(fotoImg, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(FOTO_X, FOTO_CY, FOTO_SZ, FOTO_SZ);
    ctx.fillStyle = CLR.white;
    ctx.font = `bold \${s(72)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nama.charAt(0)||'?', cx, FOTO_CY + FOTO_SZ/2);
  }
  ctx.restore();

  // ── INFO KARYAWAN (posisi dari bawah foto) ─────────────────
  let tY = FOTO_CY + FOTO_SZ + s(20);

  // ── NAMA ───────────────────────────────────────────────────
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = CLR.dark;
  let nFsz = s(56);  // lebih besar dan menonjol
  ctx.font = `900 \${nFsz}px Arial, sans-serif`;
  while (ctx.measureText(nama).width > W - s(56) && nFsz > s(24)) {
    nFsz -= 2;
    ctx.font = `900 \${nFsz}px Arial, sans-serif`;
  }
  const namaLines = _wrapText(ctx, nama, W - s(56), nFsz);
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.07)';
  ctx.shadowBlur    = s(3);
  ctx.shadowOffsetY = s(2);
  namaLines.forEach((line,i) => ctx.fillText(line, cx, tY + i * nFsz * 1.2));
  ctx.restore();
  tY += namaLines.length * nFsz * 1.2 + s(10);

  // ── JABATAN BADGE ──────────────────────────────────────────
  let jFsz = s(28);  // jabatan lebih menonjol
  ctx.font = `800 \${jFsz}px Arial, sans-serif`;
  while (ctx.measureText(jabatan).width > W - s(80) && jFsz > s(15)) {
    jFsz -= 2;
    ctx.font = `800 \${jFsz}px Arial, sans-serif`;
  }
  const jabW = ctx.measureText(jabatan).width + s(44);
  const jabH = jFsz + s(18);
  const jabX = cx - jabW/2;
  // Background badge
  ctx.save();
  const jabGrad = ctx.createLinearGradient(jabX, tY, jabX+jabW, tY+jabH);
  jabGrad.addColorStop(0, 'rgba(29,91,213,0.12)');
  jabGrad.addColorStop(1, 'rgba(45,108,223,0.08)');
  ctx.fillStyle = jabGrad;
  _roundRect(ctx, jabX, tY - s(3), jabW, jabH, s(22));
  ctx.fill();
  ctx.strokeStyle = 'rgba(45,108,223,0.25)';
  ctx.lineWidth = s(1.5);
  _roundRect(ctx, jabX, tY - s(3), jabW, jabH, s(22));
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = CLR.blue3;
  ctx.fillText(jabatan, cx, tY + s(5));
  tY += jabH + s(6);

  // ── DEPARTEMEN ─────────────────────────────────────────────
  ctx.fillStyle = CLR.gray1;
  ctx.font = `600 \${s(18)}px Arial, sans-serif`;
  ctx.fillText(dept, cx, tY);
  tY += s(28);

  // ── DIVIDER GOLD ───────────────────────────────────────────
  const dg = ctx.createLinearGradient(W*0.1, 0, W*0.9, 0);
  dg.addColorStop(0, 'transparent');
  dg.addColorStop(0.3, CLR.gold2);
  dg.addColorStop(0.7, CLR.gold2);
  dg.addColorStop(1, 'transparent');
  ctx.strokeStyle = dg;
  ctx.lineWidth = s(1.5);
  ctx.beginPath();
  ctx.moveTo(W*0.1, tY);
  ctx.lineTo(W*0.9, tY);
  ctx.stroke();
  tY += s(14);

  // ── INFO BOX: NIK + TGL MASUK ─────────────────────────────
  const BOX_W = W - s(44);
  const BOX_H = s(102);
  const BOX_X = s(22);
  const BOX_Y = tY;

  ctx.save();
  ctx.shadowColor   = 'rgba(29,91,213,0.08)';
  ctx.shadowBlur    = s(12);
  ctx.shadowOffsetY = s(4);
  ctx.fillStyle     = '#EBF2FF';
  _roundRect(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, s(12));
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#C5D9F8';
  ctx.lineWidth   = s(1.5);
  _roundRect(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, s(12));
  ctx.stroke();

  // Garis tengah
  ctx.strokeStyle = '#C5D9F8';
  ctx.lineWidth   = s(1);
  ctx.beginPath();
  ctx.moveTo(BOX_X + BOX_W/2, BOX_Y + s(12));
  ctx.lineTo(BOX_X + BOX_W/2, BOX_Y + BOX_H - s(12));
  ctx.stroke();

  // NIK
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const nikLabelY  = BOX_Y + BOX_H * 0.30;
  const nikValueY  = BOX_Y + BOX_H * 0.68;
  const nikCX      = BOX_X + BOX_W * 0.25;
  const tglCX      = BOX_X + BOX_W * 0.75;

  ctx.fillStyle = CLR.gray2;
  ctx.font = `700 \${s(13)}px Arial, sans-serif`;
  ctx.fillText('N I K', nikCX, nikLabelY);

  ctx.fillStyle = CLR.dark;
  let nikSz = s(21);
  ctx.font = `900 \${nikSz}px Arial, sans-serif`;
  while (ctx.measureText(nik).width > BOX_W/2 - s(20) && nikSz > s(13)) {
    nikSz--;
    ctx.font = `900 \${nikSz}px Arial, sans-serif`;
  }
  ctx.fillText(nik, nikCX, nikValueY);

  // TGL MASUK
  ctx.fillStyle = CLR.gray2;
  ctx.font = `700 \${s(13)}px Arial, sans-serif`;
  ctx.fillText('TGL MASUK', tglCX, nikLabelY);
  ctx.fillStyle = CLR.dark;
  ctx.font = `900 \${s(21)}px Arial, sans-serif`;
  ctx.fillText(tglMasuk, tglCX, nikValueY);

  tY += BOX_H + s(18);

  // ── QR CODE (posisi FIXED: sisanya dari tY ke footer) ─────
  if (includeQR) {
    try {
      // QR size: minimal 380px, maksimal ruang tersisa
      const spaceLeft  = FOOTER_Y - s(20) - tY;
      const QR_SZ  = Math.max(s(420), Math.min(s(480), Math.floor(spaceLeft * 0.88)));
      const QR_PAD = s(16);
      const QR_BOX = QR_SZ + QR_PAD * 2;

      // Posisi QR: langsung setelah tY, footer boleh overlap sedikit
      const QR_Y   = tY + s(8);
      const QR_X   = cx - QR_SZ/2;
      const BOX_QR_X = QR_X - QR_PAD;
      const BOX_QR_Y = QR_Y;

      const qrDataUrl = await _generateQRDataURL(k.id_karyawan, QR_SZ + s(30));
      if (qrDataUrl) {
        const qrImg = await _loadImage(qrDataUrl);

        // Shadow QR box
        ctx.save();
        ctx.shadowColor   = 'rgba(13,59,122,0.18)';
        ctx.shadowBlur    = s(20);
        ctx.shadowOffsetY = s(6);
        ctx.fillStyle     = CLR.white;
        _roundRect(ctx, BOX_QR_X, BOX_QR_Y, QR_BOX, QR_BOX, s(14));
        ctx.fill();
        ctx.restore();

        // Border gold luar
        const gbq = ctx.createLinearGradient(BOX_QR_X, BOX_QR_Y, BOX_QR_X+QR_BOX, BOX_QR_Y+QR_BOX);
        gbq.addColorStop(0, CLR.gold3);
        gbq.addColorStop(0.5, CLR.gold1);
        gbq.addColorStop(1, CLR.gold3);
        ctx.strokeStyle = gbq;
        ctx.lineWidth   = s(3.5);
        _roundRect(ctx, BOX_QR_X, BOX_QR_Y, QR_BOX, QR_BOX, s(14));
        ctx.stroke();

        // Border gold dalam
        ctx.strokeStyle = 'rgba(212,160,23,0.25)';
        ctx.lineWidth   = s(1.5);
        _roundRect(ctx, BOX_QR_X + s(5), BOX_QR_Y + s(5), QR_BOX - s(10), QR_BOX - s(10), s(10));
        ctx.stroke();

        // Corner accent di 4 sudut QR box
        const CORN = s(18);
        [[0,0],[1,0],[0,1],[1,1]].forEach(([cx2,cy2]) => {
          const bx = BOX_QR_X + cx2*(QR_BOX-CORN);
          const by = BOX_QR_Y + cy2*(QR_BOX-CORN);
          ctx.fillStyle = CLR.gold3;
          ctx.globalAlpha = 0.6;
          ctx.fillRect(bx, by, cx2===0?CORN:-CORN, s(3));
          ctx.fillRect(bx, by, s(3), cy2===0?CORN:-CORN);
          ctx.globalAlpha = 1;
        });

        // Gambar QR
        ctx.drawImage(qrImg, QR_X, QR_Y + QR_PAD/2, QR_SZ, QR_SZ);

        // Label bawah QR
        const labelY = BOX_QR_Y + QR_BOX + s(10);
        ctx.fillStyle    = CLR.gray1;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `700 \${s(16)}px Arial, sans-serif`;
        ctx.fillText('Scan untuk verifikasi identitas', cx, labelY);
        ctx.fillStyle = CLR.gray3;
        ctx.font = `500 \${s(13)}px Arial, sans-serif`;
        ctx.fillText('ID: ' + (k.id_karyawan || '-'), cx, labelY + s(20));
      }
    } catch(e) {
      console.warn('[idcard] QR failed:', e.message);
    }
  }

  // ── FOOTER ─────────────────────────────────────────────────
  // Wave atas footer
  ctx.fillStyle = CLR.blue2;
  ctx.beginPath();
  ctx.moveTo(0, FOOTER_Y + s(10));
  ctx.quadraticCurveTo(W*0.25, FOOTER_Y - s(16), W*0.5, FOOTER_Y + s(8));
  ctx.quadraticCurveTo(W*0.75, FOOTER_Y + s(22), W, FOOTER_Y - s(6));
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  const fGrad = ctx.createLinearGradient(0, FOOTER_Y, 0, H);
  fGrad.addColorStop(0, CLR.blue2);
  fGrad.addColorStop(1, CLR.blue1);
  ctx.fillStyle = fGrad;
  ctx.fillRect(0, FOOTER_Y + s(22), W, H - FOOTER_Y - s(22));

  // Gold strip atas footer
  ctx.fillStyle = CLR.gold2;
  ctx.fillRect(0, FOOTER_Y + s(20), W, s(3));

  // Teks footer
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const fMidY = FOOTER_Y + FOOTER_H * 0.40;
  ctx.fillStyle = CLR.white;
  ctx.font = `700 \${s(17)}px Arial, sans-serif`;
  ctx.fillText(namaInst, cx, fMidY);
  if (alamat) {
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `400 \${s(12)}px Arial, sans-serif`;
    let al = alamat;
    while (ctx.measureText(al).width > W - s(40) && al.length > 20)
      al = al.slice(0, -4) + '...';
    ctx.fillText(al, cx, fMidY + s(20));
  }
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

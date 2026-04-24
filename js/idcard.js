// ============================================================
// idcard.js v3 — ID Card Elegant (Portrait + PNG Output)
// ============================================================
// Desain: header biru + curve + foto bulat + QR besar + footer biru
// Output: PNG high-res (bukan PDF) untuk print yang tajam
// ============================================================

const IDCARD_W = 400;
const IDCARD_H = 640;

// ════════════════════════════════════════════════════════════
// RENDER HTML ID CARD
// ════════════════════════════════════════════════════════════
function renderIDCardHTML(k, instansi, opts) {
  opts = opts || {};
  const showQR = opts.showQR !== false;

  const nama    = (k.nama_lengkap || '-').toUpperCase();
  const jabatan = (k.jabatan      || '-').toUpperCase();
  const dept    = k.departemen   || '-';
  const nik     = String(k.nik   || '-');
  const namaInst = (instansi?.nama_instansi || 'INSTANSI').toUpperCase();
  const tagline = instansi?.tagline_idcard || instansi?.singkatan_instansi || 'KARTU TANDA PENGENAL';

  const logoUrl = instansi?.logo_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(instansi.logo_url || '')
        : instansi.logo_url)
    : '';

  const fotoSrc = typeof getPhotoSrc === 'function'
    ? getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 180)
    : (k.foto_profil_url
        ? (typeof normalizeDriveUrlFrontend === 'function'
            ? normalizeDriveUrlFrontend(k.foto_profil_url)
            : k.foto_profil_url)
        : '');

  const inisial = typeof avatarInisial === 'function'
    ? avatarInisial(nama, 180)
    : '';

  const qrId = 'qr-idc-' + (k.id_karyawan || Math.random().toString(36).substring(2,9));

  return `
  <div class="idcard-elegant" data-idcard="${k.id_karyawan || ''}"
    style="width:100%;height:100%;position:relative;background:#FFFFFF;
    font-family:'Helvetica Neue',Arial,sans-serif;
    border-radius:inherit;overflow:hidden;box-sizing:border-box;
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)">

    <!-- HEADER BIRU (28% tinggi) -->
    <div style="position:absolute;top:0;left:0;right:0;height:28%;
      background:linear-gradient(180deg,#1E5FBF 0%,#2D6CDF 100%);
      box-sizing:border-box;padding:7% 8% 3% 8%;
      display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:1">

      ${logoUrl ? `
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-bottom:6px">
          <img src="${logoUrl}" crossorigin="anonymous"
            style="height:34px;width:auto;max-width:40px;object-fit:contain;flex-shrink:0"
            onerror="this.style.display='none'">
          <div style="color:#fff;font-weight:800;font-size:22px;letter-spacing:.3px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${namaInst}
          </div>
        </div>
      ` : `
        <div style="color:#fff;font-weight:800;font-size:22px;letter-spacing:.3px;margin-bottom:6px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%">
          ${namaInst}
        </div>
      `}

      <!-- Garis pemisah -->
      <div style="height:1px;background:rgba(255,255,255,.4);width:70%;margin:4px 0 8px"></div>

      <!-- Tagline -->
      <div style="color:#fff;font-weight:500;font-size:12px;letter-spacing:.5px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">
        ${tagline}
      </div>
    </div>

    <!-- CURVE/WAVE dengan aksen biru bawah -->
    <svg style="position:absolute;top:22%;left:0;width:100%;height:14%;z-index:2;display:block"
      viewBox="0 0 400 90" preserveAspectRatio="none">
      <!-- Lapisan biru gelap untuk kedalaman -->
      <path d="M0,0 L0,50 Q100,90 200,45 Q300,0 400,40 L400,0 Z" fill="#1E5FBF"/>
      <!-- Lapisan biru utama di atas -->
      <path d="M0,0 L0,40 Q100,80 200,35 Q300,-5 400,30 L400,0 Z" fill="#2D6CDF"/>
    </svg>

    <!-- FOTO BULAT (di atas curve, center) -->
    <div style="position:absolute;top:25%;left:50%;transform:translateX(-50%);
      width:32%;aspect-ratio:1/1;z-index:3;
      border-radius:50%;overflow:hidden;
      background:#fff;
      padding:4px;
      box-shadow:0 4px 16px rgba(0,0,0,.2)">
      <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#E2E8F0">
        <img src="${fotoSrc}" crossorigin="anonymous"
          style="width:100%;height:100%;object-fit:cover;display:block"
          onerror="${inisial ? `this.src='${inisial}'` : `this.style.display='none'`}">
      </div>
    </div>

    <!-- BODY (nama, jabatan, NIK, QR) -->
    <div style="position:absolute;top:46%;left:0;right:0;bottom:8%;
      padding:0 8%;box-sizing:border-box;
      display:flex;flex-direction:column;align-items:center;text-align:center;z-index:2">

      <!-- Nama (besar, gelap) -->
      <div style="color:#1E293B;font-weight:800;font-size:18px;letter-spacing:.3px;
        line-height:1.2;margin-top:4px;
        width:100%;word-break:break-word;max-height:2.4em;overflow:hidden">
        ${nama}
      </div>

      <!-- Jabatan (biru) -->
      <div style="color:#2D6CDF;font-weight:700;font-size:11px;letter-spacing:1px;
        margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%">
        ${jabatan}
      </div>

      <!-- Departemen (abu-abu kecil) -->
      <div style="color:#64748B;font-weight:500;font-size:10px;
        margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%">
        ${dept}
      </div>

      <!-- NIK -->
      <div style="color:#475569;font-size:10px;margin-top:8px;letter-spacing:.3px">
        NIK: <span style="font-weight:700;color:#1E293B">${nik}</span>
      </div>

      <!-- QR CODE (terlihat jelas) -->
      ${showQR ? `
      <div style="margin-top:10px;background:#fff;padding:6px;
        display:inline-flex;align-items:center;justify-content:center;
        border:1px solid #E2E8F0;border-radius:4px">
        <div id="${qrId}" data-qr-for="${k.id_karyawan || ''}"
          style="width:96px;height:96px;display:flex;align-items:center;justify-content:center"></div>
      </div>` : ''}
    </div>

    <!-- FOOTER biru solid bawah -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:5%;
      background:linear-gradient(90deg,#1E5FBF 0%,#2D6CDF 100%);z-index:1"></div>

    <!-- CURVE bawah sebagai transisi ke footer -->
    <svg style="position:absolute;bottom:4%;left:0;width:100%;height:6%;z-index:2;display:block"
      viewBox="0 0 400 30" preserveAspectRatio="none">
      <path d="M0,30 L0,15 Q100,-5 200,12 Q300,28 400,10 L400,30 Z" fill="#2D6CDF"/>
    </svg>
  </div>`;
}

// ════════════════════════════════════════════════════════════
// Inject QR ke container (dipanggil setelah HTML di-render)
// ════════════════════════════════════════════════════════════
async function injectQRIDCard(idKaryawan, containerEl, size) {
  if (typeof QRCode === 'undefined') {
    console.warn('[idcard] QRCode library tidak tersedia');
    return false;
  }

  try {
    const data = await callAPI('getQRPayloadKaryawan', { id_karyawan: idKaryawan });
    if (!data || !data.payload) {
      console.warn('[idcard] Payload QR kosong');
      return false;
    }

    const container = typeof containerEl === 'string'
      ? document.querySelector(containerEl)
      : containerEl;

    if (!container) {
      console.warn('[idcard] Container QR tidak ditemukan');
      return false;
    }

    container.innerHTML = '';
    const qrSize = size || 96;
    new QRCode(container, {
      text: data.payload,
      width: qrSize,
      height: qrSize,
      colorDark: '#0F172A',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });

    await new Promise(r => setTimeout(r, 80));

    // Pastikan canvas/img fit container
    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');
    if (canvas) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
    }
    if (img) {
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.display = 'block';
    }

    return true;
  } catch(e) {
    console.warn('[idcard] Inject QR gagal:', e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// Load preview ke container (dipanggil dari profil & admin)
// ════════════════════════════════════════════════════════════
async function loadIDCardPreview(containerId, k, instansi, opts) {
  const wrap = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  if (!wrap) return;

  if (!wrap.style.aspectRatio) wrap.style.aspectRatio = '400 / 640';
  wrap.innerHTML = renderIDCardHTML(k, instansi, opts);

  if (!opts || opts.showQR !== false) {
    const qrEl = wrap.querySelector(`[data-qr-for="${k.id_karyawan}"]`);
    if (qrEl) {
      setTimeout(() => injectQRIDCard(k.id_karyawan, qrEl, 96), 50);
    }
  }
}

// ════════════════════════════════════════════════════════════
// CETAK ID CARD → DOWNLOAD PNG HIGH-RES
// Pakai html2canvas untuk capture HTML → image PNG
// Resolusi: 3x untuk print tajam (1200×1920px)
// ════════════════════════════════════════════════════════════
async function cetakIDCard(idKaryawan) {
  if (typeof showToast === 'function') showToast('Menyiapkan ID Card...', 'info', 2000);

  try {
    if (typeof html2canvas === 'undefined') {
      throw new Error('Library html2canvas belum siap. Refresh halaman.');
    }

    const [k, inst] = await Promise.all([
      callAPI('getKaryawanById', { id_karyawan: idKaryawan }),
      callAPI('getMultipleSetting', {
        keys: 'nama_instansi,singkatan_instansi,alamat_instansi,logo_url,footer_text,tagline_idcard'
      })
    ]);
    if (!k) throw new Error('Data karyawan tidak ditemukan');

    // Buat hidden container dengan ukuran final yang besar
    const RENDER_W = 800;   // 2x dari preview 400 → kualitas tinggi
    const RENDER_H = 1280;  // 2x dari preview 640

    const hiddenWrap = document.createElement('div');
    hiddenWrap.style.cssText = `
      position:fixed;
      top:-99999px;left:-99999px;
      width:${RENDER_W}px;
      height:${RENDER_H}px;
      overflow:hidden;
      background:#fff;
    `;
    hiddenWrap.innerHTML = renderIDCardHTML(k, inst, { showQR: true });
    document.body.appendChild(hiddenWrap);

    // Inject QR (ukuran besar untuk render yg tajam)
    const qrEl = hiddenWrap.querySelector('[data-qr-for="' + idKaryawan + '"]');
    if (qrEl) {
      // QR ukuran lebih besar untuk hasil print
      qrEl.style.width = '192px';
      qrEl.style.height = '192px';
      await injectQRIDCard(idKaryawan, qrEl, 192);
    }

    // Tunggu semua image load
    const images = hiddenWrap.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete && img.naturalHeight > 0) return Promise.resolve();
      return new Promise(resolve => {
        const t = setTimeout(resolve, 6000);
        img.onload = img.onerror = () => { clearTimeout(t); resolve(); };
      });
    }));

    // Kasih waktu browser untuk layout
    await new Promise(r => setTimeout(r, 400));

    // Capture dengan html2canvas — scale 2 untuk resolusi tinggi (1600×2560)
    const canvas = await html2canvas(hiddenWrap, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: RENDER_W,
      height: RENDER_H,
      logging: false,
      imageTimeout: 6000
    });

    document.body.removeChild(hiddenWrap);

    // Convert canvas ke PNG blob
    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Gagal membuat PNG'));
      }, 'image/png', 1.0);
    });

    // Download PNG
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
function _idCardPreviewHTML(k, instansi) {
  return renderIDCardHTML(k, instansi || {}, { showQR: true });
}

async function cetakIDCardSaya() {
  const user = (typeof getSession === 'function') ? getSession() : null;
  if (!user) return;
  return cetakIDCard(user.id_karyawan);
}

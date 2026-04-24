// ============================================================
// idcard.js — ID Card Profesional (Portrait + QR Terintegrasi)
// v6.9
//
// Pakai html2canvas → jsPDF agar hasil print identik dengan preview.
// Format: 54×85.6mm portrait (standar ID card potret).
// QR otomatis embedded di bagian bawah (permanent signature).
// ============================================================

// Ukuran ID Card Portrait (mm)
const IDCARD_W_MM = 54;     // Lebar
const IDCARD_H_MM = 85.6;   // Tinggi
// Preview di app: scale agar pas responsive (width = ~260px)
const IDCARD_PREVIEW_W_PX = 260;
const IDCARD_PREVIEW_H_PX = Math.round(260 * (IDCARD_H_MM / IDCARD_W_MM)); // ~412px

// ════════════════════════════════════════════════════════════
// RENDER PREVIEW — dipakai di profil karyawan & modal admin
// Return HTML string untuk disisipkan ke container
// Kontainer wajib: width:IDCARD_PREVIEW_W_PX, aspect-ratio:54/85.6
// ════════════════════════════════════════════════════════════
function renderIDCardHTML(k, instansi, opts) {
  opts = opts || {};
  const showQR = opts.showQR !== false; // default true

  const nama    = k.nama_lengkap || '-';
  const jabatan = k.jabatan      || '-';
  const dept    = k.departemen   || '-';
  const nik     = String(k.nik   || '-');
  const namaInst = (instansi?.nama_instansi || 'INSTANSI').toUpperCase();
  const logoUrl = instansi?.logo_url
    ? (typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(instansi.logo_url || '')
        : instansi.logo_url)
    : '';
  const fotoSrc = typeof getPhotoSrc === 'function'
    ? getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 140)
    : (k.foto_profil_url
        ? (typeof normalizeDriveUrlFrontend === 'function'
            ? normalizeDriveUrlFrontend(k.foto_profil_url)
            : k.foto_profil_url)
        : '');
  const inisial = typeof avatarInisial === 'function'
    ? avatarInisial(nama, 140)
    : '';
  const alamat  = (instansi?.alamat_instansi || '').substring(0, 60);
  const footer  = (instansi?.footer_text || 'Kartu identitas resmi').substring(0, 55);

  // ID unik untuk QR container — supaya tidak tabrakan kalau ada multiple ID card
  const qrId = 'qr-' + (k.id_karyawan || Math.random().toString(36).substring(2,9));

  return `
  <div class="idcard-potret" data-idcard="${k.id_karyawan || ''}"
    style="width:100%;height:100%;display:flex;flex-direction:column;
    background:linear-gradient(180deg,#0F172A 0%,#1E293B 100%);
    color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;
    border-radius:inherit;overflow:hidden;position:relative;box-sizing:border-box">

    <!-- Aksen warna di kiri atas -->
    <div style="position:absolute;top:0;left:0;width:36%;height:6px;
      background:linear-gradient(90deg,#10B981,#2D6CDF);z-index:2"></div>
    <!-- Aksen warna di kanan atas -->
    <div style="position:absolute;top:6px;right:0;width:20%;height:3px;
      background:#2D6CDF;z-index:2"></div>

    <!-- HEADER: logo + nama instansi (12% tinggi) -->
    <div style="flex:0 0 11%;display:flex;align-items:center;gap:6px;
      padding:4% 5% 2% 5%;background:rgba(0,0,0,.35);
      border-bottom:1px solid rgba(255,255,255,.08);box-sizing:border-box">
      ${logoUrl ? `
        <img src="${logoUrl}" crossorigin="anonymous"
          style="height:100%;width:auto;max-width:24%;object-fit:contain;flex-shrink:0;border-radius:2px"
          onerror="this.style.display='none'">` : ''}
      <div style="min-width:0;flex:1;line-height:1">
        <div style="color:#fff;font-weight:800;font-size:9px;letter-spacing:.2px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${namaInst}
        </div>
        <div style="color:#94A3B8;font-size:6.5px;margin-top:2px;letter-spacing:.8px">
          ID CARD KARYAWAN
        </div>
      </div>
    </div>

    <!-- FOTO BESAR (40% tinggi) -->
    <div style="flex:0 0 38%;display:flex;align-items:center;justify-content:center;
      padding:6% 8% 3% 8%;box-sizing:border-box">
      <div style="width:100%;aspect-ratio:1/1;max-width:100%;max-height:100%;
        border-radius:8px;overflow:hidden;
        border:2px solid rgba(45,108,223,.6);
        background:#1e3a8a;
        box-shadow:0 4px 12px rgba(0,0,0,.4)">
        <img src="${fotoSrc}" crossorigin="anonymous"
          style="width:100%;height:100%;object-fit:cover;display:block"
          onerror="${inisial ? `this.src='${inisial}'` : `this.style.display='none'`}">
      </div>
    </div>

    <!-- NAMA + JABATAN (17% tinggi, center) -->
    <div style="flex:0 0 15%;display:flex;flex-direction:column;justify-content:center;
      padding:0 6%;text-align:center;box-sizing:border-box">
      <div style="color:#fff;font-weight:800;font-size:11px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15">
        ${nama}
      </div>
      <div style="color:#93C5FD;font-size:7.5px;margin-top:2px;font-weight:600;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${jabatan}
      </div>
      <div style="color:#64748B;font-size:6.5px;margin-top:1px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${dept}
      </div>
    </div>

    <!-- NIK BOX (8% tinggi) -->
    <div style="flex:0 0 7%;display:flex;justify-content:center;padding:0 8%;
      box-sizing:border-box">
      <div style="background:rgba(30,58,138,.6);border:1px solid rgba(147,197,253,.2);
        border-radius:5px;padding:3px 10px;width:100%;text-align:center">
        <div style="color:#94A3B8;font-size:5.5px;letter-spacing:1px">NIK</div>
        <div style="color:#fff;font-weight:700;font-size:9px;letter-spacing:.3px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${nik}
        </div>
      </div>
    </div>

    <!-- QR CODE (21% tinggi) -->
    ${showQR ? `
    <div style="flex:0 0 20%;display:flex;align-items:center;justify-content:center;
      padding:3% 0;box-sizing:border-box">
      <div style="background:#fff;padding:4px;border-radius:4px;
        display:inline-flex;align-items:center;justify-content:center;
        aspect-ratio:1/1;height:100%">
        <div id="${qrId}" data-qr-for="${k.id_karyawan || ''}"
          style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div>
      </div>
    </div>` : `<div style="flex:0 0 20%"></div>`}

    <!-- FOOTER (9% tinggi) -->
    <div style="flex:0 0 9%;display:flex;align-items:center;
      background:linear-gradient(90deg,#2D6CDF,#1A9E74);
      padding:0 6%;box-sizing:border-box;overflow:hidden">
      <span style="color:#fff;font-size:5.5px;white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center;font-weight:500;letter-spacing:.2px">
        ${alamat || footer}
      </span>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
// INJECT QR ke dalam preview ID Card
// Panggil SETELAH renderIDCardHTML disisipkan ke DOM
// Butuh library QRCode + payload dari backend (getQRPayloadKaryawan)
// ════════════════════════════════════════════════════════════
async function injectQRIDCard(idKaryawan, qrContainerSelector) {
  if (typeof QRCode === 'undefined') {
    console.warn('[idcard] QRCode library tidak tersedia');
    return false;
  }

  try {
    // Ambil payload QR dari backend
    const data = await callAPI('getQRPayloadKaryawan', { id_karyawan: idKaryawan });
    if (!data || !data.payload) {
      console.warn('[idcard] Payload QR kosong');
      return false;
    }

    const container = typeof qrContainerSelector === 'string'
      ? document.querySelector(qrContainerSelector)
      : qrContainerSelector;

    if (!container) {
      console.warn('[idcard] Container QR tidak ditemukan:', qrContainerSelector);
      return false;
    }

    // Clear & generate
    container.innerHTML = '';
    new QRCode(container, {
      text: data.payload,
      width: 90,
      height: 90,
      colorDark: '#0F172A',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });

    // Tunggu QR selesai render
    await new Promise(r => setTimeout(r, 100));

    // Scale ke 100% container
    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');
    if (canvas) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
    }
    if (img) {
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
    }

    return true;
  } catch(e) {
    console.warn('[idcard] Inject QR gagal:', e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// LOAD ID CARD ke container tertentu (preview + QR)
// ════════════════════════════════════════════════════════════
async function loadIDCardPreview(containerId, k, instansi, opts) {
  const wrap = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  if (!wrap) return;

  // Pastikan container punya dimensi yang pas untuk portrait
  // Caller bisa override, tapi default kita atur di sini
  if (!wrap.style.aspectRatio) wrap.style.aspectRatio = '54 / 85.6';

  wrap.innerHTML = renderIDCardHTML(k, instansi, opts);

  // Inject QR kalau showQR tidak false
  if (!opts || opts.showQR !== false) {
    const qrEl = wrap.querySelector(`[data-qr-for="${k.id_karyawan}"]`);
    if (qrEl) {
      // Delay sedikit biar DOM settled dulu
      setTimeout(() => injectQRIDCard(k.id_karyawan, qrEl), 50);
    }
  }
}

// ════════════════════════════════════════════════════════════
// CETAK ID CARD → PDF (pakai html2canvas agar IDENTIK dengan preview)
// ════════════════════════════════════════════════════════════
async function cetakIDCard(idKaryawan) {
  if (typeof showToast === 'function') showToast('Menyiapkan ID Card...', 'info', 2000);

  try {
    // Cek library
    if (typeof html2canvas === 'undefined') {
      throw new Error('Library html2canvas belum siap. Refresh halaman.');
    }
    if (typeof _ensureJsPDF === 'function') {
      await _ensureJsPDF();
    }
    if (!window.jspdf?.jsPDF) {
      throw new Error('Library PDF tidak tersedia.');
    }

    // Ambil data karyawan + instansi
    const [k, inst] = await Promise.all([
      callAPI('getKaryawanById', { id_karyawan: idKaryawan }),
      callAPI('getMultipleSetting', { keys: 'nama_instansi,alamat_instansi,logo_url,footer_text' })
    ]);
    if (!k) throw new Error('Data karyawan tidak ditemukan');

    // Buat hidden container dengan UKURAN MM EXACT (yg akan di-capture)
    // Pakai resolusi 4x untuk kualitas print yang tajam
    const SCALE = 4;
    const PX_PER_MM = 3.7795275591; // 96dpi standar
    const W_PX = Math.round(IDCARD_W_MM * PX_PER_MM * SCALE);
    const H_PX = Math.round(IDCARD_H_MM * PX_PER_MM * SCALE);

    // Wrapper untuk rendering (off-screen)
    const hiddenWrap = document.createElement('div');
    hiddenWrap.style.cssText = `
      position:fixed;
      top:-99999px;left:-99999px;
      width:${W_PX}px;
      height:${H_PX}px;
      overflow:hidden;
      transform:scale(${1/SCALE});
      transform-origin:top left;
      font-size:${SCALE*14}px;
    `;

    const innerWrap = document.createElement('div');
    innerWrap.style.cssText = `
      width:${W_PX}px;
      height:${H_PX}px;
      position:relative;
      overflow:hidden;
    `;
    innerWrap.innerHTML = renderIDCardHTML(k, inst, { showQR: true });

    // Scale semua font-size di dalam (karena kita pakai transform scale)
    // Caranya: set font-size base di root yg di-scale, anak-anak pakai em
    // Tapi preview kita pakai px langsung. Alternatif: scale CSS vars.
    // Cara paling reliable: pakai ukuran final langsung di container
    innerWrap.style.setProperty('--size-scale', SCALE);

    hiddenWrap.appendChild(innerWrap);
    document.body.appendChild(hiddenWrap);

    // Inject QR di container hidden
    const qrEl = innerWrap.querySelector('[data-qr-for="' + idKaryawan + '"]');
    if (qrEl) {
      await injectQRIDCard(idKaryawan, qrEl);
    }

    // Tunggu semua image load (foto + logo + QR)
    const images = innerWrap.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete && img.naturalHeight > 0) return Promise.resolve();
      return new Promise(resolve => {
        const t = setTimeout(resolve, 5000); // max 5s
        img.onload = img.onerror = () => { clearTimeout(t); resolve(); };
      });
    }));

    // Kasih waktu browser untuk layout & QR render
    await new Promise(r => setTimeout(r, 300));

    // Capture dengan html2canvas
    const canvas = await html2canvas(innerWrap, {
      scale: 1, // inner sudah di-scale
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      width: W_PX,
      height: H_PX,
      logging: false,
      imageTimeout: 5000
    });

    // Cleanup hidden wrap
    document.body.removeChild(hiddenWrap);

    // Generate PDF portrait 54×85.6mm
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [IDCARD_W_MM, IDCARD_H_MM]
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, IDCARD_W_MM, IDCARD_H_MM);

    // Save
    const fileName = 'IDCard_' + (k.nama_lengkap || 'karyawan').replace(/\s+/g, '_') + '.pdf';
    doc.save(fileName);

    if (typeof showToast === 'function') showToast('ID Card berhasil didownload! 🪪', 'success');

  } catch(e) {
    console.error('[cetakIDCard]', e);
    if (typeof showToast === 'function') {
      showToast('Gagal cetak ID Card: ' + e.message, 'error', 5000);
    }
  }
}

// ════════════════════════════════════════════════════════════
// BACKWARD COMPAT: Alias untuk function lama yg dipanggil dari tempat lain
// ════════════════════════════════════════════════════════════
function _idCardPreviewHTML(k, instansi) {
  // Function lama — redirect ke yang baru
  return renderIDCardHTML(k, instansi || {}, { showQR: true });
}

async function cetakIDCardSaya() {
  const user = (typeof getSession === 'function') ? getSession() : null;
  if (!user) return;
  return cetakIDCard(user.id_karyawan);
}

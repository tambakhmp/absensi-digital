// ============================================================
// foto_kerja.js — Laporan Foto Lapangan (Admin/Superadmin)
// ============================================================

// ── HALAMAN UTAMA ────────────────────────────────────────────
async function loadFotoKerja() {
  const wrap = document.getElementById('page-content');
  if (!wrap) return;

  const now  = new Date();
  const tgl  = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');

  wrap.innerHTML = `
  <div style="padding:0 0 80px">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div>
        <h2 style="font-size:20px;font-weight:700;color:#0F172A;margin:0">
          📷 Laporan Foto Lapangan</h2>
        <p style="font-size:13px;color:#64748B;margin:4px 0 0">
          Dokumentasi foto kegiatan lapangan harian</p>
      </div>
      <button onclick="_modalUploadFoto()"
        style="background:linear-gradient(135deg,#2D6CDF,#1B5CBF);color:#fff;
        border:none;border-radius:10px;padding:10px 20px;font-size:14px;
        font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px">
        📷 Upload / Ambil Foto
      </button>
    </div>

    <!-- Filter -->
    <div style="background:#fff;border-radius:12px;padding:14px 16px;
      border:1px solid #E2E8F0;margin-bottom:18px;
      display:flex;align-items:center;flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:13px;color:#64748B;font-weight:600">Tanggal:</label>
        <input type="date" id="filter-tgl-foto" value="${tgl}"
          style="border:1px solid #E2E8F0;border-radius:8px;padding:6px 10px;
          font-size:13px;color:#0F172A"
          onchange="loadFotoGrid()">
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:13px;color:#64748B;font-weight:600">s/d:</label>
        <input type="date" id="filter-tgl-foto-ke" value="${tgl}"
          style="border:1px solid #E2E8F0;border-radius:8px;padding:6px 10px;
          font-size:13px;color:#0F172A"
          onchange="loadFotoGrid()">
      </div>
      <button onclick="loadFotoGrid()"
        style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;
        padding:6px 14px;font-size:13px;cursor:pointer;font-weight:600;color:#334155">
        🔍 Tampilkan
      </button>
      <button onclick="_exportFotoPDF()"
        style="background:#1A9E74;color:#fff;border:none;border-radius:8px;
        padding:6px 14px;font-size:13px;cursor:pointer;font-weight:600;
        margin-left:auto">
        📄 Export PDF
      </button>
    </div>

    <!-- Grid foto -->
    <div id="foto-grid"></div>
  </div>`;

  await loadFotoGrid();
}

// ── LOAD & RENDER GRID ────────────────────────────────────────
async function loadFotoGrid() {
  const grid = document.getElementById('foto-grid');
  if (!grid) return;

  const tglDari = document.getElementById('filter-tgl-foto')?.value    || '';
  const tglKe   = document.getElementById('filter-tgl-foto-ke')?.value || '';

  const _toIDDate = (v) => {
    if (!v) return '';
    const p = v.split('-');
    return p[2]+'/'+p[1]+'/'+p[0];
  };

  grid.innerHTML = `<div style="text-align:center;padding:40px;color:#94A3B8">
    <div style="width:32px;height:32px;border:3px solid #CBD5E1;
      border-top-color:#2D6CDF;border-radius:50%;
      animation:spin .8s linear infinite;margin:0 auto 12px"></div>
    Memuat foto...</div>`;

  try {
    const params = tglDari === tglKe
      ? { tanggal: _toIDDate(tglDari) }
      : { tgl_dari: _toIDDate(tglDari), tgl_ke: _toIDDate(tglKe) };

    const data = await callAPI('getFotoKerja', params);

    if (!data || data.length === 0) {
      grid.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#94A3B8;
        background:#fff;border-radius:12px;border:1px dashed #E2E8F0">
        <div style="font-size:40px;margin-bottom:12px">📷</div>
        <div style="font-size:15px;font-weight:600;color:#64748B">Belum ada foto</div>
        <div style="font-size:13px;margin-top:6px">Klik tombol Upload untuk tambah foto lapangan</div>
      </div>`;
      return;
    }

    // Kelompokkan per tanggal
    const grouped = {};
    data.forEach(f => {
      const key = f.tanggal || '-';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    });

    let html = '';
    Object.keys(grouped).sort().reverse().forEach(tgl => {
      const fotos = grouped[tgl];
      const f0    = fotos[0];
      html += `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="background:#2D6CDF;color:#fff;padding:4px 14px;
            border-radius:20px;font-size:13px;font-weight:600">
            ${f0.hari||''}, ${tgl}
          </div>
          <div style="font-size:12px;color:#64748B">${fotos.length} foto</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
          gap:10px">
          ${fotos.map(f => _renderFotoCard(f)).join('')}
        </div>
      </div>`;
    });

    grid.innerHTML = html;

  } catch(e) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:#E53E3E">
      Gagal memuat foto: ${e.message}</div>`;
  }
}

function _renderFotoCard(f) {
  const imgSrc = (f.foto_url || '').replace('open?id=','uc?id=')
                                    .replace('export?id=','uc?id=');
  return `
  <div style="background:#fff;border-radius:10px;overflow:hidden;
    border:1px solid #E2E8F0;position:relative;group">
    <div style="aspect-ratio:1;overflow:hidden;background:#F1F5F9;cursor:pointer"
      onclick="_lihatFotoBesar('${imgSrc}','${f.hari||''} ${f.tanggal||''}','${f.waktu||''}')">
      <img src="${imgSrc}" alt="Foto lapangan"
        style="width:100%;height:100%;object-fit:cover;display:block"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div style=width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px>📷</div>'">
    </div>
    <div style="padding:6px 8px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;color:#64748B;font-weight:500">${f.waktu||''}</span>
      <button onclick="_hapusFoto('${f.id_foto}')"
        style="background:none;border:none;cursor:pointer;padding:2px;
        color:#E53E3E;font-size:14px" title="Hapus foto">🗑️</button>
    </div>
  </div>`;
}

// ── MODAL UPLOAD / KAMERA ─────────────────────────────────────
function _modalUploadFoto() {
  document.getElementById('modal-upload-foto')?.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-upload-foto';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);' +
    'z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px';

  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:24px;
    width:100%;max-width:420px;max-height:90vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:16px;font-weight:700">📷 Upload Foto Lapangan</div>
      <button onclick="document.getElementById('modal-upload-foto').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:32px;
        height:32px;font-size:16px;cursor:pointer">✕</button>
    </div>

    <!-- Preview area -->
    <div id="preview-foto-area" style="border:2px dashed #CBD5E1;border-radius:12px;
      background:#F8FAFC;min-height:200px;display:flex;align-items:center;
      justify-content:center;margin-bottom:14px;overflow:hidden;cursor:pointer"
      onclick="document.getElementById('input-foto-file').click()">
      <div id="preview-foto-placeholder" style="text-align:center;color:#94A3B8;padding:20px">
        <div style="font-size:36px;margin-bottom:8px">📷</div>
        <div style="font-size:13px;font-weight:600">Klik untuk pilih foto</div>
        <div style="font-size:11px;margin-top:4px">Dari galeri atau kamera</div>
      </div>
      <img id="preview-foto-img" src="" alt=""
        style="display:none;width:100%;height:100%;object-fit:cover;border-radius:10px">
    </div>

    <!-- Input file hidden -->
    <input type="file" id="input-foto-file" accept="image/*" multiple
      style="display:none" onchange="_onFotoSelected(this)">

    <!-- Preview multiple -->
    <div id="preview-multi" style="display:grid;grid-template-columns:repeat(3,1fr);
      gap:6px;margin-bottom:14px"></div>

    <div style="display:flex;gap:10px;margin-bottom:14px">
      <button onclick="document.getElementById('input-foto-file').click()"
        style="flex:1;padding:10px;border:1.5px solid #E2E8F0;border-radius:10px;
        background:#fff;font-size:13px;font-weight:600;cursor:pointer">
        🖼️ Pilih dari Galeri
      </button>
      <button onclick="_bukaKameraFoto()"
        style="flex:1;padding:10px;background:#2D6CDF;color:#fff;border:none;
        border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">
        📷 Ambil Foto
      </button>
    </div>

    <div id="info-foto-upload" style="font-size:12px;color:#64748B;
      text-align:center;margin-bottom:12px"></div>

    <button id="btn-simpan-foto" onclick="_simpanSemuaFoto()" disabled
      style="width:100%;padding:12px;background:#94A3B8;color:#fff;border:none;
      border-radius:10px;font-size:14px;font-weight:700;cursor:not-allowed">
      💾 Simpan Foto
    </button>
  </div>`;

  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);

  window._fotoQueue = [];
}

// Proses file dipilih dari galeri
function _onFotoSelected(input) {
  if (!input.files?.length) return;
  window._fotoQueue = window._fotoQueue || [];
  const prevMulti = document.getElementById('preview-multi');
  const infoEl    = document.getElementById('info-foto-upload');
  const btnSimpan = document.getElementById('btn-simpan-foto');

  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      window._fotoQueue.push(e.target.result);
      // Render thumbnail
      const thumb = document.createElement('div');
      thumb.style.cssText = 'aspect-ratio:1;border-radius:6px;overflow:hidden;background:#F1F5F9';
      thumb.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
      prevMulti.appendChild(thumb);
      // Update info
      infoEl.textContent = window._fotoQueue.length + ' foto siap diupload';
      btnSimpan.disabled = false;
      btnSimpan.style.background = 'linear-gradient(135deg,#2D6CDF,#1B5CBF)';
      btnSimpan.style.cursor = 'pointer';
    };
    reader.readAsDataURL(file);
  });
}

// Kamera langsung
function _bukaKameraFoto() {
  const input = document.getElementById('input-foto-file');
  if (!input) return;
  input.setAttribute('capture', 'environment');
  input.click();
  setTimeout(() => input.removeAttribute('capture'), 1000);
}

// Upload semua foto ke GAS
async function _simpanSemuaFoto() {
  const queue = window._fotoQueue || [];
  if (!queue.length) return;

  const btn = document.getElementById('btn-simpan-foto');
  btn.disabled   = true;
  btn.textContent = '⏳ Mengupload...';

  const now  = new Date();
  const tgl  = String(now.getDate()).padStart(2,'0') + '/' +
               String(now.getMonth()+1).padStart(2,'0') + '/' + now.getFullYear();

  let berhasil = 0, gagal = 0;
  for (let i = 0; i < queue.length; i++) {
    btn.textContent = `⏳ Upload ${i+1}/${queue.length}...`;
    try {
      await callAPI('uploadFotoKerja', {
        foto_base64: queue[i],
        tanggal: tgl
      });
      berhasil++;
    } catch(e) {
      gagal++;
      console.error('Upload foto gagal:', e.message);
    }
  }

  document.getElementById('modal-upload-foto')?.remove();
  window._fotoQueue = [];

  const msg = berhasil + ' foto berhasil diupload' + (gagal ? ', ' + gagal + ' gagal' : '');
  showToast(msg, berhasil > 0 ? 'success' : 'error', 4000);
  await loadFotoGrid();
}

// ── LIHAT FOTO BESAR ──────────────────────────────────────────
function _lihatFotoBesar(url, judul, waktu) {
  document.getElementById('modal-foto-besar')?.remove();

  const m = document.createElement('div');
  m.id = 'modal-foto-besar';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);' +
    'z-index:9999;display:flex;align-items:center;justify-content:center;' +
    'padding:16px;cursor:pointer';

  m.innerHTML = `
  <div style="max-width:90vw;max-height:90vh;text-align:center" onclick="event.stopPropagation()">
    <img src="${url}" alt="${judul}"
      style="max-width:100%;max-height:80vh;border-radius:8px;display:block">
    <div style="color:#fff;margin-top:10px;font-size:14px;font-weight:600">
      ${judul}${waktu?' · '+waktu:''}
    </div>
  </div>`;

  m.addEventListener('click', () => m.remove());
  document.body.appendChild(m);
}

// ── HAPUS FOTO ────────────────────────────────────────────────
async function _hapusFoto(idFoto) {
  if (!confirm('Hapus foto ini?')) return;
  try {
    await callAPI('deleteFotoKerja', { id_foto: idFoto });
    showToast('Foto dihapus', 'success', 2000);
    await loadFotoGrid();
  } catch(e) {
    showToast('Gagal hapus: ' + e.message, 'error');
  }
}

// ── EXPORT PDF ────────────────────────────────────────────────
async function _exportFotoPDF() {
  const tglDari = document.getElementById('filter-tgl-foto')?.value    || '';
  const tglKe   = document.getElementById('filter-tgl-foto-ke')?.value || '';

  const _toIDDate = v => {
    if (!v) return '';
    const p = v.split('-');
    return p[2]+'/'+p[1]+'/'+p[0];
  };

  showToast('Mempersiapkan PDF...', 'info', 3000);

  const ok = await _ensureJsPDF();
  if (!ok) { showToast('Library PDF tidak tersedia', 'error'); return; }

  try {
    const params = tglDari === tglKe
      ? { tanggal: _toIDDate(tglDari) }
      : { tgl_dari: _toIDDate(tglDari), tgl_ke: _toIDDate(tglKe) };

    const data     = await callAPI('getFotoKerja', params);
    const instansi = await callAPI('getInstansiInfo', {}).catch(() => ({}));

    if (!data || data.length === 0) {
      showToast('Tidak ada foto untuk periode ini', 'warning'); return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const W = 210, mL = 15, mR = 15;
    let y = 15;

    // ── KOP SURAT ──────────────────────────────────────────
    y = await _kopSurat(doc, instansi, W, mL, y);

    // ── JUDUL ──────────────────────────────────────────────
    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    doc.text('LAPORAN FOTO KEGIATAN LAPANGAN', W/2, y, {align:'center'});
    y += 5;

    const periodeStr = tglDari === tglKe
      ? _toIDDate(tglDari)
      : _toIDDate(tglDari) + ' s/d ' + _toIDDate(tglKe);
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.text('Periode: ' + periodeStr, W/2, y, {align:'center'});
    y += 4;

    doc.setLineWidth(0.4);
    doc.line(mL, y, W-mR, y);
    y += 5;

    // ── GROUP PER TANGGAL ──────────────────────────────────
    const grouped = {};
    data.forEach(f => {
      const k = f.tanggal || '-';
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(f);
    });

    const sortedDates = Object.keys(grouped).sort();
    const COLS  = 3;
    const PHOTO_W = (W - mL - mR - (COLS-1)*4) / COLS; // ~54mm per foto
    const PHOTO_H = PHOTO_W * 0.75; // rasio 4:3
    const GAP   = 4;

    for (const tgl of sortedDates) {
      const fotos = grouped[tgl];
      const f0    = fotos[0];

      // Header tanggal
      doc.setFillColor(45, 108, 223);
      doc.rect(mL, y-3, W-mL-mR, 7, 'F');
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.text((f0.hari||'') + ', ' + tgl + '  (' + fotos.length + ' foto)',
        mL+3, y+1);
      doc.setTextColor(0,0,0);
      y += 6;

      // Grid foto 3 kolom
      for (let i = 0; i < fotos.length; i++) {
        const col = i % COLS;
        const fx  = mL + col * (PHOTO_W + GAP);

        if (col === 0 && i > 0) y += PHOTO_H + 8;

        // Page break
        if (y + PHOTO_H + 12 > 272) {
          doc.addPage();
          y = 15;
          // Header lanjutan
          doc.setFillColor(45,108,223);
          doc.rect(mL, y-3, W-mL-mR, 7, 'F');
          doc.setTextColor(255,255,255);
          doc.setFont('helvetica','bold');
          doc.setFontSize(9);
          doc.text('(Lanjutan) ' + (f0.hari||'') + ', ' + tgl, mL+3, y+1);
          doc.setTextColor(0,0,0);
          y += 6;
        }

        // Frame foto
        doc.setFillColor(241, 245, 249);
        doc.rect(fx, y, PHOTO_W, PHOTO_H, 'F');
        doc.setDrawColor(200, 210, 230);
        doc.setLineWidth(0.3);
        doc.rect(fx, y, PHOTO_W, PHOTO_H);

        // Embed foto
        try {
          const imgUrl = (fotos[i].foto_url||'').replace(
            'lh3.googleusercontent.com/d/',
            'lh3.googleusercontent.com/d/'
          );
          if (imgUrl) {
            // Fetch image as base64
            const resp = await fetch(imgUrl);
            const blob = await resp.blob();
            const b64  = await new Promise(res => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.readAsDataURL(blob);
            });
            doc.addImage(b64, 'JPEG', fx, y, PHOTO_W, PHOTO_H, '', 'FAST');
          }
        } catch(eI) {
          // Placeholder kalau gagal load
          doc.setTextColor(148,163,184);
          doc.setFontSize(8);
          doc.text('📷', fx + PHOTO_W/2, y + PHOTO_H/2, {align:'center'});
          doc.setTextColor(0,0,0);
        }

        // Waktu di bawah foto
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        doc.setTextColor(100,116,139);
        doc.text(fotos[i].waktu || '', fx + PHOTO_W/2, y + PHOTO_H + 3.5, {align:'center'});
        doc.setTextColor(0,0,0);
      }

      // Setelah semua foto tanggal ini
      const lastRow = Math.floor((fotos.length-1) / COLS);
      y += PHOTO_H + 10;
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      doc.setTextColor(150,150,150);
      doc.text(
        'Dicetak: ' + new Date().toLocaleDateString('id-ID') + ' | Hal ' + i + '/' + pageCount,
        W/2, 287, {align:'center'}
      );
    }

    doc.save('Laporan_Foto_' + periodeStr.replace(/\//g,'-') + '.pdf');
    showToast('✅ PDF berhasil didownload!', 'success', 3000);

  } catch(e) {
    showToast('Gagal buat PDF: ' + e.message, 'error', 5000);
    console.error('PDF foto:', e);
  }
}

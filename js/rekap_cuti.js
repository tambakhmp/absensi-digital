// ============================================================
// rekap_cuti.js — Rekap Database Cuti Karyawan
// Fitur: tampil sisa/terpakai cuti, export Excel + PDF
// ============================================================

async function renderRekapCutiAdmin(container) {
  if (!container) return;
  const now   = new Date();
  const tahun = now.getFullYear();

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;
      margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <h2 style="font-size:18px;font-weight:700;margin:0">🏖️ Rekap Cuti Karyawan</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select class="form-control" id="filter-tahun-cuti" style="width:110px"
          onchange="loadRekapCuti()">
          ${[tahun+1,tahun,tahun-1,tahun-2].map(y=>
            `<option value="${y}" ${y===tahun?'selected':''}>${y}</option>`
          ).join('')}
        </select>
        <select class="form-control" id="filter-dept-cuti" style="width:140px"
          onchange="_filterTabelCuti()">
          <option value="">Semua Dept</option>
        </select>
        <select class="form-control" id="filter-status-cuti" style="width:130px"
          onchange="_filterTabelCuti()">
          <option value="">Semua Status</option>
          <option value="aman">✅ Aman (sisa>3)</option>
          <option value="kritis">⚠️ Kritis (sisa 1-3)</option>
          <option value="habis">🔴 Habis (sisa 0)</option>
        </select>
        <button class="btn btn--secondary" style="font-size:12px;padding:9px 12px"
          onclick="loadRekapCuti()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div id="cuti-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
      gap:10px;margin-bottom:16px">${skeletonCard(4)}</div>

    <!-- Export Buttons -->
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn btn--primary" style="font-size:12px;padding:9px 14px"
        onclick="exportCutiExcel()">📊 Export Excel</button>
      <button class="btn btn--ghost" style="font-size:12px;padding:9px 14px"
        onclick="exportCutiPDF()">📄 Export PDF</button>
    </div>

    <!-- Tabel -->
    <div class="card" style="overflow-x:auto">
      <div id="tabel-cuti">${skeletonCard(3)}</div>
    </div>`;

  await loadRekapCuti();
}

// ── Data global untuk filter client-side ─────────────────────
let _cutiData = [];
let _cutiSummary = {};

async function loadRekapCuti() {
  const tahun = parseInt(document.getElementById('filter-tahun-cuti')?.value || new Date().getFullYear());
  const el    = document.getElementById('tabel-cuti');
  const elSum = document.getElementById('cuti-summary');
  if (el) el.innerHTML = skeletonCard(3);

  try {
    const res = await callAPI('getRekapCutiSemua', { tahun });
    _cutiData    = res.data    || [];
    _cutiSummary = res.summary || {};

    // Isi dropdown departemen
    const deptEl = document.getElementById('filter-dept-cuti');
    if (deptEl && deptEl.options.length <= 1) {
      const depts = [...new Set(_cutiData.map(k=>k.departemen).filter(Boolean))].sort();
      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d; opt.textContent = d;
        deptEl.appendChild(opt);
      });
    }

    // Render summary
    if (elSum) {
      const s = _cutiSummary;
      elSum.innerHTML = `
        ${_cardCuti('📋','Total Karyawan',s.total_karyawan+' orang','#2D6CDF')}
        ${_cardCuti('✅','Rata Terpakai',s.rata_terpakai+' hari','#1A9E74')}
        ${_cardCuti('⚠️','Kritis (≤3 hari)',s.karyawan_kritis+' karyawan','#D97706')}
        ${_cardCuti('🔴','Jatah Habis',s.karyawan_habis+' karyawan','#E53E3E')}`;
    }

    _filterTabelCuti();
  } catch(e) {
    if (el) el.innerHTML = `<div style="padding:20px;color:#E53E3E;text-align:center">
      Gagal memuat: ${e.message}</div>`;
  }
}

function _cardCuti(icon, label, value, color) {
  return `<div class="card" style="padding:14px;text-align:center;border-top:3px solid ${color}">
    <div style="font-size:20px;margin-bottom:4px">${icon}</div>
    <div style="font-size:18px;font-weight:800;color:${color}">${value}</div>
    <div style="font-size:11px;color:#94A3B8">${label}</div>
  </div>`;
}

function _filterTabelCuti() {
  const dept   = document.getElementById('filter-dept-cuti')?.value || '';
  const status = document.getElementById('filter-status-cuti')?.value || '';
  const el     = document.getElementById('tabel-cuti');
  if (!el) return;

  let filtered = _cutiData;
  if (dept)   filtered = filtered.filter(k => k.departemen === dept);
  if (status === 'aman')   filtered = filtered.filter(k => k.sisa > 3);
  if (status === 'kritis') filtered = filtered.filter(k => k.sisa > 0 && k.sisa <= 3);
  if (status === 'habis')  filtered = filtered.filter(k => k.sisa === 0);

  if (!filtered.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:#94A3B8">
      Tidak ada data</div>`;
    return;
  }

  const tahun = _cutiSummary.tahun || new Date().getFullYear();
  const jatah = _cutiSummary.default_jatah || 12;

  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#2D6CDF;color:#fff">
          <th style="padding:10px 8px;text-align:left">No</th>
          <th style="padding:10px 8px;text-align:left">Nama Karyawan</th>
          <th style="padding:10px 8px;text-align:left">Departemen</th>
          <th style="padding:10px 8px;text-align:center">Jatah ${tahun}</th>
          <th style="padding:10px 8px;text-align:center">Terpakai</th>
          <th style="padding:10px 8px;text-align:center">Sisa</th>
          <th style="padding:10px 8px;text-align:center">Progress</th>
          <th style="padding:10px 8px;text-align:center">Pending</th>
          <th style="padding:10px 8px;text-align:center">Detail</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((k,i) => {
          const pct   = Math.min(100, Math.round((k.terpakai/jatah)*100));
          const warna = k.sisa === 0 ? '#E53E3E' : k.sisa <= 3 ? '#D97706' : '#1A9E74';
          return `<tr style="border-bottom:1px solid #F1F5F9;
            background:${i%2===0?'#fff':'#FAFBFF'}">
            <td style="padding:8px">${i+1}</td>
            <td style="padding:8px;font-weight:600">${k.nama_lengkap}</td>
            <td style="padding:8px;color:#64748B">${k.departemen||'-'}</td>
            <td style="padding:8px;text-align:center;font-weight:700">${jatah}</td>
            <td style="padding:8px;text-align:center;color:#D97706;font-weight:700">
              ${k.terpakai}</td>
            <td style="padding:8px;text-align:center">
              <span style="background:${warna}22;color:${warna};border:1px solid ${warna}55;
                padding:3px 10px;border-radius:20px;font-weight:700">${k.sisa}</span>
            </td>
            <td style="padding:8px;min-width:100px">
              <div style="background:#E2E8F0;border-radius:99px;height:6px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${warna};
                  border-radius:99px;transition:width .8s"></div>
              </div>
              <div style="font-size:10px;color:#94A3B8;text-align:center;margin-top:2px">
                ${pct}%</div>
            </td>
            <td style="padding:8px;text-align:center">
              ${k.total_pending > 0
                ? `<span style="background:#FEF3C7;color:#D97706;border:1px solid #FCD34D;
                    padding:2px 8px;border-radius:20px;font-size:11px">
                    ⏳ ${k.total_pending} hari</span>`
                : '<span style="color:#CBD5E1">-</span>'}
            </td>
            <td style="padding:8px;text-align:center">
              <button onclick="_toggleDetailCuti('detail-${k.id_karyawan}')"
                style="background:#EFF6FF;color:#2D6CDF;border:1px solid #BFDBFE;
                  padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer">
                ${k.detail.length > 0 ? '📋 '+k.detail.length+' cuti' : 'Belum ada'}
              </button>
            </td>
          </tr>
          ${k.detail.length > 0 ? `
          <tr id="detail-${k.id_karyawan}" style="display:none">
            <td colspan="9" style="padding:0">
              <div style="background:#F8FAFF;border-left:3px solid #2D6CDF;
                padding:12px 16px;font-size:11px">
                <div style="font-weight:700;color:#2D6CDF;margin-bottom:8px">
                  Riwayat Cuti ${k.nama_lengkap} (${tahun})</div>
                <table style="width:100%;border-collapse:collapse">
                  <thead>
                    <tr style="background:#E8F0FE">
                      <th style="padding:6px 8px;text-align:left">No</th>
                      <th style="padding:6px 8px;text-align:left">Dari</th>
                      <th style="padding:6px 8px;text-align:left">Sampai</th>
                      <th style="padding:6px 8px;text-align:center">Hari</th>
                      <th style="padding:6px 8px;text-align:left">Keterangan</th>
                      <th style="padding:6px 8px;text-align:left">Disetujui</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${k.detail.map((d,di)=>`
                    <tr style="border-bottom:1px solid #E2E8F0">
                      <td style="padding:5px 8px">${di+1}</td>
                      <td style="padding:5px 8px">${d.tanggal_mulai}</td>
                      <td style="padding:5px 8px">${d.tanggal_selesai}</td>
                      <td style="padding:5px 8px;text-align:center;font-weight:700">
                        ${d.total_hari}</td>
                      <td style="padding:5px 8px;color:#64748B">${d.keterangan||'-'}</td>
                      <td style="padding:5px 8px;color:#64748B">${d.tanggal_approve||'-'}</td>
                    </tr>`).join('')}
                    <tr style="background:#E8F0FE;font-weight:700">
                      <td colspan="3" style="padding:6px 8px">Total</td>
                      <td style="padding:6px 8px;text-align:center">
                        ${k.detail.reduce((s,d)=>s+d.total_hari,0)}</td>
                      <td colspan="2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>` : ''}`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr style="background:#1E293B;color:#fff;font-weight:700">
          <td colspan="3" style="padding:10px 8px">TOTAL (${filtered.length} karyawan)</td>
          <td style="padding:10px 8px;text-align:center">
            ${filtered.length * jatah}</td>
          <td style="padding:10px 8px;text-align:center">
            ${filtered.reduce((s,k)=>s+k.terpakai,0)}</td>
          <td style="padding:10px 8px;text-align:center">
            ${filtered.reduce((s,k)=>s+k.sisa,0)}</td>
          <td colspan="3"></td>
        </tr>
      </tfoot>
    </table>`;
}

function _toggleDetailCuti(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
}

// ── EXPORT EXCEL ─────────────────────────────────────────────
async function exportCutiExcel() {
  if (!_cutiData.length) { showToast('Load data dulu','warning'); return; }
  if (!window.XLSX) { showToast('Library Excel belum siap','error'); return; }

  const jatah = _cutiSummary.default_jatah || 12;
  const tahun = _cutiSummary.tahun || new Date().getFullYear();
  const wb    = XLSX.utils.book_new();

  // Sheet 1: Ringkasan per karyawan
  const rows1 = _cutiData.map((k,i) => ({
    'No'             : i+1,
    'Nama Karyawan'  : k.nama_lengkap,
    'NIK'            : k.nik,
    'Jabatan'        : k.jabatan,
    'Departemen'     : k.departemen,
    ['Jatah '+tahun] : jatah,
    'Terpakai (hari)': k.terpakai,
    'Sisa (hari)'    : k.sisa,
    'Status'         : k.sisa===0?'Habis':k.sisa<=3?'Kritis':'Aman',
    'Pending (hari)' : k.total_pending,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows1), 'Ringkasan Cuti');

  // Sheet 2: Detail per pengajuan
  const rows2 = [];
  _cutiData.forEach(k => {
    k.detail.forEach((d,i) => {
      rows2.push({
        'Nama Karyawan'  : k.nama_lengkap,
        'NIK'            : k.nik,
        'Departemen'     : k.departemen,
        'No'             : i+1,
        'Tgl Mulai'      : d.tanggal_mulai,
        'Tgl Selesai'    : d.tanggal_selesai,
        'Total Hari'     : d.total_hari,
        'Keterangan'     : d.keterangan || '-',
        'Tgl Disetujui'  : d.tanggal_approve || '-',
      });
    });
  });
  if (rows2.length > 0)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows2), 'Detail Pengajuan');

  // Sheet 3: Karyawan hampir habis
  const kritis = _cutiData.filter(k => k.sisa <= 3);
  if (kritis.length > 0) {
    const rows3 = kritis.map((k,i) => ({
      'No': i+1, 'Nama': k.nama_lengkap, 'NIK': k.nik,
      'Dept': k.departemen, 'Sisa Cuti': k.sisa,
      'Status': k.sisa===0?'HABIS':'KRITIS'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows3), 'Perlu Perhatian');
  }

  XLSX.writeFile(wb, `Rekap_Cuti_${tahun}.xlsx`);
  showToast('Export Excel berhasil! 📊', 'success');
}

// ── EXPORT PDF ────────────────────────────────────────────────
async function exportCutiPDF() {
  if (!_cutiData || !_cutiData.length) {
    showToast('Load data rekap cuti terlebih dahulu', 'warning'); return;
  }

  // Pastikan jsPDF tersedia
  const pdfOk = await _ensureJsPDF();
  if (!pdfOk || !window.jspdf?.jsPDF) {
    showToast('Library PDF tidak tersedia. Muat ulang halaman.', 'error'); return;
  }

  showToast('Membuat PDF...', 'info', 2000);

  try {
    const { jsPDF } = window.jspdf;
    const doc   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const W=210, mL=15, mR=15;
    const jatah = _cutiSummary.default_jatah || 12;
    const tahun = _cutiSummary.tahun || new Date().getFullYear();

    // ── Ambil data instansi ─────────────────────────────────
    let instansi = {};
    try {
      const settArr = await callAPI('getAllSetting', {});
      const sm = {};
      if (Array.isArray(settArr)) settArr.forEach(s => { if(s.key) sm[s.key]=s.value||''; });
      instansi = {
        nama_instansi  : sm.nama_instansi   || '',
        alamat_instansi: sm.alamat_instansi || '',
        telp_instansi  : sm.telepon_instansi|| '',
        email_instansi : sm.email_instansi  || '',
        logo_url       : sm.logo_url        || ''
      };
    } catch(eI) {}

    // ── Kop surat ───────────────────────────────────────────
    let y = await _kopSurat(doc, instansi, W, mL, 10);

    // ── Judul ───────────────────────────────────────────────
    doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.text('REKAP CUTI KARYAWAN TAHUN ' + tahun, W/2, y, {align:'center'});
    y += 5;
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.setTextColor(100,100,100);
    doc.text('Dicetak: ' + new Date().toLocaleDateString('id-ID',
      {day:'2-digit',month:'long',year:'numeric'}), W/2, y, {align:'center'});
    doc.setTextColor(0,0,0); y += 3;
    doc.setLineWidth(0.5);
    doc.line(mL, y, W-mR, y); y += 5;

    // ── Summary box ─────────────────────────────────────────
    const s = _cutiSummary;
    const BOX_W = (W-mL-mR-6)/4;
    const summaryItems = [
      { label:'Total Karyawan', val: s.total_karyawan,       color:[45,108,223] },
      { label:'Rata Terpakai',  val: s.rata_terpakai+' hr',  color:[26,158,116] },
      { label:'Status Kritis',  val: s.karyawan_kritis,      color:[217,119,6]  },
      { label:'Habis Cuti',     val: s.karyawan_habis,       color:[229,62,62]  },
    ];
    summaryItems.forEach((item, i) => {
      const bx = mL + i*(BOX_W+2);
      doc.setFillColor(...item.color);
      doc.roundedRect(bx, y, BOX_W, 14, 2, 2, 'F');
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','normal'); doc.setFontSize(8);
      doc.text(item.label, bx+BOX_W/2, y+4.5, {align:'center'});
      doc.setFont('helvetica','bold'); doc.setFontSize(14);
      doc.text(String(item.val), bx+BOX_W/2, y+11, {align:'center'});
    });
    doc.setTextColor(0,0,0); y += 20;

    // Sub info
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    doc.setTextColor(80,80,80);
    doc.text(
      'Jatah cuti/orang: '+jatah+' hari  |  '+
      'Total terpakai: '+s.total_hari_terpakai+' hari  |  '+
      'Total sisa: '+s.total_hari_sisa+' hari',
      W/2, y, {align:'center'});
    doc.setTextColor(0,0,0); y += 7;

    // ── Kolom tabel ─────────────────────────────────────────
    const cols = [
      {x:mL,     w:6,  label:'No',        align:'center'},
      {x:mL+7,   w:22, label:'NIK',       align:'left'},
      {x:mL+30,  w:38, label:'Nama Karyawan', align:'left'},
      {x:mL+69,  w:26, label:'Jabatan',   align:'left'},
      {x:mL+96,  w:26, label:'Departemen',align:'left'},
      {x:mL+123, w:14, label:'Jatah',     align:'center'},
      {x:mL+138, w:16, label:'Terpakai',  align:'center'},
      {x:mL+155, w:12, label:'Sisa',      align:'center'},
      {x:mL+168, w:22, label:'Status',    align:'center'},
    ];
    const ROW_H = 6.5;

    const _drawHeader = () => {
      doc.setFillColor(30,58,138);
      doc.rect(mL, y, W-mL-mR, 7, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(8); doc.setFont('helvetica','bold');
      cols.forEach(c => {
        const tx = c.align==='center' ? c.x+c.w/2 : c.x+1;
        doc.text(c.label, tx, y+4.5, {align: c.align==='center'?'center':'left'});
      });
      doc.setTextColor(0,0,0); y += 8;
    };
    _drawHeader();

    // ── Baris data ──────────────────────────────────────────
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);

    _cutiData.forEach((k, i) => {
      if (y + ROW_H > 270) {
        doc.addPage(); y = 15;
        _drawHeader();
      }

      // Alternating row
      if (i % 2 === 0) {
        doc.setFillColor(240,245,255);
        doc.rect(mL, y-3, W-mL-mR, ROW_H, 'F');
      }

      // Garis bawah tipis
      doc.setDrawColor(210,220,240);
      doc.setLineWidth(0.15);
      doc.line(mL, y-3+ROW_H, W-mR, y-3+ROW_H);
      doc.setDrawColor(0,0,0);

      const sisa     = k.sisa       || 0;
      const terpakai = k.terpakai   || 0;
      const pending  = k.total_pending || 0;
      const status   = sisa===0 ? 'HABIS' : sisa<=3 ? 'KRITIS' : 'AMAN';
      const sColor   = sisa===0 ? [220,38,38] : sisa<=3 ? [202,138,4] : [21,128,61];

      // Truncate text helper
      const trunc = (str, maxW, sz) => {
        doc.setFontSize(sz||8.5);
        while(str.length>3 && doc.getTextWidth(str)>maxW) str=str.slice(0,-1);
        return str.length<(str||'').length ? str+'…' : str;
      };

      doc.setFontSize(8.5); doc.setTextColor(30,30,30);
      doc.text(String(i+1),                          cols[0].x+cols[0].w/2, y, {align:'center'});
      doc.text(trunc(k.nik||'-',     cols[1].w-2),   cols[1].x+1, y);
      doc.text(trunc(k.nama_lengkap||'-', cols[2].w-2), cols[2].x+1, y);
      doc.text(trunc(k.jabatan||'-', cols[3].w-2),   cols[3].x+1, y);
      doc.text(trunc(k.departemen||'-',cols[4].w-2), cols[4].x+1, y);

      doc.setTextColor(30,30,30);
      doc.text(String(jatah),    cols[5].x+cols[5].w/2, y, {align:'center'});
      doc.text(String(terpakai), cols[6].x+cols[6].w/2, y, {align:'center'});
      doc.text(String(sisa),     cols[7].x+cols[7].w/2, y, {align:'center'});

      // Badge status berwarna
      doc.setFillColor(...sColor);
      doc.roundedRect(cols[8].x+1, y-3.5, cols[8].w-2, 5.5, 1.5, 1.5, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','bold');
      doc.text(status, cols[8].x+cols[8].w/2, y+0.2, {align:'center'});
      doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0);

      y += ROW_H;
    });

    // ── Total row ───────────────────────────────────────────
    doc.setFillColor(30,58,138);
    doc.rect(mL, y-3, W-mL-mR, 7, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
    doc.text('TOTAL: '+_cutiData.length+' karyawan', mL+2, y+1);
    doc.text(String(s.total_hari_terpakai), cols[6].x+cols[6].w/2, y+1, {align:'center'});
    doc.text(String(s.total_hari_sisa),     cols[7].x+cols[7].w/2, y+1, {align:'center'});
    doc.setTextColor(0,0,0); y += 12;

    // ── Tanda tangan ────────────────────────────────────────
    if (y + 35 > 275) { doc.addPage(); y = 20; }
    const ttdCols = [mL, mL+45, mL+90, mL+135];
    const ttdLabels = ['Mengetahui','','HRD/Admin','Pimpinan'];
    const ttdNames  = ['','','',''];
    ttdCols.forEach((tx, i) => {
      doc.setFont('helvetica','normal'); doc.setFontSize(8);
      doc.setTextColor(60,60,60);
      if (ttdLabels[i]) doc.text(ttdLabels[i], tx+22, y, {align:'center'});
      doc.line(tx+4, y+14, tx+40, y+14);
      doc.text('(___________________)', tx+22, y+18, {align:'center'});
    });

    // ── Footer per halaman ──────────────────────────────────
    const nPages = doc.internal.getNumberOfPages();
    for (let pg=1; pg<=nPages; pg++) {
      doc.setPage(pg);
      doc.setFont('helvetica','normal'); doc.setFontSize(8);
      doc.setTextColor(150,150,150);
      doc.text('Hal '+pg+'/'+nPages, W/2, 289, {align:'center'});
    }

    const fname = 'Rekap_Cuti_'+tahun+'_'+new Date().toLocaleDateString('id-ID').replace(/\//g,'-')+'.pdf';
    doc.save(fname);
    showToast('✅ PDF Rekap Cuti berhasil didownload!', 'success', 4000);

  } catch(eP) {
    console.error('exportCutiPDF error:', eP);
    showToast('Gagal buat PDF: ' + eP.message, 'error', 6000);
  }
}

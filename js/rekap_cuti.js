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
  if (!_cutiData.length) { showToast('Load data dulu','warning'); return; }
  if (typeof jsPDF === 'undefined') { showToast('Library PDF belum siap','error'); return; }

  showToast('Membuat PDF...','info',2000);

  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W=210, mL=15, mR=15;
  const jatah = _cutiSummary.default_jatah || 12;
  const tahun = _cutiSummary.tahun || new Date().getFullYear();

  // Kop surat
  let instansi = {};
  try { instansi = await callAPI('getMultipleSetting',
    {keys:'nama_instansi,alamat_instansi,logo_url'}); } catch(e){}
  let y = await _kopSurat(doc, instansi, W, mL, 10);

  // Judul
  doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('REKAP CUTI KARYAWAN TAHUN '+tahun, W/2, y, {align:'center'}); y+=5;
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.setTextColor(100,100,100);
  doc.text('Dicetak: '+new Date().toLocaleDateString('id-ID',
    {day:'2-digit',month:'long',year:'numeric'}), W/2, y, {align:'center'});
  doc.setTextColor(0,0,0); y+=8;

  // Summary box
  doc.setFillColor(45,108,223);
  doc.rect(mL, y, W-mL-mR, 12, 'F');
  doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont('helvetica','bold');
  const s = _cutiSummary;
  doc.text('Total Karyawan: '+s.total_karyawan, mL+4, y+4.5);
  doc.text('Rata Terpakai: '+s.rata_terpakai+' hari', mL+55, y+4.5);
  doc.text('Kritis: '+s.karyawan_kritis, mL+110, y+4.5);
  doc.text('Habis: '+s.karyawan_habis, mL+145, y+4.5);
  doc.text('Jatah/orang: '+jatah+' hari', mL+4, y+9.5);
  doc.text('Total Terpakai: '+s.total_hari_terpakai+' hari', mL+55, y+9.5);
  doc.text('Total Sisa: '+s.total_hari_sisa+' hari', mL+110, y+9.5);
  doc.setTextColor(0,0,0); y+=18;

  // Header tabel
  const cols = [
    {x:mL,    w:6,  label:'No'},
    {x:mL+7,  w:42, label:'Nama Karyawan'},
    {x:mL+50, w:28, label:'Departemen'},
    {x:mL+79, w:14, label:'Jatah'},
    {x:mL+94, w:16, label:'Terpakai'},
    {x:mL+111,w:13, label:'Sisa'},
    {x:mL+125,w:22, label:'Status'},
    {x:mL+148,w:20, label:'Pending'},
  ];

  const _drawHeader = () => {
    doc.setFillColor(45,108,223);
    doc.rect(mL, y, W-mL-mR, 7, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    cols.forEach(c => doc.text(c.label, c.x+1, y+4.5));
    doc.setTextColor(0,0,0); y+=8;
  };
  _drawHeader();

  // Baris data
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  _cutiData.forEach((k,i) => {
    if (y > 262) { doc.addPage(); y=20; _drawHeader(); }
    const bg = i%2===0;
    if (!bg) { doc.setFillColor(248,250,255); doc.rect(mL,y-3,W-mL-mR,6.5,'F'); }
    const status = k.sisa===0?'HABIS':k.sisa<=3?'KRITIS':'AMAN';
    const sColor = k.sisa===0?[229,62,62]:k.sisa<=3?[217,119,6]:[26,158,116];
    doc.text(String(i+1), cols[0].x+1, y);
    doc.text(k.nama_lengkap.substring(0,20), cols[1].x+1, y);
    doc.text((k.departemen||'-').substring(0,16), cols[2].x+1, y);
    doc.text(String(jatah), cols[3].x+4, y, {align:'center'});
    doc.text(String(k.terpakai), cols[4].x+6, y, {align:'center'});
    doc.setFont('helvetica','bold');
    doc.setTextColor(...sColor);
    doc.text(String(k.sisa), cols[5].x+4, y, {align:'center'});
    doc.text(status, cols[6].x+1, y);
    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal');
    doc.text(k.total_pending>0?k.total_pending+' hari':'-', cols[7].x+4, y, {align:'center'});
    y += 6.5;
  });

  // Baris total
  doc.setFillColor(30,41,59);
  doc.rect(mL, y-1, W-mL-mR, 7, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
  doc.text('TOTAL ('+_cutiData.length+' karyawan)', cols[1].x+1, y+3.5);
  doc.text(String(_cutiData.length*jatah), cols[3].x+4, y+3.5, {align:'center'});
  doc.text(String(_cutiSummary.total_hari_terpakai), cols[4].x+6, y+3.5, {align:'center'});
  doc.text(String(_cutiSummary.total_hari_sisa), cols[5].x+4, y+3.5, {align:'center'});
  doc.setTextColor(0,0,0);

  doc.save(`Rekap_Cuti_${tahun}.pdf`);
  showToast('Export PDF berhasil! 📄','success');
}

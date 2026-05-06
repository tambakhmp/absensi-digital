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
  if (!_cutiData || !_cutiData.length) {
    showToast('Load data rekap cuti terlebih dahulu', 'warning'); return;
  }
  const xlOk = await _ensureXLSX();
  if (!xlOk || typeof XLSX === 'undefined') {
    showToast('Library Excel tidak tersedia', 'error'); return;
  }

  const tahun = _cutiSummary.tahun || new Date().getFullYear();
  const jatah = _cutiSummary.default_jatah || 12;
  const s     = _cutiSummary;

  // Ambil instansi
  let namaInst = 'INSTANSI', alamatInst = '', telpInst = '', emailInst = '';
  try {
    const settArr = await callAPI('getAllSetting', {});
    const sm = {};
    if (Array.isArray(settArr)) settArr.forEach(x => { if(x.key) sm[x.key]=x.value||''; });
    namaInst  = sm.nama_instansi    || namaInst;
    alamatInst= sm.alamat_instansi  || '';
    telpInst  = sm.telepon_instansi || '';
    emailInst = sm.email_instansi   || '';
  } catch(eI) {}

  const enc = (r,c) => XLSX.utils.encode_cell({r,c});
  const tglCetak = new Date().toLocaleDateString('id-ID',
    {day:'2-digit',month:'long',year:'numeric'});

  // ── Build data ──────────────────────────────────────────
  const aoa = [
    [namaInst],                                // row 0: nama instansi
    [alamatInst + (telpInst?' | Telp: '+telpInst:'') + (emailInst?' | '+emailInst:'')],
    ['REKAP CUTI KARYAWAN TAHUN ' + tahun],   // row 2: judul
    ['Dicetak: ' + tglCetak],                 // row 3
    [],                                        // row 4: kosong
    // row 5: summary
    ['Total Karyawan','','Rata Terpakai','','Status Kritis','','Habis Cuti',''],
    [s.total_karyawan,'',s.rata_terpakai+' hari','',s.karyawan_kritis,'',s.karyawan_habis,''],
    ['Jatah/orang: '+jatah+' hari','','Total Terpakai: '+s.total_hari_terpakai+' hari','',
     'Total Sisa: '+s.total_hari_sisa+' hari','','',''],
    [],                                        // row 8: kosong
    // row 9: header tabel
    ['No','NIK','Nama Karyawan','Jabatan','Departemen','Jatah (hari)','Terpakai (hari)','Sisa (hari)','Status','Pending (hari)'],
  ];

  // Data rows
  _cutiData.forEach((k, i) => {
    const sisa     = k.sisa       || 0;
    const terpakai = k.terpakai   || 0;
    const pending  = k.total_pending || 0;
    const status   = sisa===0?'HABIS':sisa<=3?'KRITIS':'AMAN';
    aoa.push([
      i+1, k.nik||'-', k.nama_lengkap||'-',
      k.jabatan||'-', k.departemen||'-',
      jatah, terpakai, sisa, status, pending
    ]);
  });

  // Total row
  aoa.push([
    'TOTAL', '', _cutiData.length+' Karyawan', '', '',
    '', s.total_hari_terpakai, s.total_hari_sisa, '', ''
  ]);

  const ws  = XLSX.utils.aoa_to_sheet(aoa);
  const ncol = 10;

  // ── Lebar kolom ────────────────────────────────────────
  ws['!cols'] = [
    {wch:4},{wch:14},{wch:24},{wch:20},{wch:14},
    {wch:8},{wch:10},{wch:8},{wch:10},{wch:9}
  ];
  // Tinggi baris
  ws['!rows'] = [
    {hpt:22},{hpt:14},{hpt:20},{hpt:12},{hpt:6},
    {hpt:16},{hpt:20},{hpt:14},{hpt:6},{hpt:28}
  ];

  // ── Merge cells ────────────────────────────────────────
  ws['!merges'] = [
    {s:{r:0,c:0},e:{r:0,c:ncol-1}},  // nama instansi
    {s:{r:1,c:0},e:{r:1,c:ncol-1}},  // alamat
    {s:{r:2,c:0},e:{r:2,c:ncol-1}},  // judul
    {s:{r:3,c:0},e:{r:3,c:ncol-1}},  // tgl cetak
    // summary merges
    {s:{r:5,c:0},e:{r:5,c:1}},{s:{r:5,c:2},e:{r:5,c:3}},
    {s:{r:5,c:4},e:{r:5,c:5}},{s:{r:5,c:6},e:{r:5,c:7}},
    {s:{r:6,c:0},e:{r:6,c:1}},{s:{r:6,c:2},e:{r:6,c:3}},
    {s:{r:6,c:4},e:{r:6,c:5}},{s:{r:6,c:6},e:{r:6,c:7}},
    {s:{r:7,c:0},e:{r:7,c:1}},{s:{r:7,c:2},e:{r:7,c:3}},
    {s:{r:7,c:4},e:{r:7,c:5}},{s:{r:7,c:6},e:{r:7,c:9}},
    // total row
    {s:{r:aoa.length-1,c:0},e:{r:aoa.length-1,c:1}},
    {s:{r:aoa.length-1,c:2},e:{r:aoa.length-1,c:4}},
  ];

  // ── Styles ─────────────────────────────────────────────
  const THIN  = {style:'thin',color:{rgb:'C5D9F8'}};
  const MED   = {style:'medium',color:{rgb:'1E3A5F'}};
  const brd   = {top:THIN,bottom:THIN,left:THIN,right:THIN};
  const brdM  = {top:MED,bottom:MED,left:MED,right:MED};
  const ctr   = {horizontal:'center',vertical:'center',wrapText:true};
  const left  = {horizontal:'left',vertical:'center'};

  // Helper
  const sty = (fill,font,align,border) => ({fill,font,alignment:align,border});

  // Row 0: nama instansi
  if(ws[enc(0,0)]) ws[enc(0,0)].s = sty(
    {patternType:'solid',fgColor:{rgb:'1E3A5F'}},
    {bold:true,sz:16,color:{rgb:'FFFFFF'},name:'Calibri'},
    ctr, null);

  // Row 1: alamat
  if(ws[enc(1,0)]) ws[enc(1,0)].s = sty(
    {patternType:'solid',fgColor:{rgb:'1E3A5F'}},
    {sz:9,color:{rgb:'D0E4FF'},name:'Calibri'},
    ctr, null);

  // Row 2: judul
  if(ws[enc(2,0)]) ws[enc(2,0)].s = sty(
    {patternType:'solid',fgColor:{rgb:'2D6CDF'}},
    {bold:true,sz:13,color:{rgb:'FFFFFF'},name:'Calibri'},
    ctr, null);

  // Row 3: tgl cetak
  if(ws[enc(3,0)]) ws[enc(3,0)].s = sty(
    {patternType:'solid',fgColor:{rgb:'2D6CDF'}},
    {sz:9,italic:true,color:{rgb:'D0E4FF'},name:'Calibri'},
    ctr, null);

  // Summary rows 5,6
  const sumColors = ['2563EB','16A34A','D97706','DC2626'];
  [0,1,2,3].forEach(i => {
    const col = i*2;
    [5,6].forEach(row => {
      const cell = ws[enc(row,col)];
      if(!cell) return;
      const isBig = row===6;
      cell.s = sty(
        {patternType:'solid',fgColor:{rgb:sumColors[i]}},
        {bold:true,sz:isBig?14:9,color:{rgb:'FFFFFF'},name:'Calibri'},
        ctr, null);
    });
  });
  if(ws[enc(7,0)]) ws[enc(7,0)].s = sty(
    {patternType:'solid',fgColor:{rgb:'EFF6FF'}},
    {sz:9,italic:true,color:{rgb:'1E3A5F'}},ctr,null);

  // Row 9: header tabel
  for(let c=0;c<ncol;c++) {
    const cell = ws[enc(9,c)];
    if(!cell) continue;
    cell.s = sty(
      {patternType:'solid',fgColor:{rgb:'1E3A5F'}},
      {bold:true,sz:9,color:{rgb:'FFFFFF'},name:'Calibri'},
      ctr, brdM);
  }

  // Data rows
  const NDATA_START = 10;
  for(let i=0; i<_cutiData.length; i++) {
    const r   = NDATA_START + i;
    const alt = i%2===1;
    const bg  = alt ? 'EFF6FF' : 'FFFFFF';
    for(let c=0;c<ncol;c++) {
      const cell = ws[enc(r,c)];
      if(!cell) continue;
      const isNum = c >= 5;
      // Status cell
      if(c===8) {
        const sisa = _cutiData[i].sisa||0;
        const sc = sisa===0?'DC2626':sisa<=3?'D97706':'16A34A';
        cell.s = sty(
          {patternType:'solid',fgColor:{rgb:sc+'22'}},
          {bold:true,sz:9,color:{rgb:sc},name:'Calibri'},
          ctr, brd);
      } else {
        cell.s = sty(
          {patternType:'solid',fgColor:{rgb:bg}},
          {sz:9,color:{rgb:'1E293B'},name:'Calibri'},
          isNum?ctr:left, brd);
      }
    }
  }

  // Total row
  const rTotal = NDATA_START + _cutiData.length;
  for(let c=0;c<ncol;c++) {
    const cell = ws[enc(rTotal,c)] || {v:'',t:'s'};
    ws[enc(rTotal,c)] = cell;
    cell.s = sty(
      {patternType:'solid',fgColor:{rgb:'1E3A5F'}},
      {bold:true,sz:10,color:{rgb:'FFFFFF'},name:'Calibri'},
      ctr, brdM);
  }

  // Print setup
  ws['!views']    = [{state:'frozen',xSplit:0,ySplit:10}];
  ws['!pageSetup']= {orientation:'portrait',fitToWidth:1,paperSize:9};
  ws['!margins']  = {left:0.4,right:0.4,top:0.4,bottom:0.4};

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Cuti '+tahun);
  wb.Props = {Title:'Rekap Cuti '+tahun, Author:namaInst};

  const fname = 'Rekap_Cuti_'+tahun+'_'+tglCetak.replace(/\s/g,'-')+'.xlsx';
  XLSX.writeFile(wb, fname);
  showToast('✅ Excel Rekap Cuti berhasil didownload!', 'success', 4000);
}
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

    // ── Baris data — multi-line, font kecil bila perlu ─────
    const FSZ = 8.5;  // font size default

    _cutiData.forEach((k, i) => {
      const sisa     = k.sisa          || 0;
      const terpakai = k.terpakai      || 0;
      const status   = sisa===0?'HABIS':sisa<=3?'KRITIS':'AMAN';
      const sColor   = sisa===0?[220,38,38]:sisa<=3?[202,138,4]:[21,128,61];

      // ── Hitung tinggi baris berdasarkan konten terpanjang ──
      const getLines = (txt, maxW, fs) => {
        doc.setFontSize(fs);
        return doc.splitTextToSize(String(txt||'-'), maxW);
      };

      // Coba font 8.5 dulu, kalau masih > 2 baris kecilkan ke 7.5
      let fs = FSZ;
      let lNama = getLines(k.nama_lengkap||'-', cols[2].w-2, fs);
      let lJab  = getLines(k.jabatan    ||'-', cols[3].w-2, fs);
      let lDept = getLines(k.departemen ||'-', cols[4].w-2, fs);
      const maxLines1 = Math.max(lNama.length, lJab.length, lDept.length);
      if (maxLines1 > 2) {
        fs = 7.5;
        lNama = getLines(k.nama_lengkap||'-', cols[2].w-2, fs);
        lJab  = getLines(k.jabatan    ||'-', cols[3].w-2, fs);
        lDept = getLines(k.departemen ||'-', cols[4].w-2, fs);
      }
      const nLines  = Math.max(lNama.length, lJab.length, lDept.length, 1);
      const lineH   = fs * 0.45;        // jarak antar baris
      const rowH    = Math.max(6.5, nLines * lineH + 3.5);

      // Page break
      if (y + rowH > 270) { doc.addPage(); y=15; _drawHeader(); }

      // Background alternating
      if (i%2===0) {
        doc.setFillColor(240,245,255);
      } else {
        doc.setFillColor(255,255,255);
      }
      doc.rect(mL, y-3, W-mL-mR, rowH, 'F');

      // Garis bawah tipis
      doc.setDrawColor(210,220,240); doc.setLineWidth(0.15);
      doc.line(mL, y-3+rowH, W-mR, y-3+rowH);
      doc.setDrawColor(0,0,0);

      // Posisi vertikal tengah baris
      const midY = y - 3 + rowH/2 + fs*0.35;

      // ── Isi kolom ──────────────────────────────────────
      doc.setFontSize(fs); doc.setTextColor(30,30,30);
      doc.setFont('helvetica','normal');

      // No — center tengah baris
      doc.text(String(i+1), cols[0].x+cols[0].w/2, midY, {align:'center'});

      // NIK — 1 baris, font kecil jika perlu
      const nikLines = getLines(k.nik||'-', cols[1].w-2, fs);
      nikLines.forEach((ln,li) => doc.text(ln, cols[1].x+1, y-3+rowH/2-((nikLines.length-1)*lineH/2)+li*lineH+fs*0.35));

      // Nama — multi baris
      const namaTopY = y - 3 + (rowH - (lNama.length-1)*lineH) / 2 + fs*0.35 - (lNama.length>1?lineH*(lNama.length-1)/2:0);
      lNama.forEach((ln,li) => doc.text(ln, cols[2].x+1, namaTopY + li*lineH));

      // Jabatan — multi baris
      const jabTopY = y - 3 + (rowH - (lJab.length-1)*lineH) / 2 + fs*0.35 - (lJab.length>1?lineH*(lJab.length-1)/2:0);
      lJab.forEach((ln,li) => doc.text(ln, cols[3].x+1, jabTopY + li*lineH));

      // Departemen — multi baris
      const deptTopY = y - 3 + (rowH - (lDept.length-1)*lineH) / 2 + fs*0.35 - (lDept.length>1?lineH*(lDept.length-1)/2:0);
      lDept.forEach((ln,li) => doc.text(ln, cols[4].x+1, deptTopY + li*lineH));

      // Angka — center tengah baris
      doc.text(String(jatah),    cols[5].x+cols[5].w/2, midY, {align:'center'});
      doc.text(String(terpakai), cols[6].x+cols[6].w/2, midY, {align:'center'});
      doc.text(String(sisa),     cols[7].x+cols[7].w/2, midY, {align:'center'});

      // Badge status — proporsional sesuai rowH
      const badgeH  = Math.min(5.5, rowH-2);
      const badgeY  = y - 3 + (rowH - badgeH)/2;
      const badgeW  = cols[8].w - 3;
      doc.setFillColor(...sColor);
      doc.roundedRect(cols[8].x+1.5, badgeY, badgeW, badgeH, 1.5, 1.5, 'F');
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      const bFsz = Math.min(7.5, badgeH*0.55+3.5);
      doc.setFontSize(bFsz);
      doc.text(status, cols[8].x+cols[8].w/2, badgeY+badgeH/2+bFsz*0.18, {align:'center'});
      doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0);

      y += rowH;
    });

    // ── Total row ───────────────────────────────────────────
    doc.setFillColor(30,58,138);
    doc.rect(mL, y-3, W-mL-mR, 7, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
    doc.text('TOTAL: '+_cutiData.length+' karyawan', mL+2, y+1);
    doc.text(String(s.total_hari_terpakai), cols[6].x+cols[6].w/2, y+1, {align:'center'});
    doc.text(String(s.total_hari_sisa),     cols[7].x+cols[7].w/2, y+1, {align:'center'});
    doc.setTextColor(0,0,0); y += 12;

    // ── Tanda tangan (3 kolom: Mengetahui, HRD/Admin, Pimpinan) ──
    if (y + 40 > 275) { doc.addPage(); y = 20; }
    const kota = instansi.alamat_instansi
      ? instansi.alamat_instansi.split(',')[0].replace(/^.*Kab\.?\s*/i,'').trim()
      : '';
    const tglTTD = new Date().toLocaleDateString('id-ID',
      {day:'2-digit',month:'long',year:'numeric'});
    if (kota) {
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      doc.setTextColor(60,60,60);
      doc.text(kota + ', ' + tglTTD, W/2, y, {align:'center'});
      y += 6;
    }
    const TTD = [
      { label:'Mengetahui', nama:'' },
      { label:'HRD / Admin', nama:'' },
      { label:'Pimpinan', nama:'' },
    ];
    const ttdW  = (W - mL - mR - 10) / 3;
    TTD.forEach((t, i) => {
      const tx = mL + i * (ttdW + 5);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      doc.setTextColor(40,40,40);
      doc.text(t.label, tx + ttdW/2, y, {align:'center'});
      // Ruang tanda tangan
      doc.text('', tx + ttdW/2, y+16, {align:'center'});
      // Garis tanda tangan
      doc.setLineWidth(0.4);
      doc.setDrawColor(80,80,80);
      doc.line(tx+4, y+20, tx+ttdW-4, y+20);
      doc.setFont('helvetica','normal'); doc.setFontSize(8);
      doc.setTextColor(80,80,80);
      doc.text('( __________________ )', tx+ttdW/2, y+24, {align:'center'});
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

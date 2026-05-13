// ============================================================
// arsip.js — Halaman Arsip Dokumen
// Surat Izin + Surat Tugas + Surat Peringatan
// Hanya admin & superadmin
// ============================================================

let _arsipData      = [];
let _arsipFiltered  = [];
let _arsipPage      = 1;
const _arsipPerPage = 20;

// ── STATUS LABEL ────────────────────────────────────────────
function _arsipStatusBadge(status, kode) {
  if (kode === 'SP') {
    return status === 'aktif'
      ? '<span style="background:#FEF2F2;color:#DC2626;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">🔴 Aktif</span>'
      : '<span style="background:#F1F5F9;color:#64748B;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">✓ Kadaluarsa</span>';
  }
  const map = {
    menunggu_karyawan : ['#FEF3C7','#92400E','⏳ Menunggu Karyawan'],
    menunggu_atasan   : ['#EDE9FE','#5B21B6','⏳ Menunggu Atasan'],
    menunggu_pimpinan : ['#DBEAFE','#1E40AF','⏳ Menunggu Pimpinan'],
    menunggu_admin    : ['#CFFAFE','#0E7490','✅ Siap Disetujui'],
    selesai           : ['#DCFCE7','#15803D','✅ Selesai'],
  };
  const v = map[status];
  if (!v) return `<span style="background:#F1F5F9;color:#64748B;padding:2px 8px;border-radius:12px;font-size:11px">${status}</span>`;
  return `<span style="background:${v[0]};color:${v[1]};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">${v[2]}</span>`;
}

function _arsipJenisBadge(kode) {
  const map = {
    SI: ['#F0FDF4','#15803D','📝 Surat Izin'],
    ST: ['#FFF7ED','#C2410C','📋 Surat Tugas'],
    SP: ['#FEF2F2','#DC2626','⚠️ Surat Peringatan'],
  };
  const v = map[kode] || ['#F1F5F9','#475569',kode];
  return `<span style="background:${v[0]};color:${v[1]};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap">${v[2]}</span>`;
}

// ── LOAD HALAMAN ARSIP ───────────────────────────────────────
async function loadArsipDokumen() {
  const c = document.getElementById('admin-content');
  if (!c) return;

  // Kumpulkan tahun untuk filter (5 tahun terakhir)
  const tahunNow = new Date().getFullYear();
  const tahunOpts = Array.from({length:5},(_,i)=>tahunNow-i)
    .map(y=>`<option value="${y}">${y}</option>`).join('');

  c.innerHTML = `
  <div style="padding:0 0 80px">
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div>
        <h2 style="font-size:20px;font-weight:700;color:#0F172A;margin:0">
          🗂️ Arsip Dokumen</h2>
        <p style="font-size:13px;color:#64748B;margin:4px 0 0">
          Surat Izin · Surat Tugas · Surat Peringatan</p>
      </div>
      <button onclick="_arsipExportExcel()"
        style="background:#15803D;color:#fff;border:none;border-radius:8px;
        padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer">
        📊 Export Excel
      </button>
    </div>

    <!-- Filter -->
    <div style="background:#fff;border-radius:12px;border:1px solid #E2E8F0;
      padding:14px 16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:4px">JENIS DOKUMEN</label>
          <select id="flt-arsip-jenis" onchange="_arsipApplyFilter()"
            style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px">
            <option value="">Semua Jenis</option>
            <option value="SI">📝 Surat Izin</option>
            <option value="ST">📋 Surat Tugas</option>
            <option value="SP">⚠️ Surat Peringatan</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:4px">BULAN</label>
          <select id="flt-arsip-bulan" onchange="_arsipApplyFilter()"
            style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px">
            <option value="">Semua Bulan</option>
            ${['Januari','Februari','Maret','April','Mei','Juni',
               'Juli','Agustus','September','Oktober','November','Desember']
               .map((b,i)=>`<option value="${String(i+1).padStart(2,'0')}">${b}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:4px">TAHUN</label>
          <select id="flt-arsip-tahun" onchange="_arsipApplyFilter()"
            style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px">
            <option value="">Semua Tahun</option>
            ${tahunOpts}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:4px">STATUS</label>
          <select id="flt-arsip-status" onchange="_arsipApplyFilter()"
            style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px">
            <option value="">Semua Status</option>
            <option value="selesai">✅ Selesai</option>
            <option value="menunggu_admin">Siap Disetujui</option>
            <option value="menunggu_karyawan">Menunggu Karyawan</option>
            <option value="aktif">SP Aktif</option>
            <option value="kadaluarsa">SP Kadaluarsa</option>
          </select>
        </div>
        <div style="grid-column:span 2">
          <label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:4px">CARI NAMA</label>
          <input id="flt-arsip-nama" type="text" placeholder="Ketik nama karyawan..."
            oninput="_arsipApplyFilter()"
            style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:8px;
            font-size:13px;box-sizing:border-box">
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div id="arsip-stats" style="display:grid;grid-template-columns:repeat(4,1fr);
      gap:10px;margin-bottom:16px"></div>

    <!-- Tabel -->
    <div style="background:#fff;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden">
      <div id="arsip-table-wrap" style="overflow-x:auto">
        <div style="text-align:center;padding:60px;color:#94A3B8">
          <div style="font-size:32px;margin-bottom:12px">🗂️</div>
          <div>Memuat arsip dokumen...</div>
        </div>
      </div>
      <div id="arsip-pagination" style="padding:12px 16px;border-top:1px solid #F1F5F9;
        display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      </div>
    </div>
  </div>`;

  // Load data
  try {
    showToast('Memuat arsip...', 'info', 2000);
    _arsipData = await callAPI('getArsipDokumen', {});
    _arsipFiltered = [..._arsipData];
    _arsipPage = 1;
    _arsipRenderStats();
    _arsipRenderTable();
  } catch(e) {
    document.getElementById('arsip-table-wrap').innerHTML =
      `<div style="padding:40px;text-align:center;color:#E53E3E">Gagal memuat: ${e.message}</div>`;
  }
}

// ── FILTER ───────────────────────────────────────────────────
function _arsipApplyFilter() {
  const jenis  = document.getElementById('flt-arsip-jenis')?.value  || '';
  const bulan  = document.getElementById('flt-arsip-bulan')?.value  || '';
  const tahun  = document.getElementById('flt-arsip-tahun')?.value  || '';
  const status = document.getElementById('flt-arsip-status')?.value || '';
  const nama   = (document.getElementById('flt-arsip-nama')?.value  || '').toLowerCase().trim();

  _arsipFiltered = _arsipData.filter(d => {
    if (jenis  && d.kode_jenis !== jenis)  return false;
    if (status && d.status !== status)     return false;
    if (nama   && !d.nama_karyawan.toLowerCase().includes(nama)) return false;

    // Filter bulan/tahun dari tanggal_mulai (format dd/MM/yyyy)
    if (bulan || tahun) {
      const parts = String(d.tanggal_mulai || '').split('/');
      if (parts.length >= 3) {
        if (bulan && parts[1] !== bulan) return false;
        if (tahun && parts[2] !== tahun) return false;
      }
    }
    return true;
  });

  _arsipPage = 1;
  _arsipRenderStats();
  _arsipRenderTable();
}

// ── STATS ────────────────────────────────────────────────────
function _arsipRenderStats() {
  const el = document.getElementById('arsip-stats');
  if (!el) return;
  const total = _arsipFiltered.length;
  const si = _arsipFiltered.filter(d=>d.kode_jenis==='SI').length;
  const st = _arsipFiltered.filter(d=>d.kode_jenis==='ST').length;
  const sp = _arsipFiltered.filter(d=>d.kode_jenis==='SP').length;

  const card = (icon, label, val, color) =>
    `<div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;
      padding:12px 14px;border-left:3px solid ${color}">
      <div style="font-size:20px;font-weight:700;color:${color}">${val}</div>
      <div style="font-size:12px;color:#64748B;margin-top:2px">${icon} ${label}</div>
    </div>`;

  el.innerHTML =
    card('📄','Total Dokumen', total, '#2D6CDF') +
    card('📝','Surat Izin',    si,    '#15803D') +
    card('📋','Surat Tugas',   st,    '#C2410C') +
    card('⚠️','Surat Peringatan', sp, '#DC2626');
}

// ── TABEL ────────────────────────────────────────────────────
function _arsipRenderTable() {
  const wrap = document.getElementById('arsip-table-wrap');
  const pagi = document.getElementById('arsip-pagination');
  if (!wrap) return;

  if (!_arsipFiltered.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:60px;color:#94A3B8">
      <div style="font-size:32px;margin-bottom:12px">📭</div>
      <div>Tidak ada dokumen ditemukan</div>
    </div>`;
    if (pagi) pagi.innerHTML = '';
    return;
  }

  const start = (_arsipPage - 1) * _arsipPerPage;
  const page  = _arsipFiltered.slice(start, start + _arsipPerPage);
  const total = _arsipFiltered.length;
  const pages = Math.ceil(total / _arsipPerPage);

  const rows = page.map((d, i) => `
    <tr style="border-bottom:1px solid #F1F5F9;${i%2===0?'background:#FAFAFA':''}">
      <td style="padding:10px 12px;font-size:12px;color:#64748B;white-space:nowrap">
        ${start+i+1}</td>
      <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#0F172A;white-space:nowrap">
        ${d.no_dokumen}</td>
      <td style="padding:10px 12px">${_arsipJenisBadge(d.kode_jenis)}</td>
      <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#0F172A">
        ${d.nama_karyawan}<br>
        <span style="font-size:11px;font-weight:400;color:#64748B">${d.jabatan}</span></td>
      <td style="padding:10px 12px;font-size:12px;color:#334155;max-width:200px">
        ${d.perihal}</td>
      <td style="padding:10px 12px;font-size:12px;color:#475569;white-space:nowrap">
        ${d.tanggal_mulai}<br>
        <span style="color:#94A3B8">s/d ${d.tanggal_selesai}</span></td>
      <td style="padding:10px 12px">${_arsipStatusBadge(d.status, d.kode_jenis)}</td>
      <td style="padding:10px 12px;white-space:nowrap">
        ${d.kode_jenis === 'SI' ? `
        <button onclick="_lihatSuratIzin('${d.id_dokumen}')"
          style="background:#15803D;color:#fff;border:none;border-radius:6px;
          padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer">
          👁 Lihat</button>` :
        d.kode_jenis === 'ST' ? `
        <button onclick="_lihatSuratTugas('${d.id_dokumen}')"
          style="background:#C2410C;color:#fff;border:none;border-radius:6px;
          padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer">
          👁 Lihat</button>` :
        `<button onclick="_arsipLihatSP('${d.id_dokumen}')"
          style="background:#DC2626;color:#fff;border:none;border-radius:6px;
          padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer">
          👁 Lihat</button>`}
      </td>
    </tr>`).join('');

  wrap.innerHTML = `
    <table style="width:100%;border-collapse:collapse;min-width:800px">
      <thead>
        <tr style="background:#F8FAFC;border-bottom:2px solid #E2E8F0">
          <th style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:left;white-space:nowrap">#</th>
          <th style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:left;white-space:nowrap">No. Dokumen</th>
          <th style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:left">Jenis</th>
          <th style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:left">Karyawan</th>
          <th style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:left">Perihal</th>
          <th style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:left;white-space:nowrap">Periode</th>
          <th style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:left">Status</th>
          <th style="padding:10px 12px;font-size:11px;color:#64748B;font-weight:600;text-align:left">Aksi</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  // Pagination
  if (pagi) {
    const btnStyle = (active) =>
      `padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #E2E8F0;
       background:${active?'#2D6CDF':'#fff'};color:${active?'#fff':'#334155'}`;

    let pageHtml = `<div style="font-size:12px;color:#64748B">
      Menampilkan ${start+1}–${Math.min(start+_arsipPerPage,total)} dari ${total} dokumen
    </div><div style="display:flex;gap:6px;flex-wrap:wrap">`;

    if (_arsipPage > 1) pageHtml += `<button style="${btnStyle(false)}" onclick="_arsipGoPage(${_arsipPage-1})">‹ Prev</button>`;

    // Tampilkan max 5 halaman
    const ps = Math.max(1, _arsipPage-2);
    const pe = Math.min(pages, ps+4);
    for (let p = ps; p <= pe; p++) {
      pageHtml += `<button style="${btnStyle(p===_arsipPage)}" onclick="_arsipGoPage(${p})">${p}</button>`;
    }

    if (_arsipPage < pages) pageHtml += `<button style="${btnStyle(false)}" onclick="_arsipGoPage(${_arsipPage+1})">Next ›</button>`;
    pageHtml += '</div>';
    pagi.innerHTML = pageHtml;
  }
}

function _arsipGoPage(p) {
  _arsipPage = p;
  _arsipRenderTable();
  document.getElementById('admin-content')?.scrollTo({top:0, behavior:'smooth'});
  window.scrollTo({top:0, behavior:'smooth'});
}

// ── LIHAT SP (modal sederhana) ───────────────────────────────
async function _arsipLihatSP(idSP) {
  const sp = _arsipData.find(d => d.id_dokumen === idSP && d.kode_jenis === 'SP');
  if (!sp) { showToast('Data SP tidak ditemukan', 'error'); return; }

  document.getElementById('modal-arsip-sp')?.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-arsip-sp';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9500;' +
    'display:flex;align-items:center;justify-content:center;padding:16px';

  const [jenisSP, alasan] = sp.perihal.split(' — ');
  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:0;width:100%;max-width:420px;overflow:hidden">
    <div style="background:#DC2626;padding:16px 20px;display:flex;align-items:center;
      justify-content:space-between">
      <div style="color:#fff">
        <div style="font-size:11px;opacity:.7">Surat Peringatan</div>
        <div style="font-size:16px;font-weight:700">${jenisSP || 'SP'}</div>
      </div>
      <button onclick="document.getElementById('modal-arsip-sp').remove()"
        style="background:rgba(255,255,255,.2);border:none;border-radius:50%;
        width:30px;height:30px;color:#fff;font-size:16px;cursor:pointer">✕</button>
    </div>
    <div style="padding:20px;font-size:13px">
      <div style="background:#FEF2F2;border-radius:8px;padding:12px;margin-bottom:14px">
        <div><span style="color:#64748B;width:120px;display:inline-block">Nama</span>: <strong>${sp.nama_karyawan}</strong></div>
        <div><span style="color:#64748B;width:120px;display:inline-block">Jenis SP</span>: <strong>${jenisSP}</strong></div>
        <div><span style="color:#64748B;width:120px;display:inline-block">Alasan</span>: ${alasan || '-'}</div>
        <div><span style="color:#64748B;width:120px;display:inline-block">Tanggal SP</span>: ${sp.tanggal_mulai}</div>
        <div><span style="color:#64748B;width:120px;display:inline-block">Kadaluarsa</span>: ${sp.tanggal_selesai}</div>
        <div><span style="color:#64748B;width:120px;display:inline-block">Status</span>:
          ${sp.status === 'aktif'
            ? '<span style="color:#DC2626;font-weight:700">🔴 Masih Aktif</span>'
            : '<span style="color:#64748B">✓ Sudah Kadaluarsa</span>'}</div>
      </div>
      <button onclick="_arsipCetakSP('${idSP}')"
        style="width:100%;padding:10px;background:#DC2626;color:#fff;border:none;
        border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
        🖨 Cetak PDF Surat Peringatan
      </button>
    </div>
  </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function _arsipCetakSP(idSP) {
  if (typeof cetakSPPDF === 'function') {
    cetakSPPDF(idSP);
  } else {
    showToast('Fungsi cetak SP tidak tersedia', 'warning');
  }
}

// ── EXPORT EXCEL PROFESIONAL (server-side, format identik Rekap DL) ─
async function _arsipExportExcel() {
  if (!_arsipFiltered.length) { showToast('Tidak ada data untuk diexport', 'warning'); return; }
  showToast('Menyiapkan Excel profesional...', 'info', 3000);
  try {
    const res = await callAPI('exportArsipDokumen', { data: _arsipFiltered });
    if (!res || !res.base64) throw new Error('Tidak ada data dari server');

    const byteStr = atob(res.base64);
    const ab      = new ArrayBuffer(byteStr.length);
    const ia      = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
    const blob = new Blob([ab], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const now  = new Date();
    const tgl  = now.getFullYear() +
      String(now.getMonth()+1).padStart(2,'0') +
      String(now.getDate()).padStart(2,'0');
    a.href     = url;
    a.download = `Arsip_Dokumen_${tgl}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Excel berhasil didownload!', 'success', 4000);
  } catch(e) {
    showToast('Gagal export: ' + e.message, 'error');
  }
}

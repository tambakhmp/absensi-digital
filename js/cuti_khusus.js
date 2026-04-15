// ============================================================
// cuti_khusus.js — Sistem Cuti 6 Bulanan + Tunjangan Tiket
// Menu tersendiri: Cuti Khusus (admin/superadmin)
// ============================================================

// ─── RENDER HALAMAN UTAMA ────────────────────────────────────
async function renderCutiKhususAdmin(container) {
  container.innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">🎫 Cuti 6 Bulanan & Tunjangan Tiket</h2>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn--primary" onclick="loadTabCutiKhusus('karyawan')">👥 Karyawan Terdaftar</button>
      <button class="btn btn--ghost"   onclick="loadTabCutiKhusus('rekap')">📋 Rekap Tunjangan</button>
    </div>
    <div id="cuti-khusus-content">${skeletonCard(3)}</div>`;
  await loadTabCutiKhusus('karyawan');
}

async function loadTabCutiKhusus(tab) {
  // Update tombol aktif
  document.querySelectorAll('.btn--primary[onclick*="loadTabCutiKhusus"]').forEach(b => b.className='btn btn--ghost');
  document.querySelectorAll('.btn--ghost[onclick*="loadTabCutiKhusus"]').forEach(b => b.className='btn btn--ghost');
  const activeBtn = document.querySelector(`[onclick="loadTabCutiKhusus('${tab}')"]`);
  if (activeBtn) activeBtn.className = 'btn btn--primary';

  if (tab === 'karyawan') await _renderDaftarKaryawanCutiKhusus();
  else await _renderRekapTunjangan();
}

// ─── TAB 1: DAFTAR KARYAWAN ──────────────────────────────────
async function _renderDaftarKaryawanCutiKhusus() {
  const el = document.getElementById('cuti-khusus-content');
  el.innerHTML = skeletonCard(3);
  try {
    const data = await callAPI('getCutiKhususSemua', {});
    el.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn--primary" onclick="tampilFormTambahCutiKhusus()">
          + Tambah Karyawan</button>
      </div>
      ${!data || !data.length
        ? `<div style="text-align:center;padding:40px;color:#94A3B8">
            Belum ada karyawan terdaftar sistem cuti 6 bulanan</div>`
        : `<div class="card" style="padding:0;overflow-x:auto">
          <table class="simple-table">
            <thead><tr>
              <th>Karyawan</th><th>Jabatan</th>
              <th>Nominal Tunjangan</th><th>Status</th><th style="text-align:center">Aksi</th>
            </tr></thead>
            <tbody>
              ${data.map(k => `<tr>
                <td style="font-weight:600">${k.nama}</td>
                <td style="font-size:12px;color:#64748B">${k.jabatan||'-'}</td>
                <td style="font-weight:700;color:#1A9E74">${formatRupiah(k.nominal_tunjangan||0)}</td>
                <td><span style="background:${k.aktif?'#EBF8EE':'#F1F5F9'};color:${k.aktif?'#1A9E74':'#94A3B8'};
                  padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600">
                  ${k.aktif?'✅ Aktif':'⏹ Nonaktif'}</span></td>
                <td style="text-align:center">
                  <button class="btn btn--ghost" style="font-size:12px;padding:5px 10px"
                    onclick="tampilFormEditCutiKhusus(${JSON.stringify(k).replace(/"/g,'&quot;')})">✏️ Edit</button>
                  <button class="btn btn--danger" style="font-size:12px;padding:5px 10px"
                    onclick="hapusCutiKhususItem('${k.id}','${k.nama}')">🗑️</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}`;
  } catch(e) { el.innerHTML = `<div style="color:#E53E3E;padding:20px">Error: ${e.message}</div>`; }
}

// ─── FORM TAMBAH/EDIT ────────────────────────────────────────
async function tampilFormTambahCutiKhusus() {
  const kList = await callAPI('getKaryawanAktif', {});
  _tampilFormCutiKhusus(null, kList);
}

function tampilFormEditCutiKhusus(data) {
  _tampilFormCutiKhusus(data, null);
}

async function _tampilFormCutiKhusus(data, kList) {
  if (!kList) kList = await callAPI('getKaryawanAktif', {});
  const isEdit = !!data;
  const modal = document.createElement('div');
  modal.id = 'modal-cuti-khusus';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:460px;animation:fadeInScale .2s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:17px">🎫 ${isEdit?'Edit':'Tambah'} Karyawan Cuti 6 Bulanan</h3>
        <button onclick="document.getElementById('modal-cuti-khusus').remove()"
          style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
      </div>
      ${!isEdit ? `
      <div class="form-group">
        <label class="form-label">Pilih Karyawan *</label>
        <select class="form-control" id="ck-karyawan">
          <option value="">-- Pilih Karyawan --</option>
          ${(kList||[]).map(k=>`<option value="${k.id_karyawan}">${k.nama_lengkap} — ${k.jabatan||''}</option>`).join('')}
        </select>
      </div>` : `
      <div class="form-group">
        <label class="form-label">Karyawan</label>
        <input class="form-control" value="${data.nama}" disabled style="background:#F8FAFC">
      </div>`}
      <div class="form-group">
        <label class="form-label">Nominal Tunjangan Tiket (Rp) *</label>
        <input type="number" class="form-control" id="ck-nominal"
          value="${isEdit?(data.nominal_tunjangan||0):''}" placeholder="Contoh: 500000" min="0" step="50000">
        <p class="form-hint">Nominal tunjangan yang akan diterima saat cuti 6 bulanan disetujui</p>
      </div>
      <div class="form-group">
        <label class="form-label">Keterangan</label>
        <input type="text" class="form-control" id="ck-keterangan"
          value="${isEdit?(data.keterangan||''):''}" placeholder="Opsional">
      </div>
      ${isEdit ? `
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="ck-aktif">
          <option value="true" ${data.aktif?'selected':''}>✅ Aktif</option>
          <option value="false" ${!data.aktif?'selected':''}>⏹ Nonaktif</option>
        </select>
      </div>` : ''}
      <button class="btn btn--primary btn--full btn--lg" onclick="_submitCutiKhusus('${isEdit?data.id_karyawan:''}','${isEdit?data.id:''}')">
        <div class="spinner-btn"></div>
        <span class="btn-text">💾 ${isEdit?'Simpan Perubahan':'Tambahkan'}</span>
      </button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}

async function _submitCutiKhusus(idKaryawanEdit, idEdit) {
  const btn = document.querySelector('#modal-cuti-khusus .btn--primary');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  try {
    const idK     = idKaryawanEdit || document.getElementById('ck-karyawan')?.value;
    const nominal = parseFloat(document.getElementById('ck-nominal')?.value||'0');
    const ket     = document.getElementById('ck-keterangan')?.value||'';
    const aktif   = document.getElementById('ck-aktif')?.value !== 'false';
    if (!idK) throw new Error('Pilih karyawan terlebih dahulu');
    if (!nominal || nominal <= 0) throw new Error('Isi nominal tunjangan');
    await callAPI('setCutiKhusus', { id_karyawan:idK, nominal_tunjangan:nominal, keterangan:ket, aktif });
    document.getElementById('modal-cuti-khusus')?.remove();
    showToast('Berhasil disimpan ✅','success');
    await _renderDaftarKaryawanCutiKhusus();
  } catch(e) {
    showToast(e.message,'error');
  } finally {
    if(btn){btn.disabled=false;btn.classList.remove('loading');}
  }
}

async function hapusCutiKhususItem(id, nama) {
  showModal('🗑️ Hapus dari Cuti 6 Bulanan?',
    `<strong>${nama}</strong> tidak akan lagi mendapat tunjangan tiket.`,
    async () => {
      await callAPI('hapusCutiKhusus', { id });
      showToast('Berhasil dihapus','success');
      await _renderDaftarKaryawanCutiKhusus();
    }, '🗑️ Hapus');
}

// ─── TAB 2: REKAP TUNJANGAN ──────────────────────────────────
async function _renderRekapTunjangan(filter) {
  const el = document.getElementById('cuti-khusus-content');
  el.innerHTML = skeletonCard(3);
  try {
    const now     = new Date();
    const thn     = now.getFullYear();
    const bln     = now.getMonth()+1;
    const periode = thn + (bln<=6?'-H1':'-H2');

    const data = await callAPI('getRekapTunjanganCuti', filter || {});
    const total   = (data||[]).reduce((s,t)=>s+parseFloat(t.nominal_tunjangan||0),0);
    const sudah   = (data||[]).filter(t=>t.status_bayar==='sudah').reduce((s,t)=>s+parseFloat(t.nominal_tunjangan||0),0);
    const belum   = total - sudah;

    el.innerHTML = `
      <!-- Filter -->
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="margin:0;flex:1;min-width:120px">
            <label class="form-label">Periode</label>
            <select class="form-control" id="rek-periode">
              <option value="">Semua</option>
              ${[thn+'-H1',thn+'-H2',(thn-1)+'-H1',(thn-1)+'-H2'].map(p=>
                `<option value="${p}" ${p===periode?'selected':''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0;flex:1;min-width:120px">
            <label class="form-label">Status Bayar</label>
            <select class="form-control" id="rek-status">
              <option value="">Semua</option>
              <option value="belum">⏳ Belum Dibayar</option>
              <option value="sudah">✅ Sudah Dibayar</option>
            </select>
          </div>
          <button class="btn btn--secondary" style="padding:10px 16px"
            onclick="_filterRekap()">🔍 Filter</button>
          <button class="btn btn--ghost" style="padding:10px 16px"
            onclick="_exportRekapTunjangan()">📊 Export</button>
        </div>
      </div>

      <!-- Ringkasan -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        ${_cardRekap('💰','Total Tunjangan',formatRupiah(total),'#2D6CDF')}
        ${_cardRekap('✅','Sudah Dibayar',formatRupiah(sudah),'#1A9E74')}
        ${_cardRekap('⏳','Belum Dibayar',formatRupiah(belum),'#D97706')}
      </div>

      <!-- Tabel -->
      ${!data||!data.length
        ? `<div style="text-align:center;padding:40px;color:#94A3B8">Tidak ada data</div>`
        : `<div class="card" style="padding:0;overflow-x:auto">
          <table class="simple-table">
            <thead><tr>
              <th>Karyawan</th><th>Periode</th><th>Tgl Cuti</th>
              <th>Hari</th><th>Nominal</th><th>Status</th><th style="text-align:center">Aksi</th>
            </tr></thead>
            <tbody>
              ${data.map(t=>`<tr>
                <td style="font-weight:600">${t.nama}<br>
                  <span style="font-size:11px;color:#94A3B8">${t.jabatan||''}</span></td>
                <td style="font-size:12px">${t.periode}</td>
                <td style="font-size:12px">${formatTanggal(t.tanggal_mulai)} – ${formatTanggal(t.tanggal_selesai)}</td>
                <td style="text-align:center;font-weight:600">${t.total_hari}</td>
                <td style="font-weight:700;color:#1A9E74">${formatRupiah(t.nominal_tunjangan||0)}</td>
                <td>
                  ${t.status_bayar==='sudah'
                    ? `<span style="background:#EBF8EE;color:#1A9E74;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700">
                        ✅ Sudah<br><span style="font-size:10px;font-weight:400">${formatTanggal(t.tanggal_bayar)||''}</span></span>`
                    : `<span style="background:#FFFAF0;color:#D97706;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700">
                        ⏳ Belum</span>`}
                </td>
                <td style="text-align:center">
                  ${t.status_bayar!=='sudah'
                    ? `<button class="btn btn--primary" style="font-size:11px;padding:4px 10px"
                        onclick="tandaiSudahBayar('${t.id}','${t.nama}',${t.nominal_tunjangan||0})">
                        ✅ Tandai Bayar</button>`
                    : `<button class="btn btn--ghost" style="font-size:11px;padding:4px 10px"
                        onclick="batalkanBayar('${t.id}','${t.nama}')">
                        ↩️ Batalkan</button>`}
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}`;

  } catch(e) { el.innerHTML = `<div style="color:#E53E3E;padding:20px">Error: ${e.message}</div>`; }
}

function _cardRekap(icon, label, val, color) {
  return `<div style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:14px;text-align:center">
    <div style="font-size:20px">${icon}</div>
    <div style="font-size:15px;font-weight:700;color:${color};margin:4px 0">${val}</div>
    <div style="font-size:11px;color:#94A3B8">${label}</div>
  </div>`;
}

async function _filterRekap() {
  const periode = document.getElementById('rek-periode')?.value;
  const status  = document.getElementById('rek-status')?.value;
  await _renderRekapTunjangan({
    periode: periode||undefined,
    status_bayar: status||undefined
  });
}

async function tandaiSudahBayar(id, nama, nominal) {
  showModal('✅ Tandai Sudah Dibayar?',
    `Tunjangan tiket <strong>${nama}</strong> sebesar <strong>${formatRupiah(nominal)}</strong> sudah dibayarkan?`,
    async () => {
      await callAPI('updateStatusTunjangan', { id, status_bayar:'sudah' });
      showToast('Ditandai sudah dibayar ✅','success');
      await _renderRekapTunjangan();
    }, '✅ Konfirmasi');
}

async function batalkanBayar(id, nama) {
  showModal('↩️ Batalkan Status Bayar?',
    `Status pembayaran tunjangan <strong>${nama}</strong> akan dikembalikan ke "Belum Dibayar".`,
    async () => {
      await callAPI('updateStatusTunjangan', { id, status_bayar:'belum' });
      showToast('Status dikembalikan ke belum dibayar','success');
      await _renderRekapTunjangan();
    }, '↩️ Batalkan');
}

async function _exportRekapTunjangan() {
  showToast('Menyiapkan export...','info',2000);
  try {
    const data = await callAPI('getRekapTunjanganCuti', {});
    if (!data || !data.length) { showToast('Tidak ada data','warning'); return; }
    await exportRekapTunjanganExcel(data);
  } catch(e) { showToast('Gagal export: '+e.message,'error'); }
}

async function exportRekapTunjanganExcel(data) {
  const now  = new Date();
  const thn  = now.getFullYear();
  const tgl  = now.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  const namaInstansi = (await callAPI('getSetting',{key:'nama_instansi'}).catch(()=>null))
                    || document.querySelector('.sidebar__brand-name')?.textContent?.trim()
                    || 'Instansi';
  const alamat = (await callAPI('getSetting',{key:'alamat_instansi'}).catch(()=>null)) || '';

  const totalNominal = data.reduce((s,t)=>s+parseInt(t.nominal_tunjangan||0),0);
  const totalSudah   = data.filter(t=>t.status_bayar==='sudah').reduce((s,t)=>s+parseInt(t.nominal_tunjangan||0),0);
  const totalBelum   = totalNominal - totalSudah;

  const fmtRp = n => 'Rp ' + parseInt(n||0).toLocaleString('id-ID');

  const rows = data.map((t,i) => `
    <tr style="background:${i%2===0?'#FFFFFF':'#F8FAFC'}">
      <td style="text-align:center;font-weight:600">${i+1}</td>
      <td style="font-weight:600">${t.nama}</td>
      <td>${t.jabatan||'-'}</td>
      <td>${t.departemen||'-'}</td>
      <td style="text-align:center">${t.periode}</td>
      <td style="text-align:center">${t.tanggal_mulai}</td>
      <td style="text-align:center">${t.tanggal_selesai}</td>
      <td style="text-align:center;font-weight:600">${t.total_hari}</td>
      <td style="text-align:right;font-weight:600;color:#1E3A5F">${fmtRp(t.nominal_tunjangan)}</td>
      <td style="text-align:center;font-weight:700;color:${t.status_bayar==='sudah'?'#1A9E74':'#D97706'};
        background:${t.status_bayar==='sudah'?'#EBF8EE':'#FFFAF0'}">
        ${t.status_bayar==='sudah'?'✓ Sudah Dibayar':'⏳ Belum Dibayar'}
      </td>
      <td style="text-align:center">${t.tanggal_bayar||'-'}</td>
    </tr>`).join('');

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #D1D5DB; padding: 6px 10px; vertical-align: middle; }
  .hd1 { background:#1E3A5F; color:#FFFFFF; font-size:14pt; font-weight:bold; text-align:center; border:none; }
  .hd2 { background:#2D6CDF; color:#FFFFFF; font-size:11pt; font-weight:bold; text-align:center; border:none; }
  .hd3 { background:#34495E; color:#CBD5E0; font-size:9pt; text-align:center; border:none; }
  .col-header { background:#1A9E74; color:#FFFFFF; font-weight:bold; text-align:center; font-size:9pt; }
  .total-row { background:#EFF6FF; font-weight:bold; }
  .summary-box { background:#F0F9FF; border:2px solid #2D6CDF; padding:8px; margin-bottom:12px; }
</style>
</head>
<body>
<table>
  <!-- KOP SURAT -->
  <tr><td colspan="11" class="hd1">${namaInstansi}</td></tr>
  ${alamat ? `<tr><td colspan="11" class="hd3">${alamat}</td></tr>` : ''}
  <tr><td colspan="11" class="hd2">REKAP TUNJANGAN CUTI 6 BULANAN</td></tr>
  <tr><td colspan="11" class="hd3">Tahun ${thn} &nbsp;|&nbsp; Dicetak: ${tgl}</td></tr>
  <tr><td colspan="11" style="border:none;padding:4px"></td></tr>

  <!-- RINGKASAN -->
  <tr>
    <td colspan="3" style="background:#EFF6FF;font-weight:bold;color:#2D6CDF;font-size:10pt">
      💰 Total Tunjangan: ${fmtRp(totalNominal)}
    </td>
    <td colspan="4" style="background:#EBF8EE;font-weight:bold;color:#1A9E74;font-size:10pt">
      ✓ Sudah Dibayar: ${fmtRp(totalSudah)}
    </td>
    <td colspan="4" style="background:#FFFAF0;font-weight:bold;color:#D97706;font-size:10pt">
      ⏳ Belum Dibayar: ${fmtRp(totalBelum)}
    </td>
  </tr>
  <tr><td colspan="11" style="border:none;padding:4px"></td></tr>

  <!-- HEADER KOLOM -->
  <tr>
    <th class="col-header" style="width:40px">No</th>
    <th class="col-header" style="width:160px">Nama Karyawan</th>
    <th class="col-header" style="width:120px">Jabatan</th>
    <th class="col-header" style="width:120px">Departemen</th>
    <th class="col-header" style="width:80px">Periode</th>
    <th class="col-header" style="width:100px">Tgl Mulai</th>
    <th class="col-header" style="width:100px">Tgl Selesai</th>
    <th class="col-header" style="width:80px">Total Hari</th>
    <th class="col-header" style="width:160px">Nominal Tunjangan</th>
    <th class="col-header" style="width:140px">Status Bayar</th>
    <th class="col-header" style="width:100px">Tgl Bayar</th>
  </tr>

  <!-- DATA -->
  ${rows}

  <!-- TOTAL -->
  <tr class="total-row">
    <td colspan="8" style="text-align:right;color:#1E3A5F;border-top:2px solid #2D6CDF">TOTAL KESELURUHAN:</td>
    <td style="text-align:right;color:#1E3A5F;font-size:11pt;border-top:2px solid #2D6CDF">${fmtRp(totalNominal)}</td>
    <td colspan="2" style="border-top:2px solid #2D6CDF"></td>
  </tr>

  <!-- TTD -->
  <tr><td colspan="11" style="border:none;padding:16px"></td></tr>
  <tr>
    <td colspan="4" style="border:none;text-align:center">
      <div style="margin-bottom:40px">Mengetahui,</div>
      <div>(_____________________)</div>
      <div style="margin-top:4px;font-weight:bold">Pimpinan</div>
    </td>
    <td colspan="3" style="border:none"></td>
    <td colspan="4" style="border:none;text-align:center">
      <div style="margin-bottom:4px">Dibuat di: ............., ${tgl}</div>
      <div style="margin-bottom:40px">Bagian Keuangan/HRD,</div>
      <div>(_____________________)</div>
      <div style="margin-top:4px;font-weight:bold">Admin</div>
    </td>
  </tr>
</table>
</body></html>`;

  // Download sebagai .xls (Excel bisa buka HTML)
  const blob = new Blob([html], {type:'application/vnd.ms-excel;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'Rekap_Tunjangan_Cuti_'+thn+'.xls';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export berhasil! 📊','success');
}

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
      <button class="btn btn--ghost"   onclick="loadTabCutiKhusus('status')">📊 Status Cuti</button>
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
  else if (tab === 'status') await _renderStatusCutiKhusus();
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
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn--ghost" style="padding:10px 12px;font-size:12px"
              onclick="_exportRekapTunjangan('semua')">📊 Export Semua</button>
            <button class="btn btn--ghost" style="padding:10px 12px;font-size:12px;color:#D97706;border-color:#D97706"
              onclick="_exportRekapTunjangan('belum')">⏳ Belum Bayar</button>
            <button class="btn btn--ghost" style="padding:10px 12px;font-size:12px;color:#1A9E74;border-color:#1A9E74"
              onclick="_exportRekapTunjangan('sudah')">✅ Sudah Bayar</button>
          </div>
        </div>
      </div>

      <!-- Ringkasan -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        ${_cardRekap('💰','Total Tunjangan',formatRupiah(total)+' <span style="font-size:10px;color:#94A3B8">('+( data||[]).length+' data)</span>','#2D6CDF')}
        ${_cardRekap('✅','Sudah Dibayar',formatRupiah(sudah)+' <span style="font-size:10px;color:#94A3B8">('+((data||[]).filter(t=>t.status_bayar==='sudah').length)+' data)</span>','#1A9E74')}
        ${_cardRekap('⏳','Beban Utang',formatRupiah(belum)+' <span style="font-size:10px;color:#D97706">('+((data||[]).filter(t=>t.status_bayar!=='sudah').length)+' data)</span>','#D97706')}
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

async function _exportRekapTunjangan(mode) {
  mode = mode || 'semua';
  showToast('Menyiapkan export...','info',2000);
  try {
    // Ambil data sesuai filter status
    const filter = mode === 'semua' ? {} : { status_bayar: mode };
    const data = await callAPI('getRekapTunjanganCuti', filter);
    if (!data || !data.length) { showToast('Tidak ada data','warning'); return; }
    await exportRekapTunjanganExcel(data, mode);
  } catch(e) { showToast('Gagal export: '+e.message,'error'); }
}

async function exportRekapTunjanganExcel(data, mode) {
  if (!window.XLSX) { showToast('Library Excel belum siap','error'); return; }

  const _toRows = (list) => list.map((t,i) => ({
    'No'            : i+1,
    'Nama Karyawan' : t.nama,
    'Jabatan'       : t.jabatan||'-',
    'Departemen'    : t.departemen||'-',
    'Periode'       : t.periode,
    'Tgl Mulai'     : t.tanggal_mulai,
    'Tgl Selesai'   : t.tanggal_selesai,
    'Total Hari'    : t.total_hari,
    'Nominal (Rp)'  : t.nominal_tunjangan||0,
    'Status Bayar'  : t.status_bayar==='sudah'?'Sudah Dibayar':'Belum Dibayar',
    'Tgl Bayar'     : t.tanggal_bayar||'-',
    'Dibayar Oleh'  : t.dibayar_oleh||'-',
  }));

  const wb = XLSX.utils.book_new();

  if (mode === 'semua') {
    // Mode semua: 3 sheet (Semua, Belum Bayar, Sudah Bayar)
    const semua  = data;
    const belum  = data.filter(t => t.status_bayar !== 'sudah');
    const sudah  = data.filter(t => t.status_bayar === 'sudah');

    const totalSemua = data.reduce((s,t) => s+parseFloat(t.nominal_tunjangan||0), 0);
    const totalBelum = belum.reduce((s,t) => s+parseFloat(t.nominal_tunjangan||0), 0);
    const totalSudah = sudah.reduce((s,t) => s+parseFloat(t.nominal_tunjangan||0), 0);

    // Sheet 1: Semua data
    const ws1 = XLSX.utils.json_to_sheet(_toRows(semua));
    XLSX.utils.book_append_sheet(wb, ws1, 'Semua Data');

    // Sheet 2: Belum Dibayar (beban utang)
    const ws2 = XLSX.utils.json_to_sheet(_toRows(belum));
    XLSX.utils.book_append_sheet(wb, ws2, 'Belum Dibayar');

    // Sheet 3: Sudah Dibayar
    const ws3 = XLSX.utils.json_to_sheet(_toRows(sudah));
    XLSX.utils.book_append_sheet(wb, ws3, 'Sudah Dibayar');

    // Sheet 4: Summary / Ringkasan
    const summaryRows = [
      { 'Keterangan': 'Total Keseluruhan',  'Jumlah Data': semua.length,  'Total Nominal (Rp)': totalSemua },
      { 'Keterangan': 'Sudah Dibayar',      'Jumlah Data': sudah.length,  'Total Nominal (Rp)': totalSudah },
      { 'Keterangan': 'Belum Dibayar (Hutang)', 'Jumlah Data': belum.length, 'Total Nominal (Rp)': totalBelum },
    ];
    const ws4 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws4, 'Ringkasan');

    XLSX.writeFile(wb, 'Rekap_Tunjangan_Cuti_Lengkap_'+new Date().getFullYear()+'.xlsx');

  } else {
    // Mode filter: 1 sheet sesuai status
    const label = mode === 'sudah' ? 'Sudah_Dibayar' : 'Belum_Dibayar';
    const ws = XLSX.utils.json_to_sheet(_toRows(data));
    XLSX.utils.book_append_sheet(wb, ws, mode === 'sudah' ? 'Sudah Dibayar' : 'Belum Dibayar');
    XLSX.writeFile(wb, 'Tunjangan_'+label+'_'+new Date().getFullYear()+'.xlsx');
  }

  showToast('Export berhasil! 📊','success');
}

// ─── TAB 3: STATUS CUTI KHUSUS ───────────────────────────────
async function _renderStatusCutiKhusus() {
  const el = document.getElementById('cuti-khusus-content');
  el.innerHTML = skeletonCard(3);
  try {
    const res     = await callAPI('getStatusCutiKhususSemua', {});
    const data    = res.data    || [];
    const summary = res.summary || {};

    el.innerHTML = `
      <!-- Summary -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
        gap:10px;margin-bottom:16px">
        ${_cardRekap('📋','Terdaftar',summary.total_terdaftar+' karyawan','#2D6CDF')}
        ${_cardRekap('✅','Sudah Ambil',summary.sudah_ambil+' karyawan','#1A9E74')}
        ${_cardRekap('⏳','Belum Ambil',summary.belum_ambil+' karyawan','#D97706')}
        ${_cardRekap('💰','Total Nominal',formatRupiah(summary.total_nominal_periode),'#7C3AED')}
      </div>

      <!-- Label periode -->
      <div style="background:#EFF6FF;border-radius:10px;padding:10px 14px;
        margin-bottom:14px;font-size:13px;color:#2D6CDF;font-weight:600">
        📅 Periode Aktif: <strong>${summary.periode_aktif}</strong>
        <span style="font-size:11px;font-weight:400;color:#64748B;margin-left:8px">
          (H1 = Jan–Jun, H2 = Jul–Des)
        </span>
      </div>

      <!-- Export -->
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn--secondary" style="font-size:12px;padding:9px 14px"
          onclick="_exportStatusCutiKhusus()">📊 Export Excel</button>
      </div>

      <!-- Tabel -->
      <div class="card" style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#2D6CDF;color:#fff">
              <th style="padding:10px 8px;text-align:left">No</th>
              <th style="padding:10px 8px;text-align:left">Nama Karyawan</th>
              <th style="padding:10px 8px;text-align:left">Departemen</th>
              <th style="padding:10px 8px;text-align:center">Nominal</th>
              <th style="padding:10px 8px;text-align:center">Periode Ini</th>
              <th style="padding:10px 8px;text-align:center">Tgl Cuti</th>
              <th style="padding:10px 8px;text-align:center">Status Bayar</th>
              <th style="padding:10px 8px;text-align:center">Total Diambil</th>
              <th style="padding:10px 8px;text-align:center">Riwayat</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((k,i) => {
              const sudah  = k.sudah_ambil_periode_ini;
              const warna  = sudah ? '#1A9E74' : '#D97706';
              const status = sudah ? '✅ Sudah Ambil' : '⏳ Belum Ambil';
              return `<tr style="border-bottom:1px solid #F1F5F9;
                background:${i%2===0?'#fff':'#FAFBFF'}">
                <td style="padding:8px">${i+1}</td>
                <td style="padding:8px;font-weight:600">${k.nama_lengkap}</td>
                <td style="padding:8px;color:#64748B">${k.departemen||'-'}</td>
                <td style="padding:8px;text-align:center;font-weight:700;color:#1A9E74">
                  ${formatRupiah(k.nominal_tunjangan)}</td>
                <td style="padding:8px;text-align:center">
                  <span style="background:${warna}22;color:${warna};border:1px solid ${warna}55;
                    padding:3px 10px;border-radius:20px;font-weight:700;font-size:11px">
                    ${status}
                  </span>
                </td>
                <td style="padding:8px;text-align:center;font-size:11px;color:#64748B">
                  ${k.tgl_cuti_periode_ini||'-'}
                </td>
                <td style="padding:8px;text-align:center">
                  ${k.sudah_ambil_periode_ini
                    ? (k.status_bayar_periode_ini==='sudah'
                        ? '<span style="color:#1A9E74;font-weight:600;font-size:11px">✅ Dibayar</span>'
                        : '<span style="color:#D97706;font-weight:600;font-size:11px">⏳ Belum Bayar</span>')
                    : '<span style="color:#CBD5E1;font-size:11px">-</span>'}
                </td>
                <td style="padding:8px;text-align:center">
                  <span style="background:#EFF6FF;color:#2D6CDF;border:1px solid #BFDBFE;
                    padding:3px 10px;border-radius:20px;font-weight:700;font-size:11px">
                    ${k.total_diambil}x
                  </span>
                </td>
                <td style="padding:8px;text-align:center">
                  ${k.riwayat.length > 0
                    ? `<button onclick="_toggleRiwayatCK('riwayat-ck-${k.id_karyawan}')"
                        style="background:#EFF6FF;color:#2D6CDF;border:1px solid #BFDBFE;
                        padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer">
                        📋 ${k.riwayat.length} periode
                      </button>`
                    : '<span style="color:#CBD5E1">Belum ada</span>'}
                </td>
              </tr>
              ${k.riwayat.length > 0 ? `
              <tr id="riwayat-ck-${k.id_karyawan}" style="display:none">
                <td colspan="9" style="padding:0">
                  <div style="background:#F8FAFF;border-left:3px solid #2D6CDF;padding:12px 16px">
                    <div style="font-weight:700;color:#2D6CDF;margin-bottom:8px;font-size:12px">
                      Riwayat Cuti Khusus — ${k.nama_lengkap}
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:11px">
                      <thead>
                        <tr style="background:#E8F0FE">
                          <th style="padding:5px 8px;text-align:left">Periode</th>
                          <th style="padding:5px 8px;text-align:left">Tgl Mulai</th>
                          <th style="padding:5px 8px;text-align:left">Tgl Selesai</th>
                          <th style="padding:5px 8px;text-align:center">Hari</th>
                          <th style="padding:5px 8px;text-align:right">Nominal</th>
                          <th style="padding:5px 8px;text-align:center">Status Bayar</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${k.riwayat.map(r=>`
                        <tr style="border-bottom:1px solid #E2E8F0">
                          <td style="padding:5px 8px;font-weight:600">${r.periode}</td>
                          <td style="padding:5px 8px">${r.tanggal_mulai}</td>
                          <td style="padding:5px 8px">${r.tanggal_selesai}</td>
                          <td style="padding:5px 8px;text-align:center">${r.total_hari}</td>
                          <td style="padding:5px 8px;text-align:right;color:#1A9E74;font-weight:600">
                            ${formatRupiah(r.nominal)}</td>
                          <td style="padding:5px 8px;text-align:center">
                            ${r.status_bayar==='sudah'
                              ? '<span style="color:#1A9E74;font-weight:600">✅ Dibayar</span>'
                              : '<span style="color:#D97706;font-weight:600">⏳ Belum</span>'}
                          </td>
                        </tr>`).join('')}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>` : ''}`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    el.innerHTML = `<div style="padding:20px;color:#E53E3E">Gagal memuat: ${e.message}</div>`;
  }
}

function _toggleRiwayatCK(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display==='none' ? 'table-row' : 'none';
}

async function _exportStatusCutiKhusus() {
  if (!window.XLSX) { showToast('Library Excel belum siap','error'); return; }
  showToast('Menyiapkan export...','info',2000);
  try {
    const res  = await callAPI('getStatusCutiKhususSemua', {});
    const data = res.data || [];
    if (!data.length) { showToast('Tidak ada data','warning'); return; }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan status periode ini
    const rows1 = data.map((k,i) => ({
      'No'            : i+1,
      'Nama Karyawan' : k.nama_lengkap,
      'Departemen'    : k.departemen,
      'Jabatan'       : k.jabatan,
      'Nominal'       : k.nominal_tunjangan,
      'Periode Aktif' : k.periode_aktif,
      'Status Periode Ini': k.sudah_ambil_periode_ini ? 'Sudah Ambil' : 'Belum Ambil',
      'Tgl Cuti'      : k.tgl_cuti_periode_ini || '-',
      'Status Bayar'  : k.status_bayar_periode_ini || '-',
      'Total Diambil' : k.total_diambil + 'x',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows1), 'Status Periode Ini');

    // Sheet 2: Yang belum ambil
    const belum = data.filter(k => !k.sudah_ambil_periode_ini);
    if (belum.length > 0) {
      const rows2 = belum.map((k,i) => ({
        'No':''+i+1, 'Nama':k.nama_lengkap,
        'Departemen':k.departemen, 'Nominal':k.nominal_tunjangan
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows2), 'Belum Ambil');
    }

    // Sheet 3: Riwayat lengkap semua periode
    const rows3 = [];
    data.forEach(k => {
      k.riwayat.forEach(r => {
        rows3.push({
          'Nama'       : k.nama_lengkap,
          'Departemen' : k.departemen,
          'Periode'    : r.periode,
          'Tgl Mulai'  : r.tanggal_mulai,
          'Tgl Selesai': r.tanggal_selesai,
          'Hari'       : r.total_hari,
          'Nominal'    : r.nominal,
          'Status Bayar': r.status_bayar==='sudah'?'Sudah Dibayar':'Belum Dibayar',
          'Tgl Bayar'  : r.tanggal_bayar||'-'
        });
      });
    });
    if (rows3.length > 0)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows3), 'Riwayat Semua Periode');

    XLSX.writeFile(wb, 'Status_Cuti_Khusus_'+new Date().getFullYear()+'.xlsx');
    showToast('Export berhasil! 📊','success');
  } catch(e) { showToast('Gagal: '+e.message,'error'); }
}

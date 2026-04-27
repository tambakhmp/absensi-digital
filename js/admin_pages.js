// ============================================================
// admin_pages.js v5 — SEMUA halaman admin dalam 1 file
// Dashboard, Absensi, Karyawan, Pengajuan, Lembur, SP,
// Ranking, Pengumuman, Lokasi, Shift, Device, Pengaturan, Laporan
// ============================================================

// ─── HELPER: Dropdown Karyawan Searchable ────────────────────
let _kdCache = null;
async function _loadKaryawanDrop() {
  if (_kdCache) return _kdCache;
  try { _kdCache = await callAPI('getKaryawanAktif', {}); return _kdCache || []; }
  catch(e) { return []; }
}
function _makeSearchable(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || sel.dataset.searchable) return;
  sel.dataset.searchable = '1';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative';
  const inp = document.createElement('input');
  inp.type  = 'text'; inp.className = 'form-control';
  inp.placeholder = 'Ketik nama karyawan...';
  const drop = document.createElement('div');
  drop.style.cssText = `position:absolute;top:100%;left:0;right:0;background:#fff;
    border:1px solid #E2E8F0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);
    max-height:200px;overflow-y:auto;z-index:1000;display:none`;
  sel.style.display = 'none';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(inp); wrap.appendChild(drop); wrap.appendChild(sel);
  const opts = Array.from(sel.options).filter(o => o.value);
  function render(q) {
    const filt = opts.filter(o => o.text.toLowerCase().includes(q.toLowerCase()));
    drop.innerHTML = filt.slice(0,15).map(o => `<div data-val="${o.value}"
      style="padding:10px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #F1F5F9">
      <strong>${o.text.split('—')[0].trim()}</strong>
      <span style="color:#94A3B8;font-size:11px"> — ${(o.text.split('—')[1]||'').trim()}</span>
    </div>`).join('') || `<div style="padding:12px;color:#94A3B8;font-size:13px;text-align:center">Tidak ditemukan</div>`;
    drop.style.display = filt.length > 0 || q ? 'block' : 'none';
  }
  inp.addEventListener('input', () => render(inp.value));
  inp.addEventListener('focus', () => render(inp.value));
  drop.addEventListener('click', e => {
    const it = e.target.closest('[data-val]');
    if (!it) return;
    sel.value   = it.dataset.val;
    inp.value   = opts.find(o => o.value===it.dataset.val)?.text.split('—')[0].trim()||'';
    drop.style.display = 'none';
    sel.dispatchEvent(new Event('change'));
  });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) drop.style.display='none'; });
}

// ─────────────────────────────────────────────────────────────
// 1. DASHBOARD ADMIN
// ─────────────────────────────────────────────────────────────
// loadDashboardAdminV3 ada di dashboard.js

function _sc(icon, label, value, color) {
  return `<div class="stat-card-admin">
    <div class="stat-card-admin__icon" style="background:${color}22;color:${color}">${icon}</div>
    <div><div class="stat-card-admin__num">${value??0}</div>
    <div class="stat-card-admin__label">${label}</div></div></div>`;
}
function _renderUltah(ultah) {
  const el = document.getElementById('ultah-section');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `<div class="card"><h3 style="font-size:15px;margin-bottom:12px">
    🎂 Ulang Tahun Hari Ini (${ultah.length})</h3>
    ${ultah.map(k=>`<div style="display:flex;align-items:center;gap:10px;
      padding:8px 0;border-bottom:1px solid #F1F5F9">
      <img src="${_normFoto(k.foto||'',k.nama)}"
        style="width:36px;height:36px;border-radius:50%;object-fit:cover"
        onerror="this.src='${avatarInisial(k.nama||'U',36)}'">
      <div><div style="font-weight:600;font-size:14px">${k.nama} 🎂</div>
      <div style="font-size:12px;color:#64748B">${k.jabatan} · ${k.departemen}</div></div>
      <span style="margin-left:auto;font-size:12px;color:#D97706;font-weight:600">
        ${k.umur} thn</span></div>`).join('')}
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// 2. ABSENSI ADMIN
// ─────────────────────────────────────────────────────────────
async function renderAbsensiAdminFull(container) {
  const now = new Date();
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📋 Absensi Karyawan</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn--ghost" style="font-size:13px" onclick="debugGPSAdmin()">📡 Debug GPS</button>
        <button class="btn btn--ghost" style="font-size:13px" onclick="tampilCetakAbsensiPDF()">🖨️ Cetak PDF</button>
        <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormAbsensiManualAdmin()">+ Manual</button>
      </div>
    </div>
    <div class="card" style="padding:12px;margin-bottom:12px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="date" class="form-control" id="filter-tgl-abs"
          value="${now.toISOString().split('T')[0]}" style="width:160px">
        <select class="form-control" id="filter-status-abs" style="width:150px">
          <option value="">Semua Status</option>
          <option value="hadir">✅ Hadir</option><option value="terlambat">⏰ Terlambat</option>
          <option value="alfa">❌ Alfa</option><option value="izin">📝 Izin</option>
          <option value="sakit">🏥 Sakit</option><option value="dinas_luar">🚗 Dinas Luar</option>
        </select>
        <button class="btn btn--secondary" style="font-size:13px" onclick="loadAbsensiAdminV4()">🔍 Tampilkan</button>
      </div>
    </div>
    <div id="absensi-sum" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px"></div>
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table" style="min-width:600px">
        <thead><tr><th>Karyawan</th><th>Jam Masuk</th><th>Jam Keluar</th>
          <th>Status</th><th>Jarak</th><th>Ket</th><th>Aksi</th></tr></thead>
        <tbody id="tbody-abs"><tr><td colspan="7" style="text-align:center;padding:24px;color:#94A3B8">
          Pilih tanggal dan klik Tampilkan</td></tr></tbody>
      </table>
    </div>`;
  await loadAbsensiAdminV4();
}

async function loadAbsensiAdminV4() {
  const tgl  = document.getElementById('filter-tgl-abs')?.value;
  const fSt  = document.getElementById('filter-status-abs')?.value||'';
  const tbody= document.getElementById('tbody-abs');
  if (!tbody||!tgl) return;
  tbody.innerHTML=`<tr><td colspan="7" style="padding:20px;text-align:center">${skeletonCard(1)}</td></tr>`;
  try {
    let data = await callAPI('getAbsensiSemua',{tanggal:fromInputDate(tgl)});
    if (fSt) data=(data||[]).filter(a=>a.status===fSt);
    const sum=document.getElementById('absensi-sum');
    if (sum) {
      const r={};(data||[]).forEach(a=>{r[a.status]=(r[a.status]||0)+1;});
      sum.innerHTML=[['✅','Hadir',(r.hadir||0)+(r.terlambat||0),'#1A9E74'],
        ['⏰','Terlambat',r.terlambat||0,'#D97706'],['❌','Alfa',r.alfa||0,'#E53E3E'],
        ['🚗','Dinas',r.dinas_luar||0,'#EA580C']].map(([ic,lb,v,c])=>
        `<div style="background:#fff;border-radius:10px;padding:10px;text-align:center;
          border:1px solid #E2E8F0"><div style="font-size:16px">${ic}</div>
          <div style="font-size:18px;font-weight:700;color:${c}">${v}</div>
          <div style="font-size:11px;color:#94A3B8">${lb}</div></div>`).join('');
    }
    if (!data||data.length===0){tbody.innerHTML=`<tr><td colspan="7"
      style="text-align:center;padding:32px;color:#94A3B8">Tidak ada data</td></tr>`;return;}
    tbody.innerHTML=data.map(a=>`<tr>
      <td style="padding:10px"><div style="font-weight:600;font-size:13px">${a.nama_karyawan||'-'}</div>
        <div style="font-size:11px;color:#94A3B8">${a.id_karyawan}</div></td>
      <td style="font-family:monospace;font-size:13px">${a.jam_masuk||'-'}</td>
      <td style="font-family:monospace;font-size:13px">${a.jam_keluar||'-'}</td>
      <td>${badgeStatus(a.status)}</td>
      <td style="font-size:12px;color:#64748B">${a.jarak_meter_masuk?a.jarak_meter_masuk+'m':'-'}</td>
      <td style="font-size:12px;color:#64748B;max-width:100px;overflow:hidden;text-overflow:ellipsis">
        ${(a.keterangan||'-').substring(0,40)}</td>
      <td><button class="btn btn--ghost" style="padding:4px 8px;font-size:11px"
        onclick="editAbsensiAdmin('${a.id_karyawan}','${a.status}','${a.tanggal}')">✏️</button></td>
    </tr>`).join('');
  } catch(e){tbody.innerHTML=`<tr><td colspan="7"
    style="text-align:center;padding:24px;color:#E53E3E">❌ ${e.message}</td></tr>`;}
}

async function tampilFormAbsensiManualAdmin() {
  const kList = await _loadKaryawanDrop();
  const modal = document.createElement('div');
  modal.id='modal-abs-manual';
  modal.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;
    display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)`;
  modal.innerHTML=`<div style="background:#fff;border-radius:16px;padding:24px;width:100%;
    max-width:460px;max-height:90vh;overflow-y:auto;animation:fadeInScale .2s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:17px">📝 Input Absensi Manual</h3>
      <button onclick="document.getElementById('modal-abs-manual').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
    </div>
    <div id="abs-man-err" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
      border-radius:8px;padding:10px;color:#C53030;font-size:13px;margin-bottom:12px"></div>
    <div class="form-group">
      <label class="form-label">Karyawan *</label>
      <select class="form-control" id="abs-man-k">
        <option value="">Pilih karyawan...</option>
        ${kList.map(k=>`<option value="${k.id_karyawan}">${k.nama_lengkap} — ${k.jabatan}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tanggal *</label>
      <input type="date" class="form-control" id="abs-man-tgl" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Jam Masuk</label>
        <input type="time" class="form-control" id="abs-man-masuk" value="08:00"></div>
      <div class="form-group"><label class="form-label">Jam Keluar</label>
        <input type="time" class="form-control" id="abs-man-keluar" value="16:00"></div>
    </div>
    <div class="form-group"><label class="form-label">Status *</label>
      <select class="form-control" id="abs-man-status">
        <option value="hadir">✅ Hadir</option><option value="terlambat">⏰ Terlambat</option>
        <option value="alfa">❌ Alfa</option><option value="izin">📝 Izin</option>
        <option value="sakit">🏥 Sakit</option><option value="cuti">🏖️ Cuti</option>
        <option value="dinas_luar">🚗 Dinas Luar</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Keterangan</label>
      <input type="text" class="form-control" id="abs-man-ket" placeholder="Opsional"></div>
    <button class="btn btn--primary btn--full" onclick="submitAbsManual()">
      <div class="spinner-btn"></div><span class="btn-text">💾 Simpan</span></button>
  </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>_makeSearchable('abs-man-k'),100);
}

async function submitAbsManual() {
  const btn=document.querySelector('#modal-abs-manual .btn--primary');
  const err=document.getElementById('abs-man-err');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  if(err)err.style.display='none';
  try {
    const idK=document.getElementById('abs-man-k')?.value;
    const tgl=document.getElementById('abs-man-tgl')?.value;
    const st=document.getElementById('abs-man-status')?.value;
    if(!idK) throw new Error('Pilih karyawan');
    if(!tgl) throw new Error('Tanggal wajib diisi');
    const r=await callAPI('absensiManual',{
      id_karyawan:idK, tanggal:fromInputDate(tgl),
      jam_masuk:document.getElementById('abs-man-masuk')?.value,
      jam_keluar:document.getElementById('abs-man-keluar')?.value,
      status:st, keterangan:document.getElementById('abs-man-ket')?.value||'Input manual'
    });
    document.getElementById('modal-abs-manual')?.remove();
    showToast(r.message,'success');
    loadAbsensiAdminV4();
  } catch(e){
    if(err){err.style.display='block';err.textContent='⚠️ '+e.message;}
    else showToast(e.message,'error');
  } finally{if(btn){btn.disabled=false;btn.classList.remove('loading');}}
}

function editAbsensiAdmin(idK,status,tanggal) {
  showModal('✏️ Edit Absensi',
    `<div class="form-group" style="margin-top:8px"><label class="form-label">Status Baru</label>
    <select class="form-control" id="edit-st-abs">
      ${['hadir','terlambat','alfa','izin','sakit','cuti','dinas_luar'].map(s=>
        `<option value="${s}" ${s===status?'selected':''}>${s}</option>`).join('')}
    </select></div>
    <div class="form-group"><label class="form-label">Keterangan</label>
      <input type="text" class="form-control" id="edit-ket-abs" placeholder="Opsional"></div>`,
    async()=>{
      try{
        const r=await callAPI('absensiManual',{
          id_karyawan:idK, tanggal:tanggal,
          status:document.getElementById('edit-st-abs')?.value,
          keterangan:document.getElementById('edit-ket-abs')?.value||'Diubah admin'
        });
        showToast(r.message,'success'); loadAbsensiAdminV4();
      }catch(e){showToast(e.message,'error');}
    },'💾 Simpan');
}

// ─── CETAK PDF ABSENSI HARIAN ────────────────────────────────
async function tampilCetakAbsensiPDF() {
  const now    = new Date();
  const tanggal = document.getElementById('filter-tgl-abs')?.value || now.toISOString().split('T')[0];
  const modal  = document.createElement('div');
  modal.id     = 'modal-cetak-abs';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
  modal.innerHTML = `<div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:440px;animation:fadeInScale .2s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:17px">🖨️ Cetak Absensi PDF</h3>
      <button onclick="document.getElementById('modal-cetak-abs').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Tanggal *</label>
      <input type="date" class="form-control" id="pdf-abs-tgl" value="${tanggal}">
    </div>
    <div style="background:#EFF6FF;border-radius:8px;padding:10px;font-size:12px;color:#2D6CDF;margin-bottom:14px">
      📄 PDF berisi: <strong>Kop Surat + Tabel Absensi</strong><br>
      Kolom: No · Nama · Jam Masuk · Jam Keluar · Status · Jarak · Keterangan
    </div>
    <button class="btn btn--primary btn--full btn--lg" onclick="doCetakAbsensiPDF()">
      <div class="spinner-btn"></div><span class="btn-text">📄 Cetak PDF</span>
    </button>
  </div>`;
  document.body.appendChild(modal);
}

async function doCetakAbsensiPDF() {
  const btn = document.querySelector('#modal-cetak-abs .btn--primary');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  try {
    const tglInput = document.getElementById('pdf-abs-tgl')?.value;
    if (!tglInput) { showToast('Pilih tanggal','warning'); return; }
    const tgl = fromInputDate(tglInput);
    await cetakAbsensiHarianPDF(tgl);
    document.getElementById('modal-cetak-abs')?.remove();
  } catch(e) {
    showToast(e.message,'error');
  } finally {
    if(btn){btn.disabled=false;btn.classList.remove('loading');}
  }
}

async function debugGPSAdmin() {
  showToast('Mendapatkan posisi GPS Anda...','info',3000);
  try {
    const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000}));
    const hasil=await callAPI('debugGPS',{lat:pos.coords.latitude,lon:pos.coords.longitude});
    showModal('🔍 Debug GPS',`<div style="font-size:13px;line-height:1.8">
      <strong>Posisi Anda:</strong><br>
      Lat: <code>${pos.coords.latitude.toFixed(6)}</code> |
      Lon: <code>${pos.coords.longitude.toFixed(6)}</code><br>
      Akurasi: ±${Math.round(pos.coords.accuracy||0)} meter<br><br>
      <strong>Hasil Server:</strong><br>
      ${hasil.ok?`<span style="color:#1A9E74;font-weight:700">✅ ${hasil.pesan}</span>`
               :`<span style="color:#E53E3E;font-weight:700">❌ ${hasil.pesan}</span>`}<br>
      ${(hasil.lokasi_list||[]).map(l=>`
        <div style="background:#F8FAFC;border-radius:8px;padding:10px;margin-top:6px">
          <strong>${l.nama}</strong><br>
          Jarak: <strong style="color:${l.dalam_radius?'#1A9E74':'#E53E3E'}">${l.jarak_meter} m</strong>
          (max ${l.radius} m) ${l.dalam_radius?'✅':'❌'}
        </div>`).join('')}
      ${hasil.solusi?`<div style="background:#FFF8DC;border-radius:8px;padding:10px;margin-top:8px;
        color:#B7791F"><strong>💡 Solusi:</strong><br>${hasil.solusi}</div>`:''}
    </div>`);
  }catch(e){showModal('❌ GPS Gagal',`<p style="font-size:13px;color:#64748B">${e.message}</p>`);}
}

// ─────────────────────────────────────────────────────────────
// 3. PENGAJUAN ADMIN
// ─────────────────────────────────────────────────────────────

function _toViewUrl(url) {
  if (!url) return '';
  // Konversi lh3.googleusercontent.com/d/ID → drive.google.com/thumbnail?id=ID&sz=w400
  var m = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w400';
  var m2 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m2) return 'https://drive.google.com/thumbnail?id=' + m2[1] + '&sz=w400';
  return url;
}

async function renderPengajuanAdminFull(container) {
  container.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📁 Manajemen Pengajuan</h2>
      <div id="pgj-stat" style="font-size:13px;color:#64748B"></div>
    </div>
    <div class="card" style="padding:12px;margin-bottom:14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select class="form-control" id="flt-pgj-st" style="flex:1;min-width:130px" onchange="loadPengajuanAdminV4()">
          <option value="pending" selected>⏳ Pending</option>
          <option value="disetujui">✅ Disetujui</option>
          <option value="ditolak">❌ Ditolak</option>
          <option value="">📋 Semua</option>
        </select>
        <select class="form-control" id="flt-pgj-jn" style="flex:1;min-width:130px" onchange="loadPengajuanAdminV4()">
          <option value="" selected>📋 Semua Jenis</option>
          <option value="izin">📝 Izin</option>
          <option value="sakit">🏥 Sakit</option>
          <option value="cuti">🏖️ Cuti</option>
          <option value="dinas_luar">🚗 Dinas Luar</option>
        </select>
      </div>
    </div>
    <div id="pgj-admin-list">${skeletonCard(4)}</div>`;
  await loadPengajuanAdminV4();
}


// Normalize URL foto untuk tampil di browser
function _normFoto(url, nama, size) {
  if (!url || url === '' || url === 'null') return getPhotoSrc('', nama, size);
  const norm = typeof normalizeDriveUrlFrontend === 'function'
    ? normalizeDriveUrlFrontend(url) : url;
  return norm && norm.startsWith('http') ? norm : getPhotoSrc('', nama, size);
}

async function loadPengajuanAdminV4() {
  const el=document.getElementById('pgj-admin-list');
  const st=document.getElementById('flt-pgj-st')?.value||'';
  const jn=document.getElementById('flt-pgj-jn')?.value||'';
  if(!el) return;
  el.innerHTML=skeletonCard(3);
  try {
    const raw=(await callAPI('getPengajuanSemua',{status:st,jenis:jn})||[])
      .filter(p=>p.jenis!=='lembur');
    const data = raw;
    console.log('[DEBUG pengajuan] total:', data.length, 'contoh[0]:', JSON.stringify(data[0]));
    const stat=document.getElementById('pgj-stat');
    if(stat)stat.textContent=(data?.length||0)+' pengajuan';
    if(!data||data.length===0){showEmpty('pgj-admin-list','Tidak ada pengajuan');return;}
    const LBL={izin:'📝 Izin',sakit:'🏥 Sakit',cuti:'🏖️ Cuti',dinas_luar:'🚗 Dinas Luar',lembur:'⏰ Lembur'};
    el.innerHTML=data.map(p=>`
      <div class="card" style="border-left:4px solid ${
        p.status==='pending'?'#D97706':p.status==='disetujui'?'#1A9E74':'#E53E3E'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-weight:700;font-size:15px">${p.nama_karyawan}</span>
              <span style="background:#F1F5F9;color:#475569;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">
                ${LBL[p.jenis]||p.jenis}</span>
              ${badgeStatus(p.status)}
            </div>
            <div style="font-size:13px;color:#64748B;margin-bottom:4px">
              📅 ${formatTanggal(p.tanggal_mulai)}
              ${p.tanggal_selesai!==p.tanggal_mulai?' – '+formatTanggal(p.tanggal_selesai):''}
              · <strong>${p.total_hari} hari</strong>
            </div>
            <div style="font-size:13px;color:#475569;background:#F8FAFC;
              border-radius:6px;padding:6px 10px;margin-bottom:6px">"${p.keterangan||'-'}"</div>
            ${p.file_pendukung_url ? `
              <a href="${p.file_pendukung_url}" target="_blank"
                style="display:inline-block;margin-top:6px;background:#EFF6FF;color:#1D4ED8;
                padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;
                text-decoration:none;border:1px solid #BFDBFE">
                📎 Lihat Foto Surat</a>` : ''}
            ${p.catatan_admin?`<div style="font-size:12px;color:#D97706;margin-top:4px">
              💬 ${p.catatan_admin}</div>`:''}
          </div>
          ${p.status==='pending'?`
          <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
            <button class="btn btn--secondary" style="padding:9px 16px;font-size:13px"
              onclick="approvePGJ('${p.id_pengajuan}','${p.nama_karyawan}')">✅ Setujui</button>
            <button class="btn btn--danger" style="padding:9px 16px;font-size:13px"
              onclick="tolakPGJ('${p.id_pengajuan}','${p.nama_karyawan}')">❌ Tolak</button>
          </div>`:''}
        </div>
      </div>`).join('');
  }catch(e){showError('pgj-admin-list',e.message);}
}

function approvePGJ(id,nama) {
  showModal('✅ Setujui?',`<p>Setujui pengajuan <strong>${nama}</strong>?</p>
    <div class="form-group" style="margin-top:10px"><label class="form-label">Catatan (opsional)</label>
    <input type="text" class="form-control" id="ap-cat" placeholder="Disetujui"></div>`,
    async()=>{
      try{const r=await callAPI('approvePengajuan',{id_pengajuan:id,catatan_admin:document.getElementById('ap-cat')?.value||'Disetujui'});
        showToast(r.message,'success');loadPengajuanAdminV4();}catch(e){showToast(e.message,'error');}
    },'✅ Setujui');
}
function tolakPGJ(id,nama) {
  showModal('❌ Tolak?',`<p>Tolak pengajuan <strong>${nama}</strong>?</p>
    <div class="form-group" style="margin-top:10px"><label class="form-label">Alasan *</label>
    <textarea class="form-control" id="tlk-alasan" rows="2"
      placeholder="Jelaskan alasan penolakan..."></textarea></div>`,
    async()=>{
      const al=document.getElementById('tlk-alasan')?.value?.trim();
      if(!al){showToast('Alasan wajib diisi','warning');return;}
      try{const r=await callAPI('tolakPengajuan',{id_pengajuan:id,catatan_admin:al});
        showToast(r.message,'success');loadPengajuanAdminV4();}catch(e){showToast(e.message,'error');}
    },'❌ Tolak');
}

// ─────────────────────────────────────────────────────────────
// 4. LEMBUR ADMIN
// ─────────────────────────────────────────────────────────────
async function renderLemburAdminFull(container) {
  container.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">🕒 Manajemen Lembur</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn--ghost" style="font-size:13px" onclick="routeAdmin('harga-lembur-admin')">💰 Atur Harga</button>
        <button class="btn btn--ghost" style="font-size:13px" onclick="tampilKwitansiRentang()">🧾 Kwitansi</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn btn--primary" onclick="loadLemburAdmin('pending')">⏳ Pending</button>
      <button class="btn btn--ghost"   onclick="loadLemburAdmin('disetujui')">✅ Disetujui</button>
      <button class="btn btn--ghost"   onclick="loadLemburAdmin('')">📋 Semua</button>
    </div>
    <div id="lembur-sum" style="margin-bottom:12px"></div>
    <div id="lembur-admin-list">${skeletonCard(3)}</div>`;
  await loadLemburAdmin('pending');
}

async function loadLemburAdmin(status='pending') {
  const el=document.getElementById('lembur-admin-list');
  if(!el) return; el.innerHTML=skeletonCard(3);
  try {
    const data=await callAPI('getLemburSemua',{});
    let f=data||[];
    if(status==='pending') f=f.filter(l=>l.status_bayar!=='disetujui'&&l.status_bayar!=='ditolak');
    else if(status) f=f.filter(l=>l.status_bayar===status);
    const sumEl=document.getElementById('lembur-sum');
    if(sumEl&&!status) {
      const tj=f.reduce((s,l)=>s+parseFloat(l.total_jam||0),0);
      const tb=f.reduce((s,l)=>s+parseFloat(l.total_bayar||0),0);
      sumEl.innerHTML=`<div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="background:#EBF8EE;border-radius:8px;padding:8px 14px;font-size:13px">
          ⏰ Total: <strong>${tj.toFixed(1)} jam</strong></div>
        <div style="background:#EBF8EE;border-radius:8px;padding:8px 14px;font-size:13px">
          💰 Total: <strong>${formatRupiah(tb)}</strong></div></div>`;
    } else if(sumEl) sumEl.innerHTML='';
    if(!f.length){showEmpty('lembur-admin-list',status==='pending'?'Tidak ada lembur pending':'Tidak ada data');return;}
    el.innerHTML=f.map(l=>`
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">${l.nama_karyawan}</div>
            <div style="font-size:13px;color:#64748B">
              📅 ${formatTanggal(l.tanggal)} · 🕐 ${l.jam_mulai}–${l.jam_selesai} · <strong>${l.total_jam} jam</strong>
            </div>
            ${l.foto_spl_url?`
            <a href="${l.foto_spl_url}" target="_blank"
              style="display:inline-block;margin-top:8px;background:#EFF6FF;color:#1D4ED8;
              padding:7px 14px;border-radius:6px;font-size:12px;font-weight:700;
              text-decoration:none;border:1px solid #BFDBFE">
              📎 Lihat Foto SPL</a>`:``}
            <div style="font-size:14px;color:#1A9E74;font-weight:700;margin-top:4px">
              ${formatRupiah(l.total_bayar)}
              <span style="font-size:11px;color:#94A3B8;font-weight:400">(${formatRupiah(l.harga_per_jam)}/jam)</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            ${badgeStatus(l.status_bayar||'pending')}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${l.status_bayar!=='disetujui'&&l.status_bayar!=='ditolak'?`
                <button class="btn btn--secondary" style="padding:7px 12px;font-size:12px"
                  onclick="approveLemburAdmin('${l.id_lembur}')">✅</button>
                <button class="btn btn--danger" style="padding:7px 12px;font-size:12px"
                  onclick="tolakLemburAdmin('${l.id_lembur}')">❌</button>`:''}
            </div>
          </div>
        </div>
      </div>`).join('');
  }catch(e){showError('lembur-admin-list',e.message);}
}
function approveLemburAdmin(id){showModal('✅ Setujui Lembur?','',async()=>{
  const r=await callAPI('approveLembur',{id_lembur:id});showToast(r.message,'success');loadLemburAdmin('pending');
},'✅ Setujui');}
function tolakLemburAdmin(id){showModal('❌ Tolak Lembur?','',async()=>{
  const r=await callAPI('tolakLembur',{id_lembur:id});showToast(r.message,'success');loadLemburAdmin('pending');
},'❌ Tolak');}
async function tampilKwitansiRentang() {
  const now = new Date();
  const y1  = now.getFullYear()+'-'+(now.getMonth()+1).toString().padStart(2,'0')+'-01';
  const y2  = now.toISOString().split('T')[0];

  // Ambil daftar karyawan yang pernah lembur (disetujui)
  showToast('Memuat data lembur...','info',2000);
  const semua = await callAPI('getLemburSemua', {});
  const pernah = {};
  (semua||[]).filter(l=>l.status_bayar==='disetujui').forEach(l=>{
    if (!pernah[l.id_karyawan]) pernah[l.id_karyawan] = l.nama_karyawan;
  });
  const daftarKaryawan = Object.entries(pernah)
    .sort((a,b)=>a[1].localeCompare(b[1]));

  if (!daftarKaryawan.length) {
    showToast('Belum ada lembur yang disetujui','warning'); return;
  }

  const modal = document.createElement('div');
  modal.id = 'modal-kwt-rentang';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
  modal.innerHTML = `<div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:460px;animation:fadeInScale .2s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:17px">🧾 Cetak Kwitansi Lembur</h3>
      <button onclick="document.getElementById('modal-kwt-rentang').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
    </div>

    <div class="form-group">
      <label class="form-label">👤 Pilih Karyawan</label>
      <select class="form-control" id="kwt-karyawan">
        <option value="">-- Pilih Karyawan --</option>
        ${daftarKaryawan.map(([id,nama])=>`<option value="${id}">${nama}</option>`).join('')}
      </select>
      <p style="font-size:11px;color:#94A3B8;margin-top:4px">
        Hanya menampilkan karyawan yang pernah mengajukan lembur</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">📅 Dari Tanggal</label>
        <input type="date" class="form-control" id="kwt-dari" value="${y1}">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">📅 Sampai Tanggal</label>
        <input type="date" class="form-control" id="kwt-ke" value="${y2}">
      </div>
    </div>

    <button class="btn btn--primary btn--full btn--lg" onclick="doCetakKwitansiRentang()">
      <div class="spinner-btn"></div><span class="btn-text">🧾 Cetak Kwitansi</span>
    </button>
  </div>`;
  document.body.appendChild(modal);
}

async function doCetakKwitansiRentang() {
  const btn = document.querySelector('#modal-kwt-rentang .btn--primary');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  try {
    const idK  = document.getElementById('kwt-karyawan')?.value;
    const dari = document.getElementById('kwt-dari')?.value;
    const ke   = document.getElementById('kwt-ke')?.value;
    if (!idK)   { showToast('Pilih karyawan dulu','warning'); return; }
    if (!dari||!ke) { showToast('Isi rentang tanggal','warning'); return; }
    await cetakKwitansiKaryawan(idK, fromInputDate(dari), fromInputDate(ke));
    document.getElementById('modal-kwt-rentang')?.remove();
  } catch(e) {
    showToast(e.message,'error');
  } finally {
    if(btn){btn.disabled=false;btn.classList.remove('loading');}
  }
}

function tampilExportLembur(){
  const now=new Date();
  showModal('📊 Export Lembur',
    `<div style="display:flex;gap:10px;margin-top:8px">
      <select class="form-control" id="lb-exp-b">
        ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
      </select>
      <input type="number" class="form-control" id="lb-exp-t" value="${now.getFullYear()}" style="width:90px">
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn--primary" style="flex:1"
        onclick="document.getElementById('modal-overlay').remove();cetakRekapLemburPDF(document.getElementById('lb-exp-b').value,document.getElementById('lb-exp-t').value)">📄 PDF</button>
      <button class="btn btn--secondary" style="flex:1"
        onclick="document.getElementById('modal-overlay').remove();exportRekapLemburExcel(document.getElementById('lb-exp-b').value,document.getElementById('lb-exp-t').value)">📊 Excel</button>
    </div>`,null,'');
}

// ─────────────────────────────────────────────────────────────
// 5. RANKING ADMIN
// ─────────────────────────────────────────────────────────────
async function renderRankingAdminFull(container) {
  const now=new Date();
  container.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">🏆 Ranking Karyawan</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;background:#EBF8EE;color:#1A9E74;padding:3px 10px;border-radius:10px;font-weight:600">⚡ Real-time</span>
        <select class="form-control" id="rank-bln" style="width:130px" onchange="loadRankingAdmin()">
          ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
        </select>
        <input type="number" class="form-control" id="rank-thn" value="${now.getFullYear()}" style="width:80px" onchange="loadRankingAdmin()">
        <button class="btn btn--ghost" style="font-size:12px" onclick="simpanArsipRankingAdmin()">💾 Arsip</button>
      </div>
    </div>
    <div id="rank-content">${skeletonCard(6)}</div>`;
  await loadRankingAdmin();
}

async function loadRankingAdmin() {
  const el=document.getElementById('rank-content');
  if(!el) return; el.innerHTML=skeletonCard(4);
  try {
    const data=await callAPI('getRankingSnapshot',{
      bulan:document.getElementById('rank-bln')?.value,
      tahun:document.getElementById('rank-thn')?.value
    });
    if(!data||data.length===0){
      el.innerHTML=`<div class="card" style="text-align:center;padding:32px;color:#94A3B8">
        <div style="font-size:48px;margin-bottom:12px">🏆</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">Belum ada data ranking</div>
        <button class="btn btn--primary" onclick="hitungRankingAdmin()">⚡ Hitung Sekarang</button>
      </div>`;return;
    }
    const BMAP={'Bintang Emas':'gold','Bintang Perak':'silver','Bintang Perunggu':'bronze',
      'Perlu Pembinaan':'danger','Butuh Perhatian':'warning','Tingkatkan Kinerja':'caution'};
    const BORDER={1:'rank-1',2:'rank-2',3:'rank-3'};
    const WBORDER={'Perlu Pembinaan':'rank-worst-1','Butuh Perhatian':'rank-worst-2','Tingkatkan Kinerja':'rank-worst-3'};

    const top3=data.filter(r=>parseInt(r.peringkat)<=3);
    const bot3=data.filter(r=>['Perlu Pembinaan','Butuh Perhatian','Tingkatkan Kinerja'].includes(r.predikat));
    const tengah=data.filter(r=>!r.predikat);

    function rCard(r) {
      const border=BORDER[parseInt(r.peringkat)]||WBORDER[r.predikat]||'';
      const foto=_normFoto(r.foto||'',r.nama_karyawan,48);
      const emoji=['🥇','🥈','🥉'][parseInt(r.peringkat)-1]||'#'+r.peringkat;
      const skor=parseInt(r.skor_total||r.skor_kehadiran||0);
      const warnaSkor=skor>=80?'#1A9E74':skor>=60?'#D97706':'#E53E3E';
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #F1F5F9">
          <div class="${border}" style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0">
            <img src="${foto}" style="width:100%;height:100%;object-fit:cover"
              onerror="this.src='${avatarInisial(r.nama_karyawan,48)}'">
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px">${emoji} ${r.nama_karyawan}</div>
            <div style="font-size:11px;color:#64748B">${r.departemen||''}</div>
            <div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap">
              <span style="font-size:10px;color:#1A9E74">✅${r.total_hadir||0}</span>
              <span style="font-size:10px;color:#D97706">⏰${r.total_terlambat||0}</span>
              <span style="font-size:10px;color:#E53E3E">❌${r.total_alfa||0}</span>
              ${r.predikat?`<span class="rank-badge rank-badge--${BMAP[r.predikat]||''}" style="font-size:10px;display:inline-flex">${r.predikat}</span>`:''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:18px;font-weight:700;color:${warnaSkor}">${skor}</div>
            <div style="font-size:10px;color:#94A3B8">/100</div>
            <div style="font-size:10px;color:#64748B">#${r.peringkat}</div>
          </div>
        </div>`;
    }

    el.innerHTML=`
      ${top3.length?`<div class="card"><p style="font-size:12px;font-weight:700;color:#D97706;
        text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">⭐ Terbaik</p>
        ${top3.map(rCard).join('')}</div>`:''}
      ${tengah.length?`<div class="card"><p style="font-size:12px;font-weight:700;color:#64748B;
        text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">
        📊 Karyawan Lainnya (${tengah.length})</p>
        ${tengah.map(r=>{const sk=parseInt(r.skor_total||r.skor_kehadiran||0);const wk=sk>=80?'#1A9E74':sk>=60?'#D97706':'#E53E3E';return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F1F5F9">
          <span style="font-weight:700;color:#64748B;width:28px;text-align:right">#${r.peringkat}</span>
          <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.nama_karyawan}</div><div style="font-size:10px;color:#94A3B8">${r.departemen||''}</div></div>
          <div style="font-size:10px;color:#1A9E74">✅${r.total_hadir||0}</div>
          <div style="font-size:10px;color:#D97706">⏰${r.total_terlambat||0}</div>
          <div style="font-size:10px;color:#E53E3E">❌${r.total_alfa||0}</div>
          <div style="font-size:15px;font-weight:700;color:${wk};min-width:36px;text-align:right">${sk}</div>
        </div>`}).join('')}</div>`:''}
      ${bot3.length?`<div class="card"><p style="font-size:12px;font-weight:700;color:#E53E3E;
        text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">⚠️ Perlu Perhatian</p>
        ${bot3.map(rCard).join('')}</div>`:''}`;
  }catch(e){showError('rank-content',e.message);}
}

async function hitungRankingAdmin(){
  // Backward compat — sekarang redirect ke simpanArsip
  simpanArsipRankingAdmin();
}

async function simpanArsipRankingAdmin(){
  showModal('💾 Simpan Arsip Ranking?',
    'Ranking real-time bulan ini akan disimpan sebagai arsip permanen.<br><br>' +
    '<small style="color:#64748B">Arsip berguna untuk laporan historis. Ranking di dashboard tetap real-time.</small>',
    async()=>{
      showToast('Menyimpan arsip...','info',3000);
      try{
        const r=await callAPI('hitungRanking',{});
        showToast(r.message,'success',5000);
        loadRankingAdmin();
      } catch(e){showToast(e.message,'error');}
    },'💾 Simpan Arsip');
}

// ─────────────────────────────────────────────────────────────
// 6. SP ADMIN
// ─────────────────────────────────────────────────────────────
async function renderSPAdminFull(container) {
  container.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">⚠️ Surat Peringatan</h2>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormTambahSP()">+ Tambah Manual</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn btn--primary" onclick="loadSPAdmin('aktif')">SP Aktif</button>
      <button class="btn btn--ghost"   onclick="loadSPAdmin('semua')">Semua SP</button>
    </div>
    <div id="sp-admin-list">${skeletonCard(3)}</div>`;
  await loadSPAdmin('aktif');
}

async function loadSPAdmin(filter='aktif'){
  const el=document.getElementById('sp-admin-list');
  if(!el) return; el.innerHTML=skeletonCard(3);
  try{
    let data=await callAPI('getSPSemua',{});
    if(filter==='aktif') data=(data||[]).filter(s=>String(s.status_aktif).toLowerCase()==='true');
    if(!data||data.length===0){showEmpty('sp-admin-list','Tidak ada SP '+filter);return;}
    el.innerHTML=data.map(s=>`
      <div class="card" style="border-left:4px solid ${s.jenis_sp==='SP3'?'#E53E3E':s.jenis_sp==='SP2'?'#D97706':'#6C63FF'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-weight:700;padding:2px 10px;border-radius:20px;font-size:12px;
                background:${s.jenis_sp==='SP3'?'#FFF5F5':'#FFFAF0'};
                color:${s.jenis_sp==='SP3'?'#C53030':'#C05621'};border:1px solid currentColor">
                ${s.jenis_sp}</span>
              <span style="font-weight:700;font-size:15px">${s.nama_karyawan}</span>
            </div>
            <div style="font-size:12px;color:#64748B">
              📅 ${formatTanggal(s.tanggal_sp)} | Berlaku s/d ${formatTanggal(s.tanggal_kadaluarsa)}
            </div>
            <div style="font-size:12px;color:#64748B;margin-top:4px">${s.alasan}</div>
            <div style="font-size:11px;color:#94A3B8;margin-top:2px">
              Alfa: ${s.total_hari_alfa_pemicu} hari | Status: ${String(s.status_aktif).toLowerCase()==='true'?'✅ Aktif':'⏹ Kadaluarsa'}
            </div>
          </div>
          <button class="btn btn--outline" style="font-size:13px;padding:8px 14px;
            color:#E53E3E;border-color:#E53E3E" onclick="cetakSuratSP('${s.id_sp}')">
            🖨️ Cetak PDF</button>
        </div>
      </div>`).join('');
  }catch(e){showError('sp-admin-list',e.message);}
}

async function tampilFormTambahSP(){
  const kList = await _loadKaryawanDrop();
  const opts  = kList.map(k=>`<option value="${k.id_karyawan}">${k.nama_lengkap} — ${k.jabatan}</option>`).join('');
  const modal = document.createElement('div');
  modal.id = 'modal-sp-form';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
  modal.innerHTML = `<div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;animation:fadeInScale .2s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0">⚠️ Tambah SP Manual</h3>
      <button onclick="document.getElementById('modal-sp-form').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Pilih Karyawan *</label>
      <select class="form-control" id="sp-k-sel">
        <option value="">-- Pilih karyawan --</option>${opts}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Jenis SP *</label>
      <select class="form-control" id="sp-jns">
        <option value="SP1">SP1 — Peringatan Pertama (berlaku 1 bulan)</option>
        <option value="SP2">SP2 — Peringatan Kedua (berlaku 2 bulan)</option>
        <option value="SP3">SP3 — Peringatan Ketiga / PHK (berlaku 3 bulan)</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Alasan *</label>
      <textarea class="form-control" id="sp-alasan" rows="3" placeholder="Jelaskan alasan SP..."></textarea>
    </div>
    <div class="form-group"><label class="form-label">Total Hari Alfa Pemicu</label>
      <input type="number" class="form-control" id="sp-alfa" value="3" min="0">
    </div>
    <button class="btn btn--primary btn--full" onclick="submitSPManual()">
      <div class="spinner-btn"></div><span class="btn-text">⚠️ Terbitkan SP</span></button>
  </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>_makeSearchable('sp-k-sel'),100);
}

async function submitSPManual(){
  const btn = document.querySelector('#modal-sp-form .btn--primary');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  try{
    const idK = document.getElementById('sp-k-sel')?.value;
    const alasan = document.getElementById('sp-alasan')?.value?.trim();
    if(!idK) throw new Error('Pilih karyawan terlebih dahulu');
    if(!alasan) throw new Error('Alasan SP wajib diisi');
    const r=await callAPI('tambahSP',{
      id_karyawan:idK,
      jenis_sp:document.getElementById('sp-jns')?.value,
      alasan:alasan,
      total_hari_alfa:document.getElementById('sp-alfa')?.value||0
    });
    document.getElementById('modal-sp-form')?.remove();
    showToast(r.message,'success');loadSPAdmin('aktif');
  }catch(e){showToast(e.message,'error');}
  finally{if(btn){btn.disabled=false;btn.classList.remove('loading');}}
}

// ─────────────────────────────────────────────────────────────
// 7. PENGUMUMAN ADMIN
// ─────────────────────────────────────────────────────────────
async function renderPengumumanAdminFull(container) {
  container.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📢 Pengumuman</h2>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormPengumuman(null)">+ Tambah</button>
    </div>
    <div id="pengumuman-admin-list">${skeletonCard(3)}</div>`;
  await loadPengumumanAdmin();
}

async function loadPengumumanAdmin(){
  const el=document.getElementById('pengumuman-admin-list');
  if(!el) return; el.innerHTML=skeletonCard(3);
  try{
    const data=await callAPI('getPengumuman',{});
    if(!data||data.length===0){showEmpty('pengumuman-admin-list','Belum ada pengumuman');return;}
    el.innerHTML=data.map(p=>`
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span class="pengumuman-card__badge badge--${p.prioritas}">${p.prioritas}</span>
              <span style="font-weight:700;font-size:15px">${p.judul}</span>
            </div>
            <div style="font-size:13px;color:#475569;line-height:1.5;margin-bottom:6px">
              ${(p.isi||'').substring(0,120)}${(p.isi||'').length>120?'...':''}</div>
            <div style="font-size:11px;color:#94A3B8">
              📅 ${formatTanggal(p.tanggal_mulai)} – ${formatTanggal(p.tanggal_selesai)} | Target: ${p.target}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn--ghost" style="padding:6px 10px;font-size:12px"
              onclick="tampilFormPengumuman('${p.id_pengumuman}')">✏️</button>
            <button class="btn" style="padding:6px 10px;font-size:12px;background:#FFF5F5;
              color:#E53E3E;border:1px solid #FC8181"
              onclick="hapusPengumumanAdmin('${p.id_pengumuman}')">🗑️</button>
          </div>
        </div>
      </div>`).join('');
  }catch(e){showError('pengumuman-admin-list',e.message);}
}

function tampilFormPengumuman(idEdit){
  const modal=document.createElement('div');
  modal.id='modal-peng';
  modal.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;
    display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)`;
  const today=new Date().toISOString().split('T')[0];
  modal.innerHTML=`<div style="background:#fff;border-radius:16px;padding:24px;width:100%;
    max-width:500px;max-height:90vh;overflow-y:auto;animation:fadeInScale .2s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0">${idEdit?'✏️ Edit':'➕ Tambah'} Pengumuman</h3>
      <button onclick="document.getElementById('modal-peng').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
    </div>
    <div class="form-group"><label class="form-label">Judul *</label>
      <input type="text" class="form-control" id="pg-judul" placeholder="Judul pengumuman"></div>
    <div class="form-group"><label class="form-label">Isi *</label>
      <textarea class="form-control" id="pg-isi" rows="4" placeholder="Isi pengumuman..."></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Prioritas</label>
        <select class="form-control" id="pg-pri">
          <option value="normal">Normal</option><option value="penting">Penting</option><option value="urgent">Urgent</option>
        </select></div>
      <div class="form-group"><label class="form-label">Target</label>
        <select class="form-control" id="pg-tgt">
          <option value="semua">Semua Karyawan</option></select></div>
      <div class="form-group"><label class="form-label">Mulai *</label>
        <input type="date" class="form-control" id="pg-mul" value="${today}"></div>
      <div class="form-group"><label class="form-label">Selesai *</label>
        <input type="date" class="form-control" id="pg-sel"
          value="${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}"></div>
    </div>
    <button class="btn btn--primary btn--full" onclick="submitPengumuman('${idEdit||''}')">
      <div class="spinner-btn"></div><span class="btn-text">💾 Simpan</span></button>
  </div>`;
  document.body.appendChild(modal);
}

async function submitPengumuman(idEdit){
  const btn=document.querySelector('#modal-peng .btn--primary');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  try{
    const payload={
      judul:document.getElementById('pg-judul')?.value?.trim(),
      isi:document.getElementById('pg-isi')?.value?.trim(),
      prioritas:document.getElementById('pg-pri')?.value,
      target:document.getElementById('pg-tgt')?.value,
      tanggal_mulai:fromInputDate(document.getElementById('pg-mul')?.value),
      tanggal_selesai:fromInputDate(document.getElementById('pg-sel')?.value)
    };
    if(!payload.judul||!payload.isi) throw new Error('Judul dan isi wajib diisi');
    if(idEdit)payload.id_pengumuman=idEdit;
    const r=await callAPI(idEdit?'editPengumuman':'tambahPengumuman',payload);
    document.getElementById('modal-peng')?.remove();
    showToast(r.message||'Tersimpan ✅','success');
    loadPengumumanAdmin();
  }catch(e){showToast(e.message,'error');}
  finally{if(btn){btn.disabled=false;btn.classList.remove('loading');}}
}
function hapusPengumumanAdmin(id){
  showModal('🗑️ Hapus?','Pengumuman akan dihapus permanen.',
    async()=>{const r=await callAPI('hapusPengumuman',{id_pengumuman:id});showToast(r.message,'success');loadPengumumanAdmin();}
  ,'🗑️ Hapus');
}

// ─────────────────────────────────────────────────────────────
// 8. LOKASI KANTOR
// ─────────────────────────────────────────────────────────────
async function renderLokasiAdminV3(container) {
  container.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📍 Lokasi Kantor & GPS</h2>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormLokasiV3(null)">+ Tambah</button>
    </div>
    <div class="card" style="padding:12px;background:#EFF6FF;margin-bottom:12px">
      <p style="font-size:13px;color:#2D6CDF;margin:0;line-height:1.7">
        💡 <strong>Cara mendapat koordinat:</strong><br>
        Buka <a href="https://maps.google.com" target="_blank">Google Maps</a> → Klik titik kantor →
        Koordinat muncul di bawah. Contoh: <strong>-1.4748, 120.5116</strong><br>
        Atau gunakan tombol 📍 pada form untuk otomatis ambil koordinat saat ini.
      </p>
    </div>
    <div id="lokasi-list">${skeletonCard(2)}</div>`;
  await loadLokasiListAdmin();
}

async function loadLokasiListAdmin(){
  const el=document.getElementById('lokasi-list');
  if(!el) return;
  try{
    const data=await callAPI('getLokasi',{});
    if(!data||data.length===0){
      el.innerHTML=`<div class="card" style="text-align:center;padding:32px;color:#94A3B8">
        <div style="font-size:40px;margin-bottom:8px">📍</div>Belum ada lokasi.
        <button class="btn btn--primary" style="margin-top:12px" onclick="tampilFormLokasiV3(null)">+ Tambah</button>
      </div>`;return;
    }
    el.innerHTML=data.map(l=>`
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:20px">📍</span>
              <span style="font-weight:700;font-size:16px">${l.nama_lokasi}</span>
              <span style="background:${String(l.status_aktif).toLowerCase()==='true'?'#EBF8EE':'#F1F5F9'};
                color:${String(l.status_aktif).toLowerCase()==='true'?'#1A9E74':'#94A3B8'};
                font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600">
                ${String(l.status_aktif).toLowerCase()==='true'?'✅ Aktif':'⏹ Non-aktif'}</span>
            </div>
            <div style="font-family:monospace;font-size:13px;color:#475569;background:#F8FAFC;
              padding:6px 10px;border-radius:6px;display:inline-block;margin-bottom:4px">
              Lat: ${l.latitude} | Lon: ${l.longitude}
            </div>
            <div style="font-size:14px;color:#2D6CDF;font-weight:600;margin:4px 0">
              ⭕ Radius: <strong>${l.radius_meter} meter</strong>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
              <a href="https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}"
                target="_blank" class="btn btn--ghost" style="padding:6px 12px;font-size:12px">🗺️ Maps</a>
              <button class="btn btn--ghost" style="padding:6px 12px;font-size:12px"
                onclick="testGPSLokasi(${l.latitude},${l.longitude},${l.radius_meter},'${l.nama_lokasi}')">
                📡 Test GPS</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn btn--primary" style="padding:8px 14px;font-size:13px"
              onclick="tampilFormLokasiV3(${JSON.stringify(l).replace(/"/g,'&quot;')})">✏️ Edit</button>
            <button class="btn btn--danger" style="padding:8px 14px;font-size:13px"
              onclick="hapusLokasiAdmin('${l.id_lokasi}','${l.nama_lokasi}')">🗑️</button>
          </div>
        </div>
      </div>`).join('');
  }catch(e){showError('lokasi-list',e.message);}
}

function tampilFormLokasiV3(lk){
  const isEdit=!!lk?.id_lokasi;
  const modal=document.createElement('div');
  modal.id='modal-lok';
  modal.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;
    display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)`;
  modal.innerHTML=`<div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:480px;animation:fadeInScale .2s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0">${isEdit?'✏️ Edit':'➕ Tambah'} Lokasi Kantor</h3>
      <button onclick="document.getElementById('modal-lok').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
    </div>
    <div id="lok-err" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
      border-radius:8px;padding:10px;color:#C53030;font-size:13px;margin-bottom:12px"></div>
    <div class="form-group"><label class="form-label">Nama Lokasi *</label>
      <input type="text" class="form-control" id="lok-nama" value="${lk?.nama_lokasi||''}"
        placeholder="Contoh: Kantor Pusat"></div>
    <button class="btn btn--ghost btn--full" style="margin-bottom:12px;font-size:13px"
      onclick="ambilGPSSekarang()">📍 Gunakan GPS Lokasi Saya Sekarang</button>
    <div id="gps-ambil-status" style="display:none;text-align:center;padding:8px;font-size:13px;color:#2D6CDF">
      ⏳ Mendapatkan koordinat...</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Latitude *</label>
        <input type="text" class="form-control" id="lok-lat" value="${lk?.latitude||''}"
          placeholder="-5.1477"><p class="form-hint">Negatif = Selatan</p></div>
      <div class="form-group"><label class="form-label">Longitude *</label>
        <input type="text" class="form-control" id="lok-lon" value="${lk?.longitude||''}"
          placeholder="119.4328"><p class="form-hint">Positif = Timur</p></div>
    </div>
    <div class="form-group"><label class="form-label">Radius Absensi (meter) *</label>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="range" id="lok-radius-sl" min="10" max="1000" step="10"
          value="${lk?.radius_meter||100}" style="flex:1;padding:0"
          oninput="document.getElementById('lok-radius').value=this.value;document.getElementById('lok-radius-lbl').textContent=this.value+'m'">
        <input type="number" class="form-control" id="lok-radius" value="${lk?.radius_meter||100}"
          min="10" max="5000" style="width:80px"
          oninput="document.getElementById('lok-radius-sl').value=this.value;document.getElementById('lok-radius-lbl').textContent=this.value+'m'">
        <span id="lok-radius-lbl" style="font-size:14px;font-weight:700;color:#2D6CDF;min-width:48px">
          ${lk?.radius_meter||100}m</span>
      </div>
      <p class="form-hint">Rekomendasi 50–200 meter</p></div>
    <div class="form-group"><label class="form-label">Status</label>
      <select class="form-control" id="lok-status">
        <option value="true" ${String(lk?.status_aktif).toLowerCase()==='true'?'selected':''}>✅ Aktif</option>
        <option value="false" ${String(lk?.status_aktif).toLowerCase()==='false'?'selected':''}>⏹ Non-aktif</option>
      </select></div>
    <div class="form-group"><label class="form-label">Keterangan</label>
      <input type="text" class="form-control" id="lok-ket" value="${lk?.keterangan||''}"></div>
    <button class="btn btn--primary btn--full btn--lg" onclick="simpanLokasiAdmin('${lk?.id_lokasi||''}')">
      <div class="spinner-btn"></div><span class="btn-text">💾 Simpan Lokasi</span></button>
  </div>`;
  document.body.appendChild(modal);
}

async function ambilGPSSekarang(){
  const st=document.getElementById('gps-ambil-status');
  if(st)st.style.display='block';
  try{
    const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000}));
    document.getElementById('lok-lat').value=pos.coords.latitude.toFixed(6);
    document.getElementById('lok-lon').value=pos.coords.longitude.toFixed(6);
    showToast(`✅ Koordinat: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,'success');
  }catch(e){showToast('GPS gagal: '+e.message,'error');}
  finally{if(st)st.style.display='none';}
}

async function simpanLokasiAdmin(idLokasi){
  const btn=document.querySelector('#modal-lok .btn--primary');
  const err=document.getElementById('lok-err');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  if(err)err.style.display='none';
  try{
    const nama=document.getElementById('lok-nama')?.value?.trim();
    const lat=document.getElementById('lok-lat')?.value?.trim();
    const lon=document.getElementById('lok-lon')?.value?.trim();
    const radius=document.getElementById('lok-radius')?.value;
    if(!nama) throw new Error('Nama lokasi wajib diisi');
    if(!lat||isNaN(parseFloat(lat))) throw new Error('Latitude tidak valid. Contoh: -5.1477');
    if(!lon||isNaN(parseFloat(lon))) throw new Error('Longitude tidak valid. Contoh: 119.4328');
    if(parseFloat(lat)===0&&parseFloat(lon)===0) throw new Error('Koordinat 0,0 tidak valid. Isi koordinat yang benar.');
    const payload={nama_lokasi:nama,latitude:parseFloat(lat),longitude:parseFloat(lon),
      radius_meter:parseInt(radius||100),
      status_aktif:document.getElementById('lok-status')?.value,
      keterangan:document.getElementById('lok-ket')?.value?.trim()};
    if(idLokasi)payload.id_lokasi=idLokasi;
    const r=await callAPI(idLokasi?'editLokasi':'tambahLokasi',payload);
    document.getElementById('modal-lok')?.remove();
    showToast(r.message||'Lokasi disimpan ✅','success');
    loadLokasiListAdmin();
  }catch(e){if(err){err.style.display='block';err.textContent='⚠️ '+e.message;}else showToast(e.message,'error');}
  finally{if(btn){btn.disabled=false;btn.classList.remove('loading');}}
}

function hapusLokasiAdmin(id,nama){
  showModal('🗑️ Hapus Lokasi?',`Hapus <strong>${nama}</strong>? Karyawan tidak bisa absen dari lokasi ini.`,
    async()=>{const r=await callAPI('hapusLokasi',{id_lokasi:id});showToast(r.message,'success');loadLokasiListAdmin();},'🗑️ Hapus');
}

async function testGPSLokasi(lat,lon,radius,nama){
  showToast('Mendapatkan GPS Anda...','info',3000);
  try{
    const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000}));
    const jarak=hitungJarak(pos.coords.latitude,pos.coords.longitude,parseFloat(lat),parseFloat(lon));
    const dlm=jarak<=parseInt(radius);
    showModal('📡 Hasil Test GPS',`<div style="text-align:center;padding:12px">
      <div style="font-size:48px;margin-bottom:12px">${dlm?'✅':'❌'}</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:${dlm?'#1A9E74':'#E53E3E'}">
        ${dlm?'DALAM RADIUS — Bisa Absen':'DI LUAR RADIUS — Tidak Bisa Absen'}</div>
      <div style="font-size:13px;color:#64748B;line-height:2">
        Lokasi: <strong>${nama}</strong><br>
        Jarak: <strong style="color:${dlm?'#1A9E74':'#E53E3E'}">${Math.round(jarak)} meter</strong><br>
        Radius max: <strong>${radius} meter</strong><br>
        Akurasi GPS Anda: ±${Math.round(pos.coords.accuracy||0)} meter
      </div>
      ${!dlm?`<div style="background:#FFF5F5;border-radius:8px;padding:10px;margin-top:12px;font-size:12px;color:#C53030">
        💡 Solusi: Perbesar radius menjadi ${Math.ceil(jarak/10)*10} meter atau lebih</div>`:''}
    </div>`);
  }catch(e){showToast('GPS gagal: '+e.message,'error');}
}

// ─────────────────────────────────────────────────────────────
// 9. SHIFT & JADWAL
// ─────────────────────────────────────────────────────────────
async function renderShiftJadwalAdmin(container) {
  const kList=await _loadKaryawanDrop();
  const now=new Date();
  const day=now.getDay(), diff=day===0?-6:1-day;
  const senin=new Date(now); senin.setDate(now.getDate()+diff);
  const minggu=new Date(senin); minggu.setDate(senin.getDate()+6);
  const fmt=d=>d.toISOString().split('T')[0];

  container.innerHTML=`
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">🕐 Shift & Jadwal</h2>
    <div class="card" style="background:#F0FFF4;border-left:4px solid #1A9E74;margin-bottom:16px">
      <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:#1A9E74">📋 Pola Rotasi Otomatis</h4>
      <div style="font-size:12px;color:#475569;line-height:1.8">
        <strong>Jam:</strong> Pagi 07:00–15:00 | Sore 15:00–23:00 | Malam 23:00–07:00<br>
        <strong>Pola:</strong> P→S→M→S→P→M (siklus 6 hari, setiap karyawan berbeda offset)<br>
        <strong>Libur:</strong> 1 hari per 14 hari, posisi acak, min selang 4 hari antar karyawan<br>
        <strong>Lanjut:</strong> Generate periode berikutnya menerus (tidak mengulang dari awal)
      </div>
    </div>
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">⚡ Generate Jadwal Otomatis</h3>
      <div class="form-group">
        <label class="form-label">Pilih Karyawan</label>
        <div id="k-shift-list" style="border:1px solid #E2E8F0;border-radius:8px;
          max-height:200px;overflow-y:auto;padding:8px">
          ${kList.map(k=>`<label style="display:flex;align-items:center;gap:10px;
            padding:8px;border-radius:6px;cursor:pointer">
            <input type="checkbox" value="${k.id_karyawan}" style="width:16px;height:16px;cursor:pointer">
            <div><div style="font-size:13px;font-weight:600">${k.nama_lengkap}</div>
            <div style="font-size:11px;color:#64748B">${k.jabatan}</div></div></label>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="btn btn--ghost" style="font-size:12px;padding:6px 12px"
            onclick="document.querySelectorAll('#k-shift-list input').forEach(c=>c.checked=true)">☑️ Semua</button>
          <button class="btn btn--ghost" style="font-size:12px;padding:6px 12px"
            onclick="document.querySelectorAll('#k-shift-list input').forEach(c=>c.checked=false)">☐ Hapus</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label class="form-label">Dari Tanggal *</label>
          <input type="date" class="form-control" id="jdw-mul" value="${fmt(senin)}"></div>
        <div class="form-group"><label class="form-label">Sampai Tanggal *</label>
          <input type="date" class="form-control" id="jdw-sel" value="${fmt(minggu)}"></div>
      </div>
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label" style="margin-bottom:6px">Mode Generate</label>
        <div style="display:flex;gap:12px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="radio" name="jdw-mode" value="continue" checked
              style="width:15px;height:15px;cursor:pointer">
            <div>
              <div style="font-weight:600;color:#1A9E74">🔄 Lanjutkan</div>
              <div style="font-size:11px;color:#64748B">Teruskan dari jadwal terakhir</div>
            </div>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="radio" name="jdw-mode" value="fresh"
              style="width:15px;height:15px;cursor:pointer">
            <div>
              <div style="font-weight:600;color:#D97706">🆕 Baru</div>
              <div style="font-size:11px;color:#64748B">Mulai dari awal (acak offset)</div>
            </div>
          </label>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px">
        <button class="btn btn--primary btn--lg" onclick="generateJadwalAdmin()">
          <div class="spinner-btn"></div><span class="btn-text">⚡ Generate Jadwal</span></button>
        <button class="btn btn--ghost btn--lg" onclick="resetJadwalAdmin()"
          style="border:1px solid #DC2626;color:#DC2626">
          🗑️ Reset
        </button>
      </div>
    </div>
    <div id="jadwal-preview" style="display:none" class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">📅 Hasil Generate</h3>
      <div id="jadwal-preview-content"></div>
    </div>
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">📋 Jadwal Berjalan</h3>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <input type="date" class="form-control" id="jdw-view-mul" value="${fmt(senin)}" style="width:160px">
        <input type="date" class="form-control" id="jdw-view-sel" value="${fmt(minggu)}" style="width:160px">
        <button class="btn btn--secondary" onclick="loadJadwalAdmin()">🔍 Tampilkan</button>
      </div>
      <div id="jadwal-list">${skeletonCard(2)}</div>
    </div>`;
  loadJadwalAdmin();
}

async function generateJadwalAdmin(){
  const btn=document.querySelector('.admin-content .btn--primary.btn--lg');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  try{
    const ids=Array.from(document.querySelectorAll('#k-shift-list input:checked')).map(c=>c.value);
    if(!ids.length) throw new Error('Pilih minimal 1 karyawan');
    const mul=fromInputDate(document.getElementById('jdw-mul')?.value);
    const sel=fromInputDate(document.getElementById('jdw-sel')?.value);
    if(!mul||!sel) throw new Error('Tanggal mulai dan selesai wajib diisi');
    const modeEl=document.querySelector('input[name="jdw-mode"]:checked');
    const mode=modeEl?modeEl.value:'continue';
    const r=await callAPI('generateJadwal',{karyawan_ids:ids,tanggal_mulai:mul,tanggal_selesai:sel,mode:mode});
    showToast(r.message,'success',5000);
    const pv=document.getElementById('jadwal-preview');
    const pc=document.getElementById('jadwal-preview-content');
    if(pv&&pc){
      pv.style.display='block';
      _renderPreviewJadwal(pc,r.jadwal,r.peserta);
    }
    loadJadwalAdmin();
  }catch(e){showToast(e.message,'error');}
  finally{if(btn){btn.disabled=false;btn.classList.remove('loading');}}
}

function _renderPreviewJadwal(el,jadwal,peserta){
  if(!jadwal||!jadwal.length) return;
  const byTgl={};
  jadwal.forEach(j=>{if(!byTgl[j.tanggal])byTgl[j.tanggal]=[];byTgl[j.tanggal].push(j);});

  // Sort tanggal KRONOLOGIS (bukan alphabetical "25/04" vs "01/05")
  const tanggals=Object.keys(byTgl).sort((a,b)=>{
    const pa=a.split('/'); const pb=b.split('/');
    const da=new Date(+pa[2],+pa[1]-1,+pa[0]);
    const db=new Date(+pb[2],+pb[1]-1,+pb[0]);
    return da-db;
  });

  const KC={'P':'#1A9E74','S':'#D97706','M':'#6C63FF','L':'#94A3B8'};
  el.innerHTML=`<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:11px;width:100%;min-width:600px">
    <thead><tr style="background:#F8FAFC">
      <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #E2E8F0;position:sticky;left:0;background:#F8FAFC;z-index:1">Karyawan</th>
      ${tanggals.map(t=>{
        const p=t.split('/'); const d=new Date(+p[2],+p[1]-1,+p[0]);
        const hari=['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d.getDay()];
        return `<th style="padding:4px 6px;text-align:center;border-bottom:1px solid #E2E8F0;font-weight:600;color:#475569">
          <div style="font-size:10px;color:#94A3B8">${hari}</div>
          <div>${p[0]}/${p[1]}</div></th>`;
      }).join('')}
    </tr></thead><tbody>
    ${(peserta||[]).map(k=>`<tr>
      <td style="padding:6px 8px;font-weight:600;font-size:12px;white-space:nowrap;border-bottom:1px solid #F1F5F9;position:sticky;left:0;background:#fff;z-index:1">${(k.nama||'').split(' ')[0]}</td>
      ${tanggals.map(t=>{
        const e=byTgl[t]?.find(j=>j.id_karyawan===k.id);
        const kode=e?.kode||'-'; const c=KC[kode]||'#CBD5E1';
        return `<td style="text-align:center;padding:4px 2px;border-bottom:1px solid #F1F5F9">
          <span style="display:inline-block;background:${c}22;color:${c};border:1px solid ${c}55;
            padding:1px 6px;border-radius:4px;font-weight:700;font-size:10px;min-width:18px">${kode}</span></td>`;
      }).join('')}
    </tr>`).join('')}
    </tbody></table></div>
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;font-size:11px">
      ${Object.entries(KC).map(([k,c])=>`<span style="background:${c}22;color:${c};
        border:1px solid ${c}55;padding:2px 8px;border-radius:4px;font-weight:600">
        ${k} = ${k==='P'?'Pagi':k==='S'?'Sore':k==='M'?'Malam':'Libur'}</span>`).join('')}
    </div>`;
}

async function resetJadwalAdmin(){
  const mulV = document.getElementById('jdw-mul')?.value || document.getElementById('jdw-view-mul')?.value;
  const selV = document.getElementById('jdw-sel')?.value || document.getElementById('jdw-view-sel')?.value;
  if(!mulV||!selV){showToast('Isi rentang tanggal dulu','warning');return;}
  showModal('🗑️ Reset Jadwal?',
    `Hapus semua jadwal dari <strong>${mulV}</strong> s/d <strong>${selV}</strong>?<br>
    Data jadwal akan dihapus permanen. Tidak bisa dibatalkan.`,
    async()=>{
      const r=await callAPI('resetJadwal',{
        tanggal_mulai:fromInputDate(mulV),tanggal_selesai:fromInputDate(selV),karyawan_ids:[]
      });
      showToast(r.message,'success');loadJadwalAdmin();
    },'🗑️ Reset Jadwal');
}

async function loadJadwalAdmin(){
  const el=document.getElementById('jadwal-list');
  if(!el) return; el.innerHTML=skeletonCard(2);
  try{
    const mulEl = document.getElementById('jdw-view-mul');
    const selEl = document.getElementById('jdw-view-sel');
    const todayStr = new Date().toISOString().split('T')[0];
    const mul=fromInputDate(mulEl?.value||todayStr);
    const sel=fromInputDate(selEl?.value||todayStr);
    const data=await callAPI('getJadwalSemua',{tanggal_mulai:mul,tanggal_selesai:sel});
    if(!data||data.length===0){
      el.innerHTML=`<div style="text-align:center;padding:24px;color:#94A3B8;font-size:13px">
        Belum ada jadwal. Generate di atas.</div>`;return;
    }

    // Matrix view: karyawan x tanggal
    const KC={'P':'#1A9E74','S':'#D97706','M':'#6C63FF','L':'#94A3B8','-':'#CBD5E1'};
    const byK={};       // id_karyawan -> { nama, byTgl: { 'dd/mm/yyyy': kode } }
    const tglSet=new Set();

    data.forEach(j=>{
      if(!byK[j.id_karyawan]) byK[j.id_karyawan]={nama:j.nama_karyawan,byTgl:{}};
      byK[j.id_karyawan].byTgl[j.tanggal]=j.kode;
      tglSet.add(j.tanggal);
    });

    // Sort tanggal kronologis
    const tanggals=Array.from(tglSet).sort((a,b)=>{
      const pa=a.split('/'); const pb=b.split('/');
      return new Date(+pa[2],+pa[1]-1,+pa[0])-new Date(+pb[2],+pb[1]-1,+pb[0]);
    });

    const karyawanIds=Object.keys(byK).sort((a,b)=>byK[a].nama.localeCompare(byK[b].nama));

    el.innerHTML=`
      <div style="overflow-x:auto;border:1px solid #E2E8F0;border-radius:8px">
        <table style="border-collapse:collapse;width:100%;min-width:520px;font-size:11px">
          <thead><tr style="background:#F8FAFC">
            <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #E2E8F0;
              position:sticky;left:0;background:#F8FAFC;z-index:1;font-weight:700;color:#475569">Karyawan</th>
            ${tanggals.map(t=>{
              const p=t.split('/'); const d=new Date(+p[2],+p[1]-1,+p[0]);
              const hari=['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d.getDay()];
              return `<th style="padding:4px 4px;text-align:center;border-bottom:1px solid #E2E8F0;font-weight:600;color:#475569">
                <div style="font-size:10px;color:#94A3B8">${hari}</div>
                <div>${p[0]}/${p[1]}</div></th>`;
            }).join('')}
          </tr></thead>
          <tbody>
            ${karyawanIds.map(id=>{
              const k=byK[id];
              const namaShort=(k.nama||'').split(' ').slice(0,2).join(' ');
              return `<tr>
                <td style="padding:6px 8px;font-weight:600;font-size:12px;white-space:nowrap;
                  border-bottom:1px solid #F1F5F9;position:sticky;left:0;background:#fff;z-index:1">${namaShort}</td>
                ${tanggals.map(t=>{
                  const kode=k.byTgl[t]||'L';
                  const c=KC[kode]||'#CBD5E1';
                  return `<td style="text-align:center;padding:4px 2px;border-bottom:1px solid #F1F5F9">
                    <span style="display:inline-block;background:${c}22;color:${c};border:1px solid ${c}55;
                      padding:1px 6px;border-radius:4px;font-weight:700;font-size:10px;min-width:18px">${kode}</span>
                  </td>`;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;font-size:11px">
        ${[['P','Pagi','#1A9E74'],['S','Sore','#D97706'],['M','Malam','#6C63FF'],['L','Libur','#94A3B8']]
          .map(([k,n,c])=>`<span style="background:${c}22;color:${c};border:1px solid ${c}55;
            padding:2px 8px;border-radius:4px;font-weight:600">${k} = ${n}</span>`).join('')}
      </div>`;
  }catch(e){showError('jadwal-list',e.message);}
}

// ─────────────────────────────────────────────────────────────
// 10. DEVICE RESET
// ─────────────────────────────────────────────────────────────
async function renderDeviceAdmin(container) {
  container.innerHTML=`
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">📱 Reset Perangkat Karyawan</h2>
    <div class="card" style="padding:12px;background:#EFF6FF;margin-bottom:12px">
      <p style="font-size:13px;color:#2D6CDF;margin:0">
        💡 Gunakan fitur ini jika karyawan ganti HP atau tidak bisa login karena "perangkat lain".
        Setelah reset, karyawan bisa login dari HP baru.
      </p>
    </div>
    <div id="device-list">${skeletonCard(3)}</div>`;
  await loadDeviceListAdmin();
}

async function loadDeviceListAdmin(){
  const el=document.getElementById('device-list');
  if(!el) return;
  try{
    const data=await callAPI('getDeviceList',{});
    const aktif=(data||[]).filter(d=>String(d.status).toLowerCase()==='aktif');
    if(!aktif.length){showEmpty('device-list','Tidak ada perangkat terdaftar');return;}
    el.innerHTML=`<div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table">
        <thead><tr><th>Karyawan</th><th>Perangkat</th><th>Tgl Daftar</th><th style="text-align:center">Aksi</th></tr></thead>
        <tbody>
          ${aktif.map(d=>`<tr>
            <td style="font-weight:600">${d.nama_karyawan}</td>
            <td style="font-size:12px">${d.device_info||'-'}</td>
            <td style="font-size:12px">${formatTanggal(String(d.tgl_daftar||'').split(' ')[0])}</td>
            <td style="text-align:center">
              <button class="btn btn--danger" style="padding:6px 12px;font-size:12px"
                onclick="resetDeviceAdmin('${d.id_karyawan}','${d.nama_karyawan}')">🔄 Reset</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }catch(e){showError('device-list',e.message);}
}

function resetDeviceAdmin(id,nama){
  showModal('🔄 Reset Perangkat?',
    `Reset perangkat <strong>${nama}</strong>? Karyawan harus login ulang dari HP baru.`,
    async()=>{
      const r=await callAPI('resetDevice',{id_karyawan:id});showToast(r.message,'success');loadDeviceListAdmin();
    },'🔄 Reset');
}

// ─────────────────────────────────────────────────────────────
// 11. PENGATURAN SISTEM
// ─────────────────────────────────────────────────────────────
async function loadPengaturanAdminV3(){
  const el=document.getElementById('pengaturan-container');
  if(!el) return; el.innerHTML=skeletonCard(4);
  try{
    const data=await callAPI('getAllSetting',{});
    const map={}; (data||[]).forEach(s=>{map[s.key]=s.value;});
    el.innerHTML=`
      <div id="peng-err" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
        border-radius:8px;padding:12px;color:#C53030;font-size:13px;margin-bottom:12px"></div>
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:16px">🏢 Identitas Instansi</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${_si('nama_instansi','Nama Instansi',map)}${_si('singkatan_instansi','Singkatan',map)}
          ${_si('alamat_instansi','Alamat',map)}${_si('telepon_instansi','Telepon',map)}
          ${_si('email_instansi','Email',map,'email')}${_si('website_instansi','Website',map,'url')}
          ${_si('tahun_berdiri','Tahun Berdiri',map,'number')}${_si('footer_text','Footer',map)}
        </div>
      </div>
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:14px">🎨 Branding & Tampilan</h3>
        <div style="background:#FFF8DC;border-radius:8px;padding:12px;font-size:12px;
          color:#B7791F;margin-bottom:14px;line-height:1.7">
          📌 <strong>Upload logo/background ke Google Drive:</strong><br>
          1. Upload gambar → Klik kanan → Share → "Anyone with link can view"<br>
          2. Copy link → paste di bawah. Sistem otomatis konversi ke URL yang bisa tampil.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${_sc2('warna_primer','Warna Primer',map)}${_sc2('warna_sekunder','Warna Sekunder',map)}
        </div>
        ${_siUrl('logo_url','URL Logo Instansi',map)}
        ${_siUrl('bg_dashboard_karyawan_url','Background Karyawan',map)}
        ${_siUrl('bg_dashboard_admin_url','Background Admin',map)}
        ${_siUrl('bg_dashboard_superadmin_url','Background Super Admin',map)}
      </div>
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:16px">📋 Kebijakan Kehadiran</h3>
        <div style="background:#EFF6FF;border-radius:8px;padding:10px 12px;font-size:12px;color:#2D6CDF;margin-bottom:14px;line-height:1.7">
          ⏰ <strong>Aturan jam berlaku untuk semua karyawan termasuk shift & dinas luar</strong><br>
          Absen dibuka <strong>batas_awal_absen</strong> menit sebelum jam masuk, tutup <strong>batas_terlambat</strong> menit setelahnya.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${_si('jam_masuk_default','Jam Masuk Default',map,'time')}
          ${_si('jam_keluar_default','Jam Keluar Default',map,'time')}
          ${_si('batas_awal_absen_menit','Buka Absen Sebelum Jam Masuk (menit)',map,'number')}
          ${_si('toleransi_terlambat_menit','Toleransi Terlambat (menit)',map,'number')}
          ${_si('batas_absen_masuk_menit','Batas Maks Terlambat (menit)',map,'number')}
          ${_si('max_radius_meter','Radius GPS Maks (meter)',map,'number')}
          ${_si('sisa_cuti_default_per_tahun','Default Cuti/Tahun (hari)',map,'number')}
        </div>
        <div class="form-group" style="margin-top:12px">
          <label class="form-label">Template Ucapan Ulang Tahun</label>
          <textarea class="form-control" id="set-ucapan_ulang_tahun_template" rows="3">
${map['ucapan_ulang_tahun_template']||''}</textarea>
          <p class="form-hint">Gunakan {nama} dan {umur} sebagai placeholder</p>
        </div>
        <div class="form-group">
          <label class="form-label">One-Device Login</label>
          <select class="form-control" id="set-aktif_one_device_login">
            <option value="true" ${String(map['aktif_one_device_login']).toLowerCase()==='true'?'selected':''}>
              ✅ Aktif — 1 akun hanya bisa login dari 1 HP</option>
            <option value="false" ${String(map['aktif_one_device_login']).toLowerCase()==='false'?'selected':''}>
              ❌ Nonaktif — Bebas login dari mana saja</option>
          </select>
        </div>
      </div>

      <!-- ICON & PWA -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:14px">📱 Icon Aplikasi & PWA</h3>
        <div style="background:#EFF6FF;border-radius:8px;padding:12px;font-size:12px;
          color:#2D6CDF;margin-bottom:14px;line-height:1.7">
          📌 <strong>Cara atur icon & favicon:</strong><br>
          1. Upload gambar ke Google Drive (PNG, min 512×512 piksel)<br>
          2. Klik kanan → Share → "Anyone with link can view" → Copy link<br>
          3. Paste URL di kolom di bawah. Sistem otomatis konversi ke format yang bisa tampil.<br>
          4. Untuk icon PWA, upload file icon ke folder <code>icons/</code> di GitHub.
        </div>
        ${_siUrl('favicon_url','URL Favicon (ikon tab browser)',map)}
        ${_siUrl('icon_512_url','URL Icon Aplikasi 512×512 (ikon PWA)',map)}
        <div style="background:#F0FFF4;border-radius:8px;padding:10px;font-size:12px;color:#276749;margin-top:8px">
          💡 Setelah simpan, muat ulang halaman untuk melihat perubahan icon.
        </div>
      </div>

      <!-- HALAMAN LOGIN -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:14px">🔐 Halaman Login</h3>
        ${_siUrl('bg_login_url','Background Halaman Login',map)}
        <div class="form-group">
          <label class="form-label">Teks Sambutan Login</label>
          <input type="text" class="form-control" id="set-login_subtitle"
            value="${map['login_subtitle']||'Masuk dengan akun karyawan Anda'}"
            placeholder="Masuk dengan akun karyawan Anda">
        </div>
      </div>

      <button class="btn btn--primary btn--lg btn--full" onclick="simpanPengaturanAdmin()">
        <div class="spinner-btn"></div><span class="btn-text">💾 Simpan Semua Pengaturan</span></button>`;
  }catch(e){showError('pengaturan-container',e.message);}
}

function _si(key,label,map,type='text'){
  return `<div class="form-group" style="margin-bottom:0">
    <label class="form-label">${label}</label>
    <input type="${type}" class="form-control" id="set-${key}" value="${map[key]||''}">
  </div>`;
}
function _sc2(key,label,map){
  const val=map[key]||'#2D6CDF';
  return `<div class="form-group" style="margin-bottom:0">
    <label class="form-label">${label}</label>
    <div style="display:flex;gap:8px;align-items:center">
      <input type="color" id="set-${key}-color" value="${val}"
        style="width:44px;height:38px;border:1px solid #E2E8F0;border-radius:6px;cursor:pointer;padding:2px"
        oninput="document.getElementById('set-${key}').value=this.value">
      <input type="text" class="form-control" id="set-${key}" value="${val}" style="flex:1"
        oninput="document.getElementById('set-${key}-color').value=this.value">
    </div></div>`;
}
function _siUrl(key, label, map) {
  const val     = map[key] || '';
  const normUrl = val ? normalizeDriveUrlFrontend(val) : '';
  return `<div class="form-group">
    <label class="form-label">${label}</label>
    <input type="hidden" id="set-${key}" value="${val}">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <label for="file-${key}" style="display:inline-flex;align-items:center;gap:6px;
        background:#2D6CDF;color:#fff;padding:8px 14px;border-radius:8px;
        cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap">
        📁 Pilih File
        <input type="file" id="file-${key}" accept="image/*"
          style="display:none" onchange="_uploadAsset(this,'${key}')">
      </label>
      <span id="stt-${key}" style="font-size:12px;color:#64748B">
        ${val ? '✅ Sudah ada file' : '⬜ Belum ada'}
      </span>
    </div>
    <div id="${key}-prev" style="margin-top:8px;display:${val?'block':'none'}">
      <img src="${normUrl}" style="max-height:70px;max-width:100%;border-radius:6px;
        border:1px dashed #CBD5E0;object-fit:cover"
        onerror="this.style.display='none'" onload="this.style.display='block'">
    </div>
  </div>`;
}

async function _uploadAsset(input, key) {
  const file = input.files[0];
  if (!file) return;
  const stt = document.getElementById('stt-' + key);
  if (stt) stt.textContent = '⏳ Mengupload...';
  try {
    const base64 = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    const result = await callAPI('uploadAsset', {
      base64: base64,
      fileName: key + '_' + Date.now() + '.' + file.name.split('.').pop(),
      mimeType: file.type || 'image/jpeg'
    });
    if (!result || !result.url) throw new Error('Upload gagal');
    // Simpan URL ke hidden input
    const hidden = document.getElementById('set-' + key);
    if (hidden) hidden.value = result.url;
    // Update preview
    const prev = document.getElementById(key + '-prev');
    if (prev) {
      prev.style.display = 'block';
      const img = prev.querySelector('img');
      if (img) { img.src = normalizeDriveUrlFrontend(result.url); img.style.display = 'block'; }
    }
    if (stt) stt.textContent = '✅ ' + file.name;
    showToast('Upload berhasil! ✅', 'success');
  } catch(e) {
    if (stt) stt.textContent = '❌ Gagal: ' + e.message;
    showToast('Upload gagal: ' + e.message, 'error');
  }
  input.value = '';
}

async function simpanPengaturanAdmin(){
  const btn=document.querySelector('.admin-content .btn--primary.btn--full');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  const err=document.getElementById('peng-err');if(err)err.style.display='none';
  try{
    const keys=['nama_instansi','singkatan_instansi','alamat_instansi','telepon_instansi',
      'email_instansi','website_instansi','tahun_berdiri','footer_text',
      'warna_primer','warna_sekunder','logo_url',
      'bg_dashboard_karyawan_url','bg_dashboard_admin_url','bg_dashboard_superadmin_url',
      'jam_masuk_default','jam_keluar_default',
      'batas_awal_absen_menit','toleransi_terlambat_menit','batas_absen_masuk_menit',
      'max_radius_meter','sisa_cuti_default_per_tahun',
      'ucapan_ulang_tahun_template','aktif_one_device_login',
      'favicon_url','icon_512_url','bg_login_url','login_subtitle'];
    const settings={};
    keys.forEach(k=>{const el=document.getElementById('set-'+k);if(el)settings[k]=el.value?.trim()||'';});
    await callAPI('setMultipleSetting',{settings});
    showToast('Pengaturan berhasil disimpan! ✅','success',5000);
    resetBrandingCache();
    loadBranding(getSession()?.role||'admin');
  }catch(e){if(err){err.style.display='block';err.textContent='⚠️ '+e.message;}else showToast(e.message,'error');}
  finally{if(btn){btn.disabled=false;btn.classList.remove('loading');}}
}

// ─────────────────────────────────────────────────────────────
// 12. LAPORAN & REKAP
// ─────────────────────────────────────────────────────────────
async function renderLaporanAdminV3(container){
  const kList=await _loadKaryawanDrop();
  const now=new Date();
  container.innerHTML=`
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">📊 Laporan & Rekap</h2>
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">📄 Rekap Per Karyawan (PDF)</h3>
      <div class="form-group"><label class="form-label">Pilih Karyawan *</label>
        <select class="form-control" id="lap-k-sel">
          <option value="">Pilih karyawan...</option>
          ${kList.map(k=>`<option value="${k.id_karyawan}">${k.nama_lengkap} — ${k.jabatan}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn btn--ghost" style="font-size:12px" id="btn-mode-bln" onclick="toggleModeLap('bulan')">📅 Per Bulan</button>
        <button class="btn btn--ghost" style="font-size:12px" id="btn-mode-rng" onclick="toggleModeLap('range')">📆 Rentang Tanggal</button>
      </div>
      <div id="lap-mode-bln" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Bulan</label>
          <select class="form-control" id="lap-bln">
            ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
          </select></div>
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Tahun</label>
          <input type="number" class="form-control" id="lap-thn" value="${now.getFullYear()}" min="2020"></div>
      </div>
      <div id="lap-mode-rng" style="display:none;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="form-group" style="margin-bottom:0"><label class="form-label">📅 Dari</label>
          <input type="date" class="form-control" id="lap-dari">
          <p class="form-hint">Contoh: 25 Maret 2026</p></div>
        <div class="form-group" style="margin-bottom:0"><label class="form-label">📅 Sampai</label>
          <input type="date" class="form-control" id="lap-ke">
          <p class="form-hint">Contoh: 25 April 2026</p></div>
      </div>
      <button class="btn btn--primary" onclick="cetakRekapLaporan()">📄 Cetak PDF + TTD</button>
    </div>
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">📊 Rekap Semua Karyawan (Excel)</h3>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btn--primary" style="font-size:12px;padding:6px 12px"
          onclick="_setModeExcelSemua('bln')">📅 Bulanan</button>
        <button class="btn btn--ghost" style="font-size:12px;padding:6px 12px"
          onclick="_setModeExcelSemua('rng')">📆 Rentang Tanggal</button>
      </div>
      <div id="excel-all-bln" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Bulan</label>
          <select class="form-control" id="lap-all-bln" style="width:150px">
            ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
          </select></div>
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Tahun</label>
          <input type="number" class="form-control" id="lap-all-thn" value="${now.getFullYear()}" style="width:100px"></div>
      </div>
      <div id="excel-all-rng" style="display:none;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:0">
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Dari Tanggal</label>
          <input type="date" class="form-control" id="lap-all-dari"></div>
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Sampai Tanggal</label>
          <input type="date" class="form-control" id="lap-all-ke"></div>
      </div>
      <button class="btn btn--secondary btn--full" style="margin-top:10px"
        onclick="_exportRekapSemuaExcel()">📊 Export Excel</button>
    </div>
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">🧾 Rekap Lembur</h3>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btn--primary" style="font-size:12px;padding:6px 12px"
          onclick="_setModeLembur('bln')">📅 Bulanan</button>
        <button class="btn btn--ghost" style="font-size:12px;padding:6px 12px"
          onclick="_setModeLembur('rng')">📆 Rentang Tanggal</button>
      </div>
      <div id="lembur-mode-bln" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
        <select class="form-control" id="lap-lb-bln" style="width:150px">
          ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
        </select>
        <input type="number" class="form-control" id="lap-lb-thn" value="${now.getFullYear()}" style="width:100px">
      </div>
      <div id="lembur-mode-rng" style="display:none;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Dari Tanggal</label>
          <input type="date" class="form-control" id="lap-lb-dari"></div>
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Sampai Tanggal</label>
          <input type="date" class="form-control" id="lap-lb-ke"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn--primary" style="flex:1" onclick="_cetakLemburPDF()">📄 PDF</button>
        <button class="btn btn--secondary" style="flex:1" onclick="_exportLemburExcel()">📊 Excel</button>
      </div>
    </div>`;
  setTimeout(()=>_makeSearchable('lap-k-sel'),100);
  toggleModeLap('bulan');
}

function toggleModeLap(mode){
  const bln=document.getElementById('lap-mode-bln');
  const rng=document.getElementById('lap-mode-rng');
  const btnB=document.getElementById('btn-mode-bln');
  const btnR=document.getElementById('btn-mode-rng');
  if(mode==='bulan'){
    if(bln)bln.style.display='grid'; if(rng)rng.style.display='none';
    if(btnB){btnB.style.background='var(--color-primer)';btnB.style.color='#fff';}
    if(btnR){btnR.style.background='#F1F5F9';btnR.style.color='';}
  }else{
    if(bln)bln.style.display='none'; if(rng)rng.style.display='grid';
    if(btnR){btnR.style.background='var(--color-primer)';btnR.style.color='#fff';}
    if(btnB){btnB.style.background='#F1F5F9';btnB.style.color='';}
  }
}

async function cetakRekapLaporan(){
  const idK=document.getElementById('lap-k-sel')?.value;
  if(!idK){showToast('Pilih karyawan terlebih dahulu','warning');return;}
  const modeRng=document.getElementById('lap-mode-rng')?.style.display!=='none';
  if(modeRng){
    const dari=document.getElementById('lap-dari')?.value;
    const ke=document.getElementById('lap-ke')?.value;
    if(!dari||!ke){showToast('Isi tanggal dari dan sampai','warning');return;}
    if(dari>ke){showToast('Tanggal awal tidak boleh lebih dari akhir','warning');return;}
    await cetakRekapPDF(idK,null,null,fromInputDate(dari),fromInputDate(ke));
  }else{
    await cetakRekapPDF(idK,document.getElementById('lap-bln')?.value,document.getElementById('lap-thn')?.value);
  }
}

// ─────────────────────────────────────────────────────────────
// 13. HARGA LEMBUR
// ─────────────────────────────────────────────────────────────
async function renderHargaLemburAdmin(container){
  container.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn--ghost" style="font-size:13px;padding:8px 14px"
          onclick="routeAdmin('lembur-admin')">← Kembali</button>
        <h2 style="font-size:17px;font-weight:700;margin:0">💰 Harga Lembur per Jabatan</h2>
      </div>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormHargaLembur(null)">+ Tambah</button>
    </div>
    <div class="card" style="padding:12px;background:#EFF6FF;margin-bottom:14px">
      <p style="font-size:13px;color:#2D6CDF;margin:0">
        💡 Harga ini digunakan otomatis saat karyawan mengajukan lembur, berdasarkan jabatannya.
      </p>
    </div>
    <div id="hl-list">${skeletonCard(3)}</div>`;
  await loadHargaLemburList();
}

async function loadHargaLemburList(){
  const el=document.getElementById('hl-list');if(!el) return;
  try{
    const data=await callAPI('getSemuaHargaLembur',{});
    if(!data||data.length===0){
      el.innerHTML=`<div class="card" style="text-align:center;padding:32px;color:#94A3B8">
        <div style="font-size:40px;margin-bottom:8px">💰</div>Belum ada data.
        <button class="btn btn--primary" style="margin-top:12px" onclick="tampilFormHargaLembur(null)">+ Tambah</button>
      </div>`;return;
    }
    el.innerHTML=`<div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table"><thead><tr>
        <th>Jabatan</th><th>Harga per Jam</th><th>Berlaku Mulai</th><th style="text-align:center">Aksi</th>
      </tr></thead><tbody>
        ${data.map(h=>`<tr>
          <td style="font-weight:600">${h.jabatan}</td>
          <td style="color:#1A9E74;font-weight:700">${formatRupiah(h.harga_per_jam)}</td>
          <td style="font-size:12px;color:#64748B">${formatTanggal(h.berlaku_mulai)}</td>
          <td style="text-align:center">
            <div style="display:flex;gap:6px;justify-content:center">
              <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px"
                onclick='tampilFormHargaLembur(${JSON.stringify(h)})'>✏️</button>
              <button class="btn" style="padding:5px 10px;font-size:12px;
                background:#FFF5F5;color:#E53E3E;border:1px solid #FC8181"
                onclick="hapusHL('${h.jabatan}')">🗑️</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody></table></div>`;
  }catch(e){showError('hl-list',e.message);}
}

function tampilFormHargaLembur(data){
  showModal(data?'✏️ Edit Harga':'+ Tambah Harga',
    `<div style="margin-top:8px">
      <div class="form-group"><label class="form-label">Jabatan *</label>
        <input type="text" class="form-control" id="hl-jab" value="${data?.jabatan||''}"
          placeholder="Contoh: Staff, Supervisor, Manager"
          ${data?'readonly':''}></div>
      <div class="form-group"><label class="form-label">Harga per Jam (Rp) *</label>
        <input type="number" class="form-control" id="hl-hrg" value="${data?.harga_per_jam||''}"
          placeholder="Contoh: 25000" min="0" step="1000"
          oninput="document.getElementById('hl-preview').textContent=this.value?formatRupiah(this.value)+'/jam':''">
        <p class="form-hint" id="hl-preview">${data?.harga_per_jam?formatRupiah(data.harga_per_jam)+'/jam':''}</p>
      </div></div>`,
    async()=>{
      const jab=document.getElementById('hl-jab')?.value?.trim();
      const hrg=document.getElementById('hl-hrg')?.value;
      if(!jab) throw new Error('Jabatan wajib diisi');
      if(!hrg||parseInt(hrg)<0) throw new Error('Harga tidak valid');
      const r=await callAPI('setHargaLembur',{jabatan:jab,harga_per_jam:parseInt(hrg)});
      showToast(r.message||'Tersimpan ✅','success');loadHargaLemburList();
    },'💾 Simpan');
}

async function hapusHL(jabatan){
  showModal('🗑️ Hapus?',`Hapus harga lembur untuk jabatan <strong>${jabatan}</strong>?`,
    async()=>{const r=await callAPI('hapusHargaLembur',{jabatan});showToast(r.message,'success');loadHargaLemburList();}
  ,'🗑️ Hapus');
}

function toggleModeLapAll(mode) {
  const bln=document.getElementById('all-mode-bln');
  const rng=document.getElementById('all-mode-rng');
  const btnB=document.getElementById('btn-all-mode-bln');
  const btnR=document.getElementById('btn-all-mode-rng');
  if(mode==='bulan'){if(bln)bln.style.display='grid';if(rng)rng.style.display='none';
    if(btnB)btnB.className='btn btn--primary';if(btnR)btnR.className='btn btn--ghost';}
  else{if(bln)bln.style.display='none';if(rng)rng.style.display='grid';
    if(btnR)btnR.className='btn btn--primary';if(btnB)btnB.className='btn btn--ghost';}
}
function toggleModeLapLb(mode) {
  const bln=document.getElementById('lb-mode-bln');
  const rng=document.getElementById('lb-mode-rng');
  const btnB=document.getElementById('btn-lb-mode-bln');
  const btnR=document.getElementById('btn-lb-mode-rng');
  if(mode==='bulan'){if(bln)bln.style.display='flex';if(rng)rng.style.display='none';
    if(btnB)btnB.className='btn btn--primary';if(btnR)btnR.className='btn btn--ghost';}
  else{if(bln)bln.style.display='none';if(rng)rng.style.display='grid';
    if(btnR)btnR.className='btn btn--primary';if(btnB)btnB.className='btn btn--ghost';}
}
function _getLbParams() {
  const modeRng=document.getElementById('lb-mode-rng')?.style.display==='grid';
  if(modeRng){
    const dari=document.getElementById('lap-lb-dari')?.value;
    const ke=document.getElementById('lap-lb-ke')?.value;
    if(!dari||!ke){showToast('Isi rentang tanggal','warning');return null;}
    return{bulan:null,tahun:null,dari:fromInputDate(dari),ke:fromInputDate(ke)};
  }
  return{bulan:document.getElementById('lap-lb-bulan')?.value,
    tahun:document.getElementById('lap-lb-tahun')?.value,dari:null,ke:null};
}

// ── Helper: mode toggle Excel Semua ──────────────────────────
function _setModeExcelSemua(mode) {
  const bln = document.getElementById('excel-all-bln');
  const rng = document.getElementById('excel-all-rng');
  if(mode==='bln'){ if(bln)bln.style.display='flex'; if(rng)rng.style.display='none'; }
  else { if(bln)bln.style.display='none'; if(rng){rng.style.display='grid';} }
}
function _exportRekapSemuaExcel() {
  const rng = document.getElementById('excel-all-rng');
  const isRng = rng && rng.style.display !== 'none';
  if (isRng) {
    const dari = fromInputDate(document.getElementById('lap-all-dari')?.value);
    const ke   = fromInputDate(document.getElementById('lap-all-ke')?.value);
    if(!dari||!ke){showToast('Isi rentang tanggal','warning');return;}
    exportRekapExcel(null, null, dari, ke);
  } else {
    const bln = document.getElementById('lap-all-bln')?.value;
    const thn = document.getElementById('lap-all-thn')?.value;
    exportRekapExcel(bln, thn, null, null);
  }
}
// ── Helper: mode toggle Lembur ────────────────────────────────
function _setModeLembur(mode) {
  const bln = document.getElementById('lembur-mode-bln');
  const rng = document.getElementById('lembur-mode-rng');
  if(mode==='bln'){ if(bln)bln.style.display='flex'; if(rng)rng.style.display='none'; }
  else { if(bln)bln.style.display='none'; if(rng){rng.style.display='grid';} }
}
function _cetakLemburPDF() {
  const rng = document.getElementById('lembur-mode-rng');
  const isRng = rng && rng.style.display !== 'none';
  if (isRng) {
    const dari = fromInputDate(document.getElementById('lap-lb-dari')?.value);
    const ke   = fromInputDate(document.getElementById('lap-lb-ke')?.value);
    if(!dari||!ke){showToast('Isi rentang tanggal','warning');return;}
    cetakRekapLemburPDF(null,null,dari,ke);
  } else {
    cetakRekapLemburPDF(document.getElementById('lap-lb-bln')?.value,
                        document.getElementById('lap-lb-thn')?.value);
  }
}
function _exportLemburExcel() {
  const rng = document.getElementById('lembur-mode-rng');
  const isRng = rng && rng.style.display !== 'none';
  if (isRng) {
    const dari = fromInputDate(document.getElementById('lap-lb-dari')?.value);
    const ke   = fromInputDate(document.getElementById('lap-lb-ke')?.value);
    if(!dari||!ke){showToast('Isi rentang tanggal','warning');return;}
    exportRekapLemburExcel(null,null,dari,ke);
  } else {
    exportRekapLemburExcel(document.getElementById('lap-lb-bln')?.value,
                           document.getElementById('lap-lb-thn')?.value);
  }
}

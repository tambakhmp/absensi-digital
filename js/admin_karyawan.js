// ============================================================
// admin_karyawan.js — Manajemen Karyawan Admin: Tabel, CRUD
// ============================================================

let _karyawanCache = [];

async function renderKaryawanAdminFull(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:gap:8px">
      <h2 style="font-size:17px;font-weight:700;margin:0">👥 Manajemen Karyawan</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn--ghost" style="font-size:13px" onclick="exportTemplateKaryawan()">
          📥 Template Excel
        </button>
        <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormTambahKaryawan()">
          + Tambah Karyawan
        </button>
      </div>
    </div>

    <!-- Filter & Search -->
    <div class="card" style="padding:12px;margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input type="text" class="form-control" id="filter-nama"
          placeholder="🔍 Cari nama / NIK / jabatan..."
          style="flex:1;min-width:200px" oninput="filterTabelKaryawan()">
        <select class="form-control" id="filter-departemen" style="width:180px" onchange="filterTabelKaryawan()">
          <option value="">Semua Departemen</option>
        </select>
        <select class="form-control" id="filter-status" style="width:140px" onchange="filterTabelKaryawan()">
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Non-aktif</option>
        </select>
      </div>
      <div id="info-filter" style="font-size:12px;color:#64748B;margin-top:8px"></div>
    </div>

    <!-- Tabel -->
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table" id="tabel-karyawan" style="min-width:700px">
        <thead>
          <tr>
            <th style="padding:12px 10px">Karyawan</th>
            <th>NIK</th>
            <th>Jabatan</th>
            <th>Departemen</th>
            <th>Bergabung</th>
            <th>Status</th>
            <th style="text-align:center">Aksi</th>
          </tr>
        </thead>
        <tbody id="tbody-karyawan">
          <tr><td colspan="7" style="text-align:center;padding:32px;color:#94A3B8">
            ${skeletonCard(3)}
          </td></tr>
        </tbody>
      </table>
    </div>`;

  await loadTabelKaryawan();
}

async function loadTabelKaryawan() {
  try {
    const data = await callAPI('getKaryawan', {});
    _karyawanCache = data || [];

    // Isi filter departemen
    const depts = [...new Set(data.map(k => k.departemen).filter(Boolean))].sort();
    const selDept = document.getElementById('filter-departemen');
    if (selDept) {
      selDept.innerHTML = '<option value="">Semua Departemen</option>' +
        depts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    renderTabelKaryawan(data);
  } catch(e) {
    document.getElementById('tbody-karyawan').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:24px;color:#E53E3E">
        Gagal memuat: ${e.message}</td></tr>`;
  }
}

function filterTabelKaryawan() {
  const q     = (document.getElementById('filter-nama')?.value||'').toLowerCase();
  const dept  = document.getElementById('filter-departemen')?.value || '';
  const stat  = document.getElementById('filter-status')?.value || '';

  let filtered = _karyawanCache;
  if (q)    filtered = filtered.filter(k =>
    (k.nama_lengkap||'').toLowerCase().includes(q) ||
    (k.nik||'').toLowerCase().includes(q) ||
    (k.jabatan||'').toLowerCase().includes(q));
  if (dept) filtered = filtered.filter(k => k.departemen === dept);
  if (stat) filtered = filtered.filter(k => String(k.status_aktif) === stat);

  const info = document.getElementById('info-filter');
  if (info) info.textContent = `Menampilkan ${filtered.length} dari ${_karyawanCache.length} karyawan`;

  renderTabelKaryawan(filtered);
}

function renderTabelKaryawan(data) {
  const tbody = document.getElementById('tbody-karyawan');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#94A3B8">
      Tidak ada data karyawan</td></tr>`;
    return;
  }

  const now = new Date();
  const todayMD = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;

  tbody.innerHTML = data.map(k => {
    // Cek ulang tahun
    const p       = String(k.tanggal_lahir||'').split('/');
    const isUltah = p.length >= 2 && p[0]+'/'+p[1] === todayMD;

    return `
      <tr>
        <td style="padding:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="${getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 36)}"
              style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0"
              onerror="this.src='${avatarInisial(k.nama_lengkap, 36)}'">
            <div>
              <div style="font-weight:600;font-size:14px">
                ${k.nama_lengkap} ${isUltah ? '🎂' : ''}
              </div>
              <div style="font-size:11px;color:#64748B">${k.email||''}</div>
            </div>
          </div>
        </td>
        <td style="font-size:13px">${k.nik||'-'}</td>
        <td style="font-size:13px">${k.jabatan||'-'}</td>
        <td style="font-size:13px">${k.departemen||'-'}</td>
        <td style="font-size:12px;color:#64748B">${formatTanggal(k.tanggal_masuk)}</td>
        <td>
          <span style="background:${String(k.status_aktif).toLowerCase()==='true'?'#EBF8EE':'#FFF5F5'};
            color:${String(k.status_aktif).toLowerCase()==='true'?'#1A9E74':'#E53E3E'};
            border:1px solid ${String(k.status_aktif).toLowerCase()==='true'?'#9AE6B4':'#FC8181'};
            padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600">
            ${String(k.status_aktif).toLowerCase()==='true' ? '✅ Aktif' : '❌ Non-aktif'}
          </span>
        </td>
        <td style="text-align:center">
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px"
              onclick="tampilFormEditKaryawan('${k.id_karyawan}')">✏️ Edit</button>
            <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px"
              onclick="lihatProfilKaryawan('${k.id_karyawan}')">👁 Profil</button>
            <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px;color:#2D6CDF"

            ${String(k.status_aktif).toLowerCase()==='true'
              ? `<button class="btn" style="padding:5px 10px;font-size:12px;background:#FFF5F5;color:#E53E3E;border:1px solid #FC8181"
                  onclick="konfirmasiToggleKaryawan('${k.id_karyawan}','${k.nama_lengkap}',false)">🚫 Nonaktif</button>`
              : `<button class="btn" style="padding:5px 10px;font-size:12px;background:#EBF8EE;color:#1A9E74;border:1px solid #9AE6B4"
                  onclick="konfirmasiToggleKaryawan('${k.id_karyawan}','${k.nama_lengkap}',true)">✅ Aktifkan</button>`
            }
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ─── Form Tambah / Edit Karyawan ─────────────────────────────

// Konversi dd/MM/yyyy → yyyy-MM-dd (untuk input type=date)
function toInputDate(str) {
  if (!str) return '';
  str = String(str).trim();
  if (str.includes('-') && str.length === 10) return str; // sudah format yyyy-MM-dd
  const p = str.split('/');
  if (p.length === 3) return p[2]+'-'+p[1].padStart(2,'0')+'-'+p[0].padStart(2,'0');
  return '';
}

function tampilFormTambahKaryawan() {
  _tampilFormKaryawan(null);
}

async function tampilFormEditKaryawan(idKaryawan) {
  try {
    showToast('Memuat data...', 'info', 1500);
    const k = await callAPI('getKaryawanById', { id_karyawan: idKaryawan });
    _tampilFormKaryawan(k);
  } catch(e) { showToast(e.message, 'error'); }
}

function _tampilFormKaryawan(k) {
  const isEdit = !!k;
  const modal  = document.createElement('div');
  modal.id     = 'modal-karyawan';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;
    overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;
    padding:20px;backdrop-filter:blur(3px)`;

  const usernameDefault = k?.username || '';
  const today = new Date().toISOString().split('T')[0];

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:640px;
      margin:auto;animation:fadeInScale 0.25s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:18px;font-weight:700">
          ${isEdit ? '✏️ Edit Karyawan' : '➕ Tambah Karyawan Baru'}
        </h3>
        <button onclick="document.getElementById('modal-karyawan').remove()"
          style="background:#F1F5F9;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:16px">✕</button>
      </div>

      <div id="karyawan-form-error" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
        border-radius:8px;padding:12px;color:#C53030;font-size:13px;margin-bottom:16px"></div>

      <!-- INFORMASI DASAR -->
      <p style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;
        letter-spacing:.6px;margin-bottom:12px">👤 Informasi Dasar</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${frmInput('kf-nama','Nama Lengkap *','text',k?.nama_lengkap||'')}
        ${frmInput('kf-nik','NIK Karyawan *','text',k?.nik||'')}
        ${frmInput('kf-jabatan','Jabatan *','text',k?.jabatan||'')}
        ${frmInput('kf-departemen','Departemen *','text',k?.departemen||'')}
        ${frmInput('kf-atasan','Nama Atasan','text',k?.nama_atasan||'')}
        ${frmInput('kf-masuk','Tanggal Bergabung *','date',toInputDate(k?.tanggal_masuk)||today)}
        ${frmSelect('kf-role','Role *',[
          {v:'karyawan',l:'Karyawan'},
          {v:'admin',   l:'Admin'},
          {v:'superadmin',l:'Super Admin'}
        ], k?.role||'karyawan')}
      </div>

      <!-- INFORMASI PRIBADI -->
      <p style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;
        letter-spacing:.6px;margin:16px 0 12px">🪪 Informasi Pribadi</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${frmInput('kf-lahir','Tanggal Lahir *','date',toInputDate(k?.tanggal_lahir)||'')}
        ${frmSelect('kf-jk','Jenis Kelamin *',[{v:'L',l:'Laki-laki'},{v:'P',l:'Perempuan'}], k?.jenis_kelamin||'L')}
        ${frmInput('kf-ktp','No. KTP','text',k?.no_ktp||'')}
        ${frmInput('kf-hp','No. HP *','tel',k?.no_hp||'')}
        ${frmInput('kf-email','Email *','email',k?.email||'')}
        ${frmSelect('kf-pendidikan','Pendidikan Terakhir',[
          {v:'SD',l:'SD'},{v:'SMP',l:'SMP'},{v:'SMA/SMK',l:'SMA/SMK'},
          {v:'D3',l:'D3'},{v:'S1',l:'S1'},{v:'S2',l:'S2'},{v:'S3',l:'S3'}
        ], k?.pendidikan_terakhir||'S1')}
      </div>
      <div class="form-group">
        <label class="form-label">Alamat</label>
        <textarea class="form-control" id="kf-alamat" rows="2">${k?.alamat||''}</textarea>
      </div>

      <!-- INFORMASI AKUN -->
      <p style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;
        letter-spacing:.6px;margin:16px 0 12px">🔐 Informasi Akun</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${frmInput('kf-username','Username *','text', usernameDefault, isEdit ? 'Tidak bisa diubah' : '')}
        ${!isEdit ? frmInput('kf-password','Password Awal *','text','Absensi@123','Akan di-hash otomatis') : ''}
      </div>

      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn--ghost" style="flex:1"
          onclick="document.getElementById('modal-karyawan').remove()">Batal</button>
        <button class="btn btn--primary" style="flex:2"
          onclick="submitFormKaryawan(${isEdit ? `'${k.id_karyawan}'` : 'null'})">
          <div class="spinner-btn"></div>
          <span class="btn-text">${isEdit ? '💾 Simpan Perubahan' : '➕ Tambah Karyawan'}</span>
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Auto-generate username dari nama jika tambah baru
  if (!isEdit) {
    document.getElementById('kf-nama').addEventListener('input', function() {
      const uname = this.value.toLowerCase()
        .replace(/\s+/g,'.')
        .replace(/[^a-z0-9.]/g,'')
        .substring(0,30);
      document.getElementById('kf-username').value = uname;
    });
  }
}

async function submitFormKaryawan(idKaryawan) {
  const btn  = document.querySelector('#modal-karyawan .btn--primary');
  const err  = document.getElementById('karyawan-form-error');
  if (btn) { btn.disabled=true; btn.classList.add('loading'); }
  if (err) err.style.display = 'none';

  try {
    const getNilai = id => document.getElementById(id)?.value?.trim() || '';
    const nama       = getNilai('kf-nama');
    const nik        = getNilai('kf-nik');
    const jabatan    = getNilai('kf-jabatan');
    const departemen = getNilai('kf-departemen');
    const hp         = getNilai('kf-hp');
    const email      = getNilai('kf-email');
    const username   = getNilai('kf-username');

    if (!nama)       throw new Error('Nama lengkap wajib diisi');
    if (!nik)        throw new Error('NIK wajib diisi');
    if (!jabatan)    throw new Error('Jabatan wajib diisi');
    if (!departemen) throw new Error('Departemen wajib diisi');
    if (!hp)         throw new Error('No. HP wajib diisi');
    if (!email)      throw new Error('Email wajib diisi');
    if (!username)   throw new Error('Username wajib diisi');

    const payload = {
      nama_lengkap        : nama,
      nik,
      jabatan,
      departemen,
      nama_atasan         : getNilai('kf-atasan'),
      tanggal_masuk       : fromInputDate(getNilai('kf-masuk')),
      tanggal_lahir       : fromInputDate(getNilai('kf-lahir')),
      jenis_kelamin       : getNilai('kf-jk'),
      no_ktp              : getNilai('kf-ktp'),
      no_hp               : hp,
      email,
      alamat              : document.getElementById('kf-alamat')?.value?.trim()||'',
      pendidikan_terakhir : getNilai('kf-pendidikan'),
      username,
      role                : getNilai('kf-role')
    };

    let result;
    if (idKaryawan) {
      payload.id_karyawan = idKaryawan;
      result = await callAPI('editKaryawan', payload);
    } else {
      // Hash password
      const pw = getNilai('kf-password') || 'Absensi@123';
      payload.password_hash = await sha256(pw);
      result = await callAPI('tambahKaryawan', payload);
    }

    document.getElementById('modal-karyawan')?.remove();
    showToast(result.message || 'Berhasil! ✅', 'success');
    await loadTabelKaryawan();
  } catch(e) {
    if (err) { err.style.display='block'; err.textContent='⚠️ '+e.message; }
    else showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

function konfirmasiToggleKaryawan(id, nama, aktifkan) {
  showModal(
    aktifkan ? '✅ Aktifkan Karyawan?' : '🚫 Nonaktifkan Karyawan?',
    `${aktifkan ? 'Aktifkan' : 'Nonaktifkan'} akun <strong>${nama}</strong>?`,
    async () => {
      try {
        const r = await callAPI(aktifkan ? 'aktifKaryawan' : 'nonaktifKaryawan', { id_karyawan: id });
        showToast(r.message, 'success');
        await loadTabelKaryawan();
      } catch(e) { showToast(e.message, 'error'); }
    },
    aktifkan ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan'
  );
}

function cetakRekapDariAdmin(idKaryawan) {
  const now = new Date();
  showModal('📄 Cetak Rekap PDF',
    `<div class="form-group" style="margin-top:8px">
      <label class="form-label">Bulan</label>
      <select class="form-control" id="cetak-bulan">
        ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tahun</label>
      <input type="number" class="form-control" id="cetak-tahun" value="${now.getFullYear()}" min="2020">
    </div>`,
    async () => {
      const b = document.getElementById('cetak-bulan')?.value;
      const t = document.getElementById('cetak-tahun')?.value;
      await cetakRekapPDF(idKaryawan, b, t);
    },
    '📄 Cetak PDF'
  );
}

// Helper form
function frmInput(id, label, type, value='', hint='') {
  return `<div class="form-group" style="margin-bottom:0">
    <label class="form-label">${label}</label>
    <input type="${type}" class="form-control" id="${id}" value="${value}" ${hint?'readonly':''}>
    ${hint ? `<p class="form-hint">${hint}</p>` : ''}
  </div>`;
}

function frmSelect(id, label, options, selected='') {
  return `<div class="form-group" style="margin-bottom:0">
    <label class="form-label">${label}</label>
    <select class="form-control" id="${id}">
      ${options.map(o=>`<option value="${o.v}" ${o.v===selected?'selected':''}>${o.l}</option>`).join('')}
    </select>
  </div>`;
}

// Export template Excel untuk import bulk
function exportTemplateKaryawan() {
  if (typeof XLSX === 'undefined') { showToast('Library Excel belum dimuat','warning'); return; }
  const headers = [
    'nama_lengkap','nik','jabatan','departemen','nama_atasan','tanggal_masuk',
    'tanggal_lahir','jenis_kelamin','no_ktp','no_hp','email','alamat',
    'pendidikan_terakhir','username','password_awal','id_shift','role'
  ];
  const contoh = [
    'Budi Santoso','2026-0001','Staff HR','Human Resource','Siti Rahayu',
    '01/01/2024','15/06/1995','L','1234567890123456','081234567890',
    'budi@instansi.com','Jl. Contoh No. 1, Kota','S1','budi.santoso',
    'Absensi@123','SHF001','karyawan'
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    ['TEMPLATE IMPORT KARYAWAN — Sistem Absensi Digital'],
    ['Petunjuk: Isi data mulai baris ke-4. Jangan ubah urutan kolom.'],
    [],
    headers,
    contoh
  ]);
  ws['!cols'] = headers.map(() => ({wch:20}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Karyawan');
  XLSX.writeFile(wb, 'Template_Import_Karyawan.xlsx');
  showToast('Template Excel berhasil diunduh!', 'success');
}

async function lihatProfilKaryawan(idKaryawan) {
  try {
    const k = await callAPI('getKaryawanById', { id_karyawan: idKaryawan });
    if (!k) return;
    const instansi = await callAPI('getMultipleSetting',{keys:'nama_instansi,singkatan_instansi,alamat_instansi'});
    const modal = document.createElement('div');
    modal.id    = 'modal-profil-k';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px);overflow-y:auto';
    const fotoSrc = getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 90);

    // Muat instansi jika belum ada
    if (!instansi) instansi = {};

    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:0;width:100%;max-width:520px;overflow:hidden;animation:fadeInScale 0.2s ease">
        <!-- Header bar -->
        <div style="background:linear-gradient(135deg,var(--color-primer,#2D6CDF),var(--color-sekunder,#1A9E74));
          padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
          <span style="color:#fff;font-weight:700;font-size:15px">👤 Profil Karyawan</span>
          <button onclick="document.getElementById('modal-profil-k').remove()"
            style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:30px;height:30px;
            color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>

        <!-- Data karyawan -->
        <div style="padding:20px;max-height:70vh;overflow-y:auto">
          <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
            <img src="${fotoSrc}"
              style="width:80px;height:80px;border-radius:50%;object-fit:cover;
              border:3px solid var(--color-primer,#2D6CDF);flex-shrink:0"
              onerror="this.src='${avatarInisial(k.nama_lengkap,80)}'">
            <div>
              <div style="font-weight:700;font-size:18px;color:#1E293B">${k.nama_lengkap}</div>
              <div style="font-size:13px;color:#64748B;margin-top:2px">${k.jabatan||'-'} · ${k.departemen||'-'}</div>
              <div style="font-size:12px;color:#94A3B8;margin-top:2px">NIK: ${k.nik||'-'}</div>
              <span style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:20px;font-size:11px;
                font-weight:700;background:${String(k.status_aktif).toLowerCase()==='true'?'#EBF8EE':'#FFF5F5'};
                color:${String(k.status_aktif).toLowerCase()==='true'?'#1A9E74':'#E53E3E'}">
                ${String(k.status_aktif).toLowerCase()==='true'?'✅ Aktif':'❌ Non-aktif'}
              </span>
            </div>
          </div>

          <!-- Info rows -->
          <div style="background:#F8FAFC;border-radius:12px;padding:4px 0;margin-bottom:16px">
            ${[
              ['📱','No. HP', k.no_hp],
              ['📧','Email', k.email],
              ['🎂','Tanggal Lahir', formatTanggal(k.tanggal_lahir)],
              ['⚧️','Jenis Kelamin', k.jenis_kelamin==='L'?'Laki-laki':'Perempuan'],
              ['🎓','Pendidikan', k.pendidikan_terakhir],
              ['📅','Bergabung', formatTanggal(k.tanggal_masuk)],
              ['👨‍💼','Atasan', k.nama_atasan],
              ['🏠','Alamat', k.alamat],
              ['🔑','Username', k.username],
              ['🛡️','Role', k.role]
            ].map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;
              border-bottom:1px solid #F1F5F9">
              <span style="font-size:14px;width:20px;text-align:center;flex-shrink:0">${r[0]}</span>
              <span style="font-size:12px;color:#94A3B8;min-width:110px;flex-shrink:0">${r[1]}</span>
              <span style="font-size:13px;color:#1E293B;font-weight:500;word-break:break-word">${r[2]||'-'}</span>
            </div>`).join('')}
          </div>

          <!-- ID Card Preview -->
          <div style="margin-bottom:16px">
            <p style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;
              letter-spacing:.6px;margin-bottom:10px">🪪 ID Card</p>
            <div id="idcard-preview-${k.id_karyawan}" style="position:relative;width:320px;height:200px;
              margin:0 auto;border-radius:16px;overflow:hidden;
              box-shadow:0 8px 32px rgba(0,0,0,.18)">
              ${_idCardHTML(k, instansi)}
            </div>
          </div>

          <!-- Tombol aksi — proporsional tengah -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
            <button class="btn btn--primary" style="font-size:13px;padding:11px"
              onclick="cetakIDCard('${k.id_karyawan}')">
              🪪 Cetak ID Card
            </button>
            <button class="btn btn--ghost" style="font-size:13px;padding:11px"
              onclick="document.getElementById('modal-profil-k').remove();tampilFormEditKaryawan('${k.id_karyawan}')">
              ✏️ Edit Data
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });

    // Render canvas ID Card setelah modal tampil
    setTimeout(async () => {
      const canvas = document.getElementById('canvas-idcard');
      if (canvas) {
        try {
          await _renderIDCardCanvas(k, instansi, canvas);
        } catch(e) {
          canvas.parentElement.innerHTML = `<div style="color:#94A3B8;font-size:12px;text-align:center;padding:20px">Gagal render preview</div>`;
        }
      }
    }, 50);

  } catch(e) { showToast(e.message, 'error'); }
}

// ─── ID CARD CANVAS PREVIEW ──────────────────────────────────
// Preview menggunakan canvas yang SAMA PERSIS dengan hasil PDF
async function _renderIDCardCanvas(k, instansi, canvasEl) {
  const W = canvasEl.width  = 856;  // 85.6mm × 10px/mm
  const H = canvasEl.height = 540;  // 54mm × 10px
  const ctx = canvasEl.getContext('2d');
  const sc  = W / 85.6; // scale factor: 10

  // ── Background ──────────────────────────────────────────
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0,0,W,H);

  // Segitiga dekoratif kanan atas
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.moveTo(W-280,0); ctx.lineTo(W,0); ctx.lineTo(W,280); ctx.closePath();
  ctx.fill();

  // Garis biru kiri
  ctx.fillStyle = '#2D6CDF';
  ctx.fillRect(0,0,30,H);

  // ── Header ──────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(30,0,W-30,150);

  // Logo instansi
  const logoUrl = instansi?.logo_url ? normalizeDriveUrlFrontend(instansi.logo_url) : '';
  let xHeaderText = 45;
  if (logoUrl && logoUrl.startsWith('http')) {
    try {
      const logoImg = await _loadImage(logoUrl);
      ctx.drawImage(logoImg, 42, 20, 80, 80);
      xHeaderText = 140;
    } catch(e) {}
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${65}px sans-serif`;
  const namaInst = (instansi?.nama_instansi || 'INSTANSI').toUpperCase();
  ctx.fillText(namaInst, xHeaderText, 70, W - xHeaderText - 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${48}px sans-serif`;
  ctx.fillText('ID CARD KARYAWAN', xHeaderText, 115);

  // Garis bawah header
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30,150); ctx.lineTo(W,150); ctx.stroke();

  // ── Foto karyawan ────────────────────────────────────────
  const fX=45, fY=175, fSize=220;
  // Border foto
  ctx.fillStyle = '#1e3a8a';
  _roundRect(ctx, fX-8, fY-8, fSize+16, fSize+16, 20);
  ctx.fill();

  const fotoUrl = k.foto_profil_url ? normalizeDriveUrlFrontend(k.foto_profil_url) : '';
  let fotoLoaded = false;
  if (fotoUrl && fotoUrl.startsWith('http')) {
    try {
      const fotoImg = await _loadImage(fotoUrl);
      // Clip foto
      ctx.save();
      _roundRect(ctx, fX, fY, fSize, fSize, 14);
      ctx.clip();
      ctx.drawImage(fotoImg, fX, fY, fSize, fSize);
      ctx.restore();
      fotoLoaded = true;
    } catch(e) {}
  }
  if (!fotoLoaded) {
    ctx.fillStyle = '#2D6CDF';
    _roundRect(ctx, fX, fY, fSize, fSize, 14);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 120px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText((k.nama_lengkap||'K')[0].toUpperCase(), fX+fSize/2, fY+fSize/2+40);
    ctx.textAlign = 'left';
  }

  // ── Info karyawan ────────────────────────────────────────
  const xI = 310;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 85px sans-serif`;
  const maxNamaW = W - xI - 20;
  let namaDisp = k.nama_lengkap || '-';
  while (ctx.measureText(namaDisp).width > maxNamaW && namaDisp.length > 1) {
    namaDisp = namaDisp.substring(0, namaDisp.length-1);
  }
  if (namaDisp !== k.nama_lengkap) namaDisp += '...';
  ctx.fillText(namaDisp, xI, 220);

  ctx.fillStyle = '#93c5fd';
  ctx.font = `${68}px sans-serif`;
  ctx.fillText(k.jabatan||'-', xI, 295, maxNamaW);

  ctx.fillStyle = '#64748b';
  ctx.font = `${58}px sans-serif`;
  ctx.fillText(k.departemen||'-', xI, 355, maxNamaW);

  // NIK box
  const nikY = 385;
  const nikW  = W - xI - 30;
  ctx.fillStyle = '#1e3a8a';
  _roundRect(ctx, xI, nikY, nikW, 90, 12);
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.font = `${44}px sans-serif`;
  ctx.fillText('NIK', xI+28, nikY+40);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${74}px sans-serif`;
  ctx.fillText(String(k.nik||'-'), xI+28, nikY+75, nikW-40);

  // ── Footer ────────────────────────────────────────────────
  ctx.fillStyle = '#2D6CDF';
  ctx.fillRect(30, H-50, (W-30)*0.55, 50);
  ctx.fillStyle = '#1A9E74';
  ctx.fillRect(30+(W-30)*0.55, H-50, (W-30)*0.45, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = `${42}px sans-serif`;
  ctx.textAlign = 'center';
  const alamat = (instansi?.alamat_instansi||'').substring(0,55);
  ctx.fillText(alamat, W/2, H-16, W-80);
  ctx.textAlign = 'left';
}

function _roundRect(ctx, x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function _loadImage(url) {
  return new Promise((res,rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error('Gagal load: '+url));
    img.src = url;
  });
}

// Placeholder - tidak dipakai lagi tapi dipanggil dari modal lama
function _idCardHTML(k, instansi) {
  return `<canvas id="canvas-idcard" style="width:100%;height:100%;border-radius:8px"></canvas>`;
}

// ─── CETAK ID CARD — PDF ──────────────────────────────────────
async function cetakIDCard(idKaryawan) {
  showToast('Menyiapkan ID Card...','info',2000);
  try {
    const ok = await _ensureJsPDF();
    if (!ok || !window.jspdf?.jsPDF) {
      showToast('Library PDF tidak tersedia. Muat ulang halaman.','error',5000);
      return;
    }

    const [k, instansi] = await Promise.all([
      callAPI('getKaryawanById', { id_karyawan: idKaryawan }),
      callAPI('getMultipleSetting', { keys:'nama_instansi,singkatan_instansi,alamat_instansi,logo_url' })
    ]);
    if (!k) throw new Error('Data karyawan tidak ditemukan');

    // Render ID Card ke canvas offscreen (sama persis dengan preview)
    const canvas = document.createElement('canvas');
    await _renderIDCardCanvas(k, instansi || {}, canvas);

    // Canvas → PNG → jsPDF
    const imgData = canvas.toDataURL('image/png');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:[85.6,54] });
    doc.addImage(imgData, 'PNG', 0, 0, 85.6, 54);

    doc.save('IDCard_'+(k.nama_lengkap||'karyawan').replace(/\s+/g,'_')+'.pdf');
    showToast('ID Card berhasil didownload! 🪪','success');

  } catch(e) {
    showToast('Gagal cetak ID Card: '+e.message,'error',5000);
    console.error(e);
  }
}


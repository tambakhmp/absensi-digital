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
// Konversi dd/MM/yyyy → yyyy-MM-dd untuk input type=date
function toInputDate(str) {
  if (!str) return '';
  str = String(str).trim();
  if (str.includes('-') && str.length === 10) return str;
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

// ═══════════════════════════════════════════════════════════════
// ID CARD FINAL — Preview flexbox + PDF koordinat terverifikasi
// ═══════════════════════════════════════════════════════════════

function _idCardPreviewHTML(k, instansi) {
  const nama    = k.nama_lengkap || '-';
  const jabatan = k.jabatan      || '-';
  const dept    = k.departemen   || '-';
  const nik     = String(k.nik   || '-');
  const namaInst= (instansi?.nama_instansi || 'INSTANSI').toUpperCase();
  const logoUrl = instansi?.logo_url ? normalizeDriveUrlFrontend(instansi.logo_url||'') : '';
  const fotoSrc = getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 80);
  const alamat  = (instansi?.alamat_instansi || '').substring(0, 55);

  return `
  <div style="width:100%;height:100%;display:flex;flex-direction:column;
    background:#0f172a;border-radius:inherit;overflow:hidden;font-family:sans-serif">

    <!-- HEADER: logo + nama instansi sejajar tengah -->
    <div style="flex:0 0 22%;display:flex;align-items:center;gap:3%;
      padding:0 3%;background:rgba(0,0,0,.32);
      border-bottom:1px solid rgba(255,255,255,.1);overflow:hidden">
      ${logoUrl ? `
        <img src="${logoUrl}"
          style="height:65%;width:auto;max-width:14%;object-fit:contain;flex-shrink:0;border-radius:3px"
          onerror="this.style.display='none'">` : ''}
      <div style="min-width:0;flex:1">
        <div style="color:#fff;font-weight:700;font-size:.68em;letter-spacing:.3px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25">
          ${namaInst}
        </div>
        <div style="color:rgba(255,255,255,.42);font-size:.52em;margin-top:.15em">
          ID CARD KARYAWAN
        </div>
      </div>
    </div>

    <!-- BODY: foto kiri + info kanan, vertical center -->
    <div style="flex:1;display:flex;align-items:center;padding:3% 3% 2% 3%;gap:4%;overflow:hidden">

      <!-- Foto: proporsional, border biru -->
      <div style="flex:0 0 34%;aspect-ratio:1/1;border-radius:8%;overflow:hidden;
        border:2px solid rgba(45,108,223,.65);background:#1e3a8a;flex-shrink:0">
        <img src="${fotoSrc}"
          style="width:100%;height:100%;object-fit:cover;display:block"
          onerror="this.src='${avatarInisial(nama, 80)}'">
      </div>

      <!-- Info karyawan -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:0">
        <!-- Nama -->
        <div style="color:#fff;font-weight:700;font-size:.88em;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.25em">
          ${nama}
        </div>
        <!-- Jabatan -->
        <div style="color:#93c5fd;font-size:.68em;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.15em">
          ${jabatan}
        </div>
        <!-- Dept -->
        <div style="color:#475569;font-size:.6em;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.4em">
          ${dept}
        </div>
        <!-- NIK box -->
        <div style="background:#1e3a8a;border-radius:5px;padding:.35em .55em">
          <div style="color:#475569;font-size:.5em;letter-spacing:.4px;margin-bottom:.15em">NIK</div>
          <div style="color:#fff;font-weight:700;font-size:.75em;letter-spacing:.3px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${nik}
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER: alamat + aksen hijau -->
    <div style="flex:0 0 13%;display:flex;overflow:hidden">
      <div style="flex:1;background:#2D6CDF;display:flex;align-items:center;padding:0 3%">
        <span style="color:#fff;font-size:.5em;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis">${alamat}</span>
      </div>
      <div style="width:10%;background:#1A9E74"></div>
    </div>
  </div>`;
}

async function cetakIDCard(idKaryawan) {
  showToast('Menyiapkan ID Card...', 'info', 2000);
  try {
    const ok = await _ensureJsPDF();
    if (!ok || !window.jspdf?.jsPDF) {
      showToast('Library PDF tidak tersedia. Muat ulang halaman.', 'error', 5000);
      return;
    }
    const [k, inst] = await Promise.all([
      callAPI('getKaryawanById', { id_karyawan: idKaryawan }),
      callAPI('getMultipleSetting', { keys: 'nama_instansi,alamat_instansi,logo_url' })
    ]);
    if (!k) throw new Error('Data karyawan tidak ditemukan');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
    const W = 85.6, H = 54;

    // ── Background ───────────────────────────────────────────
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, H, 'F');
    // Aksen segitiga kanan atas
    doc.setFillColor(30, 58, 138);
    doc.triangle(W - 15, 0, W, 0, W, 15, 'F');

    // ── HEADER (h=12mm, y=0–12) ──────────────────────────────
    doc.setFillColor(0, 0, 0, 80);
    doc.rect(0, 0, W, 12, 'F');
    doc.setDrawColor(255, 255, 255, 25);
    doc.setLineWidth(0.3);
    doc.line(0, 12, W, 12);

    // Logo — tinggi 8mm, vertikal center di header 12mm → y=2
    let xTeks = 4;
    const rawLogo = inst?.logo_url ? normalizeDriveUrlFrontend(inst.logo_url || '') : '';
    if (rawLogo && rawLogo.startsWith('http')) {
      try {
        const ld = await _urlToBase64(rawLogo);
        doc.addImage(ld, 'PNG', 3, 2, 8, 8); // x=3,y=2,w=8,h=8
        xTeks = 14;
      } catch(e) { /* skip */ }
    }

    // Nama instansi — center vertikal di header
    // Logo center: y=6. Nama baris 1: y=5.5, baris 2: y=9
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const namaInst = (inst?.nama_instansi || 'INSTANSI').toUpperCase();
    const namaLines = doc.splitTextToSize(namaInst, W - xTeks - 4);
    if (namaLines.length === 1) {
      doc.text(namaLines[0], xTeks, 6.5); // center satu baris
    } else {
      doc.text(namaLines[0], xTeks, 5);
      doc.text(namaLines[1], xTeks, 9);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(160, 175, 200);
    // "ID CARD KARYAWAN" di bawah nama
    const yIDCard = namaLines.length === 1 ? 10 : 12.5;
    // Jika nama 2 baris, teks ini ada di luar header — skip
    if (namaLines.length === 1) {
      doc.text('ID CARD KARYAWAN', xTeks, yIDCard);
    }

    // ── FOTO (x=5, y=18, w=22, h=22 → center di body y=12–47) ─
    // Body: 35mm. Photo: 22mm. Offset: (35-22)/2=6.5 → y=12+6.5=18.5
    const fY = 18, fW = 22, fH = 22, fX = 5;
    // Border
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(fX - 1, fY - 1, fW + 2, fH + 2, 2, 2, 'F');

    const rawFoto = k.foto_profil_url ? normalizeDriveUrlFrontend(k.foto_profil_url) : '';
    let fotoOk = false;
    if (rawFoto && rawFoto.startsWith('http')) {
      try {
        const fd = await _urlToBase64(rawFoto);
        doc.addImage(fd, 'JPEG', fX, fY, fW, fH);
        fotoOk = true;
      } catch(e) { /* gagal load foto */ }
    }
    if (!fotoOk) {
      doc.setFillColor(45, 108, 223);
      doc.roundedRect(fX, fY, fW, fH, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text((k.nama_lengkap || 'K')[0].toUpperCase(), fX + fW / 2, fY + fH / 2 + 2, { align: 'center' });
    }

    // ── INFO KARYAWAN (x=31) ──────────────────────────────────
    const xi = 31;
    const maxW = W - xi - 4;

    // Nama (baseline y=23, sejajar atas foto)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const namaArr = doc.splitTextToSize(k.nama_lengkap || '-', maxW);
    doc.text(namaArr[0], xi, 23);

    // Jabatan
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(147, 197, 253);
    doc.text(k.jabatan || '-', xi, 29, { maxWidth: maxW });

    // Departemen
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(k.departemen || '-', xi, 33.5, { maxWidth: maxW });

    // NIK box — y=37, h=8.5, bottom=45.5 < footer(47) ✓
    const nikW = maxW;
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(xi, 37, nikW, 8.5, 1.5, 1.5, 'F');
    doc.setFontSize(4.8);
    doc.setTextColor(71, 85, 105);
    doc.text('NIK', xi + 2.5, 41);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(String(k.nik || '-'), xi + 2.5, 44.5, { maxWidth: nikW - 5 });

    // ── FOOTER (y=47–54) ─────────────────────────────────────
    doc.setFillColor(45, 108, 223);
    doc.rect(0, 47, W * 0.88, 7, 'F');
    doc.setFillColor(26, 158, 116);
    doc.rect(W * 0.88, 47, W * 0.12, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    const alamat = (inst?.alamat_instansi || '').substring(0, 60);
    if (alamat) doc.text(alamat, W * 0.44, 52, { align: 'center', maxWidth: W * 0.8 });

    doc.save('IDCard_' + (k.nama_lengkap || 'karyawan').replace(/\s+/g, '_') + '.pdf');
    showToast('ID Card berhasil didownload! 🪪', 'success');

  } catch(e) {
    showToast('Gagal cetak ID Card: ' + e.message, 'error', 5000);
    console.error(e);
  }
}


async function lihatProfilKaryawan(idKaryawan) {
  try {
    const k = await callAPI('getKaryawanById', { id_karyawan: idKaryawan });
    if (!k) return;
    const instansi = await callAPI('getMultipleSetting',{keys:'nama_instansi,singkatan_instansi,alamat_instansi,logo_url'});
    const modal = document.createElement('div');
    modal.id    = 'modal-profil-k';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px);overflow-y:auto';
    const fotoSrc = getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 90);
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:0;width:100%;max-width:520px;overflow:hidden;animation:fadeInScale 0.2s ease">
        <div style="background:linear-gradient(135deg,var(--color-primer,#2D6CDF),var(--color-sekunder,#1A9E74));
          padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
          <span style="color:#fff;font-weight:700;font-size:15px">👤 Profil Karyawan</span>
          <button onclick="document.getElementById('modal-profil-k').remove()"
            style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:30px;height:30px;
            color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        <div style="padding:20px;max-height:80vh;overflow-y:auto">
          <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
            <img src="${fotoSrc}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;
              border:3px solid var(--color-primer,#2D6CDF);flex-shrink:0"
              onerror="this.src='${avatarInisial(k.nama_lengkap,80)}'">
            <div>
              <div style="font-weight:700;font-size:18px;color:#1E293B">${k.nama_lengkap}</div>
              <div style="font-size:13px;color:#64748B;margin-top:2px">${k.jabatan||'-'} · ${k.departemen||'-'}</div>
              <div style="font-size:12px;color:#94A3B8;margin-top:2px">NIK: ${k.nik||'-'}</div>
              <span style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:20px;font-size:11px;
                font-weight:700;background:${String(k.status_aktif).toLowerCase()==='true'?'#EBF8EE':'#FFF5F5'};
                color:${String(k.status_aktif).toLowerCase()==='true'?'#1A9E74':'#E53E3E'}">
                ${String(k.status_aktif).toLowerCase()==='true'?'✅ Aktif':'❌ Non-aktif'}</span>
            </div>
          </div>
          <div style="background:#F8FAFC;border-radius:12px;padding:4px 0;margin-bottom:16px">
            ${[
              ['📱','No. HP', k.no_hp],['📧','Email', k.email],
              ['🎂','Tanggal Lahir', formatTanggal(k.tanggal_lahir)],
              ['⚧️','Jenis Kelamin', k.jenis_kelamin==='L'?'Laki-laki':'Perempuan'],
              ['🎓','Pendidikan', k.pendidikan_terakhir],['📅','Bergabung', formatTanggal(k.tanggal_masuk)],
              ['👨‍💼','Atasan', k.nama_atasan],['🏠','Alamat', k.alamat],
              ['🔑','Username', k.username],['🛡️','Role', k.role]
            ].map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #F1F5F9">
              <span style="font-size:14px;width:20px;text-align:center;flex-shrink:0">${r[0]}</span>
              <span style="font-size:12px;color:#94A3B8;min-width:110px;flex-shrink:0">${r[1]}</span>
              <span style="font-size:13px;color:#1E293B;font-weight:500;word-break:break-word">${r[2]||'-'}</span>
            </div>`).join('')}
          </div>
          <!-- ID Card Preview -->
          <div style="margin-bottom:16px">
            <p style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;
              letter-spacing:.6px;margin-bottom:10px">🪪 ID Card</p>
            <div id="idcard-preview-admin" style="width:100%;max-width:340px;
              aspect-ratio:85.6/54;margin:0 auto;border-radius:12px;overflow:hidden;
              box-shadow:0 8px 24px rgba(0,0,0,.2)">
              <div style="width:100%;height:100%;background:#1e293b;display:flex;
                align-items:center;justify-content:center;color:#64748B;font-size:12px">
                Memuat...</div>
            </div>
          </div>
          <!-- Tombol -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
            <button class="btn btn--primary" style="font-size:13px;padding:11px"
              onclick="cetakIDCard('${k.id_karyawan}')">🪪 Cetak ID Card</button>
            <button class="btn btn--ghost" style="font-size:13px;padding:11px"
              onclick="document.getElementById('modal-profil-k').remove();tampilFormEditKaryawan('${k.id_karyawan}')">
              ✏️ Edit Data</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    requestAnimationFrame(() => {
      const wrap = document.getElementById('idcard-preview-admin');
      if (wrap && typeof _idCardPreviewHTML === 'function') {
        wrap.innerHTML = _idCardPreviewHTML(k, instansi);
      }
    });
  } catch(e) { showToast(e.message, 'error'); }
}
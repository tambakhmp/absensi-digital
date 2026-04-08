// ============================================================
// admin_final.js — Sesi 4+5: Fitur Final + Polish
// Harga Lembur CRUD, Ranking Admin, SP Cetak, Pengaturan Final
// ============================================================

// ─────────────────────────────────────────────────────────────
// SESI 4: HARGA LEMBUR ADMIN (CRUD Lengkap)
// ─────────────────────────────────────────────────────────────
async function renderHargaLemburAdminFull(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">💰 Harga Lembur per Jabatan</h2>
      <button class="btn btn--primary" style="font-size:13px"
        onclick="tampilFormHargaLembur(null)">+ Tambah</button>
    </div>
    <div class="card" style="padding:12px;background:#EFF6FF;margin-bottom:14px">
      <p style="font-size:13px;color:#2D6CDF;margin:0">
        💡 Harga lembur digunakan otomatis saat karyawan mengajukan lembur.
        Sistem mencocokkan jabatan karyawan dengan daftar harga di sini.
        Jika jabatan tidak ditemukan, sistem akan pakai harga default Rp 25.000/jam.
      </p>
    </div>
    <div id="harga-lembur-list">${skeletonCard(3)}</div>`;
  await loadHargaLemburList();
}

async function loadHargaLemburList() {
  const el = document.getElementById('harga-lembur-list');
  if (!el) return;
  try {
    const data = await callAPI('getAllHargaLembur', {});
    if (!data || data.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:32px;color:#94A3B8">
        <div style="font-size:40px;margin-bottom:8px">💰</div>
        Belum ada data harga lembur.
      </div>`;
      return;
    }
    el.innerHTML = `<div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table">
        <thead><tr>
          <th>Jabatan</th>
          <th>Harga per Jam</th>
          <th>Berlaku Mulai</th>
          <th style="text-align:center">Aksi</th>
        </tr></thead>
        <tbody>
          ${data.map(h => `<tr>
            <td style="font-weight:600">${h.jabatan}</td>
            <td style="color:#1A9E74;font-weight:600">${formatRupiah(h.harga_per_jam)}</td>
            <td style="font-size:12px;color:#64748B">${formatTanggal(h.berlaku_mulai)}</td>
            <td style="text-align:center">
              <div style="display:flex;gap:6px;justify-content:center">
                <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px"
                  onclick="tampilFormHargaLembur(${JSON.stringify(h).replace(/"/g,'&quot;')})">
                  ✏️ Edit</button>
                <button class="btn" style="padding:5px 10px;font-size:12px;background:#FFF5F5;
                  color:#E53E3E;border:1px solid #FC8181"
                  onclick="hapusHargaLemburAdmin('${h.id}','${h.jabatan}')">
                  🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch(e) { showError('harga-lembur-list', e.message); }
}

function tampilFormHargaLembur(data) {
  const isEdit = !!data?.id;
  const today  = new Date().toISOString().split('T')[0];
  showModal(
    isEdit ? '✏️ Edit Harga Lembur' : '➕ Tambah Harga Lembur',
    `<div style="margin-top:8px">
      <div class="form-group">
        <label class="form-label">Nama Jabatan *</label>
        <input type="text" class="form-control" id="hl-jabatan"
          value="${data?.jabatan||''}" placeholder="Contoh: Staff, Manager, Supervisor">
        <p class="form-hint">Harus sama persis dengan jabatan di data karyawan</p>
      </div>
      <div class="form-group">
        <label class="form-label">Harga per Jam (Rp) *</label>
        <input type="number" class="form-control" id="hl-harga"
          value="${data?.harga_per_jam||25000}" min="0" step="1000"
          oninput="document.getElementById('hl-preview').textContent=
            'Preview: '+parseInt(this.value||0).toLocaleString('id-ID')+'/jam'">
        <div id="hl-preview" style="font-size:12px;color:#1A9E74;margin-top:4px;font-weight:600">
          Preview: ${parseInt(data?.harga_per_jam||25000).toLocaleString('id-ID')}/jam
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Berlaku Mulai *</label>
        <input type="date" class="form-control" id="hl-mulai"
          value="${toInputDate(data?.berlaku_mulai)||today}">
      </div>
    </div>`,
    async () => {
      const jabatan = document.getElementById('hl-jabatan')?.value?.trim();
      const harga   = document.getElementById('hl-harga')?.value;
      const mulai   = document.getElementById('hl-mulai')?.value;
      if (!jabatan) throw new Error('Jabatan wajib diisi');
      if (!harga || parseInt(harga) < 0) throw new Error('Harga tidak valid');
      const payload = {
        jabatan      : jabatan,
        harga_per_jam: parseInt(harga),
        berlaku_mulai: fromInputDate(mulai)
      };
      if (isEdit) payload.id = data.id;
      const r = await callAPI(isEdit ? 'editHargaLembur' : 'setHargaLembur', payload);
      showToast(r.message || 'Harga lembur disimpan ✅', 'success');
      await loadHargaLemburList();
    }, '💾 Simpan'
  );
}

function hapusHargaLemburAdmin(id, jabatan) {
  showModal('🗑️ Hapus Harga Lembur?',
    `Hapus harga lembur untuk jabatan <strong>${jabatan}</strong>?`,
    async () => {
      const r = await callAPI('hapusHargaLembur', { id });
      showToast(r.message, 'success');
      await loadHargaLemburList();
    }, '🗑️ Hapus'
  );
}

// ─────────────────────────────────────────────────────────────
// SESI 4: RANKING ADMIN — Snapshot + Recalculate
// ─────────────────────────────────────────────────────────────
async function renderRankingAdminFull(container) {
  const now = new Date();
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">🏆 Ranking Karyawan</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn--ghost" style="font-size:13px"
          onclick="recalcRanking()">🔄 Hitung Ulang</button>
        <button class="btn btn--ghost" style="font-size:13px"
          onclick="exportRankingExcel()">📊 Export</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <select class="form-control" id="rank-bulan" style="width:150px"
        onchange="loadRankingAdmin()">
        ${Array.from({length:12},(_,i)=>`<option value="${i+1}"
          ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
      </select>
      <input type="number" class="form-control" id="rank-tahun"
        value="${now.getFullYear()}" style="width:90px" onchange="loadRankingAdmin()">
      <button class="btn btn--secondary" style="font-size:13px"
        onclick="loadRankingAdmin()">🔍 Tampilkan</button>
    </div>

    <div id="ranking-admin-content">${skeletonCard(4)}</div>`;

  await loadRankingAdmin();
}

async function loadRankingAdmin() {
  const el    = document.getElementById('ranking-admin-content');
  if (!el) return;
  el.innerHTML = skeletonCard(4);
  const bulan = document.getElementById('rank-bulan')?.value;
  const tahun = document.getElementById('rank-tahun')?.value;
  try {
    const data = await callAPI('getRankingSnapshot', { bulan, tahun });
    if (!data || data.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:32px;color:#94A3B8">
        <div style="font-size:40px;margin-bottom:8px">🏆</div>
        Belum ada data ranking untuk periode ini.<br>
        <button class="btn btn--primary" style="margin-top:14px;font-size:13px"
          onclick="recalcRanking()">⚡ Hitung Sekarang</button>
      </div>`;
      return;
    }
    const PREDIKAT_COLOR = {
      'Bintang Emas'      : '#D69E2E',
      'Bintang Perak'     : '#718096',
      'Bintang Perunggu'  : '#C05621',
      'Perlu Pembinaan'   : '#C53030',
      'Butuh Perhatian'   : '#C05621',
      'Tingkatkan Kinerja': '#D69E2E'
    };
    el.innerHTML = `
      <div class="card" style="padding:0;overflow-x:auto">
        <table class="simple-table" style="min-width:600px">
          <thead><tr>
            <th>#</th>
            <th>Karyawan</th>
            <th>Departemen</th>
            <th style="text-align:center">Hadir</th>
            <th style="text-align:center">Terlambat</th>
            <th style="text-align:center">Alfa</th>
            <th style="text-align:right">Skor</th>
            <th>Predikat</th>
          </tr></thead>
          <tbody>
            ${data.map(r => {
              const warna = PREDIKAT_COLOR[r.predikat] || '#64748B';
              return `<tr>
                <td style="font-weight:700;color:#64748B;font-size:13px">#${r.peringkat}</td>
                <td style="font-weight:600">${r.nama_karyawan}</td>
                <td style="font-size:12px;color:#64748B">${r.departemen||'-'}</td>
                <td style="text-align:center;color:#1A9E74;font-weight:600">${r.total_hadir||0}</td>
                <td style="text-align:center;color:#D97706">${r.total_terlambat||0}</td>
                <td style="text-align:center;color:#E53E3E">${r.total_alfa||0}</td>
                <td style="text-align:right;font-weight:700">${r.skor_kehadiran||0}</td>
                <td>
                  ${r.predikat ? `<span style="background:${warna}22;color:${warna};
                    border:1px solid ${warna}44;padding:2px 10px;border-radius:20px;
                    font-size:11px;font-weight:600;white-space:nowrap">${r.predikat}</span>` : '-'}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:12px;color:#94A3B8;text-align:right;margin-top:8px;padding:0 4px">
        Total: ${data.length} karyawan
      </div>`;
  } catch(e) { showError('ranking-admin-content', e.message); }
}

async function recalcRanking() {
  showToast('Menghitung ranking...', 'info', 2000);
  try {
    const r = await callAPI('hitungRanking', {});
    showToast(r.message || 'Ranking berhasil dihitung ✅', 'success', 5000);
    await loadRankingAdmin();
  } catch(e) { showToast(e.message, 'error'); }
}

async function exportRankingExcel() {
  if (typeof XLSX === 'undefined') { showToast('SheetJS belum dimuat', 'warning'); return; }
  const bulan = document.getElementById('rank-bulan')?.value;
  const tahun = document.getElementById('rank-tahun')?.value;
  try {
    const data = await callAPI('getRankingSnapshot', { bulan, tahun });
    if (!data || data.length === 0) { showToast('Tidak ada data ranking', 'warning'); return; }
    const headers = ['Peringkat','Nama','Departemen','Hadir','Terlambat','Alfa',
                     'Izin','Sakit','Cuti','Skor','Predikat'];
    const rows = data.map(r => [
      r.peringkat, r.nama_karyawan, r.departemen,
      r.total_hadir, r.total_terlambat, r.total_alfa,
      r.total_izin, r.total_sakit, r.total_cuti,
      r.skor_kehadiran, r.predikat
    ]);
    const ws = XLSX.utils.aoa_to_sheet([
      ['RANKING KARYAWAN — ' + bulanNama(parseInt(bulan)) + ' ' + tahun],
      [], headers, ...rows
    ]);
    ws['!cols'] = [{wch:5},{wch:25},{wch:18},{wch:8},{wch:10},{wch:8},
                   {wch:8},{wch:8},{wch:8},{wch:8},{wch:20}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking');
    XLSX.writeFile(wb, 'Ranking_'+bulanNama(parseInt(bulan))+'_'+tahun+'.xlsx');
    showToast('Export Excel berhasil 📊', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

// ─────────────────────────────────────────────────────────────
// SESI 5: DASHBOARD LENGKAP KARYAWAN - Status GPS + Lokasi Info
// ─────────────────────────────────────────────────────────────
async function loadStatusAbsenHariIni() {
  try {
    const data = await callAPI('getStatusAbsenHariIni', {});
    if (!data) return;

    const elMasuk  = document.getElementById('btn-absen-masuk');
    const elKeluar = document.getElementById('btn-absen-keluar');
    const elStatus = document.getElementById('status-absen-info');
    const elShift  = document.getElementById('info-shift');

    // Update tombol
    if (data.sudah_absen_masuk  && elMasuk)  { elMasuk.disabled  = true; elMasuk.style.opacity  = '0.5'; }
    if (data.sudah_absen_keluar && elKeluar) { elKeluar.disabled = true; elKeluar.style.opacity = '0.5'; }

    // Status bar absensi
    if (elStatus) {
      if (data.sudah_absen_masuk) {
        elStatus.innerHTML = `
          <div style="background:#EBF8EE;border-radius:10px;padding:12px;text-align:center;
            margin-bottom:12px;border:1px solid #9AE6B4">
            <div style="font-size:14px;color:#1A9E74;font-weight:600">
              ✅ Absen Masuk: ${data.jam_masuk}
              ${data.sudah_absen_keluar ? ' · 🔴 Keluar: '+data.jam_keluar : ''}
            </div>
            ${data.status ? `<div style="font-size:12px;color:#64748B;margin-top:3px">
              Status: ${badgeStatus(data.status)}</div>` : ''}
          </div>`;
      }
    }

    // Info shift
    if (elShift && data.shift) {
      elShift.textContent = data.shift.nama_shift + ' · ' +
        data.shift.jam_masuk + ' – ' + data.shift.jam_keluar;
    }

    // Warning jika lokasi kantor belum dikonfigurasi
    if (!data.lokasi_aktif) {
      const warnEl = document.getElementById('lokasi-warning');
      if (warnEl) {
        warnEl.style.display = 'block';
        warnEl.innerHTML = `
          <div style="background:#FFF8DC;border:1px solid #ECC94B;border-radius:10px;
            padding:12px;font-size:13px;color:#744210;margin-bottom:12px">
            ⚠️ Lokasi kantor belum dikonfigurasi. Absensi GPS tidak bisa dilakukan.<br>
            Hubungi administrator.
          </div>`;
      }
    }

    // Dinas luar
    if (data.is_dinas_luar) {
      const dinasEl = document.getElementById('status-absen-info');
      if (dinasEl && !data.sudah_absen_masuk) {
        dinasEl.innerHTML += `<div style="background:#FFF4E6;border:1px solid #F6AD55;
          border-radius:10px;padding:10px;font-size:13px;color:#C05621;margin-bottom:12px">
          🚗 Anda sedang dalam status Dinas Luar — GPS tidak diperlukan untuk absensi.
        </div>`;
      }
    }
  } catch(e) { console.warn('loadStatus error:', e.message); }
}

// ─────────────────────────────────────────────────────────────
// SESI 5: PENGATURAN - Route tambahan di sidebar
// ─────────────────────────────────────────────────────────────
function getSidebarMenus(role) {
  const isSA = role === 'superadmin';
  const menus = [
    { id:'dashboard-admin',  icon:'📊', label:'Dashboard'         },
    { id:'absensi-semua',    icon:'📋', label:'Absensi'           },
    { id:'karyawan-list',    icon:'👥', label:'Karyawan'          },
    { id:'pengajuan-admin',  icon:'📁', label:'Pengajuan'         },
    { id:'lembur-admin',     icon:'🕒', label:'Lembur'            },
    { id:'harga-lembur',     icon:'💰', label:'Harga Lembur'      },
    { id:'ranking-admin',    icon:'🏆', label:'Ranking'           },
    { id:'sp-admin',         icon:'⚠️', label:'Surat Peringatan'  },
    { id:'pengumuman-admin', icon:'📢', label:'Pengumuman'        },
    { id:'lokasi-admin',     icon:'📍', label:'Lokasi Kantor'     },
    { id:'shift-admin',      icon:'🕐', label:'Shift & Jadwal'    },
    { id:'laporan-admin',    icon:'📊', label:'Laporan & Rekap'   },
    ...(isSA ? [
      { id:'device-admin',     icon:'📱', label:'Reset Device'    },
      { id:'pengaturan-admin', icon:'⚙️', label:'Pengaturan'      }
    ] : [])
  ];
  return menus;
}

// Rebuild sidebar dengan menu lengkap
function buildSidebar(role) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  const menus = getSidebarMenus(role);
  nav.innerHTML = menus.map(m =>
    `<button class="sidebar__item" data-page="${m.id}">
      <span class="sidebar__icon">${m.icon}</span>
      <span class="sidebar__label">${m.label}</span>
    </button>`
  ).join('') +
  `<div style="flex:1"></div>
   <div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.08)">
     <button class="sidebar__item" data-page="_logout">
       <span class="sidebar__icon">🚪</span>
       <span class="sidebar__label">Logout</span>
     </button>
   </div>`;

  nav.addEventListener('click', e => {
    const item = e.target.closest('.sidebar__item');
    if (!item) return;
    const page = item.dataset.page;
    if (page === '_logout') { confirmLogout(); return; }
    nav.querySelectorAll('.sidebar__item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    const title = document.getElementById('admin-page-title');
    if (title) title.textContent = item.querySelector('.sidebar__label')?.textContent || '';

    // Tutup sidebar di mobile
    if (window.innerWidth <= 768) toggleSidebar();

    routeAdminFull(page);
  });
}

function routeAdminFull(page) {
  const content = document.getElementById('admin-content');
  if (!content) return;

  if (page === 'dashboard-admin')  { renderAdminDashboardContent(content); return; }
  if (page === 'absensi-semua')    { renderAbsensiAdminFull(content);       return; }
  if (page === 'karyawan-list')    { renderKaryawanAdminFull(content);      return; }
  if (page === 'pengajuan-admin')  { renderPengajuanAdminContent(content);  return; }
  if (page === 'lembur-admin')     { renderLemburAdminFull(content);        return; }
  if (page === 'harga-lembur')     { renderHargaLemburAdminFull(content);   return; }
  if (page === 'ranking-admin')    { renderRankingAdminFull(content);       return; }
  if (page === 'sp-admin')         { renderSPAdminFull(content);            return; }
  if (page === 'pengumuman-admin') { renderPengumumanAdminFull(content);    return; }
  if (page === 'lokasi-admin')     { renderLokasiAdminV3(content);          return; }
  if (page === 'shift-admin')      { renderShiftJadwalAdmin(content);       return; }
  if (page === 'laporan-admin')    { renderLaporanAdminV3(content);         return; }
  if (page === 'device-admin')     { renderDeviceAdmin(content);            return; }
  if (page === 'pengaturan-admin') {
    content.innerHTML = `<h2 style="font-size:17px;font-weight:700;margin-bottom:16px">⚙️ Pengaturan Sistem</h2>
      <div id="pengaturan-container">${skeletonCard(4)}</div>`;
    loadPengaturanAdminV3();
    return;
  }
  content.innerHTML = `<div style="padding:24px;color:#64748B">Halaman tidak ditemukan: ${page}</div>`;
}

// ─────────────────────────────────────────────────────────────
// SESI 5: SERVICE WORKER UPDATE NOTIFICATION
// ─────────────────────────────────────────────────────────────
function initSWUpdateNotif() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // Ada versi baru
            const banner = document.createElement('div');
            banner.style.cssText = `position:fixed;bottom:80px;left:16px;right:16px;z-index:9999;
              background:var(--color-primer,#2D6CDF);color:#fff;border-radius:12px;padding:14px 16px;
              display:flex;align-items:center;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,.2)`;
            banner.innerHTML = `
              <span style="flex:1;font-size:13px;font-weight:600">
                🆕 Versi baru tersedia!
              </span>
              <button onclick="window.location.reload()" style="background:rgba(255,255,255,.2);
                color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;
                cursor:pointer;font-weight:600">Update</button>
              <button onclick="this.parentElement.remove()" style="background:none;
                color:rgba(255,255,255,.7);border:none;cursor:pointer;font-size:18px">✕</button>`;
            document.body.appendChild(banner);
          }
        });
      });
    });
  }
}

// ─────────────────────────────────────────────────────────────
// SESI 5: INSTALL PROMPT (lebih agresif)
// ─────────────────────────────────────────────────────────────
let _deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstall = e;
  // Tampilkan banner install setelah 30 detik
  setTimeout(() => {
    if (_deferredInstall && !window.matchMedia('(display-mode: standalone)').matches) {
      _showInstallBanner();
    }
  }, 30000);
});

function _showInstallBanner() {
  if (document.getElementById('install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.style.cssText = `position:fixed;bottom:70px;left:16px;right:16px;z-index:1000;
    background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:14px;
    box-shadow:0 8px 32px rgba(0,0,0,.12);animation:slideUp 0.3s ease`;
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <div style="font-size:32px">📲</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px;margin-bottom:2px">Instal Aplikasi</div>
        <div style="font-size:12px;color:#64748B">Akses lebih cepat dari layar utama</div>
      </div>
      <button onclick="installPWANow()" style="background:var(--color-primer,#2D6CDF);
        color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;
        font-weight:600;cursor:pointer">Instal</button>
      <button onclick="document.getElementById('install-banner').remove()"
        style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:18px">✕</button>
    </div>`;
  document.body.appendChild(banner);
}

async function installPWANow() {
  if (!_deferredInstall) return;
  _deferredInstall.prompt();
  const { outcome } = await _deferredInstall.userChoice;
  document.getElementById('install-banner')?.remove();
  if (outcome === 'accepted') showToast('Aplikasi berhasil diinstal! ✅', 'success');
  _deferredInstall = null;
}

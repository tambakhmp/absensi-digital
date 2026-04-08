// ============================================================
// admin_pages_v3.js — Sesi 3: Fix semua bug + fitur baru
// ============================================================

// ─────────────────────────────────────────────────────────────
// HELPER: Dropdown Karyawan (nama + search)
// Dipakai di semua form yang butuh pilih karyawan
// ─────────────────────────────────────────────────────────────
let _karyawanDropdownCache = null;

async function loadKaryawanDropdown() {
  if (_karyawanDropdownCache) return _karyawanDropdownCache;
  try {
    const data = await callAPI('getKaryawanAktif', {});
    _karyawanDropdownCache = data || [];
    return _karyawanDropdownCache;
  } catch(e) { return []; }
}

function buildKaryawanSelect(id, label, karyawanList, placeholder = 'Pilih karyawan...') {
  const opts = karyawanList.map(k =>
    `<option value="${k.id_karyawan}" data-nama="${k.nama_lengkap}" data-nik="${k.nik||''}">
      ${k.nama_lengkap} — ${k.jabatan||''}
    </option>`
  ).join('');
  return `<div class="form-group">
    <label class="form-label">${label}</label>
    <select class="form-control" id="${id}">
      <option value="">${placeholder}</option>
      ${opts}
    </select>
    <p class="form-hint">Ketik untuk mencari nama karyawan</p>
  </div>`;
}

// Buat elemen select yang searchable (simulasi autocomplete)
function makeSelectSearchable(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative';

  const input = document.createElement('input');
  input.type  = 'text';
  input.className = 'form-control';
  input.placeholder = 'Ketik nama karyawan...';
  input.style.cssText = 'width:100%';

  const dropdown = document.createElement('div');
  dropdown.style.cssText = `position:absolute;top:100%;left:0;right:0;background:#fff;
    border:1px solid #E2E8F0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);
    max-height:200px;overflow-y:auto;z-index:1000;display:none`;

  sel.style.display = 'none';
  sel.parentNode.insertBefore(wrapper, sel);
  wrapper.appendChild(input);
  wrapper.appendChild(dropdown);
  wrapper.appendChild(sel);

  const options = Array.from(sel.options).filter(o => o.value);

  function renderDropdown(query) {
    const q       = query.toLowerCase();
    const filtered= options.filter(o =>
      o.text.toLowerCase().includes(q) || (o.dataset.nik||'').includes(q)
    );
    dropdown.innerHTML = filtered.slice(0,20).map(o =>
      `<div data-value="${o.value}" style="padding:10px 12px;cursor:pointer;font-size:13px;
        border-bottom:1px solid #F1F5F9;hover:background:#F8FAFC">
        <strong>${o.text.split('—')[0].trim()}</strong>
        <span style="color:#94A3B8;font-size:11px"> — ${o.text.split('—')[1]||''}</span>
      </div>`
    ).join('') || '<div style="padding:12px;color:#94A3B8;font-size:13px;text-align:center">Tidak ditemukan</div>';
    dropdown.style.display = filtered.length > 0 || query ? 'block' : 'none';
  }

  input.addEventListener('input', () => renderDropdown(input.value));
  input.addEventListener('focus', () => renderDropdown(input.value));

  dropdown.addEventListener('click', e => {
    const item = e.target.closest('[data-value]');
    if (!item) return;
    sel.value   = item.dataset.value;
    input.value = options.find(o => o.value === item.dataset.value)?.text.split('—')[0].trim() || '';
    dropdown.style.display = 'none';
    sel.dispatchEvent(new Event('change'));
  });

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) dropdown.style.display = 'none';
  });
}

// ─────────────────────────────────────────────────────────────
// PERBAIKAN 1: Dashboard Admin — tambah Dinas Luar
// ─────────────────────────────────────────────────────────────
async function loadDashboardAdminV3() {
  try {
    showLoading('admin-stats-container', 'Memuat statistik...');
    const stats = await callAPI('getStatsDashboard', {});
    if (!stats) return;

    document.getElementById('admin-stats-container').innerHTML = `
      <div class="stat-grid-admin">
        ${statCard('👥','Karyawan Aktif',  stats.karyawan_aktif,  '#2D6CDF')}
        ${statCard('✅','Hadir Hari Ini',  stats.hadir_hari_ini,  '#1A9E74')}
        ${statCard('⏰','Terlambat',        stats.terlambat,       '#D97706')}
        ${statCard('❌','Alfa',             stats.alfa,            '#E53E3E')}
        ${statCard('🚗','Dinas Luar',       stats.dinas_luar||0,   '#EA580C')}
        ${statCard('🏥','Izin/Sakit',       stats.izin_sakit,      '#6C63FF')}
        ${statCard('📋','Pending Pengajuan',stats.pending,         '#0891B2')}
        ${statCard('⚠️','SP Aktif',         stats.sp_aktif,        '#C53030')}
      </div>`;

    if (stats.chart_6_bulan) renderChart6Bulan(stats.chart_6_bulan);
    if (stats.ultah_hari_ini?.length > 0) renderUltahSection(stats.ultah_hari_ini);
    await renderRankingSection('admin-ranking-section');
  } catch(e) {
    document.getElementById('admin-stats-container').innerHTML =
      `<div style="color:#E53E3E;padding:20px">Gagal: ${e.message}</div>`;
  }
}

function renderUltahSection(ultah) {
  const el = document.getElementById('ultah-section');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `<div class="card">
    <h3 style="font-size:15px;margin-bottom:12px">🎂 Ulang Tahun Hari Ini (${ultah.length} orang)</h3>
    ${ultah.map(k => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9">
        <img src="${getPhotoSrc(k.foto, k.nama)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover"
          onerror="this.src='${avatarInisial(k.nama,36)}'">
        <div>
          <div style="font-weight:600;font-size:14px">${k.nama} 🎂</div>
          <div style="font-size:12px;color:#64748B">${k.jabatan} · ${k.departemen}</div>
        </div>
        <span style="margin-left:auto;font-size:12px;color:#D97706;font-weight:600">Umur ${k.umur} thn</span>
      </div>`).join('')}
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// PERBAIKAN 2: Absensi Manual — Dropdown nama karyawan
// ─────────────────────────────────────────────────────────────
async function tampilFormAbsensiManualV3() {
  const karyawanList = await loadKaryawanDropdown();

  const modal = document.createElement('div');
  modal.id    = 'modal-absensi-manual';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;
    display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)`;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:480px;
      max-height:90vh;overflow-y:auto;animation:fadeInScale 0.2s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:17px">📝 Input Absensi Manual</h3>
        <button onclick="document.getElementById('modal-absensi-manual').remove()"
          style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
      </div>
      <div id="manual-error" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
        border-radius:8px;padding:10px;color:#C53030;font-size:13px;margin-bottom:12px"></div>

      ${buildKaryawanSelect('manual-karyawan-select', 'Pilih Karyawan *', karyawanList)}

      <div class="form-group">
        <label class="form-label">Tanggal *</label>
        <input type="date" class="form-control" id="manual-tgl-v3"
          value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="form-label">Jam Masuk</label>
          <input type="time" class="form-control" id="manual-masuk-v3" value="08:00">
        </div>
        <div class="form-group">
          <label class="form-label">Jam Keluar</label>
          <input type="time" class="form-control" id="manual-keluar-v3" value="16:00">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Status *</label>
        <select class="form-control" id="manual-status-v3">
          <option value="hadir">✅ Hadir</option>
          <option value="terlambat">⏰ Terlambat</option>
          <option value="alfa">❌ Alfa</option>
          <option value="izin">📝 Izin</option>
          <option value="sakit">🏥 Sakit</option>
          <option value="cuti">🏖️ Cuti</option>
          <option value="dinas_luar">🚗 Dinas Luar</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Keterangan</label>
        <input type="text" class="form-control" id="manual-ket-v3" placeholder="Opsional">
      </div>
      <button class="btn btn--primary btn--full" onclick="submitAbsensiManualV3()">
        <div class="spinner-btn"></div>
        <span class="btn-text">💾 Simpan Absensi</span>
      </button>
    </div>`;

  document.body.appendChild(modal);
  // Aktifkan fitur search pada dropdown
  setTimeout(() => makeSelectSearchable('manual-karyawan-select'), 100);
}

async function submitAbsensiManualV3() {
  const btn  = document.querySelector('#modal-absensi-manual .btn--primary');
  const err  = document.getElementById('manual-error');
  if (btn) { btn.disabled=true; btn.classList.add('loading'); }
  if (err) err.style.display = 'none';

  try {
    const idK    = document.getElementById('manual-karyawan-select')?.value;
    const tgl    = document.getElementById('manual-tgl-v3')?.value;
    const masuk  = document.getElementById('manual-masuk-v3')?.value;
    const keluar = document.getElementById('manual-keluar-v3')?.value;
    const status = document.getElementById('manual-status-v3')?.value;
    const ket    = document.getElementById('manual-ket-v3')?.value;

    if (!idK)    throw new Error('Pilih karyawan terlebih dahulu');
    if (!tgl)    throw new Error('Tanggal wajib diisi');
    if (!status) throw new Error('Status wajib dipilih');

    const r = await callAPI('absensiManual', {
      id_karyawan: idK,
      tanggal    : fromInputDate(tgl),
      jam_masuk  : masuk,
      jam_keluar : keluar,
      status,
      keterangan : ket || 'Input manual oleh admin'
    });

    document.getElementById('modal-absensi-manual')?.remove();
    showToast(r.message, 'success');
    loadAbsensiAdmin();
  } catch(e) {
    if (err) { err.style.display='block'; err.textContent='⚠️ '+e.message; }
    else showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

// ─────────────────────────────────────────────────────────────
// PERBAIKAN 3: Laporan — search nama + range tanggal kustom
// ─────────────────────────────────────────────────────────────
async function renderLaporanAdminV3(container) {
  const karyawanList = await loadKaryawanDropdown();
  const now = new Date();
  const thisMonth = String(now.getMonth()+1).padStart(2,'0');
  const thisYear  = now.getFullYear();

  container.innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">📊 Laporan & Rekap</h2>

    <!-- Rekap Per Karyawan -->
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">📄 Rekap Per Karyawan (PDF)</h3>

      ${buildKaryawanSelect('lap-karyawan-select', 'Pilih Karyawan *', karyawanList)}

      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn btn--ghost" style="font-size:12px" id="btn-range-bulan"
          onclick="toggleRangePicker('bulan')">📅 Per Bulan</button>
        <button class="btn btn--ghost" style="font-size:12px" id="btn-range-custom"
          onclick="toggleRangePicker('custom')">📆 Rentang Tanggal</button>
      </div>

      <!-- Pilih Bulan -->
      <div id="range-bulan" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Bulan</label>
          <select class="form-control" id="lap-bulan">
            ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Tahun</label>
          <input type="number" class="form-control" id="lap-tahun" value="${thisYear}" min="2020">
        </div>
      </div>

      <!-- Rentang Tanggal Kustom -->
      <div id="range-custom" style="display:none;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">📅 Dari Tanggal</label>
          <input type="date" class="form-control" id="lap-dari">
          <p class="form-hint">Contoh: 25 Maret 2026</p>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">📅 Sampai Tanggal</label>
          <input type="date" class="form-control" id="lap-ke">
          <p class="form-hint">Contoh: 25 April 2026</p>
        </div>
      </div>

      <button class="btn btn--primary" onclick="cetakRekapPDFv3()">
        <div class="spinner-btn"></div>
        <span class="btn-text">📄 Cetak PDF Rekap + TTD</span>
      </button>
    </div>

    <!-- Rekap Semua Karyawan Excel -->
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">📊 Rekap Semua Karyawan (Excel)</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;flex-wrap:wrap">
        <div class="form-group">
          <label class="form-label">Bulan</label>
          <select class="form-control" id="lap-all-bulan">
            ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tahun</label>
          <input type="number" class="form-control" id="lap-all-tahun" value="${thisYear}">
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end">
          <button class="btn btn--secondary btn--full" onclick="exportRekapExcelV3()">📊 Export Excel</button>
        </div>
      </div>
      <div style="background:#EFF6FF;border-radius:8px;padding:10px;font-size:12px;color:#2D6CDF;margin-top:4px">
        💡 Export Excel otomatis membuat sheet terpisah per departemen
      </div>
    </div>

    <!-- Rekap Lembur -->
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">🧾 Rekap Lembur</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Bulan</label>
          <select class="form-control" id="lap-lb-bulan" style="width:150px">
            ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Tahun</label>
          <input type="number" class="form-control" id="lap-lb-tahun" value="${thisYear}" style="width:100px">
        </div>
        <button class="btn btn--primary"   style="height:42px" onclick="cetakRekapLemburPDFv3()">📄 PDF</button>
        <button class="btn btn--secondary" style="height:42px" onclick="exportRekapLemburExcelV3()">📊 Excel</button>
      </div>
    </div>`;

  // Aktifkan search pada dropdown
  setTimeout(() => makeSelectSearchable('lap-karyawan-select'), 100);
  // Set default state
  toggleRangePicker('bulan');
}

function toggleRangePicker(mode) {
  const bulanEl  = document.getElementById('range-bulan');
  const customEl = document.getElementById('range-custom');
  const btnBulan = document.getElementById('btn-range-bulan');
  const btnCustom= document.getElementById('btn-range-custom');

  if (mode === 'bulan') {
    if (bulanEl)  bulanEl.style.display  = 'grid';
    if (customEl) customEl.style.display = 'none';
    if (btnBulan)  btnBulan.style.background  = 'var(--color-primer)';
    if (btnBulan)  btnBulan.style.color = '#fff';
    if (btnCustom) btnCustom.style.background = '#F1F5F9';
    if (btnCustom) btnCustom.style.color = '';
  } else {
    if (bulanEl)  bulanEl.style.display  = 'none';
    if (customEl) customEl.style.display = 'grid';
    if (btnCustom) btnCustom.style.background = 'var(--color-primer)';
    if (btnCustom) btnCustom.style.color = '#fff';
    if (btnBulan)  btnBulan.style.background = '#F1F5F9';
    if (btnBulan)  btnBulan.style.color = '';
  }
}

async function cetakRekapPDFv3() {
  const idK     = document.getElementById('lap-karyawan-select')?.value;
  if (!idK) { showToast('Pilih karyawan terlebih dahulu', 'warning'); return; }

  const modeCustom = document.getElementById('range-custom')?.style.display !== 'none';
  let payload = { id_karyawan: idK };

  if (modeCustom) {
    const dari = document.getElementById('lap-dari')?.value;
    const ke   = document.getElementById('lap-ke')?.value;
    if (!dari || !ke) { showToast('Isi tanggal dari dan sampai', 'warning'); return; }
    if (dari > ke)    { showToast('Tanggal awal tidak boleh lebih dari akhir', 'warning'); return; }
    payload.tanggal_dari = fromInputDate(dari);
    payload.tanggal_ke   = fromInputDate(ke);
  } else {
    payload.bulan = document.getElementById('lap-bulan')?.value;
    payload.tahun = document.getElementById('lap-tahun')?.value;
  }

  // Panggil laporan.js cetakRekapPDF yang sudah ada
  await cetakRekapPDF(idK, payload.bulan, payload.tahun, payload.tanggal_dari, payload.tanggal_ke);
}

function exportRekapExcelV3() {
  const b = document.getElementById('lap-all-bulan')?.value;
  const t = document.getElementById('lap-all-tahun')?.value;
  exportRekapExcel(b, t);
}

function cetakRekapLemburPDFv3() {
  cetakRekapLemburPDF(
    document.getElementById('lap-lb-bulan')?.value,
    document.getElementById('lap-lb-tahun')?.value
  );
}

function exportRekapLemburExcelV3() {
  exportRekapLemburExcel(
    document.getElementById('lap-lb-bulan')?.value,
    document.getElementById('lap-lb-tahun')?.value
  );
}

// ─────────────────────────────────────────────────────────────
// PERBAIKAN 4: Lokasi Kantor — fix koordinat + test GPS
// ─────────────────────────────────────────────────────────────
async function renderLokasiAdminV3(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📍 Lokasi Kantor & Radius GPS</h2>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormLokasiV3(null)">
        + Tambah Lokasi
      </button>
    </div>

    <div class="card" style="padding:12px;background:#EFF6FF;margin-bottom:12px">
      <p style="font-size:13px;color:#2D6CDF;margin:0;line-height:1.6">
        💡 <strong>Cara mendapat koordinat:</strong><br>
        1. Buka <a href="https://maps.google.com" target="_blank" style="color:#2D6CDF">Google Maps</a>
        di browser → Klik titik kantor Anda<br>
        2. Koordinat muncul di bawah layar, contoh: <strong>-1.4748, 120.5116</strong><br>
        3. Salin ke form. Gunakan tombol "📍 Pakai Lokasi Saya Sekarang" untuk otomatis.
      </p>
    </div>

    <div id="lokasi-list-v3">${skeletonCard(2)}</div>`;

  await loadLokasiListV3();
}

async function loadLokasiListV3() {
  const el = document.getElementById('lokasi-list-v3');
  if (!el) return;
  try {
    const data = await callAPI('getLokasi', {});
    if (!data || data.length === 0) {
      el.innerHTML = `<div class="card" style="text-align:center;padding:32px;color:#94A3B8">
        <div style="font-size:40px;margin-bottom:8px">📍</div>
        <div>Belum ada lokasi kantor.</div>
        <button class="btn btn--primary" style="margin-top:12px" onclick="tampilFormLokasiV3(null)">
          + Tambah Lokasi Pertama
        </button>
      </div>`;
      return;
    }
    el.innerHTML = data.map(l => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:20px">📍</span>
              <span style="font-weight:700;font-size:16px">${l.nama_lokasi}</span>
              <span style="background:${String(l.status_aktif).toLowerCase()==='true'?'#EBF8EE':'#F1F5F9'};
                color:${String(l.status_aktif).toLowerCase()==='true'?'#1A9E74':'#94A3B8'};
                font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600">
                ${String(l.status_aktif).toLowerCase()==='true' ? '✅ Aktif' : '⏹ Non-aktif'}
              </span>
            </div>
            <div style="font-family:monospace;font-size:13px;color:#475569;margin-bottom:4px;
              background:#F8FAFC;padding:6px 10px;border-radius:6px;display:inline-block">
              Lat: ${l.latitude} | Lon: ${l.longitude}
            </div>
            <div style="font-size:14px;color:#2D6CDF;font-weight:600;margin:4px 0">
              ⭕ Radius Absensi: <strong>${l.radius_meter} meter</strong>
            </div>
            ${l.keterangan ? `<div style="font-size:12px;color:#94A3B8">${l.keterangan}</div>` : ''}
            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
              <a href="https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}"
                target="_blank" class="btn btn--ghost" style="padding:6px 12px;font-size:12px">
                🗺️ Lihat di Maps
              </a>
              <button class="btn btn--ghost" style="padding:6px 12px;font-size:12px"
                onclick="testGPSLokasi(${l.latitude},${l.longitude},${l.radius_meter},'${l.nama_lokasi}')">
                📡 Test GPS
              </button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn btn--primary" style="padding:8px 14px;font-size:13px"
              onclick="tampilFormLokasiV3(${JSON.stringify(l).replace(/"/g,'&quot;')})">✏️ Edit</button>
            <button class="btn btn--danger" style="padding:8px 14px;font-size:13px"
              onclick="hapusLokasiV3('${l.id_lokasi}','${l.nama_lokasi}')">🗑️ Hapus</button>
          </div>
        </div>
      </div>`).join('');
  } catch(e) { showError('lokasi-list-v3', e.message); }
}

function tampilFormLokasiV3(lokasiData) {
  const isEdit = !!lokasiData?.id_lokasi;
  const modal  = document.createElement('div');
  modal.id     = 'modal-lokasi-v3';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;
    display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)`;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:480px;
      animation:fadeInScale 0.2s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:17px">${isEdit ? '✏️ Edit' : '➕ Tambah'} Lokasi Kantor</h3>
        <button onclick="document.getElementById('modal-lokasi-v3').remove()"
          style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
      </div>
      <div id="lokasi-error" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
        border-radius:8px;padding:10px;color:#C53030;font-size:13px;margin-bottom:12px"></div>

      <div class="form-group">
        <label class="form-label">Nama Lokasi *</label>
        <input type="text" class="form-control" id="lok-nama-v3"
          value="${lokasiData?.nama_lokasi||''}" placeholder="Contoh: Kantor Pusat">
      </div>

      <button class="btn btn--ghost btn--full" style="margin-bottom:12px;font-size:13px"
        onclick="gunakanLokasiSekarangV3()">
        📍 Gunakan Lokasi Saya Sekarang (GPS)
      </button>

      <div id="gps-loading" style="display:none;text-align:center;padding:8px;
        font-size:13px;color:#2D6CDF">⏳ Mendapatkan koordinat GPS...</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="form-label">Latitude *</label>
          <input type="text" class="form-control" id="lok-lat-v3"
            value="${lokasiData?.latitude||''}" placeholder="-5.1477">
          <p class="form-hint">Angka negatif = Selatan</p>
        </div>
        <div class="form-group">
          <label class="form-label">Longitude *</label>
          <input type="text" class="form-control" id="lok-lon-v3"
            value="${lokasiData?.longitude||''}" placeholder="119.4328">
          <p class="form-hint">Angka positif = Timur</p>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Radius Absensi (meter) *</label>
        <input type="range" class="form-control" id="lok-radius-slider"
          min="10" max="1000" step="10" value="${lokasiData?.radius_meter||100}"
          style="padding:0;height:auto"
          oninput="document.getElementById('lok-radius-v3').value=this.value;
                   document.getElementById('lok-radius-display').textContent=this.value+' m'">
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          <input type="number" class="form-control" id="lok-radius-v3"
            value="${lokasiData?.radius_meter||100}" min="10" max="5000" style="width:100px"
            oninput="document.getElementById('lok-radius-slider').value=this.value;
                     document.getElementById('lok-radius-display').textContent=this.value+' m'">
          <span id="lok-radius-display" style="font-size:14px;font-weight:700;color:#2D6CDF">
            ${lokasiData?.radius_meter||100} m
          </span>
        </div>
        <p class="form-hint">Jarak maks karyawan dari titik kantor saat absen. Rekomendasi: 50–200 m</p>
      </div>

      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="lok-status-v3">
          <option value="true"  ${String(lokasiData?.status_aktif).toLowerCase()==='true' ?'selected':''}>✅ Aktif</option>
          <option value="false" ${String(lokasiData?.status_aktif).toLowerCase()==='false'?'selected':''}>⏹ Non-aktif</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Keterangan</label>
        <input type="text" class="form-control" id="lok-ket-v3" value="${lokasiData?.keterangan||''}">
      </div>

      <button class="btn btn--primary btn--full btn--lg" onclick="simpanLokasiV3('${lokasiData?.id_lokasi||''}')">
        <div class="spinner-btn"></div>
        <span class="btn-text">💾 Simpan Lokasi</span>
      </button>
    </div>`;

  document.body.appendChild(modal);
}

async function gunakanLokasiSekarangV3() {
  const loadEl = document.getElementById('gps-loading');
  if (loadEl) loadEl.style.display = 'block';
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject,
        { enableHighAccuracy: true, timeout: 15000 });
    });
    const lat = pos.coords.latitude.toFixed(6);
    const lon = pos.coords.longitude.toFixed(6);
    document.getElementById('lok-lat-v3').value = lat;
    document.getElementById('lok-lon-v3').value = lon;
    showToast(`✅ Koordinat didapat: ${lat}, ${lon}`, 'success');
  } catch(e) {
    showToast('Gagal ambil GPS: ' + e.message, 'error');
  } finally {
    if (loadEl) loadEl.style.display = 'none';
  }
}

async function simpanLokasiV3(idLokasi) {
  const btn = document.querySelector('#modal-lokasi-v3 .btn--primary');
  const err = document.getElementById('lokasi-error');
  if (btn) { btn.disabled=true; btn.classList.add('loading'); }
  if (err) err.style.display = 'none';

  try {
    const nama    = document.getElementById('lok-nama-v3')?.value?.trim();
    const lat     = document.getElementById('lok-lat-v3')?.value?.trim();
    const lon     = document.getElementById('lok-lon-v3')?.value?.trim();
    const radius  = document.getElementById('lok-radius-v3')?.value;
    const status  = document.getElementById('lok-status-v3')?.value;
    const ket     = document.getElementById('lok-ket-v3')?.value?.trim();

    if (!nama) throw new Error('Nama lokasi wajib diisi');
    if (!lat || isNaN(parseFloat(lat))) throw new Error('Latitude tidak valid. Contoh: -5.1477');
    if (!lon || isNaN(parseFloat(lon))) throw new Error('Longitude tidak valid. Contoh: 119.4328');
    if (!radius || parseInt(radius) < 10) throw new Error('Radius minimal 10 meter');

    const payload = {
      nama_lokasi : nama,
      latitude    : parseFloat(lat),
      longitude   : parseFloat(lon),
      radius_meter: parseInt(radius),
      status_aktif: status,
      keterangan  : ket
    };
    if (idLokasi) payload.id_lokasi = idLokasi;

    const r = await callAPI(idLokasi ? 'editLokasi' : 'tambahLokasi', payload);
    document.getElementById('modal-lokasi-v3')?.remove();
    showToast(r.message || 'Lokasi disimpan ✅', 'success');
    await loadLokasiListV3();
  } catch(e) {
    if (err) { err.style.display='block'; err.textContent='⚠️ '+e.message; }
    else showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

function hapusLokasiV3(id, nama) {
  showModal('🗑️ Hapus Lokasi?',
    `Hapus lokasi <strong>${nama}</strong>? Karyawan tidak bisa absen dari lokasi ini lagi.`,
    async () => {
      const r = await callAPI('hapusLokasi', { id_lokasi: id });
      showToast(r.message, 'success');
      await loadLokasiListV3();
    }, '🗑️ Hapus'
  );
}

// Test GPS dari browser terhadap koordinat lokasi
async function testGPSLokasi(lat, lon, radius, namaLokasi) {
  showToast('Mendapatkan posisi GPS Anda...', 'info', 3000);
  try {
    const pos   = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {enableHighAccuracy:true, timeout:15000}));
    const jarak = hitungJarak(pos.coords.latitude, pos.coords.longitude, parseFloat(lat), parseFloat(lon));
    const dlm   = jarak <= parseInt(radius);
    showModal(
      '📡 Hasil Test GPS',
      `<div style="text-align:center;padding:12px">
        <div style="font-size:48px;margin-bottom:12px">${dlm ? '✅' : '❌'}</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:${dlm?'#1A9E74':'#E53E3E'}">
          ${dlm ? 'DALAM RADIUS — Bisa Absen' : 'DI LUAR RADIUS — Tidak Bisa Absen'}
        </div>
        <div style="font-size:13px;color:#64748B;line-height:2">
          Lokasi Kantor : <strong>${namaLokasi}</strong><br>
          Jarak Anda    : <strong style="color:${dlm?'#1A9E74':'#E53E3E'}">${Math.round(jarak)} meter</strong><br>
          Radius Maks   : <strong>${radius} meter</strong><br>
          Koordinat Anda: <code>${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}</code><br>
          Akurasi GPS   : ±${Math.round(pos.coords.accuracy)} meter
        </div>
        ${!dlm ? `<div style="background:#FFF5F5;border-radius:8px;padding:10px;margin-top:12px;font-size:12px;color:#C53030">
          💡 Solusi: Perbesar radius menjadi ${Math.ceil(jarak/10)*10} meter atau lebih
        </div>` : ''}
      </div>`
    );
  } catch(e) {
    showToast('GPS gagal: ' + e.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// PERBAIKAN 5: Shift & Jadwal — Generate otomatis + pilih nama
// ─────────────────────────────────────────────────────────────
async function renderShiftJadwalAdmin(container) {
  const karyawanList = await loadKaryawanDropdown();
  const now  = new Date();
  // Default: Senin minggu ini
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const senin = new Date(now);
  senin.setDate(now.getDate() + diff);
  const minggudepan = new Date(senin);
  minggudepan.setDate(senin.getDate() + 6);

  const fmtInput = d => d.toISOString().split('T')[0];

  container.innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">🕐 Shift & Jadwal Karyawan</h2>

    <!-- INFO POLA SHIFT -->
    <div class="card" style="background:#F0FFF4;border-left:4px solid #1A9E74;margin-bottom:16px">
      <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:#1A9E74">📋 Pola Rotasi Shift Otomatis</h4>
      <div style="font-size:12px;color:#475569;line-height:1.8">
        <strong>Jam Shift:</strong> Pagi 07:00–15:00 | Sore 15:00–23:00 | Malam 23:00–07:00<br>
        <strong>Rotasi:</strong> Pagi → Sore → Malam → Libur → (ulang)<br>
        <strong>Distribusi:</strong> Karyawan 1 mulai Pagi, Karyawan 2 mulai Sore, Karyawan 3 mulai Malam<br>
        <strong>Aturan:</strong> Setelah shift Malam, hari berikutnya adalah Libur (tidak langsung Pagi)<br>
        <strong>Libur:</strong> Saat 1 orang libur, 2 orang lainnya jaga penuh (1 shift 8 jam → 12 jam otomatis)
      </div>
    </div>

    <!-- GENERATE JADWAL -->
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">⚡ Generate Jadwal Otomatis</h3>

      <div class="form-group">
        <label class="form-label">Pilih Karyawan yang Ikut Shift</label>
        <div id="karyawan-shift-list" style="border:1px solid #E2E8F0;border-radius:8px;
          max-height:220px;overflow-y:auto;padding:8px">
          ${karyawanList.map(k => `
            <label style="display:flex;align-items:center;gap:10px;padding:8px;
              border-radius:6px;cursor:pointer;transition:background .15s"
              onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background=''">
              <input type="checkbox" value="${k.id_karyawan}"
                style="width:16px;height:16px;cursor:pointer">
              <img src="${getPhotoSrc(k.foto||'', k.nama_lengkap, 28)}"
                style="width:28px;height:28px;border-radius:50%;object-fit:cover">
              <div>
                <div style="font-size:13px;font-weight:600">${k.nama_lengkap}</div>
                <div style="font-size:11px;color:#64748B">${k.jabatan}</div>
              </div>
            </label>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="btn btn--ghost" style="font-size:12px;padding:6px 12px"
            onclick="document.querySelectorAll('#karyawan-shift-list input').forEach(c=>c.checked=true)">
            ☑️ Pilih Semua
          </button>
          <button class="btn btn--ghost" style="font-size:12px;padding:6px 12px"
            onclick="document.querySelectorAll('#karyawan-shift-list input').forEach(c=>c.checked=false)">
            ☐ Hapus Pilihan
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="form-label">Dari Tanggal *</label>
          <input type="date" class="form-control" id="jadwal-mulai" value="${fmtInput(senin)}">
        </div>
        <div class="form-group">
          <label class="form-label">Sampai Tanggal *</label>
          <input type="date" class="form-control" id="jadwal-selesai" value="${fmtInput(minggudepan)}">
        </div>
      </div>

      <button class="btn btn--primary btn--full btn--lg" onclick="generateJadwalOtomatis()">
        <div class="spinner-btn"></div>
        <span class="btn-text">⚡ Generate Jadwal Sekarang</span>
      </button>
    </div>

    <!-- PREVIEW HASIL -->
    <div id="jadwal-preview" style="display:none" class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">📅 Preview Jadwal</h3>
      <div id="jadwal-preview-content"></div>
    </div>

    <!-- LIHAT JADWAL BERJALAN -->
    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">📋 Jadwal Minggu Ini</h3>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <input type="date" class="form-control" id="jadwal-view-mulai"
          value="${fmtInput(senin)}" style="width:160px">
        <input type="date" class="form-control" id="jadwal-view-selesai"
          value="${fmtInput(minggudepan)}" style="width:160px">
        <button class="btn btn--secondary" onclick="loadJadwalSemua()">🔍 Tampilkan</button>
      </div>
      <div id="jadwal-semua-list">${skeletonCard(2)}</div>
    </div>`;

  await loadJadwalSemua();
}

async function generateJadwalOtomatis() {
  const btn = document.querySelector('.admin-content .btn--primary.btn--lg');
  if (btn) { btn.disabled=true; btn.classList.add('loading'); }

  try {
    const checkboxes = document.querySelectorAll('#karyawan-shift-list input:checked');
    const ids = Array.from(checkboxes).map(c => c.value);
    if (ids.length === 0) throw new Error('Pilih minimal 1 karyawan');

    const mulai   = fromInputDate(document.getElementById('jadwal-mulai')?.value);
    const selesai = fromInputDate(document.getElementById('jadwal-selesai')?.value);
    if (!mulai || !selesai) throw new Error('Tanggal mulai dan selesai wajib diisi');

    const r = await callAPI('generateJadwal', {
      karyawan_ids   : ids,
      tanggal_mulai  : mulai,
      tanggal_selesai: selesai
    });

    showToast(r.message, 'success', 5000);

    // Tampilkan preview
    const previewEl = document.getElementById('jadwal-preview');
    const contentEl = document.getElementById('jadwal-preview-content');
    if (previewEl && contentEl) {
      previewEl.style.display = 'block';
      renderJadwalPreview(contentEl, r.jadwal, r.peserta);
    }

    await loadJadwalSemua();
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

function renderJadwalPreview(container, jadwal, peserta) {
  if (!jadwal || jadwal.length === 0) return;

  // Group by tanggal
  const byTgl = {};
  jadwal.forEach(j => {
    if (!byTgl[j.tanggal]) byTgl[j.tanggal] = [];
    byTgl[j.tanggal].push(j);
  });

  const kodeColor = { P:'#1A9E74', S:'#D97706', M:'#6C63FF', L:'#94A3B8' };
  const tanggalList = Object.keys(byTgl).sort();

  // Tabel jadwal
  container.innerHTML = `
    <div style="overflow-x:auto">
      <table class="simple-table" style="min-width:500px;font-size:12px">
        <thead>
          <tr>
            <th>Karyawan</th>
            ${tanggalList.slice(0,14).map(t => {
              const p = t.split('/');
              const d = new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));
              const hari = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d.getDay()];
              return `<th style="text-align:center">${hari}<br>${p[0]}/${p[1]}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${peserta.map(k => `
            <tr>
              <td style="font-weight:600;white-space:nowrap">${k.nama.split(' ')[0]}</td>
              ${tanggalList.slice(0,14).map(t => {
                const entry = byTgl[t]?.find(j => j.id_karyawan === k.id);
                const kode  = entry?.kode || '-';
                const color = kodeColor[kode] || '#94A3B8';
                const tips  = entry?.jam_masuk ? `${entry.jam_masuk}–${entry.jam_keluar}` : kode;
                return `<td style="text-align:center;padding:4px">
                  <span style="background:${color}22;color:${color};border:1px solid ${color}44;
                    padding:2px 6px;border-radius:6px;font-weight:700;font-size:11px"
                    title="${tips}">${kode}</span>
                </td>`;
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap;font-size:12px">
      ${Object.entries(kodeColor).map(([k,c]) =>
        `<span style="background:${c}22;color:${c};border:1px solid ${c}44;
          padding:3px 10px;border-radius:6px;font-weight:600">
          ${k} = ${k==='P'?'Pagi':k==='S'?'Sore':k==='M'?'Malam':'Libur'}
        </span>`
      ).join('')}
    </div>`;
}

async function loadJadwalSemua() {
  const el = document.getElementById('jadwal-semua-list');
  if (!el) return;
  el.innerHTML = skeletonCard(2);
  try {
    const mulai   = fromInputDate(document.getElementById('jadwal-view-mulai')?.value || new Date().toISOString().split('T')[0]);
    const selesai = fromInputDate(document.getElementById('jadwal-view-selesai')?.value || new Date().toISOString().split('T')[0]);
    const data    = await callAPI('getJadwalSemua', { tanggal_mulai: mulai, tanggal_selesai: selesai });

    if (!data || data.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:24px;color:#94A3B8;font-size:13px">
        Belum ada jadwal untuk periode ini.<br>Gunakan form Generate di atas untuk membuat jadwal.
      </div>`;
      return;
    }

    const kodeColor = { P:'#1A9E74', S:'#D97706', M:'#6C63FF', '-':'#94A3B8' };
    el.innerHTML = `<div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table" style="min-width:500px">
        <thead><tr>
          <th>Karyawan</th><th>Tanggal</th><th>Shift</th><th>Jam</th><th>Status</th>
        </tr></thead>
        <tbody>
          ${data.map(j => `<tr>
            <td style="font-weight:600">${j.nama_karyawan}</td>
            <td style="font-size:12px">${formatTanggal(j.tanggal)} <span style="color:#94A3B8">${j.tanggal?.split('/')[0]?'':''}</span></td>
            <td>
              <span style="background:${(kodeColor[j.kode]||'#94A3B8')+'22'};
                color:${kodeColor[j.kode]||'#94A3B8'};font-weight:600;
                padding:2px 10px;border-radius:6px;font-size:12px">
                ${j.kode} — ${j.nama_shift}
              </span>
            </td>
            <td style="font-size:12px;font-family:monospace">
              ${j.jam_masuk && j.jam_keluar ? j.jam_masuk+'–'+j.jam_keluar : '-'}
            </td>
            <td>${j.kode==='L'?'<span style="color:#94A3B8;font-size:12px">Libur</span>':
              '<span style="color:#1A9E74;font-size:12px">Jaga</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch(e) { showError('jadwal-semua-list', e.message); }
}

// ─────────────────────────────────────────────────────────────
// PERBAIKAN 6: Pengaturan — fix logo & background tampil
// ─────────────────────────────────────────────────────────────
async function loadPengaturanAdminV3() {
  const el = document.getElementById('pengaturan-container');
  if (!el) return;
  el.innerHTML = skeletonCard(4);

  try {
    const data = await callAPI('getAllSetting', {});
    if (!data) return;
    const map = {};
    data.forEach(s => { map[s.key] = s.value; });

    el.innerHTML = `
      <div id="pengaturan-error-v3" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
        border-radius:8px;padding:12px;color:#C53030;font-size:13px;margin-bottom:12px"></div>

      <!-- Identitas -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:16px">🏢 Identitas Instansi</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${settingInput('nama_instansi','Nama Instansi',map)}
          ${settingInput('singkatan_instansi','Singkatan',map)}
          ${settingInput('alamat_instansi','Alamat Lengkap',map)}
          ${settingInput('telepon_instansi','Telepon',map)}
          ${settingInput('email_instansi','Email',map,'email')}
          ${settingInput('website_instansi','Website',map,'url')}
          ${settingInput('tahun_berdiri','Tahun Berdiri',map,'number')}
          ${settingInput('footer_text','Teks Footer',map)}
        </div>
      </div>

      <!-- Branding -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:14px">🎨 Tampilan & Branding</h3>

        <div style="background:#FFF8DC;border-radius:8px;padding:12px;font-size:12px;
          color:#B7791F;margin-bottom:14px;line-height:1.7">
          <strong>📌 Cara upload logo & background:</strong><br>
          1. Upload gambar ke Google Drive<br>
          2. Klik kanan file → "Share" → ubah ke <strong>"Anyone with the link can view"</strong><br>
          3. Klik "Copy link" → paste URL di bawah<br>
          4. Format yang didukung: link dari Google Drive (drive.google.com)
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${settingColorInput('warna_primer','Warna Primer',map)}
          ${settingColorInput('warna_sekunder','Warna Sekunder',map)}
        </div>

        <div class="form-group">
          <label class="form-label">URL Logo Instansi</label>
          <input type="url" class="form-control" id="set-logo_url"
            value="${map['logo_url']||''}" placeholder="https://drive.google.com/file/d/..."
            oninput="previewDriveImage(this.value,'logo-preview')">
          <div id="logo-preview" style="margin-top:8px;display:${map['logo_url']?'block':'none'}">
            <img src="${map['logo_url']?normalizeDriveUrlFrontend(map['logo_url']):''}"
              style="height:60px;border:1px dashed #CBD5E0;border-radius:8px;padding:4px;background:#F8FAFC"
              onerror="this.style.display='none'"
              onload="this.style.display='block'">
          </div>
        </div>

        ${settingUrlWithPreview('bg_dashboard_karyawan_url','Background Dashboard Karyawan',map)}
        ${settingUrlWithPreview('bg_dashboard_admin_url','Background Dashboard Admin',map)}
        ${settingUrlWithPreview('bg_dashboard_superadmin_url','Background Dashboard Super Admin',map)}
      </div>

      <!-- Kebijakan -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:16px">📋 Kebijakan Kehadiran</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${settingInput('max_radius_meter','Radius GPS Maks (meter)',map,'number')}
          ${settingInput('toleransi_terlambat_default','Toleransi Terlambat (menit)',map,'number')}
          ${settingInput('sisa_cuti_default_per_tahun','Default Cuti Per Tahun (hari)',map,'number')}
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
            <option value="true"  ${String(map['aktif_one_device_login']).toLowerCase()==='true' ?'selected':''}>
              ✅ Aktif — 1 akun hanya bisa login dari 1 HP</option>
            <option value="false" ${String(map['aktif_one_device_login']).toLowerCase()==='false'?'selected':''}>
              ❌ Nonaktif — Bebas login dari mana saja</option>
          </select>
        </div>
      </div>

      <button class="btn btn--primary btn--lg btn--full" onclick="simpanPengaturanV3()">
        <div class="spinner-btn"></div>
        <span class="btn-text">💾 Simpan Semua Pengaturan</span>
      </button>`;
  } catch(e) { showError('pengaturan-container', e.message); }
}

function settingUrlWithPreview(key, label, map) {
  const val = map[key]||'';
  const normUrl = val ? normalizeDriveUrlFrontend(val) : '';
  return `<div class="form-group">
    <label class="form-label">${label}</label>
    <input type="url" class="form-control" id="set-${key}" value="${val}"
      placeholder="https://drive.google.com/file/d/..."
      oninput="previewDriveImage(this.value,'prev-${key}')">
    <div id="prev-${key}" style="margin-top:6px;display:${val?'block':'none'}">
      <img src="${normUrl}" style="max-width:100%;max-height:80px;border-radius:6px;
        border:1px dashed #CBD5E0;object-fit:cover"
        onerror="this.style.display='none'" onload="this.style.display='block'">
    </div>
  </div>`;
}

// Normalisasi URL Drive di sisi frontend
function normalizeDriveUrlFrontend(url) {
  if (!url) return '';
  if (url.startsWith('https://lh3.googleusercontent.com/d/')) return url;
  // Ekstrak file ID
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1] && m[1].length > 10) {
      return 'https://lh3.googleusercontent.com/d/' + m[1];
    }
  }
  return url;
}

function previewDriveImage(url, previewId) {
  const el  = document.getElementById(previewId);
  if (!el) return;
  const normUrl = normalizeDriveUrlFrontend(url);
  if (normUrl) {
    el.style.display = 'block';
    const img = el.querySelector('img');
    if (img) {
      img.src   = normUrl;
      img.style.display = 'block';
    }
  } else {
    el.style.display = 'none';
  }
}

async function simpanPengaturanV3() {
  const btn = document.querySelector('.admin-content .btn--primary.btn--full');
  if (btn) { btn.disabled=true; btn.classList.add('loading'); }
  const err = document.getElementById('pengaturan-error-v3');
  if (err) err.style.display = 'none';

  try {
    const keys = [
      'nama_instansi','singkatan_instansi','alamat_instansi','telepon_instansi',
      'email_instansi','website_instansi','tahun_berdiri','footer_text',
      'warna_primer','warna_sekunder','logo_url',
      'bg_dashboard_karyawan_url','bg_dashboard_admin_url','bg_dashboard_superadmin_url',
      'max_radius_meter','toleransi_terlambat_default','sisa_cuti_default_per_tahun',
      'ucapan_ulang_tahun_template','aktif_one_device_login'
    ];
    const settings = {};
    keys.forEach(k => {
      const el = document.getElementById('set-' + k);
      if (el) settings[k] = el.value?.trim() || '';
    });

    await callAPI('setMultipleSetting', { settings });
    showToast('Pengaturan berhasil disimpan! ✅', 'success', 5000);
    resetBrandingCache();
    const role = getSession()?.role || 'admin';
    await loadBranding(role);
  } catch(e) {
    if (err) { err.style.display='block'; err.textContent='⚠️ '+e.message; }
    else showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

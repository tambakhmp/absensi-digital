// ============================================================
// surat_tugas.js — Surat Tugas Dinas Luar (Admin + Karyawan)
// ============================================================

// ── HELPER FORMAT TANGGAL ────────────────────────────────────
function _fmtTglST(t) {
  if (!t || t==='-') return '-';
  const B=['','Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'];
  let p=String(t).split('/');
  if(p.length>=3){const d=parseInt(p[0]),m=parseInt(p[1]),y=p[2];if(d&&m&&m<=12)return d+' '+B[m]+' '+y;}
  p=String(t).split('-');
  if(p.length>=3){const y=p[0],m=parseInt(p[1]),d=parseInt(p[2]);if(d&&m&&m<=12)return d+' '+B[m]+' '+y;}
  return t;
}

function _statusST(s) {
  const map = {
    menunggu_karyawan : {label:'Menunggu Karyawan', color:'#D97706',bg:'#FEF3C7'},
    menunggu_atasan   : {label:'Menunggu Atasan',   color:'#7C3AED',bg:'#EDE9FE'},
    menunggu_pimpinan : {label:'Menunggu Pimpinan', color:'#2563EB',bg:'#DBEAFE'},
    menunggu_admin    : {label:'Menunggu Persetujuan',color:'#0891B2',bg:'#CFFAFE'},
    selesai           : {label:'Selesai / Disetujui',color:'#059669',bg:'#D1FAE5'},
  };
  return map[s] || {label:s, color:'#64748B', bg:'#F1F5F9'};
}

// ════════════════════════════════════════════════════════════
// HALAMAN ADMIN — Buat & Kelola Surat Tugas
// ════════════════════════════════════════════════════════════
// Buka modal buat surat tugas baru (admin inisiasi langsung)
async function _modalBuatSuratTugas() {
  document.getElementById('modal-buat-st')?.remove();

  // Ambil daftar karyawan aktif
  let karyawanList = [];
  try {
    karyawanList = await callAPI('getKaryawanAktif', {});
  } catch(e) {}

  const optKaryawan = (karyawanList || []).map(k =>
    `<option value="${k.id_karyawan}">${k.nama_lengkap} — ${k.jabatan||''}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-buat-st';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);' +
    'z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';

  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:24px;
    width:100%;max-width:480px;max-height:90vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:16px;font-weight:700">📋 Buat Surat Tugas</div>
        <div style="font-size:12px;color:#64748B">Tanpa pengajuan — inisiasi langsung admin</div>
      </div>
      <button onclick="document.getElementById('modal-buat-st').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:32px;
        height:32px;font-size:16px;cursor:pointer">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Karyawan</label>
      <select class="form-control" id="st-id-kary-sel"
        onchange="document.getElementById('st-id-kary').value=this.value">
        <option value="">-- Pilih Karyawan --</option>
        ${optKaryawan}
      </select>
      <input type="hidden" id="st-id-kary">
    </div>
    <div class="form-group">
      <label class="form-label">Tujuan</label>
      <input type="text" class="form-control" id="st-tujuan" placeholder="Kota/lokasi tujuan">
    </div>
    <div class="form-group">
      <label class="form-label">Keperluan</label>
      <textarea class="form-control" id="st-keperluan" rows="2"
        placeholder="Keperluan dinas luar"></textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group">
        <label class="form-label">Tanggal Mulai</label>
        <input type="date" class="form-control" id="st-tgl-mulai"
          oninput="_hitungHariST()">
      </div>
      <div class="form-group">
        <label class="form-label">Tanggal Selesai</label>
        <input type="date" class="form-control" id="st-tgl-selesai"
          oninput="_hitungHariST()">
      </div>
    </div>
    <div id="st-info-hari" style="font-size:12px;color:#64748B;margin-bottom:12px"></div>
    <button onclick="_kirimSuratTugas('')"
      style="width:100%;padding:12px;background:#2D6CDF;color:#fff;border:none;
      border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">
      📋 Buat Surat Tugas
    </button>
  </div>`;

  document.body.appendChild(modal);
}

async function loadSuratTugasAdmin() {
  const c = document.getElementById('admin-content');
  if (!c) return;

  c.innerHTML = `
  <div style="padding:0 0 80px">
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div>
        <h2 style="font-size:20px;font-weight:700;color:#0F172A;margin:0">
          📋 Surat Tugas Dinas Luar</h2>
        <p style="font-size:13px;color:#64748B;margin:4px 0 0">
          Buat dan kelola surat tugas karyawan</p>
      </div>
      <button onclick="_modalBuatSuratTugas()"
        style="background:linear-gradient(135deg,#2D6CDF,#1B5CBF);color:#fff;
        border:none;border-radius:10px;padding:10px 20px;font-size:14px;
        font-weight:600;cursor:pointer">
        + Buat Surat Tugas
      </button>
    </div>
    <div id="list-surat-tugas"></div>
  </div>`;

  await _loadListSuratTugasAdmin();
}

async function _loadListSuratTugasAdmin() {
  const el = document.getElementById('list-surat-tugas');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:30px;color:#94A3B8">Memuat...</div>';

  try {
    const data = await callAPI('getSuratTugas', {});
    if (!data || !data.length) {
      el.innerHTML = `<div style="text-align:center;padding:60px;color:#94A3B8;
        background:#fff;border-radius:12px;border:1px dashed #E2E8F0">
        <div style="font-size:36px;margin-bottom:12px">📋</div>
        <div style="font-size:15px;font-weight:600">Belum ada surat tugas</div>
      </div>`; return;
    }

    // Filter pending dulu, lalu selesai
    const pending = data.filter(s => s.status_surat !== 'selesai');
    const done    = data.filter(s => s.status_surat === 'selesai');

    let html = '';
    if (pending.length) {
      html += `<div style="font-size:12px;font-weight:600;color:#64748B;
        letter-spacing:.5px;margin-bottom:8px">PERLU TINDAKAN</div>`;
      pending.forEach(s => { html += _cardSuratTugas(s, true); });
    }
    if (done.length) {
      html += `<div style="font-size:12px;font-weight:600;color:#64748B;
        letter-spacing:.5px;margin:16px 0 8px">SELESAI</div>`;
      done.forEach(s => { html += _cardSuratTugas(s, true); });
    }
    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = `<div style="color:#E53E3E;padding:20px">Gagal memuat: ${e.message}</div>`;
  }
}

function _cardSuratTugas(s, isAdmin=false) {
  const st = _statusST(s.status_surat);
  return `
  <div style="background:#fff;border-radius:12px;border:1px solid #E2E8F0;
    padding:16px;margin-bottom:10px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;
      flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:11px;color:#64748B">${s.no_surat||'-'}</div>
        <div style="font-size:15px;font-weight:600;color:#0F172A;margin:2px 0">
          ${s.nama_karyawan||'-'}</div>
        <div style="font-size:13px;color:#64748B">
          ${s.jabatan||''} · ${s.departemen||''}</div>
      </div>
      <span style="background:${st.bg};color:${st.color};font-size:11px;
        font-weight:600;padding:4px 10px;border-radius:20px;white-space:nowrap">
        ${st.label}</span>
    </div>
    <div style="margin:10px 0;padding:10px;background:#F8FAFC;border-radius:8px;
      font-size:12px;color:#334155;line-height:1.7">
      <strong>Tujuan:</strong> ${s.tujuan_tugas||'-'}<br>
      <strong>Keperluan:</strong> ${s.keperluan||'-'}<br>
      <strong>Periode:</strong> ${_fmtTglST(s.tanggal_mulai)} s/d ${_fmtTglST(s.tanggal_selesai)}
        (${s.total_hari||'-'} hari)
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button onclick="_lihatSuratTugas('${s.id_surat}')"
        style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;
        padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600;color:#334155">
        👁 Lihat Surat
      </button>
      ${isAdmin && s.status_surat==='menunggu_admin' ? `
      <button onclick="_setujuiSurat('${s.id_surat}')"
        style="background:#059669;color:#fff;border:none;border-radius:8px;
        padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600">
        ✅ Setujui
      </button>` : ''}
      <button onclick="_cetakSuratTugasPDF('${s.id_surat}')"
        style="background:#2D6CDF;color:#fff;border:none;border-radius:8px;
        padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600">
        🖨 Cetak PDF
      </button>
    </div>
  </div>`;
}

// ── MODAL BUAT SURAT TUGAS ───────────────────────────────────

function _hitungHariST() {
  const m  = document.getElementById('st-tgl-mulai')?.value;
  const s  = document.getElementById('st-tgl-selesai')?.value;
  const el = document.getElementById('st-info-hari');
  if (!m || !s || !el) return;
  const diff = Math.round((new Date(s) - new Date(m)) / 86400000) + 1;
  el.textContent = diff > 0 ? diff + ' hari kerja' : '';
}

async function _kirimSuratTugas(idPengajuan) {
  const idK    = document.getElementById('st-id-kary')?.value?.trim();
  const tujuan = document.getElementById('st-tujuan')?.value?.trim();
  const keper  = document.getElementById('st-keperluan')?.value?.trim();
  const tglM   = document.getElementById('st-tgl-mulai')?.value;
  const tglS   = document.getElementById('st-tgl-selesai')?.value;

  if (!idK)    { showToast('Data karyawan tidak valid', 'error'); return; }
  if (!tujuan) { showToast('Isi tujuan tugas', 'warning'); return; }
  if (!keper)  { showToast('Isi keperluan tugas', 'warning'); return; }
  if (!tglM)   { showToast('Pilih tanggal mulai', 'warning'); return; }
  if (!tglS)   { showToast('Pilih tanggal selesai', 'warning'); return; }

  const toIDDate = v => {
    if (!v) return '';
    const p = v.split('-');
    return p.length >= 3 ? p[2]+'/'+p[1]+'/'+p[0] : v;
  };
  const diff = Math.round((new Date(tglS) - new Date(tglM)) / 86400000) + 1;

  try {
    showToast('Membuat surat tugas...', 'info', 2000);
    const res = await callAPI('buatSuratTugas', {
      id_karyawan   : idK,
      id_pengajuan  : idPengajuan || '',
      tujuan_tugas  : tujuan,
      keperluan     : keper,
      tanggal_mulai : toIDDate(tglM),
      tanggal_selesai: toIDDate(tglS),
      total_hari    : diff > 0 ? diff : 1
    });
    document.getElementById('modal-buat-st')?.remove();
    showToast('✅ ' + res.message, 'success', 4000);
    if (typeof loadPengajuanAdminV4 === 'function') loadPengajuanAdminV4();
    if (typeof _loadSuratTugasAdminApproval === 'function') _loadSuratTugasAdminApproval();
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

async function loadSuratTugasPendingUser() {
  try {
    const data = await callAPI('getSuratTugasPending', {});
    return data || [];
  } catch(e) { return []; }
}

async function _lihatSuratTugas(idSurat) {
  document.getElementById('modal-surat-tugas')?.remove();
  showToast('Memuat surat...', 'info', 1500);

  let s;
  try { s = await callAPI('getSuratTugas', { id_surat: idSurat }); }
  catch(e) { showToast('Gagal memuat: '+e.message, 'error'); return; }

  const st      = _statusST(s.status_surat);
  const session = getSession();
  const idMe    = String(session?.id_karyawan || '');
  const role    = String(session?.role || '').toLowerCase();

  // Siapa yang perlu TTD sekarang?
  const biasTTD = (
    (s.status_surat==='menunggu_karyawan' && idMe===String(s.id_karyawan)) ||
    (s.status_surat==='menunggu_atasan'   && idMe===String(s.id_atasan))   ||
    (s.status_surat==='menunggu_pimpinan' && idMe===String(s.id_pimpinan))
  );

  const renderTTDBox = (label, nama, jabatan, ttdImg, at) => {
    if (ttdImg) {
      return `<div style="text-align:center">
        <div style="font-size:11px;color:#64748B;margin-bottom:6px">${label}</div>
        <div style="height:60px;border:1px solid #E2E8F0;border-radius:8px;
          overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center">
          <img src="data:image/png;base64,${ttdImg}" style="max-height:56px;max-width:100%">
        </div>
        <div style="border-top:1px solid #E2E8F0;margin:6px 16px"></div>
        <div style="font-size:11px;font-weight:600">${nama||'-'}</div>
        <div style="font-size:10px;color:#64748B">${jabatan||''}</div>
        <div style="font-size:10px;color:#059669;margin-top:3px">✅ ${at||''}</div>
      </div>`;
    }
    return `<div style="text-align:center">
      <div style="font-size:11px;color:#64748B;margin-bottom:6px">${label}</div>
      <div style="height:60px;border:1px dashed #CBD5E0;border-radius:8px;
        background:#F8FAFC;display:flex;align-items:center;justify-content:center">
        <span style="font-size:11px;color:#94A3B8">Belum ditandatangani</span>
      </div>
      <div style="border-top:1px solid #E2E8F0;margin:6px 16px"></div>
      <div style="font-size:11px;font-weight:600">${nama||'-'}</div>
      <div style="font-size:10px;color:#64748B">${jabatan||''}</div>
    </div>`;
  };

  const modal = document.createElement('div');
  modal.id = 'modal-surat-tugas';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);' +
    'z-index:9500;overflow-y:auto;padding:16px;display:flex;' +
    'align-items:flex-start;justify-content:center;padding-top:40px';

  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:0;
    width:100%;max-width:520px;overflow:hidden">

    <!-- Header modal -->
    <div style="background:#1E3A5F;padding:16px 20px;display:flex;
      align-items:center;justify-content:space-between">
      <div>
        <div style="color:rgba(255,255,255,.7);font-size:11px">${s.no_surat||''}</div>
        <div style="color:#fff;font-size:15px;font-weight:600">Surat Tugas</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="background:${st.bg};color:${st.color};font-size:11px;
          font-weight:600;padding:4px 10px;border-radius:20px">${st.label}</span>
        <button onclick="document.getElementById('modal-surat-tugas').remove()"
          style="background:rgba(255,255,255,.15);border:none;border-radius:50%;
          width:30px;height:30px;color:#fff;font-size:16px;cursor:pointer">✕</button>
      </div>
    </div>

    <!-- Isi surat -->
    <div style="padding:20px;font-size:13px;color:#0F172A">

      <!-- Pemberi tugas: bila ada pimpinan → pimpinan, bila PM dinas luar → PM sendiri -->
      <div style="font-size:11px;color:#64748B;margin-bottom:4px">Yang bertanda tangan di bawah ini:</div>
      <div style="background:#F8FAFC;border-radius:8px;padding:10px;margin-bottom:14px">
        <div><span style="color:#64748B;width:100px;display:inline-block">Nama</span>: <strong>${
          s.nama_pimpinan && s.nama_pimpinan.trim() ? s.nama_pimpinan : s.nama_pembuat||'-'
        }</strong></div>
        <div><span style="color:#64748B;width:100px;display:inline-block">Jabatan</span>: ${
          s.jabatan_pembuat || (s.nama_pimpinan && s.nama_pimpinan.trim() ? 'Project Manager' : '-')
        }</div>
        <div><span style="color:#64748B;width:100px;display:inline-block">Instansi</span>: ${s.instansi||'PT. HUTAKALO MINATANI PRIMA'}</div>
      </div>

      <div style="font-size:11px;color:#64748B;margin-bottom:4px">Dengan ini menugaskan karyawan:</div>
      <div style="background:#F8FAFC;border-radius:8px;padding:10px;margin-bottom:14px">
        <div><span style="color:#64748B;width:100px;display:inline-block">Nama</span>: <strong>${s.nama_karyawan||'-'}</strong></div>
        <div><span style="color:#64748B;width:100px;display:inline-block">NIK</span>: ${s.nik||'-'}</div>
        <div><span style="color:#64748B;width:100px;display:inline-block">Jabatan</span>: ${s.jabatan||'-'}</div>
        <div><span style="color:#64748B;width:100px;display:inline-block">Departemen</span>: ${s.departemen||'-'}</div>
      </div>

      <div style="background:#EFF6FF;border-left:3px solid #2563EB;
        padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:16px;line-height:1.8">
        <div><span style="color:#64748B">Tujuan Tugas</span> : ${s.tujuan_tugas||'-'}</div>
        <div><span style="color:#64748B">Keperluan</span>&nbsp;&nbsp;&nbsp;&nbsp; : ${s.keperluan||'-'}</div>
        <div><span style="color:#64748B">Periode</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : ${_fmtTglST(s.tanggal_mulai)} s/d ${_fmtTglST(s.tanggal_selesai)} (${s.total_hari||'-'} hari)</div>
      </div>

      <!-- Tanda tangan — kolom dinamis sesuai pihak yang terlibat -->
      ${(()=>{
        // Bangun slot TTD sesuai data surat
        const slots = [];
        slots.push({label:'Karyawan penerima', nama:s.nama_karyawan||'-', jab:s.jabatan||'', img:s.ttd_karyawan, at:s.ttd_karyawan_at});
        if (s.nama_atasan && String(s.nama_atasan).trim()!=='') {
          slots.push({label:'Atasan langsung', nama:s.nama_atasan, jab:'', img:s.ttd_atasan, at:s.ttd_atasan_at});
        }
        if (s.nama_pimpinan && String(s.nama_pimpinan).trim()!=='') {
          slots.push({label:'Mengetahui', nama:s.nama_pimpinan, jab:s.jabatan_pembuat||'Project Manager', img:s.ttd_pimpinan, at:s.ttd_pimpinan_at});
        }
        // PM dinas luar: hanya 1 slot karyawan → tambah slot Admin/Mengetahui
        if (slots.length === 1) {
          slots.push({label:'Mengetahui', nama:s.nama_pembuat||'Admin', jab:s.jabatan_pembuat||'Admin', img:'', at:''});
        }
        const cols = slots.length === 2 ? 'repeat(2,1fr)' : 'repeat(3,1fr)';
        return `<div style="border-top:1px solid #E2E8F0;padding-top:14px;display:grid;grid-template-columns:${cols};gap:10px">
          ${slots.map(sl => renderTTDBox(sl.label, sl.nama, sl.jab, sl.img, sl.at)).join('')}
        </div>`;
      })()}

      ${biasTTD ? `
      <!-- Canvas TTD -->
      <div style="margin-top:20px;border-top:1px solid #E2E8F0;padding-top:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">
          ✍️ Tanda tangani surat ini:</div>
        <canvas id="canvas-ttd-st" width="480" height="140"
          style="border:2px solid #CBD5E0;border-radius:10px;background:#fff;
          touch-action:none;width:100%;cursor:crosshair"></canvas>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="_clearCanvasTTD()"
            style="flex:1;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
            font-size:13px;cursor:pointer;background:#fff">
            🗑 Hapus
          </button>
          <button onclick="_simpanTTDSurat('${idSurat}')"
            style="flex:2;padding:10px;background:#2D6CDF;color:#fff;border:none;
            border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
            ✅ Simpan Tanda Tangan
          </button>
        </div>
      </div>` : ''}

      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="_cetakSuratTugasPDF('${idSurat}')"
          style="flex:1;padding:10px;background:#1E3A5F;color:#fff;border:none;
          border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
          🖨 Cetak PDF
        </button>
        ${s.status_surat==='selesai' && String(s.id_karyawan)===idMe ? `
        <button onclick="document.getElementById('modal-surat-tugas').remove();_perpanjangDinasLuar('${idSurat}')"
          style="flex:1;padding:10px;background:#D97706;color:#fff;border:none;
          border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
          📅 Perpanjang
        </button>` : ''}
      </div>
    </div>
  </div>`;

  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);

  // Init canvas TTD
  if (biasTTD) _initCanvasTTD();
}

// ── CANVAS TTD ───────────────────────────────────────────────
let _ttdCanvas = null, _ttdCtx = null, _ttdDrawing = false;

function _initCanvasTTD() {
  const canvas = document.getElementById('canvas-ttd-st');
  if (!canvas) return;
  _ttdCanvas  = canvas;
  _ttdCtx     = canvas.getContext('2d');
  _ttdDrawing = false;

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY
    };
  };

  _ttdCtx.strokeStyle = '#1E293B';
  _ttdCtx.lineWidth   = 2;
  _ttdCtx.lineCap     = 'round';
  _ttdCtx.lineJoin    = 'round';

  const start = (e) => { e.preventDefault(); _ttdDrawing=true; const p=getPos(e); _ttdCtx.beginPath(); _ttdCtx.moveTo(p.x,p.y); };
  const draw  = (e) => { if(!_ttdDrawing) return; e.preventDefault(); const p=getPos(e); _ttdCtx.lineTo(p.x,p.y); _ttdCtx.stroke(); };
  const stop  = ()  => { _ttdDrawing=false; };

  canvas.addEventListener('mousedown',  start);
  canvas.addEventListener('mousemove',  draw);
  canvas.addEventListener('mouseup',    stop);
  canvas.addEventListener('mouseleave', stop);
  canvas.addEventListener('touchstart', start, {passive:false});
  canvas.addEventListener('touchmove',  draw,  {passive:false});
  canvas.addEventListener('touchend',   stop);
}

function _clearCanvasTTD() {
  if (_ttdCtx && _ttdCanvas) {
    _ttdCtx.clearRect(0,0,_ttdCanvas.width,_ttdCanvas.height);
  }
}

async function _simpanTTDSurat(idSurat) {
  if (!_ttdCanvas) { showToast('Canvas tidak tersedia', 'error'); return; }
  // Cek apakah sudah digambar
  const imgData = _ttdCtx.getImageData(0,0,_ttdCanvas.width,_ttdCanvas.height).data;
  const isEmpty = !imgData.some((_,i) => i%4===3 && imgData[i]>10);
  if (isEmpty) { showToast('Silakan buat tanda tangan terlebih dahulu', 'warning'); return; }

  try {
    showToast('Menyimpan tanda tangan...', 'info', 2000);
    const base64 = _ttdCanvas.toDataURL('image/png').split(',')[1];
    const res    = await callAPI('simpanTandaTanganSurat', {
      id_surat   : idSurat,
      ttd_base64 : base64
    });
    document.getElementById('modal-surat-tugas')?.remove();
    showToast('✅ '+res.message, 'success', 4000);
    // Reload semua section yang terdampak
    if (typeof _loadListSuratTugasAdmin    === 'function') _loadListSuratTugasAdmin();
    if (typeof _loadSuratTugasPendingDashboard === 'function') _loadSuratTugasPendingDashboard();
    if (typeof _loadSuratTugasAdminApproval   === 'function') _loadSuratTugasAdminApproval();
  } catch(e) {
    showToast('Gagal: '+e.message, 'error');
  }
}

// ── CETAK PDF ────────────────────────────────────────────────

async function _setujuiSurat(idSurat) {
  if (!confirm('Setujui surat tugas ini? Pengajuan dinas luar akan otomatis disetujui.')) return;
  try {
    showToast('Memproses...', 'info', 2000);
    const res = await callAPI('setujuiSuratTugas', { id_surat: idSurat });
    showToast('✅ ' + res.message, 'success', 4000);
    document.getElementById('modal-surat-tugas')?.remove();
    if (typeof _loadSuratTugasPendingDashboard  === 'function') _loadSuratTugasPendingDashboard();
    if (typeof _loadSuratTugasAdminApproval     === 'function') _loadSuratTugasAdminApproval();
    if (typeof loadPengajuanAdminV4             === 'function') loadPengajuanAdminV4();
    if (typeof _loadRekapDL                     === 'function') _loadRekapDL();
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

async function _cetakSuratTugasPDF(idSurat) {
  showToast('Menyiapkan PDF...', 'info', 2000);
  const pdfOk = await _ensureJsPDF();
  if (!pdfOk) { showToast('Library PDF tidak tersedia', 'error'); return; }

  let s;
  try { s = await callAPI('getSuratTugas', { id_surat: idSurat }); }
  catch(e) { showToast('Gagal memuat: '+e.message, 'error'); return; }

  // Ambil instansi
  let inst = {};
  try {
    const settArr = await callAPI('getAllSetting', {});
    const sm = {};
    if (Array.isArray(settArr)) settArr.forEach(x => { if(x.key) sm[x.key]=x.value||''; });
    inst = { nama_instansi:sm.nama_instansi||'', alamat_instansi:sm.alamat_instansi||'',
      telp_instansi:sm.telepon_instansi||'', email_instansi:sm.email_instansi||'',
      logo_url:sm.logo_url||'' };
  } catch(eI){}

  try {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const W=210, mL=25, mR=25;
    let y = 15;

    // Kop surat (_kopSurat sudah include garis tebal + spasi)
    y = await _kopSurat(doc, inst, W, mL, y);
    // y sudah setelah garis kop — tidak perlu tambah garis lagi

    // Judul
    doc.setFont('helvetica','bold'); doc.setFontSize(14);
    doc.text('SURAT TUGAS', W/2, y, {align:'center'});
    y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.setTextColor(80,80,80);
    doc.text('Nomor: '+(s.no_surat||'-'), W/2, y, {align:'center'});
    doc.setTextColor(0,0,0); y += 5;
    doc.setLineWidth(0.3); doc.line(mL, y, W-mR, y); y += 8;

    // Pemberi tugas
    const BLN=['','Januari','Februari','Maret','April','Mei','Juni',
      'Juli','Agustus','September','Oktober','November','Desember'];
    const now=new Date();
    const tglDiterbitkan=now.getDate()+' '+BLN[now.getMonth()+1]+' '+now.getFullYear();

    doc.setFontSize(10.5); doc.setFont('helvetica','normal');
    doc.text('Yang bertanda tangan di bawah ini:', mL, y); y+=7;

    // Pemberi tugas di PDF: pimpinan bila ada, fallback ke admin pembuat
    const namaPemberiTugas = (s.nama_pimpinan && String(s.nama_pimpinan).trim())
      ? s.nama_pimpinan : (s.nama_pembuat||'-');
    const jabPemberiTugas  = s.jabatan_pembuat || '-';
    const rows1=[['Nama',namaPemberiTugas],['Jabatan',jabPemberiTugas],['Instansi',inst.nama_instansi||'PT. Hutakalo Minatani Prima']];
    rows1.forEach(r=>{
      doc.setTextColor(100,100,100); doc.text(r[0], mL+2, y);
      doc.setTextColor(0,0,0); doc.text(': '+r[1], mL+38, y); y+=6;
    });
    y+=2;
    doc.text('Dengan ini menugaskan karyawan:', mL, y); y+=7;

    const rows2=[['Nama',s.nama_karyawan||'-'],['NIK',s.nik||'-'],['Jabatan',s.jabatan||'-'],['Departemen',s.departemen||'-']];
    rows2.forEach(r=>{
      doc.setTextColor(100,100,100); doc.text(r[0], mL+2, y);
      doc.setTextColor(0,0,0); doc.text(': '+r[1], mL+38, y); y+=6;
    });
    y+=4;

    // ── Box tugas proporsional ────────────────────────────────
    doc.setFontSize(10.5);
    const padV   = 5;   // padding atas & bawah dalam box
    const lineH  = 7;   // jarak antar baris (mm)
    const xLabel = mL + 8;          // label kiri mulai dari sini
    const xColon = mL + 42;         // titik dua sejajar
    const xValue = mL + 45;         // nilai mulai dari sini
    const valW   = W - mR - xValue; // lebar maksimal nilai

    const tugasRows = [
      ['Tujuan Tugas', s.tujuan_tugas||'-'],
      ['Keperluan',    s.keperluan||'-'],
      ['Periode',      _fmtTglST(s.tanggal_mulai)+' s/d '+_fmtTglST(s.tanggal_selesai)+' ('+s.total_hari+' hari)']
    ];

    // Hitung tinggi box dinamis
    let boxH = padV * 2;
    tugasRows.forEach(r => {
      const lines = doc.splitTextToSize(r[1], valW);
      boxH += lines.length * lineH;
    });

    // Gambar box + garis aksen kiri
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(mL, y, W-mL-mR, boxH, 2, 2, 'F');
    doc.setDrawColor(37, 99, 235); doc.setLineWidth(1.2);
    doc.line(mL, y, mL, y + boxH);          // garis kiri tebal
    doc.setDrawColor(180, 210, 255); doc.setLineWidth(0.3);
    doc.roundedRect(mL, y, W-mL-mR, boxH, 2, 2, 'S'); // border tipis
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);

    // Tulis isi baris — dimulai setelah padding atas
    let ty = y + padV + 4.5; // baseline baris pertama
    tugasRows.forEach(r => {
      const lines = doc.splitTextToSize(r[1], valW);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 90, 90);   doc.text(r[0], xLabel, ty);
      doc.setTextColor(80, 80, 80);   doc.text(':', xColon, ty);
      doc.setTextColor(0, 0, 0);      doc.text(lines, xValue, ty);
      ty += lines.length * lineH;
    });

    y += boxH + 8; // avancer après la box

    // Penutup
    doc.setFontSize(10.5);
    const penutup = doc.splitTextToSize(
      'Demikian surat tugas ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab. '+
      'Kepada pihak-pihak terkait diharapkan dapat memberikan bantuan seperlunya.',
      W-mL-mR);
    doc.text(penutup, mL, y); y+=penutup.length*6+4;

    doc.setTextColor(100,100,100);
    doc.text('Diterbitkan di : '+(_getKotaFromAlamat(inst.alamat_instansi)||'Gorontalo Utara'), mL, y); y+=6;
    doc.text('Tanggal          : '+tglDiterbitkan, mL, y); y+=10;
    doc.setTextColor(0,0,0);

    // ── Tanda tangan — kolom dinamis sesuai pihak yang terlibat ─
    // Kumpulkan hanya kolom TTD yang relevan (nama tidak kosong)
    const ttdSlots = [];
    // Slot 1: Karyawan — selalu ada
    ttdSlots.push({
      label : 'Karyawan penerima tugas',
      nama  : String(s.nama_karyawan || '-'),
      jabatan: String(s.jabatan || ''),
      img   : s.ttd_karyawan || ''
    });
    // Slot 2: Atasan langsung — hanya bila ada
    if (s.nama_atasan && String(s.nama_atasan).trim() !== '') {
      ttdSlots.push({
        label : 'Atasan langsung',
        nama  : String(s.nama_atasan),
        jabatan: '',
        img   : s.ttd_atasan || ''
      });
    }
    // Slot 3: Pimpinan/Mengetahui — hanya bila ada
    if (s.nama_pimpinan && String(s.nama_pimpinan).trim() !== '') {
      ttdSlots.push({
        label : 'Mengetahui',
        nama  : String(s.nama_pimpinan),
        jabatan: String(s.jabatan_pembuat || 'Admin / HRD'),
        img   : s.ttd_pimpinan || ''
      });
    }
    // Bila PM dinas luar (hanya 1 slot), tambah slot Admin di kanan
    if (ttdSlots.length === 1) {
      ttdSlots.push({
        label : 'Mengetahui',
        nama  : String(s.nama_pembuat || 'Admin'),
        jabatan: String(s.jabatan_pembuat || 'Admin'),
        img   : ''
      });
    }

    const nSlot = ttdSlots.length;
    const ttdW  = (W - mL - mR) / nSlot;

    // Label atas
    doc.setFontSize(9);
    ttdSlots.forEach((slot, i) => {
      const tx = mL + i * ttdW;
      doc.setTextColor(100,100,100);
      doc.text(slot.label, tx + ttdW/2, y, {align:'center'});
    });
    y += 4;

    // Kotak + gambar TTD
    ttdSlots.forEach((slot, i) => {
      const tx = mL + i * ttdW;
      doc.setDrawColor(200,210,220); doc.setLineWidth(0.3);
      doc.roundedRect(tx+2, y, ttdW-4, 20, 2, 2);
      if (slot.img && String(slot.img).length > 10) {
        try {
          const imgSrc = slot.img.startsWith('data:')
            ? slot.img
            : 'data:image/png;base64,' + slot.img;
          doc.addImage(imgSrc, 'PNG', tx+2, y, ttdW-4, 20, '', 'FAST');
        } catch(eImg) { /* gambar rusak — biarkan kotak kosong */ }
      }
    });
    y += 22;

    // Garis bawah kotak TTD
    ttdSlots.forEach((slot, i) => {
      const tx = mL + i * ttdW;
      doc.setDrawColor(150,150,150); doc.setLineWidth(0.3);
      doc.line(tx+4, y, tx+ttdW-4, y);
    });
    y += 5;

    // Nama & jabatan
    ttdSlots.forEach((slot, i) => {
      const tx = mL + i * ttdW;
      doc.setTextColor(0,0,0); doc.setFont('helvetica','bold'); doc.setFontSize(9);
      const nm = doc.splitTextToSize(slot.nama, ttdW-4);
      doc.text(nm, tx+ttdW/2, y, {align:'center'});
      if (slot.jabatan && slot.jabatan.trim() !== '') {
        doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80); doc.setFontSize(8);
        doc.text(slot.jabatan, tx+ttdW/2, y + nm.length*4, {align:'center'});
      }
    });

    doc.save('SuratTugas_'+(s.no_surat||'ST').replace(/\//g,'-')+'.pdf');
    showToast('✅ PDF berhasil didownload!', 'success', 3000);
  } catch(eP) {
    showToast('Gagal cetak: '+eP.message, 'error');
  }
}

function _getKotaFromAlamat(alamat) {
  if (!alamat) return '';
  const m = alamat.match(/Kab\.?\s+([^,\u2013\-]+)/i);
  return m ? m[1].trim() : alamat.split(',')[0].trim();
}


// ─── PERPANJANG DINAS LUAR (tanpa TTD ulang) ─────────────────
async function _perpanjangDinasLuar(idSurat) {
  document.getElementById('modal-perpanjang-dl')?.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-perpanjang-dl';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);' +
    'z-index:9600;display:flex;align-items:center;justify-content:center;padding:16px';

  const now = new Date();
  const tgl = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');

  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:380px">
    <div style="font-size:16px;font-weight:700;margin-bottom:8px">📅 Perpanjang Dinas Luar</div>
    <div style="background:#EFF6FF;border-radius:8px;padding:10px 14px;
      margin-bottom:16px;font-size:12px;color:#1E40AF;line-height:1.6">
      ℹ️ Perpanjangan <strong>tidak perlu tanda tangan ulang</strong>.<br>
      Surat lama tetap tersimpan sebagai arsip.<br>
      Admin hanya perlu menyetujui perpanjangan ini.
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
          PERPANJANG SAMPAI TANGGAL</label>
        <input id="perp-tgl-selesai" type="date" value="${tgl}"
          style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
          font-size:13px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
          ALASAN PERPANJANGAN</label>
        <textarea id="perp-alasan" rows="2" placeholder="Contoh: Pekerjaan belum selesai..."
          style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
          font-size:13px;box-sizing:border-box;resize:vertical"></textarea>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button onclick="document.getElementById('modal-perpanjang-dl').remove()"
        style="flex:1;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
        font-size:13px;cursor:pointer;background:#fff">Batal</button>
      <button onclick="_kirimPerpanjangan('${idSurat}')"
        style="flex:2;padding:10px;background:#2D6CDF;color:#fff;border:none;
        border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
        📤 Ajukan Perpanjangan
      </button>
    </div>
  </div>`;

  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function _kirimPerpanjangan(idSurat) {
  const tglBaru = document.getElementById('perp-tgl-selesai')?.value;
  const alasan  = document.getElementById('perp-alasan')?.value?.trim();

  if (!tglBaru) { showToast('Pilih tanggal perpanjangan', 'warning'); return; }
  if (!alasan)  { showToast('Isi alasan perpanjangan', 'warning'); return; }

  const toIDDate = v => { const p=v.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; };

  try {
    showToast('Mengirim perpanjangan ke admin...', 'info', 2000);
    await callAPI('perpanjangSuratTugas', {
      id_surat             : idSurat,
      tanggal_selesai_baru : toIDDate(tglBaru),
      alasan               : alasan
    });
    document.getElementById('modal-perpanjang-dl')?.remove();
    showToast('✅ Perpanjangan diajukan. Admin akan menyetujui.', 'success', 4000);
  } catch(e) {
    showToast('Gagal: '+e.message, 'error');
  }
}

// ─── BUAT SURAT TUGAS DARI PENGAJUAN (admin) ─────────────────
// Wrapper: baca data-attribute dari tombol lalu panggil fungsi utama
function _buatSuratClick(btn) {
  const idP = btn.dataset.pgj  || '';
  const idK = btn.dataset.kary || '';
  const tm  = decodeURIComponent(btn.dataset.tm  || '');
  const ts  = decodeURIComponent(btn.dataset.ts  || '');
  const ket = decodeURIComponent(btn.dataset.ket || '');
  _buatSuratDariPengajuan(idP, idK, tm, ts, ket);
}

async function _buatSuratDariPengajuan(idPengajuan, idKaryawan, tglMulai, tglSelesai, keterangan) {
  document.getElementById('modal-buat-st')?.remove();

  // Decode bila masih encoded
  const ket = (typeof keterangan === 'string') ? keterangan : '';

  const toInputDate = (v) => {
    if (!v) return '';
    v = decodeURIComponent(v);
    const p = v.split('/');
    return p.length >= 3
      ? p[2]+'-'+String(p[1]).padStart(2,'0')+'-'+String(p[0]).padStart(2,'0')
      : v;
  };

  const modal = document.createElement('div');
  modal.id = 'modal-buat-st';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);' +
    'z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';

  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:24px;
    width:100%;max-width:480px;max-height:90vh;overflow-y:auto">
    <input type="hidden" id="st-id-kary" value="${idKaryawan}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:16px;font-weight:700">📋 Buat Surat Tugas</div>
        <div style="font-size:12px;color:#64748B">Data dari pengajuan dinas luar</div>
      </div>
      <button onclick="document.getElementById('modal-buat-st').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:32px;
        height:32px;font-size:16px;cursor:pointer">✕</button>
    </div>

    <div style="background:#EFF6FF;border-radius:8px;padding:10px 14px;
      margin-bottom:16px;font-size:12px;color:#1E40AF">
      ℹ️ Surat tugas akan dikirim ke karyawan untuk ditandatangani.
      Setelah semua tanda tangan lengkap, kamu bisa setujui pengajuan ini.
    </div>

    <div style="display:flex;flex-direction:column;gap:14px">
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
          TUJUAN TUGAS</label>
        <input id="st-tujuan" type="text" placeholder="Contoh: Sukabumi, Jawa Barat"
          value=""
          style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
          font-size:13px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
          KEPERLUAN / TUGAS</label>
        <textarea id="st-keperluan" rows="3"
          placeholder="Jelaskan keperluan tugas..."
          style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
          font-size:13px;box-sizing:border-box;resize:vertical">${ket||''}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
            TANGGAL MULAI</label>
          <input id="st-tgl-mulai" type="date" value="${toInputDate(tglMulai)}"
            style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
            font-size:13px;box-sizing:border-box" onchange="_hitungHariST()">
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
            TANGGAL SELESAI</label>
          <input id="st-tgl-selesai" type="date" value="${toInputDate(tglSelesai)}"
            style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
            font-size:13px;box-sizing:border-box" onchange="_hitungHariST()">
        </div>
      </div>
      <div id="st-info-hari" style="font-size:12px;color:#2D6CDF;text-align:center"></div>
    </div>

    <button onclick="_kirimSuratTugas('${idPengajuan}')"
      style="width:100%;margin-top:20px;padding:12px;background:#1E3A5F;color:#fff;
      border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">
      📤 Buat & Kirim ke Karyawan
    </button>
  </div>`;

  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);

  // Set nilai via JS setelah render — aman untuk semua karakter khusus
  setTimeout(() => {
    const elTujuan = document.getElementById('st-tujuan');
    const elKeper  = document.getElementById('st-keperluan');
    if (elTujuan) elTujuan.value = ket || '';
    if (elKeper)  elKeper.value  = ket || '';
    _hitungHariST();
  }, 50);
}

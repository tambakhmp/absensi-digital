// ============================================================
// ranking.js v5 — Ranking Card, Top 3 + Bottom 3, Detail Stats
// ============================================================

const PREDIKAT_MAP = {
  'Bintang Emas'       : { icon:'🏆', cls:'rank-badge--gold',    border:'rank-1'      },
  'Bintang Perak'      : { icon:'🥈', cls:'rank-badge--silver',  border:'rank-2'      },
  'Bintang Perunggu'   : { icon:'🥉', cls:'rank-badge--bronze',  border:'rank-3'      },
  'Perlu Pembinaan'    : { icon:'⚠️', cls:'rank-badge--danger',  border:'rank-worst-1' },
  'Butuh Perhatian'    : { icon:'⚠️', cls:'rank-badge--warning', border:'rank-worst-2' },
  'Tingkatkan Kinerja' : { icon:'⚠️', cls:'rank-badge--caution', border:'rank-worst-3' }
};

// ─── RENDER RANKING SECTION (dashboard karyawan & admin) ─────
async function renderRankingSection(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  showLoading(containerId, 'Memuat ranking...');
  try {
    const data = await callAPI('getRankingBulanIni', {});
    if (!data || data.length === 0) {
      el.innerHTML = `<div class="card" style="text-align:center;padding:20px;color:#94A3B8">
        <div style="font-size:28px;margin-bottom:8px">🏆</div>
        <div style="font-size:13px">Ranking belum dihitung bulan ini.<br>
        Admin: menu <strong>Ranking → ⚡ Hitung Ulang</strong>.</div>
      </div>`;
      return;
    }

    const now   = new Date();
    const label = bulanNama(now.getMonth()+1) + ' ' + now.getFullYear();
    const n     = data.length;

    // Top 3 terbaik
    const top3 = data.filter(r => parseInt(r.peringkat) <= 3);

    // Bottom 3 terburuk (3 peringkat terakhir ATAU yang predikat negatif)
    const bot3 = data.length >= 6
      ? data.slice(-3).reverse()  // 3 terakhir dari ranking
      : data.filter(r => ['Perlu Pembinaan','Butuh Perhatian','Tingkatkan Kinerja'].includes(r.predikat));

    el.innerHTML = `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">🏆</span>
            <h3 style="margin:0;font-size:15px;font-weight:700">Ranking ${label}</h3>
          </div>
          <span style="font-size:12px;color:#94A3B8">${n} karyawan</span>
        </div>

        ${top3.length > 0 ? `
        <p style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;
          letter-spacing:.8px;margin:0 0 8px">⭐ 3 Karyawan Terbaik</p>
        ${top3.map(r => _rankCard(r)).join('')}` : ''}

        ${bot3.length > 0 ? `
        <div style="border-top:1px dashed #E2E8F0;margin:14px 0 10px"></div>
        <p style="font-size:11px;font-weight:700;color:#E53E3E;text-transform:uppercase;
          letter-spacing:.8px;margin:0 0 8px">⚠️ 3 Karyawan Perlu Perhatian</p>
        ${bot3.map(r => _rankCardBuruk(r)).join('')}` : ''}
      </div>`;
  } catch(e) {
    showError(containerId, 'Gagal: ' + e.message);
  }
}

// ─── CARD RANKING TERBAIK ─────────────────────────────────────
function _rankCard(r) {
  const meta   = PREDIKAT_MAP[r.predikat] || { icon:'', cls:'', border:'' };
  const foto   = getPhotoSrc(r.foto || '', r.nama_karyawan, 48);
  const num    = parseInt(r.peringkat);
  const emoji  = num===1?'🥇':num===2?'🥈':num===3?'🥉':'#'+num;

  return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;
    border-bottom:1px solid #F8FAFC">
    <div style="position:relative;flex-shrink:0">
      <div class="${meta.border}" style="width:48px;height:48px;border-radius:50%;overflow:hidden">
        <img src="${foto}" style="width:100%;height:100%;object-fit:cover"
          onerror="this.src='${avatarInisial(r.nama_karyawan,48)}'">
      </div>
      <span style="position:absolute;bottom:-2px;right:-4px;font-size:14px">${emoji}</span>
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:14px;white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis">${r.nama_karyawan}</div>
      <div style="font-size:11px;color:#64748B">${r.departemen||r.jabatan||''}</div>
      ${r.predikat?`<span class="rank-badge ${meta.cls}" style="margin-top:3px;display:inline-flex;font-size:10px">
        ${meta.icon} ${r.predikat}</span>`:''}
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:14px;font-weight:700;color:var(--color-primer)">${parseInt(r.skor_kehadiran||0)}</div>
      <div style="font-size:10px;color:#94A3B8">skor</div>
      <div style="font-size:11px;color:#1A9E74">✅ ${r.total_hadir||0} hr</div>
    </div>
  </div>`;
}

// ─── CARD RANKING TERBURUK (merah, detail alfa) ───────────────
function _rankCardBuruk(r) {
  const foto  = getPhotoSrc(r.foto || '', r.nama_karyawan, 44);
  const num   = parseInt(r.peringkat);

  return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;
    border-bottom:1px solid #FFF5F5;background:#FFFAFA;
    border-radius:8px;padding:10px;margin-bottom:6px">
    <div style="position:relative;flex-shrink:0">
      <div class="rank-worst-1" style="width:44px;height:44px;border-radius:50%;overflow:hidden">
        <img src="${foto}" style="width:100%;height:100%;object-fit:cover"
          onerror="this.src='${avatarInisial(r.nama_karyawan,44)}'">
      </div>
      <span style="position:absolute;bottom:-2px;right:-4px;font-size:13px">⚠️</span>
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:13px;color:#C53030;white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis">${r.nama_karyawan}</div>
      <div style="font-size:11px;color:#64748B">${r.departemen||r.jabatan||''} · Rank #${num}</div>
      <div style="display:flex;gap:8px;margin-top:3px;flex-wrap:wrap">
        <span style="font-size:10px;background:#FFF5F5;color:#E53E3E;padding:1px 6px;
          border-radius:10px;border:1px solid #FC8181">
          ❌ Alfa: ${r.total_alfa||0}
        </span>
        <span style="font-size:10px;background:#FFFAF0;color:#D97706;padding:1px 6px;
          border-radius:10px;border:1px solid #F6AD55">
          ⏰ Telat: ${r.total_terlambat||0}
        </span>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:14px;font-weight:700;color:#E53E3E">${parseInt(r.skor_kehadiran||0)}</div>
      <div style="font-size:10px;color:#94A3B8">skor</div>
      <div style="font-size:11px;color:#1A9E74">✅ ${r.total_hadir||0} hr</div>
    </div>
  </div>`;
}

// Kompatibilitas kode lama yang masih pakai renderRankCard
function renderRankCard(r) { return _rankCard(r); }

// ─── RENDER FOTO PROFIL DENGAN BORDER RANKING ─────────────────
function renderFotoProfil(fotoUrl, nama, predikat, ukuran = 80) {
  const meta = PREDIKAT_MAP[predikat] || { border:'', cls:'', icon:'' };
  const foto = getPhotoSrc(fotoUrl, nama, ukuran);
  return `
    <div class="${meta.border}" style="width:${ukuran}px;height:${ukuran}px;
      border-radius:50%;overflow:hidden;flex-shrink:0">
      <img src="${foto}" alt="${nama}"
        style="width:100%;height:100%;object-fit:cover"
        onerror="this.src='${avatarInisial(nama,ukuran)}'">
    </div>
    ${predikat ? `<div class="rank-badge ${meta.cls}"
      style="margin-top:6px;font-size:11px;display:inline-flex">
      ${meta.icon} ${predikat}</div>` : ''}`;
}

// ─── AMBIL PREDIKAT KARYAWAN SENDIRI ─────────────────────────
async function getPredikatSaya(idKaryawan) {
  try {
    const data = await callAPI('getRankingBulanIni', {});
    if (!data) return null;
    return data.find(r => String(r.id_karyawan) === String(idKaryawan)) || null;
  } catch(e) { return null; }
}

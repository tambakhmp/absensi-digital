// ============================================================
// ranking.js — Render Ranking Card + Border Animasi
// ============================================================

const RANK_CSS = {
  1: 'rank-1',
  2: 'rank-2',
  3: 'rank-3',
  worst1: 'rank-worst-1',
  worst2: 'rank-worst-2',
  worst3: 'rank-worst-3'
};

const PREDIKAT_MAP = {
  'Bintang Emas'       : { icon:'🏆', cls:'rank-badge--gold',    border:'rank-1' },
  'Bintang Perak'      : { icon:'🥈', cls:'rank-badge--silver',  border:'rank-2' },
  'Bintang Perunggu'   : { icon:'🥉', cls:'rank-badge--bronze',  border:'rank-3' },
  'Perlu Pembinaan'    : { icon:'⚠️', cls:'rank-badge--danger',  border:'rank-worst-1' },
  'Butuh Perhatian'    : { icon:'⚠️', cls:'rank-badge--warning', border:'rank-worst-2' },
  'Tingkatkan Kinerja' : { icon:'⚠️', cls:'rank-badge--caution', border:'rank-worst-3' }
};

async function renderRankingSection(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  showLoading(containerId, 'Memuat ranking...');
  try {
    const data = await callAPI('getRankingBulanIni', {});
    if (!data || data.length === 0) {
      showEmpty(containerId, 'Belum ada data ranking bulan ini');
      return;
    }
    const now   = new Date();
    const label = bulanNama(now.getMonth()+1) + ' ' + now.getFullYear();
    const top3  = data.filter(r => parseInt(r.peringkat) <= 3);
    const bot3  = data.filter(r => ['Perlu Pembinaan','Butuh Perhatian','Tingkatkan Kinerja'].includes(r.predikat));

    el.innerHTML = `
      <div class="card" style="margin-bottom:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <span style="font-size:20px">🏆</span>
          <h3 style="margin:0;font-size:16px;color:#1E293B">Ranking ${label}</h3>
        </div>
        ${top3.length > 0 ? `
          <p style="font-size:12px;font-weight:700;color:#D97706;text-transform:uppercase;
            letter-spacing:.8px;margin:0 0 10px">⭐ Terbaik Bulan Ini</p>
          ${top3.map(r => renderRankCard(r)).join('')}` : ''}
        ${bot3.length > 0 ? `
          <p style="font-size:12px;font-weight:700;color:#E53E3E;text-transform:uppercase;
            letter-spacing:.8px;margin:16px 0 10px">⚠️ Perlu Perhatian</p>
          ${bot3.map(r => renderRankCard(r)).join('')}` : ''}
      </div>`;
  } catch(e) {
    showError(containerId, 'Gagal memuat ranking: ' + e.message);
  }
}

function renderRankCard(r) {
  const meta     = PREDIKAT_MAP[r.predikat] || { icon:'', cls:'', border:'' };
  const foto     = getPhotoSrc(r.foto, r.nama_karyawan, 48);
  const rankNum  = parseInt(r.peringkat);
  const emoji    = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : '#'+rankNum;

  return `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;
      border-bottom:1px solid #F1F5F9">
      <div style="position:relative;flex-shrink:0">
        <div class="${meta.border}" style="width:48px;height:48px;border-radius:50%;overflow:hidden">
          <img src="${foto}" alt="${r.nama_karyawan}"
            style="width:100%;height:100%;object-fit:cover"
            onerror="this.src='${avatarInisial(r.nama_karyawan,48)}'">
        </div>
        <span style="position:absolute;bottom:-2px;right:-4px;font-size:14px">${emoji}</span>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px;color:#1E293B;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.nama_karyawan}</div>
        <div style="font-size:12px;color:#64748B">${r.departemen||''}</div>
        ${r.predikat ? `<span class="rank-badge ${meta.cls}" style="margin-top:3px;display:inline-flex">
          ${meta.icon} ${r.predikat}</span>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:13px;font-weight:700;color:var(--color-primer)">${parseInt(r.skor_kehadiran||0)}</div>
        <div style="font-size:11px;color:#94A3B8">skor</div>
        <div style="font-size:11px;color:#1A9E74;margin-top:2px">✅ ${r.total_hadir||0} hr</div>
      </div>
    </div>`;
}

// Render foto profil dengan border ranking
function renderFotoProfil(fotoUrl, nama, predikat, ukuran = 80) {
  const meta   = PREDIKAT_MAP[predikat] || { border: '' };
  const foto   = getPhotoSrc(fotoUrl, nama, ukuran);
  return `
    <div class="${meta.border}" style="width:${ukuran}px;height:${ukuran}px;
      border-radius:50%;overflow:hidden;flex-shrink:0">
      <img src="${foto}" alt="${nama}"
        style="width:100%;height:100%;object-fit:cover"
        onerror="this.src='${avatarInisial(nama,ukuran)}'">
    </div>
    ${predikat ? `<div class="rank-badge ${(PREDIKAT_MAP[predikat]||{}).cls||''}"
      style="margin-top:6px;font-size:11px">
      ${(PREDIKAT_MAP[predikat]||{}).icon||''} ${predikat}</div>` : ''}`;
}

// Ambil predikat karyawan tertentu dari ranking bulan ini
async function getPredikatSaya(idKaryawan) {
  try {
    const data = await callAPI('getRankingBulanIni', {});
    if (!data) return null;
    return data.find(r => String(r.id_karyawan) === String(idKaryawan)) || null;
  } catch(e) { return null; }
}

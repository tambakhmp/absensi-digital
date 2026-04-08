// ============================================================
// utils.js — Toast, Avatar Inisial, Format, Confetti, Haversine
// ============================================================

// ─── Toast Notification ──────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'info', duration = 3500) {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.style.cssText = 'position:fixed;bottom:90px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:320px;';
    document.body.appendChild(el);
  }

  const colors = { success:'#1A9E74', error:'#E53E3E', warning:'#D97706', info:'#2D6CDF' };
  const icons  = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };

  const toast = document.createElement('div');
  toast.style.cssText = `
    background:${colors[type]||colors.info};color:#fff;
    padding:12px 16px;border-radius:10px;font-size:14px;
    box-shadow:0 4px 16px rgba(0,0,0,0.2);
    display:flex;align-items:center;gap:8px;
    animation:slideInRight 0.3s ease;
    position:relative;overflow:hidden;
  `;
  toast.innerHTML = `<span style="font-size:18px">${icons[type]||'ℹ️'}</span>
    <span style="flex:1;line-height:1.4">${msg}</span>
    <div style="position:absolute;bottom:0;left:0;height:3px;background:rgba(255,255,255,0.5);animation:toastBar ${duration}ms linear forwards;width:100%"></div>`;

  el.appendChild(toast);
  setTimeout(() => { toast.style.animation='slideOutRight 0.3s ease forwards'; setTimeout(()=>toast.remove(),300); }, duration);
}

// ─── Avatar Inisial ───────────────────────────────────────────
function avatarInisial(nama, ukuran = 80) {
  const inisial = (nama||'U').split(' ').slice(0,2).map(n=>n[0].toUpperCase()).join('');
  const pal = ['#2D6CDF','#1A9E74','#D97706','#E53E3E','#6C63FF','#0891B2','#7C3AED','#DB2777'];
  const bg  = pal[(nama||'U').charCodeAt(0) % pal.length];
  const fs  = Math.round(ukuran * 0.38);
  const h   = ukuran / 2;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ukuran}" height="${ukuran}">
      <circle cx="${h}" cy="${h}" r="${h}" fill="${bg}"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        fill="white" font-size="${fs}" font-family="Inter,sans-serif" font-weight="600">${inisial}</text>
    </svg>`
  )}`;
}

function getPhotoSrc(url, nama, ukuran = 80) {
  return url && url.startsWith('http') ? url : avatarInisial(nama || 'U', ukuran);
}

// ─── Format ──────────────────────────────────────────────────
function formatTanggal(str) {
  if (!str) return '-';
  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const p = str.split('/');
  if (p.length < 3) return str;
  return parseInt(p[0]) + ' ' + BULAN[parseInt(p[1])-1] + ' ' + p[2];
}

function formatJam(str) { return str || '-'; }

function formatRupiah(n) {
  return 'Rp ' + parseInt(n||0).toLocaleString('id-ID');
}

function terbilang(n) {
  const satuan = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan'];
  const belasan= ['sepuluh','sebelas','dua belas','tiga belas','empat belas','lima belas',
                  'enam belas','tujuh belas','delapan belas','sembilan belas'];
  if (n < 10)  return satuan[n];
  if (n < 20)  return belasan[n-10];
  if (n < 100) return satuan[Math.floor(n/10)] + ' puluh ' + (n%10?satuan[n%10]:'');
  if (n < 1000) return satuan[Math.floor(n/100)] + ' ratus ' + (n%100?terbilang(n%100):'');
  if (n < 1000000) return terbilang(Math.floor(n/1000)) + ' ribu ' + (n%1000?terbilang(n%1000):'');
  if (n < 1000000000) return terbilang(Math.floor(n/1000000)) + ' juta ' + (n%1000000?terbilang(n%1000000):'');
  return n.toString();
}

function badgeStatus(status) {
  const map = {
    hadir      : ['#1A9E74','Hadir'],
    terlambat  : ['#D97706','Terlambat'],
    alfa       : ['#E53E3E','Alfa'],
    izin       : ['#2D6CDF','Izin'],
    sakit      : ['#6B7280','Sakit'],
    cuti       : ['#6C63FF','Cuti'],
    dinas_luar : ['#EA580C','Dinas Luar'],
    pending    : ['#D97706','Menunggu'],
    disetujui  : ['#1A9E74','Disetujui'],
    ditolak    : ['#E53E3E','Ditolak'],
    dibatalkan : ['#6B7280','Dibatalkan']
  };
  const [c, l] = map[status] || ['#6B7280', status];
  return `<span style="background:${c}22;color:${c};border:1px solid ${c}44;
    padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">${l}</span>`;
}

function greetingWaktu() {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat pagi 🌅';
  if (h < 15) return 'Selamat siang ☀️';
  if (h < 18) return 'Selamat sore 🌤️';
  return 'Selamat malam 🌙';
}

function bulanNama(n) {
  return ['Januari','Februari','Maret','April','Mei','Juni',
          'Juli','Agustus','September','Oktober','November','Desember'][n-1] || '';
}

function hariNama() {
  return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date().getDay()];
}

// ─── Haversine (frontend) ─────────────────────────────────────
function hitungJarak(lat1,lon1,lat2,lon2) {
  const R    = 6371000;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a    = Math.sin(dLat/2)**2 +
               Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ─── Ulang Tahun Check ───────────────────────────────────────
function cekUlangTahunSaya(tanggalLahir, nama) {
  if (!tanggalLahir) return null;
  const today = new Date();
  const p     = String(tanggalLahir).split('/');
  if (p.length < 3) return null;
  const tgl = parseInt(p[0]), bln = parseInt(p[1]), thn = parseInt(p[2]);
  if (tgl !== today.getDate() || bln !== (today.getMonth()+1)) return null;
  const umur = today.getFullYear() - thn;
  const tmpl = localStorage.getItem('ucapan_tmpl') ||
    '🎂 Selamat Ulang Tahun ke-{umur}, {nama}! Semoga sehat selalu dan semakin berprestasi! 🎉';
  return tmpl.replace('{umur}', umur).replace('{nama}', (nama||'').split(' ')[0]);
}

// ─── Confetti CSS ─────────────────────────────────────────────
function showConfetti() {
  const colors = ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(container);
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    const color = colors[i % colors.length];
    const size  = Math.random() * 8 + 4;
    const x     = Math.random() * 100;
    const delay = Math.random() * 2;
    p.style.cssText = `position:absolute;width:${size}px;height:${size}px;
      background:${color};left:${x}%;top:-10px;border-radius:${Math.random()>0.5?'50%':'2px'};
      animation:confettiFall ${2+Math.random()*2}s ${delay}s ease-in forwards;opacity:0.9;`;
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 5000);
}

// ─── Loading Helpers ──────────────────────────────────────────
function showLoading(containerId, msg = 'Memuat...') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;
      justify-content:center;padding:40px;gap:12px;color:#64748B">
      <div class="spinner" style="width:36px;height:36px;border:3px solid #E2E8F0;
        border-top-color:var(--color-primer,#2D6CDF);border-radius:50%;
        animation:spin 0.8s linear infinite"></div>
      <span style="font-size:14px">${msg}</span>
    </div>`;
}

function showEmpty(containerId, msg = 'Tidak ada data') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:40px;color:#94A3B8;font-size:14px">
    <div style="font-size:40px;margin-bottom:8px">📭</div><div>${msg}</div></div>`;
}

function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:32px;color:#E53E3E;font-size:14px">
    <div style="font-size:32px;margin-bottom:8px">⚠️</div><div>${msg}</div></div>`;
}

// ─── Modal ───────────────────────────────────────────────────
function showModal(title, content, onConfirm = null, confirmText = 'OK') {
  document.getElementById('modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);
    z-index:9000;display:flex;align-items:center;justify-content:center;
    padding:16px;backdrop-filter:blur(4px);`;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:400px;
      box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:fadeInScale 0.2s ease">
      <h3 style="margin:0 0 12px;font-size:18px;color:#1E293B">${title}</h3>
      <div style="color:#475569;font-size:14px;line-height:1.6;margin-bottom:20px">${content}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="document.getElementById('modal-overlay').remove()"
          style="padding:10px 20px;border:1px solid #E2E8F0;border-radius:8px;
          background:#fff;cursor:pointer;font-size:14px;color:#64748B">Batal</button>
        ${onConfirm ? `<button id="modal-confirm-btn"
          style="padding:10px 20px;border:none;border-radius:8px;
          background:var(--color-primer,#2D6CDF);color:#fff;cursor:pointer;
          font-size:14px;font-weight:600">${confirmText}</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  if (onConfirm) {
    document.getElementById('modal-confirm-btn').onclick = () => {
      overlay.remove();
      onConfirm();
    };
  }
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
}

// ─── Skeleton Loader ─────────────────────────────────────────
function skeletonCard(count = 3) {
  return Array(count).fill(0).map(() => `
    <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin-bottom:12px">
      <div class="skeleton" style="width:60%;height:14px;border-radius:6px;margin-bottom:10px"></div>
      <div class="skeleton" style="width:100%;height:10px;border-radius:6px;margin-bottom:8px"></div>
      <div class="skeleton" style="width:80%;height:10px;border-radius:6px"></div>
    </div>`).join('');
}

// ─── Tanggal Hari ini Indonesia ───────────────────────────────
function tanggalHariIni() {
  const now  = new Date();
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const BLAN = ['Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember'];
  return `${HARI[now.getDay()]}, ${now.getDate()} ${BLAN[now.getMonth()]} ${now.getFullYear()}`;
}

function todayForInput() {
  const n = new Date();
  return `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`;
}

// Konversi dd/MM/yyyy ke yyyy-MM-dd untuk input[type=date]
function toInputDate(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  const p = ddmmyyyy.split('/');
  if (p.length < 3) return '';
  return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
}

// Konversi yyyy-MM-dd ke dd/MM/yyyy
function fromInputDate(yyyymmdd) {
  if (!yyyymmdd) return '';
  const p = yyyymmdd.split('-');
  if (p.length < 3) return '';
  return `${p[2]}/${p[1]}/${p[0]}`;
}

// ─── Fungsi tambahan v5 ───────────────────────────────────────
function fromInputDate(str) {
  // Konversi format input date (yyyy-MM-dd) ke dd/MM/yyyy
  if (!str) return '';
  if (str.includes('/')) return str; // sudah format dd/MM/yyyy
  const p = str.split('-');
  if (p.length === 3) return p[2]+'/'+p[1]+'/'+p[0];
  return str;
}

function bulanNama(b) {
  return ['Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'][parseInt(b)-1]||'';
}

function greetingWaktu() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat Pagi 🌅';
  if (h < 15) return 'Selamat Siang ☀️';
  if (h < 18) return 'Selamat Sore 🌇';
  return 'Selamat Malam 🌙';
}

function tanggalHariIni() {
  const now = new Date();
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
  const tgl  = now.getDate();
  const bln  = bulanNama(now.getMonth()+1);
  const thn  = now.getFullYear();
  return `${hari}, ${tgl} ${bln} ${thn}`;
}

function formatTanggal(str) {
  if (!str) return '-';
  str = String(str);
  if (str.includes('/')) {
    const p = str.split('/');
    if (p.length >= 3) return p[0]+' '+bulanNama(p[1])+' '+p[2];
  }
  return str;
}

function formatRupiah(n) {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + parseInt(n).toLocaleString('id-ID');
}

function badgeStatus(status) {
  const map = {
    hadir     : ['#EBF8EE','#1A9E74','Hadir'],
    terlambat : ['#FFFAF0','#D97706','Terlambat'],
    alfa      : ['#FFF5F5','#E53E3E','Alfa'],
    izin      : ['#EFF6FF','#2D6CDF','Izin'],
    sakit     : ['#F5F3FF','#6B7280','Sakit'],
    cuti      : ['#F3E8FF','#6C63FF','Cuti'],
    dinas_luar: ['#FFF3E0','#EA580C','Dinas Luar'],
    pending   : ['#FFF8F0','#D97706','Pending'],
    disetujui : ['#EBF8EE','#1A9E74','Disetujui'],
    ditolak   : ['#FFF5F5','#E53E3E','Ditolak'],
    belum_dibayar:['#FFF8F0','#D97706','Belum Bayar'],
    aktif     : ['#EBF8EE','#1A9E74','Aktif'],
    kadaluarsa: ['#F1F5F9','#94A3B8','Kadaluarsa'],
    SP1       : ['#FFFAF0','#D97706','SP1'],
    SP2       : ['#FFF3E0','#C05621','SP2'],
    SP3       : ['#FFF5F5','#C53030','SP3']
  };
  const [bg,color,label] = map[status] || ['#F1F5F9','#64748B', status||'-'];
  return `<span style="background:${bg};color:${color};border:1px solid ${color}33;
    padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">
    ${label}</span>`;
}

function skeletonCard(n=1) {
  return Array(n).fill(0).map(()=>`
    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:10px;border:1px solid #E2E8F0">
      <div style="height:14px;background:#F1F5F9;border-radius:6px;width:60%;margin-bottom:10px"></div>
      <div style="height:11px;background:#F8FAFC;border-radius:6px;width:85%;margin-bottom:6px"></div>
      <div style="height:11px;background:#F8FAFC;border-radius:6px;width:70%"></div>
    </div>`).join('');
}

function showLoading(containerId, msg='Memuat...') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div style="text-align:center;padding:40px;color:#94A3B8">
    <div style="width:36px;height:36px;border:3px solid #E2E8F0;border-top-color:#2D6CDF;
      border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px"></div>
    <div style="font-size:13px">${msg}</div></div>`;
}

function showEmpty(containerId, msg='Tidak ada data') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div style="text-align:center;padding:40px;color:#94A3B8">
    <div style="font-size:36px;margin-bottom:8px">📭</div>
    <div style="font-size:13px">${msg}</div></div>`;
}

function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div style="background:#FFF5F5;border:1px solid #FC8181;
    border-radius:10px;padding:16px;color:#C53030;font-size:13px;text-align:center">
    ⚠️ ${msg}</div>`;
}

function showToast(msg, type='success', duration=4000) {
  const colors = { success:'#1A9E74', error:'#E53E3E', warning:'#D97706', info:'#2D6CDF' };
  const old = document.getElementById('toast-msg');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'toast-msg';
  t.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);
    background:${colors[type]||colors.success};color:#fff;padding:12px 22px;
    border-radius:30px;font-size:13px;font-weight:600;z-index:99999;
    box-shadow:0 4px 20px rgba(0,0,0,.18);max-width:88vw;text-align:center;
    animation:fadeInScale .2s ease;word-break:break-word`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t?.remove(), duration);
}

function showModal(title, body, onConfirm, confirmLabel='OK') {
  document.getElementById('modal-overlay')?.remove();
  const m = document.createElement('div');
  m.id = 'modal-overlay';
  m.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9100;
    display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)`;
  m.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:440px;
      max-height:90vh;overflow-y:auto;animation:fadeInScale .2s ease">
      <h3 style="margin:0 0 12px;font-size:17px;font-weight:700">${title}</h3>
      <div style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:20px">${body||''}</div>
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('modal-overlay').remove()"
          class="btn btn--ghost" style="flex:1">Batal</button>
        ${onConfirm ? `<button id="btn-modal-confirm" class="btn btn--primary" style="flex:2">
          <div class="spinner-btn"></div><span class="btn-text">${confirmLabel}</span>
        </button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(m);
  if (onConfirm) {
    const btn = document.getElementById('btn-modal-confirm');
    btn.onclick = async () => {
      btn.disabled = true; btn.classList.add('loading');
      try { await onConfirm(); document.getElementById('modal-overlay')?.remove(); }
      catch(e) { showToast(e.message,'error'); btn.disabled=false; btn.classList.remove('loading'); }
    };
  }
}

function showConfetti() {
  for (let i=0; i<40; i++) {
    const c = document.createElement('div');
    c.style.cssText = `position:fixed;top:-20px;left:${Math.random()*100}vw;
      width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
      background:${['#2D6CDF','#1A9E74','#D97706','#E53E3E','#6C63FF'][Math.floor(Math.random()*5)]};
      border-radius:${Math.random()>0.5?'50%':'0'};pointer-events:none;z-index:99998;
      animation:confettiFall ${2+Math.random()*2}s ease ${Math.random()*2}s forwards`;
    document.body.appendChild(c);
    setTimeout(()=>c.remove(), 5000);
  }
}

function cekUlangTahunSaya(tanggalLahir, nama) {
  if (!tanggalLahir) return null;
  const now  = new Date();
  const p    = String(tanggalLahir).split('/');
  if (p.length < 2) return null;
  if (parseInt(p[0])===now.getDate() && parseInt(p[1])-1===now.getMonth()) {
    const umur = p[2] ? now.getFullYear()-parseInt(p[2]) : 0;
    return `🎂 Selamat Ulang Tahun ke-${umur}, ${nama}! Semoga sehat & sukses selalu! 🎉`;
  }
  return null;
}

function getPhotoSrc(url, nama, size=48) {
  if (url && url !== '' && url !== 'null') {
    if (url.startsWith('data:') || url.startsWith('http')) return url;
  }
  return avatarInisial(nama||'U', size);
}

function avatarInisial(nama, size=48) {
  const colors = ['#2D6CDF','#1A9E74','#D97706','#6C63FF','#0891B2','#EA580C'];
  const inisial = (nama||'U').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  const color   = colors[inisial.charCodeAt(0)%colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${size/2}" fill="${color}"/>
    <text x="${size/2}" y="${size/2+4}" text-anchor="middle" font-size="${size*0.38}"
      font-family="sans-serif" fill="white" font-weight="700">${inisial}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371000, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function settingInput(id, label, map, type='text') {
  return `<div class="form-group" style="margin-bottom:0">
    <label class="form-label">${label}</label>
    <input type="${type}" class="form-control" id="set-${id}" value="${map[id]||''}">
  </div>`;
}
function settingColorInput(id, label, map) {
  const val = map[id]||'#2D6CDF';
  return `<div class="form-group" style="margin-bottom:0">
    <label class="form-label">${label}</label>
    <div style="display:flex;gap:8px;align-items:center">
      <input type="color" value="${val}" style="width:44px;height:38px;border:1px solid #E2E8F0;
        border-radius:6px;cursor:pointer;padding:2px"
        oninput="document.getElementById('set-${id}').value=this.value">
      <input type="text" class="form-control" id="set-${id}" value="${val}" style="flex:1">
    </div></div>`;
}

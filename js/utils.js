// utils.js — Semua helper functions (dimuat ke-3)

// ─── FORMAT ──────────────────────────────────────────────────
function bulanNama(b){return['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(b)-1]||'';}
function formatTanggal(str){if(!str)return'-';str=String(str);const p=str.split('/');if(p.length>=3)return p[0]+' '+bulanNama(p[1])+' '+p[2];return str;}
function formatRupiah(n){if(!n&&n!==0)return'Rp 0';return'Rp '+Math.round(parseFloat(n)).toLocaleString('id-ID');}
function fromInputDate(str){if(!str)return'';if(str.includes('/'))return str;const p=str.split('-');if(p.length===3)return p[2]+'/'+p[1]+'/'+p[0];return str;}
function tanggalHariIni(){const now=new Date();const h=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];return h+', '+now.getDate()+' '+bulanNama(now.getMonth()+1)+' '+now.getFullYear();}
function greetingWaktu(){const h=new Date().getHours();if(h<11)return'Selamat Pagi 🌅';if(h<15)return'Selamat Siang ☀️';if(h<18)return'Selamat Sore 🌇';return'Selamat Malam 🌙';}

// ─── DRIVE URL ───────────────────────────────────────────────
function normalizeDriveUrlFrontend(url){
  if(!url)return'';
  if(url.startsWith('data:')||url.startsWith('blob:'))return url;
  if(url.startsWith('https://lh3.googleusercontent.com/d/'))return url;
  const pats=[/\/file\/d\/([a-zA-Z0-9_-]+)/,/[?&]id=([a-zA-Z0-9_-]+)/,/\/d\/([a-zA-Z0-9_-]+)/];
  for(const p of pats){const m=url.match(p);if(m&&m[1]&&m[1].length>10)return'https://lh3.googleusercontent.com/d/'+m[1];}
  return url;
}

// ─── AVATAR ──────────────────────────────────────────────────
function avatarInisial(nama,size=48){
  const colors=['#2D6CDF','#1A9E74','#D97706','#6C63FF','#0891B2','#EA580C'];
  const ini=(nama||'U').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  const col=colors[ini.charCodeAt(0)%colors.length];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size/2}" fill="${col}"/><text x="${size/2}" y="${size/2+4}" text-anchor="middle" font-size="${size*0.38}" font-family="sans-serif" fill="white" font-weight="700">${ini}</text></svg>`;
  return 'data:image/svg+xml;base64,'+btoa(svg);
}
function getPhotoSrc(url,nama,size=48){
  if(url&&url!==''&&url!=='null'&&(url.startsWith('data:')||url.startsWith('http')))return url;
  return avatarInisial(nama||'U',size);
}

// ─── UI ──────────────────────────────────────────────────────
function showToast(msg,type='success',duration=4000){
  const colors={success:'#1A9E74',error:'#E53E3E',warning:'#D97706',info:'#2D6CDF'};
  document.getElementById('toast-msg')?.remove();
  const t=document.createElement('div');t.id='toast-msg';
  t.style.cssText=`position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${colors[type]||colors.success};color:#fff;padding:12px 22px;border-radius:30px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.18);max-width:88vw;text-align:center;animation:fadeInScale .2s ease;word-break:break-word`;
  t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t?.remove(),duration);
}
function showModal(title,body,onConfirm,label='OK'){
  document.getElementById('modal-overlay')?.remove();
  const m=document.createElement('div');m.id='modal-overlay';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9100;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
  m.innerHTML=`<div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;animation:fadeInScale .2s ease"><h3 style="margin:0 0 12px;font-size:17px;font-weight:700">${title}</h3><div style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:20px">${body||''}</div><div style="display:flex;gap:10px"><button onclick="document.getElementById('modal-overlay').remove()" class="btn btn--ghost" style="flex:1">Batal</button>${onConfirm?`<button id="m-ok" class="btn btn--primary" style="flex:2"><div class="spinner-btn"></div><span class="btn-text">${label}</span></button>`:''}</div></div>`;
  document.body.appendChild(m);
  if(onConfirm){document.getElementById('m-ok').onclick=async()=>{const b=document.getElementById('m-ok');b.disabled=true;b.classList.add('loading');try{await onConfirm();document.getElementById('modal-overlay')?.remove();}catch(e){showToast(e.message,'error');b.disabled=false;b.classList.remove('loading');}};}
}
function skeletonCard(n=1){return Array(n).fill(0).map(()=>`<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:10px;border:1px solid #E2E8F0"><div style="height:14px;background:#F1F5F9;border-radius:6px;width:60%;margin-bottom:10px"></div><div style="height:11px;background:#F8FAFC;border-radius:6px;width:85%;margin-bottom:6px"></div><div style="height:11px;background:#F8FAFC;border-radius:6px;width:70%"></div></div>`).join('');}
function showLoading(id,msg='Memuat...'){const el=document.getElementById(id);if(el)el.innerHTML=`<div style="text-align:center;padding:40px;color:#94A3B8"><div style="width:36px;height:36px;border:3px solid #E2E8F0;border-top-color:#2D6CDF;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px"></div><div style="font-size:13px">${msg}</div></div>`;}
function showEmpty(id,msg='Tidak ada data'){const el=document.getElementById(id);if(el)el.innerHTML=`<div style="text-align:center;padding:40px;color:#94A3B8"><div style="font-size:36px;margin-bottom:8px">📭</div><div style="font-size:13px">${msg}</div></div>`;}
function showError(id,msg){const el=document.getElementById(id);if(el)el.innerHTML=`<div style="background:#FFF5F5;border:1px solid #FC8181;border-radius:10px;padding:16px;color:#C53030;font-size:13px;text-align:center">⚠️ ${msg}</div>`;}
function badgeStatus(status){
  const map={hadir:['#EBF8EE','#1A9E74','Hadir'],terlambat:['#FFFAF0','#D97706','Terlambat'],alfa:['#FFF5F5','#E53E3E','Alfa'],izin:['#EFF6FF','#2D6CDF','Izin'],sakit:['#F5F3FF','#6B7280','Sakit'],cuti:['#F3E8FF','#6C63FF','Cuti'],dinas_luar:['#FFF3E0','#EA580C','Dinas Luar'],pending:['#FFF8F0','#D97706','Pending'],disetujui:['#EBF8EE','#1A9E74','Disetujui'],ditolak:['#FFF5F5','#E53E3E','Ditolak'],aktif:['#EBF8EE','#1A9E74','Aktif'],SP1:['#FFFAF0','#D97706','SP1'],SP2:['#FFF3E0','#C05621','SP2'],SP3:['#FFF5F5','#C53030','SP3']};
  const[bg,color,label]=map[status]||['#F1F5F9','#64748B',status||'-'];
  return`<span style="background:${bg};color:${color};border:1px solid ${color}33;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">${label}</span>`;
}
function showConfetti(){for(let i=0;i<40;i++){const c=document.createElement('div');c.style.cssText=`position:fixed;top:-20px;left:${Math.random()*100}vw;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;background:${['#2D6CDF','#1A9E74','#D97706','#E53E3E','#6C63FF'][Math.floor(Math.random()*5)]};border-radius:${Math.random()>.5?'50%':'0'};pointer-events:none;z-index:99998;animation:confettiFall ${2+Math.random()*2}s ease ${Math.random()*2}s forwards`;document.body.appendChild(c);setTimeout(()=>c.remove(),5000);}}
function hitungJarak(lat1,lon1,lat2,lon2){const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function cekUlangTahunSaya(tgl,nama){if(!tgl)return null;const now=new Date();const p=String(tgl).split('/');if(p.length<2)return null;if(parseInt(p[0])===now.getDate()&&parseInt(p[1])-1===now.getMonth()){const umur=p[2]?now.getFullYear()-parseInt(p[2]):0;const tmpl=localStorage.getItem('ucapan_tmpl')||'🎂 Selamat Ulang Tahun ke-{umur}, {nama}! 🎉';return tmpl.replace('{umur}',umur).replace('{nama}',nama);}return null;}

// ─── KUNCI TOMBOL ABSEN (dipakai dashboard.js DAN absensi.js) ─
function _kunciTombolAbsen(masukSudah,keluarSudah){
  const bM=document.getElementById('btn-absen-masuk');
  const bK=document.getElementById('btn-absen-keluar');
  if(bM){bM.disabled=masukSudah;bM.classList.remove('loading');bM.style.opacity=masukSudah?'0.45':'1';bM.style.cursor=masukSudah?'not-allowed':'pointer';bM.title=masukSudah?'Sudah absen masuk hari ini':'';}
  if(bK){const lk=keluarSudah||!masukSudah;bK.disabled=lk;bK.classList.remove('loading');bK.style.opacity=lk?'0.45':'1';bK.style.cursor=lk?'not-allowed':'pointer';bK.title=keluarSudah?'Sudah absen keluar':!masukSudah?'Absen masuk dulu':'';}
}

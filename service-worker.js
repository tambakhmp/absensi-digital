// Update versi cache setiap deploy agar SW hapus cache lama
const CACHE = 'absensi-v8';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/ranking.css',
  '/css/mobile.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/utils.js',
  '/js/branding.js',
  '/js/ranking.js',
  '/js/dashboard.js',
  '/js/absensi.js',
  '/js/pengajuan.js',
  '/js/profil.js',
  '/js/laporan.js',
  '/js/admin_karyawan.js',
  '/js/admin_pages.js',
  '/js/cuti_khusus.js',
  '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // aktif langsung tanpa tunggu tab lama ditutup
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // ambil kontrol semua tab langsung
  );
});

self.addEventListener('fetch', e => {
  // API GAS — network only, jangan di-cache
  if (e.request.url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({success:false,error:'Tidak ada koneksi'}),
        {headers:{'Content-Type':'application/json'}})
    ));
    return;
  }
  // HTML — network first agar selalu dapat versi terbaru
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // JS/CSS — network first dengan fallback cache
  if (e.request.destination === 'script' || e.request.destination === 'style') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Aset lain — cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

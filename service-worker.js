const CACHE = 'absensi-v5';
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
  '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // API calls — network only
  if (e.request.url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({success:false,error:'Tidak ada koneksi internet'}),
        {headers:{'Content-Type':'application/json'}})
    ));
    return;
  }
  // Static assets — cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp && resp.status === 200 && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});

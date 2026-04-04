// ============================================================
// service-worker.js — PWA Cache Strategy
// ============================================================
const CACHE_NAME = 'absensi-v3.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/ranking.css',
  '/css/mobile.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/utils.js',
  '/js/dashboard.js',
  '/js/absensi.js',
  '/js/pengajuan.js',
  '/js/profil.js',
  '/js/ranking.js',
  '/js/branding.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/signature_pad/4.1.7/signature_pad.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_ASSETS.filter(a => !a.startsWith('https://fonts'))))
      .catch(err => console.warn('Cache install warning:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Jangan cache: GAS API, Google Drive, fonts
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('drive.google.com')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

const CACHE_NAME = 'memo-app-v2';

// 기본적으로 캐시할 중요한 파일들만 지정
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html'
];

// 설치 이벤트 - 기본 파일들만 캐시
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // 각 파일을 개별적으로 캐시해서 실패해도 다른 파일은 캐시되도록 함
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.log('Failed to cache:', url, err);
              return Promise.resolve(); // 실패해도 계속 진행
            });
          })
        );
      })
      .catch(err => {
        console.log('Cache open failed:', err);
      })
  );
  self.skipWaiting();
});

// 활성화 이벤트 - 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 네트워크 요청 처리 - 네트워크 우선, 실패시 캐시
self.addEventListener('fetch', (event) => {
  // POST 요청은 캐시하지 않음
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 응답이 성공적이면 캐시에 저장
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch(err => {
              console.log('Cache put failed:', err);
            });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패시 캐시에서 찾기
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // HTML 문서 요청이면 오프라인 페이지 반환
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
            // 그 외에는 기본 오프라인 응답
            return new Response('오프라인 상태입니다.', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

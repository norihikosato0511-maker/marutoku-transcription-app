// =========================
// キャッシュ設定
// =========================

const CACHE_NAME = "marutoku-transcription-v1";

// キャッシュ対象ファイル

const urlsToCache = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

// =========================
// インストール
// =========================

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                console.log(
                    "キャッシュ作成"
                );

                return cache.addAll(
                    urlsToCache
                );

            })

    );

    self.skipWaiting();

});

// =========================
// 有効化
// =========================

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(cacheNames => {

                return Promise.all(

                    cacheNames.map(cache => {

                        if (
                            cache !== CACHE_NAME
                        ) {

                            console.log(
                                "古いキャッシュ削除:",
                                cache
                            );

                            return caches.delete(
                                cache
                            );

                        }

                    })

                );

            })

    );

    self.clients.claim();

});

// =========================
// フェッチ
// =========================

self.addEventListener("fetch", event => {

    event.respondWith(

        caches.match(
            event.request
        )
        .then(response => {

            // キャッシュ優先

            if (response) {

                return response;

            }

            return fetch(
                event.request
            )
            .then(networkResponse => {

                // GETのみキャッシュ

                if (
                    event.request.method === "GET"
                ) {

                    const responseClone =
                        networkResponse.clone();

                    caches.open(
                        CACHE_NAME
                    )
                    .then(cache => {

                        cache.put(
                            event.request,
                            responseClone
                        );

                    });

                }

                return networkResponse;

            })
            .catch(() => {

                // オフライン時

                return caches.match(
                    "./index.html"
                );

            });

        })

    );

});
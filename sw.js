// ════════════════════════════════════════════════════════
// 囤囤鼠来哩 — Service Worker v10 (Firebase FCM版)
// ════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

var CACHE_NAME = 'tdr-v10';
var APP_URL    = 'https://muf07-source.github.io/game-tracker/index.html';

// ── Firebase 配置（和 index.html 保持一致）──
// 回到电脑后填入，和 index.html 里的 FIREBASE_CONFIG 完全一样
firebase.initializeApp({
  apiKey:            "AIzaSyDnNUPSE_fgstbSyVR_jF3VYmBWrPGQC5E",
  authDomain:        "game-tracker-3bf3c.firebaseapp.com",
  projectId:         "game-tracker-3bf3c",
  storageBucket:     "game-tracker-3bf3c.firebasestorage.app",
  messagingSenderId: "313949070131",
  appId:             "1:313949070131:web:ee81afb7b9f9b07524d446"
});

var messaging = firebase.messaging();

// ── Firebase 后台消息处理（关闭App时收到推送）──
messaging.onBackgroundMessage(function(payload){
  console.log('[SW] 后台收到FCM消息:', payload);
  var title   = (payload.notification && payload.notification.title) || '囤囤鼠来哩 🐭';
  var options = {
    body:    (payload.notification && payload.notification.body) || '点击查看',
    icon:    '/game-tracker/icon-192.png',
    badge:   '/game-tracker/icon-192.png',
    tag:     (payload.data && payload.data.tag) || 'tdr-push',
    renotify: true,
    vibrate: [200, 100, 200],
    data:    { url: (payload.data && payload.data.url) || APP_URL }
  };
  return self.registration.showNotification(title, options);
});

// ── 安装 & 激活 ──
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.add(APP_URL).catch(function(){});
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// ── fetch 离线回退 ──
self.addEventListener('fetch', function(e){
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).catch(function(){
        return caches.match(APP_URL);
      })
    );
  }
});

// ── 点击通知打开App ──
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || APP_URL;
  e.waitUntil(
    self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(cls){
      for(var i = 0; i < cls.length; i++){
        if(cls[i].url.indexOf('game-tracker') !== -1 && 'focus' in cls[i]){
          return cls[i].focus();
        }
      }
      if(self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

// ── 本地备用：每日打卡提醒检测 ──
var _notifCfg     = null;
var _lastNotifDay = '';

self.addEventListener('message', function(e){
  if(!e.data) return;
  if(e.data.type === 'SET_NOTIF') _notifCfg = e.data.cfg;
  if(e.data.type === 'PING') _checkDailyNotif();
});

setInterval(_checkDailyNotif, 60 * 1000);

function _checkDailyNotif(){
  try{
    var cfg = _notifCfg;
    if(!cfg || !cfg.enabled || !cfg.time) return;
    var now = new Date();
    var bj  = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000);
    var hm  = bj.getHours() + ':' + String(bj.getMinutes()).padStart(2, '0');
    var day = bj.toISOString().slice(0, 10);
    if(hm === cfg.time && _lastNotifDay !== day){
      _lastNotifDay = day;
      self.registration.showNotification('囤囤鼠来哩 🐭', {
        body:    cfg.msg || '今日还没打卡，快来记录资源吧！',
        icon:    '/game-tracker/icon-192.png',
        badge:   '/game-tracker/icon-192.png',
        tag:     'tdr-daily',
        data:    { url: APP_URL }
      });
    }
  }catch(err){ console.warn('[SW]', err); }
}

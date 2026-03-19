// 囤囤鼠来哩 — Service Worker v11（纯原生，无Firebase SDK）

var CACHE_NAME = 'tdr-v11';
var APP_URL    = 'https://muf07-source.github.io/game-tracker/index.html';

self.addEventListener('install', function(e){ self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(function(cache){ return cache.add(APP_URL).catch(function(){}); })); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){ if(e.request.mode === 'navigate'){ e.respondWith(fetch(e.request).catch(function(){ return caches.match(APP_URL); })); } });

self.addEventListener('push', function(e){
  var data = {};
  try{ data = e.data ? e.data.json() : {}; }catch(err){ data = { title:'囤囤鼠来哩 🐭', body: e.data ? e.data.text() : '有新消息' }; }
  e.waitUntil(self.registration.showNotification(data.title || '囤囤鼠来哩 🐭', {
    body: data.body || '点击查看', icon: '/game-tracker/icon-192.png', badge: '/game-tracker/icon-192.png',
    tag: data.tag || 'tdr-push', renotify: true, vibrate: [200, 100, 200], data: { url: data.url || APP_URL }
  }));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || APP_URL;
  e.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(cls){
    for(var i = 0; i < cls.length; i++){ if(cls[i].url.indexOf('game-tracker') !== -1 && 'focus' in cls[i]) return cls[i].focus(); }
    if(self.clients.openWindow) return self.clients.openWindow(target);
  }));
});

var _notifCfg = null; var _lastNotifDay = '';
self.addEventListener('message', function(e){ if(e.data && e.data.type === 'SET_NOTIF') _notifCfg = e.data.cfg; });
setInterval(function(){
  try{
    var cfg = _notifCfg; if(!cfg || !cfg.enabled || !cfg.time) return;
    var now = new Date(); var bj = new Date(now.getTime() + (8*60 - now.getTimezoneOffset())*60000);
    var hm = bj.getHours() + ':' + String(bj.getMinutes()).padStart(2,'0'); var day = bj.toISOString().slice(0,10);
    if(hm === cfg.time && _lastNotifDay !== day){ _lastNotifDay = day;
      self.registration.showNotification('囤囤鼠来哩 🐭', { body: cfg.msg || '今日还没打卡！', icon: '/game-tracker/icon-192.png', tag: 'tdr-daily', data: { url: APP_URL } }); }
  }catch(err){}
}, 60000);

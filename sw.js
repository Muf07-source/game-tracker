// ════════════════════════════════════════════════════════
// 囤囤鼠来哩 — Service Worker v9
// 功能：
//   ① 接收 Web Push（协作新消息 + 每日提醒，均由 Supabase 服务器推送）
//   ② PWA 离线壳（让 Chrome 允许安装到主屏幕）
//   ③ 打卡提醒本地备用检测（页面打开时兜底）
// ════════════════════════════════════════════════════════

var CACHE_NAME = 'tdr-v9';
var APP_URL    = 'https://muf07-source.github.io/game-tracker/index.html';

// ── 安装：缓存主页面壳 ──
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.add(APP_URL).catch(function(){});
    })
  );
});

// ── 激活：清理旧缓存 ──
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

// ── fetch：导航离线回退 ──
self.addEventListener('fetch', function(e){
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).catch(function(){
        return caches.match(APP_URL);
      })
    );
  }
});

// ════════════════════════════════════════════════════════
// ① Web Push 接收
//    由 Supabase Edge Function 通过 Google FCM 推送
//    Chrome 完全关闭、手机锁屏均可收到
// ════════════════════════════════════════════════════════
self.addEventListener('push', function(e){
  var data = {};
  try{
    data = e.data ? e.data.json() : {};
  }catch(err){
    data = { title:'囤囤鼠来哩 🐭', body: e.data ? e.data.text() : '有新消息' };
  }

  var title   = data.title || '囤囤鼠来哩 🐭';
  var options = {
    body:    data.body  || '点击查看',
    icon:    '/game-tracker/icon-192.png',
    badge:   '/game-tracker/icon-192.png',
    tag:     data.tag   || 'tdr-push',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data:    { url: data.url || APP_URL }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── 点击通知：打开 / 唤起 App ──
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

// ════════════════════════════════════════════════════════
// ② 本地备用：页面打开时的打卡提醒（页面关闭后不依赖此）
//    主要保障：页面已打开但还没关 → 仍然能收到提醒
// ════════════════════════════════════════════════════════
var _notifCfg    = null;
var _lastNotifDay = '';

self.addEventListener('message', function(e){
  if(!e.data) return;
  if(e.data.type === 'SET_NOTIF'){
    _notifCfg = e.data.cfg;
  }
  if(e.data.type === 'PING'){
    _checkDailyNotif();
  }
});

// 每分钟本地检测（仅作兜底，真正的推送走服务器）
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
        renotify: false,
        data:    { url: APP_URL }
      });
    }
  }catch(err){ console.warn('[SW]', err); }
}

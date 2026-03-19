// sw.js — 囤囤鼠来哩 Service Worker
// 作用：① 让安卓手机可以收到浏览器通知（安卓不允许主线程 new Notification()）
//       ② 未来可扩展为离线缓存

const CACHE_NAME = 'tdr-v1';

// 安装事件（可选：预缓存静态资源）
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// 通知点击事件：点击通知后打开/聚焦到 app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 如果 app 已经打开，直接聚焦
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      // 否则打开新标签页
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

/* eslint-disable no-undef */
// Service Worker dedicado ao Firebase Cloud Messaging (FCM)
// Permite receber alertas operacionais em background (ecrã desligado / PWA minimizada)

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAahe4vF050V1pbXHWZRY9fZJ8QHA8Lewg",
  authDomain: "padaria-da-vila.firebaseapp.com",
  projectId: "padaria-da-vila",
  storageBucket: "padaria-da-vila.firebasestorage.app",
  messagingSenderId: "987101597815",
  appId: "1:987101597815:web:5e81c4875884236153b672",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Mensagem recebida em segundo plano:', payload);

  const notificationTitle = payload.notification?.title || 'Novo Alerta Operacional';
  const notificationOptions = {
    body: payload.notification?.body || 'Existe uma nova atualização no sistema.',
    icon: '/logo-padaria.jpg',
    badge: '/logo-padaria.jpg',
    data: {
      route: payload.data?.targetRoute || payload.data?.route || '/gestao',
    },
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetRoute = event.notification.data?.route || '/gestao';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetRoute) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetRoute);
      }
    })
  );
});
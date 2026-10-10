self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    
    // Privacy constraint: payload should only contain minimal safe info (e.g. title, general msg, no sensitive PI)
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  
  const urlToOpen = event.notification.data.url
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

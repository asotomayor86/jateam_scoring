/* Service worker de JA Team: notificaciones push y badge del icono. */

const BADGE_DB = "jateam-badge";
const STORE = "kv";

function abrirIdb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(BADGE_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function getCount() {
  try {
    const db = await abrirIdb();
    return await new Promise((res) => {
      const t = db.transaction(STORE, "readonly").objectStore(STORE).get("count");
      t.onsuccess = () => res(t.result || 0);
      t.onerror = () => res(0);
    });
  } catch {
    return 0;
  }
}
async function setCount(n) {
  try {
    const db = await abrirIdb();
    await new Promise((res) => {
      const t = db.transaction(STORE, "readwrite").objectStore(STORE).put(n, "count");
      t.onsuccess = () => res();
      t.onerror = () => res();
    });
  } catch {
    /* ignora */
  }
}
async function pintarBadge(n) {
  try {
    if (self.navigator && self.navigator.setAppBadge) {
      if (n > 0) await self.navigator.setAppBadge(n);
      else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
    }
  } catch {
    /* no soportado */
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = {};
      }
      const title = data.title || "JA Team";
      const body = data.body || "";
      const url = data.url || "/";
      await self.registration.showNotification(title, {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: data.tag,
        data: { url },
      });
      const n = (await getCount()) + 1;
      await setCount(n);
      await pintarBadge(n);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of clientes) {
        if ("focus" in c) {
          if (c.navigate) {
            try {
              await c.navigate(url);
            } catch {
              /* ignora */
            }
          }
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});

// La página avisa al abrirse para poner el contador al día (o a cero).
self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "reset-badge") {
    event.waitUntil(
      (async () => {
        const total = d.total || 0;
        await setCount(total);
        await pintarBadge(total);
      })(),
    );
  }
});

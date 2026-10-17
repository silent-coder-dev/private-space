/**
 * Phone notifications while UsSpace is in the background (calls, messages, hearts, game invites).
 * They never show what a message says — only who it's from — so your lock screen stays private.
 * Shown by the service worker (public/sw.js), which caches nothing.
 */

const PREF = "usspace:notifications";

export const notificationsSupported = () =>
  typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && window.isSecureContext;

/** Notifications are on for this phone (allowed by the browser and switched on in Settings). */
export function notificationsOn(): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    return window.localStorage.getItem(PREF) !== "off";
  } catch {
    return true;
  }
}

export async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    /* not available here — the app works the same, just without notifications */
  }
}

/** Ask the browser for permission and switch notifications on. */
export async function turnOnNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  try {
    window.localStorage.setItem(PREF, permission === "granted" ? "on" : "off");
  } catch {
    /* storage blocked */
  }
  return permission;
}

export function turnOffNotifications() {
  try {
    window.localStorage.setItem(PREF, "off");
  } catch {
    /* storage blocked */
  }
}

interface NotifyOptions {
  /** Same tag = replaces the previous one (e.g. one "new messages" notification, not ten). */
  tag: string;
  /** Page to open when tapped. */
  url?: string;
  /** Keep it on screen until tapped (calls). */
  sticky?: boolean;
}

/** Show a notification — only when the app is NOT on screen (otherwise the in-app pop-ups are enough). */
export async function notify(title: string, body: string, { tag, url = "/dashboard", sticky = false }: NotifyOptions) {
  if (!notificationsOn() || document.visibilityState === "visible") return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.showNotification(title, {
      body,
      tag,
      data: { url },
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      requireInteraction: sticky,
      // Extra options some phones support (renotify: buzz again for the same tag; vibrate: Android).
      ...({ renotify: true, vibrate: sticky ? [400, 200, 400, 200, 400] : [200, 100, 200] } as object),
    });
  } catch {
    /* notifications not available right now */
  }
}

/** Remove notifications with this tag (e.g. the "calling…" one once the call is answered or over). */
export async function clearNotifications(tag: string) {
  if (!notificationsSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    for (const n of (await reg?.getNotifications({ tag })) ?? []) n.close();
  } catch {
    /* nothing to clear */
  }
}

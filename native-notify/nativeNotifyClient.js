/**
 * Native Notify — device registration.
 *
 * Added by Agent Notify (React Native (Expo)). This file is self-contained: it
 * registers this device's APNs / FCM token with the universal push service
 * so any framework can receive pushes.
 *
 * Pass your app id and app token from your app's own configuration (the setup
 * pull request writes them there) — never hardcode them in this file:
 *   NN_APP_ID     the Native Notify app id      (dashboard -> your app)
 *   NN_APP_TOKEN  the Native Notify app token   (dashboard -> your app)
 * In Expo: app.config.js -> extra.nnAppId / extra.nnAppToken, read with
 * Constants.expoConfig.extra (see the setup guide).
 *
 * TypeScript: the JSDoc types below are what a TypeScript project sees —
 * appId may be a number or a string, and values read from config/env
 * (string | undefined) are accepted; a missing value throws a clear error at
 * runtime instead.
 */

const REGISTER_URL = 'https://app.nativenotify.com/api/universal/device/register';
const DEREGISTER_URL = 'https://app.nativenotify.com/api/universal/device/deregister';

/**
 * @typedef {Object} NativeNotifyRegisterArgs
 * @property {string | number | null | undefined} appId Your Native Notify app id (from config).
 * @property {string | null | undefined} appToken Your Native Notify app token (from config).
 * @property {"ios" | "android"} platform
 * @property {string | null | undefined} [apnsToken] The APNs device token (iOS).
 * @property {string | null | undefined} [fcmToken] The FCM registration token (Android).
 * @property {string | null | undefined} [subscriberId] Your own user id, to target this person later.
 * @property {string | null | undefined} [deviceId] Your own stable id for this install (IDFV / ANDROID_ID). Default: derived from the push token, so it survives restarts.
 * @property {string | null | undefined} [appVersion]
 * @property {string | null | undefined} [timezone] IANA zone (default: the device's).
 */

/**
 * @typedef {Object} NativeNotifyDeregisterArgs
 * @property {string | number | null | undefined} appId
 * @property {string | null | undefined} appToken
 * @property {string | null | undefined} [deviceId] The id you registered with, if you passed your own.
 * @property {string | null | undefined} [apnsToken] The device's APNs token (to find its id after a restart).
 * @property {string | null | undefined} [fcmToken] The device's FCM token (to find its id after a restart).
 */

/** @type {string | null} */
let cachedDeviceKey = null;

/** @type {{ nnDeviceKey?: string }} */
const nnGlobal = /** @type {any} */ (globalThis);

/**
 * A small, stable, non-cryptographic fingerprint of a string (two 32-bit
 * passes → 16 hex characters). It only has to turn a push token into an id.
 * @param {string} text
 * @returns {string}
 */
function fingerprint(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519) ^ (h2 >>> 13);
  }
  // (slice, not a newer string helper: older React Native templates compile with lib es6)
  return ('00000000' + (h1 >>> 0).toString(16)).slice(-8) + ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
}

/**
 * A stable per-install id.
 *
 * Registration runs on every app launch and each NEW device id counts as a new
 * monthly active user, so the id must survive a restart: it is derived from
 * the device's own push token (stable across launches) — no storage package
 * needed. Without a token it falls back to a random id for this session only
 * (registerNativeNotifyDevice always passes the token it is registering). If
 * you already have a stable id (IDFV / ANDROID_ID), pass it as `deviceId`.
 * @param {string | null | undefined} [seed] The device's push token.
 * @returns {string}
 */
export function getStableDeviceKey(seed) {
  if (seed) {
    cachedDeviceKey = 'nn-' + fingerprint(String(seed));
    nnGlobal.nnDeviceKey = cachedDeviceKey;
    return cachedDeviceKey;
  }
  if (cachedDeviceKey) return cachedDeviceKey;
  cachedDeviceKey = nnGlobal.nnDeviceKey || null;
  if (!cachedDeviceKey) {
    cachedDeviceKey = `nn-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    nnGlobal.nnDeviceKey = cachedDeviceKey;
  }
  return cachedDeviceKey;
}

/**
 * Register (or refresh) this device with Native Notify.
 * @param {NativeNotifyRegisterArgs} args
 * @returns {Promise<any>} { ok, deviceId, tokens: {...}, ... }
 */
export async function registerNativeNotifyDevice(args) {
  if (!args || !args.appId || !args.appToken) {
    throw new Error('Native Notify: appId and appToken are required (read them from your config).');
  }
  /** @type {{ apnsToken?: string, fcmToken?: string }} */
  const tokens = {};
  if (args.apnsToken) tokens.apnsToken = args.apnsToken;
  if (args.fcmToken) tokens.fcmToken = args.fcmToken;
  const body = {
    appId: Number(args.appId),
    appToken: args.appToken,
    deviceId: args.deviceId || getStableDeviceKey(args.apnsToken || args.fcmToken),
    platform: args.platform,
    subscriberId: args.subscriberId || undefined,
    appVersion: args.appVersion || undefined,
    timezone: args.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    tokens,
  };

  const res = await fetch(REGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json && json.error && json.error.message) || `HTTP ${res.status}`;
    throw new Error(`Native Notify registration failed: ${message}`);
  }
  return json; // { ok, deviceId, tokens: {...}, ... }
}

/**
 * Unregister — call on logout (the device stops receiving pushes).
 * @param {NativeNotifyDeregisterArgs} args
 * @returns {Promise<any>}
 */
export async function deregisterNativeNotifyDevice(args) {
  const res = await fetch(DEREGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: Number(args.appId),
      appToken: args.appToken,
      deviceId: args.deviceId || getStableDeviceKey(args.apnsToken || args.fcmToken),
    }),
  });
  return res.json().catch(() => ({}));
}

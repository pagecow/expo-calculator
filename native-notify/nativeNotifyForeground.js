// Native Notify — shows pushes while the app is open (added by Agent Notify).
//
// expo-notifications shows a push while the app is closed or in the background, but not while it is open:
// it shows nothing until a notification handler is set, and on Android a push without a picture is an FCM
// *data* message that it never hands to the handler. Its own documented route for those is a task:
// expo-task-manager runs it for every push, in every app state. This one turns a data-only push into a
// local notification while the app is open (closed or in the background, expo-notifications shows the push
// itself, so the task does nothing then).
//
// Packages (run in your terminal):
//   npx expo install expo-notifications expo-task-manager
//
// Import it once at the top of your app's entry file (index.js / index.ts), before registerRootComponent —
// the task has to be defined before the app mounts:
//   import './native-notify/nativeNotifyForeground';

import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

const TASK = 'native-notify-foreground-push';

// Without a handler expo-notifications shows nothing while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

if (Platform.OS === 'android') {
  TaskManager.defineTask(TASK, async (/** @type {{ data: any }} */ { data }) => {
    // Tapping an action button runs the task too; only a received push matters here.
    if (!data || 'actionIdentifier' in data) return;
    // A push with a picture has a notification block: expo-notifications shows it through the handler, so skip it.
    if (data.notification) return;
    // Closed or in the background expo-notifications shows a data-only push itself; showing it here too would double it.
    if (AppState.currentState !== 'active') return;
    const payload = data.data || {};
    if (!payload.title) return;
    /** @type {Record<string, unknown>} */
    let pushData = {};
    try {
      pushData = JSON.parse(payload.dataString || '{}'); // your pushData
    } catch {
      pushData = {};
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: String(payload.title), body: payload.message ? String(payload.message) : undefined, data: pushData },
      trigger: null,
    });
  });
  Notifications.registerTaskAsync(TASK).catch(() => {});
}

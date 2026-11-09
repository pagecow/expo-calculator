import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { registerNativeNotifyDevice } from '../../native-notify/nativeNotifyClient';
// Sets the notification handler and task before the app mounts, so a push shows while the app is open.
import '../../native-notify/nativeNotifyForeground';

SplashScreen.preventAutoHideAsync();

/**
 * Ask for notification permission and register this device's APNs / FCM token
 * with Native Notify. The app id and token come from app.json -> extra.
 */
async function registerForPushNotifications() {
  const extra = Constants.expoConfig?.extra;
  const appId = extra?.nnAppId;
  const appToken = extra?.nnAppToken;
  if (!appId || !appToken) {
    console.warn('[native-notify] app id / token missing from the app config — registration skipped.');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== 'granted') {
    console.warn('[native-notify] notification permission was not granted.');
    return;
  }

  const token = await Notifications.getDevicePushTokenAsync();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  await registerNativeNotifyDevice({
    appId,
    appToken,
    platform,
    apnsToken: platform === 'ios' ? token.data : undefined,
    fcmToken: platform === 'android' ? token.data : undefined,
    appVersion: Constants.expoConfig?.version,
  });
  console.log('[native-notify] device registered for push notifications.');
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    registerForPushNotifications().catch((error) => {
      console.warn('[native-notify] registration failed', error);
    });
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      {/* One screen, no header: the calculator owns the whole viewport. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </ThemeProvider>
  );
}

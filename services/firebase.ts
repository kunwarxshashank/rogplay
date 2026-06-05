import { Platform } from 'react-native'
import analytics from '@react-native-firebase/analytics'
import crashlytics from '@react-native-firebase/crashlytics'
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging'

let initialized = false

export function initializeFirebase() {
  if (initialized) return
  initialized = true
  if (Platform.OS === 'web') return

  analytics().setAnalyticsCollectionEnabled(true)
  crashlytics().setCrashlyticsCollectionEnabled(true)
}

export function logEvent(name: string, params?: Record<string, any>) {
  if (Platform.OS === 'web') return
  analytics().logEvent(name, params)
}

export function setUserId(userId: string | null) {
  if (Platform.OS === 'web') return
  analytics().setUserId(userId)
  crashlytics().setUserId(userId || '')
}

export function setUserProperty(name: string, value: string) {
  if (Platform.OS === 'web') return
  analytics().setUserProperty(name, value)
}

export function recordError(error: Error, context?: Record<string, any>) {
  if (Platform.OS === 'web') return
  crashlytics().recordError(error)
  if (context) {
    Object.entries(context).forEach(([key, value]) => {
      crashlytics().setAttribute(key, String(value))
    })
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const authStatus = await messaging().requestPermission()
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  return enabled
}

export async function getFCMToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null
  return messaging().getToken()
}

export type FirebaseMessage = FirebaseMessagingTypes.RemoteMessage

export function onMessageReceived(handler: (message: FirebaseMessage) => void) {
  if (Platform.OS === 'web') return () => {}
  return messaging().onMessage(handler)
}

export function onTokenRefresh(handler: (token: string) => void) {
  if (Platform.OS === 'web') return () => {}
  return messaging().onTokenRefresh(handler)
}

export async function getInitialNotification() {
  if (Platform.OS === 'web') return null
  return messaging().getInitialNotification()
}

export function onNotificationOpenedApp(handler: (message: FirebaseMessage) => void) {
  if (Platform.OS === 'web') return () => {}
  return messaging().onNotificationOpenedApp(handler)
}

import { Platform } from 'react-native'
import {
  getAnalytics,
  setAnalyticsCollectionEnabled,
  logEvent as analyticsLogEvent,
  setUserId as setAnalyticsUserId,
  setUserProperty as setAnalyticsUserProperty,
} from '@react-native-firebase/analytics'
import {
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
  setUserId as setCrashlyticsUserId,
  recordError as recordCrashlyticsError,
  setAttribute,
} from '@react-native-firebase/crashlytics'
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging'

let initialized = false

let _analytics: ReturnType<typeof getAnalytics> | null = null
let _crashlytics: ReturnType<typeof getCrashlytics> | null = null

function getAnalyticsInstance() {
  if (!_analytics) _analytics = getAnalytics()
  return _analytics
}

function getCrashlyticsInstance() {
  if (!_crashlytics) _crashlytics = getCrashlytics()
  return _crashlytics
}

export function initializeFirebase() {
  if (initialized) return
  initialized = true
  if (Platform.OS === 'web') return

  setAnalyticsCollectionEnabled(getAnalyticsInstance(), true)
  setCrashlyticsCollectionEnabled(getCrashlyticsInstance(), true)
}

export function logEvent(name: string, params?: Record<string, any>) {
  if (Platform.OS === 'web') return
  analyticsLogEvent(getAnalyticsInstance(), name, params)
}

export function setUserId(userId: string | null) {
  if (Platform.OS === 'web') return
  setAnalyticsUserId(getAnalyticsInstance(), userId)
  setCrashlyticsUserId(getCrashlyticsInstance(), userId || '')
}

export function setUserProperty(name: string, value: string) {
  if (Platform.OS === 'web') return
  setAnalyticsUserProperty(getAnalyticsInstance(), name, value)
}

export function recordError(error: Error, context?: Record<string, any>) {
  if (Platform.OS === 'web') return
  const c = getCrashlyticsInstance()
  recordCrashlyticsError(c, error)
  if (context) {
    Object.entries(context).forEach(([key, value]) => {
      setAttribute(c, key, String(value))
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

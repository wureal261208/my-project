import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, initializeAuth, inMemoryPersistence, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const env = import.meta.env

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCQpdKQuFrUfcK-0dCGy6kQTwf2t43zsqU',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'bookproject-4b7a1.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'bookproject-4b7a1',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'bookproject-4b7a1.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '421452668349',
  appId: env.VITE_FIREBASE_APP_ID || '1:421452668349:web:9183e44f25ae5cc6b286d4',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-152LMCWSBR',
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

function createAuth() {
  try {
    return initializeAuth(app, { persistence: inMemoryPersistence })
  } catch {
    const existingAuth = getAuth(app)
    setPersistence(existingAuth, inMemoryPersistence).catch(() => {})
    return existingAuth
  }
}

export const auth = createAuth()
export const db = getFirestore(app)

isSupported().then((supported) => {
  if (supported) getAnalytics(app)
})

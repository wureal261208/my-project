import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCQpdKQuFrUfcK-0dCGy6kQTwf2t43zsqU",
  authDomain: "bookproject-4b7a1.firebaseapp.com",
  projectId: "bookproject-4b7a1",
  storageBucket: "bookproject-4b7a1.firebasestorage.app",
  messagingSenderId: "421452668349",
  appId: "1:421452668349:web:9183e44f25ae5cc6b286d4",
  measurementId: "G-152LMCWSBR"
};

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

isSupported().then((supported) => {
  if (supported) getAnalytics(app)
})

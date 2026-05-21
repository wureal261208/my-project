import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const globalDataDefaults = {
  localBooks: [],
  viewCounts: {},
  bookReaders: {},
  comments: {},
  staff: [],
  knownUsers: [],
}

export const userDataDefaults = {
  favorites: [],
  history: [],
  readingActivity: {},
  progress: {},
  checkpoints: {},
  notes: {},
  highlights: {},
  searchHistory: [],
  accountSettings: {},
  websiteTheme: 'paper',
  readerTheme: 'sepia',
  fontScale: 18,
}

const globalDataRef = doc(db, 'bookwormData', 'global')

function userDataRef(userId) {
  return doc(db, 'bookwormUsers', userId)
}

export function subscribeGlobalData(onData, onError) {
  return onSnapshot(
    globalDataRef,
    (snapshot) => onData({ ...globalDataDefaults, ...(snapshot.data() || {}) }),
    onError,
  )
}

export function subscribeUserData(userId, onData, onError) {
  return onSnapshot(
    userDataRef(userId),
    (snapshot) => onData({ ...userDataDefaults, ...(snapshot.data() || {}) }),
    onError,
  )
}

export function saveGlobalData(data) {
  return setDoc(globalDataRef, withTimestamp(cleanForFirestore(data)), { merge: true })
}

export function saveUserData(userId, data) {
  return setDoc(userDataRef(userId), withTimestamp(cleanForFirestore(data)), { merge: true })
}

export function stableStringify(value) {
  return JSON.stringify(sortKeys(value))
}

function withTimestamp(data) {
  return { ...data, updatedAt: new Date().toISOString() }
}

function cleanForFirestore(value) {
  if (Array.isArray(value)) {
    return value.map(cleanForFirestore).filter((item) => item !== undefined)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanForFirestore(item)])
        .filter(([, item]) => item !== undefined),
    )
  }

  return value === undefined ? undefined : value
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (!value || typeof value !== 'object') return value

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = sortKeys(value[key])
      return result
    }, {})
}

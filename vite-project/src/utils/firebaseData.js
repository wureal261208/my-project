import { arrayUnion, collection, deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const globalDataDefaults = {
  managedBooks: [],
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
  readerFontSize: 18,
}

const globalDataRef = doc(db, 'bookwormData', 'global')
const commentsCollectionRef = collection(db, 'bookwormComments')

function userDataRef(userId) {
  return doc(db, 'bookwormUsers', userId)
}

function bookCommentsRef(bookId) {
  return doc(db, 'bookwormComments', String(bookId))
}

export function subscribeGlobalData(onData, onError) {
  return onSnapshot(
    globalDataRef,
    (snapshot) => {
      const data = snapshot.data() || {}
      const hasManagedBooks = Array.isArray(data.managedBooks)
      const hasLegacyBooks = Object.hasOwn(data, 'localBooks')
      onData({
        ...globalDataDefaults,
        ...data,
        managedBooks: hasManagedBooks ? data.managedBooks : data.localBooks || [],
        needsManagedBooksCleanup: hasLegacyBooks,
      })
    },
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
  return setDoc(globalDataRef, withTimestamp({ ...cleanForFirestore(data), localBooks: deleteField() }), { merge: true })
}

export function subscribeComments(onData, onError) {
  return onSnapshot(
    commentsCollectionRef,
    (snapshot) => {
      const comments = {}

      snapshot.forEach((commentDoc) => {
        const items = commentDoc.data()?.items
        comments[commentDoc.id] = Array.isArray(items) ? items : []
      })

      onData(comments)
    },
    onError,
  )
}

export function saveBookComment(bookId, comment) {
  return setDoc(
    bookCommentsRef(bookId),
    withTimestamp({
      items: arrayUnion(cleanForFirestore(comment)),
    }),
    { merge: true },
  )
}

export function migrateLegacyComments(comments = {}) {
  const writes = Object.entries(comments)
    .filter(([, items]) => Array.isArray(items) && items.length)
    .map(([bookId, items]) => (
      setDoc(
        bookCommentsRef(bookId),
        withTimestamp({ items: arrayUnion(...items.map(cleanForFirestore)) }),
        { merge: true },
      )
    ))

  return Promise.all(writes)
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

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import AuthPage from './components/auth/AuthPage'
import AppShell from './components/layout/AppShell'
import {
  ADMIN_EMAIL,
  ADMIN_EMAILS,
  ADMIN_PASSWORD,
  API_URL,
  STORAGE_KEYS,
  fallbackBooks,
} from './data/bookData'
import { auth } from './firebase'
import { getAuthor, getCategory } from './utils/bookUtils'
import { readStorage, writeStorage } from './utils/storage'
import './App.css'

const AdminPage = lazy(() => import('./components/pages/AdminPage'))
const BookDetailPage = lazy(() => import('./components/pages/BookDetailPage'))
const DiscoverPage = lazy(() => import('./components/pages/DiscoverPage'))
const HomePage = lazy(() => import('./components/pages/HomePage'))
const ProfilePage = lazy(() => import('./components/pages/ProfilePage'))
const ReaderPage = lazy(() => import('./components/pages/ReaderPage'))

const emptyAuthForm = { name: '', email: '', password: '' }
const emptyAdminBook = { title: '', author: '', category: '', readerUrl: '', cover: '' }
const guestAccount = { id: 'guest', name: 'None Account', email: 'guest@bookworm.local', role: 'guest' }

function App() {
  const [account, setAccount] = useState(guestAccount)
  const [authError, setAuthError] = useState('')
  const [authErrorField, setAuthErrorField] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authReady, setAuthReady] = useState(false)
  const [toast, setToast] = useState(null)
  const [activePage, setActivePage] = useState('home')
  const [books, setBooks] = useState(fallbackBooks)
  const [booksLoading, setBooksLoading] = useState(false)
  const [booksNextUrl, setBooksNextUrl] = useState('')
  const [localBooks, setLocalBooks] = useState(() => readStorage(STORAGE_KEYS.library, []))
  const [favorites, setFavorites] = useState(() => readStorage(STORAGE_KEYS.favorites, []))
  const [history, setHistory] = useState(() => readStorage(STORAGE_KEYS.history, []))
  const [progress, setProgress] = useState(() => readStorage(STORAGE_KEYS.progress, {}))
  const [notes, setNotes] = useState(() => readStorage(STORAGE_KEYS.notes, {}))
  const [staff, setStaff] = useState(() => readStorage(STORAGE_KEYS.staff, []))
  const [selectedBook, setSelectedBook] = useState(null)
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('all')
  const [readerTheme, setReaderTheme] = useState('paper')
  const [fontScale, setFontScale] = useState(18)
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [adminBook, setAdminBook] = useState(emptyAdminBook)
  const [knownUsers, setKnownUsers] = useState(() => readStorage(STORAGE_KEYS.accounts, []))

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAccount(guestAccount)
        setAuthReady(true)
        return
      }

      const email = user.email?.toLowerCase() || ''
      const nextAccount = {
        id: user.uid,
        name: user.displayName || email.split('@')[0] || 'Reader',
        email,
        role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
      }

      setAccount(nextAccount)
      setKnownUsers((current) => upsertUser(current, nextAccount))
      setActivePage(nextAccount.role === 'admin' ? 'admin' : 'home')
      setAuthReady(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadBooks() {
      setBooksLoading(true)
      try {
        const response = await fetch(`${API_URL}/?languages=en&sort=popular`)
        if (!response.ok) throw new Error('Gutendex request failed')

        const data = await response.json()
        if (!ignore) {
          setBooks(data.results?.length ? data.results : fallbackBooks)
          setBooksNextUrl(data.next || '')
        }
      } catch {
        if (!ignore) setBooks(fallbackBooks)
      } finally {
        if (!ignore) setBooksLoading(false)
      }
    }

    loadBooks()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => writeStorage(STORAGE_KEYS.library, localBooks), [localBooks])
  useEffect(() => writeStorage(STORAGE_KEYS.favorites, favorites), [favorites])
  useEffect(() => writeStorage(STORAGE_KEYS.history, history), [history])
  useEffect(() => writeStorage(STORAGE_KEYS.progress, progress), [progress])
  useEffect(() => writeStorage(STORAGE_KEYS.notes, notes), [notes])
  useEffect(() => writeStorage(STORAGE_KEYS.staff, staff), [staff])
  useEffect(() => writeStorage(STORAGE_KEYS.accounts, knownUsers), [knownUsers])

  const allBooks = useMemo(() => [...localBooks, ...books], [books, localBooks])
  const topics = useMemo(() => ['all', ...new Set(allBooks.map(getCategory).slice(0, 12))], [allBooks])
  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return allBooks.filter((book) => {
      const matchesQuery =
        !normalizedQuery ||
        book.title.toLowerCase().includes(normalizedQuery) ||
        getAuthor(book).toLowerCase().includes(normalizedQuery)
      const matchesTopic = topic === 'all' || getCategory(book) === topic

      return matchesQuery && matchesTopic
    })
  }, [allBooks, query, topic])

  async function handleAuth(event) {
    event.preventDefault()
    setAuthError('')
    setAuthErrorField('')
    setAuthLoading(true)

    const email = authForm.email.trim().toLowerCase()
    const password = authForm.password
    if (!email || !password) {
      setAuthError('Please enter your email and password.')
      setAuthErrorField(!email ? 'email' : 'password')
      setAuthLoading(false)
      return
    }

    try {
      if (authMode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        const displayName = authForm.name.trim() || email.split('@')[0]
        await updateProfile(credential.user, { displayName })
        setAuthForm(emptyAuthForm)
        setToast({ type: 'success', message: 'Account created successfully.' })
        return
      }

      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (error) {
        const isAdminSeed = email === ADMIN_EMAIL && password === ADMIN_PASSWORD
        if (!isAdminSeed || error.code !== 'auth/invalid-credential') throw error
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(credential.user, { displayName: 'BookWorm Admin' })
      }

      setAuthForm(emptyAuthForm)
      setToast({ type: 'success', message: 'Login successful. Welcome back.' })
    } catch (error) {
      const nextError = getAuthMessage(error.code)
      setAuthError(nextError.message)
      setAuthErrorField(nextError.field)
    } finally {
      setAuthLoading(false)
    }
  }

  function updateAuthMode(nextMode) {
    setAuthMode(nextMode)
    setAuthError('')
    setAuthErrorField('')
  }

  async function loadMoreBooks() {
    if (!booksNextUrl || booksLoading) return

    setBooksLoading(true)
    try {
      const response = await fetch(booksNextUrl)
      if (!response.ok) throw new Error('Gutendex request failed')

      const data = await response.json()
      setBooks((current) => [...current, ...(data.results || [])])
      setBooksNextUrl(data.next || '')
    } catch {
      setToast({ type: 'error', message: 'Could not load more books from Gutendex.' })
    } finally {
      setBooksLoading(false)
    }
  }

  async function handleLogout() {
    await signOut(auth)
    setAccount(guestAccount)
    setActivePage('home')
    setSelectedBook(null)
  }

  function goGuest() {
    setAccount(guestAccount)
    setActivePage('home')
  }

  function goAuth() {
    setAuthMode('login')
    setActivePage('auth')
  }

  function openDetail(book) {
    setSelectedBook(book)
    setActivePage('detail')
  }

  function openBook(book) {
    setSelectedBook(book)
    setActivePage('reader')
    setHistory((current) => [book.id, ...current.filter((id) => id !== book.id)].slice(0, 20))
    setProgress((current) => ({ ...current, [book.id]: Math.max(current[book.id] || 0, 12) }))
  }

  function toggleFavorite(bookId) {
    if (account.role === 'guest') {
      setToast({ type: 'error', message: 'Login to save books to your shelf.' })
      setActivePage('auth')
      return
    }

    setFavorites((current) =>
      current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId],
    )
  }

  function addLocalBook(event) {
    event.preventDefault()
    if (!adminBook.title.trim()) return

    const nextBook = {
      ...adminBook,
      id: `local-${Date.now()}`,
      title: adminBook.title.trim(),
      author: adminBook.author.trim() || 'BookWorm editor',
      category: adminBook.category.trim() || 'Admin pick',
      download_count: 0,
      formats: {
        'image/jpeg': adminBook.cover.trim(),
        'text/html': adminBook.readerUrl.trim(),
      },
    }

    setLocalBooks((current) => [nextBook, ...current])
    setAdminBook(emptyAdminBook)
    setToast({ type: 'success', message: 'Book pushed to the local catalog.' })
  }

  function jumpPage(page, nextTopic) {
    if (nextTopic) setTopic(nextTopic)
    setActivePage(page)
  }

  if (!authReady) return <main className="loading-page">Checking your Firebase session...</main>

  if (activePage === 'auth') {
    return (
      <>
        <AuthPage
          authForm={authForm}
          authError={authError}
          authErrorField={authErrorField}
          authLoading={authLoading}
          authMode={authMode}
          handleAuth={handleAuth}
          onGuest={goGuest}
          setAuthForm={setAuthForm}
          setAuthMode={updateAuthMode}
        />
        {toast && <AppToast message={toast.message} onClose={() => setToast(null)} type={toast.type} />}
      </>
    )
  }

  const pages = {
    home: (
      <HomePage
        books={allBooks}
        favorites={favorites}
        onDetail={openDetail}
        onFavorite={toggleFavorite}
        onRead={openBook}
        setPage={jumpPage}
        topics={topics}
      />
    ),
    discover: (
      <DiscoverPage
        books={filteredBooks}
        booksLoading={booksLoading}
        canLoadMore={Boolean(booksNextUrl)}
        favorites={favorites}
        onLoadMore={loadMoreBooks}
        onDetail={openDetail}
        onFavorite={toggleFavorite}
        onRead={openBook}
        query={query}
        setQuery={setQuery}
        setTopic={setTopic}
        topic={topic}
        topics={topics}
      />
    ),
    detail: (
      <BookDetailPage
        book={selectedBook}
        favorites={favorites}
        onBack={() => setActivePage('discover')}
        onFavorite={toggleFavorite}
        onRead={openBook}
      />
    ),
    reader: (
      <ReaderPage
        book={selectedBook}
        favorites={favorites}
        fontScale={fontScale}
        notes={notes}
        onBack={() => setActivePage('detail')}
        onFavorite={toggleFavorite}
        progress={progress}
        readerTheme={readerTheme}
        setFontScale={setFontScale}
        setNotes={setNotes}
        setProgress={setProgress}
        setReaderTheme={setReaderTheme}
      />
    ),
    profile: account.role === 'guest' ? (
      <HomePage
        books={allBooks}
        favorites={favorites}
        onDetail={openDetail}
        onFavorite={toggleFavorite}
        onRead={openBook}
        setPage={jumpPage}
        topics={topics}
      />
    ) : (
      <ProfilePage
        account={account}
        books={allBooks}
        favorites={favorites}
        history={history}
        onRead={openBook}
        progress={progress}
      />
    ),
    admin: account.role === 'admin' ? (
      <AdminPage
        addLocalBook={addLocalBook}
        adminBook={adminBook}
        books={allBooks}
        localBooks={localBooks}
        removeLocalBook={(id) => setLocalBooks((current) => current.filter((book) => book.id !== id))}
        setAdminBook={setAdminBook}
        setStaff={setStaff}
        staff={staff}
        users={knownUsers}
      />
    ) : null,
  }

  return (
    <AppShell
      account={account}
      activePage={activePage}
      onAuth={goAuth}
      onGuest={goGuest}
      onLogout={handleLogout}
      setActivePage={setActivePage}
    >
      <Suspense fallback={<PageFallback />}>{pages[activePage] || pages.home}</Suspense>
      {toast && <AppToast message={toast.message} onClose={() => setToast(null)} type={toast.type} />}
    </AppShell>
  )
}

function upsertUser(users, user) {
  const stored = { email: user.email, name: user.name, role: user.role }
  return [stored, ...users.filter((item) => item.email !== user.email)]
}

function getAuthMessage(code) {
  const messages = {
    'auth/configuration-not-found': {
      field: 'email',
      message: 'Firebase Auth is not enabled. Turn on Email/Password in Firebase Console.',
    },
    'auth/email-already-in-use': { field: 'email', message: 'This email already has an account. Try logging in instead.' },
    'auth/invalid-credential': { field: 'password', message: 'Email or password is incorrect.' },
    'auth/invalid-email': { field: 'email', message: 'Please enter a valid email address.' },
    'auth/network-request-failed': { field: 'email', message: 'Network error. Please check your connection and try again.' },
    'auth/too-many-requests': { field: 'password', message: 'Too many attempts. Please wait a moment and try again.' },
    'auth/weak-password': { field: 'password', message: 'Password must be at least 6 characters.' },
  }

  return messages[code] || { field: 'password', message: 'Authentication failed. Please try again.' }
}

function PageFallback() {
  return (
    <div className="page-fallback">
      <i className="bi bi-book" />
      <span>Loading page...</span>
    </div>
  )
}

function AppToast({ message, onClose, type }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200)
    return () => window.clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`app-toast ${type}`} role="status">
      <span>
        <i className={`bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}`} />
      </span>
      <p>{message}</p>
      <button aria-label="Close notification" onClick={onClose} type="button">
        <i className="bi bi-x-lg" />
      </button>
    </div>
  )
}

export default App

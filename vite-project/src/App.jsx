import { useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import AdminPage from './components/AdminPage/AdminPage'
import AuthPage from './components/AuthPage'
import LibraryPage from './components/UserPage/LibraryPage'
import ReaderPage from './components/UserPage/ReaderPage'
import ShelfPage from './components/UserPage/ShelfPage'
import Sidebar from './components/Sidebar'
import Topline from './components/Topline'
import { ADMIN_EMAILS, API_URL, STORAGE_KEYS, fallbackBooks } from './data/bookData'
import { auth } from './firebase'
import { getAuthor, getCategory } from './utils/bookUtils'
import { readStorage, writeStorage } from './utils/storage'
import './App.css'

const emptyAuthForm = { name: '', email: '', password: '' }
const emptyAdminBook = { title: '', author: '', category: '', readerUrl: '', cover: '' }

function App() {
  const [account, setAccount] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authReady, setAuthReady] = useState(false)
  const [activePage, setActivePage] = useState('library')
  const [books, setBooks] = useState(fallbackBooks)
  const [localBooks, setLocalBooks] = useState(() => readStorage(STORAGE_KEYS.library, []))
  const [favorites, setFavorites] = useState(() => readStorage(STORAGE_KEYS.favorites, []))
  const [progress, setProgress] = useState(() => readStorage(STORAGE_KEYS.progress, {}))
  const [notes, setNotes] = useState(() => readStorage(STORAGE_KEYS.notes, {}))
  const [selectedBook, setSelectedBook] = useState(null)
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('all')
  const [status, setStatus] = useState('Loading books from Gutendex...')
  const [readerTheme, setReaderTheme] = useState('paper')
  const [fontScale, setFontScale] = useState(18)
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [adminBook, setAdminBook] = useState(emptyAdminBook)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAccount(null)
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
      setActivePage(nextAccount.role === 'admin' ? 'admin' : 'library')
      setAuthReady(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadBooks() {
      try {
        const response = await fetch(`${API_URL}/?languages=en&sort=popular`)
        if (!response.ok) throw new Error('Gutendex request failed')

        const data = await response.json()
        if (!ignore) {
          setBooks(data.results?.length ? data.results : fallbackBooks)
          setStatus('Live Gutendex catalog loaded')
        }
      } catch {
        if (!ignore) setStatus('Showing sample books while Gutendex is unavailable')
      }
    }

    loadBooks()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => writeStorage(STORAGE_KEYS.library, localBooks), [localBooks])
  useEffect(() => writeStorage(STORAGE_KEYS.favorites, favorites), [favorites])
  useEffect(() => writeStorage(STORAGE_KEYS.progress, progress), [progress])
  useEffect(() => writeStorage(STORAGE_KEYS.notes, notes), [notes])

  const allBooks = useMemo(() => [...localBooks, ...books], [books, localBooks])
  const topics = useMemo(() => ['all', ...new Set(allBooks.map(getCategory).slice(0, 10))], [allBooks])
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
    const email = authForm.email.trim().toLowerCase()
    const password = authForm.password
    if (!email || !password) return

    try {
      if (authMode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        const displayName = authForm.name.trim() || email.split('@')[0]
        await updateProfile(credential.user, { displayName })
        setAuthForm(emptyAuthForm)
        return
      }

      await signInWithEmailAndPassword(auth, email, password)
      setAuthForm(emptyAuthForm)
    } catch (error) {
      setAuthError(getAuthMessage(error.code))
    }
  }

  async function handleLogout() {
    await signOut(auth)
    setSelectedBook(null)
    setActivePage('library')
  }

  function openBook(book) {
    setSelectedBook(book)
    setActivePage('reader')
    setProgress((current) => ({ ...current, [book.id]: Math.max(current[book.id] || 0, 12) }))
  }

  function toggleFavorite(bookId) {
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
  }

  if (!authReady) {
    return <main className="auth-page loading-page">Checking your Firebase session...</main>
  }

  if (!account) {
    return (
      <AuthPage
        authForm={authForm}
        authError={authError}
        authMode={authMode}
        handleAuth={handleAuth}
        setAuthForm={setAuthForm}
        setAuthMode={setAuthMode}
      />
    )
  }

  return (
    <div className="site-shell">
      <Sidebar
        account={account}
        activePage={activePage}
        onLogout={handleLogout}
        setActivePage={setActivePage}
      />

      <main className="workspace">
        <Topline account={account} activePage={activePage} status={status} />

        {activePage === 'library' && (
          <LibraryPage
            books={filteredBooks}
            favorites={favorites}
            onFavorite={toggleFavorite}
            onRead={openBook}
            query={query}
            setQuery={setQuery}
            setTopic={setTopic}
            topic={topic}
            topics={topics}
          />
        )}

        {activePage === 'shelf' && (
          <ShelfPage
            books={allBooks.filter((book) => favorites.includes(book.id))}
            notes={notes}
            onFavorite={toggleFavorite}
            onRead={openBook}
            progress={progress}
          />
        )}

        {activePage === 'reader' && selectedBook && (
          <ReaderPage
            book={selectedBook}
            fontScale={fontScale}
            notes={notes}
            progress={progress}
            readerTheme={readerTheme}
            setFontScale={setFontScale}
            setNotes={setNotes}
            setProgress={setProgress}
            setReaderTheme={setReaderTheme}
          />
        )}

        {activePage === 'admin' && account.role === 'admin' && (
          <AdminPage
            addLocalBook={addLocalBook}
            adminBook={adminBook}
            books={allBooks}
            localBooks={localBooks}
            removeLocalBook={(id) => setLocalBooks((current) => current.filter((book) => book.id !== id))}
            setAdminBook={setAdminBook}
          />
        )}
      </main>
    </div>
  )
}

function getAuthMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'This email already has an account. Try logging in instead.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
  }

  return messages[code] || 'Authentication failed. Please try again.'
}

export default App

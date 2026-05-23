import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
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
  STAFF_DEFAULT_PASSWORD,
  fallbackBooks,
} from './data/bookData'
import { NavigationProvider } from './context/NavigationContext'
import { auth } from './firebase'
import { getAuthor, getCategory, getReaderUrl } from './utils/bookUtils'
import {
  globalDataDefaults,
  saveBookComment,
  saveGlobalData,
  saveUserData,
  stableStringify,
  subscribeGlobalData,
  subscribeUserData,
  userDataDefaults,
} from './utils/firebaseData'
import logo from './assets/logo.jpg'
import './App.css'

const AdminPage = lazy(() => import('./components/pages/AdminPage'))
const BookDetailPage = lazy(() => import('./components/pages/BookDetailPage'))
const DiscoverPage = lazy(() => import('./components/pages/DiscoverPage'))
const HomePage = lazy(() => import('./components/pages/HomePage'))
const ProfilePage = lazy(() => import('./components/pages/ProfilePage'))
const ReaderPage = lazy(() => import('./components/pages/ReaderPage'))

const emptyAuthForm = { name: '', email: '', password: '' }
const emptyAdminBook = {
  title: '',
  author: '',
  category: '',
  description: '',
  subjects: '',
  language: 'en',
  status: 'draft',
  readerUrl: '',
  cover: '',
  pageCount: '',
  chapterCount: '',
  chapterTitles: '',
  readerText: '',
  chapterText: '',
  chaptersDraft: [{ title: 'Chapter 1', pages: '10', content: '' }],
}
const guestAccount = { id: 'guest', name: 'None Account', email: 'guest@bookworm.local', role: 'guest' }
const SEARCH_HISTORY_LIMIT = 8
const PAGE_PATHS = {
  home: '/',
  discover: '/discover',
  detail: '/book',
  reader: '/reader',
  profile: '/profile',
  admin: '/admin',
  auth: '/auth',
}
const PATH_PAGES = Object.fromEntries(Object.entries(PAGE_PATHS).map(([page, path]) => [path, page]))
const pageInitialState = {
  activePage: getPageFromPath(typeof window === 'undefined' ? '/' : window.location.pathname),
  isPageLoading: false,
}

function pageReducer(state, action) {
  if (action.type === 'start') return { ...state, isPageLoading: true }
  if (action.type === 'finish') return { activePage: action.page, isPageLoading: false }
  if (action.type === 'instant') return { activePage: action.page, isPageLoading: false }
  return state
}

function App() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const [account, setAccount] = useState(guestAccount)
  const [authError, setAuthError] = useState('')
  const [authErrorField, setAuthErrorField] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authReady, setAuthReady] = useState(false)
  const [toast, setToast] = useState(null)
  const [pageState, dispatchPage] = useReducer(pageReducer, pageInitialState)
  const routeTimerRef = useRef(null)
  const [books, setBooks] = useState(fallbackBooks)
  const [, setBooksLoading] = useState(false)
  const [managedBooks, setManagedBooks] = useState(globalDataDefaults.managedBooks)
  const [favorites, setFavorites] = useState(userDataDefaults.favorites)
  const [history, setHistory] = useState(userDataDefaults.history)
  const [readingActivity, setReadingActivity] = useState(userDataDefaults.readingActivity)
  const [viewCounts, setViewCounts] = useState(globalDataDefaults.viewCounts)
  const [bookReaders, setBookReaders] = useState(globalDataDefaults.bookReaders)
  const [progress, setProgress] = useState(userDataDefaults.progress)
  const [checkpoints, setCheckpoints] = useState(userDataDefaults.checkpoints)
  const [notes, setNotes] = useState(userDataDefaults.notes)
  const [highlights, setHighlights] = useState(userDataDefaults.highlights)
  const [comments, setComments] = useState(globalDataDefaults.comments)
  const [searchHistory, setSearchHistory] = useState(userDataDefaults.searchHistory)
  const [staff, setStaff] = useState(globalDataDefaults.staff)
  const [accountSettings, setAccountSettings] = useState(userDataDefaults.accountSettings)
  const [selectedBook, setSelectedBook] = useState(null)
  const [readerStartPage, setReaderStartPage] = useState(null)
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('all')
  const [readerTheme, setReaderTheme] = useState(userDataDefaults.readerTheme)
  const [websiteTheme, setWebsiteTheme] = useState(userDataDefaults.websiteTheme)
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [adminBook, setAdminBook] = useState(emptyAdminBook)
  const [knownUsers, setKnownUsers] = useState(globalDataDefaults.knownUsers)
  const [globalDataReady, setGlobalDataReady] = useState(false)
  const [userDataReady, setUserDataReady] = useState(false)
  const accountSettingsRef = useRef(accountSettings)
  const globalDataSnapshotRef = useRef('')
  const userDataSnapshotRef = useRef('')
  const pendingFavoriteUpdatesRef = useRef([])
  const syncErrorRef = useRef('')
  const activePage = pageState.activePage

  const staffEmails = useMemo(() => staff.map((item) => item.email.toLowerCase()), [staff])
  const getAccountRole = useCallback(
    (email) => (ADMIN_EMAILS.includes(email) || staffEmails.includes(email) ? 'admin' : 'user'),
    [staffEmails],
  )

  const navigateTo = useCallback((page, options = {}) => {
    const nextPage = PAGE_PATHS[page] ? page : 'home'
    const nextPath = PAGE_PATHS[nextPage]
    window.clearTimeout(routeTimerRef.current)

    const openRoute = () => {
      if (window.location.pathname !== nextPath) {
        routerNavigate(nextPath, { replace: Boolean(options.replace) })
      }
    }

    if (options.instant) {
      dispatchPage({ type: 'instant', page: nextPage })
      openRoute()
      return
    }

    dispatchPage({ type: 'start' })
    routeTimerRef.current = window.setTimeout(() => {
      openRoute()
      dispatchPage({ type: 'finish', page: nextPage })
    }, 420)
  }, [routerNavigate])

  const handleDataSyncError = useCallback((error) => {
    const message =
      error?.code === 'permission-denied'
        ? 'Firebase Firestore denied this data sync. Check Firestore rules for BookWorm.'
        : 'Could not sync BookWorm data to Firebase. Please check the Firestore setup.'

    if (syncErrorRef.current === message) return
    syncErrorRef.current = message
    setToast({ type: 'error', message })
  }, [])

  const userData = useMemo(
    () => ({
      favorites,
      history,
      readingActivity,
      progress,
      checkpoints,
      notes,
      highlights,
      searchHistory,
      accountSettings,
      websiteTheme,
      readerTheme,
    }),
    [
      accountSettings,
      checkpoints,
      favorites,
      highlights,
      history,
      notes,
      progress,
      readerTheme,
      readingActivity,
      searchHistory,
      websiteTheme,
    ],
  )

  useEffect(() => {
    return () => window.clearTimeout(routeTimerRef.current)
  }, [])

  useEffect(() => {
    const nextPage = getPageFromPath(location.pathname)
    if (nextPage === activePage) return

    window.clearTimeout(routeTimerRef.current)
    dispatchPage({ type: 'instant', page: nextPage })
  }, [activePage, location.pathname])

  useEffect(() => {
    accountSettingsRef.current = accountSettings
  }, [accountSettings])

  useEffect(() => {
    return subscribeGlobalData(
      (data) => {
        const nextData = {
          managedBooks: data.managedBooks || [],
          viewCounts: data.viewCounts || {},
          bookReaders: data.bookReaders || {},
          comments: data.comments || {},
          staff: data.staff || [],
          knownUsers: data.knownUsers || [],
        }

        globalDataSnapshotRef.current = data.needsManagedBooksCleanup ? '' : stableStringify(nextData)
        setManagedBooks(nextData.managedBooks)
        setViewCounts(nextData.viewCounts)
        setBookReaders(nextData.bookReaders)
        setComments(nextData.comments)
        setStaff(nextData.staff)
        setKnownUsers(nextData.knownUsers)
        setGlobalDataReady(true)
      },
      (error) => {
        setGlobalDataReady(true)
        handleDataSyncError(error)
      },
    )
  }, [handleDataSyncError])

  useEffect(() => {
    if (account.role === 'guest') {
      let isCurrent = true
      queueMicrotask(() => {
        if (!isCurrent) return
        setFavorites(userDataDefaults.favorites)
        setHistory(userDataDefaults.history)
        setReadingActivity(userDataDefaults.readingActivity)
        setProgress(userDataDefaults.progress)
        setCheckpoints(userDataDefaults.checkpoints)
        setNotes(userDataDefaults.notes)
        setHighlights(userDataDefaults.highlights)
        setSearchHistory(userDataDefaults.searchHistory)
        setAccountSettings(userDataDefaults.accountSettings)
        setWebsiteTheme(userDataDefaults.websiteTheme)
        setReaderTheme(userDataDefaults.readerTheme)
        setUserDataReady(false)
        userDataSnapshotRef.current = ''
      })
      return () => {
        isCurrent = false
      }
    }

    queueMicrotask(() => {
      setUserDataReady(false)
    })

    return subscribeUserData(
      account.id,
      (data) => {
        const savedData = {
          favorites: data.favorites || [],
          history: data.history || [],
          readingActivity: data.readingActivity || {},
          progress: data.progress || {},
          checkpoints: data.checkpoints || {},
          notes: data.notes || {},
          highlights: data.highlights || {},
          searchHistory: data.searchHistory || [],
          accountSettings: data.accountSettings || {},
          websiteTheme: data.websiteTheme || userDataDefaults.websiteTheme,
          readerTheme: data.readerTheme || userDataDefaults.readerTheme,
        }
        const pendingFavoriteUpdates = pendingFavoriteUpdatesRef.current
        const nextData = {
          ...savedData,
          favorites: applyFavoriteUpdates(savedData.favorites, pendingFavoriteUpdates),
        }

        userDataSnapshotRef.current = stableStringify(savedData)
        pendingFavoriteUpdatesRef.current = []
        setFavorites(nextData.favorites)
        setHistory(nextData.history)
        setReadingActivity(nextData.readingActivity)
        setProgress(nextData.progress)
        setCheckpoints(nextData.checkpoints)
        setNotes(nextData.notes)
        setHighlights(nextData.highlights)
        setSearchHistory(nextData.searchHistory)
        setAccountSettings(nextData.accountSettings)
        setWebsiteTheme(nextData.websiteTheme)
        setReaderTheme(nextData.readerTheme)
        setUserDataReady(true)
      },
      (error) => {
        setUserDataReady(true)
        handleDataSyncError(error)
      },
    )
  }, [account.id, account.role, handleDataSyncError])

  useEffect(() => {
    if (account.role === 'guest' || !userDataReady) return

    const savedSettings = accountSettings[account.id] || accountSettings[account.email] || {}
    const nextName = savedSettings.displayName || account.name
    const nextAvatar = savedSettings.avatar || account.avatar || ''
    const shouldUpdateName = nextName && nextName !== account.name
    const shouldUpdateAvatar = nextAvatar !== (account.avatar || '')

    if (shouldUpdateName || shouldUpdateAvatar) {
      queueMicrotask(() => {
        setAccount((current) => ({ ...current, name: nextName, avatar: nextAvatar }))
      })
    }
  }, [account.avatar, account.email, account.id, account.name, account.role, accountSettings, userDataReady])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const currentRoute = getPageFromPath(window.location.pathname)

      if (!user) {
        setAccount(guestAccount)
        if (currentRoute === 'profile' || currentRoute === 'admin') {
          navigateTo('home', { instant: true, replace: true })
        }
        setAuthReady(true)
        return
      }

      const email = user.email?.toLowerCase() || ''
      const savedSettings = accountSettingsRef.current[user.uid] || accountSettingsRef.current[email] || {}
      if (savedSettings.websiteTheme) setWebsiteTheme(savedSettings.websiteTheme)
      const nextAccount = {
        id: user.uid,
        name: savedSettings.displayName || user.displayName || email.split('@')[0] || 'Reader',
        email,
        avatar: savedSettings.avatar || user.photoURL || '',
        role: getAccountRole(email),
      }

      setAccount(nextAccount)
      setKnownUsers((current) => upsertUser(current, nextAccount))
      if (currentRoute === 'auth') {
        navigateTo(nextAccount.role === 'admin' ? 'admin' : 'home', { instant: true, replace: true })
      } else if (currentRoute === 'admin' && nextAccount.role !== 'admin') {
        navigateTo('home', { instant: true, replace: true })
      }
      setAuthReady(true)
    })

    return unsubscribe
  }, [getAccountRole, navigateTo])

  useEffect(() => {
    if (account.role === 'guest' || !account.email) return

    const nextRole = getAccountRole(account.email)
    if (nextRole === account.role) return

    let isCurrent = true
    queueMicrotask(() => {
      if (!isCurrent) return
      setAccount((current) => ({ ...current, role: nextRole }))
    })

    return () => {
      isCurrent = false
    }
  }, [account.email, account.role, getAccountRole])

  useEffect(() => {
    if (!globalDataReady || account.role === 'guest') return
    queueMicrotask(() => {
      setKnownUsers((current) => upsertUser(current, account))
    })
  }, [account, globalDataReady])

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

  useEffect(() => {
    if (!globalDataReady) return

    const nextGlobalData = {
      managedBooks,
      viewCounts,
      bookReaders,
      staff,
      knownUsers,
    }
    const nextSnapshot = stableStringify(nextGlobalData)
    if (nextSnapshot === globalDataSnapshotRef.current) return

    globalDataSnapshotRef.current = nextSnapshot
    saveGlobalData(nextGlobalData).catch(handleDataSyncError)
  }, [bookReaders, globalDataReady, handleDataSyncError, knownUsers, managedBooks, staff, viewCounts])

  useEffect(() => {
    if (account.role === 'guest' || !userDataReady) return

    const nextSnapshot = stableStringify(userData)
    if (nextSnapshot === userDataSnapshotRef.current) return

    userDataSnapshotRef.current = nextSnapshot
    saveUserData(account.id, userData).catch(handleDataSyncError)
  }, [account.id, account.role, handleDataSyncError, userData, userDataReady])

  const publishedManagedBooks = useMemo(
    () => managedBooks.filter((book) => (book.status || 'published') === 'published'),
    [managedBooks],
  )
  const allBooks = useMemo(() => [...publishedManagedBooks, ...books], [books, publishedManagedBooks])
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

  const handleAuth = useCallback(async (event) => {
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
        const isStaffSeed = staffEmails.includes(email) && password === STAFF_DEFAULT_PASSWORD
        if ((!isAdminSeed && !isStaffSeed) || error.code !== 'auth/invalid-credential') throw error
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        const staffAccount = staff.find((item) => item.email.toLowerCase() === email)
        await updateProfile(credential.user, { displayName: staffAccount?.name || 'BookWorm Admin' })
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
  }, [authForm.email, authForm.name, authForm.password, authMode, staff, staffEmails])

  function updateAuthMode(nextMode) {
    setAuthMode(nextMode)
    setAuthError('')
    setAuthErrorField('')
  }

  async function handleLogout() {
    await signOut(auth)
    setAccount(guestAccount)
    navigateTo('home', { instant: true })
    setSelectedBook(null)
  }

  async function updateAccountProfile({ avatar, displayName }) {
    const trimmedName = displayName.trim()
    if (!auth.currentUser || !trimmedName) return

    const nextSettings = {
      ...(accountSettings[account.id] || {}),
      avatar,
      displayName: trimmedName,
      websiteTheme,
    }

    await updateProfile(auth.currentUser, { displayName: trimmedName })

    setAccount((current) => ({ ...current, avatar, name: trimmedName }))
    setAccountSettings((current) => ({ ...current, [account.id]: nextSettings }))
    setKnownUsers((current) => upsertUser(current, { ...account, avatar, name: trimmedName }))
    setToast({ type: 'success', message: 'Account profile updated.' })
  }

  async function resetAccountPassword() {
    if (!account.email) return
    await sendPasswordResetEmail(auth, account.email)
    setToast({ type: 'success', message: `Password reset email sent to ${account.email}.` })
  }

  async function handleForgotPassword(email) {
    const normalizedEmail = email.trim().toLowerCase()
    await sendPasswordResetEmail(auth, normalizedEmail)
    setToast({ type: 'success', message: `Password reset email sent to ${normalizedEmail}.` })
  }

  function updateWebsiteTheme(nextTheme) {
    setWebsiteTheme(nextTheme)
    if (account.role !== 'guest') {
      setAccountSettings((current) => ({
        ...current,
        [account.id]: {
          ...(current[account.id] || {}),
          avatar: account.avatar || '',
          displayName: account.name,
          websiteTheme: nextTheme,
        },
      }))
    }
  }

  function goGuest() {
    setAccount(guestAccount)
    navigateTo('home', { instant: true })
  }

  function goAuth() {
    setAuthMode('login')
    navigateTo('auth')
  }

  function rememberSearchTerm(term) {
    const normalizedTerm = term.trim()
    if (!normalizedTerm) return

    setSearchHistory((current) => [
      normalizedTerm,
      ...current.filter((item) => item.toLowerCase() !== normalizedTerm.toLowerCase()),
    ].slice(0, SEARCH_HISTORY_LIMIT))
  }

  function handleSearchSubmit(term) {
    setQuery(term)
    rememberSearchTerm(term)
  }

  function recordBookView(book) {
    setViewCounts((current) => ({ ...current, [book.id]: (current[book.id] || 0) + 1 }))
    setBookReaders((current) => {
      const accountKey = getAccountKey(account)
      const readers = current[book.id] || []
      if (readers.includes(accountKey)) return current
      return { ...current, [book.id]: [...readers, accountKey] }
    })
  }

  function openDetail(book) {
    setSelectedBook(book)
    recordBookView(book)
    navigateTo('detail')
  }

  function openBook(book, startPage = null) {
    setSelectedBook(book)
    setReaderStartPage(startPage)
    navigateTo('reader')
    if (account.role !== 'guest') {
      setHistory((current) => [book.id, ...current.filter((id) => id !== book.id)].slice(0, 20))
      recordReadingDay()
    }
    if (activePage !== 'detail') recordBookView(book)
  }

  function openChapter(book, chapter) {
    if (account.role === 'guest' && chapter.number > 3) {
      setToast({ type: 'error', message: 'BookWorm membership is required to read beyond chapter 3.' })
      return
    }

    openBook(book, chapter.startPage)
  }

  function recordReadingDay() {
    const accountKey = getAccountKey(account)
    const today = new Date().toISOString().slice(0, 10)
    setReadingActivity((current) => {
      const days = current[accountKey] || []
      return days.includes(today) ? current : { ...current, [accountKey]: [today, ...days].slice(0, 90) }
    })
  }

  function addComment(bookId, text) {
    const trimmedText = text.trim()
    if (!trimmedText) return

    const accountKey = getAccountKey(account)
    const nextComment = {
      id: `${bookId}-${accountKey}-comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author: account.role === 'guest' ? getGuestCommentName(bookId, comments[bookId]?.length || 0) : account.name,
      role: account.role === 'guest' ? 'guest' : 'member',
      accountId: accountKey,
      text: trimmedText,
      createdAt: new Date().toISOString(),
    }

    setComments((current) => ({
      ...current,
      [bookId]: [nextComment, ...(current[bookId] || [])].slice(0, 30),
    }))
    saveBookComment(bookId, nextComment).catch(handleDataSyncError)
  }

  function toggleFavorite(bookId) {
    if (!bookId) return

    if (account.role === 'guest') {
      setToast({ type: 'error', message: 'Login to save books to your shelf.' })
      navigateTo('auth')
      return
    }

    const action = favorites.includes(bookId) ? 'remove' : 'add'
    if (!userDataReady) {
      pendingFavoriteUpdatesRef.current = [...pendingFavoriteUpdatesRef.current, { action, bookId }]
      setToast({ type: 'success', message: 'Bookmark updated. It will sync when your shelf is ready.' })
    }

    setFavorites((current) => applyFavoriteUpdates(current, [{ action, bookId }]))
  }

  function addManagedBook(event) {
    event.preventDefault()
    const validationErrors = validateAdminBook(adminBook, managedBooks)
    if (validationErrors.length) {
      setToast({ type: 'error', message: validationErrors.slice(0, 2).join(' ') })
      return
    }

    const nextBook = createAdminBookRecord(adminBook)

    setManagedBooks((current) => {
      const exists = current.some((book) => book.id === nextBook.id)
      if (exists) return current.map((book) => (book.id === nextBook.id ? nextBook : book))

      return [nextBook, ...current]
    })
    setAdminBook(emptyAdminBook)
    setToast({ type: 'success', message: nextBook.status === 'published' ? 'Book published to the main site.' : 'Book saved in Admin.' })
  }

  function editManagedBook(book) {
    setAdminBook({
      ...emptyAdminBook,
      ...book,
      author: getAuthor(book),
      category: getCategory(book),
      cover: book.formats?.['image/jpeg'] || book.cover || '',
      readerUrl: getReaderUrl(book),
      subjects: Array.isArray(book.subjects) ? book.subjects.join(', ') : book.subjects || '',
      language: book.languages?.[0] || book.language || 'en',
      status: book.status || 'published',
      chapterTitles: Array.isArray(book.chapterList) ? book.chapterList.map((chapter) => chapter.title).join('\n') : book.chapterTitles || '',
      chapterText: Array.isArray(book.chapterList) ? book.chapterList.map((chapter) => chapter.content).filter(Boolean).join('\n--- chapter ---\n') : book.chapterText || '',
      chaptersDraft: getEditableChapters(book),
    })
    setToast({ type: 'success', message: 'Book loaded into the editor.' })
  }

  function jumpPage(page, nextTopic) {
    if (nextTopic) setTopic(nextTopic)
    navigateTo(page)
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
          onForgotPassword={handleForgotPassword}
          onGuest={goGuest}
          setAuthForm={setAuthForm}
          setAuthMode={updateAuthMode}
        />
        {toast && <AppToast message={toast.message} onClose={() => setToast(null)} type={toast.type} />}
      </>
    )
  }

  const visibleProgress = account.role === 'guest' ? {} : progress

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
        viewCounts={viewCounts}
        viewerCounts={getViewerCounts(bookReaders)}
        progress={visibleProgress}
      />
    ),
    discover: (
      <DiscoverPage
        books={filteredBooks}
        favorites={favorites}
        onDetail={openDetail}
        onFavorite={toggleFavorite}
        onRead={openBook}
        query={query}
        searchableBooks={allBooks}
        searchHistory={searchHistory}
        onSearchSubmit={handleSearchSubmit}
        setTopic={setTopic}
        topic={topic}
        topics={topics}
        viewCounts={viewCounts}
        viewerCounts={getViewerCounts(bookReaders)}
      />
    ),
    detail: (
      <BookDetailPage
        book={selectedBook}
        books={allBooks}
        checkpoints={checkpoints}
        account={account}
        comments={comments[selectedBook?.id] || []}
        favorites={favorites}
        onBack={() => navigateTo('discover')}
        onChapter={openChapter}
        onComment={addComment}
        onDetail={openDetail}
        onFavorite={toggleFavorite}
        onHome={() => navigateTo('home')}
        onAuth={goAuth}
        onRead={openBook}
        viewCount={selectedBook ? viewCounts[selectedBook.id] || 0 : 0}
        viewCounts={viewCounts}
        viewerCount={selectedBook ? bookReaders[selectedBook.id]?.length || 0 : 0}
        viewerCounts={getViewerCounts(bookReaders)}
      />
    ),
    reader: (
      <ReaderPage
        key={`${selectedBook?.id || 'empty-reader'}-${readerStartPage || 'checkpoint'}`}
        book={selectedBook}
        account={account}
        canPersistReaderState={account.role !== 'guest' && userDataReady}
        checkpoints={checkpoints}
        comments={comments[selectedBook?.id] || []}
        favorites={favorites}
        onBack={() => navigateTo('detail')}
        onComment={addComment}
        onDiscover={() => navigateTo('discover')}
        onFavorite={toggleFavorite}
        onHome={() => navigateTo('home')}
        onLoginRequired={goAuth}
        readerTheme={readerTheme}
        startPage={readerStartPage}
        setCheckpoints={setCheckpoints}
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
        viewCounts={viewCounts}
        viewerCounts={getViewerCounts(bookReaders)}
        progress={visibleProgress}
      />
    ) : (
      <ProfilePage
        account={account}
        books={allBooks}
        favorites={favorites}
        history={history}
        highlights={highlights}
        onProfileUpdate={updateAccountProfile}
        onRead={openBook}
        onResetPassword={resetAccountPassword}
        progress={progress}
        readingDays={readingActivity[getAccountKey(account)] || []}
        readerTheme={readerTheme}
        setReaderTheme={setReaderTheme}
        setWebsiteTheme={updateWebsiteTheme}
        viewCounts={viewCounts}
        viewerCounts={getViewerCounts(bookReaders)}
        websiteTheme={websiteTheme}
      />
    ),
    admin: account.role === 'admin' ? (
      <AdminPage
        addManagedBook={addManagedBook}
        adminBook={adminBook}
        books={allBooks}
        managedBooks={managedBooks}
        removeManagedBook={(id) => setManagedBooks((current) => current.filter((book) => book.id !== id))}
        editManagedBook={editManagedBook}
        resetAdminBook={() => setAdminBook(emptyAdminBook)}
        setAdminBook={setAdminBook}
        setStaff={setStaff}
        staff={staff}
        users={knownUsers}
      />
    ) : null,
  }

  const navigation = { activePage, isPageLoading: pageState.isPageLoading, navigateTo }

  return (
    <NavigationProvider value={navigation}>
      <AppShell account={account} onAuth={goAuth} onGuest={goGuest} onLogout={handleLogout} websiteTheme={websiteTheme}>
        <Suspense fallback={<PageFallback />}>{pages[activePage] || pages.home}</Suspense>
        {toast && <AppToast message={toast.message} onClose={() => setToast(null)} type={toast.type} />}
      </AppShell>
    </NavigationProvider>
  )
}

function upsertUser(users, user) {
  const stored = { email: user.email, name: user.name, role: user.role }
  const existing = users.find((item) => item.email === user.email)
  if (existing && existing.name === stored.name && existing.role === stored.role) return users

  return [stored, ...users.filter((item) => item.email !== user.email)]
}

function getAccountKey(account) {
  if (!account || account.role === 'guest') return 'guest'
  return account.id || account.email || 'user'
}

function getViewerCounts(bookReaders) {
  return Object.fromEntries(Object.entries(bookReaders).map(([bookId, readers]) => [bookId, readers.length]))
}

function applyFavoriteUpdates(favorites = [], updates = []) {
  return updates.reduce((result, update) => {
    if (!update?.bookId) return result

    const withoutBook = result.filter((id) => id !== update.bookId)
    return update.action === 'remove' ? withoutBook : [...withoutBook, update.bookId]
  }, favorites)
}

function getGuestCommentName(bookId, commentIndex) {
  const names = ['Anonymous Reader', 'Quiet Page-Turner', 'Midnight Visitor', 'Paper Trail Guest', 'Chapter Wanderer']
  const seed = String(bookId)
    .split('')
    .reduce((total, letter) => total + letter.charCodeAt(0), commentIndex)
  const index = Math.abs(seed) % names.length
  return names[index]
}

function getPositiveInteger(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : null
}

function validateAdminBook(adminBook, managedBooks = []) {
  const duplicateTitle = managedBooks.some((book) => (
    book.id !== adminBook.id && book.title?.trim().toLowerCase() === adminBook.title.trim().toLowerCase()
  ))

  return [
    !hasText(adminBook.title) && 'Add a title.',
    duplicateTitle && 'A managed book already uses this title.',
    !hasText(adminBook.author) && 'Add an author.',
    !hasText(adminBook.category) && 'Choose a category.',
    !hasText(adminBook.cover) && 'Add a cover image.',
    !isValidImageSource(adminBook.cover) && 'Cover must be an http(s) image URL or an uploaded image.',
    !hasText(adminBook.description) && 'Add a description.',
    !hasAdminReaderSource(adminBook) && 'Add a reader URL, reader text, or chapter content.',
    hasText(adminBook.readerUrl) && !isValidHttpUrl(adminBook.readerUrl) && 'Reader URL must start with http:// or https://.',
    !hasValidAdminChapter(adminBook) && 'Add at least one chapter with a title and page count above 0.',
  ].filter(Boolean)
}

function createAdminBookRecord(adminBook) {
  const cover = adminBook.cover.trim()
  const readerText = adminBook.readerText.trim()
  const chapterText = adminBook.chapterText.trim()
  const readerUrl = adminBook.readerUrl.trim()
  const explicitChapters = normalizeAdminDraftChapters(adminBook.chaptersDraft)
  const fallbackPageCount = getPositiveInteger(adminBook.pageCount)
  const fallbackChapterCount = getPositiveInteger(adminBook.chapterCount)
  const chapterList = explicitChapters.length
    ? explicitChapters
    : createAdminChapters(adminBook.chapterTitles, chapterText, fallbackPageCount, fallbackChapterCount)
  const pageCount = chapterList.reduce((total, chapter) => total + chapter.pages, 0) || fallbackPageCount
  const chapterCount = chapterList.length || fallbackChapterCount
  const subjects = adminBook.subjects
    .split(',')
    .map((subject) => subject.trim())
    .filter(Boolean)
  const language = adminBook.language.trim().toLowerCase()
  const author = adminBook.author.trim() || 'BookWorm editor'
  const category = adminBook.category.trim() || 'Admin pick'

  return {
    ...adminBook,
    id: adminBook.id || `managed-${Date.now()}`,
    title: adminBook.title.trim(),
    author,
    category,
    authors: [{ name: author }],
    bookshelves: [category],
    description: adminBook.description.trim(),
    subjects,
    languages: [language || 'en'],
    status: adminBook.status || 'draft',
    ...(pageCount ? { pageCount } : {}),
    ...(chapterCount ? { chapterCount } : {}),
    ...(chapterList.length ? { chapterList } : {}),
    ...(readerText ? { readerText } : {}),
    download_count: adminBook.download_count || 0,
    formats: {
      ...(cover ? { 'image/jpeg': cover } : {}),
      ...(readerUrl ? { [getReaderFormatKey(readerUrl)]: readerUrl } : {}),
    },
  }
}

function createAdminChapters(titleSource, contentSource, pageCount, chapterCount) {
  const titles = titleSource
    .split('\n')
    .map((title) => title.trim())
    .filter(Boolean)
  const contentBlocks = contentSource
    .split(/\n-{3,}\s*(?:chapter)?\s*-{0,}\n/i)
    .map((content) => content.trim())
    .filter(Boolean)
  const totalChapters = Math.max(titles.length, contentBlocks.length, chapterCount || 0)

  if (!totalChapters) return []

  const safePageCount = pageCount || totalChapters
  const basePages = Math.max(1, Math.floor(safePageCount / totalChapters))
  const extraPages = safePageCount % totalChapters
  let startPage = 1

  return Array.from({ length: totalChapters }, (_, index) => {
    const pages = basePages + (index < extraPages ? 1 : 0)
    const chapter = {
      number: index + 1,
      title: titles[index] || `Chapter ${index + 1}`,
      startPage,
      pages,
      content: contentBlocks[index] || '',
    }

    startPage += pages
    return chapter
  })
}

function normalizeAdminDraftChapters(chapters = []) {
  let startPage = 1

  return chapters
    .map((chapter, index) => {
      const title = String(chapter.title || '').trim()
      const content = String(chapter.content || '').trim()
      const pages = getPositiveInteger(chapter.pages) || 1

      if (!title && !content) return null

      const nextChapter = {
        number: index + 1,
        title: title || `Chapter ${index + 1}`,
        startPage,
        pages,
        content,
      }

      startPage += pages
      return nextChapter
    })
    .filter(Boolean)
}

function getEditableChapters(book) {
  if (Array.isArray(book.chapterList) && book.chapterList.length) {
    return book.chapterList.map((chapter, index) => ({
      title: chapter.title || `Chapter ${index + 1}`,
      pages: String(chapter.pages || 1),
      content: chapter.content || '',
    }))
  }

  const count = getPositiveInteger(book.chapterCount) || 1
  return Array.from({ length: count }, (_, index) => ({
    title: `Chapter ${index + 1}`,
    pages: String(Math.max(1, Math.floor((getPositiveInteger(book.pageCount) || count) / count))),
    content: '',
  }))
}

function getReaderFormatKey(readerUrl) {
  return /\.txt($|\?)/i.test(readerUrl) ? 'text/plain' : 'text/html'
}

function hasText(value) {
  return String(value || '').trim().length > 0
}

function hasAdminReaderSource(book) {
  return Boolean(hasText(book.readerUrl) || hasText(book.readerText) || book.chaptersDraft?.some((chapter) => hasText(chapter.content)))
}

function hasValidAdminChapter(book) {
  return Boolean(book.chaptersDraft?.some((chapter) => hasText(chapter.title) && Number(chapter.pages) > 0))
}

function isValidHttpUrl(value) {
  if (!hasText(value)) return true

  try {
    const url = new URL(String(value).trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidImageSource(value) {
  if (!hasText(value)) return true
  const source = String(value).trim()
  return source.startsWith('data:image/') || isValidHttpUrl(source)
}

function getPageFromPath(pathname = '/') {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  return PATH_PAGES[normalizedPath] || 'home'
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
      <img src={logo} alt="BookWorm logo" />
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

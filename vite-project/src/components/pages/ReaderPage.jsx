import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReaderUrl } from '../../utils/bookUtils'

const GUEST_CHAPTER_LIMIT = 3
const DEFAULT_TOTAL_PAGES = 120
const DEFAULT_TOTAL_CHAPTERS = 12

function ReaderPage({
  account,
  book,
  checkpoints,
  favorites,
  fontScale,
  highlights = [],
  notes,
  onBack,
  onFavorite,
  onHighlight,
  onLoginRequired,
  progress,
  readerTheme,
  startPage,
  setCheckpoints,
  setFontScale,
  setNotes,
  setProgress,
  setReaderTheme,
}) {
  const [quoteText, setQuoteText] = useState('')
  const activeBook = useMemo(() => book || { id: 'empty', title: '', formats: {} }, [book])
  const readerUrl = getReaderUrl(activeBook)
  const totalPages = useMemo(() => getTotalPages(activeBook), [activeBook])
  const chapters = useMemo(() => getChapters(activeBook, totalPages), [activeBook, totalPages])
  const checkpointKey = useMemo(() => getCheckpointKey(account, activeBook), [account, activeBook])
  const savedCheckpoint = checkpoints[checkpointKey]
  const [currentPage, setCurrentPage] = useState(() => clampPage(startPage || savedCheckpoint?.page || 1, totalPages))
  const isGuest = account?.role === 'guest'
  const currentChapterIndex = getChapterIndex(currentPage, chapters)
  const currentChapter = chapters[currentChapterIndex]
  const currentChapterNumber = currentChapterIndex + 1
  const chapterPage = currentPage - currentChapter.startPage + 1
  const hasReachedGuestLimit = isGuest && currentChapterNumber > GUEST_CHAPTER_LIMIT
  const isFinished = currentPage >= totalPages
  const progressValue = Math.round((currentPage / totalPages) * 100)

  const saveCheckpoint = useCallback(
    (page = currentPage) => {
      if (!book) return

      const safePage = clampPage(page, totalPages)
      setCheckpoints((current) => ({
        ...current,
        [checkpointKey]: {
          page: safePage,
          chapter: getChapterIndex(safePage, chapters) + 1,
          chapterPage: safePage - chapters[getChapterIndex(safePage, chapters)].startPage + 1,
          totalPages,
          updatedAt: new Date().toISOString(),
        },
      }))
      setProgress((current) => ({ ...current, [activeBook.id]: Math.min(100, Math.round((safePage / totalPages) * 100)) }))
    },
    [activeBook.id, book, chapters, checkpointKey, currentPage, setCheckpoints, setProgress, totalPages],
  )

  useEffect(() => {
    if (!book) return
    saveCheckpoint(currentPage)
  }, [book, currentPage, saveCheckpoint])

  useEffect(() => {
    if (!book) return

    const handleBeforeUnload = () => saveCheckpoint(currentPage)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      saveCheckpoint(currentPage)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [book, currentPage, saveCheckpoint])

  if (!book) return <div className="empty-state">No book selected.</div>

  function handlePageChange(nextPage) {
    const safePage = Number(nextPage)
    setCurrentPage(clampPage(safePage, totalPages))
  }

  function goToChapter(chapterIndex) {
    const chapter = chapters[chapterIndex]
    if (!chapter) return

    setCurrentPage(chapter.startPage)
  }

  function goToChapterPage(nextChapterPage) {
    handlePageChange(currentChapter.startPage + nextChapterPage - 1)
  }

  function movePage(direction) {
    handlePageChange(currentPage + direction)
  }

  function handleExit() {
    saveCheckpoint(currentPage)
    onBack()
  }

  function saveHighlight() {
    const text = quoteText.trim()
    if (!text) return

    onHighlight(activeBook.id, text, `${currentChapter.label}, page ${chapterPage}`)
    setQuoteText('')
  }

  return (
    <section className={`reader-page reader-${readerTheme}`}>
      <header className="reader-topbar">
        <button className="ghost-button" onClick={handleExit} type="button">
          <i className="bi bi-arrow-left" />
          Exit reader
        </button>
        <div>
          <p className="mono-eyebrow">Now reading</p>
          <h1>{activeBook.title}</h1>
        </div>
        <button className="ghost-button" onClick={() => onFavorite(activeBook.id)} type="button">
          <i className={`bi ${favorites.includes(activeBook.id) ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
          Bookmark
        </button>
      </header>

      <div className="reader-controls">
        <label>
          Theme
          <select value={readerTheme} onChange={(event) => setReaderTheme(event.target.value)}>
            <option value="sepia">Sepia</option>
            <option value="focus">Focus</option>
            <option value="night">Night</option>
          </select>
        </label>
        <label>
          Font size
          <input
            type="range"
            min="15"
            max="24"
            value={fontScale}
            onChange={(event) => setFontScale(Number(event.target.value))}
          />
        </label>
        <label>
          Chapter
          <select value={currentChapterIndex} onChange={(event) => goToChapter(Number(event.target.value))}>
            {chapters.map((chapter, index) => (
              <option key={chapter.id} value={index}>
                {chapter.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Page in chapter
          <input
            type="range"
            min="1"
            max={currentChapter.pages}
            value={chapterPage}
            onChange={(event) => goToChapterPage(Number(event.target.value))}
          />
        </label>
        <div className="reader-page-meter">
          <span>{currentChapter.label} · Page {chapterPage} / {currentChapter.pages}</span>
          <progress max="100" value={progress[book.id] || progressValue} />
          {isGuest && <small>Guest preview: first {GUEST_CHAPTER_LIMIT} chapters</small>}
          {isFinished && <small className="finished-status">Finished</small>}
        </div>
      </div>

      <div className="reader-main">
        <aside className="chapter-panel">
          <div>
            <p className="mono-eyebrow">Contents</p>
            <h2>Chapters</h2>
          </div>
          <nav aria-label="Book chapters">
            {chapters.map((chapter, index) => {
              const isLocked = isGuest && index + 1 > GUEST_CHAPTER_LIMIT

              return (
                <button
                  className={currentChapterIndex === index ? 'active' : ''}
                  key={chapter.id}
                  onClick={() => goToChapter(index)}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <strong>{chapter.title}</strong>
                  {isLocked ? <i className="bi bi-lock-fill" /> : <small>{chapter.pages} pages</small>}
                </button>
              )
            })}
          </nav>
        </aside>
        <article className="reader-frame" style={{ fontSize: `${fontScale}px` }}>
          <div className="reader-chapter-header">
            <div>
              <p className="mono-eyebrow">Reading section</p>
              <h2>{currentChapter.title}</h2>
            </div>
            <div className="reader-page-actions">
              <button disabled={currentPage === 1} onClick={() => movePage(-1)} type="button">
                <i className="bi bi-chevron-left" />
              </button>
              <span>Page {chapterPage}</span>
              <button disabled={currentPage === totalPages} onClick={() => movePage(1)} type="button">
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
          {readerUrl ? (
            <iframe loading="lazy" src={readerUrl} title={`Read ${activeBook.title}`} />
          ) : (
            <p>This book does not include a readable text link.</p>
          )}
          <div className="chapter-page-grid" aria-label="Pages in current chapter">
            {Array.from({ length: currentChapter.pages }, (_, index) => index + 1).map((page) => (
              <button
                className={chapterPage === page ? 'active' : ''}
                key={page}
                onClick={() => goToChapterPage(page)}
                type="button"
              >
                {page}
              </button>
            ))}
          </div>
          {hasReachedGuestLimit && (
            <div className="reader-lock">
              <div>
                <i className="bi bi-lock-fill" />
                <h2>Login to keep reading</h2>
                <p>Guest accounts can preview the first {GUEST_CHAPTER_LIMIT} chapters. Create or login to continue reading with unlimited checkpoints.</p>
                <button className="primary-button" onClick={onLoginRequired} type="button">
                  <i className="bi bi-box-arrow-in-right" />
                  Login to continue
                </button>
              </div>
            </div>
          )}
        </article>
        <aside className="notes-panel">
          <h2>Notes</h2>
          <div className="highlight-tool">
            <label>
              Quote highlight
              <textarea
                value={quoteText}
                onChange={(event) => setQuoteText(event.target.value)}
                placeholder="Paste a favorite line from the current page..."
              />
            </label>
            <button className="primary-button" disabled={!quoteText.trim()} onClick={saveHighlight} type="button">
              <i className="bi bi-highlighter" />
              Save highlight
            </button>
          </div>
          {highlights.length > 0 && (
            <div className="reader-highlights">
              <h3>Saved quotes</h3>
              {highlights.slice(0, 3).map((highlight) => (
                <blockquote key={highlight.id}>
                  {highlight.text}
                  <span>{highlight.location}</span>
                </blockquote>
              ))}
            </div>
          )}
          <textarea
            value={notes[activeBook.id] || ''}
            onChange={(event) => setNotes((current) => ({ ...current, [activeBook.id]: event.target.value }))}
            placeholder="Save quotes, thoughts, or chapter notes..."
          />
        </aside>
      </div>
    </section>
  )
}

function getCheckpointKey(account, book) {
  const accountKey = account?.role === 'guest' ? 'guest' : account?.id || account?.email || 'user'
  return `${accountKey}:${book.id}`
}

function getTotalPages(book) {
  return Number(book.pageCount || book.page_count || book.pages || DEFAULT_TOTAL_PAGES)
}

function getChapters(book, totalPages) {
  const totalChapters = Number(book.chapterCount || book.chapter_count || book.chapters || DEFAULT_TOTAL_CHAPTERS)
  const safeChapterCount = Math.max(1, Math.min(totalChapters, totalPages))
  const basePages = Math.floor(totalPages / safeChapterCount)
  const extraPages = totalPages % safeChapterCount
  let startPage = 1

  return Array.from({ length: safeChapterCount }, (_, index) => {
    const pages = basePages + (index < extraPages ? 1 : 0)
    const chapter = {
      id: `${book.id}-chapter-${index + 1}`,
      label: `Chapter ${index + 1}`,
      title: `Chapter ${index + 1}`,
      startPage,
      pages,
    }
    startPage += pages
    return chapter
  })
}

function getChapterIndex(page, chapters) {
  return Math.max(
    0,
    chapters.findIndex((chapter) => page >= chapter.startPage && page < chapter.startPage + chapter.pages),
  )
}

function clampPage(page, totalPages) {
  return Math.min(totalPages, Math.max(1, Number(page) || 1))
}

export default ReaderPage

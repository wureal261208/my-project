import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReaderUrl } from '../../utils/bookUtils'
import { getBookChapters, getChapterIndex, getTotalPages } from '../../utils/chapterUtils'

const GUEST_CHAPTER_LIMIT = 3

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
  const [readerText, setReaderText] = useState('')
  const [readerStatus, setReaderStatus] = useState('idle')
  const [readerMessage, setReaderMessage] = useState('')
  const activeBook = useMemo(() => book || { id: 'empty', title: '', formats: {} }, [book])
  const readerUrl = getReaderUrl(activeBook)
  const readerTextUrl = getReaderTextUrl(activeBook)
  const totalPages = useMemo(() => getTotalPages(activeBook), [activeBook])
  const chapters = useMemo(() => getBookChapters(activeBook, totalPages), [activeBook, totalPages])
  const readerPages = useMemo(() => buildReaderPages(readerText, chapters, totalPages), [chapters, readerText, totalPages])
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
  const currentReaderText = readerPages[currentPage - 1] || ''
  const currentReaderParagraphs = useMemo(() => getDisplayParagraphs(currentReaderText), [currentReaderText])

  const saveCheckpoint = useCallback(
    (page = currentPage) => {
      if (!book) return

      const safePage = clampPage(page, totalPages)
      const chapterIndex = getChapterIndex(safePage, chapters)
      const checkpointChapter = chapters[chapterIndex]

      setCheckpoints((current) => ({
        ...current,
        [checkpointKey]: {
          page: safePage,
          chapter: checkpointChapter.number || chapterIndex + 1,
          chapterPage: safePage - checkpointChapter.startPage + 1,
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
    let isCurrentRequest = true
    const commitReaderState = (text, status, message = '') => {
      queueMicrotask(() => {
        if (!isCurrentRequest) return

        setReaderText(text)
        setReaderStatus(status)
        setReaderMessage(message)
      })
    }

    if (!book) {
      commitReaderState('', 'idle')
      return () => {
        isCurrentRequest = false
      }
    }

    const inlineText = getInlineBookText(activeBook)
    const hasChapterContent = chapters.some((chapter) => chapter.content)

    if (inlineText) {
      commitReaderState(cleanBookText(inlineText), 'ready')
      return () => {
        isCurrentRequest = false
      }
    }

    if (hasChapterContent) {
      commitReaderState('', 'ready')
      return () => {
        isCurrentRequest = false
      }
    }

    if (!readerTextUrl) {
      commitReaderState('', 'missing', 'This book does not include readable text for chapter pages.')
      return () => {
        isCurrentRequest = false
      }
    }

    async function loadReaderText() {
      commitReaderState('', 'loading')

      try {
        const response = await fetch(getFetchableReaderUrl(readerTextUrl))
        if (!response.ok) throw new Error(`Reader source returned ${response.status}`)

        const source = await response.text()
        const text = cleanBookText(isHtmlReaderSource(readerTextUrl, response) ? htmlToText(source) : source)

        if (!isCurrentRequest) return

        commitReaderState(text, text ? 'ready' : 'missing', text ? '' : 'This reader source did not include readable text.')
      } catch {
        if (!isCurrentRequest) return

        commitReaderState('', 'error', 'Could not load text for sliced chapter pages. Open the original reader instead.')
      }
    }

    loadReaderText()

    return () => {
      isCurrentRequest = false
    }
  }, [activeBook, book, chapters, readerTextUrl])

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

  function goToSidebarPage(chapter, nextChapterPage) {
    handlePageChange(chapter.startPage + nextChapterPage - 1)
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
          <nav aria-label="Book chapters" className="chapter-list">
            {chapters.map((chapter, index) => {
              const isLocked = isGuest && index + 1 > GUEST_CHAPTER_LIMIT
              const isActive = currentChapterIndex === index

              return (
                <div className={`chapter-nav-group ${isActive ? 'active' : ''}`} key={chapter.id}>
                  <button
                    aria-expanded={isActive}
                    className={`chapter-nav-button ${isActive ? 'active' : ''}`}
                    onClick={() => goToChapter(index)}
                    type="button"
                  >
                    <span className="chapter-nav-number">{chapter.number || index + 1}</span>
                    <span className="chapter-nav-copy">
                      <strong>{chapter.title}</strong>
                      <small>{isLocked ? `starts page ${chapter.startPage}` : `${chapter.pages} pages · starts page ${chapter.startPage}`}</small>
                    </span>
                    {isLocked && <i className="bi bi-lock-fill" />}
                  </button>
                  {isActive && !isLocked && (
                    <div className="chapter-sidebar-pages" aria-label={`Pages in ${chapter.title}`}>
                      {Array.from({ length: chapter.pages }, (_, pageIndex) => pageIndex + 1).map((page) => (
                        <button
                          aria-label={`${chapter.title}, page ${page}`}
                          className={chapterPage === page ? 'active' : ''}
                          key={`${chapter.id}-page-${page}`}
                          onClick={() => goToSidebarPage(chapter, page)}
                          type="button"
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
          {readerStatus === 'loading' ? (
            <div className="reader-text-state">
              <span className="reader-spinner" />
              <p>Loading chapter text...</p>
            </div>
          ) : currentReaderParagraphs.length ? (
            <div className="reader-text-page" aria-live="polite">
              <p className="reader-page-kicker">{currentChapter.title} · Page {chapterPage}</p>
              {currentReaderParagraphs.map((paragraph, index) => (
                <p key={`${currentPage}-${index}`}>{paragraph}</p>
              ))}
            </div>
          ) : readerUrl ? (
            <div className="reader-source-fallback">
              <p>{readerMessage || 'Readable text is not available for this generated page.'}</p>
              <a href={readerUrl} rel="noreferrer" target="_blank">Open original reader</a>
              <iframe loading="lazy" src={readerUrl} title={`Read ${activeBook.title}`} />
            </div>
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

function getReaderTextUrl(book) {
  const formats = book.formats || {}

  return (
    formats['text/plain; charset=utf-8'] ||
    formats['text/plain'] ||
    getProjectGutenbergTextUrl(book) ||
    formats['text/html; charset=utf-8'] ||
    formats['text/html'] ||
    book.readerTextUrl ||
    book.reader_text_url ||
    book.readerUrl ||
    ''
  )
}

function getProjectGutenbergTextUrl(book) {
  const gutenbergId = getProjectGutenbergId(book)
  return gutenbergId ? `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt` : ''
}

function getProjectGutenbergId(book) {
  const directId = Number(book.id)
  if (Number.isInteger(directId) && directId > 0) return directId

  const sourceUrls = [book.readerUrl, ...(Object.values(book.formats || {}))]
  const urlMatch = sourceUrls
    .filter(Boolean)
    .map((url) => String(url).match(/gutenberg\.org\/(?:ebooks|files|cache\/epub)\/(\d+)/i)?.[1])
    .find(Boolean)

  return urlMatch ? Number(urlMatch) : null
}

function getInlineBookText(book) {
  return [book.readerText, book.reader_text, book.content, book.text, book.body].find(
    (value) => typeof value === 'string' && value.trim(),
  ) || ''
}

function getFetchableReaderUrl(url) {
  try {
    const parsedUrl = new URL(url)

    if (parsedUrl.hostname.endsWith('gutenberg.org')) {
      return `/gutenberg${parsedUrl.pathname}${parsedUrl.search}`
    }
  } catch {
    return url
  }

  return url
}

function isHtmlReaderSource(url, response) {
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('text/html') || /\.html?($|\?)/i.test(url)
}

function htmlToText(source) {
  const document = new DOMParser().parseFromString(source, 'text/html')
  document.querySelectorAll('script, style, nav, header, footer').forEach((node) => node.remove())

  return document.body?.textContent || ''
}

function cleanBookText(text) {
  const normalizedText = text
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')

  const withoutHeader = sliceAfterMarker(normalizedText, [
    '*** START OF THE PROJECT GUTENBERG EBOOK',
    '*** START OF THIS PROJECT GUTENBERG EBOOK',
    'START OF THE PROJECT GUTENBERG EBOOK',
    'START OF THIS PROJECT GUTENBERG EBOOK',
  ])
  const withoutFooter = sliceBeforeMarker(withoutHeader, [
    '*** END OF THE PROJECT GUTENBERG EBOOK',
    '*** END OF THIS PROJECT GUTENBERG EBOOK',
    'END OF THE PROJECT GUTENBERG EBOOK',
    'END OF THIS PROJECT GUTENBERG EBOOK',
  ])

  return withoutFooter
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function buildReaderPages(text, chapters, totalPages) {
  const chapterContent = chapters.some((chapter) => chapter.content)

  if (chapterContent) {
    return normalizePageCount(
      chapters.flatMap((chapter) => splitTextIntoPages(cleanBookText(chapter.content || ''), chapter.pages)),
      totalPages,
    )
  }

  if (!text) return []

  const chapterBodies = splitTextByChapterHeadings(text)

  if (chapterBodies.length > 1) {
    const groupedChapters = groupEntries(chapterBodies, chapters.length)

    return normalizePageCount(
      chapters.flatMap((chapter, index) => splitTextIntoPages(groupedChapters[index] || '', chapter.pages)),
      totalPages,
    )
  }

  return splitTextIntoPages(text, totalPages)
}

function splitTextByChapterHeadings(text) {
  const headingPattern = /^\s*((chapter|letter|book|volume)\s+([ivxlcdm]+|\d+)\b.*|[ivxlcdm]+\.\s+[A-Z][A-Z0-9 ,;'":!?-]{4,})\s*$/gim
  const matches = [...text.matchAll(headingPattern)]

  if (matches.length < 2) return []

  const bodies = matches.map((match, index) => {
    const end = matches[index + 1]?.index ?? text.length
    const prefix = index === 0 ? text.slice(0, match.index).trim() : ''
    const body = text.slice(match.index, end).trim()

    return [prefix, body].filter(Boolean).join('\n\n')
  })

  return bodies.filter((body) => body.length > 80)
}

function groupEntries(entries, targetCount) {
  return Array.from({ length: targetCount }, (_, index) => {
    const start = Math.floor((index * entries.length) / targetCount)
    const end = Math.floor(((index + 1) * entries.length) / targetCount)
    return entries.slice(start, Math.max(start + 1, end)).join('\n\n')
  })
}

function splitTextIntoPages(text, pageCount) {
  const cleanText = text.replace(/\n{3,}/g, '\n\n').trim()
  if (!cleanText) return Array.from({ length: pageCount }, () => '')

  const paragraphs = cleanText.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const targetLength = Math.max(900, Math.ceil(cleanText.length / pageCount))
  const pages = []
  let currentPageText = ''

  paragraphs.forEach((paragraph) => {
    const nextPageText = [currentPageText, paragraph].filter(Boolean).join('\n\n')

    if (currentPageText && nextPageText.length > targetLength && pages.length < pageCount - 1) {
      pages.push(currentPageText)
      currentPageText = paragraph
      return
    }

    currentPageText = nextPageText
  })

  if (currentPageText || !pages.length) pages.push(currentPageText)

  return normalizePageCount(pages, pageCount)
}

function normalizePageCount(pages, pageCount) {
  const safePages = pages.slice(0, pageCount)

  if (pages.length > pageCount) {
    safePages[pageCount - 1] = [safePages[pageCount - 1], ...pages.slice(pageCount)].filter(Boolean).join('\n\n')
  }

  while (safePages.length < pageCount) {
    safePages.push('')
  }

  return safePages
}

function getDisplayParagraphs(text) {
  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
}

function sliceAfterMarker(text, markers) {
  const markerIndex = findMarkerIndex(text, markers)
  if (markerIndex < 0) return text

  const nextLineIndex = text.indexOf('\n', markerIndex)
  return nextLineIndex >= 0 ? text.slice(nextLineIndex + 1) : text.slice(markerIndex)
}

function sliceBeforeMarker(text, markers) {
  const markerIndex = findMarkerIndex(text, markers)
  return markerIndex >= 0 ? text.slice(0, markerIndex) : text
}

function findMarkerIndex(text, markers) {
  const lowerText = text.toLowerCase()
  const indexes = markers
    .map((marker) => lowerText.indexOf(marker.toLowerCase()))
    .filter((index) => index >= 0)

  return indexes.length ? Math.min(...indexes) : -1
}

function clampPage(page, totalPages) {
  return Math.min(totalPages, Math.max(1, Number(page) || 1))
}

export default ReaderPage

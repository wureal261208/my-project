import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReaderUrl } from '../../utils/bookUtils'
import { getBookChapters, getChapterIndex, getTotalPages } from '../../utils/chapterUtils'

const GUEST_CHAPTER_LIMIT = 3
const READER_PAGE_TARGET_LENGTH = 1800
const MAX_GENERATED_READER_PAGES = 260
const MAX_DETECTED_CHAPTER_NUMBER = 250

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
  const [collapsedPageChapters, setCollapsedPageChapters] = useState({})
  const activeBook = useMemo(() => book || { id: 'empty', title: '', formats: {} }, [book])
  const readerUrl = getReaderUrl(activeBook)
  const readerTextUrl = getReaderTextUrl(activeBook)
  const metadataTotalPages = useMemo(() => getTotalPages(activeBook), [activeBook])
  const metadataChapters = useMemo(() => getBookChapters(activeBook, metadataTotalPages), [activeBook, metadataTotalPages])
  const contentChapters = useMemo(
    () => getContentChapters(activeBook, readerText, metadataTotalPages),
    [activeBook, readerText, metadataTotalPages],
  )
  const chapters = contentChapters.length > 1 ? contentChapters : metadataChapters
  const totalPages = useMemo(() => getChapterPageTotal(chapters) || metadataTotalPages, [chapters, metadataTotalPages])
  const readerPages = useMemo(() => buildReaderPages(readerText, chapters, totalPages), [chapters, readerText, totalPages])
  const checkpointKey = useMemo(() => getCheckpointKey(account, activeBook), [account, activeBook])
  const isGuest = account?.role === 'guest'
  const savedCheckpoint = isGuest ? null : checkpoints[checkpointKey]
  const [requestedPage, setCurrentPage] = useState(() => clampPage(startPage || savedCheckpoint?.page || 1, totalPages))
  const currentPage = clampPage(requestedPage, totalPages)
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
      if (!book || isGuest) return

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
    [activeBook.id, book, chapters, checkpointKey, currentPage, isGuest, setCheckpoints, setProgress, totalPages],
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
    const hasChapterContent = metadataChapters.some((chapter) => chapter.content)

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
  }, [activeBook, book, metadataChapters, readerTextUrl])

  useEffect(() => {
    if (!book || isGuest) return

    const handleBeforeUnload = () => saveCheckpoint(currentPage)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      saveCheckpoint(currentPage)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [book, currentPage, isGuest, saveCheckpoint])

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

  function toggleChapterPages(chapterId) {
    setCollapsedPageChapters((current) => ({ ...current, [chapterId]: !current[chapterId] }))
  }

  function movePage(direction) {
    handlePageChange(currentPage + direction)
  }

  function changeFontScale(direction) {
    setFontScale((current) => clampNumber(current + direction, 15, 24))
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
          <div className="reader-font-controls">
            <button disabled={fontScale <= 15} onClick={() => changeFontScale(-1)} type="button">A-</button>
            <span>{fontScale}px</span>
            <button disabled={fontScale >= 24} onClick={() => changeFontScale(1)} type="button">A+</button>
          </div>
        </label>
        <label>
          Chapter
          <select value={currentChapterIndex} onChange={(event) => goToChapter(Number(event.target.value))}>
            {chapters.map((chapter, index) => (
              <option key={chapter.id} value={index}>
                {chapter.title === chapter.label ? chapter.label : `${chapter.label} · ${chapter.title}`}
              </option>
            ))}
          </select>
        </label>
        <div className="reader-page-meter">
          <span>{currentChapter.label} · Page {chapterPage} / {currentChapter.pages}</span>
          <progress max="100" value={progressValue} />
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
              const arePagesOpen = isActive && !collapsedPageChapters[chapter.id]

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
                    <button
                      aria-expanded={arePagesOpen}
                      className="chapter-page-toggle"
                      onClick={() => toggleChapterPages(chapter.id)}
                      type="button"
                    >
                      <span>Page {chapterPage} / {chapter.pages}</span>
                      <small>{chapter.pages} pages</small>
                      <i className={`bi ${arePagesOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                    </button>
                  )}
                  {arePagesOpen && (
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
        <article className="reader-frame">
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
            <div className="reader-text-page" aria-live="polite" style={{ fontSize: `${fontScale}px` }}>
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
                <p>Guest accounts can preview the first {GUEST_CHAPTER_LIMIT} chapters. Create or login to continue reading with saved progress.</p>
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
    getFormatUrl(formats, 'text/plain') ||
    getProjectGutenbergTextUrl(book) ||
    getFormatUrl(formats, 'text/html') ||
    book.readerTextUrl ||
    book.reader_text_url ||
    book.readerUrl ||
    ''
  )
}

function getFormatUrl(formats, mimePrefix) {
  return Object.entries(formats).find(([mimeType, url]) => mimeType.startsWith(mimePrefix) && url)?.[1] || ''
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
      const cacheTextMatch = parsedUrl.pathname.match(/^\/cache\/epub\/(\d+)\/pg\d+\.txt$/i)
      if (cacheTextMatch) return `/api/reader-text/${cacheTextMatch[1]}/plain`

      const ebookTextMatch = parsedUrl.pathname.match(/^\/ebooks\/(\d+)\.txt/i)
      if (ebookTextMatch) return `/api/reader-text/${ebookTextMatch[1]}/plain`

      const fileMatch = parsedUrl.pathname.match(/^\/files\/(\d+)\/([^/]+)$/i)
      if (fileMatch) return `/api/reader-text/${fileMatch[1]}/file/${fileMatch[2]}`

      return `/api/reader-text${parsedUrl.pathname}${parsedUrl.search}`
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

  if (chapterBodies.length >= chapters.length) {
    const groupedChapters = groupEntries(chapterBodies.map((chapter) => chapter.content), chapters.length)

    return normalizePageCount(
      chapters.flatMap((chapter, index) => splitTextIntoPages(groupedChapters[index] || '', chapter.pages)),
      totalPages,
    )
  }

  return splitTextIntoPages(text, totalPages)
}

function getContentChapters(book, text, totalPages) {
  if (!text) return []

  const detectedChapters = splitTextByChapterHeadings(text)
  if (detectedChapters.length < 2) return []

  const contentTotalPages = estimateContentPageCount(text, totalPages, detectedChapters.length)
  const chapterSections =
    detectedChapters.length > contentTotalPages ? groupChapterSections(detectedChapters, contentTotalPages) : detectedChapters
  const pageCounts = distributePagesByContent(chapterSections, contentTotalPages)
  let startPage = 1

  return chapterSections.map((chapter, index) => {
    const pages = pageCounts[index]
    const number = chapter.number || index + 1
    const label = chapter.label || `Chapter ${number}`
    const normalizedChapter = {
      id: `${book.id || 'book'}-content-chapter-${index + 1}`,
      label,
      number,
      title: chapter.title || label,
      startPage,
      pages,
      content: chapter.content,
    }

    startPage += pages
    return normalizedChapter
  })
}

function splitTextByChapterHeadings(text) {
  const candidates = trimLeadingTableOfContents(getChapterHeadingCandidates(text))

  if (candidates.length < 2) return []

  const chapters = candidates.map((candidate, index) => {
    const end = candidates[index + 1]?.index ?? text.length
    const prefix = ''
    const body = text.slice(candidate.index, end).trim()

    return {
      label: candidate.label,
      number: candidate.number,
      title: candidate.title,
      content: [prefix, body].filter(Boolean).join('\n\n'),
    }
  })

  return chapters.filter((chapter) => chapter.content.length > 80)
}

function getChapterHeadingCandidates(text) {
  const lines = getIndexedLines(text)
  const candidates = []

  lines.forEach((line, index) => {
    const inlineHeading = parseInlineChapterHeading(line.text)
    if (inlineHeading) {
      candidates.push({ ...inlineHeading, index: line.index })
      return
    }

    const marker = parseStandaloneChapterMarker(line.text)
    if (!marker) return

    const nextLine = findNextNonEmptyLine(lines, index + 1)
    if (!nextLine || !isLikelyStandaloneChapterTitle(nextLine.text)) return

    const number = parseChapterNumber(marker)
    candidates.push({
      index: line.index,
      kind: 'standalone',
      label: `Chapter ${formatChapterMarker(marker)}`,
      number,
      title: cleanHeadingTitle(nextLine.text.trim()) || `Chapter ${number || marker}`,
    })
  })

  const chapterCandidates = candidates.filter((candidate) => candidate.headingType === 'chapter')
  if (chapterCandidates.length >= 2) return chapterCandidates

  const actCandidates = candidates.filter((candidate) => candidate.headingType === 'act')
  if (actCandidates.length >= 2) return actCandidates

  const namedCandidates = candidates.filter((candidate) => candidate.kind === 'named')
  if (namedCandidates.length >= 2) return namedCandidates

  const numberedCandidates = candidates.filter((candidate) => candidate.kind === 'numbered')
  return numberedCandidates.length >= 2 ? numberedCandidates : candidates
}

function getIndexedLines(text) {
  let index = 0

  return text.split('\n').map((line) => {
    const indexedLine = { index, text: line }
    index += line.length + 1
    return indexedLine
  })
}

function parseInlineChapterHeading(line) {
  const heading = line.trim()
  if (!isReasonableHeadingLength(heading)) return null

  const namedHeading = heading.match(/^(chapter|letter|book|volume|act)\s+([ivxlcdm]+|\d+)\b[).: -]*(.*)$/i)
  if (namedHeading) {
    const number = parseChapterNumber(namedHeading[2])
    if (!number) return null

    const label = `${capitalizeWord(namedHeading[1])} ${formatChapterMarker(namedHeading[2])}`
    const title = cleanHeadingTitle(namedHeading[3]) || label

    return { headingType: namedHeading[1].toLowerCase(), kind: 'named', label, number, title }
  }

  const numberedHeading = heading.match(/^([ivxlcdm]+|\d+)[.)]\s+(.+)$/i) || heading.match(/^([ivxlcdm]+|\d+)\s[-:]\s(.+)$/i)
  if (!numberedHeading || !isLikelyInlineChapterTitle(numberedHeading[2])) return null
  const number = parseChapterNumber(numberedHeading[1])
  if (!number) return null

  return {
    kind: 'numbered',
    label: `Chapter ${formatChapterMarker(numberedHeading[1])}`,
    number,
    title: cleanHeadingTitle(numberedHeading[2]),
  }
}

function parseStandaloneChapterMarker(line) {
  const marker = line.trim().match(/^([ivxlcdm]+|\d+)[.)]?$/i)?.[1]
  return marker && parseChapterNumber(marker) ? marker : ''
}

function parseChapterNumber(value) {
  const number = /^\d+$/.test(value) ? Number(value) : romanToNumber(value)
  return number && number <= MAX_DETECTED_CHAPTER_NUMBER ? number : null
}

function romanToNumber(value) {
  const romanValues = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
  const letters = value.toLowerCase()
  let total = 0

  for (let index = 0; index < letters.length; index += 1) {
    const current = romanValues[letters[index]]
    const next = romanValues[letters[index + 1]] || 0
    if (!current) return null
    total += current < next ? -current : current
  }

  return total || null
}

function findNextNonEmptyLine(lines, startIndex) {
  return lines.slice(startIndex).find((line) => line.text.trim())
}

function isReasonableHeadingLength(heading) {
  return heading.length >= 1 && heading.length <= 110
}

function isLikelyInlineChapterTitle(title) {
  const cleanTitle = cleanHeadingTitle(title)
  if (!cleanTitle || cleanTitle.length < 4 || cleanTitle.length > 100) return false
  if (/[.!?;:,]$/.test(cleanTitle) && cleanTitle.split(/\s+/).length > 8) return false

  return true
}

function isLikelyStandaloneChapterTitle(title) {
  const cleanTitle = cleanHeadingTitle(title)
  if (!cleanTitle || cleanTitle.length < 4 || cleanTitle.length > 100) return false
  if (/[.!?,;:]$/.test(cleanTitle)) return false

  const letters = cleanTitle.replace(/[^a-z]/gi, '')
  if (letters.length < 4) return false

  const uppercaseLetters = letters.replace(/[^A-Z]/g, '').length
  const uppercaseRatio = uppercaseLetters / letters.length

  return uppercaseRatio > 0.58 || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,10}$/.test(cleanTitle)
}

function trimLeadingTableOfContents(candidates) {
  const restartIndexes = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate, index }) => index > 0 && candidate.number === 1 && (candidates[index - 1].number || 0) > 1)
    .map(({ index }) => index)

  const restartIndex = restartIndexes.find(
    (index) => candidates.length - index >= 2 && isLikelyTableOfContentsBeforeRestart(candidates, index),
  )
  return restartIndex ? candidates.slice(restartIndex) : candidates
}

function isLikelyTableOfContentsBeforeRestart(candidates, restartIndex) {
  const leadingCandidates = candidates.slice(0, restartIndex)
  if (leadingCandidates.length < 3) return false

  const gaps = leadingCandidates
    .slice(0, -1)
    .map((candidate, index) => leadingCandidates[index + 1].index - candidate.index)
  const denseGaps = gaps.filter((gap) => gap <= 320).length
  const denseRatio = gaps.length ? denseGaps / gaps.length : 0
  const leadingSpan = leadingCandidates[leadingCandidates.length - 1].index - leadingCandidates[0].index

  return denseRatio >= 0.65 && leadingSpan <= leadingCandidates.length * 420
}

function cleanHeadingTitle(title = '') {
  const cleanedTitle = title
    .replace(/\s+/g, ' ')
    .replace(/^[\s\])}.'"“”‘’_:;-]+/, '')
    .replace(/[\s[({.'"“”‘’_:;-]+$/, '')
    .trim()

  return /[a-z0-9]/i.test(cleanedTitle) ? cleanedTitle : ''
}

function capitalizeWord(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function formatChapterMarker(marker) {
  return /^\d+$/.test(marker) ? String(Number(marker)) : marker.toUpperCase()
}

function estimateContentPageCount(text, fallbackPages, chapterCount) {
  const estimatedPages = Math.ceil(text.length / READER_PAGE_TARGET_LENGTH)
  const minimumPages = Math.max(1, chapterCount)
  const preferredPages = Math.max(minimumPages, estimatedPages)

  return Math.min(MAX_GENERATED_READER_PAGES, Math.max(minimumPages, preferredPages || fallbackPages))
}

function getChapterPageTotal(chapters) {
  return chapters.reduce((total, chapter) => total + Math.max(0, chapter.pages || 0), 0)
}

function groupChapterSections(sections, targetCount) {
  return Array.from({ length: targetCount }, (_, index) => {
    const start = Math.floor((index * sections.length) / targetCount)
    const end = Math.floor(((index + 1) * sections.length) / targetCount)
    const group = sections.slice(start, Math.max(start + 1, end))
    const firstChapter = group[0]

    return {
      number: firstChapter.number || index + 1,
      title: firstChapter.title,
      content: group.map((chapter) => chapter.content).join('\n\n'),
    }
  })
}

function distributePagesByContent(chapters, totalPages) {
  const chapterCount = Math.max(1, Math.min(chapters.length, totalPages))
  const availablePages = Math.max(0, totalPages - chapterCount)
  const totalLength = chapters.reduce((total, chapter) => total + Math.max(1, chapter.content.length), 0)
  const weightedPages = chapters.map((chapter) => {
    const weight = Math.max(1, chapter.content.length) / totalLength
    const exactExtraPages = weight * availablePages

    return {
      pages: 1 + Math.floor(exactExtraPages),
      remainder: exactExtraPages % 1,
    }
  })

  let assignedPages = weightedPages.reduce((total, chapter) => total + chapter.pages, 0)
  weightedPages
    .map((chapter, index) => ({ ...chapter, index }))
    .sort((first, second) => second.remainder - first.remainder)
    .forEach((chapter) => {
      if (assignedPages >= totalPages) return
      weightedPages[chapter.index].pages += 1
      assignedPages += 1
    })

  return weightedPages.map((chapter) => chapter.pages)
}

function groupEntries(entries, targetCount) {
  const groups = Array.from({ length: targetCount }, () => [])

  entries.forEach((entry, index) => {
    const groupIndex = Math.min(targetCount - 1, Math.floor((index * targetCount) / entries.length))
    groups[groupIndex].push(entry)
  })

  return groups.map((group) => group.join('\n\n'))
}

function splitTextIntoPages(text, pageCount) {
  const cleanText = text.replace(/\n{3,}/g, '\n\n').trim()
  const safePageCount = Math.max(1, pageCount)
  if (!cleanText) return Array.from({ length: safePageCount }, () => '')

  const targetLength = Math.max(360, Math.ceil(cleanText.length / safePageCount))
  const paragraphs = cleanText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => splitLongParagraph(paragraph, targetLength))
  const pages = []
  let currentPageText = ''

  paragraphs.forEach((paragraph) => {
    const nextPageText = [currentPageText, paragraph].filter(Boolean).join('\n\n')

    if (currentPageText && nextPageText.length > targetLength && pages.length < safePageCount - 1) {
      pages.push(currentPageText)
      currentPageText = paragraph
      return
    }

    currentPageText = nextPageText
  })

  if (currentPageText || !pages.length) pages.push(currentPageText)

  return normalizePageCount(pages, safePageCount)
}

function splitLongParagraph(paragraph, targetLength) {
  if (paragraph.length <= targetLength * 1.35) return [paragraph]

  const chunks = []
  const words = paragraph.split(/\s+/)
  let chunk = ''

  words.forEach((word) => {
    const nextChunk = [chunk, word].filter(Boolean).join(' ')

    if (chunk && nextChunk.length > targetLength) {
      chunks.push(chunk)
      chunk = word
      return
    }

    chunk = nextChunk
  })

  if (chunk) chunks.push(chunk)

  return chunks
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

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min))
}

export default ReaderPage

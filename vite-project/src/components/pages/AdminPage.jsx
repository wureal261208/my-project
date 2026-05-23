import { useMemo, useState } from 'react'
import { getAuthor, getCategory, getDescription, getReaderUrl } from '../../utils/bookUtils'
import { getBookChapters, getTotalPages } from '../../utils/chapterUtils'

const identityFields = [
  { name: 'title', label: 'Title', placeholder: 'Book title' },
  { name: 'author', label: 'Author', placeholder: 'Author name' },
  { name: 'category', label: 'Category', placeholder: 'Fantasy fiction' },
]

const mediaFields = [
  { name: 'readerUrl', label: 'Reader URL', placeholder: 'https://...', type: 'url' },
]

const NONE_COVER_URL = 'https://icons.veryicon.com/png/o/miscellaneous/myicon-1/none-1.png'

const languageChoices = [
  { value: 'en', label: 'English', disabled: false },
  { value: 'vi', label: 'Vietnamese - Coming soon', disabled: true },
  { value: 'jp', label: 'Japanese - Coming soon', disabled: true },
]

const adminBookFilters = [
  { id: 'all', label: 'All books' },
  { id: 'reader-ready', label: 'Ready for Reader' },
  { id: 'missing-cover', label: 'Missing Cover' },
  { id: 'missing-chapters', label: 'Missing Chapters' },
]

function AdminPage({
  addManagedBook,
  adminBook,
  books,
  editManagedBook,
  managedBooks,
  removeManagedBook,
  resetAdminBook,
  setAdminBook,
  setStaff,
  staff,
  users,
}) {
  const [activeAdminSection, setActiveAdminSection] = useState('book')
  const [bookFilter, setBookFilter] = useState('all')
  const [showPreview, setShowPreview] = useState(false)
  const publishedBooks = managedBooks.filter((book) => (book.status || 'published') === 'published').length
  const detailReadyBooks = managedBooks.filter((book) => !getBookWarnings(book).some((warning) => warning.id === 'description')).length
  const readerReadyBooks = managedBooks.filter((book) => isReaderReady(book)).length
  const currentErrors = getFormErrors(adminBook, managedBooks)
  const currentWarnings = getFormWarnings(adminBook)
  const previewBook = useMemo(() => createPreviewBook(adminBook), [adminBook])
  const filteredManagedBooks = managedBooks.filter((book) => {
    if (bookFilter === 'reader-ready') return isReaderReady(book)
    if (bookFilter === 'missing-cover') return !hasCover(book)
    if (bookFilter === 'missing-chapters') return !hasChapters(book)
    return true
  })

  function updateAdminBook(name, value) {
    setAdminBook({ ...adminBook, [name]: value })
  }

  function updateChapter(index, field, value) {
    const chapters = adminBook.chaptersDraft?.length ? adminBook.chaptersDraft : [createEmptyChapter(0)]
    setAdminBook({
      ...adminBook,
      chaptersDraft: chapters.map((chapter, chapterIndex) => (
        chapterIndex === index ? { ...chapter, [field]: value } : chapter
      )),
    })
  }

  function addChapter() {
    const chapters = adminBook.chaptersDraft?.length ? adminBook.chaptersDraft : []
    setAdminBook({
      ...adminBook,
      chaptersDraft: [...chapters, createEmptyChapter(chapters.length)],
    })
  }

  function removeChapter(index) {
    const chapters = adminBook.chaptersDraft?.length ? adminBook.chaptersDraft : [createEmptyChapter(0)]
    setAdminBook({
      ...adminBook,
      chaptersDraft: chapters.length === 1 ? [createEmptyChapter(0)] : chapters.filter((_, chapterIndex) => chapterIndex !== index),
    })
  }

  function updateCoverFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAdminBook((current) => ({ ...current, cover: reader.result }))
      }
    }
    reader.readAsDataURL(file)
  }

  function addStaff(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next = {
      id: Date.now(),
      name: form.get('name').trim(),
      email: form.get('email').trim().toLowerCase(),
      role: form.get('role'),
    }
    if (!next.name || !next.email) return
    setStaff((current) => [next, ...current.filter((item) => item.email !== next.email)])
    event.currentTarget.reset()
  }

  function handleBookSubmit(event) {
    if (currentErrors.length) {
      event.preventDefault()
      return
    }

    addManagedBook(event)
  }

  return (
    <div className="admin-page">
      <section className="page-title admin-title">
        <div>
          <p className="mono-eyebrow">Management</p>
          <h1>BookWorm management</h1>
        </div>
        <div className="admin-title-side">
          <p>
            Manage the books, reader content, access rules, and team accounts that directly affect the main BookWorm site.
          </p>
        </div>
      </section>

      <div className="admin-sticky-switcher">
        <div className="admin-section-tabs" role="tablist" aria-label="Management sections">
          <button className={activeAdminSection === 'book' ? 'active' : ''} onClick={() => setActiveAdminSection('book')} type="button">
            <i className="bi bi-journal-plus" />
            Push Book
          </button>
          <button className={activeAdminSection === 'team' ? 'active' : ''} onClick={() => setActiveAdminSection('team')} type="button">
            <i className="bi bi-person-plus" />
            Deputy Dev
          </button>
        </div>
      </div>

      <div className="metrics admin-metrics">
        <article><strong>{books.length}</strong><span>Books on main</span></article>
        <article><strong>{publishedBooks}</strong><span>Published managed books</span></article>
        <article><strong>{detailReadyBooks}</strong><span>Detail ready</span></article>
        <article><strong>{readerReadyBooks}</strong><span>Reader ready</span></article>
      </div>

      {activeAdminSection === 'book' ? (
        <section className="admin-workspace">
          <div className="section-heading">
            <div>
              <p className="mono-eyebrow">Main library</p>
              <h2>{adminBook.id ? 'Edit book' : 'Push new book'}</h2>
            </div>
            <span>Used by Home, Discover, Detail, and Reader</span>
          </div>

          <div className="admin-validation-panel" aria-live="polite">
            <strong>{currentErrors.length ? 'Cannot push yet' : currentWarnings.length ? 'Ready with notes' : 'Ready checklist'}</strong>
            {currentErrors.length ? (
              currentErrors.map((error) => (
                <span className="admin-validation-error" key={error.id}>
                  <i className="bi bi-x-circle" />
                  {error.message}
                </span>
              ))
            ) : currentWarnings.length ? (
              currentWarnings.map((warning) => (
                <span className="admin-validation-warning" key={warning.id}>
                  <i className="bi bi-exclamation-circle" />
                  {warning.message}
                </span>
              ))
            ) : (
              <span>
                <i className="bi bi-check-circle" />
                This book has the key Detail and Reader fields.
              </span>
            )}
          </div>

          <form className="admin-form admin-book-form" onSubmit={handleBookSubmit}>
            <fieldset>
              <legend>Detail information</legend>
              {identityFields.map((field) => (
                <label key={field.name}>
                  {field.label}
                  <input
                    type={field.type || 'text'}
                    value={adminBook[field.name]}
                    onChange={(event) => updateAdminBook(field.name, event.target.value)}
                    placeholder={field.placeholder}
                  />
                </label>
              ))}
              <label>
                Status
                <select value={adminBook.status} onChange={(event) => updateAdminBook('status', event.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>
              <div className="admin-choice-field">
                <span>Language</span>
                <div className="admin-choice-grid">
                  {languageChoices.map((choice) => (
                    <button
                      className={adminBook.language === choice.value ? 'active' : ''}
                      disabled={choice.disabled}
                      key={choice.value}
                      onClick={() => updateAdminBook('language', choice.value)}
                      type="button"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="wide-field">
                Description
                <textarea
                  value={adminBook.description}
                  onChange={(event) => updateAdminBook('description', event.target.value)}
                  placeholder="Short book description shown on the detail page."
                />
              </label>
              <label className="wide-field">
                Subjects
                <input
                  value={adminBook.subjects}
                  onChange={(event) => updateAdminBook('subjects', event.target.value)}
                  placeholder="Adventure, Mystery, Classic"
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Reader setup</legend>
              <div className="admin-cover-picker wide-field">
                <img
                  src={getAdminCover(adminBook)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.src = NONE_COVER_URL
                  }}
                />
                <div>
                  <label>
                    Cover URL
                    <input
                      value={adminBook.cover}
                      onChange={(event) => updateAdminBook('cover', event.target.value)}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="file-picker admin-cover-upload">
                    <i className="bi bi-image" />
                    Upload cover image
                    <input accept="image/*" onChange={updateCoverFile} type="file" />
                  </label>
                </div>
              </div>
              {mediaFields.map((field) => (
                <label key={field.name}>
                  {field.label}
                  <input
                    type={field.type || 'text'}
                    value={adminBook[field.name]}
                    onChange={(event) => updateAdminBook(field.name, event.target.value)}
                    placeholder={field.placeholder}
                  />
                </label>
              ))}
              <label className="wide-field">
                Reader text
                <textarea
                  value={adminBook.readerText}
                  onChange={(event) => updateAdminBook('readerText', event.target.value)}
                  placeholder="Optional full plain book text. Chapter content below is preferred."
                />
              </label>
            </fieldset>

            <fieldset className="admin-chapter-fieldset">
              <legend>Chapters</legend>
              <div className="admin-chapter-list">
                {(adminBook.chaptersDraft?.length ? adminBook.chaptersDraft : [createEmptyChapter(0)]).map((chapter, index) => (
                  <article className="admin-chapter-editor" key={`${index}-${chapter.title}`}>
                    <div className="admin-chapter-heading">
                      <strong>Chapter {index + 1}</strong>
                      <button className="ghost-button" onClick={() => removeChapter(index)} type="button">Remove</button>
                    </div>
                    <label>
                      Title
                      <input
                        value={chapter.title}
                        onChange={(event) => updateChapter(index, 'title', event.target.value)}
                        placeholder={`Chapter ${index + 1}`}
                      />
                    </label>
                    <label>
                      Pages
                      <input
                        min="1"
                        type="number"
                        value={chapter.pages}
                        onChange={(event) => updateChapter(index, 'pages', event.target.value)}
                      />
                    </label>
                    <label className="wide-field">
                      Content
                      <textarea
                        value={chapter.content}
                        onChange={(event) => updateChapter(index, 'content', event.target.value)}
                        placeholder="Paste this chapter content..."
                      />
                    </label>
                  </article>
                ))}
              </div>
              <button className="ghost-button admin-add-chapter" onClick={addChapter} type="button">
                <i className="bi bi-plus-circle" />
                Add chapter
              </button>
            </fieldset>

            <div className="admin-form-actions">
              <button className="ghost-button" onClick={() => setShowPreview(true)} type="button">
                <i className="bi bi-eye" />
                Preview as Detail
              </button>
              {adminBook.id && (
                <button className="ghost-button" onClick={resetAdminBook} type="button">
                  Cancel edit
                </button>
              )}
              <button className="primary-button" disabled={currentErrors.length > 0} type="submit">
                <i className="bi bi-cloud-upload" />
                {adminBook.id ? 'Update book' : 'Add book to management'}
              </button>
            </div>
          </form>

          <div className="admin-filter-bar" aria-label="Filter admin books">
            {adminBookFilters.map((filter) => (
              <button className={bookFilter === filter.id ? 'active' : ''} key={filter.id} onClick={() => setBookFilter(filter.id)} type="button">
                {filter.label}
              </button>
            ))}
          </div>

          <div className="admin-two-col">
            <section className="admin-table">
              <h2>Managed books</h2>
              {filteredManagedBooks.length ? (
                filteredManagedBooks.map((book) => {
                  const totalPages = getTotalPages(book)
                  const chapters = getBookChapters(book, totalPages)
                  const warnings = getBookWarnings(book)

                  return (
                    <div className="table-row admin-book-row" key={book.id}>
                      <img
                        src={getAdminCover(book)}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.src = NONE_COVER_URL
                        }}
                      />
                      <span>
                        {book.title}
                        <em className={`admin-status status-${book.status || 'published'}`}>{book.status || 'published'}</em>
                      </span>
                      <small>{getAuthor(book)} - {getCategory(book)} - {chapters.length} chapters</small>
                      <div className="admin-row-actions">
                        {warnings.length > 0 && <strong>{warnings.length} warnings</strong>}
                        <button className="ghost-button" onClick={() => editManagedBook(book)} type="button">Edit</button>
                        <button className="ghost-button" onClick={() => removeManagedBook(book.id)} type="button">Remove</button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p>No books match this filter.</p>
              )}
            </section>

            <section className="admin-table admin-guidelines">
              <h2>Main site checklist</h2>
              <div className="admin-check-row">
                <i className="bi bi-house" />
                <span>Home needs title, cover, category, and author.</span>
              </div>
              <div className="admin-check-row">
                <i className="bi bi-journal-text" />
                <span>Detail needs description, pages, chapters, language, and subjects.</span>
              </div>
              <div className="admin-check-row">
                <i className="bi bi-book" />
                <span>Reader needs reader URL, full reader text, or chapter content.</span>
              </div>
            </section>
          </div>
        </section>
      ) : (
        <section className="admin-workspace">
          <div className="section-heading">
            <div>
              <p className="mono-eyebrow">Team access</p>
              <h2>Deputy dev</h2>
            </div>
            <span>Management accounts that can maintain the main site</span>
          </div>

          <form className="admin-form compact-form" onSubmit={addStaff}>
            <p className="form-note">
              Staff created here can login with their email and default password <strong>Admin123</strong> to access Management.
            </p>
            <label>Name<input name="name" placeholder="Deputy name" /></label>
            <label>Email<input name="email" placeholder="deputy@bookworm.com" type="email" /></label>
            <label>
              Role
              <select name="role" defaultValue="coop">
                <option value="deputy-dev">Deputy dev</option>
                <option value="coop">Coop</option>
              </select>
            </label>
            <button className="primary-button" type="submit">Create account</button>
          </form>

          <div className="admin-two-col">
            <section className="admin-table staff-table">
              <h2>Deputy dev / coop accounts</h2>
              {staff.length ? (
                staff.map((member) => (
                  <div className="table-row" key={member.email}>
                    <span>{member.name}</span>
                    <small>{member.email}</small>
                    <strong>{member.role}</strong>
                  </div>
                ))
              ) : (
                <p>No deputy or coop accounts yet.</p>
              )}
            </section>

            <section className="admin-table">
              <h2>Known main users</h2>
              {users.length ? (
                users.map((user) => (
                  <div className="table-row" key={user.email}>
                    <span>{user.name}</span>
                    <small>{user.email}</small>
                    <strong>{user.role}</strong>
                  </div>
                ))
              ) : (
                <p>No users recorded yet.</p>
              )}
            </section>
          </div>
        </section>
      )}

      {showPreview && <AdminDetailPreview book={previewBook} onClose={() => setShowPreview(false)} />}
    </div>
  )
}

function AdminDetailPreview({ book, onClose }) {
  const totalPages = getTotalPages(book)
  const chapters = getBookChapters(book, totalPages)

  return (
    <div className="reader-modal-backdrop admin-preview-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-preview-title">
      <div className="admin-preview-modal">
        <button aria-label="Close preview" className="admin-preview-close" onClick={onClose} type="button">
          <i className="bi bi-x-lg" />
        </button>
        <img
          src={getAdminCover(book)}
          alt=""
          onError={(event) => {
            event.currentTarget.src = NONE_COVER_URL
          }}
        />
        <div>
          <p className="mono-eyebrow">{getCategory(book)}</p>
          <h2 id="admin-preview-title">{book.title || 'Untitled book'}</h2>
          <p>{getAuthor(book)}</p>
          <p>{getDescription(book)}</p>
          <div className="admin-preview-meta">
            <span>{totalPages} pages</span>
            <span>{chapters.length} chapters</span>
            <span>{book.languages?.[0]?.toUpperCase() || 'EN'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function createPreviewBook(adminBook) {
  const subjects = adminBook.subjects
    .split(',')
    .map((subject) => subject.trim())
    .filter(Boolean)
  const chapters = normalizePreviewChapters(adminBook.chaptersDraft)

  return {
    ...adminBook,
    id: adminBook.id || 'admin-preview',
    title: adminBook.title.trim() || 'Untitled book',
    author: adminBook.author.trim() || 'BookWorm editor',
    category: adminBook.category.trim() || 'Admin pick',
    authors: [{ name: adminBook.author.trim() || 'BookWorm editor' }],
    bookshelves: [adminBook.category.trim() || 'Admin pick'],
    subjects,
    languages: ['en'],
    pageCount: chapters.reduce((total, chapter) => total + chapter.pages, 0) || 120,
    chapterCount: chapters.length || 1,
    chapterList: chapters,
    formats: {
      ...(adminBook.cover.trim() ? { 'image/jpeg': adminBook.cover.trim() } : {}),
      ...(adminBook.readerUrl.trim() ? { 'text/html': adminBook.readerUrl.trim() } : {}),
    },
  }
}

function getAdminCover(book) {
  return book.formats?.['image/jpeg'] || book.cover || NONE_COVER_URL
}

function normalizePreviewChapters(chapters = []) {
  let startPage = 1
  return (chapters.length ? chapters : [createEmptyChapter(0)]).map((chapter, index) => {
    const pages = Number(chapter.pages) > 0 ? Math.floor(Number(chapter.pages)) : 1
    const nextChapter = {
      number: index + 1,
      title: chapter.title?.trim() || `Chapter ${index + 1}`,
      startPage,
      pages,
      content: chapter.content || '',
    }
    startPage += pages
    return nextChapter
  })
}

function getFormWarnings(book) {
  const errors = new Set(getFormErrors(book).map((error) => error.id))

  return [
    !book.subjects?.split(',').some((subject) => hasText(subject)) && {
      id: 'subjects',
      message: 'Add subjects to make Discover filtering better.',
    },
    !book.chaptersDraft?.some((chapter) => hasText(chapter.content)) && hasText(book.readerUrl) && {
      id: 'chapter-content',
      message: 'Reader can open the URL, but pasted chapter content gives the best in-app reading page.',
    },
  ].filter(Boolean).filter((warning) => !errors.has(warning.id))
}

function getFormErrors(book, managedBooks = []) {
  const duplicateTitle = managedBooks.some((managedBook) => (
    managedBook.id !== book.id && managedBook.title?.trim().toLowerCase() === book.title.trim().toLowerCase()
  ))

  return [
    !hasText(book.title) && { id: 'title', message: 'Add a title.' },
    duplicateTitle && { id: 'duplicate-title', message: 'A managed book already uses this title.' },
    !hasText(book.author) && { id: 'author', message: 'Add an author.' },
    !hasText(book.category) && { id: 'category', message: 'Choose a category or shelf.' },
    !hasText(book.cover) && { id: 'cover', message: 'Add a cover URL or upload a cover image.' },
    !isValidImageSource(book.cover) && { id: 'cover-url', message: 'Cover must be an http(s) image URL or an uploaded image.' },
    !hasText(book.description) && { id: 'description', message: 'Add a description for the detail page.' },
    !hasReaderSource(book) && { id: 'reader', message: 'Add a reader URL, full reader text, or chapter content.' },
    hasText(book.readerUrl) && !isValidHttpUrl(book.readerUrl) && { id: 'reader-url', message: 'Reader URL must start with http:// or https://.' },
    !hasValidChapterDraft(book) && { id: 'chapters', message: 'Add at least one chapter with a title and page count above 0.' },
  ].filter(Boolean)
}

function getBookWarnings(book) {
  return [
    !hasCover(book) && { id: 'cover' },
    !hasText(book.description) && { id: 'description' },
    !isReaderReady(book) && { id: 'reader' },
    !hasChapters(book) && { id: 'chapters' },
  ].filter(Boolean)
}

function createEmptyChapter(index) {
  return { title: `Chapter ${index + 1}`, pages: '10', content: '' }
}

function hasText(value) {
  return String(value || '').trim().length > 0
}

function hasCover(book) {
  return Boolean(book.formats?.['image/jpeg'] || book.cover)
}

function hasChapters(book) {
  return Boolean(book.chapterCount || book.chapterList?.length || book.chapters?.length)
}

function isReaderReady(book) {
  return Boolean(getReaderUrl(book) || book.readerText || book.chapterList?.some((chapter) => chapter.content))
}

function hasReaderSource(book) {
  return Boolean(hasText(book.readerUrl) || hasText(book.readerText) || book.chaptersDraft?.some((chapter) => hasText(chapter.content)))
}

function hasValidChapterDraft(book) {
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

export default AdminPage

import { getAuthor, getCover, getInitials } from '../../utils/bookUtils'

function ProfilePage({ account, books, favorites, highlights = {}, history, onRead, progress, readingDays = [], viewCounts }) {
  const savedBooks = books.filter((book) => favorites.includes(book.id))
  const readingBooks = books.filter((book) => (progress[book.id] || 0) > 0 && (progress[book.id] || 0) < 100)
  const finishedBooks = books.filter((book) => (progress[book.id] || 0) >= 100)
  const recentBooks = history.map((id) => books.find((book) => book.id === id)).filter(Boolean).slice(0, 6)
  const streak = getReadingStreak(readingDays)
  const highlightList = Object.values(highlights)
    .flat()
    .map((highlight) => ({ ...highlight, book: books.find((book) => book.id === highlight.bookId) }))
    .filter((highlight) => highlight.book)
    .slice(0, 6)

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar">{getInitials(account.name)}</div>
        <div>
          <p className="mono-eyebrow">My account</p>
          <h1>{account.name}</h1>
          <p>{account.email}</p>
        </div>
      </section>

      <section className="metrics">
        <article><strong>{savedBooks.length}</strong><span>Saved books</span></article>
        <article><strong>{streak}</strong><span>Day streak</span></article>
        <article><strong>{readingBooks.length}</strong><span>Reading</span></article>
        <article><strong>{finishedBooks.length}</strong><span>Finished</span></article>
      </section>

      <ProfileShelf title="My shelf" books={savedBooks} onRead={onRead} progress={progress} viewCounts={viewCounts} />
      <ProfileShelf title="Currently reading" books={readingBooks} onRead={onRead} progress={progress} viewCounts={viewCounts} />
      <HighlightShelf highlights={highlightList} />
      <ProfileShelf title="History" books={recentBooks} onRead={onRead} progress={progress} viewCounts={viewCounts} />

      <section className="settings-panel">
        <h2>Settings</h2>
        <label>
          Reader mode
          <select defaultValue="sepia">
            <option value="sepia">Sepia</option>
            <option value="focus">Focus</option>
            <option value="night">Night</option>
          </select>
        </label>
      </section>
    </div>
  )
}

function HighlightShelf({ highlights }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <h2>Quote highlights</h2>
      </div>
      {highlights.length ? (
        <div className="highlight-list">
          {highlights.map((highlight) => (
            <article className="highlight-item" key={highlight.id}>
              <img loading="lazy" src={getCover(highlight.book)} alt={`${highlight.book.title} cover`} />
              <div>
                <strong>{highlight.book.title}</strong>
                <p>{highlight.text}</p>
                <small>{highlight.location}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No highlights yet.</div>
      )}
    </section>
  )
}

function ProfileShelf({ books, onRead, progress, title, viewCounts }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {books.length ? (
        <div className="shelf-list">
          {books.map((book) => (
            <article className="shelf-item" key={book.id}>
              <img loading="lazy" src={getCover(book)} alt={`${book.title} cover`} />
              <div>
                <h2>{book.title}</h2>
                <p>{getAuthor(book)}</p>
                <small>{((book.download_count || 0) + (viewCounts?.[book.id] || 0)).toLocaleString()} reads</small>
                <progress max="100" value={progress[book.id] || 0} />
              </div>
              <button className="primary-button" onClick={() => onRead(book)} type="button">
                Read
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">Nothing here yet.</div>
      )}
    </section>
  )
}

function getReadingStreak(days) {
  const daySet = new Set(days)
  const cursor = new Date()
  let streak = 0

  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export default ProfilePage

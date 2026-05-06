import { getAuthor, getCover, getInitials } from '../../utils/bookUtils'

function ProfilePage({ account, books, favorites, history, onRead, progress }) {
  const savedBooks = books.filter((book) => favorites.includes(book.id))
  const readingBooks = books.filter((book) => (progress[book.id] || 0) > 0 && (progress[book.id] || 0) < 100)
  const finishedBooks = books.filter((book) => (progress[book.id] || 0) >= 100)
  const recentBooks = history.map((id) => books.find((book) => book.id === id)).filter(Boolean).slice(0, 6)

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
        <article><strong>{readingBooks.length}</strong><span>Reading</span></article>
        <article><strong>{finishedBooks.length}</strong><span>Finished</span></article>
      </section>

      <ProfileShelf title="My shelf" books={savedBooks} onRead={onRead} progress={progress} />
      <ProfileShelf title="Currently reading" books={readingBooks} onRead={onRead} progress={progress} />
      <ProfileShelf title="History" books={recentBooks} onRead={onRead} progress={progress} />

      <section className="settings-panel">
        <h2>Settings</h2>
        <label>
          Reader mode
          <select defaultValue="system">
            <option value="system">System</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </label>
      </section>
    </div>
  )
}

function ProfileShelf({ books, onRead, progress, title }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {books.length ? (
        <div className="shelf-list">
          {books.map((book) => (
            <article className="shelf-item" key={book.id}>
              <img src={getCover(book)} alt={`${book.title} cover`} />
              <div>
                <h2>{book.title}</h2>
                <p>{getAuthor(book)}</p>
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

export default ProfilePage

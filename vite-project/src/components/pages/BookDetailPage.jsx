import { getAuthor, getCategory, getCover, getDescription } from '../../utils/bookUtils'

function BookDetailPage({ book, favorites, onBack, onFavorite, onRead }) {
  if (!book) {
    return (
      <div className="empty-state">
        Select a book first.
        <button className="primary-button" onClick={onBack} type="button">Back to library</button>
      </div>
    )
  }

  const rating = Math.min(5, Math.max(3.8, (book.download_count || 1000) / 25000 + 3.6)).toFixed(1)

  return (
    <section className="detail-page">
      <button className="ghost-button back-button" onClick={onBack} type="button">
        <i className="bi bi-arrow-left" />
        Back
      </button>

      <div className="detail-layout">
        <img src={getCover(book)} alt={`${book.title} cover`} />
        <div className="detail-copy">
          <p className="mono-eyebrow">{getCategory(book)}</p>
          <h1>{book.title}</h1>
          <p className="detail-author">{getAuthor(book)}</p>
          <div className="rating-row" aria-label={`${rating} out of 5 stars`}>
            <span>{rating}</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <i className={`bi ${star <= Math.round(rating) ? 'bi-star-fill' : 'bi-star'}`} key={star} />
            ))}
            <small>{book.download_count?.toLocaleString() || 0} reads</small>
          </div>
          <p className="book-description">{getDescription(book)}</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onRead(book)} type="button">
              <i className="bi bi-book" />
              Read now
            </button>
            <button className="ghost-button" onClick={() => onFavorite(book.id)} type="button">
              <i className={`bi ${favorites.includes(book.id) ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
              {favorites.includes(book.id) ? 'Saved' : 'Save book'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BookDetailPage

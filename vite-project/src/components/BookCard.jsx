import { getAuthor, getCategory, getCover } from '../utils/bookUtils'

function BookCard({ book, favorites, onFavorite, onRead }) {
  return (
    <article className="book-card">
      <img src={getCover(book)} alt={`${book.title} cover`} />
      <div>
        <span className="category">{getCategory(book)}</span>
        <h2>{book.title}</h2>
        <p>{getAuthor(book)}</p>
        <small>{book.download_count?.toLocaleString() || 0} reads</small>
      </div>
      <div className="card-actions">
        <button className="primary-button" onClick={() => onRead(book)}>
          Read
        </button>
        <button className="ghost-button" onClick={() => onFavorite(book.id)}>
          {favorites.includes(book.id) ? 'Saved' : 'Save'}
        </button>
      </div>
    </article>
  )
}

export default BookCard

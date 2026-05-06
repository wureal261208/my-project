import { getAuthor, getCategory, getCover } from '../../utils/bookUtils'

function BookCard({ book, favorites = [], onDetail, onFavorite, onRead }) {
  return (
    <article className="book-card">
      <button className="book-cover-button" onClick={() => onDetail(book)} type="button">
        <img src={getCover(book)} alt={`${book.title} cover`} />
      </button>
      <div>
        <span className="category">{getCategory(book)}</span>
        <h2>{book.title}</h2>
        <p>{getAuthor(book)}</p>
        <small>{book.download_count?.toLocaleString() || 0} reads</small>
      </div>
      <div className="card-actions">
        <button className="primary-button" onClick={() => onRead(book)} type="button">
          <i className="bi bi-book" />
          Read
        </button>
        <button className="ghost-button" onClick={() => onFavorite(book.id)} type="button">
          <i className={`bi ${favorites.includes(book.id) ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
          {favorites.includes(book.id) ? 'Saved' : 'Save'}
        </button>
      </div>
    </article>
  )
}

export default BookCard

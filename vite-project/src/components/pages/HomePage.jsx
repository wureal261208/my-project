import { getAuthor, getCategory, getCover } from '../../utils/bookUtils'
import BookGrid from '../books/BookGrid'

function HomePage({ books, favorites, onDetail, onFavorite, onRead, setPage, topics }) {
  const hotBooks = books.slice(0, 6)
  const recommended = books.slice(6, 14)
  const featured = hotBooks[0]

  return (
    <div className="home-page">
      {featured && (
        <section className="hero-carousel">
          <div className="hero-copy">
            <p className="mono-eyebrow">Featured reading</p>
            <h1>{featured.title}</h1>
            <p>{getAuthor(featured)} · {getCategory(featured)}</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => onRead(featured)} type="button">
                <i className="bi bi-book" />
                Read now
              </button>
              <button className="ghost-button" onClick={() => onDetail(featured)} type="button">
                <i className="bi bi-info-circle" />
                Detail
              </button>
            </div>
          </div>
          <div className="carousel-track" aria-label="Hot books carousel">
            {hotBooks.map((book, index) => (
              <button className={index === 0 ? 'active' : ''} key={book.id} onClick={() => onDetail(book)} type="button">
                <img src={getCover(book)} alt={`${book.title} cover`} />
                <span>{book.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="mono-eyebrow">Popular now</p>
            <h2>Hot books</h2>
          </div>
          <button className="ghost-button" onClick={() => setPage('discover')} type="button">
            View library
          </button>
        </div>
        <BookGrid books={hotBooks} favorites={favorites} onDetail={onDetail} onFavorite={onFavorite} onRead={onRead} />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="mono-eyebrow">For your shelf</p>
            <h2>Recommended</h2>
          </div>
        </div>
        <BookGrid books={recommended} favorites={favorites} onDetail={onDetail} onFavorite={onFavorite} onRead={onRead} />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="mono-eyebrow">Browse by mood</p>
            <h2>Featured categories</h2>
          </div>
        </div>
        <div className="category-grid">
          {topics.slice(1, 9).map((topic) => (
            <button key={topic} onClick={() => setPage('discover', topic)} type="button">
              <i className="bi bi-tag" />
              <span>{topic}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage

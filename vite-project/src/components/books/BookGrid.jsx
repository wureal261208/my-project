import BookCard from './BookCard'

function BookGrid({ books, favorites, onDetail, onFavorite, onRead, viewCounts }) {
  return (
    <section className="book-grid">
      {books.map((book) => (
        <BookCard
          book={book}
          favorites={favorites}
          key={book.id}
          onDetail={onDetail}
          onFavorite={onFavorite}
          onRead={onRead}
          viewCount={viewCounts?.[book.id] || 0}
        />
      ))}
    </section>
  )
}

export default BookGrid

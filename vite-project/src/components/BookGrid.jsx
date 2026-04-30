import BookCard from './BookCard'

function BookGrid({ books, favorites, onFavorite, onRead }) {
  return (
    <section className="book-grid">
      {books.map((book) => (
        <BookCard
          book={book}
          favorites={favorites}
          key={book.id}
          onFavorite={onFavorite}
          onRead={onRead}
        />
      ))}
    </section>
  )
}

export default BookGrid

import { getAuthor, getCover } from '../../utils/bookUtils'

function ShelfPage({ books, notes, onFavorite, onRead, progress }) {
  if (!books.length) {
    return <section className="empty-state">Your shelf is empty. Save books from the library to build it.</section>
  }

  return (
    <section className="shelf-list">
      {books.map((book) => (
        <article className="shelf-item" key={book.id}>
          <img src={getCover(book)} alt="" />
          <div>
            <h2>{book.title}</h2>
            <p>{getAuthor(book)}</p>
            <progress value={progress[book.id] || 0} max="100" />
            <small>{notes[book.id] ? 'Has reading notes' : 'No notes yet'}</small>
          </div>
          <button className="primary-button" onClick={() => onRead(book)}>
            Continue
          </button>
          <button className="ghost-button" onClick={() => onFavorite(book.id)}>
            Remove
          </button>
        </article>
      ))}
    </section>
  )
}

export default ShelfPage

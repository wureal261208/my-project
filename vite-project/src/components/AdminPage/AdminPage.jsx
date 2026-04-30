import { getAuthor } from '../../utils/bookUtils'

function AdminPage({
  addLocalBook,
  adminBook,
  books,
  localBooks,
  removeLocalBook,
  setAdminBook,
}) {
  return (
    <section className="admin-grid">
      <div className="metrics">
        <article>
          <strong>{books.length}</strong>
          <span>Total books</span>
        </article>
        <article>
          <strong>{localBooks.length}</strong>
          <span>Admin books</span>
        </article>
        <article>
          <strong>Gutendex</strong>
          <span>Live source</span>
        </article>
      </div>

      <form className="admin-form" onSubmit={addLocalBook}>
        <h2>Add local book</h2>
        {['title', 'author', 'category', 'readerUrl', 'cover'].map((field) => (
          <label key={field}>
            {field === 'readerUrl' ? 'Reader URL' : field}
            <input
              value={adminBook[field]}
              onChange={(event) => setAdminBook({ ...adminBook, [field]: event.target.value })}
              placeholder={field === 'cover' ? 'https://...' : ''}
            />
          </label>
        ))}
        <button className="primary-button" type="submit">
          Add book
        </button>
      </form>

      <div className="admin-table">
        <h2>Local catalog</h2>
        {localBooks.length ? (
          localBooks.map((book) => (
            <div className="table-row" key={book.id}>
              <span>{book.title}</span>
              <small>{getAuthor(book)}</small>
              <button className="ghost-button" onClick={() => removeLocalBook(book.id)}>
                Remove
              </button>
            </div>
          ))
        ) : (
          <p>No local admin books yet.</p>
        )}
      </div>
    </section>
  )
}

export default AdminPage

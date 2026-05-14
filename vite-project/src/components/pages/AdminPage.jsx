import { getAuthor } from '../../utils/bookUtils'

const adminBookFields = [
  { name: 'title', label: 'Title' },
  { name: 'author', label: 'Author' },
  { name: 'category', label: 'Category' },
  { name: 'readerUrl', label: 'Reader URL', placeholder: 'https://...' },
  { name: 'cover', label: 'Cover URL', placeholder: 'https://...' },
  { name: 'pageCount', label: 'Total pages', placeholder: '120', type: 'number' },
  { name: 'chapterCount', label: 'Chapters', placeholder: '12', type: 'number' },
]

function AdminPage({
  addLocalBook,
  adminBook,
  books,
  localBooks,
  removeLocalBook,
  setAdminBook,
  setStaff,
  staff,
  users,
}) {
  function addStaff(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next = {
      id: Date.now(),
      name: form.get('name').trim(),
      email: form.get('email').trim().toLowerCase(),
      role: form.get('role'),
    }
    if (!next.name || !next.email) return
    setStaff((current) => [next, ...current.filter((item) => item.email !== next.email)])
    event.currentTarget.reset()
  }

  return (
    <div className="admin-page">
      <section className="page-title">
        <p className="mono-eyebrow">Admin</p>
        <h1>BookWorm control panel</h1>
      </section>

      <div className="metrics">
        <article><strong>{users.length}</strong><span>Known users</span></article>
        <article><strong>{books.length}</strong><span>Total books</span></article>
        <article><strong>{staff.length}</strong><span>Deputy / coop</span></article>
      </div>

      <form className="admin-form" onSubmit={addLocalBook}>
        <h2>Push new book</h2>
        {adminBookFields.map((field) => (
          <label key={field.name}>
            {field.label}
            <input
              min={field.type === 'number' ? '1' : undefined}
              type={field.type || 'text'}
              value={adminBook[field.name]}
              onChange={(event) => setAdminBook({ ...adminBook, [field.name]: event.target.value })}
              placeholder={field.placeholder || ''}
            />
          </label>
        ))}
        <label>
          Reader text
          <textarea
            value={adminBook.readerText}
            onChange={(event) => setAdminBook({ ...adminBook, readerText: event.target.value })}
            placeholder="Paste plain book text here to split it into chapters without an external reader URL."
          />
        </label>
        <button className="primary-button" type="submit">
          <i className="bi bi-cloud-upload" />
          Add book
        </button>
      </form>

      <div className="admin-two-col">
        <section className="admin-table">
          <h2>Local books</h2>
          {localBooks.length ? (
            localBooks.map((book) => (
              <div className="table-row" key={book.id}>
                <span>{book.title}</span>
                <small>{getAuthor(book)}</small>
                <button className="ghost-button" onClick={() => removeLocalBook(book.id)} type="button">Remove</button>
              </div>
            ))
          ) : (
            <p>No admin books yet.</p>
          )}
        </section>

        <section className="admin-table">
          <h2>Users</h2>
          {users.map((user) => (
            <div className="table-row" key={user.email}>
              <span>{user.name}</span>
              <small>{user.email}</small>
              <strong>{user.role}</strong>
            </div>
          ))}
        </section>
      </div>

      <form className="admin-form compact-form" onSubmit={addStaff}>
        <h2>Create deputy dev / coop</h2>
        <p className="form-note">
          Staff created here can login with their email and default password <strong>Admin123</strong> to access Admin.
        </p>
        <label>Name<input name="name" placeholder="Deputy name" /></label>
        <label>Email<input name="email" placeholder="deputy@bookworm.com" type="email" /></label>
        <label>
          Role
          <select name="role" defaultValue="coop">
            <option value="deputy-dev">Deputy dev</option>
            <option value="coop">Coop</option>
          </select>
        </label>
        <button className="primary-button" type="submit">Create</button>
      </form>

      <section className="admin-table staff-table">
        <h2>Deputy dev / coop accounts</h2>
        {staff.length ? (
          staff.map((member) => (
            <div className="table-row" key={member.email}>
              <span>{member.name}</span>
              <small>{member.email}</small>
              <strong>{member.role}</strong>
            </div>
          ))
        ) : (
          <p>No deputy or coop accounts yet.</p>
        )}
      </section>
    </div>
  )
}

export default AdminPage

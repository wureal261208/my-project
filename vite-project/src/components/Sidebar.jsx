function Sidebar({ account, activePage, onLogout, setActivePage }) {
  return (
    <aside className="sidebar">
      <div className="brand-mark">BookWorm</div>
      <nav>
        <button className={activePage === 'library' ? 'active' : ''} onClick={() => setActivePage('library')}>
          Library
        </button>
        <button className={activePage === 'shelf' ? 'active' : ''} onClick={() => setActivePage('shelf')}>
          My shelf
        </button>
        {account.role === 'admin' && (
          <button className={activePage === 'admin' ? 'active' : ''} onClick={() => setActivePage('admin')}>
            Admin
          </button>
        )}
      </nav>
      <button className="logout" onClick={onLogout}>
        Logout
      </button>
    </aside>
  )
}

export default Sidebar

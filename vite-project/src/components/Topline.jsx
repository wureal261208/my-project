function Topline({ account, activePage, status }) {
  return (
    <header className="topline">
      <div>
        <p className="eyebrow">{status}</p>
        <h1>{activePage === 'admin' ? 'Admin dashboard' : 'Discover your next read'}</h1>
      </div>
      <div className="account-pill">
        <span>{account.name}</span>
        <strong>{account.role}</strong>
      </div>
    </header>
  )
}

export default Topline

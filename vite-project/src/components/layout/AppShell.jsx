import { getInitials } from '../../utils/bookUtils'
import logo from '../../assets/logo.jpg'

const navItems = [
  { id: 'home', label: 'Home', icon: 'bi-house' },
  { id: 'discover', label: 'Discover', icon: 'bi-compass' },
  { id: 'profile', label: 'Profile', icon: 'bi-person-circle', private: true },
  { id: 'admin', label: 'Admin', icon: 'bi-shield-lock', admin: true },
]

function AppShell({ account, activePage, children, onAuth, onGuest, onLogout, setActivePage }) {
  const isGuest = account?.role === 'guest'
  const displayName = account?.name || 'None Account'

  return (
    <div className="book-app">
      <header className="site-header">
        <button className="brand-button" onClick={() => setActivePage('home')} type="button">
          <img src={logo} alt="BookWorm logo" />
          <span>BookWorm</span>
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            if (item.admin && account?.role !== 'admin') return null
            if (item.private && isGuest) return null

            return (
              <button
                className={activePage === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => setActivePage(item.id)}
                type="button"
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="header-account">
          <button className="avatar-chip" onClick={() => (isGuest ? onAuth() : setActivePage('profile'))} type="button">
            <span>{getInitials(displayName)}</span>
            <strong>{displayName}</strong>
          </button>
          {isGuest ? (
            <>
              <button className="ghost-button" onClick={onGuest} type="button">
                None account
              </button>
              <button className="primary-button" onClick={onAuth} type="button">
                Login
              </button>
            </>
          ) : (
            <button className="ghost-button" onClick={onLogout} type="button">
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="page-shell">{children}</main>
    </div>
  )
}

export default AppShell

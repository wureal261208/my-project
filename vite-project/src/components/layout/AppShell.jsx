import { getInitials } from '../../utils/bookUtils'
import logo from '../../assets/logo.jpg'
import { useNavigation } from '../../context/navigation'

const navItems = [
  { id: 'home', label: 'Home', icon: 'bi-house' },
  { id: 'discover', label: 'Discover', icon: 'bi-compass' },
  { id: 'profile', label: 'Profile', icon: 'bi-person-circle', private: true },
  { id: 'admin', label: 'Admin', icon: 'bi-shield-lock', admin: true },
]

function AppShell({ account, children, onAuth, onGuest, onLogout, websiteTheme = 'paper' }) {
  const { activePage, isPageLoading, navigateTo } = useNavigation()
  const isGuest = account?.role === 'guest'
  const isAdminPage = activePage === 'admin'
  const displayName = account?.name || 'None Account'
  const visibleNavItems = ['admin', 'profile'].includes(activePage)
    ? navItems.filter((item) => item.id === activePage || (activePage === 'admin' && item.id === 'profile'))
    : navItems

  return (
    <div className={`book-app app-theme-${websiteTheme}`}>
      <header className="site-header">
        <button className="brand-button" onClick={() => !isAdminPage && navigateTo('home')} type="button">
          <img src={logo} alt="BookWorm logo" />
          <span>BookWorm</span>
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          {visibleNavItems.map((item) => {
            if (item.admin && account?.role !== 'admin') return null
            if (item.private && isGuest) return null

            return (
              <button
                className={activePage === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => navigateTo(item.id)}
                type="button"
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {!isAdminPage && (
          <div className="header-account">
            <button className="avatar-chip" onClick={() => (isGuest ? onAuth() : navigateTo('profile'))} type="button">
              <span>
                {account?.avatar ? <img src={account.avatar} alt="" /> : getInitials(displayName)}
              </span>
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
        )}
      </header>

      <main className="page-shell">{children}</main>
      {!isAdminPage && <footer className="site-footer">
        <section className="footer-brand">
          <div className="footer-logo">
            <img src={logo} alt="BookWorm logo" />
          </div>
          <div>
            <strong>BookWorm</strong>
            <p>A focused digital library for keeping books, comments, and checkpoints in one quiet place.</p>
          </div>
        </section>
        <section className="footer-columns">
          <nav aria-label="Footer navigation">
            <span>Explore</span>
            {!['admin', 'profile'].includes(activePage) && (
              <>
                <button className="footer-link" onClick={() => navigateTo('home')} type="button">Home</button>
                <button className="footer-link" onClick={() => navigateTo('discover')} type="button">Discover</button>
              </>
            )}
            {!isGuest && <button onClick={() => navigateTo('profile')} type="button">Profile</button>}
            {activePage === 'admin' && <button onClick={() => navigateTo('admin')} type="button">Admin</button>}
          </nav>
          <div>
            <span>Reader tools</span>
            <p>Checkpoint sync</p>
            <p>Personal notes - Coming soon</p>
            <p>Community comments</p>
          </div>
        </section>
      </footer>}
      {isPageLoading && (
        <div className="route-loader" role="status">
          <img src={logo} alt="BookWorm logo" />
          <span>Opening page...</span>
        </div>
      )}
    </div>
  )
}

export default AppShell

function AuthPage({
  authForm,
  authError,
  authMode,
  handleAuth,
  setAuthForm,
  setAuthMode,
}) {
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <p className="eyebrow">BookWorm Library</p>
        <h1>Read public-domain books and manage your own reading shelf.</h1>
        <p>
          Search Gutendex, open Gutenberg books in a focused reader, save favorites,
          track progress, and switch into the admin console when needed.
        </p>
        <div className="hero-stats">
          <span>70k+ Gutendex titles</span>
          <span>Reader notes</span>
          <span>Admin catalog</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
            Login
          </button>
          <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>
            Sign up
          </button>
        </div>
        <form onSubmit={handleAuth}>
          {authMode === 'signup' && (
            <label>
              Name
              <input
                value={authForm.name}
                onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
              placeholder="reader@bookworm.test"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              placeholder="reader123"
            />
          </label>
          <button className="primary-button" type="submit">
            {authMode === 'login' ? 'Enter library' : 'Create account'}
          </button>
          {authError && <p className="auth-error">{authError}</p>}
        </form>
      </section>
    </main>
  )
}

export default AuthPage

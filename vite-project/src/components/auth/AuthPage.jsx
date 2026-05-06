import { useState } from 'react'

function Icon({ name }) {
  const icons = {
    alert: 'bi-exclamation-circle',
    arrowLeft: 'bi-arrow-left',
    book: 'bi-book',
    eye: 'bi-eye',
    eyeOff: 'bi-eye-slash',
    lock: 'bi-lock',
    logIn: 'bi-box-arrow-in-right',
    mail: 'bi-envelope',
    person: 'bi-person',
    userPlus: 'bi-person-plus',
  }

  return <i aria-hidden="true" className={`auth-icon bi ${icons[name]}`} />
}

function AuthPage({
  authForm,
  authError,
  authErrorField,
  authLoading,
  authMode,
  handleAuth,
  onGuest,
  setAuthForm,
  setAuthMode,
}) {
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function toggleMode(nextMode) {
    setAuthMode(nextMode)
    setAuthForm({ name: '', email: '', password: '' })
    setFieldErrors({})
    setConfirmPassword('')
  }

  function submitAuth(event) {
    const email = authForm.email.trim()
    const password = authForm.password
    const nextErrors = {}

    if (!email) nextErrors.email = 'Please enter your email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Please enter a valid email address.'

    if (!password) nextErrors.password = 'Please enter your password.'

    if (authMode === 'signup') {
      if (password.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters.'
      }

      if (password !== confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match.'
      }
    }

    if (Object.keys(nextErrors).length) {
      event.preventDefault()
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
    handleAuth(event)
  }

  function updateField(field, value) {
    setAuthForm({ ...authForm, [field]: value })
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  function updateConfirmPassword(value) {
    setConfirmPassword(value)
    setFieldErrors((current) => ({ ...current, confirmPassword: '' }))
  }

  function getError(field) {
    return fieldErrors[field] || (authErrorField === field ? authError : '')
  }

  const shownError = authError && !authErrorField ? authError : ''
  const isSignup = authMode === 'signup'

  return (
    <main className={`bookworm-auth auth-${authMode}`}>
      {shownError && (
        <div className="auth-toast" role="alert">
          <span className="toast-icon">
            <Icon name="alert" />
          </span>
          <div>
            <strong>Check your details</strong>
            <p>{shownError}</p>
          </div>
        </div>
      )}

      <section className="auth-forms" aria-label="BookWorm authentication">
        <div className="auth-column signup-column">
          <form className="bookworm-form" noValidate onSubmit={submitAuth}>
            <div className="form-heading">
              <span>
                <Icon name="userPlus" />
              </span>
              <div>
                <p>Create account</p>
                <h2>Start your reading journey</h2>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-name">Name</label>
              <div className="input-wrapper">
                <span aria-hidden="true"><Icon name="person" /></span>
                <input
                  id="signup-name"
                  type="text"
                  value={isSignup ? authForm.name : ''}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Your display name"
                  disabled={!isSignup || authLoading}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-email">Email</label>
              <div className="input-wrapper">
                <span aria-hidden="true"><Icon name="mail" /></span>
                <input
                  id="signup-email"
                  type="email"
                  value={isSignup ? authForm.email : ''}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="reader@bookworm.com"
                  disabled={!isSignup || authLoading}
                  aria-invalid={Boolean(isSignup && getError('email'))}
                  aria-describedby="signup-email-error"
                />
              </div>
              {isSignup && getError('email') && <span className="error-message" id="signup-email-error">{getError('email')}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="signup-password">Password</label>
              <div className="input-wrapper">
                <span aria-hidden="true"><Icon name="lock" /></span>
                <input
                  id="signup-password"
                  type={showSignupPassword ? 'text' : 'password'}
                  value={isSignup ? authForm.password : ''}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="At least 6 characters"
                  disabled={!isSignup || authLoading}
                  aria-invalid={Boolean(isSignup && getError('password'))}
                  aria-describedby="signup-password-error"
                />
                <button
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowSignupPassword((current) => !current)}
                  disabled={!isSignup || authLoading}
                >
                  <Icon name={showSignupPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
              {isSignup && getError('password') && <span className="error-message" id="signup-password-error">{getError('password')}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="confirm-password">Confirm password</label>
              <div className="input-wrapper">
                <span aria-hidden="true"><Icon name="lock" /></span>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => updateConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  disabled={!isSignup || authLoading}
                  aria-invalid={Boolean(isSignup && getError('confirmPassword'))}
                  aria-describedby="confirm-password-error"
                />
                <button
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  disabled={!isSignup || authLoading}
                >
                  <Icon name={showConfirmPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
              {isSignup && getError('confirmPassword') && (
                <span className="error-message" id="confirm-password-error">{getError('confirmPassword')}</span>
              )}
            </div>

            <button className="auth-submit" type="submit" disabled={!isSignup || authLoading}>
              <Icon name={authLoading && isSignup ? 'book' : 'userPlus'} />
              {authLoading && isSignup ? 'Creating account...' : 'Register now'}
            </button>
            <p>
              <span>Already have an account?</span>
              <button type="button" onClick={() => toggleMode('login')}>
                Login here
              </button>
            </p>
          </form>
        </div>

        <div className="auth-column login-column">
          <form className="bookworm-form" noValidate onSubmit={submitAuth}>
            <div className="form-heading">
              <span>
                <Icon name="logIn" />
              </span>
              <div>
                <p>Welcome back</p>
                <h2>Login to BookWorm</h2>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-email">Email</label>
              <div className="input-wrapper">
                <span aria-hidden="true"><Icon name="mail" /></span>
                <input
                  id="login-email"
                  type="email"
                  value={!isSignup ? authForm.email : ''}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="reader@bookworm.com"
                  disabled={isSignup || authLoading}
                  aria-invalid={Boolean(!isSignup && getError('email'))}
                  aria-describedby="login-email-error"
                />
              </div>
              {!isSignup && getError('email') && <span className="error-message" id="login-email-error">{getError('email')}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <span aria-hidden="true"><Icon name="lock" /></span>
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={!isSignup ? authForm.password : ''}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Password"
                  disabled={isSignup || authLoading}
                  aria-invalid={Boolean(!isSignup && getError('password'))}
                  aria-describedby="login-password-error"
                />
                <button
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowLoginPassword((current) => !current)}
                  disabled={isSignup || authLoading}
                >
                  <Icon name={showLoginPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
              {!isSignup && getError('password') && (
                <span className="error-message" id="login-password-error">{getError('password')}</span>
              )}
            </div>

            <button className="auth-submit" type="submit" disabled={isSignup || authLoading}>
              <Icon name={authLoading && !isSignup ? 'book' : 'logIn'} />
              {authLoading && !isSignup ? 'Logging in...' : 'Login now'}
            </button>
            <div className="auth-links">
              <button onClick={onGuest} type="button">
                <Icon name="arrowLeft" />
                Return page
              </button>
              <button type="button">Forgot password?</button>
            </div>
            <p>
              <span>Don't have an account?</span>
              <button type="button" onClick={() => toggleMode('signup')}>
                Register here
              </button>
            </p>
          </form>
        </div>
      </section>

      <section className="auth-content" aria-hidden="true">
        <div className="content-panel login-copy">
          <span><Icon name="book" /></span>
          <p>BookWorm Library</p>
          <h1>Welcome back</h1>
          <small>Continue your shelf, notes, and favorite stories in one clean reading space.</small>
        </div>
        <div className="content-panel signup-copy">
          <span><Icon name="book" /></span>
          <p>BookWorm Library</p>
          <h1>Join with us</h1>
          <small>Create an account to save favorites and build your own reading shelf.</small>
        </div>
      </section>
    </main>
  )
}

export default AuthPage

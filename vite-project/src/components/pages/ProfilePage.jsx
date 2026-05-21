import { useState } from 'react'
import { getInitials } from '../../utils/bookUtils'

const AVATAR_MAX_SIZE = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const DISPLAY_NAME_MAX = 32
const DISPLAY_NAME_MIN = 2
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} ._'-]+$/u

function ProfilePage({
  account,
  fontScale,
  onProfileUpdate,
  onResetPassword,
  readerTheme,
  setFontScale,
  setReaderTheme,
  setWebsiteTheme,
  websiteTheme,
}) {
  return (
    <div className="profile-page settings-only-page">
      <ProfileSettings
        account={account}
        fontScale={fontScale}
        onProfileUpdate={onProfileUpdate}
        onResetPassword={onResetPassword}
        readerTheme={readerTheme}
        setFontScale={setFontScale}
        setReaderTheme={setReaderTheme}
        setWebsiteTheme={setWebsiteTheme}
        websiteTheme={websiteTheme}
      />
    </div>
  )
}

function ProfileSettings({
  account,
  fontScale,
  onProfileUpdate,
  onResetPassword,
  readerTheme,
  setFontScale,
  setReaderTheme,
  setWebsiteTheme,
  websiteTheme,
}) {
  const [avatarPreview, setAvatarPreview] = useState(account.avatar || '')
  const [displayName, setDisplayName] = useState(account.name)
  const [settingsError, setSettingsError] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(false)

  function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!AVATAR_TYPES.includes(file.type)) {
      setSettingsError('Avatar must be a JPG, PNG, WEBP, or GIF image.')
      event.target.value = ''
      return
    }

    if (file.size > AVATAR_MAX_SIZE) {
      setSettingsError('Avatar image must be 2MB or smaller.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(String(reader.result))
      setSettingsError('')
    }
    reader.readAsDataURL(file)
  }

  async function saveProfile(event) {
    event.preventDefault()
    const nameError = validateDisplayName(displayName)
    if (nameError) {
      setSettingsError(nameError)
      return
    }

    const normalizedDisplayName = normalizeDisplayName(displayName)
    setSettingsLoading(true)
    setSettingsError('')
    try {
      await onProfileUpdate({ avatar: avatarPreview, displayName: normalizedDisplayName })
      setDisplayName(normalizedDisplayName)
    } catch {
      setSettingsError('Could not update your profile. Please try again.')
    } finally {
      setSettingsLoading(false)
    }
  }

  async function sendResetPassword() {
    setSettingsLoading(true)
    setSettingsError('')
    try {
      await onResetPassword()
    } catch {
      setSettingsError('Could not send reset email right now.')
    } finally {
      setSettingsLoading(false)
    }
  }

  return (
    <section className="settings-panel profile-settings" role="tabpanel">
      <div className="settings-intro">
        <div>
          <p className="mono-eyebrow">My account</p>
          <h2>Account settings</h2>
          <p>Keep your profile, password, reading comfort, and site appearance in one place.</p>
        </div>
        <div className="settings-mini-profile">
          <span>{avatarPreview ? <img src={avatarPreview} alt="" /> : getInitials(displayName)}</span>
          <strong>{displayName || account.name}</strong>
        </div>
      </div>

      <div className="settings-layout">
        <form className="account-settings-card profile-card-large" onSubmit={saveProfile}>
          <SettingsHeading icon="bi-person-gear" kicker="Profile" title="Identity" />
          <div className="avatar-editor">
            <span>{avatarPreview ? <img src={avatarPreview} alt="" /> : getInitials(displayName || account.name)}</span>
            <label className="file-picker">
              <i className="bi bi-image" />
              Change avatar
              <input accept={AVATAR_TYPES.join(',')} type="file" onChange={handleAvatarChange} />
            </label>
            <small>JPG, PNG, WEBP, or GIF. Max 2MB.</small>
          </div>
          <label>
            Display name
            <input
              maxLength={DISPLAY_NAME_MAX}
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setSettingsError('')
              }}
            />
            <span className="field-hint">
              {displayName.length}/{DISPLAY_NAME_MAX} characters. Letters, numbers, spaces, . _ ' - only.
            </span>
          </label>
          <button className="primary-button" disabled={settingsLoading} type="submit">
            <i className="bi bi-check2-circle" />
            Save profile
          </button>
        </form>

        <div className="account-settings-card">
          <SettingsHeading icon="bi-shield-lock" kicker="Security" title="Password" />
          <p className="settings-copy">Send a reset link to {account.email}.</p>
          <button className="ghost-button" disabled={settingsLoading} onClick={sendResetPassword} type="button">
            <i className="bi bi-envelope-arrow-up" />
            Send reset email
          </button>
        </div>

        <div className="account-settings-card reader-preview-card">
          <SettingsHeading icon="bi-book" kicker="Reader" title="Preview mode" />
          <div className="settings-two-col">
            <label>
              Reader mode
              <select value={readerTheme} onChange={(event) => setReaderTheme(event.target.value)}>
                <option value="sepia">Sepia</option>
                <option value="focus">Focus</option>
                <option value="night">Night</option>
              </select>
            </label>
            <label>
              Font size
              <input
                max="24"
                min="15"
                type="range"
                value={fontScale}
                onChange={(event) => setFontScale(Number(event.target.value))}
              />
            </label>
          </div>
          <div className={`settings-reader-preview reader-${readerTheme}`} style={{ fontSize: `${fontScale}px` }}>
            <p className="mono-eyebrow">Chapter preview</p>
            <h4>A quiet page for focused reading</h4>
            <p>Reader mode and font size sync with the reading screen.</p>
          </div>
        </div>

        <div className="account-settings-card">
          <SettingsHeading icon="bi-palette" kicker="Appearance" title="Website theme" />
          <div className="theme-options" role="group" aria-label="Website theme">
            {[
              ['paper', 'Paper'],
              ['mint', 'Mint'],
              ['ink', 'Ink'],
            ].map(([value, label]) => (
              <button
                className={websiteTheme === value ? 'active' : ''}
                key={value}
                onClick={() => setWebsiteTheme(value)}
                type="button"
              >
                <span className={`theme-swatch theme-swatch-${value}`} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {settingsError && <p className="settings-error">{settingsError}</p>}
    </section>
  )
}

function SettingsHeading({ icon, kicker, title }) {
  return (
    <div className="settings-card-heading">
      <i className={`bi ${icon}`} />
      <div>
        <p className="mono-eyebrow">{kicker}</p>
        <h3>{title}</h3>
      </div>
    </div>
  )
}

function normalizeDisplayName(name) {
  return name.trim().replace(/\s+/g, ' ')
}

function validateDisplayName(name) {
  const normalizedName = normalizeDisplayName(name)

  if (!normalizedName) return 'Display name cannot be empty.'
  if (normalizedName.length < DISPLAY_NAME_MIN) return `Display name must be at least ${DISPLAY_NAME_MIN} characters.`
  if (normalizedName.length > DISPLAY_NAME_MAX) return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer.`
  if (!DISPLAY_NAME_PATTERN.test(normalizedName)) {
    return "Display name can only include letters, numbers, spaces, and . _ ' -"
  }

  return ''
}

export default ProfilePage

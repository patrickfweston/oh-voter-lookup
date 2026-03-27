import { useState, type FormEvent } from 'react'

const ACCESS_PASSWORD = 'juniper'
export const ACCESS_SESSION_KEY = 'voter-guide-unlocked'

export function hasSessionAccess(): boolean {
  try {
    return sessionStorage.getItem(ACCESS_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function grantSessionAccess(): void {
  try {
    sessionStorage.setItem(ACCESS_SESSION_KEY, '1')
  } catch {
    /* private mode / disabled storage */
  }
}

type AccessGateProps = {
  onUnlock: () => void
}

export function AccessGate({ onUnlock }: AccessGateProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (value.trim() === ACCESS_PASSWORD) {
      grantSessionAccess()
      onUnlock()
      return
    }
    setError('That password is not correct.')
    setValue('')
  }

  return (
    <div className="access-gate">
      <div className="access-gate-card">
        <h1 className="access-gate-title">Sign in</h1>
        <p className="access-gate-hint">Enter the password to use this tool.</p>
        <form className="access-gate-form" onSubmit={onSubmit}>
          <label className="access-gate-label">
            Password
            <input
              className="access-gate-input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={value}
              onChange={(ev) => setValue(ev.target.value)}
              autoFocus
            />
          </label>
          {error ? <p className="access-gate-error">{error}</p> : null}
          <button className="access-gate-submit" type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}

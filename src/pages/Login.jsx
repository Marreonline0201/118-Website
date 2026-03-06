import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Login.module.css'

export default function Login({ authError, onClearAuthError }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Show auth errors from URL (Supabase puts these in redirect on failure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const err = params.get('error') || hashParams.get('error')
    const desc = params.get('error_description') || hashParams.get('error_description')
    if (err) {
      setError(desc || err)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseCallback = supabaseUrl ? supabaseUrl.replace(/\/$/, '') + '/auth/v1/callback' : ''
  const isGoogleRedirectError = authError === 'wrong_google_redirect' || (error && error.includes('Unable to exchange external code'))
  const displayError = isGoogleRedirectError
    ? (
        <>
          <strong>Wrong Google redirect URI.</strong> Google is sending the code to your app instead of Supabase.
          <br /><br />
          In <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console → Credentials</a>, edit your OAuth 2.0 Client ID:
          <br />
          <strong>Remove</strong> any localhost or app URLs from Authorized redirect URIs.
          <br />
          <strong>Add only this:</strong>
          <code className={styles.exactUri}>{supabaseCallback || 'https://YOUR-PROJECT.supabase.co/auth/v1/callback'}</code>
          <br />
          Save and wait 1–2 minutes, then try again.
        </>
      )
    : error

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/',
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>⊡</div>
        <h1 className={styles.title}>K-Map Circuit Designer</h1>
        <p className={styles.subtitle}>
          Design circuits from Karnaugh maps. Minimize Boolean functions in SOP and POS form.
        </p>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className={styles.googleBtn}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        {displayError && (
          <p className={styles.error}>
            {displayError}
            {(authError || isGoogleRedirectError) && (
              <button type="button" onClick={() => { setError(null); onClearAuthError?.() }} className={styles.dismiss}>Dismiss</button>
            )}
          </p>
        )}
        <p className={styles.note}>
          Google login is required to save your K-map designs and view history.
        </p>
        <p className={styles.troubleshoot}>
          Stuck after login? Add <code>{window.location.origin}/</code> to Supabase → Authentication → URL Configuration → Redirect URLs
        </p>
      </div>
    </div>
  )
}

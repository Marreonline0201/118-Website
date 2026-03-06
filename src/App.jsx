import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, hasSupabaseConfig } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import KMapDesigner from './pages/KMapDesigner'
import History from './pages/History'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const queryParams = new URLSearchParams(window.location.search)
    const code = queryParams.get('code')
    const hasAuthParams =
      hashParams.has('access_token') ||
      hashParams.has('refresh_token') ||
      !!code

    const initAuth = async () => {
      let { data: { session } } = await supabase.auth.getSession()

      // Google code in URL = wrong redirect URI in Google Cloud (must point to Supabase)
      if (code && code.startsWith('4/')) {
        setAuthError('wrong_google_redirect')
        window.history.replaceState(null, '', window.location.pathname)
      } else if (!session && code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) session = data.session
      }

      if (!session && hasAuthParams) {
        // Fallback: wait for automatic exchange / hash parsing
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 200))
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            session = data.session
            break
          }
        }
      }

      setSession(session)
      if (session && (hasAuthParams || window.location.hash || window.location.search)) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        const q = new URLSearchParams(window.location.search)
        const h = window.location.hash
        if (q.has('code') || h.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    )
  }

  if (!hasSupabaseConfig) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--error)' }}>Configuration missing</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            For Render: add these in Dashboard → Environment. Then trigger a new deploy.
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login authError={authError} onClearAuthError={() => setAuthError(null)} />
  }

  return (
    <Layout session={session}>
      <Routes>
        <Route path="/" element={<KMapDesigner />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App

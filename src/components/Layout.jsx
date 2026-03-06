import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './Layout.module.css'

export default function Layout({ children, session }) {
  const location = useLocation()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⊡</span>
          K-Map Circuit Designer
        </Link>
        <nav className={styles.nav}>
          <Link
            to="/"
            className={location.pathname === '/' ? styles.navActive : ''}
          >
            Designer
          </Link>
          <Link
            to="/history"
            className={location.pathname === '/history' ? styles.navActive : ''}
          >
            History
          </Link>
        </nav>
        <div className={styles.user}>
          <span className={styles.userEmail}>{session?.user?.email}</span>
          <button onClick={handleSignOut} className={styles.signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}

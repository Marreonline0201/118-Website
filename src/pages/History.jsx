import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './History.module.css'

export default function History() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      setError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setItems([])
          return
        }

        const { data, error: err } = await supabase
          .from('kmap_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (err) throw err
        setItems(data || [])
      } catch (err) {
        setError(err.message)
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleString()
  }

  const getSizeLabel = (rows, cols) => {
    if (rows === 2 && cols === 2) return '2×2 (2 vars)'
    if (rows === 2 && cols === 4) return '2×4 (3 vars: A\\BC)'
    if (rows === 4 && cols === 4) return '4×4 (4 vars: AB\\CD)'
    return `${rows}×${cols}`
  }

  if (loading) {
    return <div className={styles.loading}>Loading history...</div>
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Could not load history. Make sure the database table exists.</p>
        <p className={styles.errorDetail}>{error}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>No History Yet</h2>
        <p>Your K-map designs will appear here after you minimize and save them.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Your K-Map History</h2>
      <div className={styles.list}>
        {items.map((item) => {
          let sop = {}, pos = {}
          try {
            sop = typeof item.sop_result === 'string' ? JSON.parse(item.sop_result) : item.sop_result
            pos = typeof item.pos_result === 'string' ? JSON.parse(item.pos_result) : item.pos_result
          } catch (_) {}
          return (
            <div key={item.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.size}>{getSizeLabel(item.rows, item.cols)}</span>
                <span className={styles.date}>{formatDate(item.created_at)}</span>
              </div>
              <div className={styles.cardBody}>
                <div>
                  <strong>SOP:</strong> <code>{sop.minimized || '—'}</code>
                </div>
                <div>
                  <strong>POS:</strong> <code>{pos.minimized || '—'}</code>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

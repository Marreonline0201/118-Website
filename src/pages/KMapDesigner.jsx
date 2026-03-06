import { useState, useCallback } from 'react'
import { getKMapLayout, minimizeKMap } from '../lib/kmap'
import { minimizeWithGemini } from '../lib/geminiKmap'
import { supabase } from '../lib/supabase'
import KMapGrid from '../components/KMapGrid'
import CircuitDiagram from '../components/CircuitDiagram'
import styles from './KMapDesigner.module.css'

const SIZE_OPTIONS = [
  { rows: 2, cols: 2, label: '2×2 (2 variables)' },
  { rows: 2, cols: 4, label: '2×4 (3 variables: A\\BC)' },
  { rows: 4, cols: 4, label: '4×4 (4 variables: AB\\CD)' },
]

function createEmptyCells(rows, cols) {
  return Array(rows * cols).fill(0)
}

export default function KMapDesigner() {
  const [rows, setRows] = useState(2)
  const [cols, setCols] = useState(2)
  const [cells, setCells] = useState(createEmptyCells(2, 2))
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [minimizing, setMinimizing] = useState(false)
  const [minimizeError, setMinimizeError] = useState(null)

  const layout = getKMapLayout(rows, cols)

  const handleSizeChange = (newRows, newCols) => {
    setRows(newRows)
    setCols(newCols)
    setCells(createEmptyCells(newRows, newCols))
    setResult(null)
  }

  const handleCellChange = useCallback((index, value) => {
    setCells(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
    setResult(null)
  }, [])

  const handleMinimize = async () => {
    setMinimizing(true)
    setMinimizeError(null)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (apiKey) {
        const geminiResult = await minimizeWithGemini(cells, rows, cols)
        setResult(geminiResult)
      } else {
        const { sop, pos } = minimizeKMap(cells, rows, cols)
        setResult({ sop, pos })
      }
    } catch (err) {
      setMinimizeError(err.message)
      const { sop, pos } = minimizeKMap(cells, rows, cols)
      setResult({ sop, pos })
    } finally {
      setMinimizing(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('kmap_history').insert({
        user_id: user.id,
        rows,
        cols,
        cells: JSON.stringify(cells),
        sop_result: JSON.stringify(result.sop),
        pos_result: JSON.stringify(result.pos),
        created_at: new Date().toISOString(),
      })

      if (error) throw error
      alert('Saved to history!')
    } catch (err) {
      console.error(err)
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const hasOnes = cells.some(c => c === 1 || c === 'x')
  const hasZeros = cells.some(c => c === 0)

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Select K-Map Size</h2>
        <div className={styles.sizeOptions}>
          {SIZE_OPTIONS.map(({ rows: r, cols: c, label }) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleSizeChange(r, c)}
              className={rows === r && cols === c ? styles.sizeActive : styles.sizeBtn}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Fill the K-Map</h2>
        <p className={styles.hint}>
          Click cells to cycle: 0 → 1 → X (don't care) → 0. Gray code order for adjacency.
        </p>
        {layout && (
          <KMapGrid
            rows={rows}
            cols={cols}
            layout={layout}
            cells={cells}
            onCellChange={handleCellChange}
          />
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Minimize</h2>
        <button
          onClick={handleMinimize}
          disabled={(!hasOnes && !hasZeros) || minimizing}
          className={styles.minimizeBtn}
        >
          {minimizing ? 'Computing...' : import.meta.env.VITE_GEMINI_API_KEY ? 'Find Minimized Function (Gemini)' : 'Find Minimized Function'}
        </button>
        {minimizeError && <p className={styles.error}>{minimizeError}</p>}

        {result && (
          <div className={styles.results}>
            <div className={styles.visualizationSection}>
              <h3>Essential Prime Implicants (Visualized)</h3>
              <div className={styles.visualizationGrids}>
                <div className={styles.vizBlock}>
                  <h4>SOP</h4>
                  <KMapGrid
                    rows={rows}
                    cols={cols}
                    layout={layout}
                    cells={cells}
                    onCellChange={handleCellChange}
                    highlightGroups={result.sop.essentialPrimeImplicantsWithMinterms || []}
                  />
                </div>
                <div className={styles.vizBlock}>
                  <h4>POS</h4>
                  <KMapGrid
                    rows={rows}
                    cols={cols}
                    layout={layout}
                    cells={cells}
                    onCellChange={handleCellChange}
                    highlightGroups={result.pos.essentialPrimeImplicantsWithMinterms || []}
                  />
                </div>
              </div>
            </div>
            <div className={styles.resultBlock}>
              <h3>SOP (Sum of Products)</h3>
              <p className={styles.formula}>{result.sop.minimized || '—'}</p>
              <div className={styles.primeImplicants}>
                <strong>Prime Implicants:</strong>
                <ul>
                  {result.sop.primeImplicants?.map((pi, i) => (
                    <li key={i}>
                      {pi.term}
                      {result.sop.essentialPrimeImplicants?.includes(pi.term) && (
                        <span className={styles.essential}> (essential)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className={styles.resultBlock}>
              <h3>POS (Product of Sums)</h3>
              <p className={styles.formula}>{result.pos.minimized || '—'}</p>
              <div className={styles.primeImplicants}>
                <strong>Prime Implicants (from 0s):</strong>
                <ul>
                  {result.pos.primeImplicants?.map((pi, i) => (
                    <li key={i}>
                      {pi.term}
                      {result.pos.essentialPrimeImplicants?.includes(pi.term) && (
                        <span className={styles.essential}> (essential)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={styles.saveBtn}
            >
              {saving ? 'Saving...' : 'Save to History'}
            </button>
          </div>
        )}
      </section>

      {result && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Circuit Design</h2>
          <div className={styles.circuits}>
            <div className={styles.circuitBlock}>
              <h3>SOP Circuit</h3>
              <CircuitDiagram expression={result.sop.minimized} type="SOP" />
            </div>
            <div className={styles.circuitBlock}>
              <h3>POS Circuit</h3>
              <CircuitDiagram expression={result.pos.minimized} type="POS" />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

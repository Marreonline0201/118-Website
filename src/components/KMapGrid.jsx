import { getMintermAt } from '../lib/kmap'
import styles from './KMapGrid.module.css'

export default function KMapGrid({ rows, cols, layout, cells, onCellChange }) {
  const cycleValue = (current) => {
    if (current === 0) return 1
    if (current === 1) return 'x'
    return 0
  }

  const handleClick = (row, col) => {
    const minterm = getMintermAt(rows, cols, row, col)
    onCellChange(minterm, cycleValue(cells[minterm]))
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.gridContainer}>
        <div className={styles.corner}>
          {layout.rowVars.length > 0 && (
            <span className={styles.varLabel}>
              {layout.rowVars.join('')} \{layout.colVars.join('')}
            </span>
          )}
        </div>
        <div className={styles.colLabels}>
          {layout.colLabels.map((label, i) => (
            <div key={i} className={styles.colLabel}>{label}</div>
          ))}
        </div>
        <div className={styles.gridBody}>
          {layout.rowLabels.map((rowLabel, row) => (
            <div key={row} className={styles.row}>
              <div className={styles.rowLabel}>{rowLabel}</div>
              <div className={styles.cells}>
                {layout.colLabels.map((_, col) => {
                  const minterm = getMintermAt(rows, cols, row, col)
                  const value = cells[minterm]
                  return (
                    <button
                      key={col}
                      className={`${styles.cell} ${styles[`cell${value}`]}`}
                      onClick={() => handleClick(row, col)}
                    >
                      {value === 'x' ? 'X' : value}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.legend}>
        <span><span className={styles.legend0}>0</span> = 0</span>
        <span><span className={styles.legend1}>1</span> = 1</span>
        <span><span className={styles.legendX}>X</span> = don't care</span>
      </div>
    </div>
  )
}

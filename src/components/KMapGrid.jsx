import { getMintermAt } from '../lib/kmap'
import styles from './KMapGrid.module.css'

const GROUP_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899']

export default function KMapGrid({ rows, cols, layout, cells, onCellChange, highlightGroups = [] }) {
  const cycleValue = (current) => {
    if (current === 0) return 1
    if (current === 1) return 'x'
    return 0
  }

  const handleClick = (row, col) => {
    const minterm = getMintermAt(rows, cols, row, col)
    onCellChange(minterm, cycleValue(cells[minterm]))
  }

  const getGroupForMinterm = (minterm) => {
    for (let i = 0; i < highlightGroups.length; i++) {
      if (highlightGroups[i].minterms.includes(minterm)) return i
    }
    return -1
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
                  const groupIdx = getGroupForMinterm(minterm)
                  const highlightStyle = groupIdx >= 0 ? {
                    '--highlight-color': GROUP_COLORS[groupIdx % GROUP_COLORS.length],
                  } : {}
                  return (
                    <button
                      key={col}
                      className={`${styles.cell} ${styles[`cell${value}`]} ${groupIdx >= 0 ? styles.cellHighlight : ''}`}
                      style={highlightStyle}
                      onClick={() => handleClick(row, col)}
                    >
                      <span className={styles.cellValue}>{value === 'x' ? 'X' : value}</span>
                      <span className={styles.cellMinterm}>m{minterm}</span>
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
        {highlightGroups.length > 0 && (
          <span className={styles.legendHighlight}>
            Essential: {highlightGroups.map((g, i) => (
              <span key={i} className={styles.legendGroup} style={{ borderColor: GROUP_COLORS[i % GROUP_COLORS.length], color: GROUP_COLORS[i % GROUP_COLORS.length] }}>
                {g.term}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

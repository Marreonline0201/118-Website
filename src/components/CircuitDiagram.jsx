/**
 * Renders a circuit diagram from SOP or POS expression
 * SOP: AND gates feeding into OR gate
 * POS: OR gates feeding into AND gate
 */
import styles from './CircuitDiagram.module.css'

function parseTerms(expression, type) {
  if (!expression || expression === '—') return []
  if (type === 'SOP') {
    return expression.split('+').map(t => t.trim()).filter(Boolean)
  }
  return expression.split('·').map(t => t.trim().replace(/^\(|\)$/g, '')).filter(Boolean)
}

function parseLiterals(term) {
  const literals = []
  let i = 0
  while (i < term.length) {
    if (term[i] === '!' || term[i] === '¬') {
      i++
      if (i < term.length) {
        literals.push({ name: term[i], negated: true })
        i++
      }
    } else if (/[A-D]/.test(term[i])) {
      literals.push({ name: term[i], negated: false })
      i++
    } else {
      i++
    }
  }
  return literals
}

export default function CircuitDiagram({ expression, type }) {
  const terms = parseTerms(expression, type)
  if (terms.length === 0) {
    return <div className={styles.empty}>No expression to display</div>
  }

  const Gate = ({ children, gateType }) => (
    <div className={styles.gateWrapper}>
      <div className={`${styles.gate} ${styles[gateType]}`}>
        {gateType === 'AND' ? '&' : '≥1'}
      </div>
      {children && <div className={styles.gateInputs}>{children}</div>}
    </div>
  )

  const Literal = ({ name, negated }) => (
    <div className={styles.literal}>
      {negated && <span className={styles.not}>!</span>}
      <span className={styles.input}>{name}</span>
    </div>
  )

  return (
    <div className={styles.diagram}>
      <div className={styles.output}>
        <span className={styles.outputLabel}>F</span>
        <div className={styles.wire} />
      </div>
      <div className={`${styles.mainGate} ${type === 'SOP' ? styles.sop : styles.pos}`}>
        <div className={styles.mainGateSymbol}>
          {type === 'SOP' ? '≥1' : '&'}
        </div>
        <div className={styles.terms}>
          {terms.map((term, ti) => {
            const literals = parseLiterals(term)
            return (
              <div key={ti} className={styles.term}>
                <div className={styles.termGate}>
                  {type === 'SOP' ? '&' : '≥1'}
                </div>
                <div className={styles.termInputs}>
                  {literals.map((lit, li) => (
                    <Literal key={li} name={lit.name} negated={lit.negated} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

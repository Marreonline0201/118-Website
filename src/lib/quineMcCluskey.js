/**
 * K-map minimization using Quine-McCluskey algorithm
 * Uses @helander/quine-mccluskey-js for accurate results
 */
import QuineMcCluskey from '@helander/quine-mccluskey-js'

const OVERBAR = '\u0305'
const VAR_NAMES = ['A', 'B', 'C', 'D']

function convertToOurNotation(expr, isMaxterm) {
  if (!expr || expr === '0' || expr === '1') return expr || '—'
  let result = expr.replace(/NOT\s+([A-D])/g, '$1' + OVERBAR)
  if (isMaxterm) {
    result = result.replace(/\s+OR\s+/g, '+').replace(/\s*\)\s+AND\s+\(/g, ')·(')
    if (result && !result.startsWith('(')) result = '(' + result
    if (result && !result.endsWith(')')) result = result + ')'
  } else {
    result = result.replace(/\s+AND\s+/g, '·').replace(/\s+OR\s+/g, '+')
  }
  return result.replace(/\s+/g, '')
}

function getVarCount(rows, cols) {
  if (rows === 2 && cols === 2) return 2
  if (rows === 2 && cols === 4) return 3
  if (rows === 4 && cols === 4) return 4
  return 0
}

function termToOurNotation(termValue, varCount, isSOP) {
  let result = ''
  for (let i = 0; i < varCount; i++) {
    const t = termValue[i]
    if (t === '-') continue
    const negated = isSOP ? (t === '0') : (t === '1')
    result += (negated ? VAR_NAMES[i] + OVERBAR : VAR_NAMES[i]) + (result ? '·' : '')
  }
  return result.replace(/·$/, '')
}

function getMintermsFromPattern(pattern, varCount, isSOP) {
  const minterms = []
  const n = Math.pow(2, varCount)
  for (let m = 0; m < n; m++) {
    const bin = m.toString(2).padStart(varCount, '0')
    let match = true
    for (let i = 0; i < varCount; i++) {
      const t = pattern[i]
      if (t === '-') continue
      if (isSOP && t !== bin[i]) { match = false; break }
      if (!isSOP && t === bin[i]) { match = false; break }
    }
    if (match) minterms.push(m)
  }
  return minterms
}

function parseExpressionToTerms(expr, isSOP) {
  if (!expr || expr === '0' || expr === '1') return []
  if (isSOP) return expr.split('+').map(t => t.trim().replace(/^\(|\)$/g, '')).filter(Boolean)
  return expr.split(')·(').map(t => t.trim().replace(/^\(|\)$/g, '')).filter(Boolean)
}

export function minimizeWithQuineMcCluskey(cells, rows, cols) {
  const varCount = getVarCount(rows, cols)
  if (varCount === 0) {
    return {
      sop: { minimized: '—', primeImplicants: [], essentialPrimeImplicants: [], essentialPrimeImplicantsWithMinterms: [] },
      pos: { minimized: '—', primeImplicants: [], essentialPrimeImplicants: [], essentialPrimeImplicantsWithMinterms: [] },
    }
  }
  const vars = VAR_NAMES.slice(0, varCount).join('')

  const minterms = []
  const dontCares = []
  const maxterms = []
  const n = rows * cols
  for (let i = 0; i < n; i++) {
    const val = cells[i]
    if (val === 1) minterms.push(i)
    else if (val === 'x') dontCares.push(i)
    else maxterms.push(i)
  }

  let sopResult, posResult
  try {
    const qmSop = new QuineMcCluskey(vars, [...minterms], [...dontCares], false)
    const sopExpr = qmSop.getFunction()
    const sopMinimized = convertToOurNotation(sopExpr, false)
    const sopTerms = parseExpressionToTerms(sopMinimized, true)
    const sopEssentialWithMinterms = sopTerms.map(term => {
      const mintermsForTerm = termToMinterms(term, varCount, true)
      return { term, minterms: mintermsForTerm }
    })
    sopResult = {
      minimized: sopMinimized,
      primeImplicants: sopEssentialWithMinterms,
      essentialPrimeImplicants: sopTerms,
      essentialPrimeImplicantsWithMinterms: sopEssentialWithMinterms,
    }
  } catch (_) {
    sopResult = { minimized: '—', primeImplicants: [], essentialPrimeImplicants: [], essentialPrimeImplicantsWithMinterms: [] }
  }

  try {
    const qmPos = new QuineMcCluskey(vars, [...maxterms], [...dontCares], true)
    const posExpr = qmPos.getFunction()
    const posMinimized = convertToOurNotation(posExpr, true)
    const posTerms = parseExpressionToTerms(posMinimized, false)
    const posEssentialWithMinterms = posTerms.map(term => {
      const mintermsForTerm = termToMinterms(term, varCount, false)
      return { term, minterms: mintermsForTerm }
    })
    posResult = {
      minimized: posMinimized,
      primeImplicants: posEssentialWithMinterms,
      essentialPrimeImplicants: posTerms,
      essentialPrimeImplicantsWithMinterms: posEssentialWithMinterms,
    }
  } catch (_) {
    posResult = { minimized: '—', primeImplicants: [], essentialPrimeImplicants: [], essentialPrimeImplicantsWithMinterms: [] }
  }

  return { sop: sopResult, pos: posResult }
}

function termToMinterms(term, varCount, isSOP) {
  const sep = isSOP ? '·' : '+'
  const literals = term.split(sep).map(p => p.trim()).filter(Boolean)
  const n = Math.pow(2, varCount)
  const minterms = []
  for (let m = 0; m < n; m++) {
    const bin = m.toString(2).padStart(varCount, '0')
    let match
    if (isSOP) {
      match = true
      for (const lit of literals) {
        const negated = lit.endsWith(OVERBAR)
        const name = lit.replace(OVERBAR, '')
        const idx = VAR_NAMES.indexOf(name)
        if (idx >= 0) {
          const bit = bin[idx] === '1'
          if ((negated && bit) || (!negated && !bit)) { match = false; break }
        }
      }
    } else {
      match = false
      for (const lit of literals) {
        const negated = lit.endsWith(OVERBAR)
        const name = lit.replace(OVERBAR, '')
        const idx = VAR_NAMES.indexOf(name)
        if (idx >= 0) {
          const bit = bin[idx] === '1'
          if ((negated && !bit) || (!negated && bit)) { match = true; break }
        }
      }
    }
    if (match) minterms.push(m)
  }
  return minterms
}

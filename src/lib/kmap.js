/**
 * K-Map minimization utilities
 * Supports 2x2 (2 vars), 2x4 (3 vars), 4x4 (4 vars)
 * Gray code order: 00, 01, 11, 10
 */

const GRAY_2 = [0, 1, 3, 2]  // 00, 01, 11, 10
const VAR_NAMES = ['A', 'B', 'C', 'D']
const OVERBAR = '\u0305'  // combining overline for NOT (Ā = Ā)

export function getKMapLayout(rows, cols) {
  if (rows === 2 && cols === 2) {
    return { rowLabels: ['0', '1'], colLabels: ['0', '1'], rowVars: ['A'], colVars: ['B'] }
  }
  if (rows === 2 && cols === 4) {
    return {
      rowLabels: ['0', '1'],
      colLabels: ['00', '01', '11', '10'],
      rowVars: ['A'],
      colVars: ['B', 'C'],
    }
  }
  if (rows === 4 && cols === 4) {
    return {
      rowLabels: ['00', '01', '11', '10'],
      colLabels: ['00', '01', '11', '10'],
      rowVars: ['A', 'B'],
      colVars: ['C', 'D'],
    }
  }
  return null
}

export function getMintermAt(rows, cols, row, col) {
  if (rows === 2 && cols === 2) {
    return row * 2 + col
  }
  if (rows === 2 && cols === 4) {
    const a = row
    const bc = GRAY_2[col]
    return a * 4 + bc
  }
  if (rows === 4 && cols === 4) {
    const ab = GRAY_2[row]
    const cd = GRAY_2[col]
    return ab * 4 + cd
  }
  return 0
}

export function getMintermCoords(rows, cols, minterm) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (getMintermAt(rows, cols, r, c) === minterm) return [r, c]
    }
  }
  return null
}

function getVarCount(rows, cols) {
  if (rows === 2 && cols === 2) return 2
  if (rows === 2 && cols === 4) return 3
  if (rows === 4 && cols === 4) return 4
  return 0
}

function mintermToBinary(minterm, varCount) {
  return minterm.toString(2).padStart(varCount, '0')
}

function binaryToLiteral(binary, negate) {
  return binary.split('').map((b, i) => {
    const v = VAR_NAMES[i]
    return (b === '1') !== negate ? v : '!' + v
  }).join('')
}

function getImplicantFromGroup(minterms, varCount, negate) {
  if (minterms.length === 0) return ''
  const binaries = minterms.map(m => mintermToBinary(m, varCount))
  const size = binaries[0].length
  let result = ''
  for (let i = 0; i < size; i++) {
    const first = binaries[0][i]
    const same = binaries.every(b => b[i] === first)
    if (same) {
      result += ((first === '1') !== negate) ? VAR_NAMES[i] : '!' + VAR_NAMES[i]
    }
  }
  return result
}

function findGroups(cells, rows, cols, target) {
  const n = rows * cols
  const varCount = getVarCount(rows, cols)
  const targetMinterms = []
  for (let i = 0; i < n; i++) {
    if (cells[i] === target || (target === 1 && cells[i] === 'x')) {
      targetMinterms.push(i)
    }
  }
  if (target === 0) {
    for (let i = 0; i < n; i++) {
      if (cells[i] !== 1 && cells[i] !== 'x') targetMinterms.push(i)
    }
  }

  const allGroups = []
  const powers = [1, 2, 4, 8, 16]

  for (const size of powers) {
    if (size > targetMinterms.length) break
    for (let i = 0; i <= targetMinterms.length - size; i++) {
      const group = targetMinterms.slice(i, i + size)
      if (isValidGroup(group, rows, cols)) {
        allGroups.push(group)
      }
    }
  }

  for (let size = 2; size <= 8; size *= 2) {
    if (size > targetMinterms.length) break
    for (let i = 0; i < targetMinterms.length; i++) {
      for (let j = i + 1; j < targetMinterms.length; j++) {
        const group = [targetMinterms[i], targetMinterms[j]]
        const dist = Math.abs(group[1] - group[0])
        if (isValidPair(group[0], group[1], rows, cols)) {
          const expanded = expandGroup(group, targetMinterms, rows, cols)
          if (expanded.length >= size && !allGroups.some(g => 
            g.length === expanded.length && g.every((m, idx) => m === expanded[idx])
          )) {
            allGroups.push(expanded)
          }
        }
      }
    }
  }

  const primeImplicants = []
  const covered = new Set()

  for (const group of allGroups.sort((a, b) => b.length - a.length)) {
    const implicant = getImplicantFromGroup(group, varCount, target === 0)
    if (implicant && !primeImplicants.some(pi => pi.term === implicant)) {
      const covering = group.filter(m => targetMinterms.includes(m))
      if (covering.length > 0) {
        primeImplicants.push({
          term: implicant,
          minterms: [...new Set(covering)],
          size: group.length,
        })
        covering.forEach(m => covered.add(m))
      }
    }
  }

  const essential = []
  const remaining = targetMinterms.filter(m => !covered.has(m))

  for (const m of targetMinterms) {
    const covering = primeImplicants.filter(pi => pi.minterms.includes(m))
    if (covering.length === 1 && !essential.includes(covering[0])) {
      essential.push(covering[0])
    }
  }

  const used = new Set(essential.flatMap(e => e.minterms))
  let minCover = [...essential]
  let stillNeeded = targetMinterms.filter(m => !used.has(m))

  if (stillNeeded.length > 0) {
    const remainingPIs = primeImplicants.filter(pi => !essential.includes(pi))
    for (const pi of remainingPIs.sort((a, b) => a.minterms.length - b.minterms.length)) {
      if (pi.minterms.some(m => stillNeeded.includes(m))) {
        minCover.push(pi)
        pi.minterms.forEach(m => { used.add(m) })
        stillNeeded = targetMinterms.filter(m => !used.has(m))
      }
    }
  }

  const terms = minCover.map(pi => pi.term).filter(Boolean)
  const formula = target === 1
    ? terms.join(' + ')
    : terms.map(t => '(' + t + ')').join(' ')
  const posFormula = target === 0 ? terms.map(t => `(${t})`).join(' · ') : ''

  return {
    primeImplicants: primeImplicants.map(pi => ({ term: pi.term, minterms: pi.minterms })),
    essentialPrimeImplicants: essential.map(e => e.term),
    minimizedSOP: target === 1 ? terms.join(' + ') : null,
    minimizedPOS: target === 0 ? terms.map(t => `(${t})`).join(' · ') : null,
    terms,
  }
}

function isValidGroup(group, rows, cols) {
  if (group.length === 1) return true
  const n = rows * cols
  for (let i = 0; i < group.length - 1; i++) {
    if (!isAdjacent(group[i], group[i + 1], rows, cols)) return false
  }
  return true
}

function isValidPair(a, b, rows, cols) {
  return isAdjacent(a, b, rows, cols)
}

function isAdjacent(m1, m2, rows, cols) {
  const [r1, c1] = getMintermCoords(rows, cols, m1)
  const [r2, c2] = getMintermCoords(rows, cols, m2)
  let dr = Math.abs(r1 - r2)
  let dc = Math.abs(c1 - c2)
  if (rows === 4 && cols === 4) {
    if (dr === 3) dr = 1
    if (dc === 3) dc = 1
  }
  if (rows === 2 && cols === 4 && dc === 3) dc = 1
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1) || (dr === 0 && dc === 0)
}

function expandGroup(group, allMinterms, rows, cols) {
  let current = [...group]
  let changed = true
  while (changed) {
    changed = false
    for (const m of allMinterms) {
      if (current.includes(m)) continue
      const canAdd = current.every(c => isAdjacent(m, c, rows, cols))
      if (canAdd && formsValidGroup([...current, m], rows, cols)) {
        current.push(m)
        changed = true
        break
      }
    }
  }
  return current
}

function wrappedSpan(indices, n) {
  if (indices.length === 0) return 0
  const sorted = [...new Set(indices)].sort((a, b) => a - b)
  if (n === 2) return sorted.length
  if (n === 4 && sorted.length > 0) {
    const hasWrap = sorted[0] === 0 && sorted[sorted.length - 1] === n - 1
    if (hasWrap) return sorted.length
    return sorted[sorted.length - 1] - sorted[0] + 1
  }
  return sorted[sorted.length - 1] - sorted[0] + 1
}

function formsValidGroup(group, rows, cols) {
  const size = group.length
  if (size !== 1 && size !== 2 && size !== 4 && size !== 8) return false
  const coords = group.map(m => getMintermCoords(rows, cols, m))
  const rs = [...new Set(coords.map(([r]) => r))]
  const cs = [...new Set(coords.map(([, c]) => c))]
  const rowSpan = wrappedSpan(rs, rows)
  const colSpan = wrappedSpan(cs, cols)
  if (rowSpan * colSpan !== size) return false
  for (const r of rs) {
    for (const c of cs) {
      const m = getMintermAt(rows, cols, r, c)
      if (!group.includes(m)) return false
    }
  }
  return true
}

export function minimizeKMap(cells, rows, cols) {
  const sopResult = findGroupsSimplified(cells, rows, cols, 1)
  const posResult = findGroupsSimplified(cells, rows, cols, 0)
  return { sop: sopResult, pos: posResult }
}

function findGroupsSimplified(cells, rows, cols, target) {
  const n = rows * cols
  const varCount = getVarCount(rows, cols)
  const targetMinterms = []   // 1s and Xs for SOP; 0s and Xs for POS (all cells we can use in groups)
  const requiredMinterms = [] // Only 1s for SOP, only 0s for POS (must be covered)
  for (let i = 0; i < n; i++) {
    const val = cells[i]
    if (target === 1) {
      if (val === 1 || val === 'x') targetMinterms.push(i)
      if (val === 1) requiredMinterms.push(i)
    } else {
      if (val === 0) {
        targetMinterms.push(i)
        requiredMinterms.push(i)
      } else if (val === 'x') {
        targetMinterms.push(i)
      }
    }
  }

  const allPossibleGroups = []
  const literalSep = target === 1 ? '·' : '+'
  const addGroup = (group) => {
    if (group.length >= 1 && (group.length & (group.length - 1)) === 0) {
      const term = groupToTerm(group, varCount, target === 0, literalSep)
      if (term) {
        allPossibleGroups.push({ term, minterms: [...group], size: group.length })
      }
    }
  }

  for (const m of targetMinterms) {
    addGroup([m])
  }
  for (let i = 0; i < targetMinterms.length; i++) {
    for (let j = i + 1; j < targetMinterms.length; j++) {
      if (isAdjacent(targetMinterms[i], targetMinterms[j], rows, cols)) {
        addGroup([targetMinterms[i], targetMinterms[j]])
      }
    }
  }
  for (let i = 0; i < targetMinterms.length; i++) {
    for (let j = i + 1; j < targetMinterms.length; j++) {
      for (let k = j + 1; k < targetMinterms.length; k++) {
        for (let l = k + 1; l < targetMinterms.length; l++) {
          const g = [targetMinterms[i], targetMinterms[j], targetMinterms[k], targetMinterms[l]]
          if (formsValidGroup(g, rows, cols)) addGroup(g)
        }
      }
    }
  }
  if (rows === 4 && cols === 4 && targetMinterms.length >= 8) {
    const rowPairs = [[0, 1], [1, 2], [2, 3], [3, 0]]
    const colPairs = [[0, 1], [1, 2], [2, 3], [3, 0]]
    for (const [r1, r2] of rowPairs) {
      const g = [0, 1, 2, 3].flatMap(c => [getMintermAt(4, 4, r1, c), getMintermAt(4, 4, r2, c)])
      const valid = g.every(m => targetMinterms.includes(m)) && formsValidGroup(g, 4, 4)
      if (valid) addGroup(g)
    }
    for (const [c1, c2] of colPairs) {
      const g = [0, 1, 2, 3].flatMap(r => [getMintermAt(4, 4, r, c1), getMintermAt(4, 4, r, c2)])
      const valid = g.every(m => targetMinterms.includes(m)) && formsValidGroup(g, 4, 4)
      if (valid) addGroup(g)
    }
  }

  const primeImplicants = []
  const seen = new Set()
  for (const g of allPossibleGroups.sort((a, b) => b.size - a.size)) {
    const key = g.minterms.sort((a, b) => a - b).join(',')
    if (seen.has(key)) continue
    let isPrime = true
    for (const other of allPossibleGroups) {
      if (other === g || other.size <= g.size) continue
      if (g.minterms.every(m => other.minterms.includes(m))) {
        isPrime = false
        break
      }
    }
    if (isPrime) {
      primeImplicants.push(g)
      seen.add(key)
    }
  }

  const essential = []
  for (const m of requiredMinterms) {
    const covering = primeImplicants.filter(pi => pi.minterms.includes(m))
    if (covering.length === 1) {
      if (!essential.find(e => e.term === covering[0].term)) {
        essential.push(covering[0])
      }
    }
  }

  const covered = new Set(essential.flatMap(e => e.minterms))
  let needed = requiredMinterms.filter(m => !covered.has(m))
  const minCover = [...essential]
  const remaining = primeImplicants.filter(pi => !essential.includes(pi))
  while (needed.length > 0) {
    const best = remaining
      .filter(pi => pi.minterms.some(m => needed.includes(m)))
      .sort((a, b) => {
        const aCovers = a.minterms.filter(m => needed.includes(m)).length
        const bCovers = b.minterms.filter(m => needed.includes(m)).length
        return bCovers - aCovers || b.minterms.length - a.minterms.length
      })[0]
    if (!best) break
    minCover.push(best)
    best.minterms.forEach(m => covered.add(m))
    needed = requiredMinterms.filter(m => !covered.has(m))
  }

  const terms = minCover.map(pi => pi.term)
  const formula = target === 1
    ? terms.join(' + ')   // SOP: product terms ORed
    : terms.map(t => `(${t})`).join(' · ')  // POS: sum terms ANDed

  return {
    primeImplicants: primeImplicants.map(pi => ({ term: pi.term, minterms: pi.minterms })),
    essentialPrimeImplicants: essential.map(e => e.term),
    essentialPrimeImplicantsWithMinterms: essential.map(e => ({ term: e.term, minterms: e.minterms })),
    minimized: formula,
    terms,
  }
}

function literalWithNot(name, negated) {
  return negated ? name + OVERBAR : name
}

function groupToTerm(group, varCount, negate, literalSep) {
  const binaries = group.map(m => mintermToBinary(m, varCount))
  const literals = []
  for (let i = 0; i < varCount; i++) {
    const bits = binaries.map(b => b[i])
    const all0 = bits.every(b => b === '0')
    const all1 = bits.every(b => b === '1')
    if (all0) literals.push(literalWithNot(VAR_NAMES[i], !negate))
    if (all1) literals.push(literalWithNot(VAR_NAMES[i], negate))
  }
  return literals.join(literalSep || '')
}

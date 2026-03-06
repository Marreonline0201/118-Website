/**
 * K-map minimization using Gemini API for correct results
 */
import { GoogleGenAI } from '@google/genai'

const OVERBAR = '\u0305'

function buildKmapDescription(cells, rows, cols) {
  const layout = getLayout(rows, cols)
  let desc = `K-map (${rows}×${cols}):\n`
  desc += `Variables: ${layout.vars.join(', ')}\n`
  desc += `Format: ${layout.format}\n\n`
  desc += 'Minterm values (0=0, 1=1, X=don\'t care):\n'
  const n = rows * cols
  for (let i = 0; i < n; i++) {
    desc += `m${i}: ${cells[i]}\n`
  }
  return desc
}

function getLayout(rows, cols) {
  if (rows === 2 && cols === 2) return { vars: ['A', 'B'], format: 'A\\B' }
  if (rows === 2 && cols === 4) return { vars: ['A', 'B', 'C'], format: 'A\\BC (rows=A, cols=BC in Gray code 00,01,11,10)' }
  if (rows === 4 && cols === 4) return { vars: ['A', 'B', 'C', 'D'], format: 'AB\\CD (rows=AB, cols=CD in Gray code)' }
  return { vars: [], format: '' }
}

function parseGeminiResponse(text) {
  const result = { sop: null, pos: null, sopEssential: [], posEssential: [] }
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (line.toUpperCase().startsWith('SOP:')) {
      result.sop = line.replace(/^SOP:\s*/i, '').replace(/^[=:\s]+/, '').trim()
    } else if (line.toUpperCase().startsWith('POS:')) {
      result.pos = line.replace(/^POS:\s*/i, '').replace(/^[=:\s]+/, '').trim()
    } else if (line.toLowerCase().includes('essential') && line.toLowerCase().includes('sop')) {
      const match = line.match(/\[([^\]]+)\]|:\s*(.+)/i)
      if (match) {
        const terms = (match[1] || match[2] || '').split(/[,;]/).map(t => t.trim()).filter(Boolean)
        result.sopEssential = terms
      }
    } else if (line.toLowerCase().includes('essential') && line.toLowerCase().includes('pos')) {
      const match = line.match(/\[([^\]]+)\]|:\s*(.+)/i)
      if (match) {
        const terms = (match[1] || match[2] || '').split(/[,;]/).map(t => t.trim()).filter(Boolean)
        result.posEssential = terms
      }
    }
  }
  if (!result.sop && text.includes('SOP')) {
    const sopMatch = text.match(/SOP[:\s]+([^\n]+)/i)
    if (sopMatch) result.sop = sopMatch[1].trim()
  }
  if (!result.pos && text.includes('POS')) {
    const posMatch = text.match(/POS[:\s]+([^\n]+)/i)
    if (posMatch) result.pos = posMatch[1].trim()
  }
  if (!result.sopEssential.length && result.sop) {
    result.sopEssential = result.sop.split('+').map(t => t.trim()).filter(Boolean)
  }
  if (!result.posEssential.length && result.pos) {
    const match = result.pos.match(/\(([^)]+)\)/g)
    if (match) result.posEssential = match.map(m => m.replace(/^\(|\)$/g, '').trim())
  }
  return result
}

function normalizeNotation(str) {
  if (!str) return str
  return str
    .replace(/'/g, OVERBAR)
    .replace(/\^/g, OVERBAR)
    .replace(/¬/g, OVERBAR)
    .replace(/!/g, OVERBAR)
    .replace(/\b([A-D])\s*bar\b/gi, '$1' + OVERBAR)
    .replace(/\b([A-D])\s*'\b/gi, '$1' + OVERBAR)
}

function parseLiteral(p) {
  const negated = p.endsWith(OVERBAR) || p.includes("'")
  const name = (p.replace(OVERBAR, '').replace(/'/g, '').match(/[A-D]/i) || [])[0]?.toUpperCase()
  return name ? { name, negated } : null
}

function mintermsFromTerm(term, varCount, isSOP) {
  const vars = ['A', 'B', 'C', 'D'].slice(0, varCount)
  const sep = isSOP ? /[·\*]/ : /\+/
  const parts = term.replace(/^\(|\)$/g, '').split(sep).map(p => p.trim()).filter(Boolean)
  const literals = parts.map(parseLiteral).filter(Boolean)
  if (literals.length === 0) return []
  const n = Math.pow(2, varCount)
  const allMinterms = []
  for (let m = 0; m < n; m++) {
    const bin = m.toString(2).padStart(varCount, '0')
    let match = true
    for (const { name, negated } of literals) {
      const idx = vars.indexOf(name)
      if (idx >= 0) {
        const bit = bin[idx] === '1'
        if (isSOP) {
          if (negated && bit) match = false
          if (!negated && !bit) match = false
        } else {
          if (negated && !bit) match = false
          if (!negated && bit) match = false
        }
      }
    }
    if (match) allMinterms.push(m)
  }
  return allMinterms
}

export async function minimizeWithGemini(cells, rows, cols) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY not set. Add it to .env for Gemini-powered minimization.')
  }

  const kmapDesc = buildKmapDescription(cells, rows, cols)
  const varCount = rows === 2 && cols === 2 ? 2 : rows === 2 && cols === 4 ? 3 : 4

  const prompt = `You are an expert in Boolean algebra and Karnaugh map minimization.

${kmapDesc}

Using the Quine-McCluskey method or K-map grouping rules, find the MINIMIZED Boolean function.

RULES:
- Use overbar (̄) for NOT: Ā means NOT A (use Unicode combining overline U+0305 after the letter)
- Use · (middle dot) for AND
- Use + for OR
- For SOP: group 1s and X (don't cares). Each product term: literals joined by ·
- For POS: group 0s. Each sum term in parentheses, literals joined by +. Product terms joined by ·
- Identify ESSENTIAL prime implicants (those covering at least one minterm not covered by any other PI)

Respond in this EXACT format:
SOP: <minimized SOP expression>
POS: <minimized POS expression>
Essential SOP terms: <comma-separated list of essential product terms>
Essential POS terms: <comma-separated list of essential sum terms>

Example for F = Σ(0,1,2,3):
SOP: Ā
POS: (Ā)
Essential SOP terms: Ā
Essential POS terms: Ā`

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  })

  let text = ''
  if (response?.text) text = typeof response.text === 'function' ? response.text() : response.text
  if (!text && response?.candidates?.[0]?.content?.parts?.[0]) {
    const part = response.candidates[0].content.parts[0]
    text = part.text || part.inlineData?.data || ''
  }
  if (!text) throw new Error('No response from Gemini')

  const parsed = parseGeminiResponse(text)
  let sop = parsed.sop ? normalizeNotation(parsed.sop) : null
  let pos = parsed.pos ? normalizeNotation(parsed.pos) : null

  const sopEssential = (parsed.sopEssential || []).map(t => normalizeNotation(t))
  const posEssential = (parsed.posEssential || []).map(t => normalizeNotation(t))

  const sopEssentialWithMinterms = sopEssential.map(term => ({
    term,
    minterms: mintermsFromTerm(term, varCount, true),
  })).filter(x => x.minterms.length > 0)

  const posEssentialWithMinterms = posEssential.map(term => ({
    term,
    minterms: mintermsFromTerm(term.replace(/^\(|\)$/g, '').trim(), varCount, false),
  })).filter(x => x.minterms.length > 0)

  return {
    sop: {
      minimized: sop || '—',
      primeImplicants: sopEssentialWithMinterms,
      essentialPrimeImplicants: sopEssential,
      essentialPrimeImplicantsWithMinterms: sopEssentialWithMinterms,
    },
    pos: {
      minimized: pos || '—',
      primeImplicants: posEssentialWithMinterms,
      essentialPrimeImplicants: posEssential,
      essentialPrimeImplicantsWithMinterms: posEssentialWithMinterms,
    },
  }
}

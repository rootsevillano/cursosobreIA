// Currículo de ai-engineering-from-scratch traducido al castellano (módulo m9).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RAIZ_APP } from './util.mjs'

const BASE = 'https://github.com/rohitg00/ai-engineering-from-scratch/tree/main/'
const FUENTE = join(RAIZ_APP, 'tools', 'fuentes', 'ai-engineering-from-scratch', 'README.md')
const TRAD = JSON.parse(readFileSync(join(RAIZ_APP, 'tools', 'traducciones', 'ai-engineering-from-scratch.json'), 'utf8'))
const TIPOS = { Build: 'Construir', Learn: 'Aprender' }

// Extrae fases y lecciones del README original.
function leerFases() {
  const lineas = readFileSync(FUENTE, 'utf8').split('\n')
  const fases = {} // num -> { num, nombre, descripcion, filas: [] }
  let fase = null
  let track = null
  for (const l of lineas) {
    const h = l.match(/^### Phase (\d+):/) || l.match(/<summary><b>Phase (\d+) —/)
    if (h) {
      fase = h[1]
      fases[fase] = fases[fase] ?? { num: fase, filas: [] }
      track = null
      continue
    }
    if (!fase) continue
    if (/^\|\s*\d{2}\s*\|/.test(l)) {
      const c = l.split('|').slice(1, -1).map((x) => x.trim())
      const [num, nombreCelda, c3, c4] = c
      const enlace = nombreCelda.match(/\[([^\]]+)\]\(([^)]+)\)/)
      const nombre = enlace ? enlace[1] : nombreCelda
      const url = enlace ? BASE + enlace[2] : null
      if (/^[A-I]\. /.test(c3)) track = c3
      fases[fase].filas.push({ num, nombre, url, tipo: TIPOS[c3] ?? null, deps: c3.startsWith('P') || c3.startsWith('A.') || c3.startsWith('B.') || c3.startsWith('C.') || c3.startsWith('D.') || c3.startsWith('E.') || c3.startsWith('F.') || c3.startsWith('G.') || c3.startsWith('H.') || c3.startsWith('I.') ? c3 : null, lenguajes: c4 ?? '', track })
    }
  }
  return fases
}

function traducirFila(fase, f) {
  const clave = `${fase}-${f.num}`
  const nombreEs = TRAD.lecciones[clave] ?? f.nombre
  const enlace = f.url ? `[${nombreEs}](${f.url})` : nombreEs
  return { clave, nombreEs, enlace, tipo: f.tipo ? (TIPOS[f.tipo] ?? f.tipo) : (f.track ? 'Construir' : ''), lenguajes: f.lenguajes.replace(/—/g, '—') }
}

export function leccionesCurriculo(origen) {
  const fases = leerFases()
  const lecciones = []
  const faltan = []
  const tiempo = (n) => Math.max(3, Math.round(n / 4))
  for (const num of Object.keys(fases).map(Number).sort((a, b) => a - b)) {
    const f = fases[num]
    const info = TRAD.fases[String(num)]
    if (!info) continue
    const filas = f.filas
    const esFinal = num === 19
    const normales = esFinal ? filas.filter((x) => x.track === null || x.track === undefined || !/^[A-I]\./.test(x.track)) : filas
    const tracks = esFinal ? filas.filter((x) => /^[A-I]\./.test(x.track ?? '')) : []
    const base = (id, titulo, rows, cab, descr, productos = false) => {
      const tr = rows.map((r) => {
        const t = traducirFila(num, r)
        if (!TRAD.lecciones[t.clave]) faltan.push(t.clave)
        const tercera = productos ? (r.deps ?? "").replace(/P(d+)/g, "Fase $1") : t.tipo
        return [r.num, t.enlace, tercera, t.lenguajes]
      })
      const bloques = [
        { tipo: 'parrafo', texto: descr },
        { tipo: 'tabla', cabeceras: cab, filas: tr },
      ]
      lecciones.push({
        id,
        titulo,
        dificultad: num <= 4 ? 'basica' : num <= 12 ? 'intermedia' : 'avanzada',
        tiempoLecturaMin: Math.max(5, filas.length * 2),
        origen,
        fuentes: [{ titulo: 'Repositorio original: ai-engineering-from-scratch', url: 'https://github.com/rohitg00/ai-engineering-from-scratch', tipo: 'docs' }],
        bloques,
      })
    }
    if (!esFinal) {
      base(`m9-f${String(num).padStart(2, '0')}`, `Fase ${num}: ${info.nombre}`, normales, ['Nº', 'Lección', 'Tipo', 'Lenguajes'], info.descripcion)
    } else {
      base('m9-f19-proyectos', 'Fase 19: Proyectos finales de extremo a extremo', normales, ['Nº', 'Proyecto', 'Fases relacionadas', 'Lenguajes'], `${info.descripcion} Cada proyecto integra varias fases anteriores; la columna «Fases relacionadas» indica de qué fases depende.`, true)
      const grupos = {}
      for (const t of tracks) (grupos[t.track] = grupos[t.track] ?? []).push(t)
      for (const [trackOrig, rows] of Object.entries(grupos)) {
        const letra = trackOrig[0]
        const nombre = TRAD.tracks[`${letra}.`] ?? trackOrig
        base(`m9-f19-${letra}`, `Fase 19 · ${nombre}`, rows, ['Nº', 'Lección', 'Tipo', 'Lenguajes'], `Itinerario de construcción «${nombre}» dentro de la fase de proyectos finales.`)
      }
    }
  }
  return { lecciones, faltan }
}

// Conversor Markdown -> bloques del curso (ver src/types.ts).
// Pensado para los README de los repositorios del temario: títulos, párrafos, listas, tablas,
// bloques de código, citas (notas) y enlaces. Las imágenes y el HTML se eliminan.

const ALIAS_LENGUAJE = {
  python: 'python', py: 'python',
  ts: 'ts', typescript: 'ts', tsx: 'ts', js: 'ts', javascript: 'ts', jsx: 'ts',
  json: 'json',
}

function limpiarInline(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // imágenes
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '') // insignias enlazadas
    .replace(/\[([^\]]+)\]\((\.{0,2}\/[^)]*)\)/g, '$1') // enlaces relativos del repo -> solo texto
    .replace(/<\/?(p|div|span|details|summary|br|img|a|sup|sub|h[1-6]|table|tr|td|th|picture|source|center)\b[^>]*>/gi, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function esSeparadorTabla(linea) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(linea)
}

function partirCeldas(linea) {
  return linea
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => limpiarInline(c))
}

// Convierte un documento Markdown en un array de bloques.
// Devuelve { titulo, bloques } donde titulo es el primer encabezado de nivel 1 o null.
export function markdownABloques(texto) {
  const lineas = texto.replace(/\r\n/g, '\n').split('\n')
  const bloques = []
  let titulo = null
  let parrafo = []
  let i = 0

  const volcarParrafo = () => {
    if (parrafo.length) {
      const t = limpiarInline(parrafo.join(' '))
      if (t) bloques.push({ tipo: 'parrafo', texto: t })
      parrafo = []
    }
  }

  while (i < lineas.length) {
    const linea = lineas[i]

    // Bloque de código
    const fence = linea.match(/^\s*(```|~~~)\s*([\w+#.-]*)/)
    if (fence) {
      volcarParrafo()
      const marca = fence[1]
      const lang = (fence[2] || 'text').toLowerCase()
      const cod = []
      i++
      while (i < lineas.length && !lineas[i].trim().startsWith(marca)) {
        cod.push(lineas[i])
        i++
      }
      i++ // cierre
      const codigo = cod.join('\n').replace(/\s+$/, '')
      if (codigo.trim()) {
        bloques.push({
          tipo: 'codigo',
          lenguaje: ALIAS_LENGUAJE[lang] ?? 'text',
          codigo,
          comentario: lang === 'text' ? 'Fragmento' : `Ejemplo en ${lang}`,
        })
      }
      continue
    }

    // Encabezados
    const h = linea.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      volcarParrafo()
      const nivel = h[1].length
      const t = limpiarInline(h[2].replace(/#+\s*$/, ''))
      if (nivel === 1 && titulo === null) titulo = t
      else if (t) bloques.push({ tipo: 'subtitulo', nivel, texto: t })
      i++
      continue
    }

    // Tablas
    if (/^\s*\|/.test(linea) && i + 1 < lineas.length && esSeparadorTabla(lineas[i + 1])) {
      volcarParrafo()
      const cabeceras = partirCeldas(linea)
      i += 2
      const filas = []
      while (i < lineas.length && /^\s*\|/.test(lineas[i])) {
        filas.push(partirCeldas(lineas[i]))
        i++
      }
      bloques.push({ tipo: 'tabla', cabeceras, filas })
      continue
    }

    // Citas -> notas (incluye alertas de GitHub > [!NOTE])
    if (/^\s*>/.test(linea)) {
      volcarParrafo()
      const cita = []
      while (i < lineas.length && /^\s*>/.test(lineas[i])) {
        cita.push(lineas[i].replace(/^\s*>\s?/, ''))
        i++
      }
      let etiqueta = ''
      const alerta = cita[0]?.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i)
      if (alerta) {
        const nombres = { NOTE: 'Nota', TIP: 'Consejo', IMPORTANT: 'Importante', WARNING: 'Atención', CAUTION: 'Precaución' }
        etiqueta = `**${nombres[alerta[1].toUpperCase()]}:** `
        cita.shift()
      }
      const t = limpiarInline(cita.join(' '))
      if (t) bloques.push({ tipo: 'nota', texto: etiqueta + t })
      continue
    }

    // Listas
    if (/^\s*([-*+]|\d+[.)])\s+/.test(linea)) {
      volcarParrafo()
      const items = []
      while (i < lineas.length && (/^\s*([-*+]|\d+[.)])\s+/.test(lineas[i]) || (/^\s{2,}\S/.test(lineas[i]) && items.length))) {
        const m = lineas[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/)
        if (m) {
          const anidado = m[1].length >= 2
          const t = limpiarInline(m[3])
          if (t) items.push((anidado ? '– ' : '') + t)
        } else {
          // continuación de un ítem
          items[items.length - 1] = `${items[items.length - 1]} ${limpiarInline(lineas[i])}`
        }
        i++
      }
      if (items.length) bloques.push({ tipo: 'lista', items })
      continue
    }

    // Líneas en blanco separan párrafos
    if (linea.trim() === '') {
      volcarParrafo()
      i++
      continue
    }

    // Línea HTML o imagen sola: se ignora
    if (/^\s*<\/?[a-zA-Z]/.test(linea) && !limpiarInline(linea)) {
      i++
      continue
    }

    parrafo.push(linea.trim())
    i++
  }
  volcarParrafo()

  return { titulo, bloques: bloques.filter((b) => b.tipo !== 'parrafo' || b.texto.length > 0) }
}

// Heurística para detectar texto que aún está en inglés (para revisar el castellano).
const PALABRAS_INGLES = /\b(the|and|with|for|this|that|you|your|are|is|will|can|lesson|learn|using|use|how|what)\b/gi
const PALABRAS_ESPANOL = /\b(el|la|los|las|de|que|y|en|con|para|por|una|un|es|se|del|al|como|más)\b/gi

export function proporcionInglesa(texto) {
  const en = (texto.match(PALABRAS_INGLES) ?? []).length
  const es = (texto.match(PALABRAS_ESPANOL) ?? []).length
  return en + es === 0 ? 0 : en / (en + es)
}

// Quita bloques con texto en chino, japonés o coreano (selectores de idioma de las traducciones).
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]/
export function quitarBloquesNoCastellano(bloques) {
  return bloques.filter((b) => {
    const t = b.texto ?? b.items?.join(' ') ?? b.codigo ?? (b.filas ? b.filas.flat().join(' ') : '')
    return !CJK.test(t)
  })
}

// Utilidades compartidas por las herramientas de mantenimiento del curso.
// Sin dependencias externas: Node 18+ (fetch nativo).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const RAIZ_APP = resolve(here, '..', '..')
export const RUTA_CURSO = resolve(RAIZ_APP, 'src', 'data', 'curso.json')
export const DIR_INFORMES = resolve(RAIZ_APP, 'tools', 'informes')

export function cargarCurso() {
  return JSON.parse(readFileSync(RUTA_CURSO, 'utf8'))
}

export function leccionesPlanas(curso) {
  return curso.modulos.flatMap((m) =>
    m.lecciones.map((l) => ({ ...l, moduloId: m.id, moduloTitulo: m.titulo })),
  )
}

// Convierte los bloques de una lección en texto plano para enviarlo a revisión.
export function textoBloques(bloques) {
  return bloques
    .map((b) => {
      switch (b.tipo) {
        case 'parrafo':
        case 'nota':
          return b.texto
        case 'lista':
          return b.items.map((i) => `- ${i}`).join('\n')
        case 'tabla':
          return [b.cabeceras.join(' | '), ...b.filas.map((f) => f.join(' | '))].join('\n')
        case 'codigo':
          return `[código ${b.lenguaje}: ${b.comentario}]\n${b.codigo}`
      }
    })
    .join('\n\n')
}

// Descarga una URL con tiempo límite. Nunca lanza: devuelve { ok, status, url, texto, error }.
export async function descargar(url, { timeoutMs = 20000, headers = {} } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'curso-ia-mantenimiento/1.0', accept: '*/*', ...headers },
    })
    const cuerpo = await res.text()
    return { ok: res.ok, status: res.status, url: res.url, texto: cuerpo }
  } catch (e) {
    return { ok: false, status: 0, url, texto: '', error: e.name === 'AbortError' ? 'tiempo agotado' : e.message }
  } finally {
    clearTimeout(t)
  }
}

// HTML -> texto legible (aproximado, sin dependencias).
export function htmlATexto(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function huella(texto) {
  return createHash('sha256').update(texto).digest('hex').slice(0, 16)
}

export function leerJSON(ruta, porDefecto) {
  if (!existsSync(ruta)) return porDefecto
  try {
    return JSON.parse(readFileSync(ruta, 'utf8'))
  } catch {
    return porDefecto
  }
}

export function escribir(ruta, contenido) {
  mkdirSync(dirname(ruta), { recursive: true })
  writeFileSync(ruta, contenido, 'utf8')
}

export function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

// Llamada opcional a la API de Claude. Devuelve null si no hay clave configurada.
export function claudeDisponible() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export async function preguntarClaude(prompt, { maxTokens = 2000 } = {}) {
  const modelo = process.env.CURSO_MODELO || 'claude-sonnet-5-5'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`API de Claude respondió ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return data.content.filter((c) => c.type === 'text').map((c) => c.text).join('')
}

// Extrae el primer objeto JSON de una respuesta de texto del modelo.
export function extraerJSON(texto) {
  const ini = texto.indexOf('{')
  const fin = texto.lastIndexOf('}')
  if (ini === -1 || fin === -1) throw new Error('La respuesta no contiene JSON')
  return JSON.parse(texto.slice(ini, fin + 1))
}

// ---------- Tavily (búsqueda web) ----------
// Requiere TAVILY_API_KEY en el entorno. Nunca lanza: devuelve [] si falla.
export function tavilyDisponible() {
  return Boolean(process.env.TAVILY_API_KEY)
}

export async function buscarTavily(consulta, { maxResults = 5, dias = 365, tema = 'general', profundidad = 'basic' } = {}) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: consulta,
        search_depth: profundidad,
        max_results: maxResults,
        topic: tema,
        days: dias,
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`Tavily respondió ${res.status}`)
    const data = await res.json()
    return (data.results ?? []).map((r) => ({
      titulo: r.title,
      url: r.url,
      contenido: (r.content ?? '').replace(/\s+/g, ' ').trim(),
      publicado: r.published_date ?? null,
      puntuacion: r.score ?? null,
    }))
  } catch (e) {
    console.log(`  ✗ Tavily "${consulta.slice(0, 50)}": ${e.message}`)
    return []
  }
}

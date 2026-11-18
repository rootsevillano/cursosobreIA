#!/usr/bin/env node
// Verifica que el contenido del curso siga siendo correcto.
//
// Fase 1 (siempre): comprueba cada fuente original (código HTTP, contenido actual y si cambió
//          desde la última ejecución, comparando huellas guardadas en informes/estado-fuentes.json).
// Fase 2 (si hay ANTHROPIC_API_KEY): contrasta cada lección, pregunta de quiz y término del glosario
//          con el texto actual de sus fuentes y marca lo vigente, dudoso o desactualizado.
//
// Uso:
//   node tools/verificar-curso.mjs                 # todo el curso
//   node tools/verificar-curso.mjs --modulo m2     # solo un módulo
//   node tools/verificar-curso.mjs --solo-enlaces  # fase 1 únicamente

import { join } from 'node:path'
import {
  cargarCurso,
  claudeDisponible,
  descargar,
  DIR_INFORMES,
  escribir,
  extraerJSON,
  fechaHoy,
  htmlATexto,
  huella,
  leerJSON,
  leccionesPlanas,
  preguntarClaude,
  textoBloques,
  buscarTavily,
  tavilyDisponible,
} from './lib/util.mjs'

const args = process.argv.slice(2)
const moduloArg = args.includes('--modulo') ? args[args.indexOf('--modulo') + 1] : null
const soloEnlaces = args.includes('--solo-enlaces')
const usarIA = !soloEnlaces && claudeDisponible()

const MAX_EXTRACTO = 12000 // caracteres de cada fuente enviados al modelo

const curso = cargarCurso()
const modulos = curso.modulos.filter((m) => !moduloArg || m.id === moduloArg)
if (modulos.length === 0) {
  console.error(`No existe el módulo "${moduloArg}".`)
  process.exit(1)
}

const rutaEstado = join(DIR_INFORMES, 'estado-fuentes.json')
const estadoPrevio = leerJSON(rutaEstado, {})
const estadoNuevo = {}

// ---------- Fase 1: fuentes ----------
const urlsUnicas = [...new Set(modulos.flatMap((m) => m.lecciones.flatMap((l) => l.fuentes.map((f) => f.url))))]
console.log(`Comprobando ${urlsUnicas.length} fuentes…`)

const contenidoFuentes = {} // url -> texto extraído (para fase 2)
const resultadosFuentes = {}

for (const url of urlsUnicas) {
  const r = await descargar(url, { timeoutMs: 25000 })
  const esHtml = /<html|<!doctype/i.test(r.texto)
  const texto = r.ok ? (esHtml ? htmlATexto(r.texto) : r.texto.trim()) : ''
  const h = texto ? huella(texto) : null
  const previa = estadoPrevio[url]?.huella
  let estado
  if (!r.ok) estado = 'error'
  else if (texto.length < 200) estado = 'sin_contenido_extraible'
  else if (!previa) estado = 'primera_comprobacion'
  else if (previa === h) estado = 'sin_cambios'
  else estado = 'cambiada'

  resultadosFuentes[url] = {
    estado,
    http: r.status,
    urlFinal: r.url !== url ? r.url : undefined,
    error: r.error,
    caracteres: texto.length,
  }
  if (h) estadoNuevo[url] = { huella: h, comprobada: fechaHoy() }
  else if (estadoPrevio[url]) estadoNuevo[url] = estadoPrevio[url]
  if (texto) contenidoFuentes[url] = texto
  console.log(`  ${estado.padEnd(24)} ${r.status || '---'}  ${url}`)
}

// ---------- Fase 2: contraste con IA ----------
function extractosDe(urls) {
  return urls
    .filter((u) => contenidoFuentes[u])
    .map((u) => `### FUENTE: ${u}\n${contenidoFuentes[u].slice(0, MAX_EXTRACTO)}`)
    .join('\n\n')
}

const resultadosLecciones = []
const resultadosModulos = []

if (usarIA) {
  console.log('\nContrastando contenido con el modelo…')
  for (const m of modulos) {
    const urlsModulo = [...new Set(m.lecciones.flatMap((l) => l.fuentes.map((f) => f.url)))]
    for (const l of m.lecciones) {
      const urls = l.fuentes.map((f) => f.url)
      const webLeccion = tavilyDisponible()
        ? await buscarTavily(`${l.titulo} ${m.titulo} latest developments`, { maxResults: 4, dias: 365, tema: 'general' })
        : []
      const prompt = `Eres revisor técnico de un curso sobre IA, agentes, MCP, skills, harness engineering y metodologías de desarrollo con IA.
Tarea: contrasta la LECCIÓN con el texto ACTUAL de sus fuentes oficiales. Hoy es ${fechaHoy()}.

Para cada afirmación técnica relevante de la lección indica si sigue siendo correcta con las fuentes. Marca "desactualizado" si una fuente actual la contradice o la lección describe algo que ha cambiado (versiones, nombres de API, cifras, modelos, funcionalidades). Señala también novedades importantes que la lección no recoja.
Si una fuente no tiene contenido suficiente, dilo en "motivo" y usa "no_verificable".
Responde SOLO con JSON válido con esta forma:
{"veredicto":"vigente|revisar|desactualizado|sin_datos","afirmaciones":[{"texto":"...","estado":"correcta|dudosa|incorrecta|no_verificable","motivo":"...","fuente":"url o vacío"}],"novedades":["..."],"sugerencia":"..."}
Redacta todo en castellano.

=== LECCIÓN: ${l.titulo} (${m.titulo}) ===
${textoBloques(l.bloques)}

=== FUENTES ACTUALES ===
${extractosDe(urls) || '(sin contenido extraíble)'}

=== BÚSQUEDA WEB ACTUAL (Tavily, últimos 12 meses; puede ser ruido) ===
${webLeccion.length ? webLeccion.map((r) => `- ${r.titulo} (${r.url}) ${r.publicado ?? ''}\n  ${r.contenido.slice(0, 600)}`).join('\n') : '(sin resultados)'}`
      try {
        const salida = extraerJSON(await preguntarClaude(prompt, { maxTokens: 3000 }))
        resultadosLecciones.push({ id: l.id, titulo: l.titulo, modulo: m.id, ...salida })
        console.log(`  lección ${l.id}: ${salida.veredicto}`)
      } catch (e) {
        resultadosLecciones.push({ id: l.id, titulo: l.titulo, modulo: m.id, veredicto: 'sin_datos', error: e.message })
        console.log(`  lección ${l.id}: error (${e.message.slice(0, 80)})`)
      }
    }

    // Quiz y glosario del módulo, contrastados con las fuentes de todo el módulo.
    const glosarioModulo = curso.glosario.filter((g) => g.modulo === m.id)
    const prompt = `Eres revisor técnico de un curso sobre IA y agentes. Hoy es ${fechaHoy()}.
Revisa las PREGUNTAS DE TEST y los TÉRMINOS DE GLOSARIO del módulo "${m.titulo}" usando las FUENTES ACTUALES.
Para cada pregunta: ¿la opción marcada como correcta (índice "correcta", base 0) sigue siendo la correcta? ¿La explicación es exacta?
Para cada término: ¿la definición es correcta y vigente?
Responde SOLO con JSON válido:
{"preguntas":[{"id":"...","estado":"correcta|dudosa|incorrecta","motivo":"..."}],"glosario":[{"termino":"...","estado":"correcta|dudosa|incorrecta","motivo":"..."}]}
Redacta en castellano.

=== PREGUNTAS ===
${JSON.stringify(m.quiz, null, 1)}

=== GLOSARIO ===
${JSON.stringify(glosarioModulo, null, 1)}

=== FUENTES ACTUALES ===
${extractosDe(urlsModulo) || '(sin contenido extraíble)'}`
    try {
      const salida = extraerJSON(await preguntarClaude(prompt, { maxTokens: 4000 }))
      resultadosModulos.push({ modulo: m.id, titulo: m.titulo, ...salida })
      console.log(`  quiz+glosario ${m.id}: revisado`)
    } catch (e) {
      resultadosModulos.push({ modulo: m.id, titulo: m.titulo, error: e.message })
      console.log(`  quiz+glosario ${m.id}: error (${e.message.slice(0, 80)})`)
    }
  }
}

// ---------- Informe ----------
const hoy = fechaHoy()
const sello = new Date().toISOString().slice(0, 16).replace(/:/g, "-").replace("T", "_")
const sufijo = moduloArg ? `-${moduloArg}` : ''
const cambios = Object.entries(resultadosFuentes).filter(([, r]) => r.estado === 'cambiada')
const errores = Object.entries(resultadosFuentes).filter(([, r]) => r.estado === 'error' || r.estado === 'sin_contenido_extraible')

const md = []
md.push(`# Informe de verificación del curso — ${hoy}`)
md.push('')
md.push(`Módulos revisados: ${modulos.map((m) => m.id).join(', ')} · Fuentes comprobadas: ${urlsUnicas.length} · Análisis con IA: ${usarIA ? 'sí' : 'no'}`)
md.push('')
md.push('## 1. Fuentes originales')
md.push('')
md.push(`- Cambiadas desde la última revisión: **${cambios.length}**`)
md.push(`- Con error o sin contenido extraíble: **${errores.length}**`)
md.push('')
md.push('| Estado | HTTP | Fuente |')
md.push('|---|---|---|')
for (const [url, r] of Object.entries(resultadosFuentes)) {
  md.push(`| ${r.estado}${r.error ? ` (${r.error})` : ''} | ${r.http || '—'} | ${url}${r.urlFinal ? ` → ${r.urlFinal}` : ''} |`)
}

if (!soloEnlaces) {
  md.push('')
  md.push('## 2. Lecciones')
  if (!usarIA) {
    md.push('')
    md.push('> Análisis con IA desactivado. Define `ANTHROPIC_API_KEY` y vuelve a ejecutar para contrastar el contenido.')
  }
  for (const r of resultadosLecciones) {
    md.push('')
    md.push(`### ${r.id} · ${r.titulo} — **${r.veredicto}**`)
    if (r.error) md.push(`Error: ${r.error}`)
    for (const a of r.afirmaciones ?? []) {
      if (a.estado !== 'correcta') md.push(`- [${a.estado}] ${a.texto} — ${a.motivo}${a.fuente ? ` (${a.fuente})` : ''}`)
    }
    if (r.novedades?.length) {
      md.push('Novedades a considerar:')
      for (const n of r.novedades) md.push(`- ${n}`)
    }
    if (r.sugerencia) md.push(`Sugerencia: ${r.sugerencia}`)
  }

  md.push('')
  md.push('## 3. Quiz y glosario')
  for (const r of resultadosModulos) {
    md.push('')
    md.push(`### ${r.modulo} · ${r.titulo ?? ''}`)
    if (r.error) md.push(`Error: ${r.error}`)
    for (const p of r.preguntas ?? []) if (p.estado !== 'correcta') md.push(`- Pregunta ${p.id} [${p.estado}]: ${p.motivo}`)
    for (const g of r.glosario ?? []) if (g.estado !== 'correcta') md.push(`- Glosario "${g.termino}" [${g.estado}]: ${g.motivo}`)
  }
}

const rutaMd = join(DIR_INFORMES, `verificacion-${sello}${sufijo}.md`)
const rutaJson = join(DIR_INFORMES, `verificacion-${sello}${sufijo}.json`)
escribir(rutaMd, md.join('\n') + '\n')
escribir(rutaJson, JSON.stringify({ fecha: hoy, fuentes: resultadosFuentes, lecciones: resultadosLecciones, modulos: resultadosModulos }, null, 2))
escribir(rutaEstado, JSON.stringify({ ...estadoPrevio, ...estadoNuevo }, null, 2))

console.log(`\nInforme: ${rutaMd}`)
console.log(`Fuentes cambiadas: ${cambios.length} · con error: ${errores.length}`)

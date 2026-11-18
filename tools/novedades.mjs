#!/usr/bin/env node
// Busca novedades que podrían incorporarse al curso.
//
// Fuentes (sin clave, siempre): arXiv (API de búsqueda) y releases de GitHub de los proyectos del temario.
// Filtros: descarta lo que ya aparece en curso.json y lo que ya se mostró en ejecuciones anteriores
//          (se guarda en informes/novedades-vistas.json), así cada ejecución solo muestra lo nuevo.
// Clasificación (si hay ANTHROPIC_API_KEY): el modelo valora relevancia, módulo sugerido y si encaja
//          como lección nueva o como actualización de una existente.
//
// Uso:
//   node tools/novedades.mjs              # busca y genera informe
//   node tools/novedades.mjs --todas      # incluye también lo ya visto
//   GITHUB_TOKEN=... node tools/novedades.mjs   # evita el límite de peticiones de GitHub

import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { buscarTavily, cargarCurso, claudeDisponible, DIR_INFORMES, descargar, escribir, extraerJSON, fechaHoy, huella, leerJSON, preguntarClaude, RAIZ_APP, tavilyDisponible } from './lib/util.mjs'

const args = process.argv.slice(2)
const mostrarTodas = args.includes('--todas')
const config = JSON.parse(readFileSync(join(RAIZ_APP, 'tools', 'config', 'novedades.json'), 'utf8'))
const curso = cargarCurso()
const hoy = fechaHoy()
const sello = new Date().toISOString().slice(0, 16).replace(/:/g, "-").replace("T", "_")

const urlsCurso = new Set(curso.modulos.flatMap((m) => m.lecciones.flatMap((l) => l.fuentes.map((f) => f.url))))
const idsArxivCurso = new Set([...urlsCurso].map((u) => u.match(/arxiv\.org\/abs\/([\d.]+)/)?.[1]).filter(Boolean))

const rutaVistas = join(DIR_INFORMES, 'novedades-vistas.json')
const vistas = leerJSON(rutaVistas, {})

const candidatos = []
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- arXiv ----------
function parsearAtom(xml) {
  const entradas = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1])
  const limpio = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
  return entradas.map((e) => {
    const id = limpio(e.match(/<id>([\s\S]*?)<\/id>/)?.[1])
    return {
      id,
      titulo: limpio(e.match(/<title>([\s\S]*?)<\/title>/)?.[1]),
      resumen: limpio(e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]).slice(0, 400),
      publicado: limpio(e.match(/<published>([\s\S]*?)<\/published>/)?.[1]).slice(0, 10),
      autores: [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].slice(0, 3).map((x) => limpio(x[1])),
    }
  })
}

console.log('Buscando en arXiv…')
for (const q of config.arxiv) {
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(q.consulta)}&sortBy=submittedDate&sortOrder=descending&max_results=${config.maxPorFuente}`
  const r = await descargar(url, { timeoutMs: 30000 })
  if (!r.ok) {
    console.log(`  ✗ ${q.tema}: ${r.error ?? r.status}`)
  } else {
    const articulos = parsearAtom(r.texto)
    console.log(`  ✓ ${q.tema}: ${articulos.length} resultados`)
    for (const a of articulos) {
      const idCorto = a.id.match(/arxiv\.org\/abs\/([\d.]+)/)?.[1] ?? a.id
      candidatos.push({
        clave: `arxiv:${idCorto}`,
        tipo: 'arXiv',
        titulo: a.titulo,
        fecha: a.publicado,
        url: a.id,
        resumen: a.resumen,
        detalle: a.autores.join(', '),
        moduloSugerido: q.modulo,
        tema: q.tema,
        yaEnCurso: idsArxivCurso.has(idCorto) || urlsCurso.has(a.id),
      })
    }
  }
  await pausa(3500) // arXiv pide no más de una petición cada 3 s
}

// ---------- GitHub releases ----------
const cabeceras = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' }
if (process.env.GITHUB_TOKEN) cabeceras.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

console.log('\nRevisando releases de GitHub…')
const limiteFecha = new Date(Date.now() - config.diasGitHub * 86400000)
for (const g of config.github) {
  const r = await descargar(`https://api.github.com/repos/${g.repo}/releases?per_page=${config.maxPorFuente}`, { headers: cabeceras })
  if (!r.ok) {
    console.log(`  ✗ ${g.repo}: ${r.status || r.error}`)
    continue
  }
  const releases = JSON.parse(r.texto)
  const recientes = releases.filter((rel) => new Date(rel.published_at) >= limiteFecha)
  console.log(`  ✓ ${g.repo}: ${recientes.length} releases en ${config.diasGitHub} días`)
  for (const rel of recientes) {
    candidatos.push({
      clave: `gh:${g.repo}@${rel.tag_name}`,
      tipo: 'Release GitHub',
      titulo: `${g.tema} ${rel.tag_name}${rel.name && rel.name !== rel.tag_name ? ` — ${rel.name}` : ''}`,
      fecha: rel.published_at?.slice(0, 10),
      url: rel.html_url,
      resumen: (rel.body ?? '').replace(/\s+/g, ' ').slice(0, 400),
      detalle: g.repo,
      moduloSugerido: g.modulo,
      tema: g.tema,
      yaEnCurso: [...urlsCurso].some((u) => u.includes(g.repo)),
    })
  }
}

// ---------- Tavily (búsqueda web general) ----------
if (tavilyDisponible() && config.tavily?.length) {
  console.log('\nBuscando en la web con Tavily…')
  for (const t of config.tavily) {
    const resultados = await buscarTavily(t.consulta, { maxResults: config.maxPorFuente, dias: config.diasTavily, tema: 'news', profundidad: 'basic' })
    console.log(`  ✓ ${t.tema}: ${resultados.length} resultados`)
    for (const r of resultados) {
      candidatos.push({
        clave: `web:${huella(r.url)}`,
        tipo: 'Web (Tavily)',
        titulo: r.titulo,
        fecha: r.publicado?.slice(0, 10) ?? null,
        url: r.url,
        resumen: r.contenido.slice(0, 400),
        detalle: `búsqueda: "${t.consulta}"`,
        moduloSugerido: t.modulo,
        tema: t.tema,
        yaEnCurso: urlsCurso.has(r.url),
      })
    }
  }
} else if (config.tavily?.length) {
  console.log('\nTavily no configurado (define TAVILY_API_KEY para buscar en la web).')
}

// ---------- Filtrado de lo ya visto ----------
const nuevos = candidatos.filter((c) => !c.yaEnCurso)
const pendientes = mostrarTodas ? nuevos : nuevos.filter((c) => !vistas[c.clave])
console.log(`\nCandidatos: ${candidatos.length} · fuera del curso: ${nuevos.length} · nuevos desde la última vez: ${pendientes.length}`)

// ---------- Clasificación opcional con IA ----------
let clasificacion = {}
if (claudeDisponible() && pendientes.length > 0) {
  console.log('Clasificando candidatos con el modelo…')
  const lista = pendientes.map((c) => ({ id: c.clave, titulo: c.titulo, fecha: c.fecha, tema: c.tema, resumen: c.resumen }))
  const prompt = `Eres responsable de un curso en castellano sobre IA: modelos (Transformer, razonamiento), ecosistema agéntico (agentes, function calling, MCP, skills, SDK), harness engineering (contexto, ACI, backpressure) y metodologías de desarrollo con IA (TDD, BDD, SDD, ODD, ASDD, FTD, API-First).
Valora cada candidato para decidir si merece entrar en el curso. Hoy es ${hoy}.
Responde SOLO con JSON: {"evaluaciones":[{"id":"...","relevancia":"alta|media|baja","modulo":"m1|m2|m3|m4","accion":"lección nueva|actualizar lección existente|descartar","motivo":"una frase en castellano"}]}
Candidatos:
${JSON.stringify(lista, null, 1)}`
  try {
    const salida = extraerJSON(await preguntarClaude(prompt, { maxTokens: 4000 }))
    clasificacion = Object.fromEntries(salida.evaluaciones.map((e) => [e.id, e]))
  } catch (e) {
    console.log(`  ✗ clasificación: ${e.message}`)
  }
}

// ---------- Informe ----------
const ORDEN = { alta: 0, media: 1, baja: 2 }
const NOMBRES = Object.fromEntries(curso.modulos.map((m) => [m.id, m.titulo]))
const md = [`# Novedades para el curso — ${hoy}`, '']
md.push(`Candidatos revisados: ${candidatos.length} · nuevos desde la última ejecución: ${pendientes.length}${claudeDisponible() ? '' : ' · sin clasificación IA (define ANTHROPIC_API_KEY para valorarlos)'}`)

const grupos = [...new Set(pendientes.map((c) => c.moduloSugerido))].sort()
if (pendientes.length === 0) md.push('', 'No hay novedades nuevas desde la última ejecución.')
for (const mod of grupos) {
  md.push('', `## ${mod} · ${NOMBRES[mod] ?? ''}`)
  const lista = pendientes
    .filter((c) => c.moduloSugerido === mod)
    .sort((a, b) => ORDEN[clasificacion[a.clave]?.relevancia] - ORDEN[clasificacion[b.clave]?.relevancia] || (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  for (const c of lista) {
    const ev = clasificacion[c.clave]
    md.push('')
    md.push(`### ${c.titulo}`)
    md.push(`- Tipo: ${c.tipo} · Fecha: ${c.fecha ?? 'desconocida'} · Tema: ${c.tema}`)
    md.push(`- Enlace: ${c.url}`)
    if (c.detalle) md.push(`- Detalle: ${c.detalle}`)
    if (ev) md.push(`- Valoración IA: **${ev.relevancia}** · ${ev.accion} · ${ev.motivo}`)
    if (c.resumen) md.push(`- Resumen: ${c.resumen}`)
  }
}

const sufijo = mostrarTodas ? '-todas' : ''
escribir(join(DIR_INFORMES, `novedades-${sello}${sufijo}.md`), md.join('\n') + '\n')
escribir(join(DIR_INFORMES, `novedades-${sello}${sufijo}.json`), JSON.stringify({ fecha: hoy, candidatos, clasificacion }, null, 2))

// Marcar como vistos solo los que se han mostrado.
for (const c of pendientes) vistas[c.clave] = { visto: hoy, titulo: huella(c.titulo) }
escribir(rutaVistas, JSON.stringify(vistas, null, 2))

console.log(`\nInforme: ${join(DIR_INFORMES, `novedades-${sello}${sufijo}.md`)}`)

// Catálogos de recursos en castellano: convierte las listas "awesome" en lecciones de m8.
// Los títulos de las obras, herramientas y proyectos se mantienen en su idioma original (son nombres propios);
// las categorías, las introducciones y las explicaciones se escriben en castellano.

import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { markdownABloques } from './markdown.mjs'
import { RAIZ_APP } from './util.mjs'

const FUENTES = join(RAIZ_APP, 'tools', 'fuentes')

// Secciones de metainformación de los repositorios que no aportan contenido al curso.
export const SECCIONES_DESCARTADAS = [
  /table of contents/i,
  /contribut/i,
  /license/i,
  /sponsor/i,
  /star history/i,
  /why official links/i,
  /follow me/i,
  /tabla de contenidos/i,
]

// Traducciones de categorías conocidas (clave: texto del encabezado sin emojis, en minúsculas).
const TRADUCCION_CATEGORIAS = {
  // awesome-deep-learning
  books: 'Libros',
  courses: 'Cursos',
  'videos and lectures': 'Vídeos y clases',
  papers: 'Artículos científicos',
  tutorials: 'Tutoriales',
  researchers: 'Investigadores',
  websites: 'Sitios web',
  datasets: 'Conjuntos de datos',
  conferences: 'Conferencias',
  frameworks: 'Frameworks',
  tools: 'Herramientas',
  miscellaneous: 'Varios',
  // awesome-free-ai-books
  'deep learning': 'Aprendizaje profundo',
  'reinforcement learning': 'Aprendizaje por refuerzo',
  'probabilistic / bayesian': 'Probabilístico y bayesiano',
  'classical machine learning / statistics': 'Aprendizaje automático clásico y estadística',
  'nlp / llms': 'PLN y LLM',
  'mathematics for ml': 'Matemáticas para el aprendizaje automático',
  'ml systems / infrastructure': 'Sistemas e infraestructura de ML',
  'computer vision': 'Visión artificial',
  'generative models (diffusion, gans, vaes)': 'Modelos generativos (difusión, GAN, VAE)',
  'causal inference': 'Inferencia causal',
  'graph neural networks': 'Redes neuronales de grafos',
  'ai safety / alignment': 'Seguridad y alineamiento de la IA',
  'advanced rl / theory': 'Aprendizaje por refuerzo avanzado y teoría',
  'game theory / multi-agent': 'Teoría de juegos y sistemas multiagente',
}

const INTRO_CATEGORIA = {
  'awesome-deep-learning': 'Recursos recopilados del repositorio awesome-deep-learning sobre la categoría',
  'awesome-free-ai-books': 'Libros gratuitos recopilados del repositorio awesome-free-ai-books sobre la categoría',
}

export function traducirTitulo(titulo) {
  const limpio = titulo.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, '').replace(/\s+/g, ' ').trim()
  return TRADUCCION_CATEGORIAS[limpio.toLowerCase()] ?? limpio
}

// Divide los bloques planos en secciones según sus encabezados (nivel 2 o 3).
function seccionesDe(bloques) {
  const secciones = []
  let actual = { titulo: null, bloques: [] }
  for (const b of bloques) {
    if (b.tipo === 'subtitulo' && b.nivel <= 3) {
      if (actual.titulo !== null || actual.bloques.length) secciones.push(actual)
      actual = { titulo: b.texto, bloques: [] }
    } else actual.bloques.push(b)
  }
  secciones.push(actual)
  return secciones
}

function leccionesDeRepo({ archivo, repoNombre, repoUrl, prefijo, origen, dificultad = 'basica' }) {
  const texto = readFileSync(archivo, 'utf8')
  const { bloques } = markdownABloques(texto)
  const lecciones = []
  for (const sec of seccionesDe(bloques)) {
    if (!sec.titulo) continue
    if (SECCIONES_DESCARTADAS.some((re) => re.test(sec.titulo))) continue
    const contenido = sec.bloques.filter((b) => b.tipo === 'lista' || b.tipo === 'tabla' || b.tipo === 'subtitulo')
    if (contenido.length === 0) continue
    const titulo = traducirTitulo(sec.titulo)
    const total = contenido.reduce((n, b) => n + (b.items?.length ?? b.filas?.length ?? 0), 0)
    lecciones.push({
      id: `${prefijo}-${lecciones.length + 1}`,
      titulo,
      dificultad,
      tiempoLecturaMin: Math.max(3, Math.round(total / 6)),
      origen,
      fuentes: [{ titulo: `Repositorio original: ${repoNombre}`, url: repoUrl, tipo: 'docs' }],
      bloques: [
        {
          tipo: 'parrafo',
          texto: `${INTRO_CATEGORIA[repoNombre] ?? 'Recursos recopilados sobre'} «${titulo}»: ${total} entradas. Cada entrada enlaza con la fuente original; comprueba antes de usarla que sigue disponible y que su licencia lo permite.`,
        },
        ...traducirBloques(contenido),
      ],
    })
  }
  return lecciones
}

export function catalogoAwesome() {
  const origen = 'importado'
  return [
    ...leccionesDeRepo({
      archivo: join(FUENTES, 'awesome-deep-learning', 'README.md'),
      repoNombre: 'awesome-deep-learning',
      repoUrl: 'https://github.com/ChristosChristofidis/awesome-deep-learning',
      prefijo: 'm8-adl',
      origen,
    }),
    ...leccionesDeRepo({
      archivo: join(FUENTES, 'awesome-free-ai-books', 'README.md'),
      repoNombre: 'awesome-free-ai-books',
      repoUrl: 'https://github.com/MarcosSete/awesome-free-ai-books',
      prefijo: 'm8-libros',
      origen,
    }),
  ]
}

// Traducción de encabezados de tabla y expresiones habituales de los catálogos.
const CABECERAS = {
  'sr no': 'Nº', '#': 'Nº', name: 'Nombre', link: 'Enlace', book: 'Libro', 'author(s)': 'Autor(es)', author: 'Autor',
  year: 'Año', 'official link': 'Enlace oficial', resource: 'Recurso', description: 'Descripción', project: 'Proyecto', lesson: 'Lección', type: 'Tipo', lang: 'Lenguajes',
}
const EXPRESIONES = [
  [/\bfree author draft\b/gi, 'borrador gratuito del autor'],
  [/\(updated (\d{4})\)/gi, '(actualizado en $1)'],
  [/\bby\b/g, 'de'],
  [/\bfree\b/gi, 'gratuito'],
  [/\bJan\b/g, 'ene'], [/\bFeb\b/g, 'feb'], [/\bMar\b/g, 'mar'], [/\bApr\b/g, 'abr'], [/\bMay\b/g, 'may'], [/\bJun\b/g, 'jun'],
  [/\bJul\b/g, 'jul'], [/\bAug\b/g, 'ago'], [/\bSep\b/g, 'sep'], [/\bOct\b/g, 'oct'], [/\bNov\b/g, 'nov'], [/\bDec\b/g, 'dic'],
]

export function traducirCabecera(c) {
  return CABECERAS[c.trim().toLowerCase()] ?? c
}

export function traducirTexto(t) {
  return EXPRESIONES.reduce((s, [re, rep]) => s.replace(re, rep), t)
}

// Aplica las traducciones de encabezados y expresiones a un array de bloques.
export function traducirBloques(bloques) {
  return bloques.map((b) => {
    if (b.tipo === 'tabla') return { ...b, cabeceras: b.cabeceras.map(traducirCabecera), filas: b.filas.map((f) => f.map(traducirTexto)) }
    if (b.tipo === 'lista') return { ...b, items: b.items.map(traducirTexto) }
    if (b.tipo === 'parrafo' || b.tipo === 'nota') return { ...b, texto: traducirTexto(b.texto) }
    return b
  })
}

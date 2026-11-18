#!/usr/bin/env node
// Importa el contenido de los repositorios del temario a src/data/curso.json.
//
// Fuentes (copias en tools/fuentes/, ver tools/fuentes/README.md):
//   - learn-harness-engineering/docs/es       -> m3 (lecciones, diseños y recursos) y m7 (proyectos)
//   - ML-For-Beginners/translations/es        -> m5 (capítulos, lecciones y tareas) + quiz de es.json
//   - generative-ai-for-beginners/translations/es -> m6 (lecciones y tareas)
//   - awesome-deep-learning, awesome-free-ai-books, 500 proyectos -> m8 (catálogo de recursos)
//
// El script es idempotente: elimina lo importado en una ejecución anterior (campo "origen")
// y vuelve a generarlo. Las lecciones escritas a mano en m1-m4 no se tocan.
//
// Uso: node tools/importar-contenido.mjs

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { escribir, RAIZ_APP, RUTA_CURSO, cargarCurso } from './lib/util.mjs'
import { markdownABloques, quitarBloquesNoCastellano } from './lib/markdown.mjs'
import { catalogoAwesome, traducirBloques } from './lib/catalogos.mjs'
import { leccionesCurriculo } from './lib/curriculo.mjs'

const FUENTES = join(RAIZ_APP, 'tools', 'fuentes')
const EXT_CODIGO = { '.ts': 'ts', '.js': 'ts', '.json': 'json', '.py': 'python', '.sh': 'text', '.txt': 'text', '.yaml': 'text', '.yml': 'text', '.md': null }
const REPO_URL = {
  'learn-harness-engineering': 'walkinglabs/learn-harness-engineering',
  'ML-For-Beginners': 'microsoft/ML-For-Beginners',
  'generative-ai-for-beginners': 'microsoft/generative-ai-for-beginners',
  'awesome-deep-learning': 'ChristosChristofidis/awesome-deep-learning',
  'awesome-free-ai-books': 'MarcosSete/awesome-free-ai-books',
  '500-proyectos': 'ashishpatel26/500-AI-Machine-learning-Deep-learning-Computer-vision-NLP-Projects-with-code',
}

const curso = cargarCurso()
const ORIGEN = 'importado'

// ---------- utilidades ----------
const existe = (p) => existsSync(p)
const esDirectorio = (p) => existe(p) && statSync(p).isDirectory()

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function ordenNatural(a, b) {
  return a.localeCompare(b, 'en', { numeric: true })
}

function urlGithub(repoCarpeta, rutaRelativa) {
  const repo = REPO_URL[repoCarpeta]
  return `https://github.com/${repo}/blob/main/${rutaRelativa.split(sep).join('/')}`
}

function tituloDeMarkdown(texto, porDefecto) {
  const m = texto.match(/^#\s+(.+)$/m)
  if (!m) return porDefecto
  return m[1].replace(/[*_`]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').trim() || porDefecto
}

function tiempoEstimado(bloques) {
  const palabras = JSON.stringify(bloques).split(/\s+/).length
  return Math.max(3, Math.round(palabras / 220))
}

// Recorre recursivamente una carpeta y devuelve archivos ordenados (md y código).
function archivosDe(dir, relBase = '') {
  const salida = []
  for (const nombre of readdirSync(dir).sort(ordenNatural)) {
    if (['images', 'translated_images', 'solution', 'node_modules', '.git'].includes(nombre)) continue
    const ruta = join(dir, nombre)
    const rel = relBase ? join(relBase, nombre) : nombre
    if (esDirectorio(ruta)) salida.push(...archivosDe(ruta, rel))
    else {
      const ext = nombre.slice(nombre.lastIndexOf('.'))
      if (ext in EXT_CODIGO && statSync(ruta).size < 200_000) salida.push({ ruta, rel, ext })
    }
  }
  return salida
}

// Construye una lección a partir de varios archivos. El primero aporta el título.
// `principal` es el archivo que encabeza la lección; el resto se añade como subsecciones.
function leccionDeArchivos({ id, repoCarpeta, principal, resto = [], tituloPorDefecto, dificultad = 'basica', baseRel }) {
  const textoPrincipal = readFileSync(principal.ruta, 'utf8')
  const titulo = tituloDeMarkdown(textoPrincipal, tituloPorDefecto)
  const cuerpo = quitarBloquesNoCastellano(markdownABloques(textoPrincipal).bloques)
  const bloques = [...cuerpo]
  for (const a of resto) {
    const nombre = a.rel.replace(/\\/g, '/').replace(/\.md$/, '')
    const etiqueta = tituloDeMarkdown(readFileSync(a.ruta, 'utf8'), '') || nombre.split('/').pop()
    bloques.push({ tipo: 'subtitulo', nivel: 2, texto: etiqueta })
    if (a.ext === '.md') bloques.push(...quitarBloquesNoCastellano(markdownABloques(readFileSync(a.ruta, 'utf8')).bloques))
    else {
      bloques.push({
        tipo: 'codigo',
        lenguaje: EXT_CODIGO[a.ext] ?? 'text',
        codigo: readFileSync(a.ruta, 'utf8').replace(/\s+$/, ''),
        comentario: a.rel.replace(/\\/g, '/'),
      })
    }
  }
  return {
    id,
    titulo,
    dificultad,
    tiempoLecturaMin: tiempoEstimado(bloques),
    origen: ORIGEN,
    fuentes: [{ titulo: `Repositorio original: ${REPO_URL[repoCarpeta]}`, url: urlGithub(repoCarpeta, join(baseRel, principal.rel)), tipo: 'curso' }],
    bloques,
  }
}

// ---------- 1. Harness Engineering (m3 y m7) ----------
function importarHarness() {
  const base = join(FUENTES, 'learn-harness-engineering', 'docs', 'es')
  const repo = 'learn-harness-engineering'
  const lecciones = []
  const proyectos = []

  // Lecciones numeradas
  const dirLecciones = join(base, 'lectures')
  for (const carpeta of readdirSync(dirLecciones).sort(ordenNatural)) {
    const dir = join(dirLecciones, carpeta)
    if (!esDirectorio(dir)) continue
    const index = join(dir, 'index.md')
    if (!existe(index)) continue
    const num = carpeta.match(/lecture-(\d+)/)?.[1] ?? '00'
    const resto = archivosDe(dir).filter((a) => a.rel !== 'index.md')
    lecciones.push(
      leccionDeArchivos({
        id: `m3-lec${num}`,
        repoCarpeta: repo,
        principal: { ruta: index, rel: join('lectures', carpeta, 'index.md') },
        resto: resto.map((a) => ({ ...a, rel: join(carpeta, a.rel) })),
        tituloPorDefecto: carpeta,
        dificultad: Number(num) <= 4 ? 'basica' : Number(num) <= 9 ? 'intermedia' : 'avanzada',
        baseRel: join('docs', 'es'),
      }),
    )
  }

  // Diseños de harness de referencia
  const dirDisenos = join(base, 'harness-designs')
  for (const archivo of [join(dirDisenos, 'index.md'), ...readdirSync(dirDisenos).filter((n) => esDirectorio(join(dirDisenos, n))).map((n) => join(dirDisenos, n, 'index.md'))]) {
    if (!existe(archivo)) continue
    const rel = relative(base, archivo)
    lecciones.push(
      leccionDeArchivos({
        id: `m3-dis-${slug(rel.replace(/index\.md$/, '') || 'general')}`,
        repoCarpeta: repo,
        principal: { ruta: archivo, rel },
        tituloPorDefecto: 'Diseños de harness',
        dificultad: 'intermedia',
        baseRel: join('docs', 'es'),
      }),
    )
  }

  // Recursos avanzados (una lección por subcarpeta de primer nivel)
  const dirRecursos = join(base, 'resources')
  if (existe(join(dirRecursos, 'index.md'))) {
    lecciones.push(
      leccionDeArchivos({
        id: 'm3-recursos',
        repoCarpeta: repo,
        principal: { ruta: join(dirRecursos, 'index.md'), rel: join('resources', 'index.md') },
        resto: archivosDe(dirRecursos).filter((a) => a.rel !== 'index.md').map((a) => ({ ...a, rel: join('resources', a.rel) })),
        tituloPorDefecto: 'Recursos de harness',
        dificultad: 'avanzada',
        baseRel: join('docs', 'es'),
      }),
    )
  }

  // Proyectos prácticos (m7)
  const dirProyectos = join(base, 'projects')
  const visionProyectos = join(dirProyectos, 'index.md')
  if (existe(visionProyectos)) {
    proyectos.push(
      leccionDeArchivos({
        id: 'm7-proy-general',
        repoCarpeta: repo,
        principal: { ruta: visionProyectos, rel: join('projects', 'index.md') },
        tituloPorDefecto: 'Proyectos de harness engineering',
        dificultad: 'intermedia',
        baseRel: join('docs', 'es'),
      }),
    )
  }
  for (const carpeta of readdirSync(dirProyectos).sort(ordenNatural)) {
    const index = join(dirProyectos, carpeta, 'index.md')
    if (!carpeta.startsWith('project-') || !existe(index)) continue
    const num = carpeta.match(/project-(\d+)/)?.[1]
    proyectos.push(
      leccionDeArchivos({
        id: `m7-proy${num}`,
        repoCarpeta: repo,
        principal: { ruta: index, rel: join('projects', carpeta, 'index.md') },
        tituloPorDefecto: carpeta,
        dificultad: 'intermedia',
        baseRel: join('docs', 'es'),
      }),
    )
  }
  return { lecciones, proyectos }
}

// ---------- 2. Machine Learning para principiantes (m5) ----------
function importarML() {
  const repo = 'ML-For-Beginners'
  const base = join(FUENTES, repo, 'translations', 'es')
  const lecciones = []
  const capitulos = readdirSync(base).filter((n) => /^\d+-/.test(n) && esDirectorio(join(base, n))).sort(ordenNatural)
  for (const cap of capitulos) {
    const capNum = cap.match(/^(\d+)/)[1]
    const dirCap = join(base, cap)
    const readmeCap = join(dirCap, 'README.md')
    if (existe(readmeCap)) {
      lecciones.push(
        leccionDeArchivos({
          id: `m5-c${capNum}-intro`,
          repoCarpeta: repo,
          principal: { ruta: readmeCap, rel: join(cap, 'README.md') },
          tituloPorDefecto: cap,
          dificultad: 'basica',
          baseRel: join('translations', 'es'),
        }),
      )
    }
    for (const sub of readdirSync(dirCap).sort(ordenNatural)) {
      const dirLec = join(dirCap, sub)
      if (!esDirectorio(dirLec) || ['data', 'solution', 'images'].includes(sub)) continue
      const readme = join(dirLec, 'README.md')
      if (!existe(readme)) continue
      const extras = ['assignment.md'].map((n) => join(dirLec, n)).filter(existe).map((ruta) => ({ ruta, rel: join(cap, sub, 'assignment.md'), ext: '.md' }))
      lecciones.push(
        leccionDeArchivos({
          id: `m5-c${capNum}-${slug(sub)}`,
          repoCarpeta: repo,
          principal: { ruta: readme, rel: join(cap, sub, 'README.md') },
          resto: extras.map((a) => ({ ...a, rel: 'Tarea práctica (assignment.md)' })),
          tituloPorDefecto: sub,
          dificultad: Number(capNum) <= 2 ? 'basica' : 'intermedia',
          baseRel: join('translations', 'es'),
        }),
      )
    }
  }

  // Cuestionarios de la versión española (es.json): todas las preguntas del módulo.
  const quizJson = JSON.parse(readFileSync(join(FUENTES, repo, 'quiz-app', 'src', 'assets', 'translations', 'es.json'), 'utf8'))
  const preguntas = []
  for (const q of quizJson[0].quizzes) {
    for (const p of q.quiz) {
      const correcta = p.answerOptions.findIndex((o) => String(o.isCorrect) === 'true')
      if (correcta < 0 || p.answerOptions.length < 2) continue
      preguntas.push({
        id: `m5-q${preguntas.length + 1}`,
        pregunta: p.questionText.trim(),
        opciones: p.answerOptions.map((o) => o.answerText),
        correcta,
        explicacion: `La respuesta correcta es «${p.answerOptions[correcta].answerText}». Cuestionario: ${q.title}.`,
      })
    }
  }
  return { lecciones, preguntas }
}

// ---------- 3. IA generativa para principiantes (m6) ----------
function importarGenAI() {
  const repo = 'generative-ai-for-beginners'
  const base = join(FUENTES, repo, 'translations', 'es')
  const lecciones = []
  for (const carpeta of readdirSync(base).filter((n) => /^\d+-/.test(n) && esDirectorio(join(base, n))).sort(ordenNatural)) {
    const dir = join(base, carpeta)
    const num = carpeta.match(/^(\d+)/)[1]
    const readme = join(dir, 'README.md')
    const todos = archivosDe(dir).filter((a) => a.rel.toLowerCase() !== 'readme.md')
    const principal = existe(readme) ? { ruta: readme, rel: 'README.md' } : { ruta: join(dir, todos[0].rel), rel: todos[0].rel }
    const resto = existe(readme) ? todos : todos.slice(1)
    lecciones.push(
      leccionDeArchivos({
        id: `m6-l${num}`,
        repoCarpeta: repo,
        principal: { ...principal, rel: join(carpeta, principal.rel) },
        resto: resto.map((a) => ({ ...a, rel: join(carpeta, a.rel) })),
        tituloPorDefecto: carpeta,
        dificultad: Number(num) <= 4 ? 'basica' : Number(num) <= 14 ? 'intermedia' : 'avanzada',
        baseRel: join('translations', 'es'),
      }),
    )
  }
  return { lecciones }
}

// ---------- 4. Catálogos de recursos (m8) y proyectos 500 (m7) ----------
function importarCatalogos() {
  const lecciones = []
  const proyectos = []

  // Proyectos: lista con código
  const ruta500 = join(FUENTES, '500-proyectos', 'README.md')
  if (existe(ruta500)) {
    // Filas «| Nº | Nombre | Enlace |» traducidas al castellano (tools/traducciones/500-proyectos.json).
    const traducciones = JSON.parse(readFileSync(join(RAIZ_APP, 'tools', 'traducciones', '500-proyectos.json'), 'utf8'))
    const filas = []
    for (const linea of readFileSync(ruta500, 'utf8').split('\n')) {
      const m = linea.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/)
      if (!m) continue
      const nombre = traducciones[m[1]] ?? m[2]
      filas.push([m[1], nombre, `[Ver colección](${m[3]})`])
    }
    const bloques = [
      { tipo: 'parrafo', texto: 'Lista de colecciones de proyectos prácticos de IA con código: visión artificial, PLN, aprendizaje profundo, aprendizaje automático y ciencia de datos. Cada colección enlaza con su repositorio. Úsala como banco de ejercicios para aplicar lo estudiado en los módulos anteriores.' },
      { tipo: 'nota', texto: 'Las colecciones son de terceros: comprueba la licencia y la vigencia de cada código antes de usarlo en un proyecto propio.' },
      { tipo: 'tabla', cabeceras: ['Nº', 'Colección', 'Enlace'], filas },
    ]
    proyectos.push({
      id: 'm7-catalogo-500',
      titulo: 'Catálogo de 500 proyectos de IA con código',
      dificultad: 'intermedia',
      tiempoLecturaMin: tiempoEstimado(bloques),
      origen: ORIGEN,
      fuentes: [{ titulo: `Repositorio original: ${REPO_URL['500-proyectos']}`, url: `https://github.com/${REPO_URL['500-proyectos']}`, tipo: 'docs' }],
      bloques,
    })
  }

  for (const c of catalogoAwesome()) lecciones.push(c)
  return { lecciones, proyectos }
}

// ---------- ensamblado ----------
function nuevoModulo(id, titulo, descripcion, lecciones, quiz = []) {
  return { id, titulo, descripcion, importado: true, lecciones, quiz }
}

function quitarImportado(modulo) {
  modulo.lecciones = modulo.lecciones.filter((l) => l.origen !== ORIGEN)
  return modulo
}

const harness = importarHarness()
const ml = importarML()
const genai = importarGenAI()
const catalogos = importarCatalogos()

const modulos = curso.modulos.filter((m) => !m.importado).map(quitarImportado)
const porId = Object.fromEntries(modulos.map((m) => [m.id, m]))

porId.m3.lecciones.push(...harness.lecciones)

const nuevos = [
  nuevoModulo('m5', 'Machine Learning para principiantes', 'Curso clásico de aprendizaje automático en 12 semanas: regresión, clasificación, clustering, NLP, series temporales y aprendizaje por refuerzo, con tareas y cuestionario. Basado en el curso de Microsoft ML-For-Beginners.', ml.lecciones, ml.preguntas),
  nuevoModulo('m6', 'IA generativa para principiantes', 'Curso de IA generativa: modelos de lenguaje, prompt engineering, aplicaciones de chat, búsqueda, imágenes, RAG, agentes, ajuste fino y modelos abiertos. Basado en el curso de Microsoft generative-ai-for-beginners.', genai.lecciones),
  nuevoModulo('m7', 'Proyectos prácticos', 'Proyectos guiados de harness engineering y un catálogo de 500 proyectos de IA con código para practicar.', [...harness.proyectos, ...catalogos.proyectos]),
  nuevoModulo('m9', 'Currículo avanzado de IA: 20 fases', 'Currículo completo de ingeniería de IA en 20 fases, desde las matemáticas hasta los proyectos finales. Traducido del repositorio ai-engineering-from-scratch; cada fase enlaza con su carpeta original.', leccionesCurriculo(ORIGEN).lecciones),
  nuevoModulo('m8', 'Biblioteca de recursos', 'Libros gratuitos, cursos, artículos y herramientas de referencia, organizados por tema. Los títulos de las obras se mantienen en su idioma original; las explicaciones y las categorías están en castellano.', catalogos.lecciones),
]

const resultado = {
  version: curso.version,
  modulos: [...modulos, ...nuevos].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))),
  glosario: curso.glosario,
}
escribir(RUTA_CURSO, JSON.stringify(resultado, null, 2) + '\n')

const contar = (ms) => ms.reduce((n, m) => n + m.lecciones.length, 0)
console.log('Importación completada:')
for (const m of resultado.modulos) console.log(`  ${m.id} ${m.titulo}: ${m.lecciones.length} lecciones, ${m.quiz?.length ?? 0} preguntas`)
console.log(`Total de lecciones: ${contar(resultado.modulos)}`)

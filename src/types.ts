// Esquema de src/data/curso.json (ver SPEC.md, sección 5).

export type Dificultad = 'basica' | 'intermedia' | 'avanzada'

export interface Fuente {
  titulo: string
  url: string
  tipo: 'paper' | 'docs' | 'curso' | 'articulo'
}

export type Bloque =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'subtitulo'; nivel: number; texto: string }
  | { tipo: 'lista'; items: string[] }
  | { tipo: 'nota'; texto: string }
  | { tipo: 'tabla'; cabeceras: string[]; filas: string[][] }
  | { tipo: 'codigo'; lenguaje: 'python' | 'ts' | 'json' | 'text'; codigo: string; comentario: string }

export interface Leccion {
  id: string
  titulo: string
  dificultad: Dificultad
  tiempoLecturaMin: number
  fuentes: Fuente[]
  bloques: Bloque[]
  /** Marca de las lecciones generadas por tools/importar-contenido.mjs. */
  origen?: string
}

export interface PreguntaQuiz {
  id: string
  pregunta: string
  opciones: string[]
  correcta: number
  explicacion: string
}

export interface Modulo {
  id: string
  titulo: string
  descripcion: string
  lecciones: Leccion[]
  quiz: PreguntaQuiz[]
  importado?: boolean
}

export interface TerminoGlosario {
  termino: string
  acronimo: string | null
  definicion: string
  modulo: string
}

export interface Curso {
  version: number
  modulos: Modulo[]
  glosario: TerminoGlosario[]
}

import curso from '../data/curso.json'
import type { Bloque, Curso } from '../types'

export const CURSO = curso as Curso

export interface ResultadoBusqueda {
  tipo: 'leccion' | 'glosario'
  titulo: string
  extracto: string
  ruta: string[]
}

function textoDeBloque(b: Bloque): string {
  switch (b.tipo) {
    case 'parrafo':
    case 'nota':
      return b.texto
    case 'lista':
      return b.items.join(' ')
    case 'tabla':
      return [...b.cabeceras, ...b.filas.flat()].join(' ')
    case 'codigo':
      return b.comentario
  }
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Índice construido una sola vez; cada entrada guarda el texto normalizado para buscar sin tildes.
const indice = (() => {
  const entradas: Array<ResultadoBusqueda & { haystack: string }> = []
  for (const m of CURSO.modulos) {
    for (const l of m.lecciones) {
      const texto = l.bloques.map(textoDeBloque).join(' ')
      entradas.push({
        tipo: 'leccion',
        titulo: l.titulo,
        extracto: texto.slice(0, 160),
        ruta: ['leccion', l.id],
        haystack: normalizar(`${l.titulo} ${m.titulo} ${texto}`),
      })
    }
  }
  for (const g of CURSO.glosario) {
    entradas.push({
      tipo: 'glosario',
      titulo: g.acronimo ? `${g.termino} (${g.acronimo})` : g.termino,
      extracto: g.definicion,
      ruta: ['glosario'],
      haystack: normalizar(`${g.termino} ${g.acronimo ?? ''} ${g.definicion}`),
    })
  }
  return entradas
})()

export function buscar(consulta: string, limite = 20): ResultadoBusqueda[] {
  const terminos = normalizar(consulta.trim()).split(/\s+/).filter(Boolean)
  if (terminos.length === 0) return []
  return indice
    .filter((e) => terminos.every((t) => e.haystack.includes(t)))
    .slice(0, limite)
    .map((e) => ({ tipo: e.tipo, titulo: e.titulo, extracto: e.extracto, ruta: e.ruta }))
}

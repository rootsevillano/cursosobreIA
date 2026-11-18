import { useCallback, useEffect, useState } from 'react'

// Progreso del alumno: conjunto de IDs de lecciones completadas y resultados de quiz.
// Persistencia en localStorage; exportación/importación en JSON para sincronizar dispositivos.

const CLAVE = 'guia-ia-progreso-v1'

export interface Progreso {
  version: 1
  lecciones: string[]
  quizzes: Record<string, { aciertos: number; total: number; fecha: string }>
}

const vacio: Progreso = { version: 1, lecciones: [], quizzes: {} }

function esProgreso(x: unknown): x is Progreso {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Partial<Progreso>
  return (
    p.version === 1 &&
    Array.isArray(p.lecciones) &&
    p.lecciones.every((id) => typeof id === 'string') &&
    typeof p.quizzes === 'object' &&
    p.quizzes !== null
  )
}

function leer(): Progreso {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return vacio
    const parsed: unknown = JSON.parse(raw)
    return esProgreso(parsed) ? parsed : vacio
  } catch {
    return vacio
  }
}

function escribir(p: Progreso) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p))
  } catch {
    /* almacenamiento no disponible (modo privado): el progreso solo dura la sesión */
  }
}

export function useProgreso() {
  const [progreso, setProgreso] = useState<Progreso>(leer)

  useEffect(() => {
    escribir(progreso)
  }, [progreso])

  const alternarLeccion = useCallback((id: string) => {
    setProgreso((p) => ({
      ...p,
      lecciones: p.lecciones.includes(id) ? p.lecciones.filter((x) => x !== id) : [...p.lecciones, id],
    }))
  }, [])

  const registrarQuiz = useCallback((moduloId: string, aciertos: number, total: number) => {
    setProgreso((p) => ({
      ...p,
      quizzes: { ...p.quizzes, [moduloId]: { aciertos, total, fecha: new Date().toISOString() } },
    }))
  }, [])

  const importar = useCallback((nuevo: Progreso) => setProgreso(nuevo), [])

  const reiniciar = useCallback(() => setProgreso(vacio), [])

  return { progreso, alternarLeccion, registrarQuiz, importar, reiniciar }
}

export function exportarJSON(p: Progreso): string {
  return JSON.stringify(p, null, 2)
}

export function parsearImportacion(texto: string): Progreso {
  const parsed: unknown = JSON.parse(texto)
  if (!esProgreso(parsed)) throw new Error('El fichero no tiene el formato de progreso esperado.')
  return parsed
}

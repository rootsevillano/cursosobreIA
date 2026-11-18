import { useEffect, useState } from 'react'

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'guia-ia-tema'

function leerTema(): Tema | null {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'claro' || v === 'oscuro' ? v : null
  } catch {
    return null
  }
}

function guardarTema(t: Tema) {
  try {
    localStorage.setItem(CLAVE, t)
  } catch {
    /* almacenamiento no disponible: el tema solo dura la sesión */
  }
}

function temaPreferido(): Tema {
  return leerTema() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro')
}

function aplicar(t: Tema) {
  document.documentElement.classList.toggle('dark', t === 'oscuro')
}

export function aplicarTemaInicial() {
  aplicar(temaPreferido())
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaPreferido)

  useEffect(() => {
    aplicar(tema)
  }, [tema])

  const alternar = () => {
    setTema((actual) => {
      const nuevo: Tema = actual === 'oscuro' ? 'claro' : 'oscuro'
      guardarTema(nuevo)
      return nuevo
    })
  }

  return { tema, alternar }
}

import { useEffect, useState } from 'react'

// Hash router: funciona en cualquier servidor estático, sin reglas de reescritura.
// Ruta: "#/leccion/m1-l1" -> ["leccion", "m1-l1"]

function rutaActual(): string[] {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash.split('/').filter(Boolean).map((s) => decodeURIComponent(s))
}

export function useRuta(): string[] {
  const [ruta, setRuta] = useState<string[]>(rutaActual)

  useEffect(() => {
    const onChange = () => {
      setRuta(rutaActual())
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return ruta
}

export function irA(...segmentos: string[]) {
  window.location.hash = '#/' + segmentos.map(encodeURIComponent).join('/')
}

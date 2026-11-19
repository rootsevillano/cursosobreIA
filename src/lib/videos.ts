import datosJson from '../data/videos.json'

// Vídeos de YouTube organizados por tema y por canal (usuario de YouTube).

export interface Video {
  id: string
  url: string
  titulo: string
  canal: string
  canalUrl: string
  tema: string
  anadido: string
}

export interface DatosVideos {
  version: number
  temas: string[]
  videos: Video[]
}

export const DATOS_VIDEOS = datosJson as DatosVideos

export function urlEmbebida(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}

export function miniatura(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

// La gestión de vídeos solo existe cuando la app se ejecuta en local (ver vite.config.ts).
export function esEjecucionLocal(): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
}

export function agruparPorTema(datos: DatosVideos): Array<{ tema: string; videos: Video[] }> {
  return datos.temas.map((tema) => ({ tema, videos: datos.videos.filter((v) => v.tema === tema) }))
}

export function agruparPorCanal(datos: DatosVideos): Array<{ canal: string; canalUrl: string; videos: Video[] }> {
  const mapa = new Map<string, { canal: string; canalUrl: string; videos: Video[] }>()
  for (const v of datos.videos) {
    const grupo = mapa.get(v.canal) ?? { canal: v.canal, canalUrl: v.canalUrl, videos: [] }
    grupo.videos.push(v)
    mapa.set(v.canal, grupo)
  }
  return [...mapa.values()].sort((a, b) => a.canal.localeCompare(b.canal, 'es'))
}

export async function añadirVideo(
  url: string,
  tema: string,
  nuevoTema: string,
): Promise<{ ok: true; datos: DatosVideos } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, tema, nuevoTema }),
    })
    const cuerpo = await res.json()
    if (!res.ok) return { ok: false, error: cuerpo.error ?? 'No se pudo añadir el vídeo.' }
    return { ok: true, datos: cuerpo as DatosVideos }
  } catch {
    return { ok: false, error: 'No hay servidor local disponible. Ejecuta la app con npm run dev.' }
  }
}

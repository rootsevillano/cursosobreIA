import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'

// base relativa: la app funciona en cualquier subruta de un hosting estático.
const RUTA_VIDEOS = fileURLToPath(new URL('./src/data/videos.json', import.meta.url))

interface DatosVideos {
  version: number
  temas: string[]
  videos: Array<{ id: string; url: string; titulo: string; canal: string; canalUrl: string; tema: string; anadido: string }>
}

// Extrae el identificador de 11 caracteres de una URL de YouTube (watch, youtu.be, shorts, embed, live).
export function idDeYoutube(url: string): string | null {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, '')
  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else {
      const [, seccion, valor] = u.pathname.split('/')
      if (['shorts', 'embed', 'live'].includes(seccion)) id = valor ?? null
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}

function leerDatos(): DatosVideos {
  return JSON.parse(readFileSync(RUTA_VIDEOS, 'utf8'))
}

function enviar(res: ServerResponse, codigo: number, cuerpo: unknown) {
  res.statusCode = codigo
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(cuerpo))
}

function leerCuerpo(req: IncomingMessage): Promise<string> {
  // Se acumulan los Buffers y se decodifican al final para no partir caracteres UTF-8 (ñ, tildes).
  return new Promise((resolver, rechazar) => {
    const trozos: Buffer[] = []
    let total = 0
    req.on('data', (c: Buffer) => {
      total += c.length
      if (total > 10_000) return rechazar(new Error('Petición demasiado grande'))
      trozos.push(c)
    })
    req.on('end', () => resolver(Buffer.concat(trozos).toString('utf8')))
    req.on('error', rechazar)
  })
}

// API solo para desarrollo y vista previa en local. No existe en la compilación estática.
function apiVideosLocal(): Plugin {
  const manejar = async (req: IncomingMessage, res: ServerResponse, siguiente: () => void) => {
    if (!req.url?.startsWith('/api/videos')) return siguiente()

    if (req.method === 'GET') return enviar(res, 200, leerDatos())
    if (req.method !== 'POST') return enviar(res, 405, { error: 'Método no permitido' })

    try {
      const { url, tema, nuevoTema } = JSON.parse(await leerCuerpo(req)) as { url?: string; tema?: string; nuevoTema?: string }
      const temaFinal = (nuevoTema?.trim() || tema?.trim() || '').slice(0, 60)
      if (!temaFinal) return enviar(res, 400, { error: 'Indica un tema para el vídeo.' })

      const id = url ? idDeYoutube(url) : null
      if (!id) return enviar(res, 400, { error: 'La URL no es un enlace válido de YouTube (youtube.com/watch?v=…, youtu.be/… o /shorts/…).' })

      const datos = leerDatos()
      if (datos.videos.some((v) => v.id === id)) return enviar(res, 409, { error: 'Ese vídeo ya está en la lista.' })

      const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, {
        signal: AbortSignal.timeout(15000),
      })
      if (!oembed.ok) return enviar(res, 422, { error: 'No se pudo obtener la información del vídeo. Comprueba que es público.' })
      const info = (await oembed.json()) as { title: string; author_name: string; author_url: string }

      datos.videos.push({
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        titulo: info.title,
        canal: info.author_name,
        canalUrl: info.author_url,
        tema: temaFinal,
        anadido: new Date().toISOString().slice(0, 10),
      })
      if (!datos.temas.includes(temaFinal)) datos.temas.push(temaFinal)
      datos.temas.sort((a, b) => a.localeCompare(b, 'es'))
      writeFileSync(RUTA_VIDEOS, JSON.stringify(datos, null, 2) + '\n', 'utf8')
      return enviar(res, 201, datos)
    } catch (e) {
      return enviar(res, 500, { error: e instanceof Error ? e.message : 'Error interno' })
    }
  }
  return {
    name: 'api-videos-local',
    configureServer(servidor) {
      servidor.middlewares.use(manejar)
    },
    configurePreviewServer(servidor) {
      servidor.middlewares.use(manejar)
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), apiVideosLocal()],
  server: { port: 5173 },
})

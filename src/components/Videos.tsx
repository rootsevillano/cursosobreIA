import { useMemo, useState, type FormEvent } from 'react'
import { ExternalLink, Plus, Video as IconoVideo } from 'lucide-react'
import { agruparPorCanal, agruparPorTema, añadirVideo, DATOS_VIDEOS, esEjecucionLocal, urlEmbebida, type DatosVideos, type Video } from '../lib/videos'
import { Cabecera } from './ui'

type Pestaña = 'tema' | 'usuario'

const NUEVO_TEMA = '__nuevo__'

function TarjetaVideo({ video }: { video: Video }) {
  return (
    <article className="card !p-3 sm:!p-4">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
        <iframe
          src={urlEmbebida(video.id)}
          title={video.titulo}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-snug">{video.titulo}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <a href={video.canalUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
          {video.canal}
        </a>
        <span>·</span>
        <span className="etiqueta">{video.tema}</span>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 hover:underline">
          Abrir en YouTube <ExternalLink size={12} />
        </a>
      </div>
    </article>
  )
}

function FormularioAñadir({ datos, onAñadido }: { datos: DatosVideos; onAñadido: (d: DatosVideos) => void }) {
  const [url, setUrl] = useState('')
  const [tema, setTema] = useState(datos.temas[0] ?? NUEVO_TEMA)
  const [nuevoTema, setNuevoTema] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setMensaje(null)
    const r = await añadirVideo(url, tema === NUEVO_TEMA ? '' : tema, tema === NUEVO_TEMA ? nuevoTema : '')
    setEnviando(false)
    if (r.ok) {
      onAñadido(r.datos)
      setUrl('')
      setNuevoTema('')
      setMensaje({ tipo: 'ok', texto: 'Vídeo añadido. Para publicarlo en la web, guarda src/data/videos.json en el repositorio.' })
    } else setMensaje({ tipo: 'error', texto: r.error })
  }

  return (
    <form onSubmit={enviar} className="card space-y-4" aria-labelledby="form-titulo">
      <h2 id="form-titulo" className="flex items-center gap-2 text-lg font-semibold">
        <Plus size={18} /> Añadir vídeo
      </h2>
      <label className="block space-y-1">
        <span className="text-sm font-medium">URL pública de YouTube</span>
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="campo"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Tema</span>
          <select value={tema} onChange={(e) => setTema(e.target.value)} className="campo">
            {datos.temas.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value={NUEVO_TEMA}>+ Crear tema nuevo</option>
          </select>
        </label>
        {tema === NUEVO_TEMA && (
          <label className="block space-y-1">
            <span className="text-sm font-medium">Nombre del tema nuevo</span>
            <input type="text" required maxLength={60} value={nuevoTema} onChange={(e) => setNuevoTema(e.target.value)} className="campo" />
          </label>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primario" disabled={enviando}>
          {enviando ? 'Obteniendo datos del vídeo…' : 'Añadir vídeo'}
        </button>
        {mensaje && (
          <p role="status" className={`text-sm ${mensaje.tipo === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {mensaje.texto}
          </p>
        )}
      </div>
    </form>
  )
}

export default function Videos() {
  const [datos, setDatos] = useState<DatosVideos>(DATOS_VIDEOS)
  const [pestaña, setPestaña] = useState<Pestaña>('tema')
  const local = useMemo(() => esEjecucionLocal(), [])
  const porTema = useMemo(() => agruparPorTema(datos), [datos])
  const porCanal = useMemo(() => agruparPorCanal(datos), [datos])

  const pestañas: Array<{ id: Pestaña; texto: string }> = [
    { id: 'tema', texto: 'Por tema' },
    { id: 'usuario', texto: 'Por usuario de YouTube' },
  ]

  return (
    <div className="space-y-6">
      <Cabecera titulo="Vídeos">
        Vídeos de YouTube organizados por tema o por el usuario que los publica. {datos.videos.length} vídeos en {datos.temas.length} temas.
      </Cabecera>

      {local && <FormularioAñadir datos={datos} onAñadido={setDatos} />}

      <div role="tablist" aria-label="Forma de organizar los vídeos" className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {pestañas.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`tab-${p.id}`}
            aria-selected={pestaña === p.id}
            aria-controls={`panel-${p.id}`}
            onClick={() => setPestaña(p.id)}
            className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-medium transition ${
              pestaña === p.id
                ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {datos.videos.length === 0 && (
        <div className="card flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <IconoVideo size={20} /> Todavía no hay vídeos.{local ? ' Añade el primero con el formulario de arriba.' : ''}
        </div>
      )}

      {pestaña === 'tema' && (
        <section id="panel-tema" role="tabpanel" aria-labelledby="tab-tema" className="space-y-8">
          {porTema.map((g) => (
            <div key={g.tema} className="space-y-3">
              <h2 className="text-lg font-semibold">
                {g.tema} <span className="text-sm font-normal text-slate-500">({g.videos.length})</span>
              </h2>
              {g.videos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin vídeos en este tema todavía.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {g.videos.map((v) => (
                    <TarjetaVideo key={v.id} video={v} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {pestaña === 'usuario' && (
        <section id="panel-usuario" role="tabpanel" aria-labelledby="tab-usuario" className="space-y-8">
          {porCanal.map((g) => (
            <div key={g.canal} className="space-y-3">
              <h2 className="text-lg font-semibold">
                <a href={g.canalUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {g.canal}
                </a>{' '}
                <span className="text-sm font-normal text-slate-500">({g.videos.length})</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {g.videos.map((v) => (
                  <TarjetaVideo key={v.id} video={v} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

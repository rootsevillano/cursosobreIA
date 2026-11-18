import { useRef, useState } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { CURSO } from '../lib/search'
import { exportarJSON, parsearImportacion, type Progreso as TipoProgreso } from '../lib/progress'
import { Cabecera } from './ui'

interface Props {
  progreso: TipoProgreso
  onImportar: (p: TipoProgreso) => void
  onReiniciar: () => void
}

const TOTAL = CURSO.modulos.reduce((n, m) => n + m.lecciones.length, 0)

export default function Progreso({ progreso, onImportar, onReiniciar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const descargar = () => {
    const blob = new Blob([exportarJSON(progreso)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'progreso-guia-ia.json'
    a.click()
    URL.revokeObjectURL(url)
    setMensaje({ tipo: 'ok', texto: 'Progreso exportado. Guarda el fichero para importarlo en otro dispositivo.' })
  }

  const importar = async (file: File) => {
    try {
      const nuevo = parsearImportacion(await file.text())
      onImportar(nuevo)
      setMensaje({ tipo: 'ok', texto: `Progreso importado: ${nuevo.lecciones.length} lecciones completadas.` })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo leer el fichero.' })
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const reiniciar = () => {
    if (!window.confirm('¿Borrar todo el progreso guardado en este dispositivo? Esta acción no se puede deshacer.')) return
    onReiniciar()
    setMensaje({ tipo: 'ok', texto: 'Progreso reiniciado.' })
  }

  const quizzes = Object.entries(progreso.quizzes)

  return (
    <div className="space-y-6">
      <Cabecera titulo="Mi progreso">
        El progreso se guarda en este navegador. Para usarlo en otro dispositivo, expórtalo en un fichero JSON e impórtalo allí.
      </Cabecera>

      <section className="card space-y-2">
        <p className="text-lg font-semibold">
          {progreso.lecciones.length} de {TOTAL} lecciones completadas
        </p>
        {quizzes.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no has hecho ninguna autoevaluación.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {quizzes.map(([moduloId, r]) => {
              const m = CURSO.modulos.find((x) => x.id === moduloId)
              return (
                <li key={moduloId}>
                  {m?.titulo ?? moduloId}: <strong>{r.aciertos}/{r.total}</strong>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card grid gap-3 sm:grid-cols-3">
        <button type="button" className="btn-primario" onClick={descargar}>
          <Download size={16} /> Exportar JSON
        </button>
        <button type="button" className="btn-secundario" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> Importar JSON
        </button>
        <button type="button" className="btn-secundario text-rose-700 dark:text-rose-400" onClick={reiniciar}>
          <RotateCcw size={16} /> Reiniciar
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importar(f)
          }}
        />
      </section>

      {mensaje && (
        <p role="status" className={`rounded-lg p-3 text-sm ${mensaje.tipo === 'ok' ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200'}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  )
}

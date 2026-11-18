import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, ExternalLink, Info } from 'lucide-react'
import { CURSO } from '../lib/search'
import type { Progreso } from '../lib/progress'
import type { Bloque as BloqueDato } from '../types'
import CodeBlock from './CodeBlock'
import { COLOR_DIFICULTAD, TEXTO_DIFICULTAD, Texto } from './ui'

interface Props {
  leccionId: string
  progreso: Progreso
  onAlternar: (id: string) => void
}

// Lista plana de todas las lecciones para navegación anterior/siguiente.
const TODAS = CURSO.modulos.flatMap((m) => m.lecciones.map((l) => ({ ...l, moduloId: m.id, moduloTitulo: m.titulo })))

function Bloque({ b }: { b: BloqueDato }) {
  switch (b.tipo) {
    case 'parrafo':
      return <p className="my-3 leading-relaxed"><Texto texto={b.texto} /></p>
    case 'lista':
      return (
        <ul className="my-3 list-disc space-y-1.5 pl-5">
          {b.items.map((it, i) => (
            <li key={i}><Texto texto={it} /></li>
          ))}
        </ul>
      )
    case 'nota':
      return (
        <div className="my-4 flex gap-3 rounded-lg border-l-4 border-indigo-500 bg-indigo-50 p-4 text-sm dark:bg-indigo-950/40">
          <Info size={18} className="mt-0.5 shrink-0 text-indigo-500" />
          <p className="leading-relaxed"><Texto texto={b.texto} /></p>
        </div>
      )
    case 'tabla':
      return (
        <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                {b.cabeceras.map((c) => (
                  <th key={c} className="px-3 py-2 font-semibold"><Texto texto={c} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.filas.map((fila, i) => (
                <tr key={i} className="border-t border-slate-200 align-top dark:border-slate-700">
                  {fila.map((celda, j) => (
                    <td key={j} className="px-3 py-2"><Texto texto={celda} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'codigo':
      return <CodeBlock codigo={b.codigo} lenguaje={b.lenguaje} comentario={b.comentario} />
  }
}

export default function Leccion({ leccionId, progreso, onAlternar }: Props) {
  const idx = TODAS.findIndex((l) => l.id === leccionId)
  if (idx === -1) {
    return (
      <div className="card">
        <p>No encontramos esa lección.</p>
        <a href="#/ruta" className="mt-3 inline-block text-indigo-600 hover:underline dark:text-indigo-400">Volver a la ruta de aprendizaje</a>
      </div>
    )
  }

  const leccion = TODAS[idx]
  const anterior = TODAS[idx - 1]
  const siguiente = TODAS[idx + 1]
  const hecha = progreso.lecciones.includes(leccion.id)

  return (
    <article className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{leccion.moduloTitulo}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{leccion.titulo}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-0.5 font-medium ${COLOR_DIFICULTAD[leccion.dificultad]}`}>
            {TEXTO_DIFICULTAD[leccion.dificultad]}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Clock size={14} /> {leccion.tiempoLecturaMin} min
          </span>
        </div>
      </header>

      <div className="card prose-curso !p-5 sm:!p-7">
        {leccion.bloques.map((b, i) => (
          <Bloque key={i} b={b} />
        ))}
      </div>

      {leccion.fuentes.length > 0 && (
        <section aria-labelledby="fuentes" className="card !p-4">
          <h2 id="fuentes" className="mb-2 font-semibold">Fuentes originales</h2>
          <ul className="space-y-1.5 text-sm">
            {leccion.fuentes.map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400">
                  {f.titulo} <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => onAlternar(leccion.id)}
        className={`${hecha ? 'btn-secundario' : 'btn-primario'} w-full sm:w-auto`}
        aria-pressed={hecha}
      >
        {hecha ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        {hecha ? 'Lección completada (desmarcar)' : 'Marcar como completada'}
      </button>

      <nav aria-label="Navegación entre lecciones" className="grid gap-3 sm:grid-cols-2">
        {anterior ? (
          <a href={`#/leccion/${anterior.id}`} className="card flex items-center gap-2 !p-4 text-sm hover:border-indigo-400">
            <ChevronLeft size={18} className="shrink-0" />
            <span className="min-w-0"><span className="block text-xs text-slate-500">Anterior</span><span className="block truncate">{anterior.titulo}</span></span>
          </a>
        ) : (
          <span />
        )}
        {siguiente && (
          <a href={`#/leccion/${siguiente.id}`} className="card flex items-center justify-end gap-2 !p-4 text-right text-sm hover:border-indigo-400">
            <span className="min-w-0"><span className="block text-xs text-slate-500">Siguiente</span><span className="block truncate">{siguiente.titulo}</span></span>
            <ChevronRight size={18} className="shrink-0" />
          </a>
        )}
      </nav>
    </article>
  )
}

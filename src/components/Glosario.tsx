import { useMemo, useState } from 'react'
import { CURSO } from '../lib/search'
import { Cabecera, Texto } from './ui'

const NOMBRE_MODULO: Record<string, string> = Object.fromEntries(
  CURSO.modulos.map((m, i) => [m.id, `Módulo ${i + 1}`]),
)

function sinTildes(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function Glosario() {
  const [texto, setTexto] = useState('')
  const [modulo, setModulo] = useState<string>('todos')

  const lista = useMemo(() => {
    const q = sinTildes(texto.trim())
    return [...CURSO.glosario]
      .filter((g) => modulo === 'todos' || g.modulo === modulo)
      .filter((g) => !q || sinTildes(`${g.termino} ${g.acronimo ?? ''} ${g.definicion}`).includes(q))
      .sort((a, b) => a.termino.localeCompare(b.termino, 'es'))
  }, [texto, modulo])

  return (
    <div className="space-y-6">
      <Cabecera titulo="Glosario técnico">
        {CURSO.glosario.length} términos y acrónimos del curso. Los anglicismos de uso estándar aparecen aquí con su explicación.
      </Cabecera>

      <section className="card space-y-3">
        <label className="block">
          <span className="sr-only">Filtrar glosario</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Filtrar términos…"
            className="campo"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por módulo">
          {['todos', ...CURSO.modulos.map((m) => m.id)].map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={modulo === id}
              onClick={() => setModulo(id)}
              className={`min-h-10 rounded-full border px-3.5 py-1.5 text-sm transition ${
                modulo === id
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {id === 'todos' ? 'Todos' : NOMBRE_MODULO[id]}
            </button>
          ))}
        </div>
      </section>

      <p className="text-sm text-slate-500">{lista.length} resultados</p>

      <dl className="grid gap-3 sm:grid-cols-2">
        {lista.map((g) => (
          <div key={g.termino} className="card !p-4">
            <dt className="flex flex-wrap items-baseline gap-2 font-semibold">
              {g.termino}
              {g.acronimo && <span className="text-xs font-normal text-slate-500">({g.acronimo})</span>}
              <span className="etiqueta ml-auto">{NOMBRE_MODULO[g.modulo]}</span>
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <Texto texto={g.definicion} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

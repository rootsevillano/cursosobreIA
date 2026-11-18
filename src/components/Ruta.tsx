import { CheckCircle2, Circle, ClipboardCheck, ExternalLink, Clock } from 'lucide-react'
import { CURSO } from '../lib/search'
import type { Progreso } from '../lib/progress'
import { COLOR_DIFICULTAD, Cabecera, TEXTO_DIFICULTAD } from './ui'

export default function Ruta({ progreso }: { progreso: Progreso }) {
  return (
    <div className="space-y-8">
      <Cabecera titulo="Ruta de aprendizaje">
        Cuatro módulos progresivos. Sigue el orden: cada módulo prepara el siguiente. Al final de cada uno tienes una autoevaluación.
      </Cabecera>

      {CURSO.modulos.map((m, i) => (
        <section key={m.id} aria-labelledby={`ruta-${m.id}`} className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Módulo {i + 1}</p>
            <h2 id={`ruta-${m.id}`} className="text-xl font-semibold">
              {m.titulo}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{m.descripcion}</p>
          </div>

          <ol className="space-y-3">
            {m.lecciones.map((l, j) => {
              const hecha = progreso.lecciones.includes(l.id)
              return (
                <li key={l.id} className="card !p-4">
                  <div className="flex items-start gap-3">
                    {hecha ? (
                      <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-500" aria-label="Completada" />
                    ) : (
                      <Circle size={22} className="mt-0.5 shrink-0 text-slate-400" aria-label="Pendiente" />
                    )}
                    <div className="min-w-0 flex-1">
                      <a href={`#/leccion/${l.id}`} className="font-semibold hover:text-indigo-600 dark:hover:text-indigo-400">
                        {j + 1}. {l.titulo}
                      </a>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-0.5 font-medium ${COLOR_DIFICULTAD[l.dificultad]}`}>
                          {TEXTO_DIFICULTAD[l.dificultad]}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Clock size={14} /> {l.tiempoLecturaMin} min de lectura
                        </span>
                      </div>
                      {l.fuentes.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {l.fuentes.map((f) => (
                            <li key={f.url}>
                              <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400">
                                {f.titulo} <ExternalLink size={12} />
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
            <li>
              <a href={`#/modulo/${m.id}/quiz`} className="btn-secundario w-full sm:w-auto">
                <ClipboardCheck size={16} /> Autoevaluación del módulo ({m.quiz.length} preguntas)
              </a>
            </li>
          </ol>
        </section>
      ))}
    </div>
  )
}

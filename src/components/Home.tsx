import { FlaskConical, Library, Map, GraduationCap, ArrowRight } from 'lucide-react'
import { CURSO } from '../lib/search'
import type { Progreso } from '../lib/progress'
import { Cabecera } from './ui'

const TOTAL = CURSO.modulos.reduce((n, m) => n + m.lecciones.length, 0)

export default function Home({ progreso }: { progreso: Progreso }) {
  const hechas = progreso.lecciones.length
  const porcentaje = Math.round((hechas / TOTAL) * 100)

  return (
    <div className="space-y-8">
      <section className="card !p-6 sm:!p-8">
        <Cabecera titulo="Estudia IA de forma estructurada">
          Una guía interactiva con {CURSO.modulos.length} módulos: desde los fundamentos de los modelos y el aprendizaje automático
          hasta agentes, MCP, harness engineering, metodologías de desarrollo con IA, proyectos prácticos y una biblioteca de recursos.
          Marca lo que vas completando y comprueba lo aprendido con las autoevaluaciones.
        </Cabecera>
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span>
              {hechas} de {TOTAL} lecciones completadas
            </span>
            <span className="font-semibold">{porcentaje}%</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#/ruta" className="btn-primario">
            Empezar la ruta <ArrowRight size={16} />
          </a>
          <a href="#/lab/flujo" className="btn-secundario">
            Abrir laboratorios
          </a>
        </div>
      </section>

      <section aria-labelledby="modulos-titulo">
        <h2 id="modulos-titulo" className="mb-3 text-lg font-semibold">
          Módulos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {CURSO.modulos.map((m, i) => {
            const hechasModulo = m.lecciones.filter((l) => progreso.lecciones.includes(l.id)).length
            return (
              <a key={m.id} href={`#/leccion/${m.lecciones[0].id}`} className="card block transition hover:border-indigo-400 dark:hover:border-indigo-500">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Módulo {i + 1}</p>
                <h3 className="mt-1 text-base font-semibold">{m.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{m.descripcion}</p>
                <p className="mt-3 text-xs text-slate-500">
                  {hechasModulo}/{m.lecciones.length} lecciones{m.quiz.length > 0 ? ` · ${m.quiz.length} preguntas de autoevaluación` : ''}
                </p>
              </a>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="accesos-titulo">
        <h2 id="accesos-titulo" className="mb-3 text-lg font-semibold">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a href="#/ruta" className="card flex items-center gap-3 !p-4 hover:border-indigo-400">
            <Map size={20} className="text-indigo-500" /> Ruta de aprendizaje
          </a>
          <a href="#/lab/flujo" className="card flex items-center gap-3 !p-4 hover:border-indigo-400">
            <FlaskConical size={20} className="text-indigo-500" /> Agente vs Skill vs MCP
          </a>
          <a href="#/glosario" className="card flex items-center gap-3 !p-4 hover:border-indigo-400">
            <Library size={20} className="text-indigo-500" /> Glosario técnico
          </a>
          <a href="#/progreso" className="card flex items-center gap-3 !p-4 hover:border-indigo-400">
            <GraduationCap size={20} className="text-indigo-500" /> Exportar progreso
          </a>
        </div>
      </section>
    </div>
  )
}

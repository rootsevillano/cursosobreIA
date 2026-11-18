import { useMemo, useState } from 'react'
import { Cabecera } from './ui'

const CASOS = [
  'Funcionalidad nueva',
  'Bug o regresión',
  'API o integraciones',
  'Arquitectura incierta',
  'Agente autónomo con tareas largas',
  'Prototipo rápido',
] as const
type Caso = (typeof CASOS)[number]

interface Metodologia {
  sigla: string
  nombre: string
  idea: string
  fortalezas: string[]
  debilidades: string[]
  casos: Caso[]
}

const METODOLOGIAS: Metodologia[] = [
  {
    sigla: 'TDD',
    nombre: 'Test-Driven Development',
    idea: 'Test primero, código mínimo que lo cumpla y refactor en ciclos cortos.',
    fortalezas: ['Señal objetiva para el agente (backpressure)', 'Diseño de interfaces desde el uso', 'Regresiones detectadas pronto'],
    debilidades: ['Requiere disciplina en el paso de refactor', 'Lento de arrancar en exploraciones sin requisitos claros'],
    casos: ['Funcionalidad nueva', 'Bug o regresión', 'Agente autónomo con tareas largas'],
  },
  {
    sigla: 'BDD',
    nombre: 'Behavior-Driven Development',
    idea: 'Comportamiento descrito con ejemplos Given-When-Then, legibles por negocio y técnicos.',
    fortalezas: ['Lenguaje común entre producto e ingeniería', 'Escenarios verificables', 'Traduce bien criterios de aceptación'],
    debilidades: ['Los escenarios mal escritos quedan vacíos', 'Coste de mantenimiento de la capa Gherkin'],
    casos: ['Funcionalidad nueva', 'API o integraciones'],
  },
  {
    sigla: 'SDD',
    nombre: 'Spec-Driven Development',
    idea: 'Especificación, plan y tareas antes de generar código (flujo de GitHub Spec Kit).',
    fortalezas: ['El agente trabaja sobre un objetivo explícito', 'Trazabilidad entre requisito y código', 'Reduce desvíos en tareas largas'],
    debilidades: ['Burocracia si la tarea es pequeña', 'La especificación puede quedar desfasada'],
    casos: ['Funcionalidad nueva', 'Arquitectura incierta', 'Agente autónomo con tareas largas'],
  },
  {
    sigla: 'ODD',
    nombre: 'Option-Driven Development',
    idea: 'Explorar varias alternativas con pros y contras antes de decidir.',
    fortalezas: ['Decisiones razonadas y documentadas', 'Evita la primera solución que aparece', 'Buen punto de partida para diseños'],
    debilidades: ['Puede alargar la fase de análisis', 'Sin límite de tiempo se convierte en parálisis'],
    casos: ['Arquitectura incierta', 'API o integraciones'],
  },
  {
    sigla: 'ASDD',
    nombre: 'Agent Spec-Driven Development',
    idea: 'Especificación ejecutable pensada para que un agente implemente y verifique la tarea.',
    fortalezas: ['Delegación clara a agentes', 'Criterios de aceptación verificables automáticamente', 'Se integra con tests y CI'],
    debilidades: ['Requiere buen diseño de herramientas', 'Un criterio ambiguo se traduce en errores silenciosos'],
    casos: ['Agente autónomo con tareas largas', 'Funcionalidad nueva'],
  },
  {
    sigla: 'FTD',
    nombre: 'Feature-Test-Driven Development',
    idea: 'Cada funcionalidad se define y prueba como unidad antes de integrarla.',
    fortalezas: ['Entregas incrementales y seguras', 'Cobertura por funcionalidad, no solo por función', 'Buena para equipos con integración continua'],
    debilidades: ['Puede ocultar huecos entre funcionalidades', 'Más pruebas de integración que unitarias'],
    casos: ['Funcionalidad nueva', 'Bug o regresión', 'Prototipo rápido'],
  },
]

export default function MatrizMetodologias() {
  const [filtros, setFiltros] = useState<Caso[]>([])

  const visibles = useMemo(
    () => (filtros.length === 0 ? METODOLOGIAS : METODOLOGIAS.filter((m) => filtros.every((f) => m.casos.includes(f)))),
    [filtros],
  )

  const alternar = (c: Caso) =>
    setFiltros((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]))

  return (
    <div className="space-y-6">
      <Cabecera titulo="Laboratorio: matriz de metodologías">
        Filtra por caso de uso para ver qué metodología encaja mejor, sus fortalezas y debilidades, y cómo combinarlas.
      </Cabecera>

      <section className="card space-y-3" aria-labelledby="filtros">
        <div className="flex items-center justify-between gap-2">
          <h2 id="filtros" className="text-sm font-semibold">Caso de uso</h2>
          {filtros.length > 0 && (
            <button type="button" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setFiltros([])}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {CASOS.map((c) => {
            const activo = filtros.includes(c)
            return (
              <button
                key={c}
                type="button"
                aria-pressed={activo}
                onClick={() => alternar(c)}
                className={`min-h-10 rounded-full border px-3.5 py-1.5 text-sm transition ${
                  activo
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      </section>

      {visibles.length === 0 ? (
        <p className="card text-sm">Ninguna metodología cubre todos los casos seleccionados a la vez. Quita algún filtro.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibles.map((m) => (
            <article key={m.sigla} className="card space-y-3">
              <header>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{m.sigla}</p>
                <h2 className="font-semibold">{m.nombre}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{m.idea}</p>
              </header>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-semibold text-emerald-700 dark:text-emerald-400">Fortalezas</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {m.fortalezas.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-semibold text-rose-700 dark:text-rose-400">Debilidades</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {m.debilidades.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.casos.map((c) => (
                  <span key={c} className="etiqueta">{c}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <section aria-labelledby="combinado" className="card space-y-3">
        <h2 id="combinado" className="text-lg font-semibold">Flujo combinado recomendado</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li><strong>ODD:</strong> compara 2 o 3 alternativas de diseño y elige una con criterios escritos.</li>
          <li><strong>SDD / ASDD:</strong> redacta la especificación, el plan y las tareas en ficheros del repositorio.</li>
          <li><strong>API-First:</strong> si hay contratos externos, define primero el OpenAPI y valida la implementación contra él.</li>
          <li><strong>BDD:</strong> convierte los criterios de aceptación en escenarios Given-When-Then.</li>
          <li><strong>TDD:</strong> implementa cada escenario en ciclos Red-Green-Refactor, con el agente recibiendo los fallos como backpressure.</li>
          <li><strong>FTD:</strong> integra cada funcionalidad completa tras su batería de pruebas y despliega de forma incremental.</li>
        </ol>
      </section>
    </div>
  )
}

import { useState } from 'react'
import { Cabecera } from './ui'

type Nivel = 0 | 1 | 2 // 0 = rápido/económico, 1 = equilibrado, 2 = potente
type Esfuerzo = 'bajo' | 'medio' | 'alto' | 'máximo'
type Presupuesto = 'ahorro' | 'equilibrio' | 'calidad'

const TAREAS: Array<{ id: string; nombre: string; nota: string; nivel: Nivel; esfuerzo: Esfuerzo }> = [
  { id: 'explorar', nombre: 'Explorar repo', nota: 'Leer, localizar y resumir código. Mucho contexto, poco razonamiento.', nivel: 0, esfuerzo: 'bajo' },
  { id: 'renombrar', nombre: 'Cambio trivial', nota: 'Renombrar variables, corregir una errata o ajustar un texto.', nivel: 0, esfuerzo: 'bajo' },
  { id: 'tests', nombre: 'Generar tests', nota: 'Casos a partir de una función existente. Requiere cubrir bordes.', nivel: 1, esfuerzo: 'medio' },
  { id: 'refactor', nombre: 'Refactorizar API', nota: 'Cambios coordinados en varios ficheros con contratos que no deben romperse.', nivel: 1, esfuerzo: 'medio' },
  { id: 'bug', nombre: 'Bug crítico', nota: 'Diagnóstico con causa no obvia, en producción, con impacto alto.', nivel: 2, esfuerzo: 'alto' },
  { id: 'arquitectura', nombre: 'Diseñar arquitectura', nota: 'Decisiones con muchas alternativas y consecuencias a largo plazo.', nivel: 2, esfuerzo: 'máximo' },
]

// Familias de modelo por proveedor y nivel. Son ejemplos de referencia: verifica el nombre exacto en la documentación del proveedor.
const PROVEEDORES: Array<{ id: string; nombre: string; modelos: [string, string, string] }> = [
  { id: 'anthropic', nombre: 'Anthropic', modelos: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] },
  { id: 'google', nombre: 'Google', modelos: ['Gemini Flash (familia rápida)', 'Gemini Pro (equilibrado)', 'Gemini Pro con razonamiento extendido'] },
  { id: 'openai', nombre: 'OpenAI', modelos: ['GPT mini (familia rápida)', 'GPT de propósito general', 'GPT de razonamiento'] },
  { id: 'local', nombre: 'Local / Open-Weight', modelos: ['Modelo pequeño 7–8B cuantizado', 'Modelo 30B+ de propósito general', 'Modelo 70B+ o de razonamiento (p. ej. familia DeepSeek-R1 destilada)'] },
]

const TEXTO_ESFUERZO: Record<Esfuerzo, string> = {
  bajo: 'Respuesta directa, sin cadena de razonamiento extensa.',
  medio: 'Razonamiento moderado: revisa casos y dependencias principales.',
  alto: 'Razonamiento profundo: contrasta hipótesis antes de actuar.',
  máximo: 'Máximo razonamiento disponible: explora alternativas y verifica cada conclusión. Lento y caro.',
}

const ETIQUETA_NIVEL = ['Rápido / económico', 'Equilibrado', 'Potente']

function ajustarNivel(base: Nivel, presupuesto: Presupuesto): Nivel {
  const delta = presupuesto === 'ahorro' ? -1 : presupuesto === 'calidad' ? 1 : 0
  return Math.min(2, Math.max(0, base + delta)) as Nivel
}

function ajustarEsfuerzo(base: Esfuerzo, presupuesto: Presupuesto): Esfuerzo {
  const orden: Esfuerzo[] = ['bajo', 'medio', 'alto', 'máximo']
  const i = orden.indexOf(base) + (presupuesto === 'ahorro' ? -1 : presupuesto === 'calidad' ? 1 : 0)
  return orden[Math.min(orden.length - 1, Math.max(0, i))]
}

export default function SelectorModelos() {
  const [tareaId, setTareaId] = useState(TAREAS[2].id)
  const [presupuesto, setPresupuesto] = useState<Presupuesto>('equilibrio')
  const tarea = TAREAS.find((t) => t.id === tareaId) ?? TAREAS[0]
  const nivel = ajustarNivel(tarea.nivel, presupuesto)
  const esfuerzo = ajustarEsfuerzo(tarea.esfuerzo, presupuesto)

  return (
    <div className="space-y-6">
      <Cabecera titulo="Laboratorio: selector de modelo y esfuerzo">
        Elige el tipo de tarea y tu presupuesto. La herramienta recomienda el nivel de modelo y el <em>reasoning effort</em> por proveedor.
      </Cabecera>

      <section className="card space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold">1. Tipo de tarea</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Tipo de tarea">
            {TAREAS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === tareaId}
                onClick={() => setTareaId(t.id)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  t.id === tareaId
                    ? 'border-indigo-500 bg-indigo-50 font-semibold text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200'
                    : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {t.nombre}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{tarea.nota}</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">2. Presupuesto</p>
          <div className="inline-flex flex-wrap gap-2" role="radiogroup" aria-label="Presupuesto">
            {(
              [
                ['ahorro', 'Ahorrar'],
                ['equilibrio', 'Equilibrio'],
                ['calidad', 'Máxima calidad'],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={presupuesto === valor}
                onClick={() => setPresupuesto(valor)}
                className={`min-h-10 rounded-full border px-4 py-1.5 text-sm transition ${
                  presupuesto === valor
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800/60">
          <p className="text-sm">
            Nivel recomendado: <strong>{ETIQUETA_NIVEL[nivel]}</strong> · Esfuerzo de razonamiento: <strong className="capitalize">{esfuerzo}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{TEXTO_ESFUERZO[esfuerzo]}</p>
        </div>
      </section>

      <section aria-labelledby="proveedores">
        <h2 id="proveedores" className="mb-3 text-lg font-semibold">Modelo sugerido por proveedor</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROVEEDORES.map((p) => (
            <div key={p.id} className="card !p-4">
              <p className="font-semibold">{p.nombre}</p>
              <p className="mt-1 text-sm">
                <span className="text-slate-500">Recomendado: </span>
                <code className="rounded bg-slate-200 px-1.5 py-0.5 text-[0.85em] dark:bg-slate-800">{p.modelos[nivel]}</code>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Esfuerzo sugerido: <span className="font-medium capitalize">{esfuerzo}</span>
                {esfuerzo !== 'bajo' && ' (si el proveedor no lo ofrece, usa un modelo de razonamiento o pasos explícitos)'}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Los nombres son familias de referencia del momento de redacción de esta guía. Los modelos cambian con frecuencia: confirma el
          identificador exacto, su precio y su disponibilidad en la documentación del proveedor antes de usarlo.
        </p>
      </section>
    </div>
  )
}

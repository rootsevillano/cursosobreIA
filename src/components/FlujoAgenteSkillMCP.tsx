import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Cabecera, Texto } from './ui'

type Actor = 'Usuario' | 'Agente' | 'Skill' | 'Cliente MCP' | 'Servidor MCP' | 'Harness'

const ACTORES: Actor[] = ['Usuario', 'Agente', 'Skill', 'Cliente MCP', 'Servidor MCP', 'Harness']

interface Paso {
  de: Actor
  a: Actor
  titulo: string
  detalle: string
  codigo?: string
}

// Escenario: « Arregla el test que falla en el módulo de pagos ».
const PASOS: Paso[] = [
  {
    de: 'Usuario',
    a: 'Agente',
    titulo: 'La petición llega al agente',
    detalle: 'El usuario describe la tarea en lenguaje natural. El agente es el bucle que razonará y actuará hasta terminar o llegar a un límite.',
  },
  {
    de: 'Agente',
    a: 'Skill',
    titulo: 'El agente carga una skill',
    detalle: 'Ve la lista corta de skills disponibles (nombre y descripción) y detecta que la tarea encaja con « depurar tests ». Solo entonces carga las instrucciones completas. La skill aporta procedimiento, no ejecuta nada por sí misma.',
    codigo: 'skill: depurar-tests\n  pasos: reproducir fallo -> localizar causa -> parche mínimo -> volver a ejecutar tests',
  },
  {
    de: 'Agente',
    a: 'Cliente MCP',
    titulo: 'El agente pide un dato externo',
    detalle: 'Necesita el historial de fallos del sistema de CI. Decide invocar una herramienta MCP. El cliente MCP prepara la petición estandarizada.',
  },
  {
    de: 'Cliente MCP',
    a: 'Servidor MCP',
    titulo: 'Llamada JSON-RPC al servidor',
    detalle: 'El cliente envía un mensaje tools/call al servidor MCP de CI. El servidor es quien habla con el sistema externo; el modelo nunca conoce sus credenciales.',
    codigo: '{\n  "jsonrpc": "2.0",\n  "method": "tools/call",\n  "params": { "name": "ci.ultimos_fallos", "arguments": { "pipeline": "pagos" } }\n}',
  },
  {
    de: 'Servidor MCP',
    a: 'Agente',
    titulo: 'El resultado vuelve al contexto',
    detalle: 'El servidor devuelve la traza del fallo. El agente la incorpora a su contexto y la usa como « tierra firme » para decidir el siguiente paso.',
  },
  {
    de: 'Agente',
    a: 'Harness',
    titulo: 'Edición mediante herramienta local',
    detalle: 'Aplica el parche usando una herramienta del harness. El harness valida la edición (guardrail) y puede pedir aprobación humana según los permisos.',
  },
  {
    de: 'Harness',
    a: 'Agente',
    titulo: 'Backpressure: los tests responden',
    detalle: 'El harness ejecuta la batería de tests. Si falla, la salida vuelve al agente como señal de rechazo y el bucle continúa. Si pasa, el agente puede cerrar la tarea.',
    codigo: 'FAIL  pagos/test_redondeo.py::test_importe_cero\nAssertionError: expected 0.00, got 0.01\n----\n1 failed, 41 passed',
  },
  {
    de: 'Agente',
    a: 'Usuario',
    titulo: 'Respuesta final',
    detalle: 'Con todos los tests en verde, el agente resume qué cambió y por qué. El flujo completo combina las tres piezas: el agente decide, la skill guía el procedimiento y el MCP da acceso a datos externos.',
  },
]

export default function FlujoAgenteSkillMCP() {
  const [paso, setPaso] = useState(0)
  const actual = PASOS[paso]

  return (
    <div className="space-y-6">
      <Cabecera titulo="Laboratorio: Agente vs Skill vs MCP">
        Recorre paso a paso cómo se resuelve una tarea real. Observa quién decide, quién ejecuta y qué viaja entre cada pieza.
      </Cabecera>

      {/* Actores */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="list" aria-label="Actores del flujo">
        {ACTORES.map((actor) => {
          const activo = actor === actual.de || actor === actual.a
          return (
            <div
              key={actor}
              role="listitem"
              className={`rounded-lg border px-2 py-3 text-center text-xs font-semibold transition sm:text-sm ${
                activo
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow'
                  : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {actor}
            </div>
          )
        })}
      </div>

      {/* Paso actual */}
      <section className="card space-y-4" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="etiqueta">Paso {paso + 1} de {PASOS.length}</span>
          <span className="font-medium">
            {actual.de} <span className="text-indigo-500">→</span> {actual.a}
          </span>
        </div>
        <h2 className="text-lg font-semibold">{actual.titulo}</h2>
        <p className="leading-relaxed text-slate-700 dark:text-slate-300">
          <Texto texto={actual.detalle} />
        </p>
        {actual.codigo && (
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
            <code className="whitespace-pre font-mono">{actual.codigo}</code>
          </pre>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button type="button" className="btn-secundario" onClick={() => setPaso((p) => Math.max(0, p - 1))} disabled={paso === 0}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <div className="order-last flex w-full flex-wrap justify-center gap-1.5 sm:order-none sm:w-auto" role="group" aria-label="Seleccionar paso">
            {PASOS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPaso(i)}
                aria-label={`Ir al paso ${i + 1}`}
                aria-current={i === paso}
                className={`h-10 w-4 rounded-full sm:w-5 ${i === paso ? 'bg-indigo-600' : i < paso ? 'bg-indigo-300 dark:bg-indigo-800' : 'bg-slate-300 dark:bg-slate-700'}`}
              />
            ))}
          </div>
          <button type="button" className="btn-primario" onClick={() => setPaso((p) => Math.min(PASOS.length - 1, p + 1))} disabled={paso === PASOS.length - 1}>
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Comparativa */}
      <section aria-labelledby="comparativa">
        <h2 id="comparativa" className="mb-3 text-lg font-semibold">Diferencias en una mirada</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Pieza</th>
                <th className="px-3 py-2">Qué es</th>
                <th className="px-3 py-2">Quién decide su uso</th>
                <th className="px-3 py-2">Ejemplo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200 align-top dark:border-slate-700">
                <td className="px-3 py-2 font-semibold">Agente</td>
                <td className="px-3 py-2">Bucle que razona, llama herramientas y observa resultados</td>
                <td className="px-3 py-2">El propio modelo, dentro de los límites del harness</td>
                <td className="px-3 py-2">Decide qué hacer después de leer un fallo</td>
              </tr>
              <tr className="border-t border-slate-200 align-top dark:border-slate-700">
                <td className="px-3 py-2 font-semibold">Skill</td>
                <td className="px-3 py-2">Instrucciones y plantillas cargadas bajo demanda</td>
                <td className="px-3 py-2">El agente, al detectar que la tarea encaja</td>
                <td className="px-3 py-2">Procedimiento de depuración de tests</td>
              </tr>
              <tr className="border-t border-slate-200 align-top dark:border-slate-700">
                <td className="px-3 py-2 font-semibold">MCP</td>
                <td className="px-3 py-2">Protocolo y servidores que exponen datos y herramientas externas</td>
                <td className="px-3 py-2">El agente invoca; la aplicación aprueba y controla el acceso</td>
                <td className="px-3 py-2">Consultar el historial de CI</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

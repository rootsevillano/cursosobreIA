import { useState } from 'react'
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import type { Modulo } from '../types'
import { Cabecera, Texto } from './ui'

interface Props {
  modulo: Modulo
  previo?: { aciertos: number; total: number; fecha: string }
  onResultado: (aciertos: number, total: number) => void
}

export default function Quiz({ modulo, previo, onResultado }: Props) {
  // Respuesta elegida por pregunta (índice) o undefined si aún no se ha contestado.
  const [respuestas, setRespuestas] = useState<Record<string, number>>({})
  const [finalizado, setFinalizado] = useState(false)

  const total = modulo.quiz.length
  const contestadas = Object.keys(respuestas).length
  const aciertos = modulo.quiz.filter((p) => respuestas[p.id] === p.correcta).length

  const responder = (preguntaId: string, opcion: number) => {
    if (finalizado || respuestas[preguntaId] !== undefined) return
    setRespuestas((r) => ({ ...r, [preguntaId]: opcion }))
  }

  const finalizar = () => {
    setFinalizado(true)
    onResultado(aciertos, total)
  }

  const reiniciar = () => {
    setRespuestas({})
    setFinalizado(false)
  }

  return (
    <div className="space-y-6">
      <Cabecera titulo={`Autoevaluación: ${modulo.titulo}`}>
        {total} preguntas tipo test. Al elegir una opción verás si es correcta y por qué.
        {previo && (
          <span className="mt-2 block text-sm">
            Último resultado guardado: <strong>{previo.aciertos}/{previo.total}</strong>
          </span>
        )}
      </Cabecera>

      {modulo.quiz.map((p, i) => {
        const elegida = respuestas[p.id]
        const respondida = elegida !== undefined
        return (
          <fieldset key={p.id} className="card">
            <legend className="mb-3 px-1 font-semibold">
              {i + 1}. <Texto texto={p.pregunta} />
            </legend>
            <div className="space-y-2">
              {p.opciones.map((op, j) => {
                const esCorrecta = j === p.correcta
                const esElegida = j === elegida
                let clase = 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                if (respondida && esCorrecta) clase = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                else if (respondida && esElegida) clase = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40'
                return (
                  <button
                    key={j}
                    type="button"
                    disabled={respondida || finalizado}
                    onClick={() => responder(p.id, j)}
                    className={`flex min-h-11 w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-default ${clase}`}
                  >
                    <span className="mt-0.5 font-mono text-xs text-slate-500">{String.fromCharCode(65 + j)}</span>
                    <span className="flex-1"><Texto texto={op} /></span>
                    {respondida && esCorrecta && <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />}
                    {respondida && esElegida && !esCorrecta && <XCircle size={18} className="shrink-0 text-rose-600" />}
                  </button>
                )
              })}
            </div>
            {respondida && (
              <div className={`mt-3 rounded-lg p-3 text-sm ${elegida === p.correcta ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40'}`}>
                <p className="font-semibold">{elegida === p.correcta ? 'Correcto' : 'Incorrecto'}</p>
                <p className="mt-1 leading-relaxed"><Texto texto={p.explicacion} /></p>
              </div>
            )}
          </fieldset>
        )
      })}

      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {finalizado ? (
          <p className="text-lg font-semibold">
            Resultado: {aciertos} de {total} correctas
          </p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">Respondidas: {contestadas} de {total}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {!finalizado && (
            <button type="button" className="btn-primario" disabled={contestadas < total} onClick={finalizar}>
              Ver resultado final
            </button>
          )}
          <button type="button" className="btn-secundario" onClick={reiniciar}>
            <RotateCcw size={16} /> Reiniciar
          </button>
        </div>
      </div>
    </div>
  )
}

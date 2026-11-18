import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Props {
  codigo: string
  lenguaje: string
  comentario?: string
}

export default function CodeBlock({ codigo, lenguaje, comentario }: Props) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      /* portapapeles no disponible (contexto no seguro): se ignora */
    }
  }

  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-slate-100 dark:border-slate-700">
      <figcaption className="flex items-center justify-between gap-2 border-b border-slate-700 px-3 py-2 text-xs">
        <span className="min-w-0 truncate text-slate-400">{comentario || lenguaje}</span>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-slate-200 hover:bg-slate-700"
          aria-label="Copiar código"
        >
          {copiado ? <Check size={14} /> : <Copy size={14} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </figcaption>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="whitespace-pre font-mono">{codigo}</code>
      </pre>
    </figure>
  )
}

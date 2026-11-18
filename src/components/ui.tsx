import type { ReactNode } from 'react'
import type { Dificultad } from '../types'

export const TEXTO_DIFICULTAD: Record<Dificultad, string> = {
  basica: 'Básica',
  intermedia: 'Intermedia',
  avanzada: 'Avanzada',
}

export const COLOR_DIFICULTAD: Record<Dificultad, string> = {
  basica: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  intermedia: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  avanzada: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

export function Cabecera({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
      {children && <div className="mt-2 text-slate-600 dark:text-slate-400">{children}</div>}
    </header>
  )
}

// Texto con **negrita** y *cursiva* en línea (sin dependencias de Markdown).
export function Texto({ texto, className = '' }: { texto: string; className?: string }) {
  const partes = texto.split(/(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean)
  return (
    <span className={className}>
      {partes.map((p, i) => {
        const enlace = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
        if (enlace)
          return (
            <a key={i} href={enlace[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400 break-words">
              {enlace[1]}
            </a>
          )
        if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('`')) return <code key={i} className="rounded bg-slate-200 px-1 py-0.5 text-[0.85em] dark:bg-slate-800">{p.slice(1, -1)}</code>
        if (p.startsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
        return <span key={i}>{p}</span>
      })}
    </span>
  )
}

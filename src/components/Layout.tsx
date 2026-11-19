import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Clapperboard, ClipboardCheck, FlaskConical, Gauge, GraduationCap, Library, Map, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { irA, useRuta } from '../lib/router'
import { buscar, CURSO } from '../lib/search'
import type { Progreso } from '../lib/progress'
import type { Tema } from '../lib/theme'

interface Props {
  ruta: string[]
  progreso: Progreso
  tema: Tema
  onAlternarTema: () => void
  menuAbierto: boolean
  onMenu: (abierto: boolean) => void
  children: ReactNode
}

const TOTAL_LECCIONES = CURSO.modulos.reduce((n, m) => n + m.lecciones.length, 0)

export default function Layout({ ruta, progreso, tema, onAlternarTema, menuAbierto, onMenu, children }: Props) {
  const rutaActual = useRuta()
  const [consulta, setConsulta] = useState('')
  const resultados = useMemo(() => buscar(consulta), [consulta])
  const completadas = progreso.lecciones.length
  const porcentaje = Math.round((completadas / TOTAL_LECCIONES) * 100)

  // Cierra el drawer al cambiar de ruta.
  useEffect(() => {
    onMenu(false)
  }, [rutaActual, onMenu])

  // Bloquea el scroll del fondo mientras el drawer está abierto.
  useEffect(() => {
    document.body.style.overflow = menuAbierto ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuAbierto])

  const esActiva = (...prefijo: string[]) => prefijo.every((p, i) => ruta[i] === p)

  const enlace = (activa: boolean) =>
    `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
      activa
        ? 'bg-indigo-600 font-medium text-white'
        : 'text-slate-700 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
    }`

  const navegacion = (
    <nav aria-label="Navegación principal" className="space-y-1">
      <a href="#/" className={enlace(ruta.length === 0)}>
        <Gauge size={18} /> Inicio
      </a>
      <a href="#/ruta" className={enlace(esActiva('ruta'))}>
        <Map size={18} /> Ruta de aprendizaje
      </a>

      <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Módulos</p>
      {CURSO.modulos.map((m, i) => (
        <details key={m.id} open={ruta[0] === 'leccion' && m.lecciones.some((l) => l.id === ruta[1])} className="group">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/70 dark:text-slate-200 dark:hover:bg-slate-800">
            <span>
              {i + 1}. {m.titulo}
            </span>
            <span className="text-xs text-slate-500">
              {m.lecciones.filter((l) => progreso.lecciones.includes(l.id)).length}/{m.lecciones.length}
            </span>
          </summary>
          <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-300 pl-2 dark:border-slate-700">
            {m.lecciones.map((l) => (
              <a key={l.id} href={`#/leccion/${l.id}`} className={enlace(ruta[0] === 'leccion' && ruta[1] === l.id)}>
                <span className="flex-1 truncate">{progreso.lecciones.includes(l.id) ? '✔ ' : ''}{l.titulo}</span>
              </a>
            ))}
            {m.quiz.length > 0 && (
              <a href={`#/modulo/${m.id}/quiz`} className={enlace(esActiva('modulo', m.id))}>
                <ClipboardCheck size={16} /> Autoevaluación
              </a>
            )}
          </div>
        </details>
      ))}

      <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Laboratorios</p>
      <a href="#/lab/flujo" className={enlace(esActiva('lab', 'flujo'))}>
        <FlaskConical size={18} /> Agente vs Skill vs MCP
      </a>
      <a href="#/lab/modelos" className={enlace(esActiva('lab', 'modelos'))}>
        <FlaskConical size={18} /> Selector de modelo
      </a>
      <a href="#/lab/metodologias" className={enlace(esActiva('lab', 'metodologias'))}>
        <FlaskConical size={18} /> Metodologías
      </a>

      <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Herramientas</p>
      <a href="#/glosario" className={enlace(esActiva('glosario'))}>
        <Library size={18} /> Glosario
      </a>
      <a href="#/videos" className={enlace(esActiva('videos'))}>
        <Clapperboard size={18} /> Vídeos
      </a>
      <a href="#/progreso" className={enlace(esActiva('progreso'))}>
        <GraduationCap size={18} /> Mi progreso
      </a>
    </nav>
  )

  const progresoBarra = (
    <div className="px-3">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Progreso global</span>
        <span>{porcentaje}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Cabecera */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex h-16 items-center gap-2 px-4 sm:gap-3">
          <button
            type="button"
            className="btn-secundario !px-2.5 lg:hidden"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            onClick={() => onMenu(!menuAbierto)}
          >
            {menuAbierto ? <X size={20} /> : <Menu size={20} />}
          </button>
          <a href="#/" className="flex min-w-0 items-center gap-2 font-semibold">
            <BookOpen size={22} className="shrink-0 text-indigo-500" />
            <span className="truncate">Guía IA &amp; Agentes</span>
          </a>

          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Buscar conceptos…"
              aria-label="Buscar en el curso"
              className="campo !pl-9"
            />
            {consulta.trim() && (
              <div className="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-[min(90vw,24rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {resultados.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">Sin resultados para « {consulta} ».</p>
                ) : (
                  resultados.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="block w-full rounded-lg p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        setConsulta('')
                        irA(...r.ruta)
                      }}
                    >
                      <span className="etiqueta mb-1">{r.tipo === 'leccion' ? 'Lección' : 'Glosario'}</span>
                      <span className="block text-sm font-medium">{r.titulo}</span>
                      <span className="line-clamp-2 text-xs text-slate-500">{r.extracto}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-secundario !px-2.5"
            aria-label={tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'}
            onClick={onAlternarTema}
          >
            {tema === 'oscuro' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Drawer (móvil y tablet) */}
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => onMenu(false)}
        />
      )}
      <aside
        className={`fixed inset-y-16 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 lg:z-20 lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6 pb-8">
          {progresoBarra}
          {navegacion}
        </div>
      </aside>

      {/* Contenido */}
      <main className="px-4 pb-16 pt-6 sm:px-6 lg:pl-80 lg:pr-10">
        <div className="mx-auto w-full max-w-3xl min-w-0">{children}</div>
      </main>
    </div>
  )
}

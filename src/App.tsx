import { useState } from 'react'
import Layout from './components/Layout'
import Home from './components/Home'
import Ruta from './components/Ruta'
import Leccion from './components/Leccion'
import Quiz from './components/Quiz'
import FlujoAgenteSkillMCP from './components/FlujoAgenteSkillMCP'
import SelectorModelos from './components/SelectorModelos'
import MatrizMetodologias from './components/MatrizMetodologias'
import Glosario from './components/Glosario'
import Progreso from './components/Progreso'
import Videos from './components/Videos'
import { useRuta } from './lib/router'
import { useProgreso } from './lib/progress'
import { CURSO } from './lib/search'
import { useTema } from './lib/theme'

export default function App() {
  const ruta = useRuta()
  const { progreso, alternarLeccion, registrarQuiz, importar, reiniciar } = useProgreso()
  const { tema, alternar } = useTema()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const [seccion, ...resto] = ruta
  let contenido
  switch (seccion) {
    case 'ruta':
      contenido = <Ruta progreso={progreso} />
      break
    case 'leccion': {
      const leccionId = resto[0] ?? ''
      contenido = <Leccion leccionId={leccionId} progreso={progreso} onAlternar={alternarLeccion} />
      break
    }
    case 'modulo': {
      const modulo = CURSO.modulos.find((m) => m.id === resto[0])
      contenido = modulo ? (
        <Quiz modulo={modulo} onResultado={(a, t) => registrarQuiz(modulo.id, a, t)} previo={progreso.quizzes[modulo.id]} />
      ) : (
        <p className="card">Módulo no encontrado.</p>
      )
      break
    }
    case 'lab':
      if (resto[0] === 'flujo') contenido = <FlujoAgenteSkillMCP />
      else if (resto[0] === 'modelos') contenido = <SelectorModelos />
      else if (resto[0] === 'metodologias') contenido = <MatrizMetodologias />
      else contenido = <p className="card">Laboratorio no encontrado.</p>
      break
    case 'glosario':
      contenido = <Glosario />
      break
    case 'progreso':
      contenido = <Progreso progreso={progreso} onImportar={importar} onReiniciar={reiniciar} />
      break
    case 'videos':
      contenido = <Videos />
      break
    default:
      contenido = <Home progreso={progreso} />
  }

  return (
    <Layout
      ruta={ruta}
      progreso={progreso}
      tema={tema}
      onAlternarTema={alternar}
      menuAbierto={menuAbierto}
      onMenu={setMenuAbierto}
    >
      {contenido}
    </Layout>
  )
}

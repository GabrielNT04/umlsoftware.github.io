import { useCallback, useEffect, useRef } from 'react'
import activityLibrary from './assets/diagramms/Aktivitätsdiagramm.xml?raw'
import classLibrary from './assets/diagramms/Klassendiagramm.xml?raw'
import sequenceLibrary from './assets/diagramms/Sequenzdiagramm.xml?raw'
import useCaseLibrary from './assets/diagramms/Use-Case-Diagramm.xml?raw'
import deploymentLibrary from './assets/diagramms/Verteilungsdiagramm.xml?raw'
import stateLibrary from './assets/diagramms/Zustandsdiagramm.xml?raw'
import './App.css'

const DRAWIO_ORIGIN = 'https://embed.diagrams.net'
const DRAWIO_URL = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1&libraries=1&configure=1`

const EMPTY_DIAGRAM_XML = `<mxfile host="umlsoftwareui">
  <diagram id="initial" name="Page-1">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`

function label(value) {
  return { main: value }
}

function libraryData(mxlibrary) {
  const document = new DOMParser().parseFromString(mxlibrary, 'application/xml')
  const parserError = document.querySelector('parsererror')
  const libraryNode = document.querySelector('mxlibrary')

  if (parserError || !libraryNode) {
    throw new Error('Invalid draw.io mxlibrary file')
  }

  return JSON.parse(libraryNode.textContent.trim())
}

const UML_LIBRARIES = [
  {
    id: 'uml-activity',
    title: 'Aktivitätsdiagramm',
    tags: 'uml aktivitaet activity',
    data: libraryData(activityLibrary),
  },
  {
    id: 'uml-class',
    title: 'Klassendiagramm',
    tags: 'uml klasse class',
    data: libraryData(classLibrary),
  },
  {
    id: 'uml-sequence',
    title: 'Sequenzdiagramm',
    tags: 'uml sequenz sequence',
    data: libraryData(sequenceLibrary),
  },
  {
    id: 'uml-use-case',
    title: 'Use-Case-Diagramm',
    tags: 'uml use case anwendungsfall',
    data: libraryData(useCaseLibrary),
  },
  {
    id: 'uml-deployment',
    title: 'Verteilungsdiagramm',
    tags: 'uml verteilung deployment',
    data: libraryData(deploymentLibrary),
  },
  {
    id: 'uml-state',
    title: 'Zustandsdiagramm',
    tags: 'uml zustand state',
    data: libraryData(stateLibrary),
  },
]

const UML_LIBRARY_IDS = UML_LIBRARIES.map((library) => library.id).join(';')

const DRAWIO_CONFIG = {
  defaultLibraries: UML_LIBRARY_IDS,
  enabledLibraries: [],
  enableCustomLibraries: false,
  appendCustomLibraries: false,
  expandLibraries: false,
  libraries: [
    {
      title: label('UML Notationen'),
      entries: UML_LIBRARIES.map((library) => ({
        id: library.id,
        title: label(library.title),
        desc: label(`${library.title} Notationsbibliothek`),
        libs: [
          {
            title: label(library.title),
            data: library.data,
            tags: library.tags,
          },
        ],
      })),
    },
  ],
}

function App() {
  const iframeRef = useRef(null)

  const postToDrawio = useCallback((message) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify(message),
      DRAWIO_ORIGIN,
    )
  }, [])

  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== DRAWIO_ORIGIN) return

      let message
      try {
        message =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }

      if (message.event === 'configure') {
        postToDrawio({
          action: 'configure',
          config: DRAWIO_CONFIG,
        })
      }

      if (message.event === 'init') {
        postToDrawio({
          action: 'load',
          autosave: 1,
          libs: UML_LIBRARY_IDS,
          title: 'umlsoftwareui.drawio',
          xml: EMPTY_DIAGRAM_XML,
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [postToDrawio])

  return (
    <iframe
      ref={iframeRef}
      title="Draw.io Diagram Editor"
      src={DRAWIO_URL}
      allow="clipboard-read; clipboard-write"
    />
  )
}

export default App

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import activityLibrary from './assets/diagramms/Aktivitätsdiagramm.xml?raw'
import classLibrary from './assets/diagramms/Klassendiagramm.xml?raw'
import sequenceLibrary from './assets/diagramms/Sequenzdiagramm.xml?raw'
import useCaseLibrary from './assets/diagramms/Use-Case-Diagramm.xml?raw'
import deploymentLibrary from './assets/diagramms/Verteilungsdiagramm.xml?raw'
import stateLibrary from './assets/diagramms/Zustandsdiagramm.xml?raw'
import './App.css'

const DRAWIO_ORIGIN = 'https://embed.diagrams.net'
const DRAWIO_URL = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1&libraries=1&configure=1&noSaveBtn=0&saveAndExit=1`

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

const DRAWIO_CONFIG = {
  defaultLibraries: UML_LIBRARIES.map((library) => library.id).join(';'),
  enabledLibraries: [],
  enableCustomLibraries: false,
  appendCustomLibraries: false,
  expandLibraries: true,
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

function formatTime(date) {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function App() {
  const iframeRef = useRef(null)
  const latestXmlRef = useRef(EMPTY_DIAGRAM_XML)
  const [xml, setXml] = useState(EMPTY_DIAGRAM_XML)
  const [status, setStatus] = useState('Editor wird geladen')
  const [lastEvent, setLastEvent] = useState('waiting')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [editorReady, setEditorReady] = useState(false)

  const xmlSize = useMemo(() => new Blob([xml]).size, [xml])

  const postToDrawio = useCallback((message) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify(message),
      DRAWIO_ORIGIN,
    )
  }, [])

  const updateXml = useCallback((nextXml, eventName) => {
    latestXmlRef.current = nextXml
    setXml(nextXml)
    setLastEvent(eventName)
    setLastSavedAt(new Date())
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

      if (!message?.event) return

      if (message.event === 'configure') {
        setStatus('UML-Bibliotheken werden konfiguriert')
        setLastEvent('configure')
        postToDrawio({
          action: 'configure',
          config: DRAWIO_CONFIG,
        })
        return
      }

      if (message.event === 'init') {
        setEditorReady(true)
        setStatus('Diagramm bereit')
        setLastEvent('init')
        postToDrawio({
          action: 'load',
          autosave: 1,
          libs: UML_LIBRARIES.map((library) => library.id).join(';'),
          title: 'umlsoftwareui.drawio',
          xml: latestXmlRef.current,
        })
        return
      }

      if (message.event === 'save' || message.event === 'autosave') {
        updateXml(message.xml, message.event)
        setStatus(
          message.event === 'save'
            ? 'Diagramm gespeichert'
            : 'Autosave empfangen',
        )
        return
      }

      if (message.event === 'export') {
        setLastEvent('export')
        setStatus(`Export ${message.format ?? ''} empfangen`.trim())
        return
      }

      if (message.event === 'exit') {
        setLastEvent('exit')
        setStatus('Editor hat Exit gemeldet')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [postToDrawio, updateXml])

  function handleReload() {
    postToDrawio({
      action: 'load',
      autosave: 1,
      libs: UML_LIBRARIES.map((library) => library.id).join(';'),
      title: 'umlsoftwareui.drawio',
      xml: latestXmlRef.current,
    })
    setStatus('Diagramm neu in Draw.io geladen')
  }

  function handleExportSvg() {
    postToDrawio({
      action: 'export',
      format: 'svg',
      border: 8,
      embedImages: true,
    })
    setStatus('SVG-Export angefragt')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">UML Software UI</p>
          <h1>Draw.io Embed Editor</h1>
        </div>
        <div className="status-strip" aria-live="polite">
          <span className={editorReady ? 'status-dot ready' : 'status-dot'} />
          <span>{status}</span>
        </div>
      </header>

      <section className="workspace">
        <aside className="side-panel">
          <div>
            <h2>Session</h2>
            <dl className="meta-list">
              <div>
                <dt>Event</dt>
                <dd>{lastEvent}</dd>
              </div>
              <div>
                <dt>XML</dt>
                <dd>{xmlSize.toLocaleString('de-DE')} Bytes</dd>
              </div>
              <div>
                <dt>Gespeichert</dt>
                <dd>{lastSavedAt ? formatTime(lastSavedAt) : 'noch nicht'}</dd>
              </div>
            </dl>
          </div>

          <div className="button-row">
            <button type="button" onClick={handleReload}>
              Neu laden
            </button>
            <button type="button" onClick={handleExportSvg}>
              SVG exportieren
            </button>
          </div>

          <div>
            <h2>Verfügbare Bibliotheken</h2>
            <ul className="library-list">
              {UML_LIBRARIES.map((library) => (
                <li key={library.id}>
                  <span>{library.title}</span>
                  <strong>{library.data.length}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="xml-preview">
            <h2>Aktuelles XML</h2>
            <pre>{xml.slice(0, 900)}</pre>
          </div>
        </aside>

        <section className="editor-panel" aria-label="Draw.io Editor">
          <iframe
            ref={iframeRef}
            title="Draw.io Diagram Editor"
            src={DRAWIO_URL}
            allow="clipboard-read; clipboard-write"
          />
        </section>
      </section>
    </main>
  )
}

export default App

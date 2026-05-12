import { useState, useEffect, useRef } from 'react'
import './ModelInput.css'

const SAMPLE_MODEL = `model
  schema 1.1

type user

type group
  relations
    define member: [user, group#member]

type document
  relations
    define owner: [user, group#member]
    define editor: [user, group#member] or owner
    define viewer: [user, group#member] or editor
`

export default function ModelInput({ onParse, dslValue }) {
  const [dslText, setDslText] = useState('')
  const [error, setError] = useState(null)
  const prevDslValue = useRef(dslValue)

  // Sync textarea when the model is updated externally (canvas edits)
  useEffect(() => {
    if (dslValue !== prevDslValue.current) {
      prevDslValue.current = dslValue
      if (dslValue !== undefined) setDslText(dslValue)
    }
  }, [dslValue])

  function handleParse() {
    try {
      setError(null)
      onParse(dslText)
    } catch (err) {
      setError(err.message)
    }
  }

  function handleLoadSample() {
    setDslText(SAMPLE_MODEL)
    setError(null)
  }

  return (
    <div className="model-input">
      <div className="model-input__header">
        <h2 className="model-input__title">FGA Model</h2>
        <button className="model-input__btn model-input__btn--secondary" onClick={handleLoadSample}>
          Load sample
        </button>
      </div>

      <textarea
        className="model-input__textarea"
        value={dslText}
        onChange={(e) => setDslText(e.target.value)}
        placeholder="Paste your OpenFGA DSL here…"
        spellCheck={false}
      />

      {error && <div className="model-input__error">{error}</div>}

      <button className="model-input__btn model-input__btn--primary" onClick={handleParse}>
        Parse model
      </button>
    </div>
  )
}

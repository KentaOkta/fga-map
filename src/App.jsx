import { useState, useCallback } from 'react'
import { parse } from './utils/fgaParser.js'
import { generate } from './utils/fgaGenerator.js'
import { addType, addConnection, generateTypeName, renameType, renameRelation, deleteType, deleteRelation, deleteRef } from './utils/modelMutations.js'
import ModelInput from './components/ModelInput.jsx'
import FGACanvas from './components/FGACanvas.jsx'
import EditPanel from './components/EditPanel.jsx'
import './App.css'

export default function App() {
  const [parsedModel, setParsedModel] = useState(null)
  const [dslText, setDslText] = useState('')
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [isEditMode, setIsEditMode] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  // User explicitly re-parses DSL → full layout reset
  const handleParse = useCallback((text) => {
    const model = parse(text)
    setParsedModel(model)
    setDslText(text)
    setExpandedNodes(new Set())
    setResetKey(k => k + 1)
  }, [])

  const handleNodeClick = useCallback((nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  // Canvas edit: drop a new type — preserves existing node positions
  const handleDropType = useCallback((position) => {
    const model = parsedModel ?? { types: [] }
    const name = generateTypeName(model.types)
    const newModel = addType(model, name)
    setParsedModel(newModel)
    setDslText(generate(newModel))
    return name // returned so canvas can place node at drop position
  }, [parsedModel])

  // Canvas edit: rename a type by double-clicking its label
  const handleRenameType = useCallback((oldName, newName) => {
    if (!parsedModel || !newName.trim() || oldName === newName) return
    if (parsedModel.types.some(t => t.name === newName)) return // duplicate
    const newModel = renameType(parsedModel, oldName, newName)
    setParsedModel(newModel)
    setDslText(generate(newModel))
    setExpandedNodes(prev => {
      if (!prev.has(oldName)) return prev
      const next = new Set(prev)
      next.delete(oldName)
      next.add(newName)
      return next
    })
  }, [parsedModel])

  const handleRenameRelation = useCallback((typeName, oldRelName, newRelName) => {
    if (!parsedModel || !newRelName.trim() || oldRelName === newRelName) return
    const newModel = renameRelation(parsedModel, typeName, oldRelName, newRelName)
    setParsedModel(newModel)
    setDslText(generate(newModel))
  }, [parsedModel])

  const handleDeleteType = useCallback((typeName) => {
    if (!parsedModel) return
    const newModel = deleteType(parsedModel, typeName)
    setParsedModel(newModel)
    setDslText(generate(newModel))
    setExpandedNodes(prev => { const n = new Set(prev); n.delete(typeName); return n })
  }, [parsedModel])

  const handleDeleteRelation = useCallback((typeName, relationName) => {
    if (!parsedModel) return
    const newModel = deleteRelation(parsedModel, typeName, relationName)
    setParsedModel(newModel)
    setDslText(generate(newModel))
  }, [parsedModel])

  const handleDeleteRef = useCallback((typeName, relationName, refTypeName, refRelationName) => {
    if (!parsedModel) return
    const newModel = deleteRef(parsedModel, typeName, relationName, refTypeName, refRelationName)
    setParsedModel(newModel)
    setDslText(generate(newModel))
  }, [parsedModel])

  // Canvas edit: drag a connection between handles
  const handleConnect = useCallback(({ source, target, sourceHandle, targetHandle }) => {
    if (!parsedModel) return
    const newModel = addConnection(parsedModel, {
      source,
      sourceRelation: sourceHandle || null,
      target,
      targetRelation: targetHandle || null,
    })
    if (newModel === parsedModel) return
    setParsedModel(newModel)
    setDslText(generate(newModel))
  }, [parsedModel])

  return (
    <div className="app">
      <aside className="app__sidebar">
        <ModelInput onParse={handleParse} dslValue={dslText} />
      </aside>

      <main className="app__canvas">
        <FGACanvas
          parsedModel={parsedModel}
          expandedNodes={expandedNodes}
          onNodeClick={handleNodeClick}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(v => !v)}
          resetKey={resetKey}
          onDropType={handleDropType}
          onConnect={handleConnect}
          onRenameType={handleRenameType}
          onRenameRelation={handleRenameRelation}
          onDeleteType={handleDeleteType}
          onDeleteRelation={handleDeleteRelation}
          onDeleteRef={handleDeleteRef}
        />
        {isEditMode && <EditPanel onClose={() => setIsEditMode(false)} />}
      </main>
    </div>
  )
}

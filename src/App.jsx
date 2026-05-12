import { useState, useCallback } from 'react'
import { parse } from './utils/fgaParser.js'
import { generate } from './utils/fgaGenerator.js'
import {
  addType, addConnection, generateTypeName,
  renameType, renameRelation, deleteType, deleteRelation, deleteRef,
  addCondition, updateCondition, deleteCondition, generateConditionName, addRefWithCondition,
} from './utils/modelMutations.js'
import ModelInput from './components/ModelInput.jsx'
import FGACanvas from './components/FGACanvas.jsx'
import InspectPanel from './components/InspectPanel.jsx'
import './App.css'

export default function App() {
  const [parsedModel,    setParsedModel]    = useState(null)
  const [dslText,        setDslText]        = useState('')
  const [expandedNodes,  setExpandedNodes]  = useState(new Set())
  const [isEditMode,     setIsEditMode]     = useState(false)
  const [resetKey,       setResetKey]       = useState(0)
  const [selectedConditionName, setSelectedConditionName] = useState(null)
  const [selectedTypeName,      setSelectedTypeName]      = useState(null)
  const [leftView,       setLeftView]       = useState('model') // 'model' | 'inspect'

  // ── Parse ──────────────────────────────────────────────────────────────────

  const handleParse = useCallback((text) => {
    const model = parse(text)
    setParsedModel(model)
    setDslText(text)
    setExpandedNodes(new Set())
    setResetKey(k => k + 1)
  }, [])

  // ── Node interaction ───────────────────────────────────────────────────────

  const handleNodeClick = useCallback((nodeId) => {
    setSelectedTypeName(nodeId)
    setLeftView('inspect')
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  // ── Type mutations ─────────────────────────────────────────────────────────

  const handleDropType = useCallback((position) => {
    const model = parsedModel ?? { types: [], conditions: [] }
    const name = generateTypeName(model.types)
    const newModel = addType(model, name)
    setParsedModel(newModel)
    setDslText(generate(newModel))
    return name
  }, [parsedModel])

  const handleRenameType = useCallback((oldName, newName) => {
    if (!parsedModel || !newName.trim() || oldName === newName) return
    if (parsedModel.types.some(t => t.name === newName)) return
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
    setSelectedTypeName(prev => prev === oldName ? newName : prev)
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
    setSelectedTypeName(prev => prev === typeName ? null : prev)
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

  // ── Condition mutations ────────────────────────────────────────────────────

  const handleAddCondition = useCallback(() => {
    if (!parsedModel) return
    const name = generateConditionName(parsedModel.conditions ?? [])
    const newModel = addCondition(parsedModel, { name, params: [], expression: '' })
    setParsedModel(newModel)
    setDslText(generate(newModel))
    setSelectedConditionName(name)
  }, [parsedModel])

  const handleUpdateCondition = useCallback((name, updates) => {
    if (!parsedModel) return
    const newModel = updateCondition(parsedModel, name, updates)
    setParsedModel(newModel)
    setDslText(generate(newModel))
    if (updates.name && updates.name !== name) {
      setSelectedConditionName(updates.name.trim() || name)
    }
  }, [parsedModel])

  const handleDeleteCondition = useCallback((name) => {
    if (!parsedModel) return
    const newModel = deleteCondition(parsedModel, name)
    setParsedModel(newModel)
    setDslText(generate(newModel))
    setSelectedConditionName(prev => prev === name ? null : prev)
  }, [parsedModel])

  const handleAddRefCondition = useCallback((targetType, relation, refTypeName, refRelationName, condName) => {
    if (!parsedModel) return
    const newModel = addRefWithCondition(parsedModel, targetType, relation, refTypeName, refRelationName, condName)
    if (newModel === parsedModel) return
    setParsedModel(newModel)
    setDslText(generate(newModel))
  }, [parsedModel])

  const handleSelectCondition = useCallback((name) => {
    setSelectedConditionName(name)
    setLeftView('inspect')
  }, [])

  return (
    <div className="app">
      <aside className="app__sidebar">
        <div className="app__sidebar-tabs">
          <button
            className={`app__sidebar-tab${leftView === 'model' ? ' app__sidebar-tab--active' : ''}`}
            onClick={() => setLeftView('model')}
          >
            Model
          </button>
          <button
            className={`app__sidebar-tab${leftView === 'inspect' ? ' app__sidebar-tab--active' : ''}`}
            onClick={() => setLeftView('inspect')}
          >
            Inspect
          </button>
        </div>

        <div className="app__sidebar-content">
          {leftView === 'model' ? (
            <ModelInput onParse={handleParse} dslValue={dslText} />
          ) : (
            <InspectPanel
              parsedModel={parsedModel}
              selectedTypeName={selectedTypeName}
              isEditMode={isEditMode}
              selectedConditionName={selectedConditionName}
              onRenameType={handleRenameType}
              onRenameRelation={handleRenameRelation}
              onDeleteRelation={handleDeleteRelation}
              onAddCondition={handleAddCondition}
              onUpdateCondition={handleUpdateCondition}
              onDeleteCondition={handleDeleteCondition}
            />
          )}
        </div>
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
          onAddRefCondition={handleAddRefCondition}
          onSelectCondition={handleSelectCondition}
          onDeleteCondition={handleDeleteCondition}
        />
      </main>
    </div>
  )
}

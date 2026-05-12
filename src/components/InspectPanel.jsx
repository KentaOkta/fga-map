import { useState, useEffect, useRef } from 'react'
import './InspectPanel.css'

// ── OpenFGA condition parameter types ─────────────────────────────────────────

const OPENFGA_PARAM_TYPES = [
  { group: 'Basic', types: ['bool', 'string', 'int', 'uint', 'double', 'duration', 'timestamp', 'ipaddress'] },
  { group: 'List', types: ['list<string>', 'list<int>', 'list<uint>', 'list<double>', 'list<bool>', 'list<duration>', 'list<timestamp>'] },
  { group: 'Map',  types: ['map<string>',  'map<int>',  'map<uint>',  'map<double>',  'map<bool>',  'map<duration>',  'map<timestamp>'] },
]

// ── Bin SVG ───────────────────────────────────────────────────────────────────

function BinIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
  )
}

// ── Collapsible section ───────────────────────────────────────────────────────

function CollapsibleSection({ title, isOpen, onToggle, headerAction, children }) {
  return (
    <div className="inspect-section">
      <div className="inspect-section__header" onClick={onToggle}>
        <span className="inspect-section__chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
        <span className="inspect-section__title">{title}</span>
        {headerAction && (
          <span className="inspect-section__header-action" onClick={e => e.stopPropagation()}>
            {headerAction}
          </span>
        )}
      </div>
      {isOpen && <div className="inspect-section__body">{children}</div>}
    </div>
  )
}

// ── Type section ──────────────────────────────────────────────────────────────

function RelationRow({ rel, typeName, isEditMode, onRenameRelation, onDeleteRelation, onUpdateRelationDefinition }) {
  const [localName, setLocalName] = useState(rel.name)
  const [localDef,  setLocalDef]  = useState(rel.definition ?? '')

  useEffect(() => { setLocalName(rel.name) }, [rel.name])
  useEffect(() => { setLocalDef(rel.definition ?? '') }, [rel.definition])

  function handleNameBlur() {
    const trimmed = localName.trim()
    if (trimmed && trimmed !== rel.name) onRenameRelation?.(typeName, rel.name, trimmed)
    else setLocalName(rel.name)
  }

  function handleDefBlur() {
    const trimmed = localDef.trim()
    if (trimmed !== (rel.definition ?? '').trim()) {
      onUpdateRelationDefinition?.(typeName, rel.name, trimmed)
    }
  }

  return (
    <div className="inspect-type__relation">
      <div className="inspect-type__relation-row">
        {isEditMode ? (
          <input
            className="inspect-type__relation-input"
            value={localName}
            onChange={e => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
        ) : (
          <span className="inspect-type__relation-name">{rel.name}</span>
        )}
        {isEditMode && (
          <button
            className="inspect-type__relation-delete"
            onClick={() => onDeleteRelation?.(typeName, rel.name)}
            title="Delete relation"
          >
            ×
          </button>
        )}
      </div>
      {isEditMode ? (
        <textarea
          className="inspect-type__relation-def"
          value={localDef}
          onChange={e => setLocalDef(e.target.value)}
          onBlur={handleDefBlur}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() } }}
          rows={2}
          placeholder="[user] or writer…"
          spellCheck={false}
        />
      ) : (
        rel.definition && <div className="inspect-type__refs">{rel.definition}</div>
      )}
    </div>
  )
}

function TypeSection({ parsedModel, selectedTypeName, isEditMode, onRenameType, onRenameRelation, onDeleteRelation, onUpdateRelationDefinition }) {
  const selectedType = parsedModel?.types.find(t => t.name === selectedTypeName)
  const [localTypeName, setLocalTypeName] = useState(selectedTypeName ?? '')

  useEffect(() => { setLocalTypeName(selectedTypeName ?? '') }, [selectedTypeName])

  function handleNewTypeDragStart(e) {
    e.dataTransfer.setData('application/fga-new-type', 'true')
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleTypeNameBlur() {
    const trimmed = localTypeName.trim()
    if (trimmed && trimmed !== selectedType?.name) onRenameType?.(selectedType.name, trimmed)
    else setLocalTypeName(selectedType?.name ?? '')
  }

  return (
    <div className="inspect-type">
      {/* New Type card — top of the pane, edit mode only */}
      {isEditMode && (
        <div
          className="inspect-type__new-type-card"
          draggable
          onDragStart={handleNewTypeDragStart}
        >
          <div className="inspect-type__new-type-text">
            <span className="inspect-type__new-type-label">New Type</span>
            <span className="inspect-type__new-type-desc">Drag onto the canvas to create it</span>
          </div>
          <span className="inspect-type__new-type-chevron" aria-hidden="true">▶</span>
        </div>
      )}

      {/* Type detail — or placeholder when nothing selected */}
      {!selectedType ? (
        <p className="inspect-panel__placeholder">Click a node to inspect it.</p>
      ) : (
        <>
          <div className="inspect-type__name-row">
            <span className="inspect-type__keyword">type</span>
            {isEditMode ? (
              <input
                className="inspect-type__name-input"
                value={localTypeName}
                onChange={e => setLocalTypeName(e.target.value)}
                onBlur={handleTypeNameBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              />
            ) : (
              <span className="inspect-type__name">{selectedType.name}</span>
            )}
          </div>

          {selectedType.relations.length === 0 ? (
            <p className="inspect-panel__placeholder inspect-panel__placeholder--indent">No relations defined.</p>
          ) : (
            <div className="inspect-type__relations">
              {selectedType.relations.map(rel => (
                <RelationRow
                  key={rel.name}
                  rel={rel}
                  typeName={selectedType.name}
                  isEditMode={isEditMode}
                  onRenameRelation={onRenameRelation}
                  onDeleteRelation={onDeleteRelation}
                  onUpdateRelationDefinition={onUpdateRelationDefinition}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Connection hint — bottom of the pane, edit mode only */}
      {isEditMode && (
        <p className="inspect-type__connection-hint">
          Drag from a node's right handle to another node or relation to add a connection.
        </p>
      )}
    </div>
  )
}

// ── Condition item ────────────────────────────────────────────────────────────

function ConditionItem({ cond, isEditMode, isSelected, isOpen, onToggle, onUpdate, onDelete, itemRef }) {
  const [localName, setLocalName] = useState(cond.name)
  const [binOver, setBinOver] = useState(false)

  useEffect(() => { setLocalName(cond.name) }, [cond.name])

  function handleNameBlur() {
    const trimmed = localName.trim()
    if (trimmed && trimmed !== cond.name) onUpdate(cond.name, { name: trimmed })
    else setLocalName(cond.name)
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('application/fga-condition', cond.name)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    if (!e.dataTransfer.types.includes('application/fga-bin')) return
    e.preventDefault()
    e.stopPropagation()
    setBinOver(true)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setBinOver(false)
  }

  function handleDrop(e) {
    if (!e.dataTransfer.getData('application/fga-bin')) return
    e.preventDefault()
    e.stopPropagation()
    setBinOver(false)
    onDelete(cond.name)
  }

  function updateParam(i, field, value) {
    const newParams = cond.params.map((p, j) => j === i ? { ...p, [field]: value } : p)
    onUpdate(cond.name, { params: newParams })
  }

  function removeParam(i) {
    onUpdate(cond.name, { params: cond.params.filter((_, j) => j !== i) })
  }

  return (
    <li
      ref={itemRef}
      className={[
        'inspect-cond__item',
        isSelected ? 'inspect-cond__item--selected' : '',
        binOver    ? 'inspect-cond__item--bin-over'  : '',
      ].filter(Boolean).join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="inspect-cond__item-header"
        draggable={isEditMode}
        onDragStart={isEditMode ? handleDragStart : undefined}
        onClick={onToggle}
        title={isEditMode ? 'Drag to trash to delete, or drag to an edge to attach' : undefined}
      >
        <span className="inspect-cond__chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
        {isEditMode ? (
          <input
            className="inspect-cond__name-input"
            value={localName}
            onChange={e => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="inspect-cond__name">{cond.name}</span>
        )}
      </div>

      {isOpen && (
        <div className="inspect-cond__body">
          <div className="inspect-cond__section-label">Parameters</div>
          {cond.params.length === 0 && !isEditMode ? (
            <div className="inspect-cond__empty">None</div>
          ) : (
            <table className="inspect-cond__params-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  {isEditMode && <th></th>}
                </tr>
              </thead>
              <tbody>
                {cond.params.map((p, i) => (
                  <tr key={i}>
                    <td>
                      {isEditMode ? (
                        <input
                          className="inspect-cond__param-input"
                          value={p.name}
                          placeholder="name"
                          onChange={e => updateParam(i, 'name', e.target.value)}
                        />
                      ) : p.name}
                    </td>
                    <td>
                      {isEditMode ? (
                        <select
                          className="inspect-cond__param-type-select"
                          value={p.type}
                          onChange={e => updateParam(i, 'type', e.target.value)}
                        >
                          <option value="">— select type —</option>
                          {OPENFGA_PARAM_TYPES.map(g => (
                            <optgroup key={g.group} label={g.group}>
                              {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      ) : p.type}
                    </td>
                    {isEditMode && (
                      <td>
                        <button className="inspect-cond__remove-param" onClick={() => removeParam(i)} title="Remove">×</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {isEditMode && (
            <button
              className="inspect-cond__add-param"
              onClick={() => onUpdate(cond.name, { params: [...cond.params, { name: '', type: '' }] })}
            >
              + Add param
            </button>
          )}

          <div className="inspect-cond__section-label">Expression</div>
          {isEditMode ? (
            <textarea
              className="inspect-cond__expr-textarea"
              value={cond.expression}
              placeholder="CEL expression…"
              rows={3}
              onChange={e => onUpdate(cond.name, { expression: e.target.value })}
            />
          ) : (
            <pre className="inspect-cond__expr-pre">{cond.expression || '(empty)'}</pre>
          )}
        </div>
      )}
    </li>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function InspectPanel({
  parsedModel,
  selectedTypeName,
  isEditMode,
  selectedConditionName,
  onRenameType,
  onRenameRelation,
  onDeleteRelation,
  onUpdateRelationDefinition,
  onAddCondition,
  onUpdateCondition,
  onDeleteCondition,
}) {
  const [typeOpen,       setTypeOpen]       = useState(true)
  const [conditionsOpen, setConditionsOpen] = useState(true)
  const [expandedConds,  setExpandedConds]  = useState(new Set())
  const [conditionBinOver, setConditionBinOver] = useState(false)
  const condItemRefs = useRef({})
  const conditions = parsedModel?.conditions ?? []

  useEffect(() => {
    if (!selectedConditionName) return
    setExpandedConds(prev => prev.has(selectedConditionName) ? prev : new Set([...prev, selectedConditionName]))
    setTimeout(() => {
      condItemRefs.current[selectedConditionName]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }, [selectedConditionName])

  function toggleCond(name) {
    setExpandedConds(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  // ── Bin drag handlers ──────────────────────────────────────────────────────

  function handleBinDragStart(e) {
    e.dataTransfer.setData('application/fga-bin', 'true')
    e.dataTransfer.effectAllowed = 'move'
    document.body.classList.add('bin-dragging')
  }

  function handleBinDragEnd() {
    document.body.classList.remove('bin-dragging')
    setConditionBinOver(false)
  }

  function handleBinDragOver(e) {
    if (!e.dataTransfer.types.includes('application/fga-condition')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setConditionBinOver(true)
  }

  function handleBinDragLeave() {
    setConditionBinOver(false)
  }

  function handleBinDrop(e) {
    const condName = e.dataTransfer.getData('application/fga-condition')
    if (!condName) return
    e.preventDefault()
    setConditionBinOver(false)
    onDeleteCondition?.(condName)
  }

  const condAddBtn = isEditMode
    ? <button className="inspect-panel__add-btn" onClick={onAddCondition}>+ Add</button>
    : null

  return (
    <div className="inspect-panel">
      <CollapsibleSection title="Type" isOpen={typeOpen} onToggle={() => setTypeOpen(v => !v)}>
        <TypeSection
          parsedModel={parsedModel}
          selectedTypeName={selectedTypeName}
          isEditMode={isEditMode}
          onRenameType={onRenameType}
          onRenameRelation={onRenameRelation}
          onDeleteRelation={onDeleteRelation}
          onUpdateRelationDefinition={onUpdateRelationDefinition}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Conditions"
        isOpen={conditionsOpen}
        onToggle={() => setConditionsOpen(v => !v)}
        headerAction={condAddBtn}
      >
        {conditions.length === 0 ? (
          <p className="inspect-panel__placeholder">No conditions defined.</p>
        ) : (
          <ul className="inspect-cond__list">
            {conditions.map(cond => (
              <ConditionItem
                key={cond.name}
                cond={cond}
                isEditMode={isEditMode}
                isSelected={cond.name === selectedConditionName}
                isOpen={expandedConds.has(cond.name)}
                onToggle={() => toggleCond(cond.name)}
                onUpdate={onUpdateCondition}
                onDelete={onDeleteCondition}
                itemRef={el => { condItemRefs.current[cond.name] = el }}
              />
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* Trash bin — sticky to bottom, edit mode only */}
      {isEditMode && (
        <div className="inspect-panel__edit-footer">
          <div
            className={`inspect-panel__bin${conditionBinOver ? ' inspect-panel__bin--condition-over' : ''}`}
            draggable
            onDragStart={handleBinDragStart}
            onDragEnd={handleBinDragEnd}
            onDragOver={handleBinDragOver}
            onDragLeave={handleBinDragLeave}
            onDrop={handleBinDrop}
            title="Drag onto a type, relation, or connection to delete it. Drop a condition here to delete it."
          >
            <BinIcon />
          </div>
          <p className="inspect-panel__bin-hint">
            Drag bin to delete types, relations, or connections.<br />
            Drop a condition here to delete it.
          </p>
        </div>
      )}
    </div>
  )
}

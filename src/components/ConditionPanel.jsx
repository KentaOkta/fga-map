import { useState, useEffect, useRef } from 'react'
import './ConditionPanel.css'

// All parameter types supported by OpenFGA condition expressions
const OPENFGA_PARAM_TYPES = [
  { group: 'Basic', types: ['bool', 'string', 'int', 'uint', 'double', 'duration', 'timestamp', 'ipaddress'] },
  { group: 'List', types: ['list<string>', 'list<int>', 'list<uint>', 'list<double>', 'list<bool>', 'list<duration>', 'list<timestamp>'] },
  { group: 'Map', types: ['map<string>', 'map<int>', 'map<uint>', 'map<double>', 'map<bool>', 'map<duration>', 'map<timestamp>'] },
]

function ConditionItem({
  cond,
  isEditMode,
  isSelected,
  isOpen,
  onToggle,
  onUpdate,
  onDelete,
  itemRef,
}) {
  const [localName, setLocalName] = useState(cond.name)
  const [binOver, setBinOver] = useState(false)

  // Sync localName if parent renames it externally (e.g. undo)
  useEffect(() => {
    setLocalName(cond.name)
  }, [cond.name])

  function handleNameBlur() {
    const trimmed = localName.trim()
    if (trimmed && trimmed !== cond.name) {
      onUpdate(cond.name, { name: trimmed })
    } else {
      setLocalName(cond.name)
    }
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('application/fga-condition', cond.name)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Accept bin drops (drag trash → condition item)
  function handleDragOver(e) {
    if (!e.dataTransfer.types.includes('application/fga-bin')) return
    e.preventDefault()
    e.stopPropagation()
    setBinOver(true)
  }

  function handleDragLeave(e) {
    // Only clear if we're leaving the item itself, not a child
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setBinOver(false)
    }
  }

  function handleDrop(e) {
    const isBin = e.dataTransfer.getData('application/fga-bin')
    if (!isBin) return
    e.preventDefault()
    e.stopPropagation()
    setBinOver(false)
    onDelete(cond.name)
  }

  function updateParam(index, field, value) {
    const newParams = cond.params.map((p, i) => i === index ? { ...p, [field]: value } : p)
    onUpdate(cond.name, { params: newParams })
  }

  function removeParam(index) {
    onUpdate(cond.name, { params: cond.params.filter((_, i) => i !== index) })
  }

  function addParam() {
    onUpdate(cond.name, { params: [...cond.params, { name: '', type: '' }] })
  }

  return (
    <li
      ref={itemRef}
      className={[
        'condition-panel__item',
        isSelected ? 'condition-panel__item--selected' : '',
        binOver ? 'condition-panel__item--bin-over' : '',
      ].filter(Boolean).join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="condition-panel__item-header"
        draggable={isEditMode}
        onDragStart={isEditMode ? handleDragStart : undefined}
        onClick={onToggle}
        title={isEditMode ? 'Drag to trash to delete, or drag to an edge to attach' : undefined}
      >
        <span className="condition-panel__chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
        {isEditMode ? (
          <input
            className="condition-panel__name-input"
            value={localName}
            onChange={e => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="condition-panel__name">{cond.name}</span>
        )}
      </div>

      {isOpen && (
        <div className="condition-panel__item-body">
          {/* Params section */}
          <div className="condition-panel__section-label">Parameters</div>
          {cond.params.length === 0 && !isEditMode ? (
            <div className="condition-panel__empty-inline">None</div>
          ) : (
            <table className="condition-panel__params-table">
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
                          className="condition-panel__param-input"
                          value={p.name}
                          placeholder="name"
                          onChange={e => updateParam(i, 'name', e.target.value)}
                        />
                      ) : p.name}
                    </td>
                    <td>
                      {isEditMode ? (
                        <select
                          className="condition-panel__param-type-select"
                          value={p.type}
                          onChange={e => updateParam(i, 'type', e.target.value)}
                        >
                          <option value="">— select type —</option>
                          {OPENFGA_PARAM_TYPES.map(group => (
                            <optgroup key={group.group} label={group.group}>
                              {group.types.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      ) : p.type}
                    </td>
                    {isEditMode && (
                      <td>
                        <button
                          className="condition-panel__remove-param-btn"
                          onClick={() => removeParam(i)}
                          title="Remove parameter"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {isEditMode && (
            <button className="condition-panel__add-param-btn" onClick={addParam}>
              + Add param
            </button>
          )}

          {/* Expression section */}
          <div className="condition-panel__section-label">Expression</div>
          {isEditMode ? (
            <textarea
              className="condition-panel__expr-textarea"
              value={cond.expression}
              placeholder="CEL expression…"
              rows={3}
              onChange={e => onUpdate(cond.name, { expression: e.target.value })}
            />
          ) : (
            <pre className="condition-panel__expr-pre">{cond.expression || '(empty)'}</pre>
          )}
        </div>
      )}
    </li>
  )
}

export default function ConditionPanel({
  parsedModel,
  isEditMode,
  selectedConditionName,
  onAddCondition,
  onUpdateCondition,
  onDeleteCondition,
}) {
  const conditions = parsedModel?.conditions ?? []
  const [expandedItems, setExpandedItems] = useState(new Set())
  const itemRefs = useRef({})

  // Auto-expand and scroll to selectedConditionName
  useEffect(() => {
    if (!selectedConditionName) return
    setExpandedItems(prev => {
      if (prev.has(selectedConditionName)) return prev
      return new Set([...prev, selectedConditionName])
    })
    setTimeout(() => {
      itemRefs.current[selectedConditionName]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }, [selectedConditionName])

  function toggleItem(name) {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="condition-panel">
      <div className="condition-panel__header">
        <span className="condition-panel__title">Conditions</span>
        {isEditMode && (
          <button className="condition-panel__add-btn" onClick={onAddCondition}>
            + Add
          </button>
        )}
      </div>

      {conditions.length === 0 ? (
        <p className="condition-panel__empty">No conditions defined</p>
      ) : (
        <ul className="condition-panel__list">
          {conditions.map(cond => (
            <ConditionItem
              key={cond.name}
              cond={cond}
              isEditMode={isEditMode}
              isSelected={cond.name === selectedConditionName}
              isOpen={expandedItems.has(cond.name)}
              onToggle={() => toggleItem(cond.name)}
              onUpdate={onUpdateCondition}
              onDelete={onDeleteCondition}
              itemRef={el => { itemRefs.current[cond.name] = el }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

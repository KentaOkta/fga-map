import { useState, useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import { NODE_HEADER_HEIGHT, RELATION_ROW_HEIGHT } from '../utils/nodeLayout.js'
import { useEditMode } from './EditModeContext.js'
import './TypeNode.css'

export default function TypeNode({ data }) {
  const { label, isExpanded, relations = [], sourceRelations = [], orphanedRelations = [] } = data
  const { isEditMode, onRenameType, onRenameRelation, onDeleteType, onDeleteRelation } = useEditMode()

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef(null)
  const [binOverHeader, setBinOverHeader] = useState(false)
  const [binOverRelation, setBinOverRelation] = useState(null)
  const [editingRelation, setEditingRelation] = useState(null)
  const [editingRelValue, setEditingRelValue] = useState('')

  // Sync label if it changes from outside (e.g. undo / re-parse)
  useEffect(() => {
    if (!editing) setEditValue(label)
  }, [label, editing])

  // Cancel all editing if edit mode is turned off
  useEffect(() => {
    if (!isEditMode) {
      setEditing(false)
      setEditingRelation(null)
    }
  }, [isEditMode])

  function handleDoubleClick(e) {
    if (!isEditMode) return
    e.stopPropagation()
    setEditing(true)
    setEditValue(label)
  }

  function commit() {
    setEditing(false)
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== label) onRenameType?.(label, trimmed)
    else setEditValue(label)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') e.currentTarget.blur()
    else if (e.key === 'Escape') { setEditing(false); setEditValue(label) }
  }

  function startEditingRelation(relName, e) {
    e.stopPropagation()
    setEditingRelation(relName)
    setEditingRelValue(relName)
  }

  function commitRelation() {
    const old = editingRelation
    const trimmed = editingRelValue.trim()
    setEditingRelation(null)
    if (trimmed && trimmed !== old) onRenameRelation?.(label, old, trimmed)
  }

  function handleRelationKeyDown(e) {
    if (e.key === 'Enter') e.currentTarget.blur()
    else if (e.key === 'Escape') setEditingRelation(null)
  }

  function handleHeaderDragOver(e) {
    if (!e.dataTransfer.types.includes('application/fga-bin')) return
    e.preventDefault()
    e.stopPropagation()
    setBinOverHeader(true)
  }

  function handleHeaderDragLeave() {
    setBinOverHeader(false)
  }

  function handleHeaderDrop(e) {
    const isBin = e.dataTransfer.getData('application/fga-bin')
    if (!isBin) return
    e.preventDefault()
    e.stopPropagation()
    setBinOverHeader(false)
    onDeleteType?.(label)
  }

  function handleRelDragOver(e) {
    if (!e.dataTransfer.types.includes('application/fga-bin')) return
    e.preventDefault()
    e.stopPropagation()
  }

  function handleRelDrop(e, relName) {
    const isBin = e.dataTransfer.getData('application/fga-bin')
    if (!isBin) return
    e.preventDefault()
    e.stopPropagation()
    setBinOverRelation(null)
    onDeleteRelation?.(label, relName)
  }

  return (
    <div className={`type-node${isExpanded ? ' type-node--expanded' : ''}`}>
      <Handle
        type="source"
        position={Position.Right}
        style={isExpanded ? { top: NODE_HEADER_HEIGHT / 2 } : undefined}
      />
      {(!isExpanded || isEditMode) && (
        <Handle
          type="target"
          position={Position.Left}
          className={isExpanded && isEditMode ? 'type-node__header-target' : ''}
          style={isExpanded ? { top: NODE_HEADER_HEIGHT / 2 } : undefined}
          title={isExpanded && isEditMode ? 'Connect to add a new relation' : undefined}
        />
      )}

      <div
        className={`type-node__header${binOverHeader ? ' type-node__header--bin-over' : ''}`}
        onDoubleClick={handleDoubleClick}
        onDragOver={handleHeaderDragOver}
        onDragLeave={handleHeaderDragLeave}
        onDrop={handleHeaderDrop}
        title={isEditMode && !editing ? 'Double-click to rename' : undefined}
      >
        {editing ? (
          <input
            ref={inputRef}
            className="type-node__name-input nodrag"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="type-node__name">{label}</span>
        )}
        <span className="type-node__chevron" title={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && relations.length > 0 && (
        <div className="type-node__relations">
          {relations.map((r, i) => (
            <div
              key={r}
              className={`type-node__relation-row${binOverRelation === r ? ' type-node__relation-row--bin-over' : ''}`}
              onDragOver={handleRelDragOver}
              onDragEnter={() => setBinOverRelation(r)}
              onDragLeave={() => setBinOverRelation(null)}
              onDrop={(e) => handleRelDrop(e, r)}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={r}
                style={{
                  top: NODE_HEADER_HEIGHT + i * RELATION_ROW_HEIGHT + RELATION_ROW_HEIGHT / 2,
                }}
              />
              {(sourceRelations.includes(r) || isEditMode) && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={r}
                  style={{
                    top: NODE_HEADER_HEIGHT + i * RELATION_ROW_HEIGHT + RELATION_ROW_HEIGHT / 2,
                  }}
                />
              )}
              {editingRelation === r ? (
                <input
                  className="type-node__relation-input nodrag"
                  value={editingRelValue}
                  onChange={e => setEditingRelValue(e.target.value)}
                  onBlur={commitRelation}
                  onKeyDown={handleRelationKeyDown}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <>
                  <span className="type-node__relation-name">{r}</span>
                  {orphanedRelations.includes(r) && (
                    <span className="type-node__orphan-warning" title="A referenced type no longer exists">⚠</span>
                  )}
                  {isEditMode && (
                    <button
                      className="type-node__relation-edit-btn nodrag"
                      onClick={(e) => startEditingRelation(r, e)}
                      title="Rename relation"
                    >
                      <svg fill="currentColor" width="10" height="10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <g>
                              <path d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z"/>
                          </g>
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

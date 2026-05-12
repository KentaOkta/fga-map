import { useState } from 'react'
import { useEditMode } from './EditModeContext.js'
import './EditPanel.css'

export default function EditPanel({ onClose }) {
  const { onDeleteCondition } = useEditMode()
  const [conditionOver, setConditionOver] = useState(false)

  function onDragStart(e) {
    e.dataTransfer.setData('application/fga-new-type', 'true')
    e.dataTransfer.effectAllowed = 'move'
  }

  function onBinDragStart(e) {
    e.dataTransfer.setData('application/fga-bin', 'true')
    e.dataTransfer.effectAllowed = 'move'
    document.body.classList.add('bin-dragging')
  }

  function onBinDragEnd() {
    document.body.classList.remove('bin-dragging')
    setConditionOver(false)
  }

  function handleBinDragOver(e) {
    if (e.dataTransfer.types.includes('application/fga-condition')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setConditionOver(true)
    }
  }

  function handleBinDragLeave() {
    setConditionOver(false)
  }

  function handleBinDrop(e) {
    const condName = e.dataTransfer.getData('application/fga-condition')
    if (!condName) return
    e.preventDefault()
    setConditionOver(false)
    onDeleteCondition?.(condName)
  }

  return (
    <div className="edit-panel">
      <div className="edit-panel__section edit-panel__section--title">
        <span className="edit-panel__title">Edit Mode</span>
        <button className="edit-panel__close" onClick={onClose} title="Exit edit mode">✕</button>
      </div>

      <div className="edit-panel__divider" />

      <div className="edit-panel__section">
        <p className="edit-panel__hint">Drag to canvas to add a type</p>
        <div className="edit-panel__new-node" draggable onDragStart={onDragStart}>
          <span className="edit-panel__new-node-label">New Type</span>
          <span className="edit-panel__new-node-chevron">▶</span>
        </div>
      </div>

      <div className="edit-panel__divider" />

      <div className="edit-panel__section">
        <p className="edit-panel__hint">Drag from a node's right&nbsp;handle to another node or relation to add a connection</p>
      </div>

      <div className="edit-panel__divider" />

      <div className="edit-panel__section">
        <p className="edit-panel__hint">Drag bin to delete a type, relation, or connection. Drag a condition here to delete it.</p>
        <div
          className={`edit-panel__bin${conditionOver ? ' edit-panel__bin--condition-over' : ''}`}
          draggable
          onDragStart={onBinDragStart}
          onDragEnd={onBinDragEnd}
          onDragOver={handleBinDragOver}
          onDragLeave={handleBinDragLeave}
          onDrop={handleBinDrop}
          title="Drag to delete"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

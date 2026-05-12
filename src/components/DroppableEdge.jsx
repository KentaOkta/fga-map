import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import { useEditMode } from './EditModeContext.js'
import './DroppableEdge.css'

export default function DroppableEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data, label,
  markerEnd, style,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const { onDeleteRef } = useEditMode()
  const payload = data?.deletePayload

  function handleDragOver(e) {
    if (!e.dataTransfer.types.includes('application/fga-bin')) return
    if (!payload?.canDelete) return
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e) {
    const isBin = e.dataTransfer.getData('application/fga-bin')
    if (!isBin || !payload?.canDelete) return
    e.preventDefault()
    e.stopPropagation()
    onDeleteRef?.(payload.targetType, payload.relation, payload.refTypeName, payload.refRelationName)
  }

  const canDelete = payload?.canDelete ?? false

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className={`droppable-edge__zone nodrag nopan${canDelete ? ' droppable-edge__zone--deletable' : ''}${label ? ' droppable-edge__zone--labeled' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {label && <span className="droppable-edge__label">{label}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

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

  const { isEditMode, onDeleteRef, onAddRefCondition, onSelectCondition } = useEditMode()
  const payload = data?.deletePayload
  const conditionInfo = data?.conditionInfo
  const conditionPayload = data?.conditionPayload
  const symbol = conditionInfo?.symbol ?? null
  const conditionNames = conditionInfo?.conditionNames ?? []

  const isLabeledEdge = !!label

  function handleDragOver(e) {
    const hasBin = e.dataTransfer.types.includes('application/fga-bin')
    const hasCondition = e.dataTransfer.types.includes('application/fga-condition')

    if (hasBin && payload?.canDelete) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (hasCondition && isEditMode && conditionPayload) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleDrop(e) {
    const isBin = e.dataTransfer.getData('application/fga-bin')
    if (isBin && payload?.canDelete) {
      e.preventDefault()
      e.stopPropagation()
      onDeleteRef?.(payload.targetType, payload.relation, payload.refTypeName, payload.refRelationName)
      return
    }

    const condName = e.dataTransfer.getData('application/fga-condition')
    if (condName && conditionPayload) {
      e.preventDefault()
      e.stopPropagation()
      onAddRefCondition?.(
        conditionPayload.targetType,
        conditionPayload.relation,
        conditionPayload.refTypeName,
        conditionPayload.refRelationName,
        condName,
      )
    }
  }

  const canDelete = payload?.canDelete ?? false
  const hasConditions = !isLabeledEdge && conditionNames.length > 0
  const hasZoneContent = isLabeledEdge || hasConditions

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className={[
            'droppable-edge__zone nodrag nopan',
            canDelete ? 'droppable-edge__zone--deletable' : '',
            isLabeledEdge ? 'droppable-edge__zone--labeled' : '',
            hasConditions ? 'droppable-edge__zone--has-condition' : '',
          ].filter(Boolean).join(' ')}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isLabeledEdge && (
            <span className="droppable-edge__label">
              {label}
              {symbol && <span className="droppable-edge__condition-symbol">{symbol}</span>}
            </span>
          )}
          {hasConditions && conditionNames.map(cn => (
            <span
              key={cn}
              className="droppable-edge__condition-badge"
              onClick={() => onSelectCondition?.(cn)}
              title={`Condition: ${cn}`}
            >
              {cn}
            </span>
          ))}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

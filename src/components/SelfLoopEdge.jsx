import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react'
import { useEditMode } from './EditModeContext.js'

const LOOP_HEIGHT = 110
const LOOP_SPREAD = 80

export default function SelfLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  label,
  markerEnd,
  style,
}) {
  // Draw a cubic bezier that arcs above the node.
  // Source handle is on the right, target handle is on the left of the same node.
  const absDiffY= Math.max(2 * Math.abs(sourceY - targetY), LOOP_HEIGHT);
  const edgePath = [
    `M ${sourceX} ${sourceY}`,
    `C ${sourceX + LOOP_SPREAD} ${sourceY - LOOP_HEIGHT},`,
    `${targetX - LOOP_SPREAD} ${sourceY - absDiffY},`,
    `${targetX} ${targetY}`,
  ].join(' ')

  // Label at the peak of the arc (t=0.5 of the cubic bezier)
  const labelX = (sourceX + targetX) / 2
  const labelY = (sourceY + targetY) / 2 - LOOP_HEIGHT * 0.75

  const { isEditMode, onDeleteRef, onAddRefCondition, onSelectCondition } = useEditMode()
  const payload = data?.deletePayload
  const conditionInfo = data?.conditionInfo
  const conditionPayload = data?.conditionPayload
  const canDelete = payload?.canDelete ?? false
  const symbol = conditionInfo?.symbol ?? null
  const conditionNames = conditionInfo?.conditionNames ?? []

  const isLabeledEdge = !!label
  const hasConditions = !isLabeledEdge && conditionNames.length > 0

  function handleDragOver(e) {
    const hasBin = e.dataTransfer.types.includes('application/fga-bin')
    const hasCondition = e.dataTransfer.types.includes('application/fga-condition')

    if (hasBin && canDelete) {
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
    if (isBin && canDelete) {
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

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className={[
            'multi-label-edge__labels nodrag nopan',
            canDelete ? 'multi-label-edge__labels--deletable' : '',
            hasConditions ? 'multi-label-edge__labels--has-condition' : '',
          ].filter(Boolean).join(' ')}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isLabeledEdge && (
            <span className="multi-label-edge__pill">
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

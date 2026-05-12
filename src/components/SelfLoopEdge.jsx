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

  const { onDeleteRef } = useEditMode()
  const payload = data?.deletePayload
  const canDelete = payload?.canDelete ?? false

  function handleDragOver(e) {
    if (!e.dataTransfer.types.includes('application/fga-bin')) return
    if (!canDelete) return
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e) {
    const isBin = e.dataTransfer.getData('application/fga-bin')
    if (!isBin || !canDelete) return
    e.preventDefault()
    e.stopPropagation()
    onDeleteRef?.(payload.targetType, payload.relation, payload.refTypeName, payload.refRelationName)
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className={`multi-label-edge__labels nodrag nopan${canDelete ? ' multi-label-edge__labels--deletable' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {label && <span className="multi-label-edge__pill">{label}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

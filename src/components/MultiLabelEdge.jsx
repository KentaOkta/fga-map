import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'

export default function MultiLabelEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="multi-label-edge__labels nodrag nopan"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
        >
          {data.relations.map((r) => (
            <span key={r} className="multi-label-edge__pill">{r}</span>
          ))}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

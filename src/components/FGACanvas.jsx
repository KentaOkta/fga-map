import { useMemo, useEffect, useRef, useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import TypeNode from './TypeNode.jsx'
import SelfLoopEdge from './SelfLoopEdge.jsx'
import DroppableEdge from './DroppableEdge.jsx'
import IntraRefEdge from './IntraRefEdge.jsx'
import { EditModeContext } from './EditModeContext.js'
import { buildGraphData } from '../utils/graphBuilder.js'
import { applyDagreLayout } from '../utils/layoutEngine.js'
import Pencil from '/dist/assets/pencil.svg'
import Padlock from '/dist/assets/padlock.svg'
import './FGACanvas.css'

const nodeTypes = { typeNode: TypeNode }
const edgeTypes = { selfLoop: SelfLoopEdge, droppable: DroppableEdge, intraRef: IntraRefEdge }

function Canvas({ parsedModel, expandedNodes, onNodeClick, isEditMode, onToggleEditMode, resetKey, onDropType, onConnect, onRenameType, onRenameRelation, onDeleteType, onDeleteRelation, onDeleteRef, onAddRefCondition, onSelectCondition, onDeleteCondition }) {
  const { screenToFlowPosition } = useReactFlow()
  const pendingPositions = useRef(new Map())

  const { layoutedNodes, edges } = useMemo(() => {
    const { nodes: rawNodes, edges: rawEdges } = buildGraphData(parsedModel, expandedNodes)
    const layoutedNodes = applyDagreLayout(rawNodes, rawEdges)
    return { layoutedNodes, edges: rawEdges }
  }, [parsedModel, expandedNodes])

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const prevResetKeyRef = useRef(resetKey)

  useEffect(() => {
    const shouldReset = prevResetKeyRef.current !== resetKey
    prevResetKeyRef.current = resetKey

    if (shouldReset) {
      setNodes(layoutedNodes)
    } else {
      setNodes(current => {
        const posMap = new Map(current.map(n => [n.id, n.position]))
        return layoutedNodes.map(n => {
          if (pendingPositions.current.has(n.id)) {
            const pos = pendingPositions.current.get(n.id)
            pendingPositions.current.delete(n.id)
            return { ...n, position: pos }
          }
          return { ...n, position: posMap.get(n.id) ?? n.position }
        })
      })
    }
  }, [layoutedNodes, resetKey, setNodes])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (!e.dataTransfer.getData('application/fga-new-type')) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const name = onDropType(position)
    if (name) pendingPositions.current.set(name, position)
  }, [screenToFlowPosition, onDropType])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const emptyMsg = isEditMode
    ? 'Drop a "New Type" card from the Edit panel to get started'
    : 'No model loaded — paste a DSL and click "Parse model"'

  const contextValue = { isEditMode, onRenameType, onRenameRelation, onDeleteType, onDeleteRelation, onDeleteRef, onAddRefCondition, onSelectCondition, onDeleteCondition }

  if (!parsedModel || layoutedNodes.length === 0) {
    return (
      <EditModeContext.Provider value={contextValue}>
        <div
          className="fga-canvas fga-canvas--empty"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <p className="fga-canvas__empty-msg">{emptyMsg}</p>
        </div>
      </EditModeContext.Provider>
    )
  }

  return (
    <EditModeContext.Provider value={contextValue}>
      <div className="fga-canvas" onDrop={handleDrop} onDragOver={handleDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => onNodeClick(node.id)}
          onConnect={onConnect}
          nodesConnectable={isEditMode}
          connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={3}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
          <Controls>
            <ControlButton
              onClick={onToggleEditMode}
              title="Toggle edit mode"
              className={isEditMode ? 'fga-control-edit--active' : ''}
            >
              <img src={Pencil} alt="Edit Mode" />
            </ControlButton>
          </Controls>
          <MiniMap nodeColor="#6366f1" maskColor="rgba(0,0,0,0.05)" />
        </ReactFlow>
      </div>
    </EditModeContext.Provider>
  )
}

export default function FGACanvas(props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}

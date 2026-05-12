import { getNodeHeight, sourceHandleOffset } from './nodeLayout.js'

const EDGE_COLORS = [
  '#4cb7a3', // seafoam
  '#b49bfc', // lilac
  '#e27133', // tangerine
  '#D4A017', // cornflower blue
  '#e05675', // rose       
]

/**
 * Compute condition symbol and condition names for a specific (target, relationName, source, sourceRelation) slot.
 * @returns {{ symbol: '*'|'…'|null, conditionNames: string[] }}
 */
function computeConditionInfo(parsedModel, targetTypeName, relationName, sourceTypeName, sourceRelation) {
  const targetType = parsedModel.types.find(t => t.name === targetTypeName)
  if (!targetType) return { symbol: null, conditionNames: [] }
  const relation = targetType.relations.find(r => r.name === relationName)
  if (!relation) return { symbol: null, conditionNames: [] }

  // When sourceRelation is null (source node is collapsed), match ALL refs from
  // that source type — the edge represents every sourceRelation from that type.
  // When sourceRelation is set (source node is expanded), match only that specific ref.
  const matchingRefs = relation.refs.filter(
    r =>
      r.typeName === sourceTypeName &&
      (sourceRelation === null || (r.relationName ?? null) === sourceRelation)
  )

  const conditioned = matchingRefs.filter(r => r.conditionName != null)
  const plain = matchingRefs.filter(r => r.conditionName == null)

  let symbol = null
  if (conditioned.length > 0 && plain.length === 0) symbol = '*'
  else if (conditioned.length > 0 && plain.length > 0) symbol = '…'

  const conditionNames = [...new Set(conditioned.map(r => r.conditionName))]
  return { symbol, conditionNames }
}

/**
 * Aggregate condition info across multiple relation names for a collapsed edge.
 * @returns {{ symbol: '*'|'…'|null, conditionNames: string[] }}
 */
function computeCollapsedConditionInfo(parsedModel, targetTypeName, relNames, sourceTypeName, sourceRelation) {
  let totalConditioned = 0
  let totalPlain = 0

  for (const relName of relNames) {
    const info = computeConditionInfo(parsedModel, targetTypeName, relName, sourceTypeName, sourceRelation)
    totalConditioned += info.conditionNames.length
    // Count plain refs for this relation
    const targetType = parsedModel.types.find(t => t.name === targetTypeName)
    const relation = targetType?.relations.find(r => r.name === relName)
    if (relation) {
      const matchingPlain = relation.refs.filter(
        r =>
          r.typeName === sourceTypeName &&
          (sourceRelation === null || (r.relationName ?? null) === sourceRelation) &&
          r.conditionName == null
      )
      totalPlain += matchingPlain.length
    }
  }

  let symbol = null
  if (totalConditioned > 0 && totalPlain === 0) symbol = '*'
  else if (totalConditioned > 0 && totalPlain > 0) symbol = '…'

  return { symbol, conditionNames: [] }
}

/**
 * Build React Flow nodes and edges from a ParsedModel.
 *
 * @param {object} parsedModel - output of fgaParser.parse
 * @param {Set<string>} expandedNodes - set of type names that are expanded
 * @returns {{ nodes: object[], edges: object[] }}
 */
export function buildGraphData(parsedModel, expandedNodes) {
  if (!parsedModel || !parsedModel.types || parsedModel.types.length === 0) {
    return { nodes: [], edges: [] }
  }

  const knownTypes = new Set(parsedModel.types.map((t) => t.name))

  // Collect all candidate edges.
  // sourceRelation: the specific relation on the source type (e.g. 'assignee' from role#assignee)
  const candidates = []

  for (const type of parsedModel.types) {
    for (const relation of type.relations) {
      for (const ref of relation.refs) {
        if (!knownTypes.has(ref.typeName)) continue
        candidates.push({
          source: ref.typeName,
          sourceRelation: ref.relationName ?? null,
          target: type.name,
          relationName: relation.name,
        })
      }
    }
  }

  // For each type, collect which of its relation names have at least one incoming edge
  const typeRelations = new Map()
  for (const { target, relationName } of candidates) {
    if (!typeRelations.has(target)) typeRelations.set(target, new Set())
    typeRelations.get(target).add(relationName)
  }

  // For each type, collect which of its relations are referenced by others as a source
  const typeSourceRelations = new Map()
  for (const { source, sourceRelation } of candidates) {
    if (!sourceRelation) continue
    if (!typeSourceRelations.has(source)) typeSourceRelations.set(source, new Set())
    typeSourceRelations.get(source).add(sourceRelation)
  }

  // Assign a stable color to each type (used for expanded edges leaving that node)
  const sourceColorMap = new Map()
  parsedModel.types.forEach((type, i) => {
    sourceColorMap.set(type.name, EDGE_COLORS[i % EDGE_COLORS.length])
  })

  // Build nodes
  const nodes = parsedModel.types.map((type) => {
    const isExpanded = expandedNodes.has(type.name)
    const validRelations = new Set(typeRelations.get(type.name) ?? [])

    // Also show relations whose EVERY ref points to a deleted type (fully orphaned)
    const fullyOrphaned = type.relations
      .filter(rel =>
        rel.refs.length > 0 &&
        rel.refs.every(ref => !knownTypes.has(ref.typeName)) &&
        !validRelations.has(rel.name)
      )
      .map(rel => rel.name)

    const relations = [...validRelations, ...fullyOrphaned]

    // Detect which displayed relations have any ref pointing to a deleted type
    const orphanedRelations = relations.filter(relName => {
      const rel = type.relations.find(r => r.name === relName)
      return rel?.refs.some(ref => !knownTypes.has(ref.typeName))
    })

    return {
      id: type.name,
      type: 'typeNode',
      position: { x: 0, y: 0 },
      data: {
        label: type.name,
        isExpanded,
        relations,
        sourceRelations: [...(typeSourceRelations.get(type.name) ?? [])],
        orphanedRelations,
        nodeHeight: getNodeHeight(isExpanded, relations.length),
      },
    }
  })

  // Determine edges
  const edges = []

  // Helper: resolve which source handle to use for a candidate
  function srcHandle(source, sourceRelation) {
    return expandedNodes.has(source) && sourceRelation ? sourceRelation : null
  }

  // Helper: build colored edge style for expanded edges
  function edgeStyle(source) {
    const color = sourceColorMap.get(source) ?? '#94a3b8'
    return {
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', color },
    }
  }

  // Split candidates by whether the target is expanded
  const expandedCandidates = candidates.filter((c) => expandedNodes.has(c.target))
  const collapsedCandidates = candidates.filter((c) => !expandedNodes.has(c.target))

  // --- Expanded target edges: one per (sourceHandle, source, target, relation) ---
  const seenExpanded = new Set()
  for (const { source, sourceRelation, target, relationName } of expandedCandidates) {
    const sh = srcHandle(source, sourceRelation)
    const id = `expanded:${source}${sh ? `#${sh}` : ''}->${target}::${relationName}`
    if (seenExpanded.has(id)) continue
    seenExpanded.add(id)

    const conditionInfo = computeConditionInfo(parsedModel, target, relationName, source, sh)

    const isSelfLoop = source === target
    const edge = {
      id,
      source,
      target,
      targetHandle: relationName,
      type: isSelfLoop ? 'selfLoop' : 'droppable',
      animated: false,
      ...edgeStyle(source),
      data: {
        deletePayload: {
          canDelete: true,
          targetType: target,
          relation: relationName,
          refTypeName: source,
          refRelationName: sh || null,
        },
        conditionInfo,
        conditionPayload: {
          targetType: target,
          relation: relationName,
          refTypeName: source,
          refRelationName: sh || null,
        },
        ...(isSelfLoop && {
          sourceHandleOffset: sourceHandleOffset(
            sh,
            nodes.find(n => n.id === source)?.data?.relations,
          ),
        }),
      },
    }
    if (sh) edge.sourceHandle = sh
    edges.push(edge)
  }

  // --- Collapsed target edges: aggregate by (source, sourceHandle, target) ---
  const aggregated = new Map()
  for (const { source, sourceRelation, target, relationName } of collapsedCandidates) {
    const sh = srcHandle(source, sourceRelation)
    const key = `${source}${sh ? `#${sh}` : ''}->${target}`
    if (!aggregated.has(key)) aggregated.set(key, { source, sourceHandle: sh, target, relNames: new Set() })
    aggregated.get(key).relNames.add(relationName)
  }

  for (const [key, { source, sourceHandle: sh, target, relNames }] of aggregated.entries()) {
    const count = relNames.size
    const label = count === 1 ? [...relNames][0] : `${count} relations`
    const conditionInfo = computeCollapsedConditionInfo(parsedModel, target, [...relNames], source, sh)

    const isSelfLoopC = source === target
    const edge = {
      id: key,
      source,
      target,
      label,
      type: isSelfLoopC ? 'selfLoop' : 'droppable',
      animated: false,
      data: {
        deletePayload: {
          canDelete: count === 1,
          targetType: target,
          relation: count === 1 ? [...relNames][0] : null,
          refTypeName: source,
          refRelationName: sh || null,
        },
        conditionInfo,
        ...(isSelfLoopC && {
          sourceHandleOffset: sourceHandleOffset(
            sh,
            nodes.find(n => n.id === source)?.data?.relations,
          ),
        }),
      },
    }
    if (sh) edge.sourceHandle = sh
    edges.push(edge)
  }

  return { nodes, edges }
}

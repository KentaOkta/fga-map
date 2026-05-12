import { getNodeHeight, sourceHandleOffset } from './nodeLayout.js'

// ── Intra-type relation reference helpers ──────────────────────────────────────

const OPENFGA_KEYWORDS = new Set([
  'or', 'and', 'not', 'but', 'from', 'define', 'relations', 'type',
  'model', 'schema', 'condition', 'with', 'self',
])

/**
 * Extract bare relation-name references from a definition expression.
 * Strips all [...] bracket groups first, then collects identifier tokens
 * that exist in typeRelNames (ignoring OpenFGA keywords).
 *
 * Example: "[user] or triager or repo_reader from owner"
 *   → ['triager', 'repo_reader', 'owner']  (assuming all are in typeRelNames)
 */
function extractRelationRefs(definition, typeRelNames) {
  if (!definition) return []
  const expr = definition.replace(/\[([^\]]*)\]/g, '')
  const seen = new Set()
  const result = []
  for (const word of (expr.match(/\b[a-zA-Z_]\w*\b/g) ?? [])) {
    if (OPENFGA_KEYWORDS.has(word)) continue
    if (!typeRelNames.has(word)) continue
    if (seen.has(word)) continue
    seen.add(word)
    result.push(word)
  }
  return result
}

/**
 * Topologically sort relations so that referenced relations appear before those that reference them.
 * This ensures intra-type arrows always point downward.
 * Falls back gracefully for cycles (appends remaining nodes in original order).
 */
function topoSortRelations(relations, typeRelNamesSet) {
  const successors = new Map(relations.map(r => [r.name, []]))
  const inDegree = new Map(relations.map(r => [r.name, 0]))

  for (const rel of relations) {
    for (const dep of extractRelationRefs(rel.definition ?? '', typeRelNamesSet)) {
      if (dep === rel.name) continue
      successors.get(dep)?.push(rel.name)
      inDegree.set(rel.name, inDegree.get(rel.name) + 1)
    }
  }

  const queue = relations.filter(r => inDegree.get(r.name) === 0).map(r => r.name)
  const result = []
  while (queue.length > 0) {
    const node = queue.shift()
    result.push(node)
    for (const succ of successors.get(node)) {
      const deg = inDegree.get(succ) - 1
      inDegree.set(succ, deg)
      if (deg === 0) queue.push(succ)
    }
  }

  // Append any remaining nodes (cycles — shouldn't occur in valid FGA, handled gracefully)
  const seen = new Set(result)
  for (const rel of relations) {
    if (!seen.has(rel.name)) result.push(rel.name)
  }

  return result
}

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

    const typeRelNamesSet = new Set(type.relations.map(r => r.name))

    // When expanded, show ALL relations in topological order (deps first → arrows point down)
    // When collapsed, show only relations with cross-type edges
    const relations = isExpanded
      ? topoSortRelations(type.relations, typeRelNamesSet)
      : [...validRelations, ...fullyOrphaned]

    // Detect which displayed relations have any ref pointing to a deleted type
    const orphanedRelations = relations.filter(relName => {
      const rel = type.relations.find(r => r.name === relName)
      return rel?.refs.some(ref => !knownTypes.has(ref.typeName))
    })

    // Compute which relations are referenced by other relations on the same type (intra-type refs)
    const intraSourceRelations = isExpanded
      ? [...new Set(
          type.relations.flatMap(rel =>
            extractRelationRefs(rel.definition ?? '', typeRelNamesSet)
              .filter(refName => refName !== rel.name)
          )
        )]
      : []

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
        intraSourceRelations,
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

  // --- Intra-type relation reference edges (expanded nodes only) ---
  for (const type of parsedModel.types) {
    if (!expandedNodes.has(type.name)) continue
    const typeRelNamesSet = new Set(type.relations.map(r => r.name))
    for (const rel of type.relations) {
      const refNames = extractRelationRefs(rel.definition ?? '', typeRelNamesSet)
        .filter(refName => refName !== rel.name)
      for (const refName of refNames) {
        const relIdx = type.relations.findIndex(r => r.name === refName)
        const color = EDGE_COLORS[relIdx % EDGE_COLORS.length]
        edges.push({
          id: `intraref:${type.name}::${refName}->${rel.name}`,
          source: type.name,
          target: type.name,
          sourceHandle: refName,
          targetHandle: `intra:${rel.name}`,
          type: 'intraRef',
          animated: false,
          style: { stroke: color, strokeDasharray: '4 3', strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed', color },
          data: {},
        })
      }
    }
  }

  return { nodes, edges }
}

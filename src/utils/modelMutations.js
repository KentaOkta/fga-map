// ─── Definition string helpers ────────────────────────────────────────────────

/** Rebuild a definition string from a refs array (bracket form only). */
function refsToDefinitionString(refs) {
  if (!refs || refs.length === 0) return ''
  return '[' + refs.map(r => {
    let s = r.relationName ? `${r.typeName}#${r.relationName}` : r.typeName
    if (r.conditionName) s += ` with ${r.conditionName}`
    return s
  }).join(', ') + ']'
}

/** Extract refs from a definition expression (mirrors fgaParser bracket logic). */
function refsFromDefinition(expr) {
  const refs = []
  const bracketRegex = /\[([^\]]+)\]/g
  let m
  while ((m = bracketRegex.exec(expr)) !== null) {
    for (const entry of m[1].split(',')) {
      const rm = entry.trim().match(/^(\w+)(?:#(\w+))?(?:\s+with\s+(\w+))?$/)
      if (rm) refs.push({ typeName: rm[1], relationName: rm[2] || null, conditionName: rm[3] || null })
    }
  }
  return refs
}

/** Append refStr to the first [...] in definition, or create a new bracket. */
function appendRefToDefinition(definition, refStr) {
  const m = /\[([^\]]*)\]/.exec(definition)
  if (m) {
    const existing = m[1].trim()
    const joined = existing ? `${existing}, ${refStr}` : refStr
    return definition.slice(0, m.index) + `[${joined}]` + definition.slice(m.index + m[0].length)
  }
  return definition.trim() ? `${definition} or [${refStr}]` : `[${refStr}]`
}

/**
 * Remove all entries matching (refTypeName, refRelationName) from all [...] groups.
 * If a bracket becomes empty it is replaced with [] so the user can see and clean it up.
 */
function removeFromDefinition(definition, refTypeName, refRelationName) {
  return definition.replace(/\[([^\]]*)\]/g, (match, inner) => {
    const kept = inner.split(',').map(s => s.trim()).filter(entry => {
      const m = entry.match(/^(\w+)(?:#(\w+))?/)
      if (!m) return true
      return !(m[1] === refTypeName && (m[2] || null) === (refRelationName ?? null))
    })
    if (kept.length === inner.split(',').length) return match  // nothing removed
    return kept.length > 0 ? `[${kept.join(', ')}]` : '[]'
  })
}

/** Rename a type inside all [...] bracket entries of a definition. */
function renameTypeInDefinition(definition, oldName, newName) {
  return definition.replace(/\[([^\]]*)\]/g, (_, inner) => {
    const updated = inner.split(',').map(s => {
      const entry = s.trim()
      const m = entry.match(/^(\w+)((?:#\w+)?)((?:\s+with\s+\w+)?)$/)
      if (m && m[1] === oldName) return `${newName}${m[2]}${m[3]}`
      return entry
    }).join(', ')
    return `[${updated}]`
  })
}

/** Rename typeName#oldRelName → typeName#newRelName inside all [...] brackets. */
function renameSourceRelationInDefinition(definition, typeName, oldRelName, newRelName) {
  return definition.replace(/\[([^\]]*)\]/g, (_, inner) => {
    const updated = inner.split(',').map(s => {
      const entry = s.trim()
      const m = entry.match(/^(\w+)#(\w+)((?:\s+with\s+\w+)?)$/)
      if (m && m[1] === typeName && m[2] === oldRelName) return `${typeName}#${newRelName}${m[3]}`
      return entry
    }).join(', ')
    return `[${updated}]`
  })
}

/** Replace `with oldName` → `with newName` throughout a definition string. */
function renameConditionInDefinition(definition, oldName, newName) {
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return definition.replace(new RegExp(`\\bwith\\s+${escaped}\\b`, 'g'), `with ${newName}`)
}

/** Remove ` with condName` from a definition string. */
function removeConditionFromDefinition(definition, condName) {
  const escaped = condName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return definition.replace(new RegExp(`\\s+with\\s+${escaped}\\b`, 'g'), '')
}

// ─── Type mutations ────────────────────────────────────────────────────────────

/**
 * Return a unique type name not already present in the model.
 */
export function generateTypeName(existingTypes) {
  const names = new Set(existingTypes.map(t => t.name))
  let i = 1
  while (names.has(`type${i}`)) i++
  return `type${i}`
}

/**
 * Add a new empty type. No-op if the name already exists.
 */
export function addType(model, name) {
  const existing = model?.types ?? []
  if (existing.find(t => t.name === name)) return { ...model, types: existing }
  return { ...model, types: [...existing, { name, relations: [] }] }
}

/**
 * Add a connection from source (optionally via sourceRelation) to target.
 *
 * - If targetRelation is given: add the ref to that existing relation's refs list.
 * - If targetRelation is null:  create a new auto-named relation on the target type.
 *
 * Returns the original model unchanged if the ref already exists or target not found.
 * Also updates the relation's definition string to include the new ref.
 */
export function addConnection(model, { source, sourceRelation, target, targetRelation }) {
  const refStr = sourceRelation ? `${source}#${sourceRelation}` : source
  const newRef = { typeName: source, relationName: sourceRelation || null, conditionName: null }

  let changed = false

  const types = model.types.map(type => {
    if (type.name !== target) return type

    if (targetRelation) {
      const relations = type.relations.map(rel => {
        if (rel.name !== targetRelation) return rel
        const exists = rel.refs.some(
          r => r.typeName === newRef.typeName && r.relationName === newRef.relationName
        )
        if (exists) return rel
        changed = true
        const baseDef = rel.definition ?? refsToDefinitionString(rel.refs)
        return {
          ...rel,
          refs: [...rel.refs, newRef],
          definition: appendRefToDefinition(baseDef, refStr),
        }
      })
      return { ...type, relations }
    }

    // No targetRelation — create a new relation with an auto-generated name
    const relName = generateRelationName(type.relations)
    changed = true
    return {
      ...type,
      relations: [...type.relations, { name: relName, refs: [newRef], definition: `[${refStr}]` }],
    }
  })

  return changed ? { ...model, types } : model
}

/** Remove a type entirely. Refs to it in other types are left in place (shown as orphaned). */
export function deleteType(model, typeName) {
  return { ...model, types: model.types.filter(t => t.name !== typeName) }
}

/** Remove a specific relation from a type. */
export function deleteRelation(model, typeName, relationName) {
  const types = model.types.map(type => {
    if (type.name !== typeName) return type
    return { ...type, relations: type.relations.filter(r => r.name !== relationName) }
  })
  return { ...model, types }
}

/** Remove a single ref entry from one relation of a type. Also updates definition. */
export function deleteRef(model, typeName, relationName, refTypeName, refRelationName) {
  const types = model.types.map(type => {
    if (type.name !== typeName) return type
    const relations = type.relations.map(rel => {
      if (rel.name !== relationName) return rel
      const refs = rel.refs.filter(
        r => !(r.typeName === refTypeName && (r.relationName ?? null) === (refRelationName ?? null))
      )
      const baseDef = rel.definition ?? refsToDefinitionString(rel.refs)
      const definition = removeFromDefinition(baseDef, refTypeName, refRelationName ?? null)
      return { ...rel, refs, definition }
    })
    return { ...type, relations }
  })
  return { ...model, types }
}

/**
 * Rename a type throughout the model (type definition + all refs + all definitions).
 */
export function renameType(model, oldName, newName) {
  const types = model.types.map(type => {
    const updatedName = type.name === oldName ? newName : type.name
    const relations = type.relations.map(rel => ({
      ...rel,
      refs: rel.refs.map(ref =>
        ref.typeName === oldName ? { ...ref, typeName: newName } : ref
      ),
      definition: rel.definition != null
        ? renameTypeInDefinition(rel.definition, oldName, newName)
        : rel.definition,
    }))
    return { name: updatedName, relations }
  })
  return { ...model, types }
}

/**
 * Rename a relation on a specific type, and update any refs pointing to it.
 * No-op if newRelName already exists on that type.
 * Also updates definition strings in other types that reference typeName#oldRelName.
 */
export function renameRelation(model, typeName, oldRelName, newRelName) {
  const targetType = model.types.find(t => t.name === typeName)
  if (!targetType) return model
  if (targetType.relations.some(r => r.name === newRelName)) return model // duplicate

  const types = model.types.map(type => {
    // Rename the relation's name on the target type (definition content unchanged)
    if (type.name === typeName) {
      return {
        ...type,
        relations: type.relations.map(rel =>
          rel.name === oldRelName ? { ...rel, name: newRelName } : rel
        ),
      }
    }
    // Update refs and definitions in other types (typeName#oldRelName → typeName#newRelName)
    return {
      ...type,
      relations: type.relations.map(rel => ({
        ...rel,
        refs: rel.refs.map(ref =>
          ref.typeName === typeName && ref.relationName === oldRelName
            ? { ...ref, relationName: newRelName }
            : ref
        ),
        definition: rel.definition != null
          ? renameSourceRelationInDefinition(rel.definition, typeName, oldRelName, newRelName)
          : rel.definition,
      })),
    }
  })
  return { ...model, types }
}

// ─── Condition mutations ───────────────────────────────────────────────────────

/**
 * Return a unique condition name not already present.
 */
export function generateConditionName(existingConditions) {
  const names = new Set((existingConditions ?? []).map(c => c.name))
  let i = 1
  while (names.has(`condition${i}`)) i++
  return `condition${i}`
}

/**
 * Add a new condition. No-op if name already exists.
 */
export function addCondition(model, { name, params, expression }) {
  const conditions = model.conditions ?? []
  if (conditions.find(c => c.name === name)) return model
  return {
    ...model,
    conditions: [...conditions, { name, params: params ?? [], expression: expression ?? '' }],
  }
}

/**
 * Merge updates into the condition matching name.
 * If updates.name differs, also renames all refs and definition strings using the old condition name.
 */
export function updateCondition(model, name, updates) {
  const newName = updates.name ?? name
  const conditions = (model.conditions ?? []).map(c =>
    c.name === name ? { ...c, ...updates } : c
  )

  let types = model.types
  if (newName !== name) {
    types = model.types.map(type => ({
      ...type,
      relations: type.relations.map(rel => ({
        ...rel,
        refs: rel.refs.map(ref =>
          ref.conditionName === name ? { ...ref, conditionName: newName } : ref
        ),
        definition: rel.definition != null
          ? renameConditionInDefinition(rel.definition, name, newName)
          : rel.definition,
      })),
    }))
  }

  return { ...model, types, conditions }
}

/**
 * Delete a condition and null out conditionName on all refs using it.
 * Also removes `with condName` from all definition strings.
 */
export function deleteCondition(model, name) {
  const conditions = (model.conditions ?? []).filter(c => c.name !== name)
  const types = model.types.map(type => ({
    ...type,
    relations: type.relations.map(rel => ({
      ...rel,
      refs: rel.refs.map(ref =>
        ref.conditionName === name ? { ...ref, conditionName: null } : ref
      ),
      definition: rel.definition != null
        ? removeConditionFromDefinition(rel.definition, name)
        : rel.definition,
    })),
  }))
  return { ...model, types, conditions }
}

/**
 * Append a new conditioned ref to a relation. No-op if the exact ref already exists.
 * Also updates the definition string.
 */
export function addRefWithCondition(model, typeName, relationName, refTypeName, refRelationName, conditionName) {
  const newRef = {
    typeName: refTypeName,
    relationName: refRelationName || null,
    conditionName: conditionName || null,
  }
  const refStr = [
    refRelationName ? `${refTypeName}#${refRelationName}` : refTypeName,
    conditionName ? ` with ${conditionName}` : '',
  ].join('')

  let changed = false
  const types = model.types.map(type => {
    if (type.name !== typeName) return type
    const relations = type.relations.map(rel => {
      if (rel.name !== relationName) return rel
      const exists = rel.refs.some(
        r =>
          r.typeName === newRef.typeName &&
          (r.relationName ?? null) === (newRef.relationName ?? null) &&
          (r.conditionName ?? null) === (newRef.conditionName ?? null)
      )
      if (exists) return rel
      changed = true
      const baseDef = rel.definition ?? refsToDefinitionString(rel.refs)
      return {
        ...rel,
        refs: [...rel.refs, newRef],
        definition: appendRefToDefinition(baseDef, refStr),
      }
    })
    return { ...type, relations }
  })
  return changed ? { ...model, types } : model
}

/**
 * Update a relation's definition expression (typed directly by the user).
 * Re-derives refs from the new definition text.
 */
export function updateRelationDefinition(model, typeName, relName, newDefinition) {
  const newRefs = refsFromDefinition(newDefinition)
  const types = model.types.map(type => {
    if (type.name !== typeName) return type
    return {
      ...type,
      relations: type.relations.map(rel => {
        if (rel.name !== relName) return rel
        return { ...rel, definition: newDefinition, refs: newRefs }
      }),
    }
  })
  return { ...model, types }
}

function generateRelationName(existingRelations) {
  const names = new Set(existingRelations.map(r => r.name))
  let i = 1
  while (names.has(`relation${i}`)) i++
  return `relation${i}`
}

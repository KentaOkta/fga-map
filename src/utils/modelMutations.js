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
 */
export function addConnection(model, { source, sourceRelation, target, targetRelation }) {
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
        return { ...rel, refs: [...rel.refs, newRef] }
      })
      return { ...type, relations }
    }

    // No targetRelation — create a new relation with an auto-generated name
    const relName = generateRelationName(type.relations)
    changed = true
    return {
      ...type,
      relations: [...type.relations, { name: relName, refs: [newRef] }],
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

/** Remove a single ref entry from one relation of a type. */
export function deleteRef(model, typeName, relationName, refTypeName, refRelationName) {
  const types = model.types.map(type => {
    if (type.name !== typeName) return type
    const relations = type.relations.map(rel => {
      if (rel.name !== relationName) return rel
      const refs = rel.refs.filter(
        r => !(r.typeName === refTypeName && (r.relationName ?? null) === (refRelationName ?? null))
      )
      return { ...rel, refs }
    })
    return { ...type, relations }
  })
  return { ...model, types }
}

/**
 * Rename a type throughout the model (type definition + all refs).
 */
export function renameType(model, oldName, newName) {
  const types = model.types.map(type => {
    const updatedName = type.name === oldName ? newName : type.name
    const relations = type.relations.map(rel => ({
      ...rel,
      refs: rel.refs.map(ref =>
        ref.typeName === oldName ? { ...ref, typeName: newName } : ref
      ),
    }))
    return { name: updatedName, relations }
  })
  return { ...model, types }
}

/**
 * Rename a relation on a specific type, and update any refs pointing to it.
 * No-op if newRelName already exists on that type.
 */
export function renameRelation(model, typeName, oldRelName, newRelName) {
  const targetType = model.types.find(t => t.name === typeName)
  if (!targetType) return model
  if (targetType.relations.some(r => r.name === newRelName)) return model // duplicate

  const types = model.types.map(type => {
    // Rename the relation definition on the target type
    if (type.name === typeName) {
      return {
        ...type,
        relations: type.relations.map(rel =>
          rel.name === oldRelName ? { ...rel, name: newRelName } : rel
        ),
      }
    }
    // Update refs elsewhere that reference this relation (e.g. role#assignee)
    return {
      ...type,
      relations: type.relations.map(rel => ({
        ...rel,
        refs: rel.refs.map(ref =>
          ref.typeName === typeName && ref.relationName === oldRelName
            ? { ...ref, relationName: newRelName }
            : ref
        ),
      })),
    }
  })
  return { ...model, types }
}

// ─── Condition mutations ───────────────────────────────────────────────────

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
 * If updates.name differs, also renames all refs using the old condition name.
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
      })),
    }))
  }

  return { ...model, types, conditions }
}

/**
 * Delete a condition and null out conditionName on all refs using it.
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
    })),
  }))
  return { ...model, types, conditions }
}

/**
 * Append a new conditioned ref to a relation. No-op if the exact ref already exists.
 */
export function addRefWithCondition(model, typeName, relationName, refTypeName, refRelationName, conditionName) {
  const newRef = {
    typeName: refTypeName,
    relationName: refRelationName || null,
    conditionName: conditionName || null,
  }
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
      return { ...rel, refs: [...rel.refs, newRef] }
    })
    return { ...type, relations }
  })
  return changed ? { ...model, types } : model
}

function generateRelationName(existingRelations) {
  const names = new Set(existingRelations.map(r => r.name))
  let i = 1
  while (names.has(`relation${i}`)) i++
  return `relation${i}`
}

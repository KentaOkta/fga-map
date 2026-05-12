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
  if (existing.find(t => t.name === name)) return { types: existing }
  return { types: [...existing, { name, relations: [] }] }
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
  const newRef = { typeName: source, relationName: sourceRelation || null }

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

  return changed ? { types } : model
}

/** Remove a type entirely. Refs to it in other types are left in place (shown as orphaned). */
export function deleteType(model, typeName) {
  return { types: model.types.filter(t => t.name !== typeName) }
}

/** Remove a specific relation from a type. */
export function deleteRelation(model, typeName, relationName) {
  const types = model.types.map(type => {
    if (type.name !== typeName) return type
    return { ...type, relations: type.relations.filter(r => r.name !== relationName) }
  })
  return { types }
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
  return { types }
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
  return { types }
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
  return { types }
}

function generateRelationName(existingRelations) {
  const names = new Set(existingRelations.map(r => r.name))
  let i = 1
  while (names.has(`relation${i}`)) i++
  return `relation${i}`
}

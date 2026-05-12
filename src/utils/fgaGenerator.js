/**
 * Regenerate OpenFGA DSL text from a ParsedModel.
 */
export function generate(parsedModel) {
  if (!parsedModel?.types?.length) return ''

  const lines = ['model', '  schema 1.1', '']

  for (const type of parsedModel.types) {
    lines.push(`type ${type.name}`)
    if (type.relations.length > 0) {
      lines.push('  relations')
      for (const rel of type.relations) {
        const refs = rel.refs
          .map(r => {
            let s = r.relationName ? `${r.typeName}#${r.relationName}` : r.typeName
            if (r.conditionName) s += ` with ${r.conditionName}`
            return s
          })
          .join(', ')
        lines.push(`    define ${rel.name}: [${refs}]`)
      }
    }
    lines.push('')
  }

  // Emit condition blocks
  if (parsedModel.conditions?.length) {
    for (const cond of parsedModel.conditions) {
      const paramsStr = cond.params.map(p => `${p.name}: ${p.type}`).join(', ')
      lines.push(`condition ${cond.name}(${paramsStr}) {`)
      if (cond.expression) {
        for (const exprLine of cond.expression.split('\n')) {
          lines.push(`  ${exprLine}`)
        }
      }
      lines.push('}')
      lines.push('')
    }
  }

  return lines.join('\n').trimEnd()
}

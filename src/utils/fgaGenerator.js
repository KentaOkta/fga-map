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
          .map(r => (r.relationName ? `${r.typeName}#${r.relationName}` : r.typeName))
          .join(', ')
        lines.push(`    define ${rel.name}: [${refs}]`)
      }
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

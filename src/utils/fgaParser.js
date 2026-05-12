/**
 * Parse an OpenFGA DSL text into a ParsedModel.
 *
 * ParsedModel shape:
 * {
 *   types: [
 *     {
 *       name: string,
 *       relations: [
 *         { name: string, refs: [{ typeName: string, relationName: string|null, conditionName: string|null }] }
 *       ]
 *     }
 *   ],
 *   conditions: [
 *     { name: string, params: [{name: string, type: string}], expression: string }
 *   ]
 * }
 */
export function parse(dslText) {
  const types = []
  const conditions = []
  let currentType = null

  // Condition body tracking
  let inConditionBody = false
  let currentCondition = null
  let conditionBodyLines = []
  let conditionBraceDepth = 0

  const lines = (dslText || '').split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Always process condition body lines (preserve blank lines in expression)
    if (inConditionBody) {
      for (const ch of rawLine) {
        if (ch === '{') conditionBraceDepth++
        else if (ch === '}') conditionBraceDepth--
      }
      if (conditionBraceDepth <= 0) {
        currentCondition.expression = conditionBodyLines.join('\n').trim()
        conditions.push(currentCondition)
        currentCondition = null
        inConditionBody = false
        conditionBodyLines = []
      } else {
        conditionBodyLines.push(rawLine.trimEnd())
      }
      continue
    }

    if (!line || line.startsWith('#')) continue

    // "condition <name>(<params>) {" — start a condition block
    const conditionStart = line.match(/^condition\s+(\w+)\s*\(([^)]*)\)\s*\{/)
    if (conditionStart) {
      const paramsStr = conditionStart[2].trim()
      const params = paramsStr
        ? paramsStr.split(',').map(p => {
            const parts = p.trim().split(':')
            return { name: parts[0].trim(), type: (parts[1] ?? '').trim() }
          })
        : []
      currentCondition = { name: conditionStart[1], params, expression: '' }
      inConditionBody = true
      conditionBodyLines = []
      conditionBraceDepth = 1 // opening { already consumed
      continue
    }

    // "type <name>" — start a new type block
    const typeMatch = line.match(/^type\s+(\w+)/)
    if (typeMatch) {
      currentType = { name: typeMatch[1], relations: [] }
      types.push(currentType)
      continue
    }

    // "define <rel>: <expr>" — parse refs from bracket groups
    const defineMatch = line.match(/^define\s+(\w+)\s*[:|](.*)/)
    if (defineMatch && currentType) {
      const relName = defineMatch[1]
      const expr = defineMatch[2]
      const refs = []

      // Extract all [...] groups
      const bracketRegex = /\[([^\]]+)\]/g
      let bracketMatch
      while ((bracketMatch = bracketRegex.exec(expr)) !== null) {
        const inner = bracketMatch[1]
        // Each entry is like "user", "group#member", or "user with condition_name"
        for (const entry of inner.split(',')) {
          const refMatch = entry.trim().match(/^(\w+)(?:#(\w+))?(?:\s+with\s+(\w+))?$/)
          if (refMatch) {
            refs.push({
              typeName: refMatch[1],
              relationName: refMatch[2] || null,
              conditionName: refMatch[3] || null,
            })
          }
        }
      }

      currentType.relations.push({ name: relName, refs, definition: expr.trim() })
      continue
    }

    // "relations" keyword — ignore, just a section marker
    // "model" / "schema" / version lines — ignore
  }

  return { types, conditions }
}

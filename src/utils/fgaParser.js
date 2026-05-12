/**
 * Parse an OpenFGA DSL text into a ParsedModel.
 *
 * ParsedModel shape:
 * {
 *   types: [
 *     {
 *       name: string,
 *       relations: [
 *         { name: string, refs: [{ typeName: string, relationName: string|null }] }
 *       ]
 *     }
 *   ]
 * }
 */
export function parse(dslText) {
  const types = []
  let currentType = null

  const lines = (dslText || '').split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) continue

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
        // Each entry is like "user" or "group#member"
        for (const entry of inner.split(',')) {
          const refMatch = entry.trim().match(/^(\w+)(?:#(\w+))?$/)
          if (refMatch) {
            refs.push({
              typeName: refMatch[1],
              relationName: refMatch[2] || null,
            })
          }
        }
      }

      currentType.relations.push({ name: relName, refs })
      continue
    }

    // "relations" keyword — ignore, just a section marker
    // "model" / "schema" / version lines — ignore
  }

  return { types }
}

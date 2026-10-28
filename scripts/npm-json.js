import assert from 'node:assert/strict'

// npm 11 emits an array; npm 12 keys pack results by package name.
export function packResult(value) {
  const entries = Array.isArray(value) ? value : Object.values(value ?? {})
  assert.equal(entries.length, 1, 'Expected one npm pack result')
  const result = entries[0]
  assert.ok(
    result &&
      typeof result.name === 'string' &&
      typeof result.filename === 'string' &&
      Array.isArray(result.files),
    'Unexpected npm pack JSON output'
  )
  return result
}

// npm 12 wraps even single `npm view FIELD --json` results in an array.
export function viewResult(value) {
  if (!Array.isArray(value)) return value
  assert.equal(value.length, 1, 'Expected one npm view result')
  return value[0]
}

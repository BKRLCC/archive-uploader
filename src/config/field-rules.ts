import { deriveWKTFromRawCoordinates } from '../helpers/geometry-utils'

// Declarative registry of automatic per-field values applied when rows are
// written, so defaults/invariants/derivations live in one place instead of
// being duplicated across editors and IPC handlers.
//
// `when` scopes a rule: 'create' fills a value only on new rows; 'always' also
// re-enforces it on edit (an invariant). `derive` returns the value to write,
// or null to leave the cell untouched. A rule only fires when its column is
// present in the sheet, so each rule is naturally self-scoping.
export type FieldRulePhase = 'create' | 'update'

export interface FieldRule {
  field: string
  when: 'create' | 'always'
  derive: (current: string, get: (field: string) => string) => string | null
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const blankToConstant =
  (value: string) =>
  (current: string): string | null =>
    current.trim() ? null : value

export const FIELD_RULES: FieldRule[] = [
  {
    field: 'dateAdded',
    when: 'create',
    derive: (current) => (current.trim() ? null : todayIso()),
  },
  {
    field: 'isPublishable',
    when: 'create',
    derive: blankToConstant('FALSE'),
  },
  // pcdm:memberOf must always name the collection root ("./"); blank cells on
  // existing rows self-heal on the next save.
  {
    field: 'isRef_pcdm:memberOf',
    when: 'always',
    derive: blankToConstant('./'),
  },
  {
    field: 'asWKT',
    when: 'always',
    derive: (_current, get) => {
      if (get('@type').trim() !== 'Geometry') return null
      const latitude = get('.latitude')
      const longitude = get('.longitude')
      if (!latitude.trim() || !longitude.trim()) return null
      return deriveWKTFromRawCoordinates(latitude, longitude)
    },
  },
]

// Applies the field rules in place to a single sheet row. `phase` 'create' runs
// every rule; 'update' runs only invariant ('always') rules.
export function applyFieldRules(
  headers: string[],
  row: string[],
  phase: FieldRulePhase,
): void {
  const indexOf = (field: string): number => headers.indexOf(field)
  const get = (field: string): string => {
    const index = indexOf(field)
    return index >= 0 ? String(row[index] ?? '') : ''
  }
  for (const rule of FIELD_RULES) {
    if (phase === 'update' && rule.when !== 'always') continue
    const index = indexOf(rule.field)
    if (index < 0) continue
    const next = rule.derive(String(row[index] ?? ''), get)
    if (next !== null) row[index] = next
  }
}

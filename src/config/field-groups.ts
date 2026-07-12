// Groups edit-form fields into collapsible accordion sections.
//
// Each field is routed to the first group whose `fields` list (or `matchPrefix`)
// matches it; anything unmatched falls into the catch-all group (the group with
// neither `fields` nor `matchPrefix`). Groups render in the order defined here,
// and empty groups are dropped so a form only shows sections it has fields for.

import { TAG_FIELD_PREFIX } from './field-vocabularies'

export interface FieldGroupDef {
  id: string
  label: string
  fields?: string[]
  matchPrefix?: string
  defaultOpen?: boolean
}

export const FIELD_GROUPS: FieldGroupDef[] = [
  {
    id: 'details',
    label: 'Details',
    defaultOpen: true,
  },
  {
    id: 'people',
    label: 'People',
    fields: ['isRef_creator', 'isRef_contributor', 'isRef_mentions'],
    defaultOpen: false,
  },
  {
    id: 'locations',
    label: 'Locations',
    fields: ['isRef_contentLocation', 'isRef_locationCreated'],
  },
  {
    id: 'tags',
    label: 'Tags',
    matchPrefix: TAG_FIELD_PREFIX,
    defaultOpen: false,
  },
]

function normalize(fieldName: string): string {
  return String(fieldName ?? '')
    .trim()
    .toLowerCase()
}

export function groupRenderedFields(
  orderedFields: string[],
): Array<{ def: FieldGroupDef; fields: string[] }> {
  const catchAll = FIELD_GROUPS.find(
    (group) => !group.fields && !group.matchPrefix,
  )
  const buckets = new Map<string, string[]>(
    FIELD_GROUPS.map((group) => [group.id, []]),
  )

  for (const field of orderedFields) {
    const normalized = normalize(field)
    let target: FieldGroupDef | undefined = catchAll
    for (const group of FIELD_GROUPS) {
      if (group.fields?.some((name) => normalize(name) === normalized)) {
        target = group
        break
      }
      if (
        group.matchPrefix &&
        normalized.startsWith(normalize(group.matchPrefix))
      ) {
        target = group
        break
      }
    }
    if (target) buckets.get(target.id)?.push(field)
  }

  return FIELD_GROUPS.map((def) => ({
    def,
    fields: buckets.get(def.id) ?? [],
  })).filter((group) => group.fields.length > 0)
}

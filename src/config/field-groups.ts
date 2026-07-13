// Groups edit-form fields into collapsible accordion sections.
//
// A field is shown only if it is named in a group's `fields` list or matches a
// group's `matchPrefix` (allowlist). Fields not matched by any group are hidden
// from the edit form. Within a `fields` group, fields render in the config
// order (not the source order); `matchPrefix` groups keep the source order.
// Groups render in the order defined here, and empty groups are dropped.

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
    fields: [
      'name',
      'description',
      'dateCreated',
      'isRef_hasPart',
      'latitude',
      'longitude',
      'languageCode',
      'isRef_inLanguage',
      'url',
      'isRef_enteredBy',
    ],
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
  {
    id: 'physical',
    label: 'Physical object',
    fields: ['width', 'height', 'depth', 'material'],
    defaultOpen: false,
  },
  {
    id: 'external',
    label: 'External record',
    fields: ['isRef_holdingOrganisation', 'sameAs', 'identifier'],
    defaultOpen: false,
  },
  {
    id: 'metadata',
    label: 'System metadata',
    fields: ['dateAdded', '@id', '@type'],
    defaultOpen: false,
  },
  {
    id: 'publishing',
    label: 'Publishing',
    fields: ['isPublishable'],
    defaultOpen: true,
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
  // Map normalized name -> the original field name, and track which fields are
  // still unclaimed. First group to claim a field wins.
  const remaining = new Map<string, string>()
  for (const field of orderedFields) {
    const normalized = normalize(field)
    if (!remaining.has(normalized)) remaining.set(normalized, field)
  }

  return FIELD_GROUPS.map((def) => {
    const fields: string[] = []

    if (def.fields) {
      // Render in config order; include only fields present in the input.
      for (const name of def.fields) {
        const normalized = normalize(name)
        const original = remaining.get(normalized)
        if (original !== undefined) {
          fields.push(original)
          remaining.delete(normalized)
        }
      }
    } else if (def.matchPrefix) {
      // Keep source order for prefix-matched fields (e.g. tags).
      const prefix = normalize(def.matchPrefix)
      for (const field of orderedFields) {
        const normalized = normalize(field)
        if (remaining.has(normalized) && normalized.startsWith(prefix)) {
          fields.push(field)
          remaining.delete(normalized)
        }
      }
    }

    return { def, fields }
  }).filter((group) => group.fields.length > 0)
}

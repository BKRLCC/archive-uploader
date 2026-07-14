import { TAG_FIELD_PREFIX } from './field-vocabularies'
import type { EditableEntityType } from '../types/types'

// Groups edit-form fields into collapsible accordion sections.
//
// A field is shown only if it is named in a group's `fields` list or matches a
// group's `matchPrefix` (allowlist). Fields not matched by any group are hidden
// from the edit form. Within a `fields` group, fields render in the config
// order (not the source order); `matchPrefix` groups keep the source order.
// Groups render in the order defined here, and empty groups are dropped.
export interface FieldGroupDef {
  id: string
  label: string
  fields?: string[]
  matchPrefix?: string
  defaultOpen?: boolean
}

const detailsGroup: FieldGroupDef = {
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
}

const peopleGroup: FieldGroupDef = {
  id: 'people',
  label: 'People',
  fields: ['isRef_creator', 'isRef_contributor', 'isRef_mentions'],
  defaultOpen: false,
}

const locationsGroup: FieldGroupDef = {
  id: 'locations',
  label: 'Locations',
  fields: ['isRef_contentLocation', 'isRef_locationCreated'],
  defaultOpen: false,
}

const tagsGroup: FieldGroupDef = {
  id: 'tags',
  label: 'Tags',
  matchPrefix: TAG_FIELD_PREFIX,
  defaultOpen: false,
}

const physicalGroup: FieldGroupDef = {
  id: 'physical',
  label: 'Physical object',
  fields: ['width', 'height', 'depth', 'material'],
  defaultOpen: false,
}

const externalGroup: FieldGroupDef = {
  id: 'external',
  label: 'External record',
  fields: ['sameAs', 'isRef_holdingOrganisation', 'identifier', 'provenance'],
  defaultOpen: false,
}

const metadataGroup: FieldGroupDef = {
  id: 'metadata',
  label: 'System metadata',
  fields: ['@id', '@type', 'dateAdded'],
  defaultOpen: false,
}

const publishingGroup: FieldGroupDef = {
  id: 'publishing',
  label: 'Publishing',
  fields: ['isPublishable'],
  defaultOpen: true,
}

export const FIELD_GROUPS: FieldGroupDef[] = [
  detailsGroup,
  peopleGroup,
  locationsGroup,
  tagsGroup,
  physicalGroup,
  externalGroup,
  metadataGroup,
  publishingGroup,
]

// Per-type overrides for the group order (and per-group props like
// defaultOpen). A type listed here uses its own ordered array instead of the
// base FIELD_GROUPS; build it by spreading/filtering the base groups so it
// stays in sync when those change. Licences identify themselves by @id, so the
// System metadata group is hoisted to the top and opened by default.
const FIELD_GROUP_OVERRIDES: Partial<
  Record<EditableEntityType, FieldGroupDef[]>
> = {
  'ldac:DataReuseLicense': [
    { ...metadataGroup, defaultOpen: true },
    ...FIELD_GROUPS.filter((group) => group.id !== 'metadata'),
  ],
}

function getFieldGroups(
  entityType?: EditableEntityType | null,
): FieldGroupDef[] {
  if (entityType && FIELD_GROUP_OVERRIDES[entityType]) {
    return FIELD_GROUP_OVERRIDES[entityType]
  }
  return FIELD_GROUPS
}

function normalize(fieldName: string): string {
  return String(fieldName ?? '')
    .trim()
    .toLowerCase()
}

export function groupRenderedFields(
  orderedFields: string[],
  entityType?: EditableEntityType | null,
): Array<{ def: FieldGroupDef; fields: string[] }> {
  // Map normalized name -> the original field name, and track which fields are
  // still unclaimed. First group to claim a field wins.
  const remaining = new Map<string, string>()
  for (const field of orderedFields) {
    const normalized = normalize(field)
    if (!remaining.has(normalized)) remaining.set(normalized, field)
  }

  return getFieldGroups(entityType)
    .map((def) => {
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
    })
    .filter((group) => group.fields.length > 0)
}

import { TAG_FIELD_PREFIX } from './field-vocabularies'

type WrapMode = 'nowrap' | 'clamp-2'

export interface TableColumnLayout {
  widthClassName: string | null
  wrapMode: WrapMode
}

export const HIDDEN_TABLE_COLUMNS = ['@id', '@type', 'asWKT'] as const

const DEFAULT_LAYOUT: TableColumnLayout = {
  widthClassName: null,
  wrapMode: 'nowrap',
}

const HEADER_LAYOUTS: Record<string, TableColumnLayout> = {
  name: { widthClassName: 'col-width-name', wrapMode: 'clamp-2' },
  description: {
    widthClassName: 'col-width-description',
    wrapMode: 'clamp-2',
  },
  datecreated: { widthClassName: 'col-width-date', wrapMode: 'nowrap' },
  dateadded: { widthClassName: 'col-width-date', wrapMode: 'nowrap' },
  ispublishable: { widthClassName: 'col-width-xs', wrapMode: 'nowrap' },
  depiction: { widthClassName: 'col-width-depiction', wrapMode: 'clamp-2' },
  isref_haspart: { widthClassName: 'col-width-files', wrapMode: 'clamp-2' },
  isref_creator: {
    widthClassName: 'col-width-people',
    wrapMode: 'clamp-2',
  },
  isref_enteredby: {
    widthClassName: 'col-width-people',
    wrapMode: 'clamp-2',
  },
  isref_contributor: {
    widthClassName: 'col-width-people',
    wrapMode: 'clamp-2',
  },
  isref_inlanguage: {
    widthClassName: 'col-width-language',
    wrapMode: 'clamp-2',
  },
  isRef_mentions: {
    widthClassName: 'col-width-medium',
    wrapMode: 'clamp-2',
  },
  isref_contentlocation: {
    widthClassName: 'col-width-medium',
    wrapMode: 'clamp-2',
  },
  isref_locationcreated: {
    widthClassName: 'col-width-medium',
    wrapMode: 'clamp-2',
  },
  isref_location: {
    widthClassName: 'col-width-medium',
    wrapMode: 'clamp-2',
  },
}

function normalizeHeaderName(headerName: string): string {
  return String(headerName ?? '')
    .trim()
    .toLowerCase()
}

const HIDDEN_TABLE_COLUMN_SET = new Set(
  HIDDEN_TABLE_COLUMNS.map((headerName) => normalizeHeaderName(headerName)),
)

export function isHiddenTableColumn(headerName: string): boolean {
  return HIDDEN_TABLE_COLUMN_SET.has(normalizeHeaderName(headerName))
}

export function getTableColumnLayout(headerName: string): TableColumnLayout {
  const normalized = normalizeHeaderName(headerName)
  if (!normalized) return DEFAULT_LAYOUT

  if (normalized.startsWith(TAG_FIELD_PREFIX.toLowerCase())) {
    return { widthClassName: 'col-width-tag', wrapMode: 'clamp-2' }
  }

  return HEADER_LAYOUTS[normalized] ?? DEFAULT_LAYOUT
}

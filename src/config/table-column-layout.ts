import { TAG_FIELD_PREFIX } from './field-vocabularies'

type WrapMode = 'nowrap' | 'clamp-2'

export interface TableColumnLayout {
  widthClassName: string | null
  wrapMode: WrapMode
}

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
  depiction: { widthClassName: 'col-width-depiction', wrapMode: 'clamp-2' },
  isref_haspart: { widthClassName: 'col-width-files', wrapMode: 'clamp-2' },
  isref_creator: {
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
  isref_mentions: {
    widthClassName: 'col-width-medium',
    wrapMode: 'clamp-2',
  },
}

function normalizeHeaderName(headerName: string): string {
  return String(headerName ?? '')
    .trim()
    .toLowerCase()
}

export function getTableColumnLayout(headerName: string): TableColumnLayout {
  const normalized = normalizeHeaderName(headerName)
  if (!normalized) return DEFAULT_LAYOUT

  if (normalized.startsWith(TAG_FIELD_PREFIX.toLowerCase())) {
    return { widthClassName: 'col-width-tag', wrapMode: 'clamp-2' }
  }

  return HEADER_LAYOUTS[normalized] ?? DEFAULT_LAYOUT
}

import { DataTypeLabels } from '../config/datatype-labels'

export type ItemDataType =
  | 'Person'
  | 'RepositoryObject'
  | 'Language'
  | 'Dataset'
  | 'RepositoryCollection'
  | 'ldac:DataReuseLicense'
  | 'Place'
  | 'Geometry'
  | 'File'

export type CombinedType = 'People' | 'Places'

export type LabelDataType = ItemDataType | CombinedType

export type BaseItem = {
  '@id': string
  '@type': ItemDataType
  name: string
  description?: string
  dateAdded?: string
  // Relative path to an identifying image under the archive folder (future LD mapping: foaf:depiction).
  depiction?: string
}

export type DefinedTermType = 'DefinedTerm'

export type Tag = {
  '@id': string
  '@type': DefinedTermType
  name: string
  description?: string
  depiction?: string
}

const defineEntityFields =
  <T extends object>() =>
  <K extends keyof T>(fields: readonly K[]) =>
    fields

// People
// https://www.ldaca.edu.au/resources/user-guides/crate-o/convert-spreadsheet/#people
export type Person = BaseItem & {
  gender?: string
  birthDate?: string
}

// Language
export type Language = BaseItem & {}

// https://www.ldaca.edu.au/resources/user-guides/crate-o/convert-spreadsheet/#objects
export type RepositoryObject = BaseItem & {
  dateCreated?: string
  isPublishable?: boolean
  isRef_inLanguage?: string
  isRef_creator?: string
  isRef_contributor?: string
  isRef_hasPart?: string
  /**
   * People referenced or depicted in this resource (schema:mentions)
   */
  isRef_mentions?: string
}

export type License = BaseItem & {
  'ldac:allowTextIndex': boolean // Determines whether the collection text can be indexed for search purposes. Requires a Boolean value (TRUE or FALSE).
  isRef_sameAs?: string
  isRef_isPartOf?: string
}

export type Place = BaseItem & {
  isRef_geo?: string // The @id of the location to which this object relates from the Localities tab.
}

export type Geometry = {
  '@id': string
  '@type': 'Geometry'
  '.latitude': string // Latitude in decimal degrees (WGS84)
  '.longitude': string // Longitude in decimal degrees (WGS84)
  asWKT: string // Geometry in WKT format
}

// @id	@type	@type	.folder	.filename	isRef_isPartOf	isRef_ldac:annotationOf	isRef_csvw:tableSchema
export type File = {
  '@id': string
  '@type': 'File'
  '.folder': string // Relative path to the folder containing the file, e.g. "images"
  '.filename': string // Filename with extension, e.g. "photo.jpg"
  isRef_isPartOf?: string
}

// Maps each ItemDataType string to its TypeScript type, used to constrain TypeColumns.
type ItemTypeMap = {
  Person: Person
  RepositoryObject: RepositoryObject
  Language: Language
  Dataset: BaseItem
  RepositoryCollection: BaseItem
  'ldac:DataReuseLicense': License
  Place: Place
  Geometry: Geometry
  File: File
}

type EditableEntityTypeMap = ItemTypeMap & {
  DefinedTerm: Tag
}

export type EditableEntityType = keyof EditableEntityTypeMap

export const ENTITY_FIELD_REGISTRY: {
  [K in EditableEntityType]: readonly (keyof EditableEntityTypeMap[K])[]
} = {
  Person: defineEntityFields<Person>()([
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
    'gender',
    'birthDate',
  ]),
  RepositoryObject: defineEntityFields<RepositoryObject>()([
    '@id',
    '@type',
    'name',
    'description',
    'dateCreated',
    'dateAdded',
    'isPublishable',
    'depiction',
    'isRef_inLanguage',
    'isRef_creator',
    'isRef_contributor',
    'isRef_hasPart',
    'isRef_mentions',
  ]),
  Language: defineEntityFields<BaseItem>()([
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
  ]),
  Dataset: defineEntityFields<BaseItem>()([
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
  ]),
  RepositoryCollection: defineEntityFields<BaseItem>()([
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
  ]),
  'ldac:DataReuseLicense': defineEntityFields<License>()([
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
    'ldac:allowTextIndex',
    'isRef_sameAs',
    'isRef_isPartOf',
  ]),
  Place: defineEntityFields<Place>()([
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
    'isRef_geo',
  ]),
  Geometry: defineEntityFields<Geometry>()([
    '@id',
    '@type',
    '.latitude',
    '.longitude',
    'asWKT',
  ]),
  File: defineEntityFields<File>()([
    '@id',
    '@type',
    '.folder',
    '.filename',
    'isRef_isPartOf',
  ]),
  DefinedTerm: defineEntityFields<Tag>()([
    '@id',
    '@type',
    'name',
    'description',
    'depiction',
  ]),
}

const hasEntityFieldModel = (
  entityType: string,
): entityType is EditableEntityType => {
  return Object.prototype.hasOwnProperty.call(ENTITY_FIELD_REGISTRY, entityType)
}

export function resolveEditableEntityType(
  rawType: string,
): EditableEntityType | null {
  const cleaned = String(rawType ?? '').trim()
  if (!cleaned) return null

  const candidates =
    cleaned.startsWith('[') && cleaned.endsWith(']')
      ? cleaned
          .slice(1, -1)
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
      : [cleaned]

  for (const candidate of candidates) {
    if (hasEntityFieldModel(candidate)) return candidate
  }

  return null
}

export function getEntityFieldModel(entityType: EditableEntityType): string[] {
  return ENTITY_FIELD_REGISTRY[entityType].map((field) => String(field))
}

// Runtime column definitions — each entry is constrained to the keys of the corresponding type.
export const TypeColumns: { [K in ItemDataType]: (keyof ItemTypeMap[K])[] } = {
  Person: [
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
    'gender',
    'birthDate',
  ],
  RepositoryObject: [
    '@id',
    '@type',
    'name',
    'description',
    'dateCreated',
    'dateAdded',
    'isPublishable',
    'depiction',
    'isRef_inLanguage',
    'isRef_creator',
    'isRef_contributor',
    'isRef_hasPart',
    'isRef_mentions',
  ],
  Language: ['@id', '@type', 'name', 'description', 'dateAdded', 'depiction'],
  Dataset: ['@id', '@type', 'name', 'description', 'dateAdded', 'depiction'],
  RepositoryCollection: [
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
  ],
  'ldac:DataReuseLicense': [
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
    'ldac:allowTextIndex',
    'isRef_sameAs',
    'isRef_isPartOf',
  ],
  Place: [
    '@id',
    '@type',
    'name',
    'description',
    'dateAdded',
    'depiction',
    'isRef_geo',
  ],
  Geometry: ['@id', '@type', '.latitude', '.longitude', 'asWKT'],
  File: ['@id', '@type', '.folder', '.filename', 'isRef_isPartOf'],
}

export type SpreadsheetTab = {
  name: string
  type: ItemDataType
  headers: string[]
  seedRows?: string[][]
}

export type ExtraSheet = {
  name: string
  rows: string[][]
}

export type SpreadsheetSchema = {
  folderName: string // empty string for RepositoryObject (no dedicated folder)
  tabs: SpreadsheetTab[]
  extraSheets?: ExtraSheet[]
}

export type SpreadsheetType =
  | 'RepositoryObject'
  | 'People'
  | 'Language'
  | 'Places'
  | 'ldac:DataReuseLicense'

export const spreadsheets: Record<SpreadsheetType, SpreadsheetSchema> = {
  RepositoryObject: {
    folderName: '',
    tabs: [
      {
        name: DataTypeLabels.RepositoryObject.label,
        type: 'RepositoryObject',
        headers: TypeColumns.RepositoryObject,
      },
      {
        name: DataTypeLabels.File.label,
        type: 'File',
        headers: TypeColumns.File,
      },
    ],
  },
  People: {
    folderName: 'People',
    tabs: [
      {
        name: DataTypeLabels.Person.label,
        type: 'Person',
        headers: TypeColumns.Person,
      },
    ],
  },
  Language: {
    folderName: 'Languages',
    tabs: [
      {
        name: DataTypeLabels.Language.label,
        type: 'Language',
        headers: TypeColumns.Language,
      },
    ],
  },
  Places: {
    folderName: 'Places',
    tabs: [
      {
        name: DataTypeLabels.Place.label,
        type: 'Place',
        headers: TypeColumns.Place,
      },
      {
        name: DataTypeLabels.Geometry.label,
        type: 'Geometry',
        headers: TypeColumns.Geometry,
      },
    ],
  },
  'ldac:DataReuseLicense': {
    folderName: 'Licenses',
    tabs: [
      {
        name: DataTypeLabels['ldac:DataReuseLicense'].label,
        type: 'ldac:DataReuseLicense',
        headers: TypeColumns['ldac:DataReuseLicense'],
        seedRows: [
          [
            'https://creativecommons.org/licenses/by/4.0/',
            'ldac:DataReuseLicense',
            'Attribution 4.0 International (CC BY 4.0)',
            'You are free to: Share — copy and redistribute the material in any medium or format. Adapt — remix, transform, and build upon the material for any purpose, even commercially. This license is acceptable for Free Cultural Works. The licensor cannot revoke these freedoms as long as you follow the license terms.',
            'TRUE',
            'CC_BY_4.0.txt',
            './',
          ],
          [
            'https://creativecommons.org/licenses/by-nd/3.0/au/',
            'ldac:DataReuseLicense',
            'Attribution-NoDerivs 3.0 Australia (CC BY-ND 3.0 AU)',
            'You are free to: Share — copy and redistribute the material in any medium or format for any purpose, even commercially. The licensor cannot revoke these freedoms as long as you follow the license terms.',
            'TRUE',
            '',
            './',
          ],
          [
            'Licenses/Example.txt',
            '[ldac:DataReuseLicense, File]',
            'Example Custom License',
            'This license explains who is allowed to use and possibly redistribute this data, and for what purpose.',
            'TRUE',
            '',
            './',
          ],
          [
            'CC_BY_4.0.txt',
            '[ldac:DataReuseLicense, File]',
            'Attribution 4.0 International (CC BY 4.0) Local',
            'Local copy of the CC BY 4.0 license.',
            'TRUE',
            'https://creativecommons.org/licenses/by/4.0/',
            './',
          ],
        ],
      },
    ],
    extraSheets: [
      {
        name: '@context',
        rows: [
          ['name', '@id'],
          ['ldac', 'https://w3id.org/ldac/terms#'],
          ['csvw', 'http://www.w3.org/ns/csvw#'],
          ['custom', 'arcp://name,custom/terms#'],
        ],
      },
    ],
  },
}

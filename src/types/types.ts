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
}

// People
// https://www.ldaca.edu.au/resources/user-guides/crate-o/convert-spreadsheet/#people
export type Person = BaseItem & {
  gender?: string
  birthDate?: string
}

// https://www.ldaca.edu.au/resources/user-guides/crate-o/convert-spreadsheet/#objects
export type RepositoryObject = BaseItem & {
  inLanguage?: string
  isRef_creator?: string
  isRef_contributor?: string
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
}

// Maps each ItemDataType string to its TypeScript type, used to constrain TypeColumns.
type ItemTypeMap = {
  Person: Person
  RepositoryObject: RepositoryObject
  Language: BaseItem
  Dataset: BaseItem
  RepositoryCollection: BaseItem
  'ldac:DataReuseLicense': License
  Place: Place
  Geometry: Geometry
  File: File
}

// Runtime column definitions — each entry is constrained to the keys of the corresponding type.
export const TypeColumns: { [K in ItemDataType]: (keyof ItemTypeMap[K])[] } = {
  Person: ['@id', '@type', 'name', 'description', 'gender', 'birthDate'],
  RepositoryObject: [
    '@id',
    '@type',
    'name',
    'description',
    'inLanguage',
    'isRef_creator',
    'isRef_contributor',
    'isRef_mentions',
  ],
  Language: ['@id', '@type', 'name', 'description'],
  Dataset: ['@id', '@type', 'name', 'description'],
  RepositoryCollection: ['@id', '@type', 'name', 'description'],
  'ldac:DataReuseLicense': [
    '@id',
    '@type',
    'name',
    'description',
    'ldac:allowTextIndex',
    'isRef_sameAs',
    'isRef_isPartOf',
  ],
  Place: ['@id', '@type', 'name', 'description', 'isRef_geo'],
  Geometry: ['@id', '@type', '.latitude', '.longitude', 'asWKT'],
  File: ['@id', '@type', '.folder', '.filename'],
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

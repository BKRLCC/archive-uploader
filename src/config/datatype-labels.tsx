import { ItemDataType } from '../types/types'

// Icon mapping for different object types
// e.g. Person: "👤"
export const TypeIcons: Record<ItemDataType, string> = {
  Person: '👤',
  Organization: '🏠',
  RepositoryObject: '🗃️',
  Language: '🗣️',
  Dataset: '📊',
  Tag: '🏷️',
  RepositoryCollection: '📚',
  File: '📎',
  Place: '🗺️',
  Geometry: '📍',
  'ldac:DataReuseLicense': '📜',
}

type LabelConfig = {
  icon: string
  label: string
  labelSingular: string
}

export const dataTypeLabels: Record<ItemDataType, LabelConfig> = {
  Person: {
    icon: TypeIcons.Person,
    label: 'People',
    labelSingular: 'Person',
  },
  RepositoryObject: {
    icon: TypeIcons.RepositoryObject,
    label: 'Resources',
    labelSingular: 'Resource',
  },
  Language: {
    icon: TypeIcons.Language,
    label: 'Languages',
    labelSingular: 'Language',
  },
  Tag: {
    icon: TypeIcons.Tag,
    label: 'Tags',
    labelSingular: 'Tag',
  },
  Dataset: {
    icon: TypeIcons.Dataset,
    label: 'Datasets',
    labelSingular: 'Dataset',
  },
  RepositoryCollection: {
    icon: TypeIcons.RepositoryCollection,
    label: 'Collections',
    labelSingular: 'Collection',
  },
  Place: {
    icon: TypeIcons.Place,
    label: 'Places',
    labelSingular: 'Place',
  },
  Geometry: {
    icon: TypeIcons.Geometry,
    label: 'Geometry',
    labelSingular: 'Geometry',
  },
  Organization: {
    icon: TypeIcons.Organization,
    label: 'Organisations',
    labelSingular: 'Organisation',
  },
  File: {
    icon: TypeIcons.File,
    label: 'Files',
    labelSingular: 'File',
  },
  'ldac:DataReuseLicense': {
    icon: TypeIcons['ldac:DataReuseLicense'],
    label: 'Licenses',
    labelSingular: 'License',
  },
}

// Reverse lookup to get the data type from a label
export const labelToDataTypeMap: Record<string, ItemDataType> = Object.entries(
  dataTypeLabels,
).reduce(
  (acc, [key, value]) => {
    acc[value.label] = key as ItemDataType
    acc[value.labelSingular] = key as ItemDataType
    return acc
  },
  {} as Record<string, ItemDataType>,
)

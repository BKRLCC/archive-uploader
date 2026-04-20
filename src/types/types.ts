import { DataTypeLabels } from "../config/datatype-labels";

export type ItemDataType =
  | "Person"
  | "Organization"
  | "RepositoryObject"
  | "Language"
  | "Dataset"
  | "RepositoryCollection"
  | "ldac:DataReuseLicense"
  | "Place"
  | "Geometry"
  | "File";

export type CombinedType =
  | "PeopleAndOrgs" // Person + Organization
  | "Places";

export type LabelDataType = ItemDataType | CombinedType;

export type BaseItem = {
  "@id": string;
  "@type": ItemDataType;
  name: string;
  description?: string;
};

// People
// https://www.ldaca.edu.au/resources/user-guides/crate-o/convert-spreadsheet/#people
export type Person = BaseItem & {
  gender?: string;
  birthDate?: string;
};

export type Organization = BaseItem & {};

// https://www.ldaca.edu.au/resources/user-guides/crate-o/convert-spreadsheet/#objects
export type RepositoryObject = BaseItem & {
  inLanguage?: string;
};

export type License = BaseItem & {
  "ldac:allowTextIndex": boolean; // Determines whether the collection text can be indexed for search purposes. Requires a Boolean value (TRUE or FALSE).
};

export type Place = BaseItem & {
  isRef_geo?: string; // The @id of the location to which this object relates from the Localities tab.
};

export type Geometry = {
  "@id": string;
  "@type": "Geometry";
  ".latitude": string; // Latitude in decimal degrees (WGS84)
  ".longitude": string; // Longitude in decimal degrees (WGS84)
  asWKT: string; // Geometry in WKT format
};

// @id	@type	@type	.folder	.filename	isRef_isPartOf	isRef_ldac:annotationOf	isRef_csvw:tableSchema
export type File = {
  "@id": string;
  "@type": "File";
  ".folder": string; // Relative path to the folder containing the file, e.g. "images"
  ".filename": string; // Filename with extension, e.g. "photo.jpg"
};

type SpreadsheetType =
  | "RepositoryObject"
  | "PeopleAndOrgs"
  | "Places"
  | "ldac:DataReuseLicense";

export const spreadsheets: Record<
  SpreadsheetType,
  { tabs: { name: string; type: ItemDataType }[] }
> = {
  RepositoryObject: {
    tabs: [
      {
        name: DataTypeLabels.RepositoryObject.label,
        type: "RepositoryObject",
      },
      {
        name: DataTypeLabels.File.label,
        type: "File",
      },
    ],
  },
  PeopleAndOrgs: {
    tabs: [
      { name: DataTypeLabels.Person.label, type: "Person" },
      { name: DataTypeLabels.Organization.label, type: "Organization" },
    ],
  },
  Places: {
    tabs: [
      { name: DataTypeLabels.Places.label, type: "Place" },
      { name: DataTypeLabels.Geometry.label, type: "Geometry" },
    ],
  },
  "ldac:DataReuseLicense": {
    tabs: [
      {
        name: DataTypeLabels["ldac:DataReuseLicense"].label,
        type: "ldac:DataReuseLicense",
      },
    ],
  },
};

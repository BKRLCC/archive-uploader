var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// .tmp_convert_test.ts
var XLSX2 = __toESM(require("xlsx"));

// src/helpers/workbook-builder.ts
var XLSX = __toESM(require("xlsx"));

// src/config/field-vocabularies.ts
var TAG_FIELD_PREFIX = "isRef_tag_";

// src/config/field-groups.ts
var detailsGroup = {
  id: "details",
  label: "Details",
  defaultOpen: true,
  fields: [
    "name",
    "description",
    "dateCreated",
    "isRef_hasPart",
    "latitude",
    "longitude",
    "birthDate",
    "custom:languageCode",
    "isRef_inLanguage",
    "url",
    "isRef_custom:enteredBy"
  ]
};
var peopleGroup = {
  id: "people",
  label: "People",
  fields: ["isRef_creator", "isRef_contributor", "isRef_mentions"],
  defaultOpen: false
};
var locationsGroup = {
  id: "locations",
  label: "Locations",
  fields: ["isRef_contentLocation", "isRef_locationCreated"],
  defaultOpen: false
};
var tagsGroup = {
  id: "tags",
  label: "Tags",
  matchPrefix: TAG_FIELD_PREFIX,
  defaultOpen: false
};
var physicalGroup = {
  id: "physical",
  label: "Physical object",
  fields: ["width", "height", "depth", "material"],
  defaultOpen: false
};
var externalGroup = {
  id: "external",
  label: "External record",
  fields: [
    "sameAs",
    "isRef_custom:holdingOrganisation",
    "identifier",
    "dcterms:provenance"
  ],
  defaultOpen: false
};
var metadataGroup = {
  id: "metadata",
  label: "System metadata",
  fields: ["@id", "@type", "custom:dateAdded"],
  defaultOpen: false
};
var publishingGroup = {
  id: "publishing",
  label: "Publishing",
  fields: ["custom:isPublishable"],
  defaultOpen: true
};
var FIELD_GROUPS = [
  detailsGroup,
  peopleGroup,
  locationsGroup,
  tagsGroup,
  physicalGroup,
  externalGroup,
  metadataGroup,
  publishingGroup
];
var FIELD_GROUP_OVERRIDES = {
  "ldac:DataReuseLicense": [
    { ...metadataGroup, defaultOpen: true },
    ...FIELD_GROUPS.filter((group) => group.id !== "metadata")
  ]
};
function getFieldGroups(entityType) {
  if (entityType && FIELD_GROUP_OVERRIDES[entityType]) {
    return FIELD_GROUP_OVERRIDES[entityType];
  }
  return FIELD_GROUPS;
}
function normalize(fieldName) {
  return String(fieldName ?? "").trim().toLowerCase();
}
function groupRenderedFields(orderedFields, entityType) {
  const remaining = /* @__PURE__ */ new Map();
  for (const field of orderedFields) {
    const normalized = normalize(field);
    if (!remaining.has(normalized)) remaining.set(normalized, field);
  }
  return getFieldGroups(entityType).map((def) => {
    const fields = [];
    if (def.fields) {
      for (const name of def.fields) {
        const normalized = normalize(name);
        const original = remaining.get(normalized);
        if (original !== void 0) {
          fields.push(original);
          remaining.delete(normalized);
        }
      }
    } else if (def.matchPrefix) {
      const prefix = normalize(def.matchPrefix);
      for (const field of orderedFields) {
        const normalized = normalize(field);
        if (remaining.has(normalized) && normalized.startsWith(prefix)) {
          fields.push(field);
          remaining.delete(normalized);
        }
      }
    }
    return { def, fields };
  }).filter((group) => group.fields.length > 0);
}

// src/samples/sample-data.ts
var SAMPLE_IMAGE_FILENAME = "mona-lisa.jpg";
function monaLisaObject() {
  return {
    "@id": "mona-lisa",
    "@type": "RepositoryObject",
    name: "Mona Lisa",
    description: "Example item \u2014 a portrait painted by Leonardo da Vinci, held at the Louvre. Replace this row with one of your own items.",
    dateCreated: "1503-01-01",
    "custom:dateCreatedApproximate": "c. 1503\u20131519",
    isRef_creator: "leonardo-da-vinci",
    isRef_mentions: "lisa-del-giocondo",
    "isRef_custom:holdingOrganisation": "musee-du-louvre",
    isRef_hasPart: SAMPLE_IMAGE_FILENAME,
    isRef_image: SAMPLE_IMAGE_FILENAME,
    material: "Oil on poplar panel",
    width: "53",
    height: "77",
    identifier: "INV. 779",
    sameAs: "https://en.wikipedia.org/wiki/Mona_Lisa",
    "custom:isPublishable": true
  };
}
var SAMPLE_PEOPLE = [
  {
    "@id": "leonardo-da-vinci",
    "@type": "Person",
    name: "Leonardo da Vinci",
    description: "Example person \u2014 the artist who created the item above. Replace with a person referred to by your own items.",
    birthDate: "1452-04-15"
  },
  {
    "@id": "lisa-del-giocondo",
    "@type": "Person",
    name: "Lisa del Giocondo",
    description: "Example person \u2014 the sitter depicted in the item above. Replace with a person referred to by your own items.",
    birthDate: "1479-06-15"
  }
];
var SAMPLE_ORGANIZATIONS = [
  {
    "@id": "musee-du-louvre",
    "@type": "Organization",
    name: "Mus\xE9e du Louvre",
    description: "Example organisation \u2014 the museum that holds the item above. Replace with an organisation referred to by your own items.",
    url: "https://www.louvre.fr/",
    sameAs: "https://www.wikidata.org/wiki/Q19675",
    isRef_location: "paris"
  }
];
var SAMPLE_PLACES = [
  {
    "@id": "paris",
    "@type": "Place",
    name: "Paris",
    description: "Example place \u2014 where the holding organisation above is located. Replace with a place referred to by your own items.",
    latitude: "48.8566",
    longitude: "2.3522"
  }
];
var SAMPLE_LANGUAGES = [
  {
    "@id": "italian",
    "@type": "Language",
    name: "Italian",
    description: "Example language \u2014 replace with a language spoken in or relevant to your own items.",
    "custom:languageCode": "ita",
    sameAs: "https://glottolog.org/resource/languoid/id/ital1282"
  }
];
var SAMPLE_ENTITY_NAMES = Object.fromEntries(
  [
    ...SAMPLE_PEOPLE,
    ...SAMPLE_ORGANIZATIONS,
    ...SAMPLE_PLACES,
    ...SAMPLE_LANGUAGES
  ].map((entity) => [entity["@id"], entity.name])
);
function resolveSampleReferencesToNames(value) {
  return value.split(",").map((token) => {
    const trimmed = token.trim();
    return SAMPLE_ENTITY_NAMES[trimmed] ?? trimmed;
  }).join(", ");
}
function withReferencesAsNames(entity) {
  const result = { ...entity };
  for (const [key, val] of Object.entries(result)) {
    if (key.startsWith("isRef_") && typeof val === "string") {
      result[key] = resolveSampleReferencesToNames(val);
    }
  }
  return result;
}
function getSampleEntitiesForType(type, referencesAsNames = false) {
  let entities;
  switch (type) {
    case "RepositoryObject":
      entities = [monaLisaObject()];
      break;
    case "Person":
      entities = SAMPLE_PEOPLE;
      break;
    case "Organization":
      entities = SAMPLE_ORGANIZATIONS;
      break;
    case "Place":
      entities = SAMPLE_PLACES;
      break;
    case "Language":
      entities = SAMPLE_LANGUAGES;
      break;
    default:
      entities = [];
  }
  return referencesAsNames ? entities.map(withReferencesAsNames) : entities;
}

// src/config/datatype-labels.tsx
var TypeIcons = {
  Person: "\u{1F464}",
  Organization: "\u{1F3E0}",
  RepositoryObject: "\u{1F5C3}\uFE0F",
  Language: "\u{1F5E3}\uFE0F",
  Dataset: "\u{1F4CA}",
  Tag: "\u{1F3F7}\uFE0F",
  RepositoryCollection: "\u{1F4DA}",
  File: "\u{1F4CE}",
  Place: "\u{1F5FA}\uFE0F",
  Geometry: "\u{1F4CD}",
  "ldac:DataReuseLicense": "\u{1F4DC}"
};
var dataTypeLabels = {
  Person: {
    icon: TypeIcons.Person,
    label: "People",
    labelSingular: "Person"
  },
  RepositoryObject: {
    icon: TypeIcons.RepositoryObject,
    label: "Resources",
    labelSingular: "Resource"
  },
  Language: {
    icon: TypeIcons.Language,
    label: "Languages",
    labelSingular: "Language"
  },
  Tag: {
    icon: TypeIcons.Tag,
    label: "Tags",
    labelSingular: "Tag"
  },
  Dataset: {
    icon: TypeIcons.Dataset,
    label: "Datasets",
    labelSingular: "Dataset"
  },
  RepositoryCollection: {
    icon: TypeIcons.RepositoryCollection,
    label: "Collections",
    labelSingular: "Collection"
  },
  Place: {
    icon: TypeIcons.Place,
    label: "Places",
    labelSingular: "Place"
  },
  Geometry: {
    icon: TypeIcons.Geometry,
    label: "Geometry",
    labelSingular: "Geometry"
  },
  Organization: {
    icon: TypeIcons.Organization,
    label: "Organisations",
    labelSingular: "Organisation"
  },
  File: {
    icon: TypeIcons.File,
    label: "Files",
    labelSingular: "File"
  },
  "ldac:DataReuseLicense": {
    icon: TypeIcons["ldac:DataReuseLicense"],
    label: "Licenses",
    labelSingular: "License"
  }
};
var labelToDataTypeMap = Object.entries(
  dataTypeLabels
).reduce(
  (acc, [key, value]) => {
    acc[value.label] = key;
    acc[value.labelSingular] = key;
    return acc;
  },
  {}
);

// src/types/types.ts
var defineEntityFields = () => (fields) => fields;
var ENTITY_FIELD_REGISTRY = {
  Person: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "gender",
    "birthDate"
  ]),
  RepositoryObject: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "dateCreated",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "custom:isPublishable",
    "isRef_image",
    "isRef_contentLocation",
    "isRef_locationCreated",
    "isRef_inLanguage",
    "isRef_creator",
    "isRef_contributor",
    "isRef_hasPart",
    "isRef_mentions",
    "custom:dateCreatedApproximate",
    "width",
    "height",
    "depth",
    "material",
    "isRef_custom:holdingOrganisation",
    "identifier",
    "sameAs",
    "dcterms:provenance"
  ]),
  Organization: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "isRef_location",
    "url",
    "sameAs"
  ]),
  Language: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "custom:languageCode",
    "sameAs"
  ]),
  Dataset: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image"
  ]),
  Tag: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image"
  ]),
  RepositoryCollection: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "identifier",
    "isRef_license",
    "isRef_author",
    "isRef_publisher",
    "datePublished",
    "isRef_inLanguage",
    "isRef_ldac:subjectLanguage",
    "ldac:metadataIsPublic",
    "custom:isPublishable"
  ]),
  "ldac:DataReuseLicense": defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "ldac:allowTextIndex",
    "isRef_sameAs",
    "isRef_isPartOf"
  ]),
  Place: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "latitude",
    "longitude"
  ]),
  Geometry: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    ".latitude",
    ".longitude",
    "asWKT"
  ]),
  File: defineEntityFields()([
    "@id",
    "@type",
    ".folder",
    ".filename",
    "name",
    "encodingFormat",
    "isRef_isPartOf"
  ]),
  DefinedTerm: defineEntityFields()([
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image"
  ])
};
var hasEntityFieldModel = (entityType) => {
  return Object.prototype.hasOwnProperty.call(ENTITY_FIELD_REGISTRY, entityType);
};
function resolveEditableEntityType(rawType) {
  const cleaned = String(rawType ?? "").trim();
  if (!cleaned) return null;
  const candidates = cleaned.startsWith("[") && cleaned.endsWith("]") ? cleaned.slice(1, -1).split(",").map((part) => part.trim()).filter(Boolean) : [cleaned];
  for (const candidate of candidates) {
    if (hasEntityFieldModel(candidate)) return candidate;
  }
  return null;
}
function getEntityFieldModel(entityType) {
  return ENTITY_FIELD_REGISTRY[entityType].map((field) => String(field));
}
var TypeColumns = {
  Person: [
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "gender",
    "birthDate"
  ],
  Organization: [
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "isRef_location",
    "url",
    "sameAs"
  ],
  RepositoryObject: [
    "@id",
    "@type",
    "name",
    "description",
    "dateCreated",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "custom:isPublishable",
    "isRef_image",
    "isRef_contentLocation",
    "isRef_locationCreated",
    "isRef_inLanguage",
    "isRef_creator",
    "isRef_contributor",
    "isRef_hasPart",
    "isRef_mentions",
    "isRef_pcdm:memberOf"
  ],
  Language: [
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "custom:languageCode",
    "sameAs"
  ],
  Tag: [
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image"
  ],
  Dataset: [
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image"
  ],
  RepositoryCollection: [
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image"
  ],
  "ldac:DataReuseLicense": [
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "ldac:allowTextIndex",
    "isRef_sameAs",
    "isRef_isPartOf"
  ],
  Place: [
    "@id",
    "@type",
    "name",
    "description",
    "custom:dateAdded",
    "isRef_custom:enteredBy",
    "isRef_image",
    "latitude",
    "longitude"
  ],
  Geometry: [
    "@id",
    "@type",
    "name",
    "description",
    ".latitude",
    ".longitude",
    "asWKT"
  ],
  File: [
    "@id",
    "@type",
    ".folder",
    ".filename",
    "name",
    "encodingFormat",
    "isRef_isPartOf"
  ]
};
var CONTEXT_SHEET = {
  name: "@context",
  rows: [
    ["name", "@id"],
    ["ldac", "https://w3id.org/ldac/terms#"],
    ["csvw", "http://www.w3.org/ns/csvw#"],
    ["pcdm", "https://pcdm.org/models#"],
    ["dcterms", "http://purl.org/dc/terms/"],
    ["custom", "arcp://name,custom/terms#"]
  ]
};
var spreadsheets = {
  RepositoryObject: {
    folderName: "",
    tabs: [
      {
        name: dataTypeLabels.RepositoryObject.label,
        type: "RepositoryObject",
        headers: TypeColumns.RepositoryObject
      }
    ],
    extraSheets: [CONTEXT_SHEET]
  },
  People: {
    folderName: "People",
    tabs: [
      {
        name: dataTypeLabels.Person.label,
        type: "Person",
        headers: TypeColumns.Person
      }
    ],
    extraSheets: [CONTEXT_SHEET]
  },
  Organisations: {
    folderName: "Organisations",
    tabs: [
      {
        name: dataTypeLabels.Organization.label,
        type: "Organization",
        headers: TypeColumns.Organization
      }
    ],
    extraSheets: [CONTEXT_SHEET]
  },
  Language: {
    folderName: "Languages",
    tabs: [
      {
        name: dataTypeLabels.Language.label,
        type: "Language",
        headers: TypeColumns.Language
      }
    ],
    extraSheets: [CONTEXT_SHEET]
  },
  Places: {
    folderName: "Places",
    tabs: [
      {
        name: dataTypeLabels.Place.label,
        type: "Place",
        headers: TypeColumns.Place
      }
    ],
    extraSheets: [CONTEXT_SHEET]
  },
  "ldac:DataReuseLicense": {
    folderName: "Licenses",
    tabs: [
      {
        name: dataTypeLabels["ldac:DataReuseLicense"].label,
        type: "ldac:DataReuseLicense",
        headers: TypeColumns["ldac:DataReuseLicense"],
        seedRows: [
          [
            "https://creativecommons.org/licenses/by/4.0/",
            "ldac:DataReuseLicense",
            "Attribution 4.0 International (CC BY 4.0)",
            "You are free to: Share \u2014 copy and redistribute the material in any medium or format. Adapt \u2014 remix, transform, and build upon the material for any purpose, even commercially. This license is acceptable for Free Cultural Works. The licensor cannot revoke these freedoms as long as you follow the license terms.",
            "",
            "",
            "",
            "TRUE",
            "CC_BY_4.0.txt",
            "./"
          ],
          [
            "https://creativecommons.org/licenses/by-nd/3.0/au/",
            "ldac:DataReuseLicense",
            "Attribution-NoDerivs 3.0 Australia (CC BY-ND 3.0 AU)",
            "You are free to: Share \u2014 copy and redistribute the material in any medium or format for any purpose, even commercially. The licensor cannot revoke these freedoms as long as you follow the license terms.",
            "",
            "",
            "",
            "TRUE",
            "",
            "./"
          ],
          [
            "License files/Example.txt",
            "[ldac:DataReuseLicense, File]",
            "Example Custom License",
            "This license explains who is allowed to use and possibly redistribute this data, and for what purpose.",
            "",
            "",
            "",
            "TRUE",
            "",
            "./"
          ],
          [
            "CC_BY_4.0.txt",
            "[ldac:DataReuseLicense, File]",
            "Attribution 4.0 International (CC BY 4.0) Local",
            "Local copy of the CC BY 4.0 license.",
            "",
            "",
            "",
            "TRUE",
            "https://creativecommons.org/licenses/by/4.0/",
            "./"
          ]
        ]
      }
    ],
    extraSheets: [CONTEXT_SHEET]
  }
};

// src/helpers/workbook-builder.ts
function entityToRow(entity, headers) {
  return headers.map((header) => {
    const value = entity[header];
    if (value === void 0 || value === null) return "";
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return String(value);
  });
}
function headersForTab(tab, fullHeaders) {
  if (!fullHeaders) return tab.headers;
  const entityType = resolveEditableEntityType(tab.type);
  if (!entityType) return tab.headers;
  const headers = [...tab.headers];
  for (const field of getEntityFieldModel(entityType)) {
    if (!headers.includes(field)) headers.push(field);
  }
  return headers;
}
function orderHeaders(headers) {
  const pinned = ["@id", "@type"].filter((h) => headers.includes(h));
  const rest = headers.filter((h) => !pinned.includes(h));
  const grouped = groupRenderedFields(rest).flatMap((group) => group.fields);
  const claimed = new Set(grouped);
  const leftovers = rest.filter((h) => !claimed.has(h));
  const ordered = [...pinned, ...grouped, ...leftovers];
  return moveAfter(ordered, "custom:dateCreatedApproximate", "dateCreated");
}
function moveAfter(fields, field, anchor) {
  const fieldIndex = fields.indexOf(field);
  const anchorIndex = fields.indexOf(anchor);
  if (fieldIndex < 0 || anchorIndex < 0) return fields;
  const without = fields.filter((_, index) => index !== fieldIndex);
  const insertAt = without.indexOf(anchor) + 1;
  without.splice(insertAt, 0, field);
  return without;
}
function columnWidths(rows) {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const MIN_WIDTH = 12;
  const MAX_WIDTH = 45;
  const PADDING = 2;
  const widths = [];
  for (let col = 0; col < columnCount; col++) {
    let longest = 0;
    for (const row of rows) {
      const cell = row[col];
      if (cell != null) longest = Math.max(longest, String(cell).length);
    }
    const wch = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest + PADDING));
    widths.push({ wch });
  }
  return widths;
}
function buildWorkbook(schemaKey, meta, fullHeaders = false, includeSamples = false, referencesAsNames = false) {
  const schema = spreadsheets[schemaKey];
  const workbook = XLSX.utils.book_new();
  const ref = (value) => {
    const resolved = value ?? "";
    return referencesAsNames ? resolveSampleReferencesToNames(resolved) : resolved;
  };
  const rootDatasetRows = [
    ["Name", "Value"],
    ["@id", "./"],
    ["@type", "[Dataset, RepositoryCollection]"],
    ["name", meta.name],
    ["description", meta.description],
    ["identifier", meta.identifier ?? ""],
    ["isRef_license", ref(meta.isRef_license)],
    ["isRef_author", ref(meta.isRef_author)],
    ["isRef_publisher", ref(meta.isRef_publisher)],
    ["datePublished", meta.datePublished ?? ""],
    ["isRef_inLanguage", ref(meta.isRef_inLanguage)],
    ["isRef_ldac:subjectLanguage", ref(meta["isRef_ldac:subjectLanguage"])],
    ["ldac:metadataIsPublic", meta["ldac:metadataIsPublic"] ?? "FALSE"],
    ["custom:isPublishable", meta["custom:isPublishable"] ?? "FALSE"]
  ];
  const rootDataset = XLSX.utils.aoa_to_sheet(rootDatasetRows);
  rootDataset["!cols"] = columnWidths(rootDatasetRows);
  XLSX.utils.book_append_sheet(workbook, rootDataset, "RootDataset");
  for (const tab of schema.tabs) {
    const baseHeaders = headersForTab(tab, fullHeaders);
    const orderedHeaders = orderHeaders(baseHeaders);
    const permutation = orderedHeaders.map((h) => baseHeaders.indexOf(h));
    const seedRows = (tab.seedRows ?? []).map(
      (row) => permutation.map((sourceIndex) => row[sourceIndex] ?? "")
    );
    const sampleRows = includeSamples ? getSampleEntitiesForType(tab.type, referencesAsNames).map(
      (entity) => entityToRow(entity, orderedHeaders)
    ) : [];
    const rows = [orderedHeaders, ...seedRows, ...sampleRows];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = columnWidths(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, tab.name);
  }
  for (const extra of schema.extraSheets ?? []) {
    const sheet = XLSX.utils.aoa_to_sheet(extra.rows);
    sheet["!cols"] = columnWidths(extra.rows);
    XLSX.utils.book_append_sheet(workbook, sheet, extra.name);
  }
  const filesHeaders = [...TypeColumns.File];
  const filesSheet = XLSX.utils.aoa_to_sheet([filesHeaders]);
  filesSheet["!cols"] = columnWidths([filesHeaders]);
  XLSX.utils.book_append_sheet(workbook, filesSheet, "Files");
  return workbook;
}

// src/config/mime-types.ts
var MIME_TYPES_BY_EXTENSION = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  // Video
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  // Documents
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  xml: "application/xml",
  md: "text/markdown",
  rtf: "application/rtf",
  html: "text/html",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  // Archives
  zip: "application/zip"
};
var DEFAULT_ENCODING_FORMAT = "application/octet-stream";
var fileExtension = (pathOrName) => {
  const name = String(pathOrName ?? "").split("?")[0].split("#")[0].replace(/\/+$/, "");
  const base = name.slice(name.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
};
var encodingFormatForPath = (pathOrName) => MIME_TYPES_BY_EXTENSION[fileExtension(pathOrName)] ?? DEFAULT_ENCODING_FORMAT;

// src/helpers/file-linkage.ts
function normalizeRelativePath(pathValue) {
  return String(pathValue ?? "").trim().replace(/\\+/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}
function parseHasPartPaths(rawValue) {
  const unique = /* @__PURE__ */ new Set();
  for (const token of String(rawValue ?? "").split(",")) {
    const normalized = normalizeRelativePath(token);
    if (!normalized) continue;
    unique.add(normalized);
  }
  return Array.from(unique);
}
function deriveFileRowsFromItems(rows) {
  const byPath = /* @__PURE__ */ new Map();
  const order = [];
  const addOwner = (relativePath, itemId) => {
    const parts = relativePath.split("/").filter(Boolean);
    if (parts.length === 0) return;
    const filename = parts[parts.length - 1];
    if (!filename) return;
    const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    const existing = byPath.get(relativePath);
    if (existing) {
      const owners = new Set(
        existing.isRef_isPartOf.split(",").map((id) => id.trim()).filter(Boolean)
      );
      owners.add(itemId);
      existing.isRef_isPartOf = Array.from(owners).join(", ");
      return;
    }
    byPath.set(relativePath, {
      "@id": relativePath,
      "@type": "File",
      ".folder": folder,
      ".filename": filename,
      name: filename,
      encodingFormat: encodingFormatForPath(relativePath),
      isRef_isPartOf: itemId
    });
    order.push(relativePath);
  };
  for (const row of rows) {
    const itemId = String(row.itemId ?? "").trim();
    if (!itemId) continue;
    for (const relativePath of parseHasPartPaths(row.hasPart)) {
      addOwner(relativePath, itemId);
    }
    const imagePath = normalizeRelativePath(row.image ?? "");
    if (imagePath) addOwner(imagePath, itemId);
  }
  return order.map((path) => byPath.get(path));
}

// .tmp_convert_test.ts
async function main() {
  const wb = buildWorkbook("RepositoryObject", { name: "Test Collection", description: "d" });
  const itemsName = wb.SheetNames.find((n) => !["RootDataset", "@context", "Files"].includes(n));
  const itemHeaders = ["@id", "@type", "name", "isRef_hasPart", "isRef_pcdm:memberOf"];
  const itemRow = ["#obj1", "RepositoryObject", "Object One", "Data/clip.mov", "./"];
  wb.Sheets[itemsName] = XLSX2.utils.aoa_to_sheet([itemHeaders, itemRow]);
  const fileHeaders = [...TypeColumns.File];
  const derived = deriveFileRowsFromItems([{ itemId: "#obj1", hasPart: "Data/clip.mov" }]);
  const fileRows = derived.map((r) => fileHeaders.map((h) => String(r[h] ?? "")));
  wb.Sheets["Files"] = XLSX2.utils.aoa_to_sheet([fileHeaders, ...fileRows]);
  console.log("Files sheet headers sent:", JSON.stringify(fileHeaders));
  console.log("Files row sent:", JSON.stringify(fileRows[0]));
  const buf = XLSX2.write(wb, { type: "buffer", bookType: "xlsx" });
  const form = new FormData();
  form.append("file", new Blob([buf]), "ro-crate-metadata.xlsx");
  const res = await fetch("https://ro-crate-excel-api.light.garden/convert?report=1", { method: "POST", body: form });
  console.log("HTTP", res.status);
  if (!res.ok) {
    console.log("body:", (await res.text()).slice(0, 500));
    return;
  }
  const { crate } = await res.json();
  const fileNodes = crate["@graph"].filter((n) => {
    const t = n["@type"];
    return t === "File" || Array.isArray(t) && t.includes("File");
  });
  console.log("File node count:", fileNodes.length);
  for (const fn of fileNodes) console.log("File node:", JSON.stringify(fn));
}
main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});

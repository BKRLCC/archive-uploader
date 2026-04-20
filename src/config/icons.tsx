import { LabelDataType } from "../types/types";

// Icon mapping for different object types
// e.g. Person: "👤"
export const TypeIcons: Record<LabelDataType, string> = {
  Person: "👤",
  Organization: "🏠",
  RepositoryObject: "📦",
  Language: "🔤",
  Dataset: "📊",
  RepositoryCollection: "📚",
  Place: "📍",
  Geometry: "📐",
  PeopleAndOrgs: "👥",
  Places: "🗺️",
  "ldac:DataReuseLicense": "📜",
};

export const UiIcons = {
  metadata: "⭐",
  createMetadata: "🌟",
  add: "➕",
  edit: "✏️",
  delete: "🗑️",
  fileBrowser: "🗂️",
  folder: "📁",
  settings: "⚙️",
  home: "🏠",
  image: "🖼️",
  audio: "🎵",
  video: "🎬",
  doc: "📄",
};

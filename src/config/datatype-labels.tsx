import { LabelDataType } from "../types/types";
import { TypeIcons } from "./icons";

type LabelConfig = {
  icon: string;
  label: string;
  labelSingular: string;
};

export const DataTypeLabels: Record<LabelDataType, LabelConfig> = {
  Person: {
    icon: TypeIcons.Person,
    label: "People",
    labelSingular: "Person",
  },
  Organization: {
    icon: TypeIcons.Organization,
    label: "Organisations",
    labelSingular: "Organisation",
  },
  RepositoryObject: {
    icon: TypeIcons.RepositoryObject,
    label: "Items",
    labelSingular: "Item",
  },
  Language: {
    icon: TypeIcons.Language,
    label: "Languages",
    labelSingular: "Language",
  },
  Dataset: {
    icon: TypeIcons.Dataset,
    label: "Datasets",
    labelSingular: "Dataset",
  },
  RepositoryCollection: {
    icon: TypeIcons.RepositoryCollection,
    label: "Collections",
    labelSingular: "Collection",
  },
  Place: {
    icon: TypeIcons.Place,
    label: "Places",
    labelSingular: "Place",
  },
  Geometry: {
    icon: TypeIcons.Geometry,
    label: "Geometries",
    labelSingular: "Geometry",
  },
  PeopleAndOrgs: {
    icon: TypeIcons.PeopleAndOrgs,
    label: "People & Organisations",
    labelSingular: "Person or Organisation",
  },
  Places: {
    icon: TypeIcons.Places,
    label: "Places",
    labelSingular: "Place",
  },
  File: {
    icon: TypeIcons.File,
    label: "Files",
    labelSingular: "File",
  },
  "ldac:DataReuseLicense": {
    icon: TypeIcons["ldac:DataReuseLicense"],
    label: "Licenses",
    labelSingular: "License",
  },
};

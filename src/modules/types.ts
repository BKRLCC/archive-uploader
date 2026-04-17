export type FormFieldType = "string" | "number" | "date" | "boolean" | "select";

export type FormFieldSelectOption = {
  value: string;
  label: string;
  icon?: string;
};

export type FormField = {
  name: string;
  label: string;
  type: FormFieldType;
  options?: FormFieldSelectOption[]; // for "select" type
};

export type Form = {
  name?: string;
  fields: FormField[];
};

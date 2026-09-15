// arcp UUID identifiers for RO-Crate collections; see draft-soilandreyes-arcp.
export function newArcpIdentifier(): string {
  return `arcp://uuid,${crypto.randomUUID()}/`
}

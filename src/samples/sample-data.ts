/**
 * Typed sample data used to pre-fill the downloadable contribution starter
 * packs with a coherent, worked example so donors and testers see how the
 * sheets fit together instead of facing an empty slate.
 *
 * The example is the Mona Lisa: a repository object (the painting) linked to
 * its creator and sitter (People), its holding organisation (Organisations),
 * a place (Places) and a language (Languages), plus a bundled public-domain
 * image file. Every entity is typed against the app's own entity types so the
 * data stays in sync with the schema.
 *
 * Sample rows are intended to be illustrative — donors should replace or delete
 * them with their own records.
 */
import type {
  ItemDataType,
  Language,
  Organization,
  Person,
  Place,
  RepositoryObject,
} from '../types/types'

// Filename of the bundled sample image (public domain, from Wikipedia). Lives
// alongside this module in src/samples/files/ and is copied into each pack.
export const SAMPLE_IMAGE_FILENAME = 'mona-lisa.jpg'

// RootDataset metadata for the example collection. Shape matches the `meta`
// argument of buildWorkbook.
export const SAMPLE_ROOT_DATASET = {
  name: 'Mona Lisa — Example Collection',
  description:
    'Example collection — a single worked example showing how the sheets link together. Replace this with a description of your own collection.',
  isRef_license: 'https://creativecommons.org/licenses/by/4.0/',
  isRef_author: 'leonardo-da-vinci',
  isRef_publisher: 'musee-du-louvre',
  datePublished: '2024-01-01',
  'ldac:metadataIsPublic': 'TRUE',
}

// The Mona Lisa painting. The bundled image always sits in the same folder as
// the workbook that describes it (the pack root for the simple pack, the files/
// folder for the full pack), so it is referenced by its bare filename.
function monaLisaObject(): RepositoryObject {
  return {
    '@id': 'mona-lisa',
    '@type': 'RepositoryObject',
    name: 'Mona Lisa',
    description:
      'Example item — a portrait painted by Leonardo da Vinci, held at the Louvre. Replace this row with one of your own items.',
    dateCreated: '1503-01-01',
    dateCreatedApproximate: 'c. 1503–1519',
    isRef_creator: 'leonardo-da-vinci',
    isRef_mentions: 'lisa-del-giocondo',
    isRef_holdingOrganisation: 'musee-du-louvre',
    isRef_hasPart: SAMPLE_IMAGE_FILENAME,
    depiction: SAMPLE_IMAGE_FILENAME,
    material: 'Oil on poplar panel',
    width: '53',
    height: '77',
    identifier: 'INV. 779',
    sameAs: 'https://en.wikipedia.org/wiki/Mona_Lisa',
    isPublishable: true,
  }
}

const SAMPLE_PEOPLE: Person[] = [
  {
    '@id': 'leonardo-da-vinci',
    '@type': 'Person',
    name: 'Leonardo da Vinci',
    description:
      'Example person — the artist who created the item above. Replace with a person referred to by your own items.',
    birthDate: '1452-04-15',
  },
  {
    '@id': 'lisa-del-giocondo',
    '@type': 'Person',
    name: 'Lisa del Giocondo',
    description:
      'Example person — the sitter depicted in the item above. Replace with a person referred to by your own items.',
    birthDate: '1479-06-15',
  },
]

const SAMPLE_ORGANIZATIONS: Organization[] = [
  {
    '@id': 'musee-du-louvre',
    '@type': 'Organization',
    name: 'Musée du Louvre',
    description:
      'Example organisation — the museum that holds the item above. Replace with an organisation referred to by your own items.',
    url: 'https://www.louvre.fr/',
    sameAs: 'https://www.wikidata.org/wiki/Q19675',
    isRef_location: 'paris',
  },
]

const SAMPLE_PLACES: Place[] = [
  {
    '@id': 'paris',
    '@type': 'Place',
    name: 'Paris',
    description:
      'Example place — where the holding organisation above is located. Replace with a place referred to by your own items.',
    latitude: '48.8566',
    longitude: '2.3522',
  },
]

const SAMPLE_LANGUAGES: Language[] = [
  {
    '@id': 'italian',
    '@type': 'Language',
    name: 'Italian',
    description:
      'Example language — replace with a language spoken in or relevant to your own items.',
    languageCode: 'ita',
    sameAs: 'https://glottolog.org/resource/languoid/id/ital1282',
  },
]

// Returns the sample entities for a given sheet type, or [] for types without a
// worked example (e.g. licences, which the schema already seeds).
export function getSampleEntitiesForType(
  type: ItemDataType,
): Array<Record<string, unknown>> {
  switch (type) {
    case 'RepositoryObject':
      return [monaLisaObject()]
    case 'Person':
      return SAMPLE_PEOPLE
    case 'Organization':
      return SAMPLE_ORGANIZATIONS
    case 'Place':
      return SAMPLE_PLACES
    case 'Language':
      return SAMPLE_LANGUAGES
    default:
      return []
  }
}

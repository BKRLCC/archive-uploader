import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '../ducks/hooks'
import { selectPeople } from '../ducks/people'
import { selectOrganizations } from '../ducks/organizations'
import { selectPlaces } from '../ducks/places'
import { selectLanguages } from '../ducks/languages'
import {
  normalizeReferenceId,
  type ReferenceEntity,
} from '../components/ReferenceCell'

export interface ReferenceLookups {
  lookups: Record<string, Map<string, ReferenceEntity>>
  folders: Record<string, string | null>
}

// Lookup maps and image folders for the controlled-vocabulary reference fields
// (People, Places, Languages, Organization), keyed by vocabulary name.
export function useReferenceLookups(): ReferenceLookups {
  const people = useAppSelector(selectPeople)
  const places = useAppSelector(selectPlaces)
  const languages = useAppSelector(selectLanguages)
  const organizations = useAppSelector(selectOrganizations)
  const [rootFolder, setRootFolder] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.getRootFolder().then((value) => {
      if (!cancelled) setRootFolder(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const lookups = useMemo(() => {
    const build = (
      items: Array<{ '@id': string; name?: string; isRef_image?: string }>,
    ): Map<string, ReferenceEntity> => {
      const map = new Map<string, ReferenceEntity>()
      for (const item of items) {
        const id = String(item['@id'] ?? '').trim()
        if (!id) continue
        map.set(normalizeReferenceId(id), {
          id,
          name: String(item.name ?? ''),
          depiction: item.isRef_image,
        })
      }
      return map
    }
    return {
      People: build(people),
      Places: build(places),
      Languages: build(languages),
      Organization: build(organizations),
    } as Record<string, Map<string, ReferenceEntity>>
  }, [people, places, languages, organizations])

  // Referenced entities are global metadata stored under fixed root subfolders;
  // their depiction/thumbnail paths are relative to those folders, not the archive.
  const folders = useMemo((): Record<string, string | null> => {
    const base = rootFolder ? rootFolder.replace(/[/\\]+$/, '') : null
    return {
      People: base ? `${base}/People` : null,
      Places: base ? `${base}/Places` : null,
      Languages: base ? `${base}/Languages` : null,
      Organization: base ? `${base}/Organisations` : null,
    }
  }, [rootFolder])

  return { lookups, folders }
}

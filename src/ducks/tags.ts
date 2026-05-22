import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  getTagVocabularyKeyFromField,
  normalizeTagVocabularyKey,
  TAG_FIELD_PREFIX,
} from '../config/field-vocabularies'
import type { RootState } from './store'

export interface TagVocabularyOption {
  value: string
  label: string
  searchText: string
}

export interface TagVocabulary {
  key: string
  workbookName: string
  workbookPath: string
  sourceSheetName: string
  fieldName: string
  options: TagVocabularyOption[]
}

type TagVocabularyDictionary = Record<string, TagVocabulary>

export type TagsState = {
  loading: boolean
  error: string | null
  vocabularies: TagVocabularyDictionary
}

const initialState: TagsState = {
  loading: false,
  error: null,
  vocabularies: {},
}

const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    setTagVocabularies(state, action: PayloadAction<TagVocabulary[]>) {
      const next: TagVocabularyDictionary = {}
      action.payload.forEach((vocabulary) => {
        next[vocabulary.key] = vocabulary
      })
      state.vocabularies = next
      state.error = null
    },
    setTagsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setTagsError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
  },
})

export const { setTagVocabularies, setTagsLoading, setTagsError } =
  tagsSlice.actions

const selectTagVocabularyDictionary = (state: RootState) => state.tags.vocabularies

export const selectTagVocabularies = createSelector(
  selectTagVocabularyDictionary,
  (vocabularies) => Object.values(vocabularies),
)

export const selectTagVocabularyForField = (
  state: RootState,
  fieldName: string,
): TagVocabulary | null => {
  const key = getTagVocabularyKeyFromField(fieldName)
  if (!key) return null
  return state.tags.vocabularies[key] ?? null
}

export const selectTagsLoading = (state: RootState) => state.tags.loading
export const selectTagsError = (state: RootState) => state.tags.error

export const workbookNameToTagVocabularyKey = (workbookName: string): string =>
  normalizeTagVocabularyKey(workbookName)

export const workbookNameToTagFieldName = (workbookName: string): string =>
  `${TAG_FIELD_PREFIX}${workbookName}`

export default tagsSlice.reducer

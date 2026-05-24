import {
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { Language } from '../types/types'
import type { RootState } from './store'

type LanguageDictionary = Record<string, Language>

export type LanguagesState = {
  loading: boolean
  languages: LanguageDictionary
}

const initialState: LanguagesState = {
  loading: false,
  languages: {},
}

const languagesSlice = createSlice({
  name: 'languages',
  initialState,
  reducers: {
    setLanguages(state, action: PayloadAction<Language[]>) {
      const next: LanguageDictionary = {}
      action.payload.forEach((language) => {
        next[language['@id']] = language
      })
      state.languages = next
    },
    setLanguagesLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setLanguages, setLanguagesLoading } = languagesSlice.actions

const selectLanguageDictionary = (state: RootState) => state.languages.languages

export const selectLanguages = createSelector(
  selectLanguageDictionary,
  (items) => Object.values(items),
)

export const selectLanguagesLoading = (state: RootState) =>
  state.languages.loading

export default languagesSlice.reducer

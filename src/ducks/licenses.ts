import {
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { License } from '../types/types'
import type { RootState } from './store'

type LicensesDictionary = Record<string, License>

export type LicensesState = {
  loading: boolean
  licenses: LicensesDictionary
}

const initialState: LicensesState = {
  loading: false,
  licenses: {},
}

const licensesSlice = createSlice({
  name: 'licenses',
  initialState,
  reducers: {
    setLicenses(state, action: PayloadAction<License[]>) {
      const next: LicensesDictionary = {}
      action.payload.forEach((license) => {
        next[license['@id']] = license
      })
      state.licenses = next
    },
    setLicensesLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setLicenses, setLicensesLoading } = licensesSlice.actions

const selectLicensesDictionary = (state: RootState) => state.licenses.licenses

export const selectLicenses = createSelector(
  selectLicensesDictionary,
  (items) => Object.values(items),
)

export const selectLicensesLoading = (state: RootState) =>
  state.licenses.loading

export default licensesSlice.reducer

import { Organization } from 'src/types/types'
import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './store'

type OrganizationsDictionary = Record<string, Organization>

export type OrganizationsState = {
  loading: boolean
  organizations: OrganizationsDictionary
}

export const initialState: OrganizationsState = {
  loading: false,
  organizations: {},
}

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {
    setOrganizations(state, action: PayloadAction<Organization[]>) {
      const organizationsArray = action.payload
      const organizationsDict: OrganizationsDictionary = {}
      organizationsArray.forEach((organization) => {
        organizationsDict[organization['@id']] = organization
      })
      state.organizations = organizationsDict
    },
    upsertOrganization(state, action: PayloadAction<Organization>) {
      const organization = action.payload
      state.organizations[organization['@id']] = organization
    },
    removeOrganizationsByIds(state, action: PayloadAction<string[]>) {
      action.payload.forEach((id) => {
        delete state.organizations[id]
      })
    },
    setOrganizationsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const {
  setOrganizations,
  upsertOrganization,
  removeOrganizationsByIds,
  setOrganizationsLoading,
} = organizationsSlice.actions

// Selectors
const selectOrganizationsDictionary = (state: RootState) =>
  state.organizations.organizations
export const selectOrganizations = createSelector(
  selectOrganizationsDictionary,
  (organizations) => Object.values(organizations),
)
export const selectOrganizationsLoading = (state: RootState) =>
  state.organizations.loading

export default organizationsSlice.reducer

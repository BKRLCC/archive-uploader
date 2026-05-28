import {
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { Geometry } from '../types/types'
import type { RootState } from './store'

type LocalitiesDictionary = Record<string, Geometry>

export type LocalitiesState = {
  loading: boolean
  localities: LocalitiesDictionary
}

const initialState: LocalitiesState = {
  loading: false,
  localities: {},
}

const localitiesSlice = createSlice({
  name: 'localities',
  initialState,
  reducers: {
    setLocalities(state, action: PayloadAction<Geometry[]>) {
      const next: LocalitiesDictionary = {}
      action.payload.forEach((locality) => {
        next[locality['@id']] = locality
      })
      state.localities = next
    },
    setLocalitiesLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setLocalities, setLocalitiesLoading } = localitiesSlice.actions

const selectLocalitiesDictionary = (state: RootState) =>
  state.localities.localities

export const selectLocalities = createSelector(
  selectLocalitiesDictionary,
  (items) => Object.values(items),
)

export const selectLocalitiesLoading = (state: RootState) =>
  state.localities.loading

export default localitiesSlice.reducer

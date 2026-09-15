import {
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { CollectionSummary } from '../types/types'
import type { RootState } from './store'

export type CollectionsState = {
  loading: boolean
  collections: CollectionSummary[]
}

const initialState: CollectionsState = {
  loading: false,
  collections: [],
}

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    setCollections(state, action: PayloadAction<CollectionSummary[]>) {
      state.collections = action.payload
    },
    setCollectionsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setCollections, setCollectionsLoading } =
  collectionsSlice.actions

export const selectCollections = createSelector(
  (state: RootState) => state.collections.collections,
  (collections) => collections,
)

export const selectCollectionsLoading = (state: RootState) =>
  state.collections.loading

export default collectionsSlice.reducer

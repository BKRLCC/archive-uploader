import {
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { Place } from '../types/types'
import type { RootState } from './store'

type PlacesDictionary = Record<string, Place>

export type PlacesState = {
  loading: boolean
  places: PlacesDictionary
}

const initialState: PlacesState = {
  loading: false,
  places: {},
}

const placesSlice = createSlice({
  name: 'places',
  initialState,
  reducers: {
    setPlaces(state, action: PayloadAction<Place[]>) {
      const next: PlacesDictionary = {}
      action.payload.forEach((place) => {
        next[place['@id']] = place
      })
      state.places = next
    },
    setPlacesLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setPlaces, setPlacesLoading } = placesSlice.actions

const selectPlacesDictionary = (state: RootState) => state.places.places

export const selectPlaces = createSelector(selectPlacesDictionary, (items) =>
  Object.values(items),
)

export const selectPlacesLoading = (state: RootState) => state.places.loading

export default placesSlice.reducer

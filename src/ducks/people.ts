import { Person } from 'src/types/types'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from './root-reducer'

type PeopleDictionary = Record<string, Person>

export type PeopleState = {
  loading: boolean
  people: PeopleDictionary
}

export const initialState: PeopleState = {
  loading: false,
  people: {},
}

const peopleSlice = createSlice({
  name: 'people',
  initialState,
  reducers: {
    setPeople(state, action: PayloadAction<Person[]>) {
      const peopleArray = action.payload
      const peopleDict: PeopleDictionary = {}
      peopleArray.forEach((person) => {
        peopleDict[person['@id']] = person
      })
      state.people = peopleDict
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setPeople, setLoading } = peopleSlice.actions

// Selectors
export const selectPeople = (state: RootState) =>
  Object.values(state.people.people)
export const selectPeopleLoading = (state: RootState) => state.people.loading

export default peopleSlice.reducer

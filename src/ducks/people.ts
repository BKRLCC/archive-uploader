import { Person } from 'src/types/types'
import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './store'

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
    upsertPerson(state, action: PayloadAction<Person>) {
      const person = action.payload
      state.people[person['@id']] = person
    },
    removePeopleByIds(state, action: PayloadAction<string[]>) {
      action.payload.forEach((id) => {
        delete state.people[id]
      })
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setPeople, upsertPerson, removePeopleByIds, setLoading } =
  peopleSlice.actions

// Selectors
const selectPeopleDictionary = (state: RootState) => state.people.people
export const selectPeople = createSelector(selectPeopleDictionary, (people) =>
  Object.values(people),
)
export const selectPeopleLoading = (state: RootState) => state.people.loading

export default peopleSlice.reducer

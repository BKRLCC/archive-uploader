import { combineReducers } from '@reduxjs/toolkit'
import languagesReducer from './languages'
import localitiesReducer from './localities'
import organizationsReducer from './organizations'
import peopleReducer from './people'
import placesReducer from './places'
import tagsReducer from './tags'

const rootReducer = combineReducers({
  languages: languagesReducer,
  localities: localitiesReducer,
  organizations: organizationsReducer,
  people: peopleReducer,
  places: placesReducer,
  tags: tagsReducer,
})

export default rootReducer

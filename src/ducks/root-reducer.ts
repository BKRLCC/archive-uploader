import { combineReducers } from '@reduxjs/toolkit'
import languagesReducer from './languages'
import localitiesReducer from './localities'
import peopleReducer from './people'
import placesReducer from './places'
import tagsReducer from './tags'

const rootReducer = combineReducers({
  languages: languagesReducer,
  localities: localitiesReducer,
  people: peopleReducer,
  places: placesReducer,
  tags: tagsReducer,
})

export default rootReducer

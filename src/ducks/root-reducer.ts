import { combineReducers } from '@reduxjs/toolkit'
import languagesReducer from './languages'
import peopleReducer from './people'
import placesReducer from './places'
import tagsReducer from './tags'

const rootReducer = combineReducers({
  languages: languagesReducer,
  people: peopleReducer,
  places: placesReducer,
  tags: tagsReducer,
})

export default rootReducer

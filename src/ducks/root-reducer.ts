import { combineReducers } from '@reduxjs/toolkit'
import collectionsReducer from './collections'
import languagesReducer from './languages'
import licensesReducer from './licenses'
import organizationsReducer from './organizations'
import peopleReducer from './people'
import placesReducer from './places'
import tagsReducer from './tags'

const rootReducer = combineReducers({
  collections: collectionsReducer,
  languages: languagesReducer,
  licenses: licensesReducer,
  organizations: organizationsReducer,
  people: peopleReducer,
  places: placesReducer,
  tags: tagsReducer,
})

export default rootReducer

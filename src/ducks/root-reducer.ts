import { combineReducers } from '@reduxjs/toolkit'
import languagesReducer from './languages'
import peopleReducer from './people'
import tagsReducer from './tags'

const rootReducer = combineReducers({
  languages: languagesReducer,
  people: peopleReducer,
  tags: tagsReducer,
})

export default rootReducer

import { combineReducers } from '@reduxjs/toolkit'
import peopleReducer from './people'
import tagsReducer from './tags'

const rootReducer = combineReducers({
  people: peopleReducer,
  tags: tagsReducer,
})

export default rootReducer

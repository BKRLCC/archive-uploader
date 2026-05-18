import { combineReducers } from '@reduxjs/toolkit'
import peopleReducer from './people'

const rootReducer = combineReducers({
  people: peopleReducer,
})

export default rootReducer

import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './root-reducer'

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
})

if (process.env.NODE_ENV === 'development' && (module as any).hot) {
  ;(module as any).hot.accept('./root-reducer', () => {
    const newRootReducer = require('./root-reducer').default
    store.replaceReducer(newRootReducer)
  })
}

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export default store

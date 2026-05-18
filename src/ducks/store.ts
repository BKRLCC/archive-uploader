import { configureStore, Action } from "@reduxjs/toolkit";
import rootReducer, { RootState } from "./root-reducer";
import thunk, { ThunkAction } from "redux-thunk";

const store = configureStore({
  reducer: rootReducer,
  middleware: [thunk],
});

if (process.env.NODE_ENV === "development" && (module as any).hot) {
  (module as any).hot.accept("./root-reducer", () => {
    const newRootReducer = require("./root-reducer").default;
    store.replaceReducer(newRootReducer);
  });
}
export type AppDispatch = typeof store.dispatch;
export type AppThunk = ThunkAction<void, RootState, null, Action<string>>;
export default store;

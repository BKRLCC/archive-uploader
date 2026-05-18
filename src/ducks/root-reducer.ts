import { combineReducers, AnyAction } from "@reduxjs/toolkit";
import peopleSlice, { PeopleState } from "./people";
import { useSelector as useReduxSelector, TypedUseSelectorHook } from "react-redux";

export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

type GlobalState =
  | {
      people: PeopleState;
    }
  | undefined;

const appReducer = combineReducers({
  people: peopleSlice.reducer
});

export const rootReducer = (state: GlobalState, action: AnyAction) => {
  return appReducer(state, action);
};

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;

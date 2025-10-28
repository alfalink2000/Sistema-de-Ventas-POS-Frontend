// reducers/usersReducer.js
import { types } from "../types/types";

const initialState = {
  users: [],
  loading: false,
  error: null,
};

export const usersReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.usersStartLoading:
      return {
        ...state,
        loading: true,
      };

    case types.usersFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.usersLoad:
      return {
        ...state,
        users: action.payload,
        loading: false,
        error: null,
      };

    case types.userAddNew:
      return {
        ...state,
        users: [...state.users, action.payload],
      };

    case types.userUpdated:
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.payload.id ? action.payload : user
        ),
      };

    case types.userDeleted:
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload),
      };

    default:
      return state;
  }
};

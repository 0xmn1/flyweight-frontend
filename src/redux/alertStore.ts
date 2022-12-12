import { configureStore, createSlice } from '@reduxjs/toolkit';

type AlertStoreState = {
  variant: string | null,
  code: number | null,
  msgPrimary: string | null,
  msgSecondary: string | null,
};

export type AlertPayload = {
  variant: string,
  code: number,
  msgPrimary: string,
  msgSecondary: string | null
};

const initialState: AlertStoreState = {
  variant: null,
  code: null,
  msgPrimary: null,
  msgSecondary: null,
};

const slice = createSlice({
  name: 'alertStore',
  initialState,
  reducers: {
    alertSet: (state, action) => {
      const { variant, code, msgPrimary, msgSecondary } = action.payload;
      state.variant = variant;
      state.code = code;
      state.msgPrimary = msgPrimary;
      state.msgSecondary = msgSecondary;
    },
    alertClear: (state) => state = initialState,
  },
});

// Redux store for the alert banner
const alertStore = configureStore({
  reducer: slice.reducer,
});

const { alertSet, alertClear } = slice.actions;
export { alertStore, alertSet, alertClear };

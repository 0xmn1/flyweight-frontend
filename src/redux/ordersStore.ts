import { configureStore, createSlice } from '@reduxjs/toolkit';

type OrdersStoreState = {
  lastCheckedTimestamp: number | null,
};

const initialState: OrdersStoreState = {
  lastCheckedTimestamp: null,
};

const slice = createSlice({
  name: 'ordersStore',
  initialState,
  reducers: {
    checked: (state, action) => {
      state.lastCheckedTimestamp = action.payload.lastCheckedTimestamp;
    },
  },
});

const ordersStore = configureStore({
  reducer: slice.reducer,
});

const { checked } = slice.actions;
export { ordersStore, checked };

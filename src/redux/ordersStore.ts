import { configureStore, createSlice } from '@reduxjs/toolkit';

type OrdersStoreState = {
  lastCheckedTimestamp: number | null,
  isOrdersLoaded: boolean,
  isOrderDepositPending: boolean,
};

const initialState: OrdersStoreState = {
  lastCheckedTimestamp: null,
  isOrdersLoaded: false,
  isOrderDepositPending: false,
};

const slice = createSlice({
  name: 'ordersStore',
  initialState,
  reducers: {
    checked: (state, action) => {
      state.lastCheckedTimestamp = action.payload.lastCheckedTimestamp;
    },
    ordersLoaded: (state, action) => {
      state.isOrdersLoaded = action.payload.isOrdersLoaded;
    },
    depositPending: (state, action) => {
      state.isOrderDepositPending = action.payload.isOrderDepositPending;
    },
  },
});

// Redux store for user orders
const ordersStore = configureStore({
  reducer: slice.reducer,
});

const { checked, depositPending, ordersLoaded } = slice.actions;
export { ordersStore, checked, depositPending, ordersLoaded };

import { createSlice, configureStore } from '@reduxjs/toolkit';

const initialState = {
  networkId: process.env.REACT_APP_NETWORK_ID,
  account: null,
};

const slice = createSlice({
  name: 'connectionStore',
  initialState: initialState,
  reducers: {
    connected: (state, action) => {
      state.networkId = action.payload.networkId;
      state.account = action.payload.account;
    },
    disconnected: (state) => state = initialState,
  },
});

const connectionStore = configureStore({
  reducer: slice.reducer,
});

const { connected, disconnected } = slice.actions;
export { connectionStore, connected, disconnected };

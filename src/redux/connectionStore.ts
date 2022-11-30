import { configureStore, createSlice } from '@reduxjs/toolkit';

import { networkNames } from '../utils/networkMap';

type ConnectionStoreState = {
  networkId: string,
  account: string | null,
};

const initialState: ConnectionStoreState = {
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

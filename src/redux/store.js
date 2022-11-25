import { createSlice, configureStore } from '@reduxjs/toolkit';

const slice = createSlice({
    name: 'store',
    initialState: {
        networkId: null,
        account: null
    },
    reducers: {
        connected: (state, action) => {
            state.networkId = action.payload.networkId;
            state.account = action.payload.account;
        },
        disconnected: state => {
            state.networkId = null;
            state.account = null;
        }
    }
});

const store = configureStore({
    reducer: slice.reducer
});

const { connected, disconnected } = slice.actions;
export { store, connected, disconnected };

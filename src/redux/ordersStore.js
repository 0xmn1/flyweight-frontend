import { createSlice, configureStore } from '@reduxjs/toolkit';

const slice = createSlice({
    name: 'ordersStore',
    initialState: {
        lastCheckedTimestamp: null
    },
    reducers: {
        checked: (state, action) => {
            state.lastCheckedTimestamp = action.payload.lastCheckedTimestamp;
        }
    }
});

const ordersStore = configureStore({
    reducer: slice.reducer
});

const { checked } = slice.actions;
export { ordersStore, checked };

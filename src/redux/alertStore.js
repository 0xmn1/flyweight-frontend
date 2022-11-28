import { createSlice, configureStore } from '@reduxjs/toolkit';

const initialState = {
    variant: null,
    code: null,
    msgPrimary: null,
    msgSecondary: null
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
        alertClear: state => state = initialState
    }
});

const alertStore = configureStore({
    reducer: slice.reducer
});

const { alertSet, alertClear } = slice.actions;
export { alertStore, alertSet, alertClear };

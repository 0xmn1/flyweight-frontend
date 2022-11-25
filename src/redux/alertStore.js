import { createSlice, configureStore } from '@reduxjs/toolkit';

const slice = createSlice({
    name: 'alertStore',
    initialState: {
        variant: null,
        code: null,
        msgPrimary: null,
        msgSecondary: null
    },
    reducers: {
        alertSet: (state, action) => {
            const { variant, code, msgPrimary, msgSecondary } = action.payload; 
            state.variant = variant;
            state.code = code;
            state.msgPrimary = msgPrimary;
            state.msgSecondary = msgSecondary;
        }
    }
});

const alertStore = configureStore({
    reducer: slice.reducer
});

const { alertSet } = slice.actions;
export { alertStore, alertSet };

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isMobileMenuOpen: false,
    theme: 'light',
    language: 'en',
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleMobileMenu: (state) => {
            state.isMobileMenuOpen = !state.isMobileMenuOpen;
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        closeMobileMenu: (state) => {
            state.isMobileMenuOpen = false;
        },
        setLanguage: (state, action) => {
            state.language = action.payload;
        },
    },
});

export const { toggleMobileMenu, setTheme, closeMobileMenu, setLanguage } = uiSlice.actions;
export default uiSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

const CITY_KEY = 'ah_city';
const CITY_EXPIRY_KEY = 'ah_city_exp';

function saveCity(city) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CITY_KEY, city);
        localStorage.setItem(CITY_EXPIRY_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch { /* noop */ }
}

const initialState = {
    isMobileMenuOpen: false,
    theme: 'light',
    language: 'en',
    city: 'amsterdam',
    showCityModal: false,
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
        setCity: (state, action) => {
            state.city = action.payload;
            state.showCityModal = false;
            saveCity(action.payload);
        },
        openCityModal: (state) => {
            state.showCityModal = true;
        },
        closeCityModal: (state) => {
            state.showCityModal = false;
        },
    },
});

export const { toggleMobileMenu, setTheme, closeMobileMenu, setLanguage, setCity, openCityModal, closeCityModal } = uiSlice.actions;
export default uiSlice.reducer;

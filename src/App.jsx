import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { store } from './app/store';
import Layout from './components/layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';

// Lazy load pages for performance optimization
const Home = lazy(() => import('./pages/Home'));
const Contact = lazy(() => import('./pages/Contact'));
const RentOut = lazy(() => import('./pages/RentOut'));
const RentIn = lazy(() => import('./pages/RentIn'));
const Neighborhoods = lazy(() => import('./pages/Neighborhoods'));
const FAQ = lazy(() => import('./pages/FAQ'));
const About = lazy(() => import('./pages/About'));
const NeighborhoodDetail = lazy(() => import('./pages/NeighborhoodDetail'));
const DiscoverMore = lazy(() => import('./pages/DiscoverMore'));

// New pages from tobecreated
const Login = lazy(() => import('./pages/Login'));
const AppartementenSelectie = lazy(() => import('./pages/AppartementenSelectie'));
const Aanvraag = lazy(() => import('./pages/Aanvraag'));
const LetterOfIntent = lazy(() => import('./pages/LetterOfIntent'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: '#009B8A'
  }}>
    Loading...
  </div>
);

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Toaster position="top-center" richColors />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Routes with Layout (navbar/footer) */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="nl" element={<Home />} />
                <Route path="en" element={<Home />} />

                <Route path="en/rent-out" element={<RentOut />} />
                <Route path="nl/rent-out" element={<RentOut />} />
                <Route path="landlords" element={<RentOut />} />

                <Route path="en/rent-in" element={<RentIn />} />
                <Route path="nl/rent-in" element={<RentIn />} />
                <Route path="tenants" element={<RentIn />} />

                <Route path="en/neighborhoods" element={<Neighborhoods />} />
                <Route path="nl/neighborhoods" element={<Neighborhoods />} />
                <Route path="neighborhoods" element={<Neighborhoods />} />

                <Route path="en/neighborhood/:id" element={<NeighborhoodDetail />} />
                <Route path="nl/neighborhood/:id" element={<NeighborhoodDetail />} />

                <Route path="en/faq" element={<FAQ />} />
                <Route path="nl/faq" element={<FAQ />} />
                <Route path="faq" element={<FAQ />} />

                <Route path="en/about-us" element={<About />} />
                <Route path="nl/about-us" element={<About />} />
                <Route path="about" element={<About />} />

                <Route path="en/discover-more" element={<DiscoverMore />} />
                <Route path="nl/discover-more" element={<DiscoverMore />} />
                <Route path="discover-more" element={<DiscoverMore />} />

                <Route path="en/contact" element={<Contact />} />
                <Route path="nl/contact" element={<Contact />} />
                <Route path="contact" element={<Contact />} />

                {/* Legal pages */}
                <Route path="privacyverklaring" element={<PrivacyPage />} />
                <Route path="privacy-policy" element={<PrivacyPage />} />
                <Route path="en/privacy-policy" element={<PrivacyPage />} />
                <Route path="nl/privacyverklaring" element={<PrivacyPage />} />
                <Route path="nl/privacy-policy" element={<PrivacyPage />} />

                <Route path="algemene-voorwaarden" element={<TermsAndConditions />} />
                <Route path="terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="en/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="nl/algemene-voorwaarden" element={<TermsAndConditions />} />
                <Route path="nl/terms-and-conditions" element={<TermsAndConditions />} />

                {/* Login page (with navbar) */}
                <Route path="login" element={<Login />} />
                <Route path="en/login" element={<Login />} />
                <Route path="nl/login" element={<Login />} />

                {/* Protected Routes (require authentication) */}
                <Route path="aanvraag" element={
                  <ProtectedRoute>
                    <Aanvraag />
                  </ProtectedRoute>
                } />
                <Route path="application" element={
                  <ProtectedRoute>
                    <Aanvraag />
                  </ProtectedRoute>
                } />
                <Route path="en/application" element={
                  <ProtectedRoute>
                    <Aanvraag />
                  </ProtectedRoute>
                } />
                <Route path="nl/aanvraag" element={
                  <ProtectedRoute>
                    <Aanvraag />
                  </ProtectedRoute>
                } />
              </Route>

              <Route path="appartementen" element={<AppartementenSelectie />} />
              <Route path="apartments" element={<AppartementenSelectie />} />
              <Route path="en/apartments" element={<AppartementenSelectie />} />
              <Route path="nl/appartementen" element={<AppartementenSelectie />} />

              <Route path="letter-of-intent" element={
                <ProtectedRoute>
                  <LetterOfIntent />
                </ProtectedRoute>
              } />
              <Route path="intentieverklaring" element={
                <ProtectedRoute>
                  <LetterOfIntent />
                </ProtectedRoute>
              } />
              <Route path="en/letter-of-intent" element={
                <ProtectedRoute>
                  <LetterOfIntent />
                </ProtectedRoute>
              } />
              <Route path="nl/intentieverklaring" element={
                <ProtectedRoute>
                  <LetterOfIntent />
                </ProtectedRoute>
              } />

              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </Provider>
  );
}

export default App;


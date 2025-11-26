import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import Layout from './components/layout/Layout';

// Lazy load pages for performance optimization
const Home = lazy(() => import('./pages/Home'));
const Contact = lazy(() => import('./pages/Contact'));

const RentOut = lazy(() => import('./pages/RentOut'));
const RentIn = lazy(() => import('./pages/RentIn'));
const Neighborhoods = lazy(() => import('./pages/Neighborhoods'));
const FAQ = lazy(() => import('./pages/FAQ'));
const About = lazy(() => import('./pages/About'));
const NeighborhoodDetail = lazy(() => import('./pages/NeighborhoodDetail'));

// Placeholder components for other routes (can be lazy loaded as well when implemented)
const Login = () => <div style={{ padding: '2rem' }}>Login</div>;

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
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="nl" element={<Home />} />

              <Route path="en/rent-out" element={<RentOut />} />
              <Route path="nl/rent-out" element={<RentOut />} />
              <Route path="landlords" element={<RentOut />} /> {/* Alias for backward compatibility */}

              <Route path="en/rent-in" element={<RentIn />} />
              <Route path="nl/rent-in" element={<RentIn />} />
              <Route path="tenants" element={<RentIn />} /> {/* Alias for backward compatibility */}

              <Route path="en/neighborhoods" element={<Neighborhoods />} />
              <Route path="nl/neighborhoods" element={<Neighborhoods />} />
              <Route path="neighborhoods" element={<Neighborhoods />} /> {/* Alias for backward compatibility */}

              <Route path="en/neighborhood/:id" element={<NeighborhoodDetail />} />
              <Route path="nl/neighborhood/:id" element={<NeighborhoodDetail />} />

              <Route path="en/faq" element={<FAQ />} />
              <Route path="nl/faq" element={<FAQ />} />
              <Route path="faq" element={<FAQ />} /> {/* Alias for backward compatibility */}

              <Route path="en/about-us" element={<About />} />
              <Route path="nl/about-us" element={<About />} />
              <Route path="about" element={<About />} /> {/* Alias for backward compatibility */}

              <Route path="en/contact" element={<Contact />} />
              <Route path="nl/contact" element={<Contact />} />
              <Route path="contact" element={<Contact />} />

              <Route path="login" element={<Login />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </Provider>
  );
}

export default App;

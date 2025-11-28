import React from 'react';
import HeroSection from '../features/home/components/HeroSection';
import ServiceSection from '../features/home/components/ServiceSection';
import WhyChooseUsSection from '../features/home/components/WhyChooseUsSection';
import NeighborhoodSection from '../features/home/components/NeighborhoodSection';
import TestimonialSection from '../features/home/components/TestimonialSection';

import styles from './Home.module.css';

const Home = () => {
    return (
        <div className={styles.container}>
            <HeroSection />
            <ServiceSection />
            <WhyChooseUsSection />
            <NeighborhoodSection />
            <TestimonialSection />
        </div>
    );
};

export default Home;
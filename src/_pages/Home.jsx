'use client';

import React from 'react';
import HeroSection from '../features/home/components/HeroSection';
import ServiceSection from '../features/home/components/ServiceSection';
import WhyChooseUsSection from '../features/home/components/WhyChooseUsSection';
import NeighborhoodSection from '../features/home/components/NeighborhoodSection';
import AmsterdamGuideSection from '../features/home/components/AmsterdamGuideSection';
import TestimonialSection from '../features/home/components/TestimonialSection';
import LocalBusinessSchema from '../components/seo/LocalBusinessSchema';

import styles from './Home.module.css';

const Home = () => {
    return (
        <div className={styles.container}>
            <LocalBusinessSchema />
            <HeroSection />
            <ServiceSection />
            <WhyChooseUsSection />
            <NeighborhoodSection />
            <AmsterdamGuideSection />
            <TestimonialSection />
        </div>
    );
};

export default Home;
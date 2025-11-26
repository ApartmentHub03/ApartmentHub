import React from 'react';
import HeroSection from '../features/home/components/HeroSection';
import ServiceSection from '../features/home/components/ServiceSection';
import WhyChooseUsSection from '../features/home/components/WhyChooseUsSection';
import NeighborhoodSection from '../features/home/components/NeighborhoodSection';
import TestimonialSection from '../features/home/components/TestimonialSection';

const Home = () => {
    return (
        <main className="flex-grow">
            <div className="min-h-screen bg-white">
                <HeroSection />
                <ServiceSection />
                <WhyChooseUsSection />
                <NeighborhoodSection />
                <TestimonialSection />
            </div>
        </main>
    );
};

export default Home;
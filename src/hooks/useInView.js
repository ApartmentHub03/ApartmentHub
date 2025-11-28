import { useState, useEffect, useRef } from 'react';

const useInView = (options = {}) => {
    const [isInView, setIsInView] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsInView(true);
                // Once visible, we can disconnect if we only want to trigger once
                if (options.triggerOnce) {
                    observer.disconnect();
                }
            } else if (!options.triggerOnce) {
                setIsInView(false);
            }
        }, options);

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [options.threshold, options.rootMargin, options.triggerOnce]);

    return [ref, isInView];
};

export default useInView;

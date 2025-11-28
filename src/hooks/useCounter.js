import { useState, useEffect } from 'react';

const useCounter = (end, duration = 2000, shouldStart = true) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!shouldStart) return;

        let startTime = null;
        let animationFrameId;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Easing function (easeOutExpo) for smoother animation
            const easeOut = (x) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);

            const currentCount = Math.floor(end * easeOut(percentage));
            setCount(currentCount);

            if (progress < duration) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [end, duration, shouldStart]);

    return count;
};

export default useCounter;

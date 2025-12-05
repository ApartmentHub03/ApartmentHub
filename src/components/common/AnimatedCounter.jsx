import React from 'react';
import useCounter from '../../hooks/useCounter';

const AnimatedCounter = ({ end, duration = 2000, shouldStart = true, prefix = '', suffix = '' }) => {
    const count = useCounter(end, duration, shouldStart);

    // Format number with German locale if it's large (like 10.164)
    const formattedCount = count > 999 ? count.toLocaleString('de-DE') : count;

    return (
        <>
            {prefix}{formattedCount}{suffix}
        </>
    );
};

export default AnimatedCounter;

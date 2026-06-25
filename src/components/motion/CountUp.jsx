'use client';

import { useEffect, useRef, useState } from 'react';

const CountUp = ({ to, duration = 1.5, format, className }) => {
  const ref = useRef(null);
  const [value, setValue] = useState(to);
  const startedRef = useRef(false);

  useEffect(() => {
    setValue(to);
  }, [to]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        observer.disconnect();

        setValue(0);
        const start = performance.now();
        const ms = duration * 1000;

        const tick = (now) => {
          const t = Math.min(1, (now - start) / ms);
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(to * eased);
          if (t < 1) requestAnimationFrame(tick);
          else setValue(to);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration]);

  return <span ref={ref} className={className}>{format ? format(Math.round(value)) : Math.round(value)}</span>;
};

export default CountUp;
import React from 'react';

const Cross = ({ x }) => (
    <g stroke="#ffffff" strokeWidth="2" strokeLinecap="square">
        <line x1={x - 3} y1={17} x2={x + 3} y2={23} />
        <line x1={x - 3} y1={23} x2={x + 3} y2={17} />
    </g>
);

export const AmsterdamFlag = ({ className }) => (
    <svg viewBox="0 0 60 40" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vlag van Amsterdam">
        <rect x="0" y="0" width="60" height="13" fill="#000000" />
        <rect x="0" y="13" width="60" height="14" fill="#ce1126" />
        <rect x="0" y="27" width="60" height="13" fill="#000000" />
        <Cross x={15} />
        <Cross x={30} />
        <Cross x={45} />
        <rect x="0.5" y="0.5" width="59" height="39" fill="none" stroke="#d4d4d4" strokeWidth="1" />
    </svg>
);

export const UtrechtFlag = ({ className }) => (
    <svg viewBox="0 0 60 40" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vlag van Utrecht">
        <rect x="0" y="0" width="60" height="40" fill="#ffffff" />
        <polygon points="0,0 60,0 0,40" fill="#ce1126" />
        <rect x="0.5" y="0.5" width="59" height="39" fill="none" stroke="#d4d4d4" strokeWidth="1" />
    </svg>
);
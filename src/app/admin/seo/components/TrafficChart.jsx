'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import styles from '../seo.module.css';

function formatDate(value) {
    if (!value) return '';
    // GA4 returns YYYYMMDD, GSC returns YYYY-MM-DD
    const normalized =
        value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return value;
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TrafficChart({ data, title, lines }) {
    if (!data || data.length === 0) {
        return (
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>{title}</h3>
                <div className={styles.empty}>No data available yet</div>
            </div>
        );
    }

    const formattedData = data.map((d) => ({ ...d, displayDate: formatDate(d.date) }));

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{title}</h3>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="displayDate" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                        {lines.map((line) => (
                            <Line
                                key={line.key}
                                type="monotone"
                                dataKey={line.key}
                                name={line.label}
                                stroke={line.color}
                                strokeWidth={2}
                                dot={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

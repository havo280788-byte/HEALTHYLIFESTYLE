import React from 'react';

// --- Bar Chart ---
interface BarChartProps {
    data: { label: string; value: number }[]; // value 0-100
    color: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, color }) => {
    const height = 150;
    const width = 300;
    const barWidth = 20;
    const gap = 10;
    const maxBarHeight = 120; // Leave space for labels

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {data.map((d, i) => {
                const barH = (d.value / 100) * maxBarHeight;
                const x = i * (barWidth + gap) + 10;
                const y = height - barH - 20; // 20px for text
                return (
                    <g key={i}>
                        <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barH}
                            fill={color}
                            rx={4}
                            className="hover:opacity-80 transition-opacity"
                        />
                        <text
                            x={x + barWidth / 2}
                            y={height - 5}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#94a3b8"
                        >
                            {d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// --- Donut Chart ---
interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
    const size = 150;
    const center = size / 2;
    const radius = 60;
    const strokeWidth = 20;
    const circumference = 2 * Math.PI * radius;

    let currentOffset = 0;
    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    // If total is 0, render empty gray ring
    if (total === 0) {
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
            </svg>
        )
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 transform">
                {data.map((d, i) => {
                    const percentage = d.value / total;
                    const length = percentage * circumference;
                    const offset = currentOffset;
                    currentOffset -= length; // Update for next segment (SVG strokes go counter-clockwise if negative offset?)
                    // Actually stroke-dashoffset: The distance into the dash pattern to start the dash.

                    return (
                        <circle
                            key={i}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={d.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${length} ${circumference}`}
                            strokeDashoffset={-1 * (circumference + offset)} // Adjust logic for simple start
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>
            {/* Legend built separate for simplicity usually, but here we can just do tooltips or side legend in parent */}
        </div>
    );
};

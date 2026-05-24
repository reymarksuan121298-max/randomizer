// Shared color mapping for draw times across all components
// This ensures filter buttons and ticket cards use identical colors
// Using hex colors to avoid Tailwind JIT purge issues

export interface DrawTimeColors {
    // Raw hex values for inline styles
    borderColor: string;
    bgColor: string;
    bgColorLight: string;
    textColor: string;
    textColorDim: string;
}

export const DRAW_TIME_COLORS: Record<string, DrawTimeColors> = {
    '10:30 AM': {
        borderColor: '#047857', // emerald-700
        bgColor: 'rgba(6, 95, 70, 0.3)', // emerald-800/30
        bgColorLight: '#059669', // emerald-600
        textColor: '#6ee7b7', // emerald-300
        textColorDim: 'rgba(52, 211, 153, 0.8)', // emerald-400/80
    },
    '11:00 AM': {
        borderColor: '#0f766e', // teal-700
        bgColor: 'rgba(17, 94, 89, 0.3)', // teal-800/30
        bgColorLight: '#0d9488', // teal-600
        textColor: '#5eead4', // teal-300
        textColorDim: 'rgba(45, 212, 191, 0.8)', // teal-400/80
    },
    '2:00 PM': {
        borderColor: '#1d4ed8', // blue-700
        bgColor: 'rgba(30, 58, 138, 0.3)', // blue-900/30
        bgColorLight: '#2563eb', // blue-600
        textColor: '#93c5fd', // blue-300
        textColorDim: 'rgba(96, 165, 250, 0.8)', // blue-400/80
    },
    '3:00 PM': {
        borderColor: '#6d28d9', // violet-700
        bgColor: 'rgba(76, 29, 149, 0.3)', // violet-900/30
        bgColorLight: '#7c3aed', // violet-600
        textColor: '#c4b5fd', // violet-300
        textColorDim: 'rgba(167, 139, 250, 0.8)', // violet-400/80
    },
    '5:00 PM': {
        borderColor: '#7e22ce', // purple-700
        bgColor: 'rgba(88, 28, 135, 0.3)', // purple-900/30
        bgColorLight: '#9333ea', // purple-600
        textColor: '#d8b4fe', // purple-300
        textColorDim: 'rgba(192, 132, 252, 0.8)', // purple-400/80
    },
    '7:00 PM': {
        borderColor: '#a21caf', // fuchsia-700
        bgColor: 'rgba(112, 26, 117, 0.3)', // fuchsia-900/30
        bgColorLight: '#c026d3', // fuchsia-600
        textColor: '#f0abfc', // fuchsia-300
        textColorDim: 'rgba(232, 121, 249, 0.8)', // fuchsia-400/80
    },
    '8:00 PM': {
        borderColor: '#be123c', // rose-700
        bgColor: 'rgba(136, 19, 55, 0.3)', // rose-900/30
        bgColorLight: '#e11d48', // rose-600
        textColor: '#fda4af', // rose-300
        textColorDim: 'rgba(251, 113, 133, 0.8)', // rose-400/80
    },
    '9:00 PM': {
        borderColor: '#c2410c', // orange-700
        bgColor: 'rgba(124, 45, 18, 0.3)', // orange-900/30
        bgColorLight: '#ea580c', // orange-600
        textColor: '#fdba74', // orange-300
        textColorDim: 'rgba(251, 146, 60, 0.8)', // orange-400/80
    },
};

export const DEFAULT_DRAW_TIME_COLORS: DrawTimeColors = {
    borderColor: '#334155', // slate-700
    bgColor: 'rgba(30, 41, 59, 0.3)', // slate-800/30
    bgColorLight: '#475569', // slate-600
    textColor: '#cbd5e1', // slate-300
    textColorDim: 'rgba(148, 163, 184, 0.8)', // slate-400/80
};

export function getDrawTimeColor(time: string): DrawTimeColors {
    return DRAW_TIME_COLORS[time] || DEFAULT_DRAW_TIME_COLORS;
}

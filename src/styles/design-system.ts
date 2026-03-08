// Design System Configuration
export const designSystem = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },
  borderRadius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
  },
};

// Component Styles
export const cardStyles = {
  base: 'bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow',
  compact: 'bg-white rounded-md border border-gray-200 shadow-sm',
  elevated: 'bg-white rounded-lg shadow-lg border-0',
};

export const buttonStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 transition-colors',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg px-4 py-2 transition-colors',
  outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-4 py-2 transition-colors',
  ghost: 'hover:bg-gray-100 text-gray-700 font-medium rounded-lg px-4 py-2 transition-colors',
};

export const badgeStyles = {
  success: 'bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium',
  warning: 'bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-medium',
  danger: 'bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-medium',
  info: 'bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium',
  neutral: 'bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium',
};

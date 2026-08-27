/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core AESCION Palette
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          pressed: '#1E40AF',
          light: '#EFF6FF',
          soft: '#DBEAFE',
          border: '#BFDBFE'
        },
        accent: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
          light: '#FFF7ED',
          border: '#FED7AA',
          text: '#C2410C'
        },
        // Application Canvas & Surfaces
        canvas: {
          DEFAULT: '#F7F9FC',
          subtle: '#F8FAFC',
          light: '#FBFCFE'
        },
        surface: {
          card: '#FFFFFF',
          subtle: '#FAFBFC',
          muted: '#F1F5F9'
        },
        // Structured Borders
        border: {
          DEFAULT: '#E2E8F0',
          subtle: '#EDF1F5',
          input: '#CBD5E1',
          hover: '#94A3B8'
        },
        // Typography Colors
        content: {
          heading: '#0F172A',
          subheading: '#1E293B',
          body: '#334155',
          secondary: '#64748B',
          muted: '#94A3B8',
          disabled: '#B6C0CE',
          inverse: '#FFFFFF'
        },
        // Status Semantics
        status: {
          success: '#10B981',
          successText: '#047857',
          successBg: '#ECFDF5',
          successBorder: '#A7F3D0',

          danger: '#EF4444',
          dangerText: '#B91C1C',
          dangerBg: '#FEF2F2',
          dangerBorder: '#FECACA',

          warning: '#F59E0B',
          warningText: '#B45309',
          warningBg: '#FFFBEB',
          warningBorder: '#FDE68A',

          info: '#3B82F6',
          infoText: '#1D4ED8',
          infoBg: '#EFF6FF',
          infoBorder: '#BFDBFE',

          purple: '#8B5CF6',
          purpleText: '#6D28D9',
          purpleBg: '#F5F3FF',
          purpleBorder: '#DDD6FE',

          neutral: '#64748B',
          neutralText: '#475569',
          neutralBg: '#F1F5F9',
          neutralBorder: '#E2E8F0'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        'card': '0 1px 2px rgba(15, 23, 42, 0.035)',
        'card-elevated': '0 2px 6px rgba(15, 23, 42, 0.055)',
        'dropdown': '0 4px 12px rgba(15, 23, 42, 0.08)'
      },
      borderRadius: {
        'card': '8px',
        'input': '6px',
        'badge': '6px'
      }
    },
  },
  plugins: [],
}

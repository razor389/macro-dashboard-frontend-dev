// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html"
    ],
    theme: {
      extend: {
        colors: {
          // You can add custom colors here if needed
        },
      },
    },
    plugins: [],
    // Ensure all Tailwind classes are included in development
    safelist: [
      'bg-white',
      'bg-gray-50',
      'text-blue-600',
      'text-gray-600',
      'shadow-sm',
      'shadow-lg'
    ]
  }
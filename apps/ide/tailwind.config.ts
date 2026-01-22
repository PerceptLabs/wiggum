import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include the @wiggum/stack component library
    "../../packages/stack/src/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist critical Dialog/positioning classes and neobrutalism styles
  safelist: [
    // Positioning
    'fixed',
    'inset-0',
    'z-50',
    'left-[50%]',
    'top-[50%]',
    'translate-x-[-50%]',
    'translate-y-[-50%]',
    '-translate-x-1/2',
    '-translate-y-1/2',
    // Animation states
    'data-[state=open]:animate-in',
    'data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0',
    'data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95',
    'data-[state=open]:zoom-in-95',
    // Neobrutalism borders
    'border-2',
    'border-3',
    'border-b-2',
    'border-b-3',
    'border-r-3',
    'border-l-3',
    'border-t-3',
    // Neobrutalism shadows (light mode - black)
    'shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
    'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
    'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
    'shadow-[0_4px_0px_0px_rgba(0,0,0,1)]',
    // Neobrutalism shadows (dark mode - yellow)
    'dark:shadow-[1px_1px_0px_0px_hsl(50,100%,53%)]',
    'dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]',
    'dark:shadow-[3px_3px_0px_0px_hsl(50,100%,53%)]',
    'dark:shadow-[4px_4px_0px_0px_hsl(50,100%,53%)]',
    'dark:shadow-[6px_6px_0px_0px_hsl(50,100%,53%)]',
    'dark:shadow-[8px_8px_0px_0px_hsl(50,100%,53%)]',
    'dark:shadow-[0_4px_0px_0px_hsl(50,100%,53%)]',
    // Hover shadow states
    'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    'hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
    'dark:hover:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]',
    'dark:hover:shadow-[3px_3px_0px_0px_hsl(50,100%,53%)]',
    // Focus shadow states
    'focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    'dark:focus:shadow-[4px_4px_0px_0px_hsl(50,100%,53%)]',
    // Interactive translations
    'hover:translate-x-[2px]',
    'hover:translate-y-[2px]',
    'hover:translate-x-[-1px]',
    'hover:translate-y-[-1px]',
    'hover:translate-x-[-2px]',
    'hover:translate-y-[-2px]',
    'active:translate-x-[2px]',
    'active:translate-y-[2px]',
    'active:translate-x-[4px]',
    'active:translate-y-[4px]',
    'focus:translate-x-[-2px]',
    'focus:translate-y-[-2px]',
    // Tab active states
    'data-[state=active]:bg-primary',
    'data-[state=active]:border-2',
    'data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    'dark:data-[state=active]:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]',
  ],
} satisfies Config

/// <reference types="vite/client" />

// Type declarations for ?raw imports
declare module '*.md?raw' {
  const content: string
  export default content
}

declare module '*?raw' {
  const content: string
  export default content
}

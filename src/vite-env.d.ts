/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.svg?raw" {
  const content: string;
  export default content;
}

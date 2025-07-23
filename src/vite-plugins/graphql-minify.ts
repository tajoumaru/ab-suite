import type { Plugin } from "vite";

/**
 * Minifies GraphQL queries by removing unnecessary whitespace and comments
 */
function minifyGraphQLQuery(query: string): string {
  return (
    query
      // Remove comments
      .replace(/#.*$/gm, "")
      // Remove multiple whitespace characters
      .replace(/\s+/g, " ")
      // Remove whitespace around special characters
      .replace(/\s*([{}(),:]+)\s*/g, "$1")
      // Remove leading/trailing whitespace
      .trim()
  );
}

/**
 * Vite plugin to minify GraphQL template literals marked with gql comments
 */
export function graphqlMinifyPlugin(): Plugin {
  return {
    name: "graphql-minify",
    enforce: "pre",
    transform(code, id) {
      // Only process TypeScript/JavaScript files
      if (!id.match(/\.[jt]sx?$/)) {
        return null;
      }

      // Only minify in production/minified builds
      const isMinified = process.env.BUILD_MODE === "minified";
      if (!isMinified) {
        return null;
      }

      // Only process files that contain gql comments
      if (!code.includes("/*gql*/")) {
        return null;
      }

      // Look for /*gql*/ template literals - handle both with and without space after comment
      const graphqlRegex = /\/\*gql\*\/\s*`([^`]*)`/gs;

      let hasChanges = false;
      const transformedCode = code.replace(graphqlRegex, (_, query) => {
        hasChanges = true;
        const minifiedQuery = minifyGraphQLQuery(query);
        return `/*gql*/\`${minifiedQuery}\``;
      });

      return hasChanges ? { code: transformedCode } : null;
    },
  };
}

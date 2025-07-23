import path from "node:path";
import preact from "@preact/preset-vite";
import UnoCSS from 'unocss/vite';
import { defineConfig, type Plugin } from "vite";
import monkey, { cdn } from 'vite-plugin-monkey';
import pkg from "./package.json";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    UnoCSS(),
    graphqlMinifyPlugin(),
    preact(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: "abs",
        description: pkg.description,
        author: pkg.author,
        version: pkg.version,
        icon: "https://animebytes.tv/favicon.ico",
        namespace: "https://github.com/tajoumaru",
        homepage: pkg.homepage,
        supportURL: `${pkg.homepage}/issues`,
        updateURL: `${pkg.homepage}/releases/latest/download/ab-suite.min.user.js`,
        downloadURL: `${pkg.homepage}/releases/latest/download/ab-suite.min.user.js`,
        match: [
          "https://animebytes.tv/*",
          "https://anilist.co/*",
          "https://releases.moe/*",
          "https://www.youtube-nocookie.com/*",
          "https://www.youtube.com/*",
        ],
        connect: [
          "releases.moe",
          "ids.moe",
          "api.simkl.com",
          "api.themoviedb.org",
          "www.imdb.com",
          "api.jikan.moe",
          "api.anidb.net",
          "graphql.anilist.co",
          "kitsu.app",
        ],
        'run-at': "document-start",
        grant: [
          "GM_addStyle",
          "GM_setValue",
          "GM_getValue",
          "GM_listValues",
          "GM_deleteValue",
          "GM_xmlhttpRequest",
          "GM_addElement",
        ],
      },
      build: {
        externalGlobals: {
          preact: cdn.jsdelivr('preact', 'dist/preact.min.js'),
        },
      },
    }),
  ],
});

/**
 * Vite plugin to minify GraphQL template literals marked with gql comments
 */
export function graphqlMinifyPlugin(): Plugin {
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

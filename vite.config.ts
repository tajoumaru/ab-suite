import path from "node:path";
import preact from "@preact/preset-vite";
import { defineConfig } from "rolldown-vite";
import pkg from "./package.json";
import {
  cssInjectionPlugin,
  graphqlMinifyPlugin,
  type UserscriptMeta,
  userscriptHeaderPlugin,
} from "./src/vite-plugins";

// Function to create build configuration
function createBuildConfig(isMinified: boolean) {
  const fileName = isMinified ? "ab-suite.min.user.js" : "ab-suite.user.js";

  const userscriptMeta: UserscriptMeta = {
    name: "animebytes Suite",
    description: pkg.description,
    author: pkg.author,
    version: pkg.version,
    icon: "https://animebytes.tv/favicon.ico",
    namespace: "https://github.com/tajoumaru",
    homepageURL: pkg.homepage,
    supportURL: `${pkg.homepage}/issues`,
    updateURL: `${pkg.homepage}/releases/latest/download/${fileName}`,
    downloadURL: `${pkg.homepage}/releases/latest/download/${fileName}`,
    match: [
      "https://animebytes.tv/*",
      "https://anilist.co/*",
      "https://releases.moe/*",
      "https://www.youtube-nocookie.com/*",
      "https://www.youtube.com/*",
    ],
    connect: [
      "releases.moe",
      "anime-api-tajoumarus-projects.vercel.app",
      "api.simkl.com",
      "api.themoviedb.org",
      "www.imdb.com",
      "api.jikan.moe",
      "api.anidb.net",
      "graphql.anilist.co",
      "kitsu.app",
    ],
    runAt: "document-idle",
    grant: [
      "GM_addStyle",
      "GM_setValue",
      "GM_getValue",
      "GM_listValues",
      "GM_deleteValue",
      "GM_xmlhttpRequest",
      "GM_addElement",
    ],
  };

  return defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    plugins: [
      preact(),
      cssInjectionPlugin({ minify: isMinified }),
      userscriptHeaderPlugin(userscriptMeta, fileName),
      graphqlMinifyPlugin(),
    ],
    build: {
      emptyOutDir: !isMinified,
      lib: {
        entry: "src/main.tsx",
        name: "ab-suite",
        formats: ["iife"],
        fileName: () => fileName,
      },
      rollupOptions: {
        external: [
          // Exclude GM_* APIs from bundling
          /^GM_/,
          "GM",
          "unsafeWindow",
        ],
        output: {
          globals: {
            // Map external dependencies to global variables
            GM_addStyle: "GM_addStyle",
            GM_setValue: "GM_setValue",
            GM_getValue: "GM_getValue",
            GM_listValues: "GM_listValues",
            GM_deleteValue: "GM_deleteValue",
            GM_xmlhttpRequest: "GM_xmlhttpRequest",
            GM_addElement: "GM_addElement",
            GM: "GM",
            unsafeWindow: "unsafeWindow",
          },
          extend: true,
          minify: isMinified
            ? {
                mangle: true,
                compress: true,
                removeWhitespace: true,
              }
            : false,
        },
      },
      cssCodeSplit: false,
      assetsDir: "",
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });
}

// Check if we're building the minified version
const isMinified = process.env.BUILD_MODE === "minified";
export default createBuildConfig(isMinified);

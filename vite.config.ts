import path from "node:path";
import preact from "@preact/preset-vite";
import { defineConfig } from "rolldown-vite";
import pkg from "./package.json";
import { cssInjectionPlugin, type UserscriptMeta, userscriptHeaderPlugin } from "./src/vite-plugins";

// Userscript metadata
const userscriptMeta: UserscriptMeta = {
  name: "AnimeBytes Suite",
  description: pkg.description,
  author: pkg.author,
  version: pkg.version,
  icon: "https://animebytes.tv/favicon.ico",
  namespace: "https://github.com/tajoumaru",
  homepageURL: pkg.homepage,
  supportURL: `${pkg.homepage}/issues`,
  updateURL: `${pkg.homepage}/releases/latest/download/ab-suite.user.js`,
  downloadURL: `${pkg.homepage}/releases/latest/download/ab-suite.user.js`,
  match: ["https://animebytes.tv/*", "https://anilist.co/*", "https://releases.moe/*"],
  connect: ["releases.moe"],
  runAt: "document-idle",
  grant: ["GM_addStyle", "GM_setValue", "GM_getValue", "GM_xmlhttpRequest"],
};

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [preact(), cssInjectionPlugin(), userscriptHeaderPlugin(userscriptMeta)],
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "ab-suite",
      formats: ["iife"],
      fileName: () => "ab-suite.user.js",
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
          GM_xmlhttpRequest: "GM_xmlhttpRequest",
          GM: "GM",
          unsafeWindow: "unsafeWindow",
        },
        extend: true,
        minify: {
          mangle: true,
          compress: true,
          removeWhitespace: true,
        },
      },
    },
    cssCodeSplit: false,
    assetsDir: "",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

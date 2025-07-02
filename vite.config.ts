import path from "node:path";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    preact(),
    monkey({
      entry: "src/main.tsx",
      userscript: {
        name: "AnimeBytes Suite",
        description: "A suite of userscripts for AnimeBytes.",
        author: "tajoumaru",
        version: "0.1.0",
        icon: "https://animebytes.tv/favicon.ico",
        namespace: "https://github.com/tajoumaru",
        homepageURL: "https://github.com/tajoumaru/absuite",
        supportURL: "https://github.com/tajoumaru/absuite/issues",
        updateURL: "https://github.com/tajoumaru/absuite/releases/latest/download/absuite.user.js",
        downloadURL: "https://github.com/tajoumaru/absuite/releases/latest/download/absuite.user.js",
        match: ["https://animebytes.tv/*", "https://anilist.co/*", "https://releases.moe/*"],
        connect: ["releases.moe"],
        "run-at": "document-idle",
        grant: ["GM_addStyle", "GM_setValue", "GM_getValue", "GM_xmlhttpRequest"],
        require: [
          "https://cdnjs.cloudflare.com/ajax/libs/preact/10.26.9/preact.umd.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/preact/10.26.9/hooks.umd.min.js",
        ],
      },
      server: {
        open: true,
      },
      build: {
        autoGrant: true,
        externalGlobals: {
          preact: "preact",
          "preact/hooks": "preactHooks",
        },
      },
    }),
  ],
});

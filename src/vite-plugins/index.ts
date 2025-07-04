import { transform as lightningcss } from "lightningcss";
import type { Plugin } from "rolldown-vite";

// Plugin to inject CSS into JS for userscripts
export function cssInjectionPlugin(): Plugin {
  let collectedCSS = "";

  return {
    name: "css-injection",
    load(id: string) {
      // Intercept CSS imports and collect them
      if (id.endsWith(".css")) {
        return null; // Let the default loader handle it, but we'll track it
      }
    },
    transform(code: string, id: string) {
      // Look for CSS imports in the code and track them
      if (id.endsWith(".css")) {
        collectedCSS += `${code}\n`;
        return `export default ${JSON.stringify(code)};`; // Export as string to prevent embedding
      }
    },
    generateBundle(_options, bundle) {
      // Minify the CSS
      const { code } = lightningcss({
        filename: "ab-suite.user.css",
        code: Buffer.from(collectedCSS),
        minify: true,
      });
      const minifiedCSS = code.toString();

      // Find the main JS chunk
      const jsChunks = Object.entries(bundle).filter(([_, chunk]) => chunk.type === "chunk" && chunk.isEntry);

      if (jsChunks.length > 0 && minifiedCSS.length > 0) {
        const [_, mainChunk] = jsChunks[0];

        if (mainChunk.type === "chunk") {
          // Generate CSS injection code
          const cssInjectionCode = `(t=>{if(typeof GM_addStyle=="function"){GM_addStyle(t);return}const e=document.createElement("style");e.textContent=t,document.head.append(e)})(${JSON.stringify(minifiedCSS)});`;

          // Inject CSS at the beginning of the chunk
          mainChunk.code = `${cssInjectionCode}\n${mainChunk.code}`;
        }
      }

      // Remove any CSS assets from the bundle
      const cssAssets = Object.keys(bundle).filter(
        (fileName) => bundle[fileName].type === "asset" && fileName.endsWith(".css"),
      );

      for (const cssAsset of cssAssets) {
        delete bundle[cssAsset];
      }
    },
  };
}

// Userscript metadata interface
export interface UserscriptMeta {
  name: string;
  description: string;
  author: string;
  version: string;
  icon: string;
  namespace: string;
  homepageURL: string;
  supportURL: string;
  updateURL: string;
  downloadURL: string;
  match: string[];
  connect: string[];
  runAt: string;
  grant: string[];
}

// Plugin to generate userscript header
export function userscriptHeaderPlugin(userscriptMeta: UserscriptMeta): Plugin {
  return {
    name: "userscript-header",
    generateBundle(_options, bundle) {
      // Find the main chunk (should be the only chunk for IIFE format)
      const chunkEntries = Object.entries(bundle).filter(([_, chunk]) => chunk.type === "chunk" && chunk.isEntry);

      if (chunkEntries.length > 0) {
        const [originalFileName, chunk] = chunkEntries[0];

        if (chunk.type === "chunk") {
          // Generate userscript header
          const header = [
            "// ==UserScript==",
            `// @name         ${userscriptMeta.name}`,
            `// @description  ${userscriptMeta.description}`,
            `// @author       ${userscriptMeta.author}`,
            `// @version      ${userscriptMeta.version}`,
            `// @icon         ${userscriptMeta.icon}`,
            `// @namespace    ${userscriptMeta.namespace}`,
            `// @homepageURL  ${userscriptMeta.homepageURL}`,
            `// @supportURL   ${userscriptMeta.supportURL}`,
            `// @updateURL    ${userscriptMeta.updateURL}`,
            `// @downloadURL  ${userscriptMeta.downloadURL}`,
            ...userscriptMeta.match.map((match) => `// @match        ${match}`),
            ...userscriptMeta.connect.map((connect) => `// @connect      ${connect}`),
            `// @run-at       ${userscriptMeta.runAt}`,
            ...userscriptMeta.grant.map((grant) => `// @grant        ${grant}`),
            "// ==/UserScript==",
            "",
          ].join("\n");

          // Emit the userscript file using proper API
          this.emitFile({
            type: "asset",
            fileName: "ab-suite.user.js",
            source: header + chunk.code,
          });

          // Remove the original chunk
          delete bundle[originalFileName];
        }
      }
    },
  };
}

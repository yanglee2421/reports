import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import renderer from "vite-plugin-electron-renderer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
        vite: {
          resolve: {
            alias: {
              "@": fileURLToPath(new URL("./src", import.meta.url)),
              "#": fileURLToPath(new URL("./", import.meta.url)),
            },
          },
          build: {
            rollupOptions: {
              external: ["better-sqlite3"],
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
        vite: {
          resolve: {
            alias: {
              "@": fileURLToPath(new URL("./src", import.meta.url)),
              "#": fileURLToPath(new URL("./", import.meta.url)),
            },
          },
          build: {
            rollupOptions: {
              output: {
                inlineDynamicImports: true,
              },
            },
          },
        },
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === "test"
          ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
            undefined
          : {},
    }),
    renderer(),
  ],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#": fileURLToPath(new URL("./", import.meta.url)),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react/")) {
            // Split vendor chunks
            return "react";
          }

          if (id.includes("node_modules/react-dom/")) {
            // Split vendor chunks
            return "react-dom";
          }

          if (id.includes("node_modules/@tanstack/react-query/")) {
            // Split vendor chunks
            return "tanstack-react-query";
          }

          if (id.includes("node_modules/zustand/")) {
            // Split vendor chunks
            return "zustand";
          }

          if (id.includes("node_modules/notistack/")) {
            // Split vendor chunks
            return "notistack";
          }
        },
      },
    },
  },
});

import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    // tanstackRouter debe ir antes de react(): genera routeTree.gen.ts a partir de src/routes.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  // Resuelve el alias "@/*" desde tsconfig.json (nativo en Vite 8, antes vite-tsconfig-paths).
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
});

import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "campus-engine";
          if (id.includes("node_modules/@supabase")) return "workspace-client";
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id))
            return "react-runtime";
        },
      },
    },
  },
});

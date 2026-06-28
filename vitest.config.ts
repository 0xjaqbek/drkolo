import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "frontend",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "shared-backend",
          environment: "node",
          globals: true,
          include: ["supabase/functions/_shared/**/*.{test,spec}.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

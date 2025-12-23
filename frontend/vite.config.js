import { defineConfig, loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(process.cwd(), "..");
  const env = loadEnv(mode, envDir, "");
  const mapboxToken =
    env.MAPBOX_ACCESS_TOKEN || env.VITE_MAPBOX_ACCESS_TOKEN || "";
  const mapboxStyle =
    env.MAPBOX_STYLE || env.VITE_MAPBOX_STYLE || "";

  return {
    envDir,
    root: ".",
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:3000"
      }
    },
    define: {
      "import.meta.env.VITE_MAPBOX_ACCESS_TOKEN": JSON.stringify(mapboxToken),
      "import.meta.env.VITE_MAPBOX_STYLE": JSON.stringify(mapboxStyle)
    }
  };
});

import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const odlApiUrl = env.VITE_ODL_API_URL || "http://localhost:8181";

  return {
    plugins: [react(), tailwindcss(), basicSsl()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5374,
      https: true,
      proxy: {
        "/rests": {
          target: odlApiUrl,
          changeOrigin: true,
          secure: false,
        },
        "/restconf": {
          target: odlApiUrl,
          changeOrigin: true,
          secure: false,
        },
        "/apidoc": {
          target: odlApiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

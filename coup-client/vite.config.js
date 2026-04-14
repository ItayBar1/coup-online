import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Receives POST /dev-log from the browser and prints structured logs to this terminal. */
function terminalLogPlugin() {
  const COLORS = {
    DEBUG: "\x1b[90m",
    INFO: "\x1b[36m",
    WARN: "\x1b[33m",
    ERROR: "\x1b[31m",
  };
  const RESET = "\x1b[0m";

  return {
    name: "coup-terminal-log",
    configureServer(server) {
      server.middlewares.use("/dev-log", (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405);
          res.end();
          return;
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            const { level = "INFO", message, ...meta } = JSON.parse(body);
            const color = COLORS[level] ?? "";
            const metaStr = Object.keys(meta).length
              ? " " + JSON.stringify(meta)
              : "";
            const line = `${color}[CLIENT:${level}]${RESET} ${message}${metaStr}`;
            if (level === "ERROR") {
              console.error(line);
            } else if (level === "WARN") {
              console.warn(line);
            } else {
              console.log(line);
            }
          } catch {
            // malformed body — ignore
          }
          res.writeHead(204);
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), terminalLogPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/__tests__/setup.js",
  },
  // Treat all .js files in src as JSX so we don't have to rename every component
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.js$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
});

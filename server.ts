import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve the downloaded offline app package
  app.get("/api/download-app", (req, res) => {
    try {
      console.log("Download standalone requested. Initiating on-demand Vite single-file compilation...");
      
      // Dynamic build to compile index.html with inlined React, CSS, and JS assets
      execSync("npx vite build");
      
      const distPath = path.join(process.cwd(), "dist", "index.html");
      if (!fs.existsSync(distPath)) {
        res.status(500).send("Compilation succeeded but the single-file result was not found.");
        return;
      }

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", "attachment; filename=Discipline_Tracker.html");
      
      // Send the beautifully compiled standalone HTML file
      res.sendFile(distPath);
    } catch (err: any) {
      console.error("Single-file compilation error:", err);
      res.status(500).send(`An error occurred while compiling your offline app: ${err.message || err}`);
    }
  });

  // REST API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // Vite dev server middleware in non-production environments
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Discipline full-stack server operating at http://localhost:${PORT}`);
  });
}

startServer();

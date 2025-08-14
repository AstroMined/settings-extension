#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const isWatch = process.argv.includes("--watch");
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

// Files and directories to copy - now includes both manifests for universal build
const filesToCopy = [
  "manifest.json", // Chrome/Chromium manifest (default)
  "manifest.firefox.json", // Firefox manifest (alternate)
  "background.js",
  "content-script.js",
  "background.html", // Needed for Firefox background pages
];

const dirsToRecursiveCopy = ["lib", "popup", "options", "config", "icons"];

// Clean and create dist directory
function setupDistDirectory() {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy a single file
function copyFile(src, dest) {
  const srcPath = path.join(projectRoot, src);
  const destPath = path.join(distDir, dest || src);
  const displayDest = dest || src;

  if (fs.existsSync(srcPath)) {
    // Ensure destination directory exists
    const destDirPath = path.dirname(destPath);
    fs.mkdirSync(destDirPath, { recursive: true });

    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${src} -> dist/${displayDest}`);
  } else {
    console.log(`Skipped (not found): ${src}`);
  }
}

// Recursively copy directory
function copyDirectory(srcRelative, destRelative = srcRelative) {
  const srcPath = path.join(projectRoot, srcRelative);
  const destPath = path.join(distDir, destRelative);

  if (fs.existsSync(srcPath) && fs.lstatSync(srcPath).isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });

    const entries = fs.readdirSync(srcPath, { withFileTypes: true });
    for (const entry of entries) {
      const srcEntryPath = path.join(srcPath, entry.name);
      const destEntryPath = path.join(destPath, entry.name);

      if (entry.isDirectory()) {
        copyDirectory(
          path.join(srcRelative, entry.name),
          path.join(destRelative, entry.name),
        );
      } else {
        fs.copyFileSync(srcEntryPath, destEntryPath);
      }
    }
    console.log(`Copied directory: ${srcRelative}/ -> dist/${destRelative}/`);
  } else {
    console.log(`Skipped directory (not found): ${srcRelative}/`);
  }
}

// Main build function
function build() {
  console.log(`🏗️  Building universal extension (Chrome + Firefox)...`);
  console.log(`📁 Project root: ${projectRoot}`);
  console.log(`📦 Output directory: ${distDir}`);

  setupDistDirectory();

  // Copy individual files
  for (const file of filesToCopy) {
    copyFile(file);
  }

  // Copy directories recursively
  for (const dir of dirsToRecursiveCopy) {
    copyDirectory(dir);
  }

  console.log("✅ Build completed successfully!");
}

// Watch mode functionality
function watchFiles() {
  console.log("👀 Watching for changes...");

  const watchPaths = [
    ...filesToCopy.map((file) => path.join(projectRoot, file)),
    ...dirsToRecursiveCopy.map((dir) => path.join(projectRoot, dir)),
  ];

  // Filter to only watch existing paths
  const existingPaths = watchPaths.filter((watchPath) =>
    fs.existsSync(watchPath),
  );

  if (existingPaths.length === 0) {
    console.log("⚠️  No files to watch found");
    return;
  }

  existingPaths.forEach((watchPath) => {
    fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      if (filename) {
        console.log(`📝 File changed: ${filename}`);
        console.log("🔄 Rebuilding...");
        try {
          build();
        } catch (error) {
          console.error("❌ Build failed:", error.message);
        }
      }
    });
  });

  console.log(`Watching ${existingPaths.length} paths for changes...`);
}

// Main execution
try {
  build();

  if (isWatch) {
    watchFiles();
    // Keep the process running
    process.on("SIGINT", () => {
      console.log("\n👋 Stopping watch mode...");
      process.exit(0);
    });
  }
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

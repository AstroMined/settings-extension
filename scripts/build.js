#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const isWatch = process.argv.includes("--watch");
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

// Files to copy with source -> destination mapping
const filesToCopy = [
  { src: "manifest.json", dest: "manifest.json" }, // Chrome/Chromium manifest (default)
  { src: "manifest.firefox.json", dest: "manifest.firefox.json" }, // Firefox manifest (alternate)
  { src: "src/background/background.js", dest: "background.js" },
  { src: "src/content/content-script.js", dest: "content-script.js" },
  { src: "src/background/background.html", dest: "background.html" }, // Needed for Firefox background pages
];

// Directories to copy with source -> destination mapping
const dirsToRecursiveCopy = [
  { src: "src/lib", dest: "lib" },
  { src: "src/ui/popup", dest: "popup" },
  { src: "src/ui/options", dest: "options" },
  { src: "src/ui/components", dest: "components" },
  { src: "src/config", dest: "config" },
  { src: "src/assets/icons", dest: "icons" },
];

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

  if (fs.existsSync(srcPath)) {
    // Ensure destination directory exists
    const destDirPath = path.dirname(destPath);
    fs.mkdirSync(destDirPath, { recursive: true });

    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${src} -> dist/${dest || src}`);
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

// Validate manifest file references
function validateManifestReferences() {
  console.log("🔍 Validating manifest file references...");

  const manifestFiles = ["manifest.json", "manifest.firefox.json"];
  let validationPassed = true;

  for (const manifestFile of manifestFiles) {
    const manifestPath = path.join(distDir, manifestFile);

    if (!fs.existsSync(manifestPath)) {
      console.log(`⚠️  Manifest not found: ${manifestFile}`);
      continue;
    }

    try {
      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const filesToCheck = [];

      // Extract file references from manifest
      if (manifestContent.background?.service_worker) {
        filesToCheck.push(manifestContent.background.service_worker);
      }
      if (manifestContent.background?.page) {
        filesToCheck.push(manifestContent.background.page);
      }
      if (manifestContent.content_scripts) {
        manifestContent.content_scripts.forEach((cs) => {
          if (cs.js) filesToCheck.push(...cs.js);
          if (cs.css) filesToCheck.push(...cs.css);
        });
      }
      if (manifestContent.action?.default_popup) {
        filesToCheck.push(manifestContent.action.default_popup);
      }
      if (manifestContent.options_ui?.page) {
        filesToCheck.push(manifestContent.options_ui.page);
      }
      if (manifestContent.web_accessible_resources) {
        manifestContent.web_accessible_resources.forEach((war) => {
          if (war.resources) filesToCheck.push(...war.resources);
        });
      }
      if (manifestContent.icons) {
        filesToCheck.push(...Object.values(manifestContent.icons));
      }
      if (manifestContent.action?.default_icon) {
        filesToCheck.push(
          ...Object.values(manifestContent.action.default_icon),
        );
      }

      // Check if all referenced files exist in dist
      for (const file of filesToCheck) {
        const filePath = path.join(distDir, file);
        if (!fs.existsSync(filePath)) {
          console.log(`❌ Missing file referenced in ${manifestFile}: ${file}`);
          validationPassed = false;
        }
      }

      if (validationPassed) {
        console.log(`✅ ${manifestFile}: All referenced files exist`);
      }
    } catch (error) {
      console.log(`❌ Error parsing ${manifestFile}: ${error.message}`);
      validationPassed = false;
    }
  }

  return validationPassed;
}

// Main build function
function build() {
  console.log(`🏗️  Building universal extension (Chrome + Firefox)...`);
  console.log(`📁 Project root: ${projectRoot}`);
  console.log(`📦 Output directory: ${distDir}`);

  setupDistDirectory();

  // Copy individual files
  for (const file of filesToCopy) {
    copyFile(file.src, file.dest);
  }

  // Copy directories recursively
  for (const dir of dirsToRecursiveCopy) {
    copyDirectory(dir.src, dir.dest);
  }

  // Validate manifest references
  const validationPassed = validateManifestReferences();

  if (validationPassed) {
    console.log("✅ Build completed successfully!");
  } else {
    console.log("⚠️  Build completed with validation warnings!");
  }

  return validationPassed;
}

// Watch mode functionality
function watchFiles() {
  console.log("👀 Watching for changes...");

  const watchPaths = [
    ...filesToCopy.map((file) => path.join(projectRoot, file.src)),
    ...dirsToRecursiveCopy.map((dir) => path.join(projectRoot, dir.src)),
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

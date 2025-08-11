#!/usr/bin/env node

/**
 * Icon Generation Script for Settings Extension
 * 
 * This script converts SVG icons to PNG format for browser extension use.
 * It attempts to use the sharp library if available, otherwise creates
 * simple placeholder PNG files.
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'icons');
const ICON_SIZES = [16, 48, 128];

/**
 * Check if sharp is available
 */
function isSharpAvailable() {
    try {
        require.resolve('sharp');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Generate PNG using sharp library
 */
async function generateWithSharp(svgPath, pngPath, size) {
    const sharp = require('sharp');
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);
    
    console.log(`Generated ${pngPath} using sharp`);
}

/**
 * Create a simple PNG placeholder (base64 encoded 1x1 transparent PNG)
 * This is a fallback when sharp is not available
 */
function createPlaceholderPNG(pngPath, size) {
    // Create a simple placeholder message
    const message = `PNG placeholder for ${size}x${size} icon. Install 'sharp' npm package for proper SVG to PNG conversion.`;
    
    // Write a text file with PNG extension as placeholder
    const placeholderContent = `# ${path.basename(pngPath)}\n\n${message}\n\nTo generate actual PNG files:\n1. Run: npm install sharp\n2. Run: node scripts/generate-icons.js\n\nSVG source: ${path.basename(pngPath).replace('.png', '.svg')}\n`;
    
    fs.writeFileSync(pngPath, placeholderContent);
    console.log(`Created placeholder ${pngPath} (install 'sharp' for PNG conversion)`);
}

/**
 * Main function to generate all icon sizes
 */
async function generateIcons() {
    console.log('Starting icon generation...\n');
    
    // Check if icons directory exists
    if (!fs.existsSync(ICONS_DIR)) {
        console.error(`Icons directory not found: ${ICONS_DIR}`);
        process.exit(1);
    }
    
    const useSharp = isSharpAvailable();
    
    if (useSharp) {
        console.log('Using sharp library for high-quality PNG conversion\n');
    } else {
        console.log('Sharp library not available. Creating placeholder files.\n');
        console.log('To install sharp: npm install sharp\n');
    }
    
    // Process each icon size
    for (const size of ICON_SIZES) {
        const svgPath = path.join(ICONS_DIR, `icon${size}.svg`);
        const pngPath = path.join(ICONS_DIR, `icon${size}.png`);
        
        // Check if SVG exists
        if (!fs.existsSync(svgPath)) {
            console.warn(`SVG file not found: ${svgPath}`);
            continue;
        }
        
        try {
            if (useSharp) {
                await generateWithSharp(svgPath, pngPath, size);
            } else {
                createPlaceholderPNG(pngPath, size);
            }
        } catch (error) {
            console.error(`Error generating ${pngPath}:`, error.message);
        }
    }
    
    console.log('\nIcon generation complete!');
    
    // List generated files
    console.log('\nGenerated files:');
    ICON_SIZES.forEach(size => {
        const pngPath = path.join(ICONS_DIR, `icon${size}.png`);
        if (fs.existsSync(pngPath)) {
            const stats = fs.statSync(pngPath);
            console.log(`  icon${size}.png (${stats.size} bytes)`);
        }
    });
}

// Run the script
if (require.main === module) {
    generateIcons().catch(console.error);
}

module.exports = { generateIcons };
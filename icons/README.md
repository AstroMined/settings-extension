# Extension Icons

This directory contains the icons for the Settings Extension in both SVG and PNG formats.

## Files

### SVG Files (Source)
- `icon16.svg` - 16x16 settings/gear icon
- `icon48.svg` - 48x48 settings/gear icon  
- `icon128.svg` - 128x128 settings/gear icon

### PNG Files (Generated)
- `icon16.png` - 16x16 PNG for browser extension manifest
- `icon48.png` - 48x48 PNG for browser extension manifest
- `icon128.png` - 128x128 PNG for browser extension manifest

## Icon Design

The icons use a clean gear/cog design that represents settings and configuration:

- **16px**: Simple gray gear icon for toolbar/menu display
- **48px**: Blue gear icon with enhanced details for medium displays
- **128px**: Gradient blue gear icon with center highlight for high-resolution displays

## Usage in Extension

These icons are referenced in the browser extension manifest:

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png", 
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  }
}
```

## Regenerating PNG Files

To regenerate the PNG files from the SVG sources:

```bash
npm run icons
```

Or manually:

```bash
node scripts/generate-icons.js
```

## Dependencies

PNG generation requires the `sharp` library (installed as dev dependency):

```bash
npm install sharp --save-dev
```

## Customization

To customize the icons:

1. Edit the SVG files to change the design
2. Run `npm run icons` to regenerate PNG files
3. The SVG files use standard HTML color codes and can be easily modified
4. Maintain the gear/settings theme for consistency
# Keyboard Shortcuts Reference

## Executive Summary

Complete reference guide for all keyboard shortcuts available in the Settings Extension. This document covers shortcuts for the popup interface, advanced settings page, and quick actions to improve your productivity and efficiency.

## Scope

- **Applies to**: Settings Extension v1.0+ for all supported browsers
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Browser-Wide Shortcuts

### Extension Access

| Shortcut           | Action                 | Description                                |
| ------------------ | ---------------------- | ------------------------------------------ |
| `Alt + Shift + S`  | Open Settings Popup    | Open the main settings popup (Chrome/Edge) |
| `Ctrl + Shift + Y` | Open Settings Popup    | Open the main settings popup (Firefox)     |
| `Ctrl + Shift + O` | Open Advanced Settings | Open the advanced settings page in new tab |

**Note**: Actual shortcuts may vary by browser and can be customized in your browser's extension management page.

### Quick Actions

| Shortcut   | Action         | Context                                                |
| ---------- | -------------- | ------------------------------------------------------ |
| `Ctrl + E` | Quick Export   | Export settings from any extension interface           |
| `Ctrl + I` | Quick Import   | Open import dialog from any extension interface        |
| `Ctrl + R` | Reset Settings | Reset all settings to defaults (requires confirmation) |

## Popup Interface Shortcuts

### Navigation

| Shortcut      | Action           | Description                                       |
| ------------- | ---------------- | ------------------------------------------------- |
| `Tab`         | Next Setting     | Move to next setting in the list                  |
| `Shift + Tab` | Previous Setting | Move to previous setting in the list              |
| `Enter`       | Activate/Toggle  | Activate current setting or toggle boolean values |
| `Space`       | Toggle Boolean   | Toggle boolean settings on/off                    |
| `Escape`      | Close Popup      | Close the settings popup                          |

### Setting Interaction

| Shortcut | Action       | Setting Type                                   |
| -------- | ------------ | ---------------------------------------------- |
| `F2`     | Edit Setting | Enter edit mode for text/number settings       |
| `Enter`  | Save Changes | Save changes when editing text/number settings |
| `Escape` | Cancel Edit  | Cancel editing and revert to previous value    |
| `Delete` | Clear Value  | Clear the current value (text settings)        |

### Quick Actions in Popup

| Shortcut   | Action            | Description                                             |
| ---------- | ----------------- | ------------------------------------------------------- |
| `Ctrl + S` | Save All          | Save any pending changes (auto-save enabled by default) |
| `Ctrl + D` | Duplicate Setting | Duplicate current setting (if supported)                |
| `Ctrl + /` | Show Help         | Show help information for current setting               |

## Advanced Settings Page Shortcuts

### General Navigation

| Shortcut             | Action            | Description                                                   |
| -------------------- | ----------------- | ------------------------------------------------------------- |
| `Ctrl + Tab`         | Next Tab          | Switch to next settings tab                                   |
| `Ctrl + Shift + Tab` | Previous Tab      | Switch to previous settings tab                               |
| `Ctrl + 1-5`         | Direct Tab Access | Jump directly to specific tab (1=General, 2=Appearance, etc.) |
| `Ctrl + Home`        | Go to Top         | Scroll to top of current settings page                        |
| `Ctrl + End`         | Go to Bottom      | Scroll to bottom of current settings page                     |

### Tab-Specific Shortcuts

#### General Settings Tab

| Shortcut     | Action              | Description                          |
| ------------ | ------------------- | ------------------------------------ |
| `G` then `G` | Focus First Setting | Jump to first setting in General tab |
| `G` then `L` | Focus Last Setting  | Jump to last setting in General tab  |

#### Import/Export Tab

| Shortcut     | Action         | Description                |
| ------------ | -------------- | -------------------------- |
| `I` then `E` | Quick Export   | Trigger export action      |
| `I` then `I` | Quick Import   | Trigger import file dialog |
| `I` then `R` | Reset Settings | Trigger reset to defaults  |

### Editing Shortcuts

| Shortcut   | Action     | Description                       |
| ---------- | ---------- | --------------------------------- |
| `Ctrl + A` | Select All | Select all text in current field  |
| `Ctrl + Z` | Undo       | Undo last change in current field |
| `Ctrl + Y` | Redo       | Redo last undone change           |
| `Ctrl + X` | Cut        | Cut selected text                 |
| `Ctrl + C` | Copy       | Copy selected text                |
| `Ctrl + V` | Paste      | Paste from clipboard              |

## Setting Type-Specific Shortcuts

### Boolean Settings

| Shortcut | Action    | Description                 |
| -------- | --------- | --------------------------- |
| `Space`  | Toggle    | Toggle boolean value on/off |
| `Enter`  | Toggle    | Alternative toggle method   |
| `Y`      | Set True  | Set boolean to true         |
| `N`      | Set False | Set boolean to false        |

### Text Settings

| Shortcut        | Action            | Description                             |
| --------------- | ----------------- | --------------------------------------- |
| `Ctrl + Enter`  | Save and Next     | Save current field and move to next     |
| `Shift + Enter` | Save and Previous | Save current field and move to previous |
| `Ctrl + L`      | Select Line       | Select entire line (long text)          |
| `Ctrl + D`      | Duplicate Line    | Duplicate current line (long text)      |

### Number Settings

| Shortcut    | Action          | Description                  |
| ----------- | --------------- | ---------------------------- |
| `↑`         | Increment       | Increase value by 1          |
| `↓`         | Decrement       | Decrease value by 1          |
| `Shift + ↑` | Large Increment | Increase value by 10         |
| `Shift + ↓` | Large Decrement | Decrease value by 10         |
| `Ctrl + ↑`  | Maximum         | Set to maximum allowed value |
| `Ctrl + ↓`  | Minimum         | Set to minimum allowed value |

### Long Text Settings

| Shortcut      | Action         | Description                      |
| ------------- | -------------- | -------------------------------- |
| `Ctrl + F`    | Find           | Open find dialog within text     |
| `Ctrl + H`    | Find & Replace | Open find and replace dialog     |
| `Ctrl + G`    | Go to Line     | Jump to specific line number     |
| `Tab`         | Indent         | Indent current line or selection |
| `Shift + Tab` | Unindent       | Remove indentation               |
| `Ctrl + /`    | Toggle Comment | Toggle line comment (CSS/JS)     |

### JSON Settings

| Shortcut           | Action        | Description                              |
| ------------------ | ------------- | ---------------------------------------- |
| `Ctrl + Shift + F` | Format JSON   | Auto-format JSON with proper indentation |
| `Ctrl + Shift + C` | Collapse All  | Collapse all JSON objects/arrays         |
| `Ctrl + Shift + E` | Expand All    | Expand all JSON objects/arrays           |
| `Ctrl + M`         | Validate JSON | Check JSON syntax validity               |

## Search and Filter Shortcuts

### Settings Search

| Shortcut     | Action          | Description                        |
| ------------ | --------------- | ---------------------------------- |
| `Ctrl + F`   | Search Settings | Open settings search box           |
| `F3`         | Find Next       | Find next matching setting         |
| `Shift + F3` | Find Previous   | Find previous matching setting     |
| `Escape`     | Clear Search    | Clear search and show all settings |

### Filter Shortcuts

| Shortcut           | Action        | Description                                |
| ------------------ | ------------- | ------------------------------------------ |
| `Ctrl + Shift + M` | Modified Only | Show only settings that have been modified |
| `Ctrl + Shift + D` | Defaults Only | Show only settings at default values       |
| `Ctrl + Shift + A` | All Settings  | Clear all filters and show everything      |

## File Operation Shortcuts

### Import Operations

| Shortcut           | Action       | Description                                 |
| ------------------ | ------------ | ------------------------------------------- |
| `Ctrl + O`         | Open File    | Open file dialog for settings import        |
| `Ctrl + Shift + O` | Recent Files | Show recently imported files menu           |
| `Drag + Drop`      | Drop Import  | Drag settings file onto interface to import |

### Export Operations

| Shortcut           | Action           | Description                   |
| ------------------ | ---------------- | ----------------------------- |
| `Ctrl + S`         | Save/Export      | Export current settings       |
| `Ctrl + Shift + S` | Export As        | Export with custom filename   |
| `Ctrl + Alt + S`   | Selective Export | Export only selected settings |

## Customization and Accessibility

### Accessibility Shortcuts

| Shortcut          | Action         | Description                    |
| ----------------- | -------------- | ------------------------------ |
| `Alt + Shift + H` | High Contrast  | Toggle high contrast mode      |
| `Alt + Shift + L` | Large Text     | Toggle large text mode         |
| `Alt + Shift + K` | Show Shortcuts | Display all keyboard shortcuts |
| `?`               | Help Mode      | Enter help mode (shows hints)  |

### Custom Shortcuts

Users can customize shortcuts in their browser's extension management:

1. **Chrome/Edge**: Go to `chrome://extensions/shortcuts`
2. **Firefox**: Go to `about:addons` → Gear icon → "Manage Extension Shortcuts"

## Context-Sensitive Shortcuts

### Popup Context

When the settings popup is active:

| Shortcut           | Action           | Available When  |
| ------------------ | ---------------- | --------------- |
| `Ctrl + W`         | Close Popup      | Always          |
| `F1`               | Show Help        | Always          |
| `F5`               | Refresh Settings | Always          |
| `Ctrl + Shift + I` | Developer Tools  | Debug mode only |

### Advanced Settings Context

When advanced settings page is active:

| Shortcut           | Action           | Available When            |
| ------------------ | ---------------- | ------------------------- |
| `Ctrl + Shift + R` | Reset Tab        | Current tab has changes   |
| `Ctrl + Shift + S` | Save All Changes | Pending changes exist     |
| `Alt + Left`       | Back             | Navigation history exists |
| `Alt + Right`      | Forward          | Navigation history exists |

### Edit Mode Context

When editing a setting value:

| Shortcut       | Action      | Available When      |
| -------------- | ----------- | ------------------- |
| `Escape`       | Cancel      | Always in edit mode |
| `Ctrl + Enter` | Save & Exit | Always in edit mode |
| `Ctrl + S`     | Save        | Text is modified    |
| `Ctrl + R`     | Revert      | Text is modified    |

## Sequence Shortcuts

Some shortcuts require key sequences (press keys in order, not simultaneously):

### Settings Navigation Sequences

| Sequence | Action           | Description                         |
| -------- | ---------------- | ----------------------------------- |
| `G` `G`  | Go to General    | Navigate to General settings tab    |
| `A` `P`  | Go to Appearance | Navigate to Appearance settings tab |
| `A` `D`  | Go to Advanced   | Navigate to Advanced settings tab   |
| `I` `E`  | Import/Export    | Navigate to Import/Export tab       |
| `A` `B`  | About            | Navigate to About tab               |

### Quick Action Sequences

| Sequence | Action      | Description                            |
| -------- | ----------- | -------------------------------------- |
| `S` `A`  | Save All    | Save all pending changes               |
| `R` `A`  | Reset All   | Reset all settings (with confirmation) |
| `E` `A`  | Export All  | Export all settings                    |
| `I` `F`  | Import File | Open import file dialog                |

## Browser-Specific Variations

### Chrome/Edge Specific

| Shortcut                | Action          | Note                      |
| ----------------------- | --------------- | ------------------------- |
| `Alt + Shift + S`       | Open Extension  | Default assignment        |
| `Ctrl + Shift + Delete` | Clear Data      | Clear extension data      |
| `F12`                   | Developer Tools | When in extension context |

### Firefox Specific

| Shortcut           | Action          | Note                        |
| ------------------ | --------------- | --------------------------- |
| `Ctrl + Shift + Y` | Open Extension  | Default assignment          |
| `Ctrl + Shift + A` | Add-ons Manager | Access extension management |
| `Ctrl + Shift + K` | Web Console     | For debugging               |

### macOS Variations

On macOS, replace `Ctrl` with `Cmd` for most shortcuts:

| Windows/Linux | macOS     | Action      |
| ------------- | --------- | ----------- |
| `Ctrl + S`    | `Cmd + S` | Save/Export |
| `Ctrl + O`    | `Cmd + O` | Open File   |
| `Ctrl + F`    | `Cmd + F` | Search      |
| `Ctrl + A`    | `Cmd + A` | Select All  |

## Troubleshooting Shortcuts

### When Shortcuts Don't Work

**Check These Common Issues:**

1. **Browser Focus**: Ensure the extension interface has focus
2. **Modal Dialogs**: Some shortcuts disabled when dialogs are open
3. **Edit Mode**: Different shortcuts available when editing
4. **Browser Conflicts**: Other extensions may override shortcuts
5. **Custom Shortcuts**: Check if shortcuts have been customized

### Debugging Shortcuts

| Shortcut           | Action      | Purpose                             |
| ------------------ | ----------- | ----------------------------------- |
| `Ctrl + Shift + J` | Console     | Open browser console for debugging  |
| `Ctrl + U`         | View Source | View extension source (development) |
| `F12`              | DevTools    | Open developer tools                |

### Reset Shortcuts

If shortcuts stop working:

1. **Reset Extension**: Disable and re-enable the extension
2. **Clear Data**: Clear extension data and reconfigure
3. **Check Conflicts**: Disable other extensions temporarily
4. **Restart Browser**: Close and restart the browser

## Quick Reference Card

### Most Common Shortcuts

**Essential Actions:**

- `Ctrl + E` - Quick Export
- `Ctrl + I` - Quick Import
- `Space` - Toggle Boolean Settings
- `Tab` - Navigate Between Settings
- `Escape` - Cancel/Close

**Advanced Settings:**

- `Ctrl + Tab` - Switch Tabs
- `Ctrl + S` - Save Changes
- `Ctrl + F` - Search Settings
- `F1` - Show Help

**Text Editing:**

- `Ctrl + A` - Select All
- `Ctrl + Z` - Undo
- `Ctrl + Enter` - Save and Continue

## References

- [Getting Started Tutorial](../tutorials/getting-started.md) - Basic extension usage
- [Configuration Reference](configuration.md) - All configuration options
- [Settings Types](settings-types.md) - Understanding different setting types
- [Browser compatibility](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) - Keyboard event reference

## Revision History

| Date       | Author             | Changes                              |
| ---------- | ------------------ | ------------------------------------ |
| 2025-08-11 | Documentation Team | Initial keyboard shortcuts reference |

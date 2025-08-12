# How to Backup and Restore Settings

## Executive Summary

This guide provides step-by-step instructions for backing up and restoring your Settings Extension configuration. Learn the different methods available, when to use each approach, and how to troubleshoot common issues with backup and restore operations.

## Scope

- **Applies to**: Settings Extension v1.0+ for all supported browsers
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Quick Navigation

- [Creating Backups](#creating-backups)
- [Restoring from Backups](#restoring-from-backups)
- [Backup Verification](#backup-verification)
- [Automated Backup Strategies](#automated-backup-strategies)
- [Troubleshooting](#troubleshooting)

## Creating Backups

### Method 1: Quick Backup from Popup

**When to use**: Quick daily backups, before making small changes

1. **Open the Extension Popup**
   - Click the Settings Extension icon in your browser toolbar

2. **Start Export Process**
   - Click the "Export" button at the bottom
   - File downloads immediately to your default Downloads folder

3. **Locate Downloaded File**
   - Check Downloads folder for file named:
   - `settings-extension-backup-[YYYY-MM-DD-HH-MM-SS].json`

**Time required**: 10-15 seconds

### Method 2: Advanced Backup from Settings Page

**When to use**: Comprehensive backups, when you need more control

1. **Open Advanced Settings**
   - Click the gear icon in the popup
   - Or right-click extension icon → "Options"

2. **Navigate to Backup Tools**
   - Click "Import/Export" in the left sidebar

3. **Use Export Function**
   - Find the "Export Settings" section
   - Click "Export Settings" button
   - File downloads to your Downloads folder

**Time required**: 30-45 seconds

### Method 3: Scheduled/Automated Backup

**When to use**: Regular backups without manual intervention

1. **Set Browser Bookmarks**
   - Create bookmark: `javascript:window.open(chrome.runtime.getURL('options/options.html#import-export'));`
   - Click bookmark to quickly open export page

2. **Use Calendar Reminders**
   - Set weekly/monthly calendar reminders
   - Include link to export page in reminder

3. **Script-Based Automation** (Advanced users)
   - Create browser extension shortcuts
   - Use automation tools like Selenium or Puppeteer

## Restoring from Backups

### Method 1: Import via Advanced Settings

**Most common and recommended method**

1. **Open Advanced Settings**
   - Click gear icon in popup
   - Navigate to "Import/Export" tab

2. **Locate Import Section**
   - Find "Import Settings" card
   - Contains file selection and import button

3. **Select Backup File**
   - Click "Import Settings" button
   - Browser file dialog opens
   - Navigate to your backup file
   - Select the .json file
   - Click "Open"

4. **Confirm Import**
   - Review import summary if shown
   - Click "Confirm" or "Import" to proceed
   - Wait for "Import successful" message

5. **Verify Restoration**
   - Check that settings match your expectations
   - Test functionality to ensure everything works

### Method 2: Drag and Drop Import

**Quick method for power users**

1. **Open Advanced Settings**
   - Navigate to Import/Export tab

2. **Drag File to Browser**
   - Open file manager/Finder
   - Drag your .json backup file onto the import area
   - File uploads and imports automatically

### Method 3: Emergency Restore

**When extension interface isn't working properly**

1. **Reset Extension**
   - Go to browser's extension management page
   - Disable and re-enable Settings Extension

2. **Clear Extension Data** (if needed)
   - Right-click extension icon → "Manage Extension"
   - Find "Storage" section
   - Clear extension data

3. **Import Fresh Backup**
   - Follow Method 1 above to import your backup

## Backup Verification

### File Integrity Check

**After creating any backup, verify it's valid:**

1. **Check File Size**
   - Backup files are typically 1-50 KB
   - Files under 100 bytes likely failed
   - Files over 1 MB may have issues

2. **Verify JSON Format**
   - Right-click backup file → "Open with" → Text Editor
   - Check for proper JSON structure:

   ```json
   {
     "version": "1.0",
     "timestamp": "2025-08-11T...",
     "settings": {
       ...
     }
   }
   ```

3. **Test Import**
   - Make a minor setting change
   - Import your backup file
   - Verify the change is reversed
   - This confirms the backup works

### Content Verification

**Ensure backup contains your expected settings:**

1. **Open Backup in Text Editor**
2. **Check for Key Settings**
   - Look for settings you've customized
   - Verify values match your current configuration
   - Ensure all expected settings are present

3. **Compare with Current Settings**
   - Export current settings to compare
   - Use text comparison tool to check differences
   - This helps identify any missing data

## Automated Backup Strategies

### Strategy 1: Version-Based Backups

**Keep multiple versions automatically**

1. **Naming Convention**
   - Use consistent naming with versions
   - Example: `settings-v1.0-backup-2025-08-11.json`

2. **Folder Organization**

   ```
   Settings Backups/
   ├── Daily/
   │   ├── settings-daily-2025-08-11.json
   │   └── settings-daily-2025-08-10.json
   ├── Weekly/
   │   └── settings-weekly-2025-week32.json
   └── Monthly/
       └── settings-monthly-2025-08.json
   ```

3. **Retention Policy**
   - Keep daily backups for 7 days
   - Keep weekly backups for 4 weeks
   - Keep monthly backups for 12 months
   - Keep yearly backups indefinitely

### Strategy 2: Event-Driven Backups

**Backup before specific events**

1. **Before Updates**
   - Browser updates
   - Extension updates
   - Major configuration changes

2. **Before Experiments**
   - Testing new settings
   - Trying beta features
   - Making bulk changes

3. **Before Sharing**
   - Preparing team configurations
   - Creating deployment packages
   - Setting up new environments

### Strategy 3: Cloud-Synced Backups

**Automatic cloud synchronization**

1. **Cloud Storage Setup**
   - Save backups to Dropbox, Google Drive, or OneDrive
   - These services sync across devices automatically

2. **Scheduled Cloud Backups**
   - Use cloud service automation
   - Set up weekly uploads of backup files
   - Enable versioning in cloud storage

3. **Cross-Device Access**
   - Access backups from any device
   - Maintain consistency across computers
   - Share with team through shared folders

## Troubleshooting

### Backup Issues

**Export Button Doesn't Work**

- Refresh the extension popup
- Try from advanced settings page
- Check browser's download permissions
- Clear browser cache and cookies

**Download Fails**

- Check available disk space
- Try different download location
- Disable download blocking extensions
- Check antivirus software isn't blocking

**File Size is Wrong**

- Very small files (< 100 bytes): Export failed
- Very large files (> 1 MB): Possible corruption
- Try exporting again after refreshing

### Restore Issues

**Import Button Greyed Out**

- Ensure file is .json format
- Check file isn't corrupted
- Try renaming file with .json extension
- Verify file permissions allow reading

**Import Fails with Error**

- Check JSON syntax is valid
- Verify file wasn't edited incorrectly
- Try importing a known-good backup
- Check for special characters in file path

**Settings Don't Change After Import**

- Refresh extension popup after import
- Check if extension requires restart
- Verify you imported the correct file
- Compare imported settings with expected values

**Partial Import Success**

- Some settings imported, others didn't
- Check backup file for missing settings
- Try importing a different backup
- May indicate extension version differences

### Recovery Scenarios

**Complete Settings Loss**

1. Reset extension to defaults
2. Import most recent backup
3. Test basic functionality
4. Check for missing customizations
5. Re-configure any missing settings

**Corrupted Settings**

1. Export current settings as reference
2. Reset extension completely
3. Import known-good backup
4. Compare with current export to identify issues
5. Manually fix any remaining problems

**Version Conflicts**

1. Check backup file version vs. current extension
2. Try importing to same extension version
3. Update extension if backup is newer
4. Manual migration if versions are incompatible

## Best Practices

### When to Backup

**Daily Backups**

- If you modify settings frequently
- During active development periods
- When testing new configurations

**Weekly Backups**

- For stable configurations
- Regular maintenance schedule
- Before weekend downtime

**Event-Driven Backups**

- Before any major changes
- Prior to browser/extension updates
- When sharing configurations
- Before system maintenance

### Backup Management

**Storage Organization**

- Use consistent naming conventions
- Organize in dated folders
- Keep local and cloud copies
- Document backup purposes

**File Maintenance**

- Regular cleanup of old backups
- Test restore process periodically
- Keep multiple backup generations
- Verify backups after creation

**Security Considerations**

- Protect files containing sensitive data
- Use secure cloud storage
- Consider encryption for sensitive configs
- Control access to backup files

## Quick Reference

### Backup Commands

- **Quick backup**: Click extension icon → Export
- **Advanced backup**: Open settings → Import/Export → Export Settings
- **Verification**: Open .json file in text editor

### Restore Commands

- **Standard restore**: Advanced settings → Import/Export → Import Settings
- **Emergency restore**: Reset extension → Import backup
- **Verification**: Check settings match expectations

### File Locations

- **Downloads**: Default backup location
- **Organization**: Create dedicated backup folders
- **Cloud sync**: Use cloud storage for automatic sync

## References

- [First Backup Tutorial](../tutorials/first-backup.md) - Learn backup basics
- [File Formats Reference](../reference/file-formats.md) - Understanding backup file structure
- [Profile Management](../tutorials/profile-setup.md) - Using backups for profiles
- [Security Guide](../explanation/security.md) - Protecting your backup data

## Revision History

| Date       | Author             | Changes                          |
| ---------- | ------------------ | -------------------------------- |
| 2025-08-11 | Documentation Team | Initial backup and restore guide |

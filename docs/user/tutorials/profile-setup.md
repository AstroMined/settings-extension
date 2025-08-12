# Setting Up Multiple Settings Profiles

## Executive Summary

This tutorial teaches you how to create and manage multiple settings profiles using the Settings Extension. Profiles allow you to maintain different configurations for different purposes (development, testing, production) and switch between them easily.

## Scope

- **Applies to**: Users familiar with [Getting Started](getting-started.md) and [First Backup](first-backup.md)
- **Time Required**: 15-20 minutes
- **Prerequisites**: Settings Extension configured with at least one backup file
- **Last Updated**: 2025-08-11
- **Status**: Approved

## What You'll Learn

By the end of this tutorial, you'll know how to:

1. Understand what profiles are and why they're useful
2. Create your first profile configuration
3. Export and organize profile-specific backups
4. Switch between different profiles
5. Manage multiple profiles effectively
6. Set up profiles for common scenarios

## Step 1: Understanding Profiles

### What Are Settings Profiles?

Settings profiles are different configurations of your extension settings that you can save, name, and switch between. Think of them as presets for different situations.

**Examples of profiles:**

- **Development**: Settings optimized for development work
- **Production**: Settings for live environments
- **Testing**: Configuration for testing scenarios
- **Personal**: Your personal preferences
- **Team Standard**: Shared team configuration

### Benefits of Using Profiles

**Flexibility**: Quickly switch contexts without reconfiguring
**Safety**: Keep production settings separate from experimental ones
**Collaboration**: Share standard configurations with team members
**Efficiency**: No need to remember and manually change multiple settings
**Organization**: Group related settings for specific purposes

### How Profiles Work

Since the Settings Extension doesn't have built-in profile management (yet), we'll use a file-based approach:

- Each profile is a separate backup file
- Use descriptive naming to identify profiles
- Import different backup files to switch profiles
- Organize files in folders for easy management

## Step 2: Planning Your Profiles

Before creating profiles, plan what you need:

### Identify Your Use Cases

Consider your different working scenarios:

**For Developers:**

- Development environment settings
- Staging environment settings
- Production environment settings
- Personal experimentation settings

**For Teams:**

- Individual user preferences
- Team standard configuration
- Project-specific settings
- Client-specific configurations

**For Different Projects:**

- Project A configuration
- Project B configuration
- General-purpose settings
- Archive of old project settings

### Profile Planning Worksheet

Write down your needed profiles:

| Profile Name  | Purpose              | Key Settings              | Usage Frequency |
| ------------- | -------------------- | ------------------------- | --------------- |
| Development   | Local development    | Debug enabled, dev API    | Daily           |
| Production    | Live environment     | Production API, optimized | Weekly          |
| Team Standard | Company defaults     | Standard config           | Monthly         |
| Experimental  | Testing new features | Various test settings     | As needed       |

## Step 3: Creating Your First Profile

Let's create a "Development" profile as an example:

### Configure Development Settings

1. **Open the Settings Extension**
   - Click the extension icon in your toolbar
   - Current settings are displayed

2. **Adjust Settings for Development**
   - **Feature Enabled**: Turn ON for active development
   - **API Key**: Enter your development API key
   - **Refresh Interval**: Set to 30 seconds for faster feedback
   - **Custom CSS**: Add development-specific styles:
     ```css
     /* Development Environment Styles */
     .debug-mode {
       border: 2px solid red;
       background: yellow;
     }
     ```

3. **Configure Advanced Settings**
   - Click the gear icon to open advanced settings
   - Go to the Advanced tab
   - Modify the JSON configuration:
     ```json
     {
       "endpoint": "https://dev-api.example.com",
       "timeout": 10000,
       "retries": 5,
       "debug": true
     }
     ```

_Screenshot placeholder: [Settings configured for development environment]_

### Export the Development Profile

1. **Navigate to Import/Export Tab**
   - In the advanced settings page
   - Click "Import/Export" in the sidebar

2. **Export Your Settings**
   - Click "Export Settings"
   - File downloads automatically

3. **Rename the Downloaded File**
   - Navigate to your Downloads folder
   - Rename the file to: `settings-profile-development-2025-08-11.json`
   - Move it to your backup folder

## Step 4: Creating Additional Profiles

### Production Profile

1. **Reset to Base Configuration**
   - Import your original backup or reset to defaults
   - This gives you a clean starting point

2. **Configure for Production**
   - **Feature Enabled**: ON
   - **API Key**: Production API key (if different)
   - **Refresh Interval**: 300 seconds (5 minutes) for efficiency
   - **Custom CSS**: Production-optimized styles:
     ```css
     /* Production Environment Styles */
     .optimized {
       performance: optimized;
       debug: none;
     }
     ```

3. **Advanced Production Settings**
   - JSON configuration:
     ```json
     {
       "endpoint": "https://api.example.com",
       "timeout": 5000,
       "retries": 3,
       "debug": false,
       "caching": true
     }
     ```

4. **Export Production Profile**
   - Export settings
   - Rename to: `settings-profile-production-2025-08-11.json`

### Team Standard Profile

1. **Configure Team Defaults**
   - Use settings agreed upon by your team
   - Include company-standard API endpoints
   - Set conservative timeouts and intervals
   - Include team CSS standards

2. **Export Team Profile**
   - Rename to: `settings-profile-team-standard-2025-08-11.json`

## Step 5: Organizing Your Profiles

### Create a Profile Management System

1. **Folder Structure**

   ```
   Documents/
   └── Browser Extension Backups/
       └── Settings Extension/
           ├── Profiles/
           │   ├── Development/
           │   │   └── settings-profile-development-2025-08-11.json
           │   ├── Production/
           │   │   └── settings-profile-production-2025-08-11.json
           │   └── Team Standard/
           │       └── settings-profile-team-standard-2025-08-11.json
           └── Archive/
               └── [old profile versions]
   ```

2. **Profile Documentation File**
   Create a text file documenting your profiles:

   ```
   Profile Documentation - Settings Extension

   DEVELOPMENT PROFILE
   - Purpose: Local development work
   - API: dev-api.example.com
   - Refresh: 30 seconds
   - Debug: Enabled
   - Last Updated: 2025-08-11

   PRODUCTION PROFILE
   - Purpose: Live environment settings
   - API: api.example.com
   - Refresh: 5 minutes
   - Debug: Disabled
   - Last Updated: 2025-08-11

   TEAM STANDARD PROFILE
   - Purpose: Company default settings
   - Approved by: Team Lead
   - Mandatory for: New team members
   - Review Date: Quarterly
   ```

### Version Control for Profiles

Keep track of profile changes:

**Naming Convention:**

- `settings-profile-[name]-[version]-[date].json`
- Example: `settings-profile-development-v2-2025-08-11.json`

**Change Log:**

- Document what changed in each version
- Note why changes were made
- Track who made the changes

## Step 6: Switching Between Profiles

### Quick Profile Switch Process

1. **Export Current State** (optional backup)
   - Before switching, export current settings
   - Save as `settings-current-backup-[timestamp].json`

2. **Import Target Profile**
   - Go to Import/Export tab in advanced settings
   - Click "Import Settings"
   - Select your profile file
   - Confirm the import

3. **Verify the Switch**
   - Check that settings match the expected profile
   - Test functionality if needed
   - Make note of the current active profile

_Screenshot placeholder: [Import dialog showing profile selection]_

### Creating a Profile Quick-Switch Guide

Document your switching process:

```
PROFILE SWITCHING CHECKLIST

Before Switching:
☐ Export current settings as backup
☐ Note current profile name
☐ Identify target profile needed

Switching Process:
☐ Open Settings Extension advanced settings
☐ Navigate to Import/Export tab
☐ Click "Import Settings"
☐ Select profile file
☐ Confirm import
☐ Verify settings changed correctly

After Switching:
☐ Test basic functionality
☐ Update documentation with current profile
☐ Inform team if using shared configuration
```

## Step 7: Advanced Profile Management

### Profile Validation

Before using a profile, validate it:

1. **Check File Integrity**
   - Open the JSON file in a text editor
   - Verify the structure is correct
   - Check for any corruption

2. **Test Import**
   - Import the profile
   - Verify all settings load correctly
   - Check for any error messages

3. **Functional Testing**
   - Test key functionality after switching
   - Verify API connections work
   - Check that custom CSS applies correctly

### Profile Sharing

When sharing profiles with team members:

1. **Remove Sensitive Data**
   - Remove personal API keys
   - Replace with placeholder values
   - Document required customizations

2. **Create Setup Instructions**

   ```
   DEVELOPMENT PROFILE SETUP

   1. Import settings-profile-development-shared.json
   2. Update API key in settings:
      - Go to Advanced Settings > General
      - Enter your personal development API key
   3. Modify custom CSS if needed for your setup
   4. Test functionality before use
   ```

3. **Version Control**
   - Use shared storage (team drive, repository)
   - Track changes with version numbers
   - Communicate updates to team

### Automated Profile Management

For advanced users, consider automation:

1. **Script-Based Switching**
   - Create batch files or scripts
   - Automate common profile switches
   - Include validation and backup steps

2. **Profile Synchronization**
   - Keep profiles updated across devices
   - Use cloud storage with sync
   - Set up regular profile backups

## Common Profile Management Issues

### Profile Import Fails

**Problem**: Error importing profile file
**Solutions**:

- Check file isn't corrupted
- Verify JSON syntax is valid
- Try importing a known-good backup first

### Settings Don't Match Profile

**Problem**: After import, settings aren't as expected
**Solutions**:

- Verify you imported the correct file
- Check if extension was updated (breaking changes)
- Re-export and import the profile

### Lost Profile Files

**Problem**: Can't find profile files
**Prevention**:

- Use cloud storage backup
- Maintain multiple copies
- Document profile locations

## Best Practices Summary

### Organization

- Use descriptive, consistent naming
- Maintain folder structure
- Document profile purposes and changes
- Keep profiles up to date

### Safety

- Always backup before switching
- Test profiles before relying on them
- Keep multiple versions of critical profiles
- Remove sensitive data from shared profiles

### Maintenance

- Review profiles quarterly
- Update outdated configurations
- Clean up unused profiles
- Keep documentation current

## What's Next?

Now that you can manage profiles effectively:

1. **[Sync Settings](../how-to/sync-settings.md)** - Learn about automatic synchronization
2. **[Advanced Configuration](../how-to/manage-profiles.md)** - Complex profile management
3. **[Export/Import Guide](../how-to/export-import.md)** - Master backup and restore operations
4. **[Security Considerations](../explanation/security.md)** - Protect your profile data

## Key Takeaways

- Profiles help you maintain different configurations for different purposes
- Use file-based approach with descriptive naming and organization
- Always backup before switching profiles
- Document your profiles and switching procedures
- Share profiles carefully, removing sensitive information
- Maintain profiles regularly to keep them current

## Quick Reference

**Create Profile**: Configure settings → Export → Rename file descriptively
**Switch Profile**: Advanced settings → Import/Export → Import target profile
**Organize Profiles**: Use folder structure with clear naming convention
**Share Profiles**: Remove sensitive data, provide setup instructions

## References

- [Export/Import Guide](../how-to/export-import.md) - Detailed backup and restore procedures
- [File Formats](../reference/file-formats.md) - Understanding profile file structure
- [Configuration Reference](../reference/configuration.md) - All available settings options

## Revision History

| Date       | Author             | Changes                             |
| ---------- | ------------------ | ----------------------------------- |
| 2025-08-11 | Documentation Team | Initial profile management tutorial |

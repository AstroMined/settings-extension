# How to Selectively Sync Specific Settings

## Executive Summary

This guide teaches you how to synchronize only specific settings rather than your entire configuration. Learn to choose which settings to sync, create selective sync profiles, and manage partial synchronization across devices and team members.

## Scope

- **Applies to**: Users who need granular control over which settings synchronize
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Quick Navigation

- [Understanding Selective Sync](#understanding-selective-sync)
- [Setting Up Selective Sync](#setting-up-selective-sync)
- [Sync Categories and Groups](#sync-categories-and-groups)
- [Advanced Selective Sync](#advanced-selective-sync)
- [Team Selective Sync](#team-selective-sync)
- [Troubleshooting Selective Sync](#troubleshooting-selective-sync)

## Understanding Selective Sync

### What is Selective Sync?

Selective sync allows you to choose which specific settings synchronize between devices, browsers, or team members while keeping others local or private.

**Common Use Cases:**

- Sync team standards but keep personal preferences local
- Share feature configurations but not API keys
- Sync appearance settings but not security credentials
- Maintain device-specific optimizations

### Benefits of Selective Sync

**Privacy Protection**

- Keep sensitive settings (API keys, tokens) local
- Share only appropriate configuration data
- Maintain personal customizations

**Performance Optimization**

- Sync only necessary settings
- Reduce bandwidth usage
- Faster synchronization times

**Flexibility**

- Different sync rules for different contexts
- Granular control over shared vs private data
- Customized sync profiles for different needs

### How Selective Sync Works

Since Settings Extension doesn't have built-in selective sync (yet), we use file-based approaches:

1. **Manual Selective Export**: Create export files containing only desired settings
2. **Filtered Import**: Import only specific settings from larger files
3. **Category-Based Sync**: Group settings by type and sync categories
4. **Template-Based Sync**: Use templates to control what syncs

## Setting Up Selective Sync

### Method 1: Manual Selective Export/Import

#### Step 1: Identify Settings to Sync

Create a sync plan:

```
Sync Plan Template:

SETTINGS TO SYNC (shared across devices/team):
□ Feature toggles (feature_enabled)
□ API endpoints (non-sensitive)
□ Refresh intervals
□ Custom CSS (non-personal)
□ General preferences

SETTINGS TO KEEP LOCAL (device/user specific):
□ API keys and tokens
□ Personal CSS customizations
□ Debug settings
□ Device-specific configurations
□ Personal workflow preferences
```

#### Step 2: Create Selective Export

1. **Export Full Configuration**
   - Use standard export process
   - Save as reference: `settings-full-export.json`

2. **Create Selective Export File**
   - Copy full export to new file: `settings-selective-sync.json`
   - Edit file to remove unwanted settings

3. **Example Selective Export**
   ```json
   {
     "version": "1.0",
     "timestamp": "2025-08-11T10:30:00.123Z",
     "sync_type": "selective",
     "included_settings": ["feature_enabled", "refresh_interval", "custom_css"],
     "settings": {
       "feature_enabled": {
         "type": "boolean",
         "value": true,
         "description": "Enable main feature functionality"
       },
       "refresh_interval": {
         "type": "number",
         "value": 60,
         "description": "Auto-refresh interval in seconds",
         "min": 1,
         "max": 3600
       },
       "custom_css": {
         "type": "longtext",
         "value": "/* Team-standard CSS */\n.shared-style { color: blue; }",
         "description": "Shared CSS for team consistency"
       }
     }
   }
   ```

#### Step 3: Apply Selective Import

1. **Backup Current Settings**
   - Export current configuration before importing
   - Save as rollback option

2. **Import Selective File**
   - Use standard import process
   - Only specified settings will be updated
   - Other settings remain unchanged

3. **Verify Selective Import**
   - Check that only expected settings changed
   - Verify excluded settings remained local
   - Test functionality

### Method 2: Category-Based Selective Sync

#### Define Setting Categories

Group settings by purpose or sensitivity:

```javascript
const settingCategories = {
  team_shared: {
    description: "Settings shared across team",
    settings: ["feature_enabled", "refresh_interval"],
    sync_priority: "high",
  },
  appearance: {
    description: "Visual customization settings",
    settings: ["custom_css", "theme_preferences"],
    sync_priority: "medium",
  },
  security: {
    description: "Security and authentication",
    settings: ["api_key", "authentication_token"],
    sync_priority: "never",
  },
  personal: {
    description: "Individual user preferences",
    settings: ["debug_mode", "personal_shortcuts"],
    sync_priority: "never",
  },
};
```

#### Create Category Export Function

```javascript
function exportByCategory(categories) {
  const categoryExport = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    export_type: "category_selective",
    categories: categories,
    settings: {},
  };

  // Get all current settings
  getCurrentSettings().then((allSettings) => {
    categories.forEach((categoryName) => {
      const category = settingCategories[categoryName];
      if (category) {
        category.settings.forEach((settingKey) => {
          if (allSettings[settingKey]) {
            categoryExport.settings[settingKey] = allSettings[settingKey];
          }
        });
      }
    });

    // Download category-based export
    downloadJSON(
      categoryExport,
      `settings-${categories.join("-")}-export.json`,
    );
  });
}

// Usage examples:
exportByCategory(["team_shared", "appearance"]); // Sync team and appearance settings
exportByCategory(["team_shared"]); // Only team settings
```

## Sync Categories and Groups

### Predefined Sync Categories

#### Category 1: Team Standards

**Purpose**: Settings that should be consistent across team members

```json
{
  "category": "team_standards",
  "description": "Company-wide consistent settings",
  "settings": {
    "feature_enabled": {
      "type": "boolean",
      "value": true,
      "sync_reason": "Ensures all team members have same features enabled"
    },
    "refresh_interval": {
      "type": "number",
      "value": 300,
      "sync_reason": "Standard refresh rate for performance consistency"
    }
  }
}
```

**Sync Frequency**: Weekly or when standards change
**Distribution**: Push to all team members

#### Category 2: Project Configurations

**Purpose**: Settings specific to particular projects

```json
{
  "category": "project_alpha",
  "description": "Project Alpha specific configurations",
  "settings": {
    "advanced_config": {
      "type": "json",
      "value": {
        "endpoint": "https://alpha-api.example.com",
        "timeout": 5000,
        "project_id": "alpha-2025"
      },
      "sync_reason": "Project-specific API configuration"
    }
  }
}
```

**Sync Frequency**: At project milestones
**Distribution**: Project team members only

#### Category 3: Environment Settings

**Purpose**: Environment-specific configurations

```json
{
  "category": "development_environment",
  "description": "Development environment configurations",
  "settings": {
    "api_endpoint": {
      "type": "text",
      "value": "https://dev-api.example.com",
      "sync_reason": "Development API endpoint"
    },
    "debug_logging": {
      "type": "boolean",
      "value": true,
      "sync_reason": "Enable debug logging in development"
    }
  }
}
```

### Custom Category Creation

#### Define Your Own Categories

1. **Identify Common Setting Groups**

   ```
   Category Planning Worksheet:

   Category Name: [descriptive name]
   Purpose: [why these settings belong together]
   Settings Included: [list of setting keys]
   Sync Frequency: [how often to sync]
   Target Audience: [who should receive these settings]
   Security Level: [public/internal/restricted]
   ```

2. **Create Category Export Template**

   ```json
   {
     "category_template": "custom_category_name",
     "version": "1.0",
     "created_by": "your-name",
     "created_date": "2025-08-11",
     "description": "Description of category purpose",
     "settings_included": ["setting1", "setting2", "setting3"],
     "sync_instructions": "How and when to sync this category"
   }
   ```

3. **Implement Category Logic**

   ```javascript
   function createCustomCategory(categoryName, settingsList, description) {
     return {
       name: categoryName,
       description: description,
       settings: settingsList,
       created: new Date().toISOString(),
       export: function () {
         return exportByCategory([categoryName]);
       },
     };
   }

   // Usage
   const myCategory = createCustomCategory(
     "performance_settings",
     ["refresh_interval", "timeout_values", "cache_settings"],
     "Settings that affect extension performance",
   );
   ```

## Advanced Selective Sync

### Conditional Sync Rules

#### Rule-Based Sync Logic

Create rules that determine what to sync based on context:

```javascript
const syncRules = {
  by_environment: {
    development: {
      sync: ["debug_settings", "dev_api_endpoints"],
      exclude: ["production_api_keys", "performance_optimizations"],
    },
    production: {
      sync: ["performance_settings", "production_config"],
      exclude: ["debug_settings", "experimental_features"],
    },
  },
  by_role: {
    developer: {
      sync: ["development_tools", "debugging_options"],
      exclude: ["management_dashboards", "reporting_settings"],
    },
    manager: {
      sync: ["reporting_settings", "team_configurations"],
      exclude: ["debugging_options", "developer_tools"],
    },
  },
  by_device: {
    laptop: {
      sync: ["portable_settings", "offline_configurations"],
      exclude: ["desktop_optimizations", "large_screen_layouts"],
    },
    desktop: {
      sync: ["desktop_optimizations", "large_screen_layouts"],
      exclude: ["portable_settings", "battery_optimizations"],
    },
  },
};
```

#### Implementing Conditional Sync

1. **Detect Current Context**

   ```javascript
   function getCurrentContext() {
     return {
       environment: detectEnvironment(),
       role: getUserRole(),
       device: detectDevice(),
       project: getCurrentProject(),
     };
   }
   ```

2. **Apply Sync Rules**

   ```javascript
   function getSelectiveSyncSettings(context) {
     const rules = syncRules;
     let settingsToSync = [];
     let settingsToExclude = [];

     // Apply environment rules
     if (rules.by_environment[context.environment]) {
       const envRules = rules.by_environment[context.environment];
       settingsToSync.push(...envRules.sync);
       settingsToExclude.push(...envRules.exclude);
     }

     // Apply role rules
     if (rules.by_role[context.role]) {
       const roleRules = rules.by_role[context.role];
       settingsToSync.push(...roleRules.sync);
       settingsToExclude.push(...roleRules.exclude);
     }

     // Remove duplicates and resolve conflicts
     settingsToSync = [...new Set(settingsToSync)];
     settingsToExclude = [...new Set(settingsToExclude)];

     // Exclusions take precedence
     return settingsToSync.filter(
       (setting) => !settingsToExclude.includes(setting),
     );
   }
   ```

### Dynamic Selective Sync

#### Time-Based Selective Sync

Sync different settings at different intervals:

```javascript
const syncSchedule = {
  daily: {
    settings: ["feature_flags", "temporary_configs"],
    description: "Settings that change frequently",
  },
  weekly: {
    settings: ["team_standards", "project_configs"],
    description: "Stable team and project settings",
  },
  monthly: {
    settings: ["global_policies", "security_configs"],
    description: "Infrequently changing organizational settings",
  },
};
```

#### Event-Driven Selective Sync

Sync settings based on specific events:

```javascript
const eventSyncTriggers = {
  project_switch: {
    sync: ["project_configs", "environment_settings"],
    reason: "New project requires different configuration",
  },
  team_join: {
    sync: ["team_standards", "collaboration_tools"],
    reason: "New team member needs standard configuration",
  },
  environment_change: {
    sync: ["environment_configs", "api_endpoints"],
    reason: "Environment switch requires different settings",
  },
};
```

### Merge Strategies

#### Handling Sync Conflicts

When selective sync conflicts with local settings:

1. **Merge Strategy Options**

   ```javascript
   const mergeStrategies = {
     overwrite: {
       description: "Synced settings always override local",
       implementation: (local, synced) => ({ ...local, ...synced }),
     },
     preserve_local: {
       description: "Local settings take precedence",
       implementation: (local, synced) => ({ ...synced, ...local }),
     },
     smart_merge: {
       description: "Merge based on setting priority and timestamp",
       implementation: (local, synced) => smartMerge(local, synced),
     },
   };
   ```

2. **Smart Merge Logic**

   ```javascript
   function smartMerge(localSettings, syncedSettings) {
     const merged = { ...localSettings };

     for (const [key, syncedSetting] of Object.entries(syncedSettings)) {
       const localSetting = localSettings[key];

       if (!localSetting) {
         // New setting from sync
         merged[key] = syncedSetting;
       } else if (syncedSetting.priority === "high") {
         // High priority synced settings override local
         merged[key] = syncedSetting;
       } else if (
         new Date(syncedSetting.lastModified) >
         new Date(localSetting.lastModified)
       ) {
         // Newer synced settings override older local
         merged[key] = syncedSetting;
       }
       // Otherwise keep local setting
     }

     return merged;
   }
   ```

## Team Selective Sync

### Team Sync Policies

#### Defining Team Sync Standards

1. **Create Team Sync Policy Document**

   ```markdown
   # Team Selective Sync Policy

   ## Settings Categories

   ### MUST SYNC (Required for all team members)

   - Feature flags for current sprint
   - API endpoints for active projects
   - Team coding standards configurations
   - Shared development environment settings

   ### SHOULD SYNC (Recommended for consistency)

   - UI theme and appearance settings
   - Common keyboard shortcuts
   - Shared custom CSS for team projects
   - Performance optimization settings

   ### MUST NOT SYNC (Keep local/private)

   - Personal API keys and tokens
   - Individual debugging preferences
   - Personal productivity shortcuts
   - Local development paths

   ### CAN SYNC (Optional/situational)

   - Experimental feature settings
   - Personal workflow customizations
   - Device-specific optimizations
   ```

2. **Implement Policy Enforcement**

   ```javascript
   const teamSyncPolicy = {
     required: ["team_feature_flags", "project_api_endpoints"],
     recommended: ["shared_css", "team_shortcuts"],
     forbidden: ["personal_api_keys", "debug_preferences"],
     optional: ["experimental_features", "personal_workflows"],
   };

   function validateSyncCompliance(settingsToSync) {
     const issues = [];

     // Check required settings are included
     teamSyncPolicy.required.forEach((requiredSetting) => {
       if (!settingsToSync.includes(requiredSetting)) {
         issues.push({
           type: "missing_required",
           setting: requiredSetting,
           severity: "high",
         });
       }
     });

     // Check forbidden settings are not included
     teamSyncPolicy.forbidden.forEach((forbiddenSetting) => {
       if (settingsToSync.includes(forbiddenSetting)) {
         issues.push({
           type: "forbidden_included",
           setting: forbiddenSetting,
           severity: "high",
         });
       }
     });

     return issues;
   }
   ```

### Collaborative Selective Sync

#### Team Sync Workflows

1. **Distributed Team Sync**
   - Each team member maintains selective sync profile
   - Regular sync meetings to align configurations
   - Shared repository for team-standard settings

2. **Centralized Team Sync**
   - Team lead maintains authoritative selective sync
   - Team members pull updates on schedule
   - Centralized control over what syncs

3. **Hybrid Team Sync**
   - Core settings managed centrally
   - Personal preferences managed individually
   - Project-specific settings managed by project teams

#### Team Sync Implementation

```javascript
// Team selective sync coordinator
class TeamSelectiveSync {
  constructor(teamConfig) {
    this.teamId = teamConfig.teamId;
    this.syncEndpoint = teamConfig.syncEndpoint;
    this.memberRole = teamConfig.memberRole;
    this.syncPolicies = teamConfig.policies;
  }

  async pullTeamUpdates() {
    // Get latest team-approved selective sync
    const teamSettings = await fetch(
      `${this.syncEndpoint}/team/${this.teamId}/selective-sync`,
    );
    const selectiveSettings = await teamSettings.json();

    // Validate against team policies
    const validationIssues = this.validateTeamSync(selectiveSettings);
    if (validationIssues.length > 0) {
      throw new Error(`Team sync validation failed: ${validationIssues}`);
    }

    // Apply team selective sync
    await this.applySelectiveSync(selectiveSettings);
  }

  async pushMemberUpdates(settings) {
    // Filter settings based on what member is allowed to share
    const sharableSettings = this.filterShareableSettings(settings);

    // Push to team sync endpoint
    await fetch(`${this.syncEndpoint}/team/${this.teamId}/member-updates`, {
      method: "POST",
      body: JSON.stringify(sharableSettings),
    });
  }
}
```

## Troubleshooting Selective Sync

### Common Selective Sync Issues

**Some Settings Not Syncing**

1. Check selective export includes desired settings
2. Verify import process completed successfully
3. Confirm setting names match exactly
4. Check for typos in setting keys

**Wrong Settings Being Synced**

1. Review selective sync configuration
2. Check category definitions
3. Verify export file contents
4. Update sync rules if needed

**Sync Conflicts Between Team Members**

1. Establish single source of truth
2. Use merge strategies consistently
3. Communicate changes to affected team
4. Implement conflict resolution process

### Advanced Troubleshooting

**Selective Sync Performance Issues**

- Optimize selective sync file sizes
- Reduce sync frequency for large setting groups
- Use incremental sync where possible
- Monitor sync operation performance

**Partial Sync Failures**

- Implement retry logic for failed settings
- Log detailed error information
- Create fallback sync mechanisms
- Maintain sync operation audit trail

**Team Sync Coordination Problems**

- Establish clear sync schedules
- Use notification systems for sync updates
- Implement sync status tracking
- Create sync troubleshooting procedures

### Sync Validation and Testing

#### Pre-Sync Validation

```javascript
function validateSelectiveSync(syncConfig) {
  const validationResults = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check required fields
  if (!syncConfig.settings || Object.keys(syncConfig.settings).length === 0) {
    validationResults.errors.push("No settings specified for sync");
    validationResults.valid = false;
  }

  // Validate setting structure
  for (const [key, setting] of Object.entries(syncConfig.settings)) {
    if (!setting.type || !setting.hasOwnProperty("value")) {
      validationResults.errors.push(`Invalid setting structure: ${key}`);
      validationResults.valid = false;
    }
  }

  // Check for sensitive data
  const sensitiveSettings = ["api_key", "password", "token", "secret"];
  for (const key of Object.keys(syncConfig.settings)) {
    if (
      sensitiveSettings.some((sensitive) =>
        key.toLowerCase().includes(sensitive),
      )
    ) {
      validationResults.warnings.push(
        `Potentially sensitive setting in sync: ${key}`,
      );
    }
  }

  return validationResults;
}
```

#### Post-Sync Testing

1. **Functionality Testing**
   - Test all synced features work correctly
   - Verify excluded settings remain unchanged
   - Check for any broken functionality

2. **Integration Testing**
   - Test interaction between synced and local settings
   - Verify no conflicts between setting groups
   - Confirm overall extension stability

## Best Practices for Selective Sync

### Planning Selective Sync

1. **Start with Security**
   - Identify sensitive settings first
   - Never sync credentials or tokens
   - Keep personal data local

2. **Define Categories Clearly**
   - Group related settings together
   - Use consistent naming conventions
   - Document category purposes

3. **Consider Your Audience**
   - Team sync: focus on consistency
   - Personal sync: focus on convenience
   - Cross-device sync: focus on portability

### Implementation Best Practices

1. **Version Control**
   - Version your selective sync configurations
   - Track changes to sync rules
   - Maintain backwards compatibility

2. **Testing and Validation**
   - Test selective sync before deployment
   - Validate sync results after application
   - Monitor for sync-related issues

3. **Documentation**
   - Document what settings sync and why
   - Provide troubleshooting guides
   - Maintain sync procedure documentation

### Maintenance and Monitoring

1. **Regular Reviews**
   - Review selective sync configurations quarterly
   - Update categories as needs change
   - Clean up unused sync rules

2. **Performance Monitoring**
   - Track sync operation performance
   - Monitor for sync failures
   - Optimize based on usage patterns

3. **Security Audits**
   - Regularly audit what's being synced
   - Ensure no sensitive data in sync
   - Review access permissions

## Quick Reference

### Selective Sync Methods

- **Manual**: Edit export files to include only desired settings
- **Category-based**: Group settings by type and sync categories
- **Rule-based**: Use conditional logic to determine what syncs
- **Template-based**: Create reusable selective sync templates

### Common Use Cases

- **Team standards**: Sync company-wide consistent settings
- **Project configs**: Share project-specific configurations
- **Environment settings**: Sync development/staging/production settings
- **Feature flags**: Distribute feature toggle updates

### Security Guidelines

- Never sync API keys, passwords, or tokens
- Review sync contents before distribution
- Use least-privilege principle for shared settings
- Regular security audits of sync data

## References

- [Sync Settings Guide](sync-settings.md) - Overall synchronization methods
- [Export/Import Guide](export-import.md) - Detailed file operations
- [Profile Management](manage-profiles.md) - Using selective sync with profiles
- [Security Considerations](../explanation/security.md) - Protecting sensitive data

## Revision History

| Date       | Author             | Changes                      |
| ---------- | ------------------ | ---------------------------- |
| 2025-08-11 | Documentation Team | Initial selective sync guide |

# Missing UI Components and Features - Story

## Executive Summary

Implement critical missing UI components and features that prevent the Settings Extension from being a complete drop-in framework. This includes enum/dropdown support, expiration functionality, dirty state indicators, advanced config UI, and enhanced form controls that developers expect in a mature settings framework.

**Status**: Ready for Implementation  
**Priority**: High - Critical User-Facing Features  
**Story Points**: 21 (X-Large)  
**Sprint**: 3-4  

## User Story

**As a** developer using the Settings Extension framework  
**I want** comprehensive UI components for all common setting types  
**So that** I can create professional settings interfaces without implementing custom components myself.

**As an** end user of an extension using this framework  
**I want** intuitive form controls with clear feedback  
**So that** I can confidently configure settings without confusion or data loss.

## Problem Statement

### Missing Critical Components

Based on downstream developer feedback (Christian's analysis):

#### 1. Enum/Dropdown Support
> "So it didnt consider that we might want a dropdown box... so new option type: enum. it will also need a way to map 'real' names to values in the dropdown for the settings"

**Current State**: Only boolean, text, longtext, number, json types supported  
**Required**: Enum type with display name mapping for dropdown options

#### 2. Expiration Functionality
> "Also for drafts & schedules I will need to expire them so it doesnt keep adding forever. would be nice if it could handle expiration based on a settable timestamp & use a different user-settable option for how long to keep them. maybe add 'expiration' to the setting object and default to 0"

**Current State**: No time-based setting management  
**Required**: Expiration timestamps with configurable retention periods

#### 3. Dirty State Indicators  
> "Options UI tracks changes, but doesn't show which ones have changed -- needs some kind of dirty indicator"

**Current State**: Changes tracked but no visual feedback  
**Required**: Visual indicators showing unsaved changes

#### 4. Advanced Config UI
> "obviously we generally wont want people editing json directly... so for example in SFA I have it do a textarea then hide it and create separate options in the UI (based on some manual mappings I created) and any change to any of the sub-items re-writes the json in the hidden textarea"

**Current State**: Raw JSON textarea for complex settings  
**Required**: Generated form controls for JSON object properties

#### 5. JSON Enhancement
> "Also if we do ever think a json box is needed then I would like to see it also add a prettifier/syntax check"

**Current State**: Basic textarea with no validation  
**Required**: JSON syntax highlighting, validation, and formatting

## Acceptance Criteria

### Primary Acceptance Criteria

- [ ] **Enum Component**: Dropdown/select component with display name mapping
- [ ] **Expiration System**: Time-based setting cleanup with configurable retention
- [ ] **Dirty Indicators**: Visual feedback for unsaved changes in both popup and options
- [ ] **Advanced Config UI**: Generated form controls for JSON object properties
- [ ] **Enhanced JSON Editor**: Syntax highlighting, validation, and prettification
- [ ] **Form Validation**: Comprehensive client-side validation with user feedback

### Technical Acceptance Criteria

- [ ] **Component Architecture**: Pluggable component system for new setting types
- [ ] **State Management**: Centralized dirty state tracking across all components
- [ ] **Accessibility**: All components meet WCAG 2.1 AA standards
- [ ] **Cross-Browser**: Components work identically in Chrome, Edge, Firefox
- [ ] **Performance**: Complex forms render <200ms, remain responsive during input

### Quality Acceptance Criteria

- [ ] **Test Coverage**: >95% coverage for all new UI components
- [ ] **Visual Testing**: Automated visual regression testing for UI components
- [ ] **User Testing**: Usability validation with real-world scenarios
- [ ] **Documentation**: Complete component API documentation with examples
- [ ] **Error Handling**: Graceful degradation and error recovery for all components

## Technical Approach

### 1. Enum/Dropdown Component

#### Enhanced Configuration Schema
```json
{
  "refresh_interval": {
    "type": "enum",
    "value": "60",
    "description": "Auto-refresh interval",
    "displayName": "Refresh Interval",
    "category": "general",
    "options": {
      "30": "30 seconds",
      "60": "1 minute",
      "300": "5 minutes", 
      "900": "15 minutes",
      "3600": "1 hour"
    },
    "validation": "required"
  },
  "theme": {
    "type": "enum",
    "value": "system",
    "description": "UI theme preference",
    "displayName": "Theme",
    "category": "appearance",
    "options": {
      "light": "Light Mode",
      "dark": "Dark Mode", 
      "system": "Follow System"
    }
  }
}
```

#### Component Implementation
```javascript
// components/enum-setting.js
class EnumSettingComponent {
  render(key, setting, currentValue) {
    const select = document.createElement('select');
    select.id = `setting-${key}`;
    select.className = 'setting-input enum-setting';
    
    for (const [value, displayName] of Object.entries(setting.options)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = displayName;
      option.selected = value === currentValue;
      select.appendChild(option);
    }
    
    return select;
  }

  validate(value, setting) {
    return Object.keys(setting.options).includes(value);
  }
}
```

### 2. Expiration System

#### Configuration Schema Extension
```json
{
  "draft_content": {
    "type": "json",
    "value": [],
    "description": "Draft content storage",
    "displayName": "Draft Content",
    "category": "data",
    "expiration": {
      "enabled": true,
      "defaultTTL": 604800,
      "field": "created",
      "cleanupInterval": 86400
    }
  },
  "draft_retention_days": {
    "type": "number",
    "value": 7,
    "description": "Days to keep draft content",
    "displayName": "Draft Retention (Days)",
    "category": "data",
    "min": 1,
    "max": 365
  }
}
```

#### Expiration Management System
```javascript
// lib/expiration-manager.js
class ExpirationManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.cleanupTimers = new Map();
  }

  async initialize() {
    const config = await this.settingsManager.getConfiguration();
    
    for (const [key, setting] of Object.entries(config)) {
      if (setting.expiration?.enabled) {
        this.scheduleCleanup(key, setting.expiration);
      }
    }
  }

  async addExpiringItem(settingKey, item) {
    const setting = await this.settingsManager.getSetting(settingKey);
    const currentItems = setting.value || [];
    
    const itemWithTimestamp = {
      ...item,
      created: Date.now(),
      expires: Date.now() + this.getTTL(settingKey)
    };
    
    currentItems.push(itemWithTimestamp);
    await this.settingsManager.setSetting(settingKey, currentItems);
  }

  async cleanupExpired(settingKey) {
    const setting = await this.settingsManager.getSetting(settingKey);
    const items = setting.value || [];
    const now = Date.now();
    
    const validItems = items.filter(item => 
      !item.expires || item.expires > now
    );
    
    if (validItems.length !== items.length) {
      await this.settingsManager.setSetting(settingKey, validItems);
      console.log(`Cleaned up ${items.length - validItems.length} expired items from ${settingKey}`);
    }
  }
}
```

### 3. Dirty State Indicators

#### State Management System
```javascript
// lib/dirty-state-manager.js
class DirtyStateManager {
  constructor() {
    this.dirtySettings = new Set();
    this.originalValues = new Map();
    this.listeners = new Set();
  }

  markDirty(key, originalValue, currentValue) {
    if (!this.originalValues.has(key)) {
      this.originalValues.set(key, originalValue);
    }
    
    const original = this.originalValues.get(key);
    if (this.valuesEqual(original, currentValue)) {
      this.dirtySettings.delete(key);
    } else {
      this.dirtySettings.add(key);
    }
    
    this.notifyListeners();
  }

  isDirty(key) {
    return this.dirtySettings.has(key);
  }

  hasUnsavedChanges() {
    return this.dirtySettings.size > 0;
  }

  getDirtySettings() {
    return Array.from(this.dirtySettings);
  }
}
```

#### Visual Indicators
```css
/* styles/dirty-indicators.css */
.setting-row.dirty {
  border-left: 4px solid #ff9800;
  background-color: rgba(255, 152, 0, 0.05);
}

.setting-row.dirty .setting-label::after {
  content: " *";
  color: #ff9800;
  font-weight: bold;
}

.dirty-indicator {
  position: relative;
}

.dirty-indicator.dirty::after {
  content: "";
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background-color: #ff9800;
  border-radius: 50%;
  border: 2px solid #fff;
}

.unsaved-changes-banner {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  padding: 12px;
  margin: 16px 0;
  border-radius: 4px;
  display: none;
}

.unsaved-changes-banner.visible {
  display: block;
}
```

### 4. Advanced Config UI Generator

#### JSON Object Form Generator
```javascript
// components/advanced-config-generator.js
class AdvancedConfigGenerator {
  generateFormControls(key, setting, currentValue) {
    const container = document.createElement('div');
    container.className = 'advanced-config-container';
    
    // Create hidden textarea for the actual JSON value
    const hiddenTextarea = document.createElement('textarea');
    hiddenTextarea.id = `setting-${key}`;
    hiddenTextarea.style.display = 'none';
    hiddenTextarea.value = JSON.stringify(currentValue, null, 2);
    container.appendChild(hiddenTextarea);
    
    // Generate form controls based on JSON structure
    const formContainer = document.createElement('div');
    formContainer.className = 'json-form-controls';
    
    this.generateControlsRecursive(currentValue, formContainer, key, '');
    container.appendChild(formContainer);
    
    // Add JSON view toggle
    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.textContent = 'Show Raw JSON';
    toggleButton.className = 'json-toggle-btn';
    toggleButton.onclick = () => this.toggleJSONView(container);
    container.appendChild(toggleButton);
    
    return container;
  }

  generateControlsRecursive(obj, container, rootKey, path) {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      const controlGroup = document.createElement('div');
      controlGroup.className = 'config-control-group';
      
      const label = document.createElement('label');
      label.textContent = this.formatLabel(key);
      label.className = 'config-control-label';
      controlGroup.appendChild(label);
      
      const input = this.createInputForValue(value, rootKey, fullPath);
      controlGroup.appendChild(input);
      
      container.appendChild(controlGroup);
    }
  }

  createInputForValue(value, rootKey, path) {
    const input = document.createElement('input');
    input.className = 'config-control-input';
    input.dataset.path = path;
    input.dataset.rootKey = rootKey;
    
    if (typeof value === 'boolean') {
      input.type = 'checkbox';
      input.checked = value;
    } else if (typeof value === 'number') {
      input.type = 'number';
      input.value = value;
    } else {
      input.type = 'text';
      input.value = String(value);
    }
    
    input.addEventListener('change', (e) => {
      this.updateJSONFromControl(e.target);
    });
    
    return input;
  }
}
```

### 5. Enhanced JSON Editor

#### Syntax Highlighting and Validation
```javascript
// components/json-editor.js
class EnhancedJSONEditor {
  constructor(textarea, setting) {
    this.textarea = textarea;
    this.setting = setting;
    this.setupEditor();
  }

  setupEditor() {
    // Create wrapper for enhanced features
    const wrapper = document.createElement('div');
    wrapper.className = 'json-editor-wrapper';
    this.textarea.parentNode.insertBefore(wrapper, this.textarea);
    wrapper.appendChild(this.textarea);
    
    // Add validation indicator
    this.validationIndicator = document.createElement('div');
    this.validationIndicator.className = 'json-validation-indicator';
    wrapper.appendChild(this.validationIndicator);
    
    // Add format button
    const formatBtn = document.createElement('button');
    formatBtn.type = 'button';
    formatBtn.textContent = 'Format JSON';
    formatBtn.className = 'json-format-btn';
    formatBtn.onclick = () => this.formatJSON();
    wrapper.appendChild(formatBtn);
    
    // Setup real-time validation
    this.textarea.addEventListener('input', () => this.validateJSON());
    this.validateJSON();
  }

  validateJSON() {
    const value = this.textarea.value.trim();
    if (!value) {
      this.showValidation(null, '');
      return true;
    }

    try {
      JSON.parse(value);
      this.showValidation(true, 'Valid JSON');
      return true;
    } catch (error) {
      this.showValidation(false, `Invalid JSON: ${error.message}`);
      return false;
    }
  }

  formatJSON() {
    try {
      const parsed = JSON.parse(this.textarea.value);
      this.textarea.value = JSON.stringify(parsed, null, 2);
      this.showValidation(true, 'JSON formatted successfully');
    } catch (error) {
      this.showValidation(false, 'Cannot format invalid JSON');
    }
  }

  showValidation(isValid, message) {
    this.validationIndicator.className = `json-validation-indicator ${
      isValid === null ? '' : isValid ? 'valid' : 'invalid'
    }`;
    this.validationIndicator.textContent = message;
  }
}
```

## Implementation Roadmap

### Sprint 3: Core Components

#### Week 1: Enum Component and Expiration System
- [ ] Implement `EnumSettingComponent` with dropdown UI
- [ ] Add enum type support to settings manager
- [ ] Create `ExpirationManager` class with TTL support
- [ ] Add expiration configuration schema
- [ ] Unit tests for enum validation and expiration logic

#### Week 2: Dirty State Management  
- [ ] Implement `DirtyStateManager` class
- [ ] Add dirty state tracking to all input components
- [ ] Create visual indicators and CSS styling
- [ ] Integrate unsaved changes warning system
- [ ] E2E tests for dirty state scenarios

### Sprint 4: Advanced UI Features

#### Week 1: Advanced Config Generator
- [ ] Build `AdvancedConfigGenerator` for JSON objects
- [ ] Implement recursive form control generation
- [ ] Add JSON/form toggle functionality
- [ ] Create configuration mapping system
- [ ] Integration tests for complex JSON scenarios

#### Week 2: Enhanced JSON Editor and Polish
- [ ] Implement `EnhancedJSONEditor` with validation
- [ ] Add JSON syntax highlighting and formatting
- [ ] Complete accessibility improvements
- [ ] Cross-browser testing and optimization
- [ ] Performance testing and final polish

## Testing Strategy

### Component Unit Testing

#### Enum Component Testing
```javascript
// test/components/enum-setting.test.js
describe('EnumSettingComponent', () => {
  test('renders dropdown with correct options', () => {
    const setting = {
      type: 'enum',
      options: { '30': '30 seconds', '60': '1 minute' }
    };
    const component = new EnumSettingComponent();
    const element = component.render('test', setting, '60');
    
    expect(element.tagName).toBe('SELECT');
    expect(element.options.length).toBe(2);
    expect(element.value).toBe('60');
  });

  test('validates enum values correctly', () => {
    const setting = { options: { 'a': 'A', 'b': 'B' } };
    const component = new EnumSettingComponent();
    
    expect(component.validate('a', setting)).toBe(true);
    expect(component.validate('c', setting)).toBe(false);
  });
});
```

#### Dirty State Testing
```javascript
// test/lib/dirty-state-manager.test.js
describe('DirtyStateManager', () => {
  test('marks settings dirty when values change', () => {
    const manager = new DirtyStateManager();
    manager.markDirty('test', 'original', 'changed');
    
    expect(manager.isDirty('test')).toBe(true);
    expect(manager.hasUnsavedChanges()).toBe(true);
  });

  test('clears dirty state when value reverts', () => {
    const manager = new DirtyStateManager();
    manager.markDirty('test', 'original', 'changed');
    manager.markDirty('test', 'original', 'original');
    
    expect(manager.isDirty('test')).toBe(false);
  });
});
```

### E2E Testing

#### User Workflow Testing
- [ ] Complete enum dropdown selection workflow
- [ ] Dirty state indicators during form editing
- [ ] Advanced config form generation and validation
- [ ] JSON editor formatting and error handling
- [ ] Expiration cleanup verification

#### Cross-Browser Testing
- [ ] All components render correctly in Chrome, Edge, Firefox
- [ ] Dropdown behavior consistent across browsers
- [ ] JSON editor functionality cross-browser
- [ ] Accessibility compliance testing

### Visual Regression Testing
- [ ] Automated screenshots of all new components
- [ ] Dirty state indicator appearance validation
- [ ] JSON editor layout and styling verification
- [ ] Responsive behavior across screen sizes

## Risk Mitigation

### Risk: Component Complexity Overhead

**Probability**: Medium  
**Impact**: Medium  
**Mitigation**: 
- Progressive enhancement approach
- Fallback to simple inputs for unsupported features
- Performance monitoring and optimization
- Clear component boundaries and responsibilities

### Risk: Cross-Browser Compatibility Issues

**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Comprehensive cross-browser testing from start
- Use of standard HTML form controls where possible
- Feature detection and graceful degradation
- Browser-specific testing in CI pipeline

### Risk: User Experience Complexity

**Probability**: Low  
**Impact**: High  
**Mitigation**:
- User testing with real-world scenarios
- Progressive disclosure of advanced features
- Clear help text and validation messages
- Accessibility compliance from start

## Definition of Done

### Component Requirements
- [ ] All 5 new component types implemented and functional
- [ ] Components work identically across Chrome, Edge, Firefox
- [ ] Accessibility compliance (WCAG 2.1 AA) verified
- [ ] Performance benchmarks met (<200ms render time)

### Testing Requirements
- [ ] >95% unit test coverage on all new components
- [ ] E2E tests cover all user workflows
- [ ] Visual regression tests prevent UI breakage
- [ ] Cross-browser automated testing passes

### Integration Requirements
- [ ] Components integrate seamlessly with existing settings manager
- [ ] Configuration schema supports all new features
- [ ] Backward compatibility maintained with existing settings
- [ ] No breaking changes to public APIs

### Documentation Requirements
- [ ] Complete component API documentation
- [ ] Configuration schema documentation updated
- [ ] Migration guide for new features
- [ ] Troubleshooting guide for component issues

## Success Metrics

### Feature Completeness
- **Component Coverage**: 5 new component types implemented
- **Feature Parity**: Matches or exceeds common settings framework capabilities
- **Integration Ease**: New components require zero custom code for basic usage

### User Experience
- **Visual Feedback**: Dirty indicators provide clear unsaved change visibility
- **Form Validation**: Real-time validation prevents user errors
- **Accessibility**: 100% WCAG 2.1 AA compliance
- **Performance**: Complex forms remain responsive <200ms

### Developer Experience  
- **Component Reusability**: Components work in any context (popup, options, content)
- **Configuration Simplicity**: New components configured declaratively in JSON
- **Testing Support**: Components easily testable with comprehensive test utilities

## Dependencies

### Internal Dependencies
- **Configuration Management Story**: Required for enhanced schema support
- **Settings Manager**: Integration points for new component types
- **Browser Compatibility**: Cross-browser component rendering

### External Dependencies
- **Browser APIs**: Standard HTML form controls and validation APIs
- **CSS Grid/Flexbox**: Modern layout support for component styling
- **JSON APIs**: Native JSON parsing and validation support

## Related Work

### Epic Integration
- **Framework Maturity Epic**: Core feature implementation for complete framework
- **Developer Experience**: Professional UI components improve framework adoption
- **Maintainability**: Component architecture enables easy extension

### Future Story Enablement
- **Extensibility Story**: Component architecture foundation for plugin system
- **File Organization Story**: Clean component organization improves structure
- **Testing Enhancement**: Component testing patterns improve overall test quality

### References
- [Framework Maturity Epic](001-framework-maturity-epic.md) - Parent epic context
- [Configuration Management Story](002-configuration-management-story.md) - Foundation dependency
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility requirements

## Revision History

| Date       | Author           | Changes                                                                      |
| ---------- | ---------------- | ---------------------------------------------------------------------------- |
| 2025-08-14 | Development Team | Initial story created based on missing UI component analysis from Christian's feedback |

---

**CRITICAL**: These UI components are essential for developer adoption. Without enum support, expiration functionality, and proper visual feedback, the framework cannot serve as a complete drop-in solution for real-world extension development needs.
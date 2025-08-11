// Popup JavaScript for Settings Extension
// Import browser compatibility layer
const script = document.createElement('script');
script.src = '../lib/browser-compat.js';
document.head.appendChild(script);
class SettingsPopup {
    constructor() {
        this.currentSettings = new Map();
        this.validationErrors = new Map();
        this.isInitialized = false;
        
        this.setupEventListeners();
        this.initialize();
    }

    async initialize() {
        try {
            await this.loadSettings();
            this.renderSettings();
            this.hideLoading();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            this.showError('Failed to load settings. Please try again.');
            this.hideLoading();
        }
    }

    async loadSettings() {
        try {
            const response = await browserAPI.runtime.sendMessage({
                type: 'GET_ALL_SETTINGS'
            });
            
            if (!response) {
                throw new Error('No response from background script');
            }
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.currentSettings = new Map(Object.entries(response.settings));
        } catch (error) {
            throw error;
        }
    }

    renderSettings() {
        const container = document.getElementById('settings-container');
        container.innerHTML = '';

        // Group settings by type for better organization
        const settingGroups = {
            'Quick Settings': ['feature_enabled', 'refresh_interval'],
            'Configuration': ['api_key', 'advanced_config'],
            'Appearance': ['custom_css']
        };

        for (const [groupName, settingKeys] of Object.entries(settingGroups)) {
            const groupElement = this.createSettingGroup(groupName, settingKeys);
            if (groupElement) {
                container.appendChild(groupElement);
            }
        }

        container.style.display = 'block';
    }

    createSettingGroup(groupName, settingKeys) {
        const validSettings = settingKeys.filter(key => this.currentSettings.has(key));
        
        if (validSettings.length === 0) {
            return null;
        }

        const groupElement = document.createElement('div');
        groupElement.className = 'setting-group';
        
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = groupName;
        groupTitle.className = 'setting-group-title';
        groupElement.appendChild(groupTitle);

        validSettings.forEach(key => {
            const setting = this.currentSettings.get(key);
            const settingElement = this.createSettingElement(key, setting);
            groupElement.appendChild(settingElement);
        });

        return groupElement;
    }

    createSettingElement(key, setting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'setting-item';
        wrapper.setAttribute('data-key', key);

        const label = document.createElement('label');
        label.textContent = setting.description;
        label.className = 'setting-label';
        label.setAttribute('for', `setting-${key}`);

        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';

        const input = this.createInputElement(key, setting);
        input.id = `setting-${key}`;
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = '';

        inputContainer.appendChild(input);
        inputContainer.appendChild(errorMessage);

        wrapper.appendChild(label);
        wrapper.appendChild(inputContainer);

        return wrapper;
    }

    createInputElement(key, setting) {
        let input;
        
        switch (setting.type) {
            case 'boolean':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = setting.value;
                input.addEventListener('change', () => this.handleSettingChange(key, input));
                break;
                
            case 'text':
                input = document.createElement('input');
                input.type = 'text';
                input.value = setting.value;
                input.maxLength = setting.maxLength || 1000;
                input.placeholder = `Enter ${setting.description.toLowerCase()}`;
                input.addEventListener('input', () => this.handleSettingChange(key, input));
                input.addEventListener('blur', () => this.validateSetting(key, input));
                break;
                
            case 'longtext':
                input = document.createElement('textarea');
                input.value = setting.value;
                input.maxLength = setting.maxLength || 50000;
                input.rows = 3;
                input.placeholder = `Enter ${setting.description.toLowerCase()}`;
                input.addEventListener('input', () => this.handleSettingChange(key, input));
                input.addEventListener('blur', () => this.validateSetting(key, input));
                break;
                
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.value = setting.value;
                input.min = setting.min;
                input.max = setting.max;
                input.step = 1;
                input.addEventListener('input', () => this.handleSettingChange(key, input));
                input.addEventListener('blur', () => this.validateSetting(key, input));
                break;
                
            case 'json':
                input = document.createElement('textarea');
                input.value = JSON.stringify(setting.value, null, 2);
                input.className = 'json-input';
                input.rows = 4;
                input.addEventListener('input', () => this.handleSettingChange(key, input));
                input.addEventListener('blur', () => this.validateSetting(key, input));
                break;
                
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.value = setting.value;
                input.addEventListener('input', () => this.handleSettingChange(key, input));
                break;
        }

        input.className = 'setting-input';
        return input;
    }

    async handleSettingChange(key, input) {
        try {
            const setting = this.currentSettings.get(key);
            let value = input.value;
            
            // Parse value based on type
            if (setting.type === 'boolean') {
                value = input.checked;
            } else if (setting.type === 'number') {
                value = parseFloat(value);
                if (isNaN(value)) {
                    throw new Error('Invalid number');
                }
            } else if (setting.type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    throw new Error('Invalid JSON format');
                }
            }

            // Validate the value
            this.validateValue(setting, value);

            // Update the setting
            await this.updateSetting(key, value);
            
            // Clear any validation errors
            this.clearValidationError(key);
            
        } catch (error) {
            this.setValidationError(key, error.message);
        }
    }

    validateSetting(key, input) {
        try {
            const setting = this.currentSettings.get(key);
            let value = input.value;
            
            if (setting.type === 'number') {
                value = parseFloat(value);
                if (isNaN(value)) {
                    throw new Error('Invalid number');
                }
            } else if (setting.type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    throw new Error('Invalid JSON format');
                }
            }

            this.validateValue(setting, value);
            this.clearValidationError(key);
            
        } catch (error) {
            this.setValidationError(key, error.message);
        }
    }

    validateValue(setting, value) {
        switch (setting.type) {
            case 'boolean':
                if (typeof value !== 'boolean') {
                    throw new Error('Must be a boolean');
                }
                break;
                
            case 'text':
            case 'longtext':
                if (typeof value !== 'string') {
                    throw new Error('Must be a string');
                }
                if (setting.maxLength && value.length > setting.maxLength) {
                    throw new Error(`Exceeds maximum length of ${setting.maxLength}`);
                }
                break;
                
            case 'number':
                if (typeof value !== 'number') {
                    throw new Error('Must be a number');
                }
                if (setting.min !== undefined && value < setting.min) {
                    throw new Error(`Must be at least ${setting.min}`);
                }
                if (setting.max !== undefined && value > setting.max) {
                    throw new Error(`Must be at most ${setting.max}`);
                }
                break;
                
            case 'json':
                if (typeof value !== 'object' || value === null) {
                    throw new Error('Must be a valid object');
                }
                break;
        }
    }

    async updateSetting(key, value) {
        return new Promise((resolve, reject) => {
            browserAPI.runtime.sendMessage({
                type: 'UPDATE_SETTING',
                key: key,
                value: value
            }).then((response) => {
                if (!response) {
                    reject(new Error('No response from background script'));
                    return;
                }
                
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                
                // Update local cache
                const setting = this.currentSettings.get(key);
                setting.value = value;
                this.currentSettings.set(key, setting);
                
                resolve();
            }).catch(reject);
        });
    }

    setValidationError(key, message) {
        this.validationErrors.set(key, message);
        
        const settingElement = document.querySelector(`[data-key="${key}"]`);
        if (settingElement) {
            settingElement.classList.add('error');
            const errorElement = settingElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = message;
            }
        }
    }

    clearValidationError(key) {
        this.validationErrors.delete(key);
        
        const settingElement = document.querySelector(`[data-key="${key}"]`);
        if (settingElement) {
            settingElement.classList.remove('error');
            const errorElement = settingElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }
    }

    async exportSettings() {
        try {
            const response = await browserAPI.runtime.sendMessage({
                type: 'EXPORT_SETTINGS'
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            const blob = new Blob([response.data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showSuccess('Settings exported successfully');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError(`Export failed: ${error.message}`);
        }
    }

    async importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const content = await file.text();
                
                const response = await browserAPI.runtime.sendMessage({
                    type: 'IMPORT_SETTINGS',
                    data: content
                });
                
                if (response.error) {
                    throw new Error(response.error);
                }
                
                await this.loadSettings();
                this.renderSettings();
                this.showSuccess('Settings imported successfully');
                
            } catch (error) {
                console.error('Import failed:', error);
                this.showError(`Import failed: ${error.message}`);
            }
        });
        
        input.click();
    }

    async resetToDefaults() {
        if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            return;
        }
        
        try {
            const response = await new Promise((resolve, reject) => {
                browserAPI.runtime.sendMessage({
                    type: 'RESET_SETTINGS'
                }).then(resolve).catch(reject);
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            await this.loadSettings();
            this.renderSettings();
            this.showSuccess('Settings reset to defaults');
            
        } catch (error) {
            console.error('Reset failed:', error);
            this.showError(`Reset failed: ${error.message}`);
        }
    }

    openAdvancedSettings() {
        browserAPI.tabs.create({ url: browserAPI.runtime.getURL('options/options.html') });
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const container = document.getElementById('message-container');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        container.appendChild(messageEl);
        
        setTimeout(() => {
            if (container.contains(messageEl)) {
                container.removeChild(messageEl);
            }
        }, 5000);
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('export-btn').addEventListener('click', () => this.exportSettings());
            document.getElementById('import-btn').addEventListener('click', () => this.importSettings());
            document.getElementById('reset-btn').addEventListener('click', () => this.resetToDefaults());
            document.getElementById('advanced-btn').addEventListener('click', () => this.openAdvancedSettings());
        });
    }
}

// Initialize the popup when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SettingsPopup();
});
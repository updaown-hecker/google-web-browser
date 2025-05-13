const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { app } = require('electron').remote;

class SettingsManager {
  constructor() {
    this.settingsPath = path.join(__dirname, 'user-settings', 'settings.json');
    this.defaultSettings = {
      homepage: 'https://www.google.com',
      searchEngine: 'https://www.google.com/search?q=',
      enableNotifications: true,
      darkMode: false,
      downloadPath: app.getPath('downloads')
    };
    this.ensureSettingsDirectory();
    this.settings = this.defaultSettings;
  }

  ensureSettingsDirectory() {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = await fs.promises.readFile(this.settingsPath, 'utf8');
        this.settings = JSON.parse(data);
      } else {
        this.settings = this.defaultSettings;
        await this.saveSettings(this.defaultSettings);
      }
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = this.defaultSettings;
      return this.defaultSettings;
    }
  }

  async initializeSettings() {
    try {
      if (!fs.existsSync(this.settingsPath)) {
        await this.saveSettings(this.defaultSettings);
      }
      this.applyTheme();
    } catch (error) {
      console.error('Error initializing settings:', error);
      throw error;
    }
  }

  getSetting(key) {
    return this.settings[key];
  }

  setSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings(this.settings);
    
    if (key === 'darkMode') {
      this.applyTheme();
    }
  }

  async saveSettings(settings) {
    try {
      await fs.promises.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  applyTheme() {
    if (this.settings.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  renderSettingsUI() {
    const container = document.getElementById('settingsContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="settings-section">
        <h3>General Settings</h3>
        <div class="setting-item">
          <label>Homepage:</label>
          <input type="text" id="homepage" value="${this.settings.homepage}">
        </div>
        <div class="setting-item">
          <label>Dark Mode:</label>
          <input type="checkbox" id="darkMode" ${this.settings.darkMode ? 'checked' : ''}>
        </div>
        <div class="setting-item">
          <label>Enable Notifications:</label>
          <input type="checkbox" id="enableNotifications" ${this.settings.enableNotifications ? 'checked' : ''}>
        </div>
        <div class="setting-item">
          <label>Download Path:</label>
          <input type="text" id="downloadPath" value="${this.settings.downloadPath}" readonly>
          <button id="changeDownloadPath">Change</button>
        </div>
      </div>
    `;

    // Add event listeners
    document.getElementById('homepage').addEventListener('change', (e) => {
      this.setSetting('homepage', e.target.value);
    });

    document.getElementById('darkMode').addEventListener('change', (e) => {
      this.setSetting('darkMode', e.target.checked);
    });

    document.getElementById('enableNotifications').addEventListener('change', (e) => {
      this.setSetting('enableNotifications', e.target.checked);
    });

    document.getElementById('changeDownloadPath').addEventListener('click', () => {
      ipcRenderer.send('open-download-dialog');
    });
  }
}

// Export the SettingsManager class
module.exports = SettingsManager;
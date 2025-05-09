const { ipcRenderer } = require('electron');
const Store = require('electron-store');

class SettingsManager {
  constructor() {
    this.store = new Store();
    this.defaultSettings = {
      homepage: 'https://www.google.com',
      searchEngine: 'https://www.google.com/search?q=',
      enableNotifications: true,
      darkMode: false,
      downloadPath: this.store.get('downloadPath') || require('electron').app.getPath('downloads')
    };
    this.settings = this.store.get('settings', this.defaultSettings);
    this.initializeSettings();
  }

  initializeSettings() {
    if (!this.store.has('settings')) {
      this.store.set('settings', this.defaultSettings);
    }
    this.applyTheme();
  }

  getSetting(key) {
    return this.settings[key];
  }

  setSetting(key, value) {
    this.settings[key] = value;
    this.store.set('settings', this.settings);
    
    if (key === 'darkMode') {
      this.applyTheme();
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
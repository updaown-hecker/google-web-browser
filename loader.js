const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

class ModuleLoader {
  constructor() {
    this.loadedModules = new Map();
  }

  async loadModule(moduleName, modulePath) {
    try {
      const module = require(modulePath);
      this.loadedModules.set(moduleName, module);
      console.log(`✅ Successfully loaded module: ${moduleName}`);
      return module;
    } catch (error) {
      console.error(`❌ Failed to load module: ${moduleName}`, error);
      return null;
    }
  }

  async initializeModules() {
    console.log('🔄 Starting module initialization...');

    // Load Settings Manager
    const settingsManager = await this.loadModule('settings', './settings.js');
    if (settingsManager) {
      const manager = new settingsManager();
      await manager.initializeSettings();
    }

    // Load Bookmarks
    const bookmarksModule = await this.loadModule('bookmarks', './bookmarks.js');

    // Load Downloads Manager
    const downloadsModule = await this.loadModule('downloads', './downloads.js');

    // Load Additional Imports
    const importsModule = await this.loadModule('imports', './imports.js');

    console.log('✨ Module initialization complete');
    
    // Notify renderer that all modules are loaded
    ipcRenderer.send('modules-loaded');
  }

  getLoadedModule(moduleName) {
    return this.loadedModules.get(moduleName);
  }
}

// Export the ModuleLoader class
module.exports = ModuleLoader;
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Import managers
const SettingsManager = require('./settings');
const DownloadManager = require('./downloads');
const BookmarkManager = require('./bookmarks');

// Export all necessary modules and classes
module.exports = {
    SettingsManager,
    DownloadManager,
    BookmarkManager
};
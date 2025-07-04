const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let TabManager = null;

// Export a function to set TabManager from renderer.js
function setTabManager(manager) {
  TabManager = manager;
}

const BookmarkDialog = require('./bookmark-dialog');

class BookmarkManager {
  static instance = null;

  static getInstance() {
    if (!BookmarkManager.instance) {
      BookmarkManager.instance = new BookmarkManager();
    }
    return BookmarkManager.instance;
  }

  static init() {
    return BookmarkManager.getInstance();
  }

  constructor() {
    this.bookmarksPath = path.join(__dirname, 'user-settings', 'bookmarks.json');
    this.bookmarks = this.loadBookmarks();
    this.bookmarksBarVisible = true;
    this.bookmarkDialog = new BookmarkDialog();
    window.bookmarkManager = this;
    
    // Ensure DOM is loaded before setting up UI
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupBookmarksBar();
        this.setupEventListeners();
      });
    } else {
      this.setupBookmarksBar();
      this.setupEventListeners();
    }
  }

  setupBookmarksBar() {
    const bookmarksBar = document.createElement('div');
    bookmarksBar.id = 'bookmarksBar';
    bookmarksBar.className = 'bookmarks-bar';
    document.querySelector('.navigation-bar').insertAdjacentElement('afterend', bookmarksBar);
    this.renderBookmarks();
  }

  setupEventListeners() {
    document.getElementById('bookmarkButton').addEventListener('click', () => {
      if (TabManager && TabManager.activeTab) {
        const url = TabManager.activeTab.url;
        const title = TabManager.activeTab.title;
        const favicon = TabManager.activeTab.webview.getFavicon();
        this.toggleBookmark(url, title, favicon);
      }
    });

    document.getElementById('menuButton').addEventListener('click', (e) => {
      const menu = document.getElementById('browserMenu');
      if (!menu) {
        this.showMenu(e);
      } else {
        menu.remove();
      }
    });
  }

  loadBookmarks() {
    try {
      if (fs.existsSync(this.bookmarksPath)) {
        const data = fs.readFileSync(this.bookmarksPath, 'utf8');
        return JSON.parse(data).bookmarks || [];
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
    return [];
  }

  saveBookmarks() {
    try {
      fs.writeFileSync(this.bookmarksPath, JSON.stringify({ bookmarks: this.bookmarks }, null, 2));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  }

  toggleBookmark(url, title, favicon) {
    const existingBookmark = this.bookmarks.find(b => b.url === url);
    const bookmarkButton = document.getElementById('bookmarkButton');
    
    if (existingBookmark) {
      this.removeBookmark(existingBookmark.id);
      if (bookmarkButton) bookmarkButton.textContent = '☆';
    } else {
      this.bookmarkDialog.show(url, title, favicon);
      if (bookmarkButton) bookmarkButton.textContent = '★';
    }
  }

  addBookmark(url, title, favicon, folderId = 'root') {
    const bookmark = {
      id: Math.random().toString(36).substr(2, 9),
      url,
      title,
      favicon,
      folderId,
      dateAdded: new Date().toISOString()
    };

    this.bookmarks.push(bookmark);
    this.saveBookmarks();
    this.renderBookmarks();
    return bookmark;
  }

  removeBookmark(id) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    this.saveBookmarks();
    this.renderBookmarks();
  }

  getFolders() {
    return this.bookmarks.filter(b => b.type === 'folder');
  }

  renderBookmarks() {
    const bookmarksBar = document.getElementById('bookmarksBar');
    if (!bookmarksBar) return;

    bookmarksBar.innerHTML = '';
    bookmarksBar.style.display = this.bookmarksBarVisible ? 'flex' : 'none';
    
    // Only render bookmarks in the root folder
    const rootBookmarks = this.bookmarks.filter(b => b.folderId === 'root');
    
    this.bookmarks.forEach(bookmark => {
      const bookmarkElement = document.createElement('div');
      bookmarkElement.className = 'bookmark-item';
      bookmarkElement.innerHTML = `
        <img src="${bookmark.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="%23ddd"/></svg>'}" alt="">
        <span>${bookmark.title}</span>
      `;
      
      bookmarkElement.addEventListener('click', () => {
        if (TabManager && TabManager.activeTab) {
          TabManager.activeTab.webview.loadURL(bookmark.url);
        }
      });

      bookmarkElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showBookmarkContextMenu(e, bookmark);
      });

      bookmarksBar.appendChild(bookmarkElement);
    });
  }

  showMenu(event) {
    const menu = document.createElement('div');
    menu.id = 'browserMenu';
    menu.className = 'browser-menu';
    
    const menuItems = [
      {
        label: 'Toggle Bookmarks Bar',
        action: () => {
          this.bookmarksBarVisible = !this.bookmarksBarVisible;
          this.renderBookmarks();
          // Save the visibility state to settings
          const settingsPath = path.join(__dirname, 'user-settings', 'settings.json');
          try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            settings.bookmarksBarVisible = this.bookmarksBarVisible;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
          } catch (error) {
            console.error('Error saving bookmarks bar state:', error);
          }
        }
      },
      {
        label: 'Settings',
        action: () => {
          if (TabManager && TabManager.activeTab) {
            TabManager.createTab('blinx://settings');
          }
        }
      }
    ];

    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.textContent = item.label;
      menuItem.addEventListener('click', () => {
        item.action();
        menu.remove();
      });
      menu.appendChild(menuItem);
    });

    document.body.appendChild(menu);
    
    // Position the menu
    const rect = event.target.getBoundingClientRect();
    menu.style.top = `${rect.bottom}px`;
    menu.style.right = '8px';

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target.id !== 'menuButton') {
        menu.remove();
      }
    }, { once: true });
  }

  showBookmarkContextMenu(event, bookmark) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div class="menu-item">Open in New Tab</div>
      <div class="menu-item">Edit</div>
      <div class="menu-item delete">Delete</div>
    `;

    menu.querySelector('.menu-item:first-child').addEventListener('click', () => {
      if (TabManager) {
        TabManager.createTab(bookmark.url);
      }
      menu.remove();
    });

    menu.querySelector('.delete').addEventListener('click', () => {
      this.removeBookmark(bookmark.id);
      menu.remove();
    });

    document.body.appendChild(menu);
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    document.addEventListener('click', function closeContextMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeContextMenu);
      }
    });
  }

  toggleBookmarksBar() {
    this.bookmarksBarVisible = !this.bookmarksBarVisible;
    this.store.set('bookmarksBarVisible', this.bookmarksBarVisible);
    this.renderBookmarks();
  }
}

// Initialize bookmark manager
const bookmarkManager = BookmarkManager.getInstance();

module.exports = {
  BookmarkManager,
  bookmarkManager
};
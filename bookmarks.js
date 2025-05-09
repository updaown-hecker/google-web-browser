const { ipcRenderer } = require('electron');
const Store = require('electron-store');
let TabManager;

// Avoid circular dependency by getting TabManager after module initialization
require('./renderer.js').then(module => {
  TabManager = module.TabManager;
}).catch(error => {
  console.error('Error loading TabManager:', error);
});

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
    this.store = new Store();
    this.bookmarks = this.store.get('bookmarks', []);
    this.bookmarksBarVisible = this.store.get('bookmarksBarVisible', true);
    
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

  toggleBookmark(url, title, favicon) {
    const existingBookmark = this.bookmarks.find(b => b.url === url);
    const bookmarkButton = document.getElementById('bookmarkButton');
    
    if (existingBookmark) {
      this.removeBookmark(existingBookmark.id);
      if (bookmarkButton) bookmarkButton.textContent = '☆';
    } else {
      this.addBookmark(url, title, favicon);
      if (bookmarkButton) bookmarkButton.textContent = '★';
    }
  }

  addBookmark(url, title, favicon) {
    const bookmark = {
      id: Math.random().toString(36).substr(2, 9),
      url,
      title,
      favicon,
      dateAdded: new Date().toISOString()
    };

    this.bookmarks.push(bookmark);
    this.store.set('bookmarks', this.bookmarks);
    this.renderBookmarks();
    return bookmark;
  }

  removeBookmark(id) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    this.store.set('bookmarks', this.bookmarks);
    this.renderBookmarks();
  }

  renderBookmarks() {
    const bookmarksBar = document.getElementById('bookmarksBar');
    if (!bookmarksBar) return;

    bookmarksBar.innerHTML = '';
    bookmarksBar.style.display = this.bookmarksBarVisible ? 'flex' : 'none';
    
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
          this.store.set('bookmarksBarVisible', this.bookmarksBarVisible);
          this.renderBookmarks();
        }
      },
      {
        label: 'Settings',
        action: () => {
          // TODO: Implement settings page
          console.log('Settings clicked');
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
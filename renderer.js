const { ipcRenderer } = require('electron');
const { bookmarkManager } = require('./bookmarks.js');

// Window control buttons
document.getElementById('minimize').addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

document.getElementById('maximize').addEventListener('click', () => {
  ipcRenderer.send('maximize-window');
});

document.getElementById('close').addEventListener('click', () => {
  ipcRenderer.send('close-window');
});

// Tab management
class Tab {
  constructor(url = 'https://www.google.com') {
    this.id = Math.random().toString(36).substr(2, 9);
    this.url = url;
    this.title = 'New Tab';
    this.element = this.createTabElement();
    this.webview = this.createWebview();
    this.setupEventListeners();
  }

  createTabElement() {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.innerHTML = `
      <span class="tab-title">${this.title}</span>
      <div class="tab-close">×</div>
    `;
    return tab;
  }

  createWebview() {
    const webview = document.createElement('webview');
    webview.setAttribute('src', this.url);
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('webpreferences', 'contextIsolation');
    webview.style.display = 'none';
    document.getElementById('webviewContainer').appendChild(webview);
    return webview;
  }

  setupEventListeners() {
    // Tab click event
    this.element.addEventListener('click', (e) => {
      if (!e.target.matches('.tab-close')) {
        TabManager.setActiveTab(this);
      }
    });

    // Close button event
    this.element.querySelector('.tab-close').addEventListener('click', () => {
      TabManager.closeTab(this);
    });

    // Webview events
    this.webview.addEventListener('page-title-updated', (e) => {
      this.title = e.title;
      this.element.querySelector('.tab-title').textContent = e.title;
    });

    this.webview.addEventListener('did-start-loading', () => {
      document.getElementById('refreshButton').textContent = '✕';
    });

    this.webview.addEventListener('did-stop-loading', () => {
      document.getElementById('refreshButton').textContent = '↻';
    });

    this.webview.addEventListener('did-navigate', (e) => {
      document.getElementById('urlInput').value = e.url;
      this.url = e.url;
      this.updateNavigationButtons();
    });

    // Handle new window events
    this.webview.addEventListener('new-window', (e) => {
      e.preventDefault();
      TabManager.createTab(e.url);
    });
  }

  updateNavigationButtons() {
    document.getElementById('backButton').disabled = !this.webview.canGoBack();
    document.getElementById('forwardButton').disabled = !this.webview.canGoForward();
  }
}

// Tab management singleton
const TabManager = {
  tabs: [],
  activeTab: null,

  createTab(url) {
    const tab = new Tab(url);
    this.tabs.push(tab);
    document.getElementById('tabsList').appendChild(tab.element);
    this.setActiveTab(tab);
    return tab;
  },

  closeTab(tab) {
    const index = this.tabs.indexOf(tab);
    if (index === -1) return;

    tab.element.remove();
    tab.webview.remove();
    this.tabs.splice(index, 1);

    if (this.activeTab === tab) {
      const newTab = this.tabs[index] || this.tabs[index - 1] || this.tabs[0];
      if (newTab) {
        this.setActiveTab(newTab);
      } else {
        this.createTab();
      }
    }
  },

  setActiveTab(tab) {
    if (this.activeTab) {
      this.activeTab.element.classList.remove('active');
      this.activeTab.webview.style.display = 'none';
    }

    tab.element.classList.add('active');
    tab.webview.style.display = 'flex';
    this.activeTab = tab;
    document.getElementById('urlInput').value = tab.url;
    tab.updateNavigationButtons();
  }
};

// Navigation controls
document.getElementById('backButton').addEventListener('click', () => {
  if (TabManager.activeTab) {
    TabManager.activeTab.webview.goBack();
  }
});

document.getElementById('forwardButton').addEventListener('click', () => {
  if (TabManager.activeTab) {
    TabManager.activeTab.webview.goForward();
  }
});

document.getElementById('refreshButton').addEventListener('click', () => {
  if (TabManager.activeTab) {
    if (TabManager.activeTab.webview.isLoading()) {
      TabManager.activeTab.webview.stop();
    } else {
      TabManager.activeTab.webview.reload();
    }
  }
});

// URL input handling
document.getElementById('urlInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && TabManager.activeTab) {
    let url = e.target.value.trim();
    
    // Handle search queries
    if (!url.includes('.') || url.includes(' ')) {
      url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      new URL(url);
      TabManager.activeTab.webview.loadURL(url);
      TabManager.activeTab.url = url;
    } catch (err) {
      console.error('Invalid URL:', err);
    }
  }
});

// New tab button
document.getElementById('newTab').addEventListener('click', () => {
  TabManager.createTab();
});

// Create initial tab
TabManager.createTab();
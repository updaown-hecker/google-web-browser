// Initialize TabManager
const TabManager = {
    tabs: [],
    activeTab: null,

    createTab(url) {
        const tab = new BrowserTab(url);
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

// BrowserTab class
class BrowserTab {
    constructor(url) {
        try {
            if (!url) {
                url = 'https://www.google.com';
            }
            if (url.startsWith('blinx://')) {
                const path = url.substr(8);
                if (path === 'settings') {
                    url = 'blinx://settings';
                } else {
                    this.title = 'Invalid blinx:// URL';
                    url = 'about:blank';
                }
            }
        } catch (error) {
            console.error('Error in BrowserTab constructor:', error);
            url = 'about:blank';
        }
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
        try {
            const webview = document.createElement('webview');
            webview.setAttribute('src', this.url);
            webview.setAttribute('allowpopups', '');
            webview.setAttribute('webpreferences', 'nodeIntegration=false, contextIsolation=true, sandbox=true');
            webview.setAttribute('partition', 'persist:main');
            webview.style.display = 'none';
            webview.style.width = '100%';
            webview.style.height = '100%';
            const container = document.getElementById('webviewContainer');
            if (!container) {
                throw new Error('Webview container not found');
            }
            container.appendChild(webview);

            webview.addEventListener('did-fail-load', (e) => {
                if (e.errorCode === -2 && e.validatedURL.startsWith('blinx://')) {
                    this.title = 'Invalid blinx:// URL';
                    this.element.querySelector('.tab-title').textContent = this.title;
                }
            });

            return webview;
        } catch (error) {
            console.error('Error creating webview:', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.element.addEventListener('click', (e) => {
            if (!e.target.matches('.tab-close')) {
                TabManager.setActiveTab(this);
            }
        });

        this.element.querySelector('.tab-close').addEventListener('click', () => {
            TabManager.closeTab(this);
        });

        this.webview.addEventListener('did-fail-load', (e) => {
            if (e.errorCode !== -3) {
                this.title = 'Error loading page';
                this.element.querySelector('.tab-title').textContent = this.title;
            }
        });

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

// Initialize managers after DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize settings first and ensure they're loaded
    const settingsManager = new SettingsManager();
    await settingsManager.initializeSettings();

    // Initialize other managers after settings are ready
    const downloadManager = new DownloadManager();
    const bookmarkManager = BookmarkManager.init();
    
    // Set TabManager reference in BookmarkManager
    bookmarkManager.setTabManager(TabManager);
    
    // Ensure required DOM elements exist
    const tabsList = document.getElementById('tabsList');
    const webviewContainer = document.getElementById('webviewContainer');
    
    if (!tabsList || !webviewContainer) {
      throw new Error('Required DOM elements not found');
    }
    
    // Create initial tab with default homepage
    TabManager.createTab('https://www.google.com');
  } catch (error) {
    console.error('Error initializing browser:', error);
    // Create a default tab if initialization fails
    TabManager.createTab('https://www.google.com');
  }
});

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
    
    // Handle blinx:// protocol first
    if (url.startsWith('blinx://')) {
      TabManager.activeTab.webview.loadURL(url);
      TabManager.activeTab.url = url;
      return;
    }
    
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
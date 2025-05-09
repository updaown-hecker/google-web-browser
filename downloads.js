const { ipcRenderer } = require('electron');
const Store = require('electron-store');

class DownloadManager {
  constructor() {
    this.store = new Store();
    this.downloads = this.store.get('downloads', []);
    this.activeDownloads = new Map();
    this.setupListeners();
  }

  setupListeners() {
    ipcRenderer.on('download-started', (event, item) => {
      const download = {
        id: item.id,
        filename: item.filename,
        url: item.url,
        path: item.path,
        size: item.size,
        status: 'in_progress',
        progress: 0,
        startTime: new Date().toISOString()
      };

      this.activeDownloads.set(item.id, download);
      this.addDownloadToHistory(download);
      this.updateDownloadUI(download);
    });

    ipcRenderer.on('download-progress', (event, { id, progress }) => {
      const download = this.activeDownloads.get(id);
      if (download) {
        download.progress = progress;
        this.updateDownloadUI(download);
      }
    });

    ipcRenderer.on('download-completed', (event, id) => {
      const download = this.activeDownloads.get(id);
      if (download) {
        download.status = 'completed';
        download.progress = 100;
        download.completedTime = new Date().toISOString();
        this.updateDownloadInHistory(download);
        this.updateDownloadUI(download);
        this.activeDownloads.delete(id);
      }
    });

    ipcRenderer.on('download-failed', (event, { id, error }) => {
      const download = this.activeDownloads.get(id);
      if (download) {
        download.status = 'failed';
        download.error = error;
        this.updateDownloadInHistory(download);
        this.updateDownloadUI(download);
        this.activeDownloads.delete(id);
      }
    });
  }

  addDownloadToHistory(download) {
    this.downloads.unshift(download);
    this.store.set('downloads', this.downloads);
  }

  updateDownloadInHistory(download) {
    const index = this.downloads.findIndex(d => d.id === download.id);
    if (index !== -1) {
      this.downloads[index] = download;
      this.store.set('downloads', this.downloads);
    }
  }

  removeFromHistory(id) {
    this.downloads = this.downloads.filter(d => d.id !== id);
    this.store.set('downloads', this.downloads);
    this.renderDownloadsHistory();
  }

  updateDownloadUI(download) {
    const downloadElement = document.getElementById(`download-${download.id}`);
    if (!downloadElement) {
      this.renderDownloadsHistory();
      return;
    }

    const progressBar = downloadElement.querySelector('.download-progress');
    const status = downloadElement.querySelector('.download-status');

    if (progressBar) {
      progressBar.style.width = `${download.progress}%`;
    }

    if (status) {
      status.textContent = download.status;
      status.className = `download-status ${download.status}`;
    }
  }

  renderDownloadsHistory() {
    const container = document.getElementById('downloadsContainer');
    if (!container) return;

    container.innerHTML = '';
    this.downloads.forEach(download => {
      const downloadElement = document.createElement('div');
      downloadElement.id = `download-${download.id}`;
      downloadElement.className = 'download-item';
      downloadElement.innerHTML = `
        <div class="download-info">
          <div class="download-filename">${download.filename}</div>
          <div class="download-path">${download.path}</div>
          <div class="download-progress-bar">
            <div class="download-progress" style="width: ${download.progress}%"></div>
          </div>
          <div class="download-status ${download.status}">${download.status}</div>
        </div>
        <div class="download-actions">
          <button class="download-remove" data-id="${download.id}">Remove</button>
          ${download.status === 'completed' ? `<button class="download-open" data-path="${download.path}">Open</button>` : ''}
        </div>
      `;

      downloadElement.querySelector('.download-remove').addEventListener('click', () => {
        this.removeFromHistory(download.id);
      });

      const openButton = downloadElement.querySelector('.download-open');
      if (openButton) {
        openButton.addEventListener('click', () => {
          ipcRenderer.send('open-file', download.path);
        });
      }

      container.appendChild(downloadElement);
    });
  }
}

// Export the DownloadManager class
module.exports = DownloadManager;
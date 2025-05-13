class BookmarkDialog {
    constructor() {
        this.dialog = null;
        this.currentBookmark = null;
    }

    show(url, title, favicon) {
        this.currentBookmark = { url, title, favicon };
        this.createDialog();
    }

    createDialog() {
        // Remove existing dialog if any
        if (this.dialog) {
            this.dialog.remove();
        }

        this.dialog = document.createElement('div');
        this.dialog.className = 'bookmark-dialog';
        this.dialog.innerHTML = `
            <div class="bookmark-dialog-content">
                <div class="bookmark-dialog-header">
                    <h3>Add bookmark</h3>
                    <button class="close-button">×</button>
                </div>
                <div class="bookmark-dialog-body">
                    <div class="bookmark-input-group">
                        <label for="bookmark-name">Name</label>
                        <input type="text" id="bookmark-name" value="${this.currentBookmark.title}">
                    </div>
                    <div class="bookmark-input-group">
                        <label for="bookmark-folder">Folder</label>
                        <select id="bookmark-folder">
                            <option value="root">Bookmarks bar</option>
                            ${this.generateFolderOptions()}
                        </select>
                    </div>
                </div>
                <div class="bookmark-dialog-footer">
                    <button class="cancel-button">Cancel</button>
                    <button class="done-button">Done</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.dialog.querySelector('.close-button').addEventListener('click', () => this.close());
        this.dialog.querySelector('.cancel-button').addEventListener('click', () => this.close());
        this.dialog.querySelector('.done-button').addEventListener('click', () => this.save());

        // Add dialog to body
        document.body.appendChild(this.dialog);

        // Focus name input
        setTimeout(() => {
            const nameInput = this.dialog.querySelector('#bookmark-name');
            nameInput.focus();
            nameInput.select();
        }, 0);
    }

    generateFolderOptions() {
        // Get folders from BookmarkManager
        const folders = window.bookmarkManager.getFolders() || [];
        return folders.map(folder => 
            `<option value="${folder.id}">${folder.title}</option>`
        ).join('');
    }

    save() {
        const name = this.dialog.querySelector('#bookmark-name').value.trim();
        const folderId = this.dialog.querySelector('#bookmark-folder').value;

        if (name) {
            window.bookmarkManager.addBookmark(
                this.currentBookmark.url,
                name,
                this.currentBookmark.favicon,
                folderId
            );
        }

        this.close();
    }

    close() {
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
        }
    }
}

module.exports = BookmarkDialog;
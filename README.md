# Clean Browser

A modern, clean web browser built with Electron, featuring bookmarks management, download handling, and customizable settings.

## Features

- Clean, modern user interface
- Tab management
- Bookmarks system
- Download manager
- Customizable settings
- Dark mode support

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. For production build:
```bash
npm run build
```

## Building the Executable

To create a Windows executable (.exe):

1. Make sure all dependencies are installed:
```bash
npm install
```

2. Run the build command:
```bash
npm run dist
```

This will create a distributable Windows installer in the `dist` folder.

## Project Structure

```
├── main.js                 # Electron app entry point
├── preload.js             # Preload script
├── renderer.js            # Frontend logic
├── index.html             # Main UI
├── bookmarks.js           # Bookmarks management
├── settings.js            # Settings management
├── downloads.js           # Download manager
├── assets/                # Static assets
│   ├── icon.ico
│   └── styles.css
└── user_data/             # User data storage
```

## License

MIT
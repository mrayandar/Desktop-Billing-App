const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;

// Log file for debugging
const logFile = isDev ? null : path.join(app.getPath('userData'), 'app.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  if (logFile) {
    fs.appendFileSync(logFile, line + '\n');
  }
}

function getAppPath() {
  return isDev ? __dirname : path.join(process.resourcesPath, 'app');
}

function startBackend() {
  const appPath = getAppPath();
  const serverPath = path.join(appPath, 'backend', 'src', 'server.js');
  
  const dataDir = isDev 
    ? path.join(__dirname, 'backend', 'data')
    : path.join(app.getPath('userData'), 'data');

  log(`isDev: ${isDev}`);
  log(`App path: ${appPath}`);
  log(`Server path: ${serverPath}`);
  log(`Server exists: ${fs.existsSync(serverPath)}`);
  log(`Data dir: ${dataDir}`);

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    log(`Created data directory`);
  }

  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    DATA_DIR: dataDir,
    ELECTRON_RUN_AS_NODE: '1'
  };

  // Add backend node_modules to NODE_PATH for packaged app
  if (!isDev) {
    const backendNodeModules = path.join(process.resourcesPath, 'backend', 'node_modules');
    env.NODE_PATH = backendNodeModules;
    log(`Backend node_modules: ${backendNodeModules}`);
    log(`Backend node_modules exists: ${fs.existsSync(backendNodeModules)}`);
  }

  backendProcess = spawn(process.execPath, [serverPath], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.dirname(serverPath)
  });

  backendProcess.stdout.on('data', (data) => {
    log(`Backend: ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    log(`Backend Error: ${data.toString().trim()}`);
  });

  backendProcess.on('error', (err) => {
    log(`Backend spawn error: ${err.message}`);
  });

  backendProcess.on('close', (code) => {
    log(`Backend exited with code ${code}`);
  });
}

function createWindow() {
  const appPath = getAppPath();
  const preloadPath = path.join(appPath, 'preload.js');
  
  log(`Creating window...`);
  log(`Preload path: ${preloadPath}`);
  log(`Preload exists: ${fs.existsSync(preloadPath)}`);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: false // Allow loading local files
    }
  });

  mainWindow.setMenuBarVisibility(false);
  
  // Only open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log(`Failed to load: ${errorCode} - ${errorDescription} - ${validatedURL}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('Page finished loading');
  });

  mainWindow.webContents.on('dom-ready', () => {
    log('DOM ready');
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    const indexPath = path.join(appPath, 'frontend', 'build', 'index.html');
    log(`Index path: ${indexPath}`);
    log(`Index exists: ${fs.existsSync(indexPath)}`);
    
    // List build contents
    const buildPath = path.join(appPath, 'frontend', 'build');
    if (fs.existsSync(buildPath)) {
      log(`Build contents: ${fs.readdirSync(buildPath).join(', ')}`);
    }

    // Wait for backend then load
    waitForBackend(() => {
      log('Loading index.html...');
      mainWindow.loadFile(indexPath).catch(err => {
        log(`loadFile error: ${err.message}`);
      });
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function waitForBackend(callback) {
  const http = require('http');
  let attempts = 0;
  const maxAttempts = 30;

  // Show loading message
  mainWindow.loadURL(`data:text/html,
    <html>
      <head><title>Loading...</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Arial,sans-serif;background:#f5f5f5;">
        <h2 style="color:#333;">Lucky Toys Billing</h2>
        <p style="color:#666;">Starting server... Please wait.</p>
        <div id="status" style="color:#999;font-size:12px;">Connecting...</div>
      </body>
    </html>
  `);

  const check = () => {
    attempts++;
    log(`Backend check attempt ${attempts}/${maxAttempts}`);

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      if (res.statusCode === 200) {
        log('Backend ready!');
        callback();
      } else {
        retry();
      }
    });

    req.on('error', (err) => {
      log(`Backend check error: ${err.message}`);
      retry();
    });

    req.on('timeout', () => {
      req.destroy();
      retry();
    });

    req.end();
  };

  const retry = () => {
    if (attempts < maxAttempts) {
      setTimeout(check, 500);
    } else {
      log('Backend failed to start after max attempts');
      mainWindow.loadURL(`data:text/html,
        <html>
          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Arial;background:#fff5f5;">
            <h2 style="color:#c53030;">Server Failed to Start</h2>
            <p>Please close and restart the application.</p>
            <p style="font-size:12px;color:#666;">Check log at: ${logFile || 'console'}</p>
          </body>
        </html>
      `);
    }
  };

  check();
}

// Handle print request - generates PDF and opens it for printing
ipcMain.handle('print-receipt', async () => {
  if (mainWindow) {
    try {
      const pdfPath = path.join(app.getPath('temp'), `receipt-${Date.now()}.pdf`);
      const data = await mainWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      fs.writeFileSync(pdfPath, data);
      log(`PDF saved to: ${pdfPath}`);
      
      // Open PDF with default viewer for printing
      require('electron').shell.openPath(pdfPath);
      return true;
    } catch (err) {
      log(`Print to PDF failed: ${err.message}`);
      return false;
    }
  }
  return false;
});

app.whenReady().then(() => {
  log('=== App Starting ===');
  log(`Electron version: ${process.versions.electron}`);
  log(`Node version: ${process.versions.node}`);
  log(`Platform: ${process.platform}`);
  log(`isPackaged: ${app.isPackaged}`);
  log(`resourcesPath: ${process.resourcesPath}`);
  log(`userData: ${app.getPath('userData')}`);
  
  startBackend();
  
  // Give backend a moment to start
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App quitting');
  if (backendProcess) {
    backendProcess.kill();
  }
});

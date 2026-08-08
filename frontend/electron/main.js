const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let javaProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'build', 'icon.ico') // Usaremos genérico por enquanto
  });

  mainWindow.setMenuBarVisibility(false);
  
  // No desenvolvimento carrega da URL do Vite, em produção carrega do arquivo compilado
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../dist/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startJavaBackend() {
  // Em produção, vamos procurar o .jar na pasta de recursos
  if (!isDev) {
    const jarPath = path.join(process.resourcesPath, 'backend.jar');
    javaProcess = spawn('java', ['-jar', jarPath]);

    javaProcess.stdout.on('data', (data) => {
      console.log(`Java stdout: ${data}`);
    });

    javaProcess.stderr.on('data', (data) => {
      console.error(`Java stderr: ${data}`);
    });

    javaProcess.on('close', (code) => {
      console.log(`Java process exited with code ${code}`);
    });
  }
}

app.on('ready', () => {
  startJavaBackend();
  
  // Esperar um pouco pro Spring Boot levantar antes de mostrar a tela
  setTimeout(createWindow, 2000); 
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Mata o processo Java quando o app for fechado
  if (javaProcess) {
    javaProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

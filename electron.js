const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

// 메인 윈도우 참조
let mainWindow;

function createWindow() {
  // 브라우저 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'build/logo512.png'), // 앱 아이콘
    show: false, // 준비될 때까지 숨김
    titleBarStyle: 'default',
    autoHideMenuBar: false // 메뉴바 표시
  });

  // 앱 로드
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // 개발 모드에서만 DevTools 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 포커스 설정
    if (isDev) {
      mainWindow.focus();
    }
  });

  // 윈도우가 닫히면 참조 제거
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 앱 준비 완료
app.whenReady().then(createWindow);

// 모든 윈도우가 닫히면 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS에서 독 아이콘 클릭 시 윈도우 재생성
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 메뉴 설정
const template = [
  {
    label: '파일',
    submenu: [
      {
        label: '새 메모',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          mainWindow.webContents.send('new-memo');
        }
      },
      { type: 'separator' },
      {
        label: '종료',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: '편집',
    submenu: [
      { label: '실행 취소', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      { label: '다시 실행', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
      { type: 'separator' },
      { label: '잘라내기', accelerator: 'CmdOrCtrl+X', role: 'cut' },
      { label: '복사', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      { label: '붙여넣기', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      { label: '모두 선택', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
    ]
  },
  {
    label: '보기',
    submenu: [
      { label: '새로고침', accelerator: 'CmdOrCtrl+R', role: 'reload' },
      { label: '강제 새로고침', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
      { label: '개발자 도구', accelerator: 'F12', role: 'toggleDevTools' },
      { type: 'separator' },
      { label: '실제 크기', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
      { label: '확대', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
      { label: '축소', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
      { type: 'separator' },
      { label: '전체화면', accelerator: 'F11', role: 'togglefullscreen' }
    ]
  },
  {
    label: '도움말',
    submenu: [
      {
        label: '정보',
        click: () => {
          require('electron').dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '보안 메모장',
            message: '보안 메모장 v1.0.0',
            detail: 'AES 암호화로 보호되는 안전한 메모장 앱입니다.',
            buttons: ['확인']
          });
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

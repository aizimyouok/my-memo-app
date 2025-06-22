// 🔐 완전 암호화 메모장 앱 - 최신 기능 포함

import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

// 🔐 보안 설정
const APP_FOLDER_NAME = 'SecureMemoApp';
const ENCRYPTED_DATA_FILE = 'secure_memo_data.enc';
const METADATA_FILE = 'app_metadata.json';
const BACKUP_PREFIX = 'backup_';

// 🔑 암호화/복호화 유틸리티
const CryptoUtils = {
  encrypt: (data, password) => {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString();
      return encrypted;
    } catch (error) {
      console.error('❌ 암호화 실패:', error);
      throw new Error('데이터 암호화에 실패했습니다.');
    }
  },

  decrypt: (encryptedData, password) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('잘못된 비밀번호입니다.');
      }
      
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('❌ 복호화 실패:', error);
      if (error.message.includes('잘못된 비밀번호')) {
        throw error;
      }
      throw new Error('데이터 복호화에 실패했습니다. 파일이 손상되었을 수 있습니다.');
    }
  },

  hashPassword: (password) => {
    return CryptoJS.SHA256(password + 'SecureMemoSalt2025').toString();
  },

  generateChecksum: (data) => {
    return CryptoJS.MD5(JSON.stringify(data)).toString();
  }
};

// 💾 로컬 스토리지 관리
const Storage = {
  save: (key, data) => {
    try {
      localStorage.setItem(`secure-memo-${key}`, JSON.stringify(data));
      console.log(`💾 로컬 저장: ${key}`);
    } catch (error) {
      console.error('❌ 로컬 저장 실패:', error);
    }
  },

  load: (key) => {
    try {
      const data = localStorage.getItem(`secure-memo-${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ 로컬 로드 실패:', error);
      return null;
    }
  },

  remove: (key) => {
    localStorage.removeItem(`secure-memo-${key}`);
  },

  clear: () => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('secure-memo-'));
    keys.forEach(key => localStorage.removeItem(key));
  }
};

// 🎨 테마 스타일
const getThemeStyles = (theme = 'light') => {
  const colors = {
    light: { 
      bg: '#f8f9fa', panelBg: '#ffffff', text: '#212529', textSecondary: '#6c757d', 
      border: '#dee2e6', accent: '#007bff', accentText: '#ffffff', activeBg: '#e6f7ff', 
      danger: '#dc3545', success: '#28a745', warning: '#ffc107', info: '#17a2b8',
      cardBg: '#ffffff', shadowColor: 'rgba(0,0,0,0.1)'
    },
    dark: { 
      bg: '#121212', panelBg: '#1e1e1e', text: '#e9ecef', textSecondary: '#adb5bd', 
      border: '#495057', accent: '#0d6efd', accentText: '#ffffff', activeBg: '#032a58', 
      danger: '#e03131', success: '#51cf66', warning: '#ffd43b', info: '#339af0',
      cardBg: '#2d3748', shadowColor: 'rgba(0,0,0,0.3)'
    }
  };
  
  const c = colors[theme];
  
  return {
    container: { 
      display: 'flex', height: '100vh', 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", 
      backgroundColor: c.bg, color: c.text 
    },
    
    // 🎯 메인 레이아웃 - 450px 사이드바
    leftPanel: { 
      width: '450px',
      borderRight: `1px solid ${c.border}`, 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: c.panelBg 
    },
    rightPanel: { 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column' 
    },
    
    // 🔐 보안 관련 스타일
    securityContainer: {
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', padding: '20px'
    },
    securityCard: {
      backgroundColor: c.cardBg,
      borderRadius: '16px',
      padding: '40px',
      boxShadow: `0 8px 32px ${c.shadowColor}`,
      border: `1px solid ${c.border}`,
      maxWidth: '500px',
      width: '100%'
    },
    securityHeader: {
      textAlign: 'center',
      marginBottom: '30px'
    },
    securityIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    passwordInput: {
      width: '100%',
      padding: '16px',
      fontSize: '16px',
      border: `2px solid ${c.border}`,
      borderRadius: '12px',
      backgroundColor: c.bg,
      color: c.text,
      outline: 'none',
      marginBottom: '16px',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    
    // 🎯 헤더
    header: { 
      padding: '16px 20px', 
      borderBottom: `1px solid ${c.border}`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      backgroundColor: c.panelBg
    },
    profileSection: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px' 
    },
    profileImage: { 
      borderRadius: '50%', 
      width: '32px', 
      height: '32px' 
    },
    
    // 🔒 보안 상태 표시
    securityBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      backgroundColor: `${c.success}20`,
      color: c.success,
      border: `1px solid ${c.success}30`
    },
    
    // 🎯 섹션
    notebookSection: {
      padding: '16px 20px',
      borderBottom: `1px solid ${c.border}`,
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    
    // 🔧 입력 컨트롤 - 오버플로우 방지
    inputGroup: { 
      display: 'flex', 
      gap: '8px', 
      marginBottom: '12px' 
    },
    input: { 
      flex: 1,
      padding: '10px 12px', 
      border: `1px solid ${c.border}`, 
      borderRadius: '8px', 
      backgroundColor: c.bg, 
      color: c.text, 
      outline: 'none',
      fontSize: '14px',
      minWidth: 0,
      boxSizing: 'border-box'
    },
    addButton: {
      padding: '10px 16px',
      backgroundColor: c.accent,
      color: c.accentText,
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    
    // 📝 메모 작성 영역 - 오버플로우 방지
    memoInput: {
      width: '100%',
      height: '80px',
      padding: '12px',
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      backgroundColor: c.bg,
      color: c.text,
      outline: 'none',
      resize: 'vertical',
      fontFamily: 'inherit',
      fontSize: '14px',
      marginBottom: '8px',
      boxSizing: 'border-box'
    },
    
    // 📋 리스트
    list: { 
      listStyle: 'none', 
      padding: 0, 
      margin: 0,
      overflowY: 'auto',
      flex: 1
    },
    listItem: { 
      padding: '8px 12px', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      borderRadius: '6px',
      margin: '2px 0',
      transition: 'background-color 0.2s',
      fontSize: '14px'
    },
    activeListItem: { 
      backgroundColor: c.activeBg, 
      fontWeight: '600'
    },
    
    // 📝 메모 리스트 아이템 - 컴팩트
    memoListItem: {
      padding: '8px 12px',
      border: `1px solid ${c.border}`,
      borderRadius: '6px',
      marginBottom: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.cardBg
    },
    activeMemoListItem: {
      backgroundColor: c.activeBg,
      borderColor: c.accent,
      boxShadow: `0 2px 8px ${c.shadowColor}`
    },
    
    // 🎯 에디터
    editorContainer: {
      flexGrow: 1,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    },
    editorHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      paddingBottom: '16px',
      borderBottom: `1px solid ${c.border}`
    },
    editor: {
      flexGrow: 1,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      padding: '16px',
      fontSize: '15px',
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      resize: 'none',
      outline: 'none',
      backgroundColor: c.panelBg,
      color: c.text,
      lineHeight: 1.6
    },
    
    // 🎛️ 버튼
    button: {
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px'
    },
    primaryButton: {
      backgroundColor: c.accent,
      color: c.accentText
    },
    successButton: {
      backgroundColor: c.success,
      color: 'white'
    },
    dangerButton: {
      backgroundColor: c.danger,
      color: 'white'
    },
    
    // 🎯 하단 액션 버튼들 - 깔끔한 스타일
    actionBar: {
      padding: '12px 20px',
      borderTop: `1px solid ${c.border}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr',
      gap: '8px'
    },
    actionButton: {
      padding: '10px 8px',
      fontSize: '13px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center',
      whiteSpace: 'nowrap'
    },
    
    // 아이콘 버튼
    iconButton: { 
      background: 'none', 
      border: `1px solid ${c.border}`, 
      color: c.textSecondary, 
      cursor: 'pointer', 
      padding: '8px', 
      borderRadius: '6px',
      transition: 'all 0.2s'
    },
    
    // 모달
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 2000
    },
    modalContent: {
      backgroundColor: c.cardBg, padding: '32px', borderRadius: '16px',
      minWidth: '400px', maxWidth: '600px', maxHeight: '80vh', 
      overflow: 'auto', boxShadow: `0 16px 64px ${c.shadowColor}`
    },
    
    // 에러 메시지
    errorMessage: {
      color: c.danger,
      fontSize: '14px',
      marginBottom: '16px',
      padding: '12px',
      backgroundColor: `${c.danger}10`,
      borderRadius: '8px',
      border: `1px solid ${c.danger}30`
    },
    
    helpText: {
      fontSize: '12px',
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: '20px',
      lineHeight: 1.5
    },
    
    // 플레이스홀더
    placeholder: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      textAlign: 'center',
      color: c.textSecondary
    },
    
    // 스피너
    spinner: { 
      border: '4px solid rgba(255, 255, 255, 0.3)', 
      borderTop: '4px solid white', 
      borderRadius: '50%', 
      width: '40px', 
      height: '40px', 
      animation: 'spin 1s linear infinite' 
    },
    spinnerOverlay: { 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.7)', 
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      zIndex: 3000 
    },
    
    // 토스트
    toast: { 
      position: 'fixed', bottom: '24px', left: '50%', 
      transform: 'translateX(-50%)', padding: '16px 24px', 
      borderRadius: '12px', color: 'white', zIndex: 1000, 
      minWidth: '300px', textAlign: 'center',
      boxShadow: `0 8px 32px ${c.shadowColor}`
    },
    toastSuccess: { backgroundColor: c.success },
    toastError: { backgroundColor: c.danger },
    toastWarning: { backgroundColor: c.warning, color: c.text }
  };
};

// 🎯 아이콘 컴포넌트들
const Icons = {
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <circle cx="12" cy="16" r="1"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  
  EyeOff: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
};

// 🧩 UI 컴포넌트들
const Spinner = ({ styles }) => {
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(styleSheet);
    return () => { 
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet); 
      }
    };
  }, []);
  
  return (
    <div style={styles.spinnerOverlay}>
      <div style={styles.spinner}></div>
    </div>
  );
};

const Toast = ({ show, message, type, styles }) => {
  if (!show) return null;
  const toastStyle = type === 'success' ? styles.toastSuccess : 
                   type === 'warning' ? styles.toastWarning : styles.toastError;
  return (
    <div style={{ ...styles.toast, ...toastStyle }}>
      {message}
    </div>
  );
};

// 🎯 메인 앱 컴포넌트
function SecureMemoApp() {
  const [theme, setTheme] = useState(() => Storage.load('theme') || 'light');
  const styles = getThemeStyles(theme);

  // 🔐 인증 및 보안 상태
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);

  // 📂 앱 데이터 상태
  const [appFolderId, setAppFolderId] = useState(null);
  const [encryptedFileId, setEncryptedFileId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 📝 메모 데이터 구조
  const [appData, setAppData] = useState({
    notebooks: [],
    memos: [],
    deletedItems: [],
    metadata: {
      version: '2.0',
      createdAt: null,
      lastModified: null,
      totalMemos: 0,
      totalNotebooks: 0,
      lastBackup: null
    }
  });

  // 🎛️ UI 상태
  const [selectedNotebookId, setSelectedNotebookId] = useState('all');
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newMemoContent, setNewMemoContent] = useState('');
  const [editingNotebook, setEditingNotebook] = useState(null);
  
  // 🔐 개별 메모 보안 상태
  const [memoPassword, setMemoPassword] = useState('');
  const [enableMemoPassword, setEnableMemoPassword] = useState(false);
  const [passwordModalMemo, setPasswordModalMemo] = useState(null);
  const [memoPasswordInput, setMemoPasswordInput] = useState('');
  const [memoPasswordError, setMemoPasswordError] = useState('');
  
  // 🔍 검색 및 정렬 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('date'); // 'date', 'title', 'created'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'
  
  // ⚙️ 설정 상태
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => Storage.load('auto-backup') || false);
  const [autoBackupInterval, setAutoBackupInterval] = useState(() => Storage.load('auto-backup-interval') || 60); // 분 단위

  // 모달 상태들
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [memoToMove, setMemoToMove] = useState(null);
  const [targetNotebookId, setTargetNotebookId] = useState('');

  // 🎉 토스트 메시지
  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, duration);
  }, []);

  // 🎨 테마 토글
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    Storage.save('theme', newTheme);
  };

  // 📋 필터링, 검색, 정렬된 메모 가져오기
  const getFilteredMemos = () => {
    let memos = selectedNotebookId === 'all' 
      ? appData.memos 
      : appData.memos.filter(memo => memo.notebookId === selectedNotebookId);
    
    // 🔍 검색 필터링 - 비밀번호 보호 메모 고려
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      memos = memos.filter(memo => {
        // 제목은 항상 검색 가능
        if (memo.title.toLowerCase().includes(query)) {
          return true;
        }
        
        // 비밀번호 보호된 메모는 내용 검색 불가
        if (memo.isPasswordProtected) {
          return false;
        }
        
        // 일반 메모는 내용도 검색 가능
        return memo.content.toLowerCase().includes(query);
      });
    }
    
    // 📊 정렬
    memos.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortOption) {
        case 'title':
          compareValue = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
          break;
        case 'created':
          compareValue = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'date':
        default:
          compareValue = new Date(a.modifiedAt) - new Date(b.modifiedAt);
          break;
      }
      
      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
    
    return memos;
  };

  // 🔐 Google 로그인
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('🎉 로그인 성공');
      const token = tokenResponse.access_token;
      
      setAccessToken(token);
      Storage.save('access-token', token);
      Storage.save('token-expiry', Date.now() + (tokenResponse.expires_in || 3600) * 1000);
      
      try {
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUser(userResponse.data);
        Storage.save('user', userResponse.data);
        
        showToast('Google 로그인 성공!', 'success');
        await setupAppFolder(token);
        
      } catch (error) {
        console.error('❌ 사용자 정보 가져오기 실패:', error);
        showToast('사용자 정보를 가져올 수 없습니다.', 'error');
      }
    },
    onError: (error) => {
      console.error('❌ 로그인 실패:', error);
      showToast('로그인에 실패했습니다.', 'error');
    },
    scope: SCOPES,
  });

  // 🚪 로그아웃
  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setAccessToken(null);
    setIsUnlocked(false);
    setMasterPassword('');
    setAppData({
      notebooks: [],
      memos: [],
      deletedItems: [],
      metadata: {
        version: '2.0',
        createdAt: null,
        lastModified: null,
        totalMemos: 0,
        totalNotebooks: 0,
        lastBackup: null
      }
    });
    
    Storage.remove('access-token');
    Storage.remove('token-expiry');
    Storage.remove('user');
    Storage.remove('app-folder-id');
    Storage.remove('encrypted-file-id');
    
    showToast('로그아웃되었습니다.', 'success');
  };

  // 📂 앱 폴더 설정
  const setupAppFolder = async (token) => {
    try {
      setIsLoading(true);
      
      const searchResponse = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)'
        }
      });
      
      let folderId;
      const existingFolders = searchResponse.data.files || [];
      
      if (existingFolders.length > 0) {
        folderId = existingFolders[0].id;
        console.log('✅ 기존 앱 폴더 찾음:', folderId);
      } else {
        const createResponse = await axios.post(
          'https://www.googleapis.com/drive/v3/files',
          {
            name: APP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
          },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        folderId = createResponse.data.id;
        console.log('✅ 새 앱 폴더 생성:', folderId);
      }
      
      setAppFolderId(folderId);
      Storage.save('app-folder-id', folderId);
      await checkEncryptedFile(token, folderId);
      
    } catch (error) {
      console.error('❌ 앱 폴더 설정 실패:', error);
      showToast('앱 폴더 설정에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 간단한 더미 함수들 (실제 구현 생략)
  const checkEncryptedFile = async () => { setIsPasswordSet(true); };
  const saveEncryptedData = async () => { };
  const createNotebook = () => { };
  const updateNotebook = () => { };
  const deleteNotebook = () => { };
  const createMemo = () => { };
  const updateMemo = () => { };
  const deleteMemo = () => { };
  const moveMemo = () => { };
  const restoreFromTrash = () => { };
  const createBackup = () => { };
  const exportData = () => { };
  const handleMemoSelect = () => { };

  // 시작 시 토큰 복원
  useEffect(() => {
    const savedToken = Storage.load('access-token');
    const savedExpiry = Storage.load('token-expiry');
    const savedUser = Storage.load('user');
    
    if (savedToken && savedExpiry && Date.now() < savedExpiry) {
      setAccessToken(savedToken);
      if (savedUser) setUser(savedUser);
      
      const savedFolderId = Storage.load('app-folder-id');
      if (savedFolderId) {
        setAppFolderId(savedFolderId);
        checkEncryptedFile(savedToken, savedFolderId);
      }
    } else {
      Storage.remove('access-token');
      Storage.remove('token-expiry');
    }
  }, []);

  return (
    <div style={styles.container}>
      {isLoading && <Spinner styles={styles} />}
      <Toast show={toast.show} message={toast.message} type={toast.type} styles={styles} />
      
      {!accessToken && (
        <div style={styles.securityContainer}>
          <div style={styles.securityCard}>
            <div style={styles.securityHeader}>
              <div style={styles.securityIcon}>🔐</div>
              <h1>보안 메모장</h1>
              <p>모든 메모가 강력한 AES 암호화로 보호됩니다.</p>
            </div>
            
            <button 
              onClick={login}
              style={{...styles.button, ...styles.primaryButton, width: '100%', fontSize: '16px'}}
            >
              🔑 Google 로그인
            </button>
            
            <div style={styles.helpText}>
              🔒 Google Drive에 암호화되어 저장됩니다<br/>
              📱 모든 기기에서 동기화됩니다
            </div>
          </div>
        </div>
      )}
      
      {accessToken && isPasswordSet && (
        <>
          <div style={styles.leftPanel}>
            <div style={styles.header}>
              <div style={styles.profileSection}>
                {user?.picture && <img src={user.picture} alt="Profile" style={styles.profileImage} />}
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{user?.name}</div>
                  <div style={styles.securityBadge}>
                    <Icons.Lock />
                    <span>암호화됨</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  style={styles.iconButton} 
                  onClick={toggleTheme}
                  title="테마 변경"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <button 
                  style={styles.iconButton} 
                  onClick={handleLogout}
                  title="로그아웃"
                >
                  🚪
                </button>
              </div>
            </div>
            
            {/* 🌳 통합 메모 탐색기 */}
            <div style={styles.notebookSection}>
              <div style={styles.sectionTitle}>
                📚 메모 탐색기 ({getFilteredMemos().length})
              </div>
              
              {/* 🔍 검색 및 정렬 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="메모 검색... (제목 또는 내용)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      ...styles.input,
                      width: '100%',
                      paddingLeft: '32px'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px',
                    color: styles.textSecondary,
                    pointerEvents: 'none'
                  }}>
                    🔍
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    style={{
                      ...styles.input,
                      flex: 1,
                      fontSize: '12px'
                    }}
                  >
                    <option value="date">수정일순</option>
                    <option value="created">생성일순</option>
                    <option value="title">제목순</option>
                  </select>
                  
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    style={{
                      ...styles.iconButton,
                      fontSize: '12px',
                      padding: '8px'
                    }}
                    title={sortDirection === 'asc' ? '오름차순' : '내림차순'}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
              
              {/* 🔧 새 노트북 입력 */}
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="새 노트북 이름..."
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={createNotebook}
                  style={{...styles.addButton, ...styles.primaryButton}}
                  disabled={!newNotebookName.trim()}
                >
                  ➕
                </button>
              </div>
              
              {/* 📝 빠른 메모 작성 */}
              <div style={{ marginBottom: '16px', padding: '12px', border: `1px solid ${styles.border}`, borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  ✏️ 빠른 메모 작성
                </div>
                <textarea
                  placeholder="새 메모 작성..."
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  style={{...styles.memoInput, height: '60px'}}
                />
                
                {/* 🔐 개별 메모 비밀번호 */}
                <div style={{ 
                  marginBottom: '8px',
                  padding: '8px',
                  border: `1px solid ${styles.border}`,
                  borderRadius: '6px',
                  backgroundColor: enableMemoPassword ? styles.activeBg : 'transparent'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: enableMemoPassword ? '6px' : '0'
                  }}>
                    <input
                      type="checkbox"
                      checked={enableMemoPassword}
                      onChange={(e) => setEnableMemoPassword(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label style={{ 
                      fontSize: '11px', 
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}>
                      🔐 비밀번호 보호
                    </label>
                  </div>
                  
                  {enableMemoPassword && (
                    <input
                      type="password"
                      placeholder="메모 전용 비밀번호..."
                      value={memoPassword}
                      onChange={(e) => setMemoPassword(e.target.value)}
                      style={{
                        ...styles.input,
                        width: '100%',
                        fontSize: '11px',
                        padding: '6px 8px'
                      }}
                    />
                  )}
                </div>
                
                <button
                  onClick={createMemo}
                  style={{...styles.button, ...styles.successButton, width: '100%', fontSize: '12px', padding: '8px'}}
                  disabled={!newMemoContent.trim()}
                >
                  {enableMemoPassword ? '🔐 보호된 메모 저장' : '💾 메모 저장'}
                </button>
              </div>
              
              {/* 📋 메모 목록 - 컴팩트 */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {getFilteredMemos().map(memo => (
                  <div
                    key={memo.id}
                    style={{
                      ...styles.memoListItem,
                      ...(selectedMemo?.id === memo.id ? styles.activeMemoListItem : {})
                    }}
                    onClick={() => handleMemoSelect(memo)}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <span style={{ fontSize: '12px', flexShrink: 0 }}>
                        {memo.isPasswordProtected ? '🔐' : '📄'}
                      </span>
                      <span style={{ 
                        fontWeight: '500', 
                        fontSize: '12px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: '80px',
                        flexShrink: 0
                      }}>
                        {memo.title}
                      </span>
                      <span style={{ 
                        fontSize: '10px', 
                        color: styles.textSecondary,
                        flexShrink: 0,
                        minWidth: '60px'
                      }}>
                        {new Date(memo.modifiedAt).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span style={{ 
                        fontSize: '11px',
                        opacity: 0.7,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                      }}>
                        {memo.content.split('\n')[0] || '내용 없음'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 🎯 하단 액션 버튼들 */}
            <div style={styles.actionBar}>
              <button
                onClick={createBackup}
                style={{...styles.actionButton, ...styles.successButton}}
              >
                백업
              </button>
              <button
                onClick={exportData}
                style={{...styles.actionButton, ...styles.primaryButton}}
              >
                내보내기
              </button>
              <button
                onClick={() => setShowTrashModal(true)}
                style={{...styles.actionButton, ...styles.dangerButton}}
              >
                휴지통
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                style={{
                  ...styles.actionButton,
                  backgroundColor: styles.info,
                  color: 'white'
                }}
              >
                설정
              </button>
            </div>
          </div>
          
          {/* 오른쪽 에디터 */}
          <div style={styles.rightPanel}>
            {selectedMemo ? (
              <div style={styles.editorContainer}>
                <div style={styles.editorHeader}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedMemo.title}</h2>
                    <div style={{ fontSize: '12px', color: styles.textSecondary, marginTop: '4px' }}>
                      마지막 수정: {new Date(selectedMemo.modifiedAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <button
                    onClick={() => updateMemo(selectedMemo)}
                    style={{...styles.button, ...styles.successButton}}
                  >
                    💾 저장
                  </button>
                </div>
                
                <textarea
                  value={selectedMemo.content}
                  onChange={(e) => setSelectedMemo({...selectedMemo, content: e.target.value})}
                  style={styles.editor}
                  placeholder="메모 내용을 입력하세요..."
                />
              </div>
            ) : (
              <div style={styles.placeholder}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <h2>메모를 선택하세요</h2>
                <p>왼쪽에서 메모를 클릭하여 편집하거나<br/>새 메모를 작성해보세요.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <SecureMemoApp />
    </GoogleOAuthProvider>
  );
}

export default App;

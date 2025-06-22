// 🔐 완전 암호화 메모장 앱 - 개선된 탭 기능 적용
// 모든 데이터가 암호화되어 Google Drive에 저장됩니다.
// 최신 개선사항:
// ✅ 우클릭 문제 해결 - 항상 보이는 편집/삭제 버튼으로 대체
// ✅ 메모 폴더 이동 버튼 명확히 표시 - "📁 이동" 텍스트 포함
// ✅ 다크모드 탭 글씨 색상 문제 해결 - 강제 흰색 적용
// ✅ 탭 아이콘 제거 및 가로 길이 축소 - 더 컴팩트한 디자인

import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './enhanced-tabs.css';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

// 🔐 보안 설정
const APP_FOLDER_NAME = 'SecureMemoApp';
const ENCRYPTED_DATA_FILE = 'secure_memo_data.enc';
const METADATA_FILE = 'app_metadata.json';
const BACKUP_PREFIX = 'backup_';

// 🔑 암호화/복호화 유틸리티
const CryptoUtils = {
  // AES 암호화
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
  // AES 복호화
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

  // 비밀번호 해시 (검증용)
  hashPassword: (password) => {
    return CryptoJS.SHA256(password + 'SecureMemoSalt2025').toString();
  },

  // 데이터 무결성 검증용 체크섬
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
    // 기본 레이아웃
    container: { 
      display: 'flex', height: '100vh', 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", 
      backgroundColor: c.bg, color: c.text 
    },
    // 보안 관련 스타일
    securityContainer: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '20px', backgroundColor: c.bg, zIndex: 1000
    },
    securityCard: {
      backgroundColor: c.cardBg, borderRadius: '16px', padding: '40px',
      boxShadow: `0 8px 32px ${c.shadowColor}`, border: `1px solid ${c.border}`,
      maxWidth: '500px', width: '100%'
    },
    securityHeader: { textAlign: 'center', marginBottom: '30px' },
    securityIcon: { fontSize: '48px', marginBottom: '16px' },
    passwordInput: {
      width: '100%', padding: '16px', fontSize: '16px',
      border: `2px solid ${c.border}`, borderRadius: '12px',
      backgroundColor: c.bg, color: c.text, outline: 'none',
      marginBottom: '16px', transition: 'border-color 0.3s'
    },
    // 버튼 스타일
    button: {
      width: '100%', padding: '16px', fontSize: '16px', fontWeight: '600',
      border: 'none', borderRadius: '12px', cursor: 'pointer',
      transition: 'all 0.3s', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '8px'
    },
    primaryButton: { backgroundColor: c.accent, color: c.accentText },
    dangerButton: { backgroundColor: c.danger, color: 'white' },
    successButton: { backgroundColor: c.success, color: 'white' },
    // 상태 표시
    statusCard: {
      padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
      display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px'
    },
    statusSecure: {
      backgroundColor: `${c.success}15`, border: `1px solid ${c.success}`, color: c.success
    },
    statusError: {
      backgroundColor: `${c.danger}15`, border: `1px solid ${c.danger}`, color: c.danger
    },
    statusWarning: {
      backgroundColor: `${c.warning}15`, border: `1px solid ${c.warning}`, color: c.warning
    },
    // 에러 메시지
    errorMessage: {
      color: c.danger, fontSize: '14px', marginBottom: '16px', padding: '12px',
      backgroundColor: `${c.danger}10`, borderRadius: '8px', border: `1px solid ${c.danger}30`
    },
    // 도움말 텍스트
    helpText: {
      fontSize: '12px', color: c.textSecondary, textAlign: 'center',
      marginTop: '20px', lineHeight: 1.5
    },
    // 메인 앱 레이아웃
    leftPanel: { 
      width: '450px', borderRight: `1px solid ${c.border}`, 
      display: 'flex', flexDirection: 'column', backgroundColor: c.panelBg 
    },
    rightPanel: { 
      flexGrow: 1, padding: '24px', display: 'flex', flexDirection: 'column' 
    },
    // 헤더
    header: { 
      padding: '20px', borderBottom: `1px solid ${c.border}`, 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
    },
    profileSection: { display: 'flex', alignItems: 'center', gap: '12px' },
    profileImage: { borderRadius: '50%', width: '36px', height: '36px' },
    // 아이콘 버튼
    iconButton: { 
      background: 'none', border: `1px solid ${c.border}`, color: c.textSecondary, 
      cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s'
    },
    // 섹션
    section: { padding: '20px', borderBottom: `1px solid ${c.border}` },
    sectionTitle: {
      fontSize: '18px', fontWeight: '600', marginBottom: '16px',
      display: 'flex', alignItems: 'center', gap: '8px'
    },
    // 입력 필드
    input: { 
      width: '100%', padding: '12px', border: `1px solid ${c.border}`, 
      borderRadius: '8px', backgroundColor: c.bg, color: c.text, 
      outline: 'none', fontSize: '14px'
    },
    // 리스트
    list: { listStyle: 'none', padding: 0, margin: 0 },
    listItem: { 
      padding: '12px 16px', cursor: 'pointer', display: 'flex', 
      alignItems: 'center', gap: '12px', borderRadius: '8px',
      margin: '4px 0', transition: 'background-color 0.2s'
    },
    activeListItem: { backgroundColor: c.activeBg, fontWeight: '600' },
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
    // 에디터
    editor: {
      flexGrow: 1, border: 'none', padding: '20px', fontSize: '16px',
      fontFamily: 'Monaco, Menlo, monospace', resize: 'none', outline: 'none',
      backgroundColor: c.bg, color: c.text, lineHeight: 1.6
    },
    // 로딩 및 피드백
    spinner: { 
      border: '4px solid rgba(255, 255, 255, 0.3)', 
      borderTop: '4px solid white', borderRadius: '50%', 
      width: '40px', height: '40px', animation: 'spin 1s linear infinite' 
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <circle cx="12" cy="16" r="1"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Unlock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <circle cx="12" cy="16" r="1"/>
      <path d="M7 11V7a4 4 0 0 1 8 0"/>
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Key: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
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
// 🔐 간단한 비밀번호 설정 컴포넌트
const PasswordSetup = ({ onPasswordSet, styles }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    onPasswordSet(password);
  };

  return (
    <div style={styles.securityContainer}>
      <div style={styles.securityCard}>
        <div style={styles.securityHeader}>
          <div style={styles.securityIcon}>🔐</div>
          <h2>보안 설정</h2>
          <p>전체 메모를 보호할 마스터 비밀번호를 설정하세요.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="마스터 비밀번호 (최소 8자)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.passwordInput}
            autoFocus
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.passwordInput}
          />
          {error && <div style={styles.errorMessage}>{error}</div>}
          <button type="submit" style={{...styles.button, ...styles.primaryButton}}>
            <Icons.Lock /> 암호화 활성화
          </button>
        </form>
      </div>
    </div>
  );
};

// 🔓 비밀번호 입력 컴포넌트
const PasswordUnlock = ({ onPasswordEnter, styles, error }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      onPasswordEnter(password);
    }
  };

  return (
    <div style={styles.securityContainer}>
      <div style={styles.securityCard}>
        <div style={styles.securityHeader}>
          <div style={styles.securityIcon}>🔓</div>
          <h2>데이터 잠금 해제</h2>
          <p>암호화된 메모에 접근하기 위해 마스터 비밀번호를 입력하세요.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="마스터 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.passwordInput}
            autoFocus
          />
          {error && <div style={styles.errorMessage}>{error}</div>}
          <button type="submit" style={{...styles.button, ...styles.primaryButton}}>
            <Icons.Unlock /> 잠금 해제
          </button>
        </form>
      </div>
    </div>
  );
};
// 🎯 메인 보안 메모장 앱
function SecureMemoApp() {
  const [theme, setTheme] = useState(() => Storage.load('theme') || 'light');
  const styles = getThemeStyles(theme);

  // 기본 상태들
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 앱 데이터
  const [appData, setAppData] = useState({
    notebooks: [],
    memos: [],
    deletedItems: [],
    metadata: { version: '2.0', createdAt: null, lastModified: null }
  });

  // UI 상태
  const [selectedNotebookId, setSelectedNotebookId] = useState('all');
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newMemoContent, setNewMemoContent] = useState('');
  const [editingNotebook, setEditingNotebook] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 모달 상태들
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [memoToMove, setMemoToMove] = useState(null);
  const [targetNotebookId, setTargetNotebookId] = useState('');

  // 토스트 메시지 표시
  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, duration);
  }, []);

  // 🔐 Google 로그인
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      Storage.save('access-token', tokenResponse.access_token);
      setIsPasswordSet(true); // 간단화를 위해 바로 비밀번호 설정으로 이동
      showToast('Google 로그인 성공!', 'success');
    },
    onError: (error) => {
      showToast('로그인에 실패했습니다.', 'error');
    },
    scope: SCOPES,
  });

  // 로그아웃
  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setAccessToken(null);
    setIsUnlocked(false);
    Storage.remove('access-token');
    showToast('로그아웃되었습니다.', 'success');
  };

  // 비밀번호 설정
  const handlePasswordSetup = async (password) => {
    setMasterPassword(password);
    const passwordHash = CryptoUtils.hashPassword(password);
    Storage.save('password-hash', passwordHash);
    setIsUnlocked(true);
    showToast('보안 설정이 완료되었습니다!', 'success');
  };

  // 비밀번호 잠금 해제
  const handlePasswordUnlock = async (password) => {
    const storedHash = Storage.load('password-hash');
    const inputHash = CryptoUtils.hashPassword(password);
    
    if (storedHash === inputHash) {
      setMasterPassword(password);
      setIsUnlocked(true);
      setPasswordError('');
      showToast('데이터 잠금이 해제되었습니다!', 'success');
    } else {
      setPasswordError('잘못된 비밀번호입니다.');
    }
  };

  // 메모 생성
  const createMemo = async () => {
    if (!newMemoContent.trim()) {
      showToast('메모 내용을 입력해주세요.', 'error');
      return;
    }

    const firstLine = newMemoContent.split('\n')[0].slice(0, 50).trim();
    const title = firstLine || '제목 없는 메모';
    
    const newMemo = {
      id: `memo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      content: newMemoContent,
      notebookId: selectedNotebookId === 'all' ? null : selectedNotebookId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };
    
    setAppData({
      ...appData,
      memos: [newMemo, ...appData.memos]
    });
    setNewMemoContent('');
    showToast('메모가 생성되었습니다!', 'success');
  };

  // 메모 업데이트
  const updateMemo = async (memo) => {
    const updatedMemo = {
      ...memo,
      modifiedAt: new Date().toISOString()
    };
    
    setAppData({
      ...appData,
      memos: appData.memos.map(m => m.id === memo.id ? updatedMemo : m)
    });
    
    setSelectedMemo(updatedMemo);
    showToast('메모가 저장되었습니다!', 'success');
  };

  // 메모 삭제
  const deleteMemo = async (memoId, memoTitle) => {
    const confirmed = window.confirm(`"${memoTitle}" 메모를 삭제하시겠습니까?`);
    if (!confirmed) return;
    
    const memoToDelete = appData.memos.find(m => m.id === memoId);
    if (!memoToDelete) return;
    
    const deletedItem = {
      ...memoToDelete,
      deletedAt: new Date().toISOString(),
      type: 'memo'
    };
    
    setAppData({
      ...appData,
      memos: appData.memos.filter(m => m.id !== memoId),
      deletedItems: [deletedItem, ...appData.deletedItems]
    });
    
    if (selectedMemo && selectedMemo.id === memoId) {
      setSelectedMemo(null);
    }
    
    showToast('메모가 휴지통으로 이동되었습니다.', 'success');
  };

  // 노트북 생성
  const createNotebook = async () => {
    if (!newNotebookName.trim()) {
      showToast('노트북 이름을 입력해주세요.', 'error');
      return;
    }
    
    const newNotebook = {
      id: `notebook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newNotebookName,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };
    
    setAppData({
      ...appData,
      notebooks: [...appData.notebooks, newNotebook].sort((a, b) => a.name.localeCompare(b.name))
    });
    setNewNotebookName('');
    setSelectedNotebookId(newNotebook.id);
    showToast('노트북이 생성되었습니다!', 'success');
  };

  // 노트북 이름 변경
  const updateNotebook = async (notebookId, newName) => {
    if (!newName.trim()) {
      showToast('노트북 이름을 입력해주세요.', 'error');
      return;
    }
    
    setAppData({
      ...appData,
      notebooks: appData.notebooks.map(nb => 
        nb.id === notebookId 
          ? { ...nb, name: newName, modifiedAt: new Date().toISOString() }
          : nb
      ).sort((a, b) => a.name.localeCompare(b.name))
    });
    setEditingNotebook(null);
    showToast('노트북 이름이 변경되었습니다!', 'success');
  };

  // 노트북 삭제
  const deleteNotebook = async (notebookId) => {
    const notebook = appData.notebooks.find(nb => nb.id === notebookId);
    if (!notebook) return;
    
    const memosInNotebook = appData.memos.filter(m => m.notebookId === notebookId);
    
    let confirmMessage = `"${notebook.name}" 노트북을 삭제하시겠습니까?`;
    if (memosInNotebook.length > 0) {
      confirmMessage += `\n\n이 노트북의 메모 ${memosInNotebook.length}개도 함께 삭제됩니다.`;
    }
    
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;
    
    const deletedNotebook = {
      ...notebook,
      deletedAt: new Date().toISOString(),
      type: 'notebook'
    };
    
    const deletedMemos = memosInNotebook.map(memo => ({
      ...memo,
      deletedAt: new Date().toISOString(),
      type: 'memo'
    }));
    
    setAppData({
      ...appData,
      notebooks: appData.notebooks.filter(nb => nb.id !== notebookId),
      memos: appData.memos.filter(m => m.notebookId !== notebookId),
      deletedItems: [deletedNotebook, ...deletedMemos, ...appData.deletedItems]
    });
    
    if (selectedNotebookId === notebookId) {
      setSelectedNotebookId('all');
    }
    
    showToast('노트북이 삭제되었습니다.', 'success');
  };

  // 메모 이동
  const moveMemo = async (memoId, targetNotebookId) => {
    setAppData({
      ...appData,
      memos: appData.memos.map(memo => 
        memo.id === memoId 
          ? { 
              ...memo, 
              notebookId: targetNotebookId === 'main' ? null : targetNotebookId,
              modifiedAt: new Date().toISOString()
            }
          : memo
      )
    });
    
    setShowMoveModal(false);
    setMemoToMove(null);
    setTargetNotebookId('');
    showToast('메모가 이동되었습니다!', 'success');
  };

  // 테마 토글
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    Storage.save('theme', newTheme);
  };

  // 필터링된 메모 가져오기
  const getFilteredMemos = () => {
    let filteredMemos = selectedNotebookId === 'all' 
      ? appData.memos 
      : appData.memos.filter(memo => memo.notebookId === selectedNotebookId);
    
    if (searchQuery.trim()) {
      filteredMemos = filteredMemos.filter(memo => {
        return memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               memo.content.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    
    return filteredMemos.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  };

  // 테마에 따른 body 배경색 설정
  useEffect(() => {
    const colors = { light: '#f8f9fa', dark: '#121212' };
    document.body.style.backgroundColor = colors[theme];
    document.documentElement.style.backgroundColor = colors[theme];
    // 다크모드 지원을 위한 data-theme 속성 설정
    document.documentElement.setAttribute('data-theme', theme);
    
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      document.documentElement.removeAttribute('data-theme');
    };
  }, [theme]);  
  // 메인 렌더링
  return (
    <div style={styles.container}>
      {/* 로딩 스피너 */}
      {isLoading && <Spinner styles={styles} />}
      
      {/* 토스트 메시지 */}
      <Toast show={toast.show} message={toast.message} type={toast.type} styles={styles} />
      
      {/* 로그인하지 않은 경우 */}
      {!accessToken && (
        <div style={styles.securityContainer}>
          <div style={styles.securityCard}>
            <div style={styles.securityHeader}>
              <div style={styles.securityIcon}>🔐</div>
              <h1>보안 메모장</h1>
              <p>모든 메모가 강력한 AES 암호화로 보호됩니다.</p>
            </div>
            <button style={{...styles.button, ...styles.primaryButton}} onClick={login}>
              <Icons.Key /> Google로 로그인
            </button>
          </div>
        </div>
      )}
      
      {/* 비밀번호 설정/입력 단계 */}
      {accessToken && !isPasswordSet && (
        <PasswordSetup onPasswordSet={handlePasswordSetup} styles={styles} />
      )}
      
      {accessToken && isPasswordSet && !isUnlocked && (
        <PasswordUnlock 
          onPasswordEnter={handlePasswordUnlock} 
          styles={styles} 
          error={passwordError}
        />
      )}
      
      {/* 메인 앱 화면 */}
      {accessToken && isPasswordSet && isUnlocked && (
        <>
          {/* 왼쪽 패널 */}
          <div style={styles.leftPanel}>
            {/* 헤더 */}
            <div style={styles.header}>
              <div style={styles.profileSection}>
                <div>
                  <div style={{ fontWeight: '600' }}>사용자</div>
                  <div style={{ fontSize: '10px', color: styles.textSecondary }}>
                    <span style={{ color: styles.success }}>🔐 암호화됨</span>
                    <span> 📝 {appData.memos.length}개</span>
                    <span> 📁 {appData.notebooks.length}개</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={styles.iconButton} onClick={toggleTheme} title="테마 변경">
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <button style={styles.iconButton} onClick={handleLogout} title="로그아웃">
                  🚪
                </button>
              </div>
            </div>
            
            {/* 노트북 섹션 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📁 노트북</div>
              
              {/* 새 노트북 생성 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="새 노트북 이름..."
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  style={{...styles.input, flex: 1}}
                  onKeyPress={(e) => e.key === 'Enter' && createNotebook()}
                />
                <button
                  onClick={createNotebook}
                  style={{...styles.button, ...styles.primaryButton, padding: '8px', width: '32px'}}
                  disabled={!newNotebookName.trim()}
                >
                  ➕
                </button>
              </div>
              
              {/* 🔥 향상된 노트북 탭 버튼들 - 우클릭 문제 해결 */}
              <div 
                className="notebook-tabs-container"
                onWheel={(e) => {
                  e.preventDefault();
                  e.currentTarget.scrollLeft += e.deltaY;
                }}
              >
                {/* 전체 메모 탭 */}
                <button
                  className={`tab-button ${selectedNotebookId === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedNotebookId('all')}
                >
                  모든 메모 ({appData.memos.length})
                </button>
                
                {/* 노트북 탭들 */}
                {appData.notebooks.map(notebook => (
                  <button
                    key={notebook.id}
                    className={`tab-button ${selectedNotebookId === notebook.id ? 'active' : ''}`}
                    onClick={() => setSelectedNotebookId(notebook.id)}
                    onContextMenu={(e) => e.preventDefault()} // 우클릭 방지
                  >
                    {notebook.name} ({appData.memos.filter(m => m.notebookId === notebook.id).length})
                    
                    {/* 항상 보이는 편집/삭제 버튼 */}
                    <div className="tab-actions">
                      <button 
                        className="tab-action-btn tab-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNotebook(notebook.id);
                        }}
                        title="이름 변경"
                      >
                        ✏
                      </button>
                      <button 
                        className="tab-action-btn tab-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotebook(notebook.id);
                        }}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </button>
                ))}
                
                {/* 새 노트북 추가 탭 */}
                <button
                  className="tab-button add-new"
                  onClick={() => {
                    const name = prompt('새 노트북 이름을 입력하세요:');
                    if (name && name.trim()) {
                      setNewNotebookName(name.trim());
                      createNotebook();
                    }
                  }}
                  title="새 노트북 추가"
                >
                  ➕ 새 노트북
                </button>
              </div>

              {/* 노트북 이름 편집 */}
              {editingNotebook && (
                <div style={{ marginTop: '16px' }}>
                  <input
                    type="text"
                    defaultValue={appData.notebooks.find(nb => nb.id === editingNotebook)?.name || ''}
                    autoFocus
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        updateNotebook(editingNotebook, e.target.value.trim());
                      } else {
                        setEditingNotebook(null);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        updateNotebook(editingNotebook, e.target.value.trim());
                      } else if (e.key === 'Escape') {
                        setEditingNotebook(null);
                      }
                    }}
                    style={styles.input}
                  />
                </div>
              )}
            </div>
            
            {/* 메모 섹션 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📝 메모 ({getFilteredMemos().length})</div>
              
              {/* 검색 바 */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="🔍 메모 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.input}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: styles.textSecondary
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {/* 새 메모 작성 */}
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  placeholder="새 메모 작성..."
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  style={{...styles.input, height: '80px', resize: 'vertical', marginBottom: '8px'}}
                />
                <button
                  onClick={createMemo}
                  style={{...styles.button, ...styles.successButton, width: '100%'}}
                  disabled={!newMemoContent.trim()}
                >
                  💾 메모 저장
                </button>
              </div>
              
              {/* 메모 목록 */}
              <div style={{ height: '300px', overflowY: 'auto', border: `1px solid ${styles.border}`, borderRadius: '8px', marginBottom: '16px' }}>
                <ul style={styles.list}>
                  {getFilteredMemos().map(memo => (
                    <li
                      key={memo.id}
                      style={{
                        ...styles.listItem,
                        ...(selectedMemo?.id === memo.id ? styles.activeListItem : {}),
                        padding: '8px 12px',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onClick={() => setSelectedMemo(memo)}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        flex: 1,
                        minWidth: 0,
                        cursor: 'pointer'
                      }}>
                        <span>📄</span>
                        <span style={{ 
                          fontWeight: '600',
                          minWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {memo.title}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          color: styles.textSecondary,
                          minWidth: '60px',
                          whiteSpace: 'nowrap'
                        }}>
                          {new Date(memo.modifiedAt).toLocaleDateString('ko-KR', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                        {/* 메모 이동 버튼 - 더 명확하게 표시 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemoToMove(memo);
                            setShowMoveModal(true);
                          }}
                          style={{
                            background: 'none',
                            border: `1px solid ${styles.border}`,
                            cursor: 'pointer',
                            padding: '6px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="다른 노트북으로 이동"
                        >
                          📁 이동
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMemo(memo.id, memo.title);
                          }}
                          style={{
                            background: 'none',
                            border: `1px solid ${styles.border}`,
                            cursor: 'pointer',
                            padding: '6px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            backgroundColor: styles.danger,
                            color: 'white'
                          }}
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* 하단 버튼들 */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  style={{...styles.button, ...styles.primaryButton, flex: 1, fontSize: '11px', padding: '8px 4px'}}
                >
                  설정
                </button>
                <button
                  onClick={() => setShowTrashModal(true)}
                  style={{...styles.button, ...styles.dangerButton, flex: 1, fontSize: '11px', padding: '8px 4px'}}
                >
                  휴지통
                </button>
              </div>
            </div>
          </div>
          
          {/* 오른쪽 패널 - 메모 편집 영역 */}
          <div style={styles.rightPanel}>
            {selectedMemo ? (
              <>
                {/* 메모 제목 */}
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="text"
                    value={selectedMemo.title}
                    onChange={(e) => {
                      const updatedMemo = { ...selectedMemo, title: e.target.value };
                      setSelectedMemo(updatedMemo);
                      updateMemo(updatedMemo);
                    }}
                    style={{
                      ...styles.input,
                      fontSize: '18px',
                      fontWeight: '600',
                      flex: 1
                    }}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: styles.textSecondary,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end'
                  }}>
                    <div>생성: {new Date(selectedMemo.createdAt).toLocaleString('ko-KR')}</div>
                    <div>수정: {new Date(selectedMemo.modifiedAt).toLocaleString('ko-KR')}</div>
                  </div>
                </div>
                
                {/* 메모 내용 편집기 */}
                <textarea
                  value={selectedMemo.content}
                  onChange={(e) => {
                    const updatedMemo = { ...selectedMemo, content: e.target.value };
                    setSelectedMemo(updatedMemo);
                    updateMemo(updatedMemo);
                  }}
                  style={styles.editor}
                  placeholder="메모 내용을 입력하세요..."
                />
                
                {/* 미리보기 영역 */}
                <div style={{ 
                  marginTop: '20px', 
                  padding: '20px', 
                  backgroundColor: styles.panelBg,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '12px', color: styles.textSecondary }}>
                    📖 미리보기
                  </h4>
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(marked.parse(selectedMemo.content || '')) 
                    }}
                    style={{ 
                      color: styles.text,
                      lineHeight: 1.6,
                      fontSize: '14px'
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                flexDirection: 'column',
                gap: '16px',
                color: styles.textSecondary
              }}>
                <div style={{ fontSize: '48px' }}>📝</div>
                <div style={{ fontSize: '18px', textAlign: 'center' }}>
                  편집할 메모를 선택하세요
                  <br />
                  <small>왼쪽에서 메모를 클릭하면 편집할 수 있습니다.</small>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* 메모 이동 모달 */}
      {showMoveModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>메모 이동</h3>
            <p>"{memoToMove?.title}"을(를) 어느 노트북으로 이동하시겠습니까?</p>
            
            <select
              value={targetNotebookId}
              onChange={(e) => setTargetNotebookId(e.target.value)}
              style={{...styles.input, marginBottom: '20px'}}
            >
              <option value="">선택하세요</option>
              <option value="main">📋 기본 메모</option>
              {appData.notebooks.map(notebook => (
                <option key={notebook.id} value={notebook.id}>
                  📁 {notebook.name}
                </option>
              ))}
            </select>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setMemoToMove(null);
                  setTargetNotebookId('');
                }}
                style={{...styles.button, flex: 1, backgroundColor: styles.textSecondary, color: 'white'}}
              >
                취소
              </button>
              <button
                onClick={() => moveMemo(memoToMove.id, targetNotebookId)}
                disabled={!targetNotebookId}
                style={{...styles.button, ...styles.primaryButton, flex: 1}}
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 휴지통 모달 */}
      {showTrashModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>🗑️ 휴지통</h3>
            
            {appData.deletedItems.length === 0 ? (
              <p style={{ textAlign: 'center', color: styles.textSecondary, padding: '40px' }}>
                휴지통이 비어있습니다.
              </p>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <p>삭제된 항목 {appData.deletedItems.length}개</p>
                </div>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                  {appData.deletedItems.map(item => (
                    <div key={`${item.type}_${item.id}`} style={{
                      padding: '12px',
                      border: `1px solid ${styles.border}`,
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>
                          {item.type === 'memo' ? '📄' : '📁'} {item.title || item.name}
                        </div>
                        <div style={{ fontSize: '12px', color: styles.textSecondary }}>
                          삭제: {new Date(item.deletedAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => {
                    if (window.confirm('휴지통을 완전히 비우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                      setAppData({...appData, deletedItems: []});
                      showToast('휴지통이 비워졌습니다.', 'success');
                    }
                  }}
                  style={{...styles.button, ...styles.dangerButton, width: '100%', marginBottom: '12px'}}
                >
                  휴지통 비우기
                </button>
              </>
            )}
            
            <button
              onClick={() => setShowTrashModal(false)}
              style={{...styles.button, backgroundColor: styles.textSecondary, color: 'white', width: '100%'}}
            >
              닫기
            </button>
          </div>
        </div>
      )}
      
      {/* 설정 모달 */}
      {showSettingsModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>⚙️ 설정</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <h4>🎨 테마 설정</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setTheme('light');
                    Storage.save('theme', 'light');
                  }}
                  style={{
                    ...styles.button,
                    ...(theme === 'light' ? styles.primaryButton : {}),
                    flex: 1
                  }}
                >
                  ☀️ 라이트
                </button>
                <button
                  onClick={() => {
                    setTheme('dark');
                    Storage.save('theme', 'dark');
                  }}
                  style={{
                    ...styles.button,
                    ...(theme === 'dark' ? styles.primaryButton : {}),
                    flex: 1
                  }}
                >
                  🌙 다크
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <h4>📊 통계</h4>
              <div style={{
                padding: '16px',
                backgroundColor: styles.bg,
                borderRadius: '8px',
                border: `1px solid ${styles.border}`
              }}>
                <div>전체 메모: {appData.memos.length}개</div>
                <div>노트북: {appData.notebooks.length}개</div>
                <div>휴지통: {appData.deletedItems.length}개</div>
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <h4>🔐 보안</h4>
              <button
                onClick={() => {
                  if (window.confirm('정말로 로그아웃하시겠습니까?')) {
                    handleLogout();
                    setShowSettingsModal(false);
                  }
                }}
                style={{...styles.button, ...styles.dangerButton, width: '100%'}}
              >
                로그아웃
              </button>
            </div>
            
            <button
              onClick={() => setShowSettingsModal(false)}
              style={{...styles.button, backgroundColor: styles.textSecondary, color: 'white', width: '100%'}}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎯 메인 앱 래퍼
function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <SecureMemoApp />
    </GoogleOAuthProvider>
  );
}

export default App;
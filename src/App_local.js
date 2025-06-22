// 🔐 로컬 스토리지 전용 메모장 앱 (Google OAuth 없음)
// Google 로그인 문제 해결을 위한 임시 버전

import { useState, useEffect, useCallback } from 'react';
import CryptoJS from 'crypto-js';
import TreeMemoSection from './TreeMemoSection';

const CLIENT_ID = 'local-storage-only';

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
    // 기본 레이아웃
    container: { 
      display: 'flex', height: '100vh', 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", 
      backgroundColor: c.bg, color: c.text 
    },
    
    // 🔐 보안 관련 스타일
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
    
    // 에러 메시지
    errorMessage: {
      color: c.danger, fontSize: '14px', marginBottom: '16px',
      padding: '12px', backgroundColor: `${c.danger}10`,
      borderRadius: '8px', border: `1px solid ${c.danger}30`
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
      flexGrow: 1, padding: '24px', 
      display: 'flex', flexDirection: 'column' 
    },
    
    // 헤더
    header: { 
      padding: '20px', borderBottom: `1px solid ${c.border}`, 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
    },
    profileSection: { display: 'flex', alignItems: 'center', gap: '12px' },
    
    // 아이콘 버튼
    iconButton: { 
      background: 'none', border: `1px solid ${c.border}`, 
      color: c.textSecondary, cursor: 'pointer', padding: '8px', 
      borderRadius: '8px', transition: 'all 0.2s'
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
    toastWarning: { backgroundColor: c.warning, color: c.text },
    
    // 🌳 TreeMemoSection 전용 스타일
    memoListItem: {
      padding: '8px 12px', cursor: 'pointer', display: 'flex', 
      alignItems: 'center', gap: '8px', borderRadius: '6px',
      margin: '2px 0', transition: 'background-color 0.2s',
      backgroundColor: 'transparent', border: `1px solid transparent`
    },
    activeMemoListItem: { 
      backgroundColor: c.activeBg, border: `1px solid ${c.accent}`, fontWeight: '500'
    },
    addButton: { padding: '8px 12px', minWidth: '40px', fontSize: '14px' },
    inputGroup: { display: 'flex', gap: '8px', alignItems: 'center' },
    notebookSection: {
      padding: '16px', borderBottom: `1px solid ${c.border}`,
      flex: 1, display: 'flex', flexDirection: 'column'
    },
    memoSection: {
      padding: '16px', borderBottom: `1px solid ${c.border}`,
      flex: 1, display: 'flex', flexDirection: 'column'
    },
    memoInput: { resize: 'vertical', fontFamily: 'inherit' }
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

// 🔐 비밀번호 설정 컴포넌트
const PasswordSetup = ({ onPasswordSet, styles }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [strength, setStrength] = useState(0);

  const checkPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  useEffect(() => {
    setStrength(checkPasswordStrength(password));
  }, [password]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (strength < 3) {
      setError('비밀번호가 너무 약합니다. 대소문자, 숫자, 특수문자를 포함해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    onPasswordSet(password);
  };

  const strengthColors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997', '#0dcaf0'];
  const strengthTexts = ['매우 약함', '약함', '보통', '강함', '매우 강함', '최고'];

  return (
    <div style={styles.securityContainer}>
      <div style={styles.securityCard}>
        <div style={styles.securityHeader}>
          <div style={styles.securityIcon}>🔐</div>
          <h2>로컬 보안 설정</h2>
          <p>메모를 보호할 마스터 비밀번호를 설정하세요.</p>
          <div style={{...styles.statusCard, ...styles.statusSecure}}>
            <Icons.Shield />
            <span>로컬 스토리지 전용 모드</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="마스터 비밀번호 (최소 8자)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.passwordInput}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer'
              }}
            >
              {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
            </button>
          </div>
          
          {password && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px' }}>강도:</span>
                <div style={{
                  flex: 1, height: '4px', backgroundColor: '#e9ecef',
                  borderRadius: '2px', overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(strength / 6) * 100}%`, height: '100%',
                    backgroundColor: strengthColors[strength - 1] || '#e9ecef',
                    transition: 'all 0.3s'
                  }} />
                </div>
                <span style={{ 
                  fontSize: '12px',
                  color: strengthColors[strength - 1] || '#6c757d'
                }}>
                  {strengthTexts[strength - 1] || ''}
                </span>
              </div>
            </div>
          )}

          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.passwordInput}
          />

          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            style={{...styles.button, ...styles.primaryButton}}
            disabled={!password || !confirmPassword || strength < 3}
          >
            <Icons.Lock />
            로컬 암호화 활성화
          </button>
        </form>

        <div style={styles.helpText}>
          ⚠️ <strong>중요:</strong> 이 비밀번호를 잊어버리면 모든 데이터를 잃게 됩니다.<br/>
          데이터는 브라우저 로컬 스토리지에만 저장됩니다.
        </div>
      </div>
    </div>
  );
};

// 🔓 비밀번호 입력 컴포넌트
const PasswordUnlock = ({ onPasswordEnter, styles, error, attempts = 0 }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
          <div style={{...styles.statusCard, ...styles.statusSecure}}>
            <Icons.Shield />
            <span>로컬 스토리지 모드</span>
          </div>
        </div>

        {attempts > 0 && (
          <div style={{...styles.statusCard, ...styles.statusError}}>
            <Icons.Shield />
            <span>잘못된 시도 {attempts}회</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="마스터 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.passwordInput}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer'
              }}
            >
              {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
            </button>
          </div>

          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            style={{...styles.button, ...styles.primaryButton}}
            disabled={!password.trim()}
          >
            <Icons.Unlock />
            잠금 해제
          </button>
        </form>

        <div style={styles.helpText}>
          💡 로컬 스토리지 모드에서 실행 중입니다.<br/>
          데이터는 이 브라우저에만 저장됩니다.
        </div>
      </div>
    </div>
  );
};

// 🎯 메인 로컬 메모장 앱
function LocalSecureMemoApp() {
  const [theme, setTheme] = useState(() => Storage.load('theme') || 'light');
  const styles = getThemeStyles(theme);

  // 🔐 보안 상태
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);

  // 📂 앱 데이터 상태
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
  
  // 🔍 검색 및 정렬 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('modifiedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // 🌳 트리 구조 상태
  const [expandedNotebooks, setExpandedNotebooks] = useState(new Set(['all']));
  const [sortOption, setSortOption] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // 🔐 개별 메모 비밀번호 상태
  const [isPrivateMemo, setIsPrivateMemo] = useState(false);
  const [privateMemoPassword, setPrivateMemoPassword] = useState('');
  const [showPrivatePassword, setShowPrivatePassword] = useState(false);

  // 모달 상태들
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrivateMemoModal, setShowPrivateMemoModal] = useState(false);
  const [memoToMove, setMemoToMove] = useState(null);
  const [targetNotebookId, setTargetNotebookId] = useState('');
  const [privateMemoToUnlock, setPrivateMemoToUnlock] = useState(null);
  const [privateMemoUnlockPassword, setPrivateMemoUnlockPassword] = useState('');
  const [privateMemoUnlockError, setPrivateMemoUnlockError] = useState('');

  // 🎉 토스트 메시지 표시
  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, duration);
  }, []);

  // 💾 암호화된 데이터 저장 (로컬 스토리지)
  const saveEncryptedData = async (data, password = masterPassword) => {
    if (!password) {
      throw new Error('비밀번호가 필요합니다.');
    }
    
    try {
      const updatedData = {
        ...data,
        metadata: {
          ...data.metadata,
          lastModified: new Date().toISOString(),
          totalMemos: data.memos.length,
          totalNotebooks: data.notebooks.length
        }
      };
      
      const encryptedContent = CryptoUtils.encrypt(updatedData, password);
      Storage.save('encrypted-data', encryptedContent);
      
      console.log('✅ 로컬 암호화된 데이터 저장 완료');
      return updatedData;
      
    } catch (error) {
      console.error('❌ 데이터 저장 실패:', error);
      throw error;
    }
  };

  // 📖 암호화된 데이터 로드 (로컬 스토리지)
  const loadEncryptedData = async (password = masterPassword) => {
    if (!password) {
      console.log('📝 로드할 데이터가 없습니다.');
      return null;
    }
    
    try {
      const encryptedData = Storage.load('encrypted-data');
      if (!encryptedData) {
        return null;
      }
      
      const decryptedData = CryptoUtils.decrypt(encryptedData, password);
      console.log('✅ 로컬 암호화된 데이터 로드 완료');
      
      return decryptedData;
      
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      throw error;
    }
  };

  // 🌳 트리 구조 관련 함수들
  const toggleNotebook = (notebookId) => {
    setExpandedNotebooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notebookId)) {
        newSet.delete(notebookId);
      } else {
        newSet.add(notebookId);
      }
      return newSet;
    });
  };

  const getMemosByNotebook = (notebookId) => {
    let memos;
    if (notebookId === 'all') {
      memos = appData.memos;
    } else {
      memos = appData.memos.filter(memo => memo.notebookId === notebookId);
    }
    
    // 검색 필터링
    if (searchQuery.trim()) {
      memos = memos.filter(memo => {
        if (memo.hasPrivatePassword) {
          return memo.title.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
          return memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 memo.content.toLowerCase().includes(searchQuery.toLowerCase());
        }
      });
    }
    
    // 정렬
    memos.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortOption) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'date':
        default:
          aValue = new Date(a.modifiedAt);
          bValue = new Date(b.modifiedAt);
          break;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return memos;
  };

  // 📋 필터링 및 정렬된 메모 가져오기
  const getFilteredMemos = () => {
    let filteredMemos = selectedNotebookId === 'all' 
      ? appData.memos 
      : appData.memos.filter(memo => memo.notebookId === selectedNotebookId);
    
    if (searchQuery.trim()) {
      filteredMemos = filteredMemos.filter(memo => {
        if (memo.hasPrivatePassword) {
          return memo.title.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
          return memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 memo.content.toLowerCase().includes(searchQuery.toLowerCase());
        }
      });
    }
    
    filteredMemos.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'modifiedAt':
        default:
          aValue = new Date(a.modifiedAt);
          bValue = new Date(b.modifiedAt);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filteredMemos;
  };

  // 🔐 비밀번호 설정
  const handlePasswordSetup = async (password) => {
    try {
      setIsLoading(true);
      setMasterPassword(password);
      
      const passwordHash = CryptoUtils.hashPassword(password);
      Storage.save('password-hash', passwordHash);
      
      const initialData = {
        notebooks: [],
        memos: [],
        deletedItems: [],
        metadata: {
          version: '2.0',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          totalMemos: 0,
          totalNotebooks: 0,
          lastBackup: null
        }
      };
      
      await saveEncryptedData(initialData, password);
      
      setAppData(initialData);
      setIsPasswordSet(true);
      setIsUnlocked(true);
      
      showToast('로컬 보안 설정이 완료되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 비밀번호 설정 실패:', error);
      showToast('보안 설정에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔓 비밀번호 확인 및 잠금 해제
  const handlePasswordUnlock = async (password) => {
    try {
      setIsLoading(true);
      setPasswordError('');
      
      const storedHash = Storage.load('password-hash');
      
      if (storedHash) {
        const inputHash = CryptoUtils.hashPassword(password);
        if (storedHash !== inputHash) {
          const newAttempts = loginAttempts + 1;
          setLoginAttempts(newAttempts);
          setPasswordError('잘못된 비밀번호입니다.');
          
          if (newAttempts >= 5) {
            showToast('너무 많은 시도로 일시적으로 차단되었습니다.', 'error');
            setTimeout(() => setLoginAttempts(0), 60000);
          }
          return;
        }
      }
      
      try {
        const data = await loadEncryptedData(password);
        if (data) {
          setAppData(data);
          setMasterPassword(password);
          setIsUnlocked(true);
          setLoginAttempts(0);
          
          if (!storedHash) {
            const newHash = CryptoUtils.hashPassword(password);
            Storage.save('password-hash', newHash);
            console.log('💾 비밀번호 해시 복원 완료');
          }
          
          showToast('데이터 잠금이 해제되었습니다!', 'success');
        } else {
          throw new Error('데이터 복호화 실패');
        }
      } catch (decryptError) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        setPasswordError('잘못된 비밀번호입니다.');
        
        if (newAttempts >= 5) {
          showToast('너무 많은 시도로 일시적으로 차단되었습니다.', 'error');
          setTimeout(() => setLoginAttempts(0), 60000);
        }
      }
      
    } catch (error) {
      console.error('❌ 비밀번호 확인 실패:', error);
      setPasswordError('비밀번호 확인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 나머지 함수들은 원본 App.js와 동일하게 구현...
  // (createMemo, updateMemo, deleteMemo, createNotebook, updateNotebook, deleteNotebook 등)
  
  // 간단한 버전으로 주요 함수들만 구현
  const createMemo = async () => {
    if (!newMemoContent.trim()) {
      showToast('메모 내용을 입력해주세요.', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const firstLine = newMemoContent.split('\n')[0].slice(0, 50).trim();
      const title = firstLine || '제목 없는 메모';
      
      let content = newMemoContent;
      
      if (isPrivateMemo && privateMemoPassword.trim()) {
        content = CryptoUtils.encrypt(newMemoContent, privateMemoPassword);
      }
      
      const newMemo = {
        id: `memo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title,
        content: content,
        notebookId: selectedNotebookId === 'all' ? null : selectedNotebookId,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        tags: [],
        isStarred: false,
        isPrivate: isPrivateMemo,
        hasPrivatePassword: isPrivateMemo && privateMemoPassword.trim() ? true : false
      };
      
      const updatedData = {
        ...appData,
        memos: [newMemo, ...appData.memos]
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      setNewMemoContent('');
      setIsPrivateMemo(false);
      setPrivateMemoPassword('');
      
      showToast(
        isPrivateMemo ? '개별 비밀번호가 설정된 메모가 생성되었습니다!' : '메모가 생성되었습니다!', 
        'success'
      );
      
    } catch (error) {
      console.error('❌ 메모 생성 실패:', error);
      showToast('메모 생성에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const createNotebook = async () => {
    if (!newNotebookName.trim()) {
      showToast('노트북 이름을 입력해주세요.', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const newNotebook = {
        id: `notebook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newNotebookName,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        color: '#007bff'
      };
      
      const updatedData = {
        ...appData,
        notebooks: [...appData.notebooks, newNotebook].sort((a, b) => a.name.localeCompare(b.name))
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      setNewNotebookName('');
      setSelectedNotebookId(newNotebook.id);
      
      showToast('노트북이 생성되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 노트북 생성 실패:', error);
      showToast('노트북 생성에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 단순화된 버전의 기타 함수들
  const updateMemo = () => showToast('메모 업데이트 기능', 'success');
  const deleteMemo = () => showToast('메모 삭제 기능', 'success');
  const updateNotebook = () => showToast('노트북 업데이트 기능', 'success');
  const deleteNotebook = () => showToast('노트북 삭제 기능', 'success');
  const createBackup = () => showToast('백업 생성 기능', 'success');
  const exportData = () => showToast('데이터 내보내기 기능', 'success');
  const handleMemoSelect = (memo) => setSelectedMemo(memo);
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    Storage.save('theme', newTheme);
  };

  // 🚀 앱 시작 시 설정 확인
  useEffect(() => {
    const savedHash = Storage.load('password-hash');
    if (savedHash) {
      setIsPasswordSet(true);
    }
  }, []);

  // 🎨 테마에 따른 body 배경색 설정
  useEffect(() => {
    const colors = { light: '#f8f9fa', dark: '#121212' };
    document.body.style.backgroundColor = colors[theme];
    document.documentElement.style.backgroundColor = colors[theme];
    
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, [theme]);

  return (
    <div style={styles.container}>
      {isLoading && <Spinner styles={styles} />}
      <Toast show={toast.show} message={toast.message} type={toast.type} styles={styles} />
      
      {!isPasswordSet && (
        <PasswordSetup onPasswordSet={handlePasswordSetup} styles={styles} />
      )}
      
      {isPasswordSet && !isUnlocked && (
        <PasswordUnlock 
          onPasswordEnter={handlePasswordUnlock} 
          styles={styles} 
          error={passwordError}
          attempts={loginAttempts}
        />
      )}
      
      {isPasswordSet && isUnlocked && (
        <>
          <div style={styles.leftPanel}>
            <div style={styles.header}>
              <div style={styles.profileSection}>
                <div>
                  <div style={{ fontWeight: '600' }}>로컬 사용자</div>
                  <div style={{ fontSize: '10px', color: styles.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: styles.success }}>🔐 로컬 암호화됨</span>
                    <span>📝 {appData.memos.length}개</span>
                    <span>📁 {appData.notebooks.length}개</span>
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
              </div>
            </div>
            
            <TreeMemoSection
              styles={styles}
              appData={appData}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortOption={sortOption}
              setSortOption={setSortOption}
              sortDirection={sortDirection}
              setSortDirection={setSortDirection}
              expandedNotebooks={expandedNotebooks}
              toggleNotebook={toggleNotebook}
              selectedNotebookId={selectedNotebookId}
              setSelectedNotebookId={setSelectedNotebookId}
              selectedMemo={selectedMemo}
              setSelectedMemo={handleMemoSelect}
              newNotebookName={newNotebookName}
              setNewNotebookName={setNewNotebookName}
              createNotebook={createNotebook}
              editingNotebook={editingNotebook}
              setEditingNotebook={setEditingNotebook}
              updateNotebook={updateNotebook}
              deleteNotebook={deleteNotebook}
              getMemosByNotebook={getMemosByNotebook}
              getFilteredMemos={getFilteredMemos}
              setMemoToMove={setMemoToMove}
              setShowMoveModal={setShowMoveModal}
              deleteMemo={deleteMemo}
              newMemoContent={newMemoContent}
              setNewMemoContent={setNewMemoContent}
              createMemo={createMemo}
              isPrivateMemo={isPrivateMemo}
              setIsPrivateMemo={setIsPrivateMemo}
              privateMemoPassword={privateMemoPassword}
              setPrivateMemoPassword={setPrivateMemoPassword}
              showPrivatePassword={showPrivatePassword}
              setShowPrivatePassword={setShowPrivatePassword}
              Icons={Icons}
              createBackup={createBackup}
              exportData={exportData}
              setShowSettingsModal={setShowSettingsModal}
              setShowTrashModal={setShowTrashModal}
              isLoading={isLoading}
            />
          </div>
          
          <div style={styles.rightPanel}>
            {selectedMemo ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '16px', paddingBottom: '16px',
                  borderBottom: `1px solid ${styles.border}`
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedMemo.title}</h2>
                    <div style={{ fontSize: '12px', color: styles.textSecondary, marginTop: '4px' }}>
                      마지막 수정: {new Date(selectedMemo.modifiedAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => updateMemo(selectedMemo)}
                      style={{...styles.button, ...styles.successButton}}
                      disabled={isLoading}
                    >
                      💾 저장
                    </button>
                  </div>
                </div>
                
                <div style={{ flexGrow: 1, display: 'flex' }}>
                  <textarea
                    value={selectedMemo.content}
                    onChange={(e) => setSelectedMemo({
                      ...selectedMemo,
                      content: e.target.value,
                      title: e.target.value.split('\n')[0].slice(0, 50).trim() || '제목 없는 메모'
                    })}
                    style={{
                      ...styles.editor,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '8px'
                    }}
                    placeholder="메모를 작성하세요..."
                  />
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                alignItems: 'center', height: '100%', textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                <h2>로컬 보안 메모장</h2>
                <p style={{ color: styles.textSecondary, maxWidth: '400px' }}>
                  왼쪽에서 메모를 선택하거나 새로운 메모를 작성해보세요.<br/>
                  모든 데이터는 로컬 스토리지에 AES 암호화로 안전하게 저장됩니다.
                </p>
                
                <div style={{ marginTop: '32px', textAlign: 'left' }}>
                  <h4>✨ 로컬 모드 기능</h4>
                  <ul style={{ lineHeight: 1.6 }}>
                    <li>🔐 로컬 AES 암호화</li>
                    <li>📁 노트북으로 메모 정리</li>
                    <li>🌳 아코디언 트리 구조</li>
                    <li>🔒 개별 메모 비밀번호</li>
                    <li>🌙 다크/라이트 테마</li>
                    <li>💾 브라우저 로컬 스토리지</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default LocalSecureMemoApp;
// 🔐 완전 암호화 메모장 앱 - 전체 새로운 시스템
// 모든 데이터가 암호화되어 Google Drive에 저장됩니다.

import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TreeMemoSection from './TreeMemoSection';

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
    // 🔐 보안 관련 스타일
    securityContainer: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '20px',
      backgroundColor: c.bg,
      zIndex: 1000
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
      transition: 'border-color 0.3s'
    },
    passwordInputFocus: {
      borderColor: c.accent
    },    
    // 버튼 스타일
    button: {
      width: '100%',
      padding: '16px',
      fontSize: '16px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    primaryButton: {
      backgroundColor: c.accent,
      color: c.accentText
    },
    dangerButton: {
      backgroundColor: c.danger,
      color: 'white'
    },
    successButton: {
      backgroundColor: c.success,
      color: 'white'
    },
    
    // 상태 표시
    statusCard: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px'
    },
    statusSecure: {
      backgroundColor: `${c.success}15`,
      border: `1px solid ${c.success}`,
      color: c.success
    },
    statusError: {
      backgroundColor: `${c.danger}15`,
      border: `1px solid ${c.danger}`,
      color: c.danger
    },
    statusWarning: {
      backgroundColor: `${c.warning}15`,
      border: `1px solid ${c.warning}`,
      color: c.warning
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
    
    // 도움말 텍스트
    helpText: {
      fontSize: '12px',
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: '20px',
      lineHeight: 1.5
    },    
    // 메인 앱 레이아웃
    leftPanel: { 
      width: '450px', 
      borderRight: `1px solid ${c.border}`, 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: c.panelBg 
    },
    rightPanel: { 
      flexGrow: 1, 
      padding: '24px', 
      display: 'flex', 
      flexDirection: 'column' 
    },
    
    // 헤더
    header: { 
      padding: '20px', 
      borderBottom: `1px solid ${c.border}`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between' 
    },
    profileSection: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px' 
    },
    profileImage: { 
      borderRadius: '50%', 
      width: '36px', 
      height: '36px' 
    },    
    // 아이콘 버튼
    iconButton: { 
      background: 'none', 
      border: `1px solid ${c.border}`, 
      color: c.textSecondary, 
      cursor: 'pointer', 
      padding: '8px', 
      borderRadius: '8px',
      transition: 'all 0.2s'
    },
    
    // 섹션
    section: { 
      padding: '20px',
      borderBottom: `1px solid ${c.border}`
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    
    // 입력 필드
    input: { 
      width: '100%', 
      padding: '12px', 
      border: `1px solid ${c.border}`, 
      borderRadius: '8px', 
      backgroundColor: c.bg, 
      color: c.text, 
      outline: 'none',
      fontSize: '14px'
    },    
    // 리스트
    list: { 
      listStyle: 'none', 
      padding: 0, 
      margin: 0 
    },
    listItem: { 
      padding: '12px 16px', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      borderRadius: '8px',
      margin: '4px 0',
      transition: 'background-color 0.2s'
    },
    activeListItem: { 
      backgroundColor: c.activeBg, 
      fontWeight: '600'
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
    // 에디터
    editor: {
      flexGrow: 1,
      border: 'none',
      padding: '20px',
      fontSize: '16px',
      fontFamily: 'Monaco, Menlo, monospace',
      resize: 'none',
      outline: 'none',
      backgroundColor: c.bg,
      color: c.text,
      lineHeight: 1.6
    },
    
    // 로딩 및 피드백
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
    toastWarning: { backgroundColor: c.warning, color: c.text },
    
    // 🌳 TreeMemoSection 전용 스타일
    memoListItem: {
      padding: '8px 12px', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      borderRadius: '6px',
      margin: '2px 0',
      transition: 'background-color 0.2s',
      backgroundColor: 'transparent',
      border: `1px solid transparent`
    },
    activeMemoListItem: { 
      backgroundColor: c.activeBg, 
      border: `1px solid ${c.accent}`,
      fontWeight: '500'
    },
    addButton: {
      padding: '8px 12px',
      minWidth: '40px',
      fontSize: '14px'
    },
    inputGroup: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    notebookSection: {
      padding: '16px',
      borderBottom: `1px solid ${c.border}`,
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    memoSection: {
      padding: '16px',
      borderBottom: `1px solid ${c.border}`,
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    memoInput: {
      ...this?.input || {},
      resize: 'vertical',
      fontFamily: 'inherit'
    }
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

  // 비밀번호 강도 체크
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
          <h2>보안 설정</h2>
          <p>전체 메모를 보호할 마스터 비밀번호를 설정하세요.</p>
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
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: styles.textSecondary
              }}
            >
              {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
            </button>
          </div>
          {password && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '8px' 
              }}>
                <span style={{ fontSize: '12px' }}>강도:</span>
                <div style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(strength / 6) * 100}%`,
                    height: '100%',
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
            암호화 활성화
          </button>
        </form>

        <div style={styles.helpText}>
          ⚠️ <strong>중요:</strong> 이 비밀번호를 잊어버리면 모든 데이터를 잃게 됩니다.<br/>
          안전한 곳에 백업해 두세요.
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
        </div>

        {attempts > 0 && (
          <div style={{...styles.statusCard, ...styles.statusWarning}}>
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
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
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
          💡 비밀번호를 잊었나요?<br/>
          백업 파일에서 복구하거나 새로 시작해야 합니다.
        </div>
      </div>
    </div>
  );
};
// 📊 보안 상태 표시 컴포넌트
const SecurityStatus = ({ isSecure, dataCount, lastBackup, styles }) => {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>
        <Icons.Shield />
        보안 상태
      </div>
      
      <div style={{
        ...styles.statusCard,
        ...(isSecure ? styles.statusSecure : styles.statusError)
      }}>
        <Icons.Lock />
        <span>{isSecure ? '암호화 활성화됨' : '암호화 비활성화됨'}</span>
      </div>

      <div style={{ fontSize: '14px', color: styles.textSecondary }}>
        <p>📝 총 메모: {dataCount.memos}개</p>
        <p>📁 노트북: {dataCount.notebooks}개</p>
        {lastBackup && (
          <p>💾 마지막 백업: {new Date(lastBackup).toLocaleString('ko-KR')}</p>
        )}
      </div>
    </div>
  );
};
// 🎯 메인 보안 메모장 앱
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
    deletedItems: [], // 🗑️ 휴지통
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
  const [viewMode, setViewMode] = useState('edit');
  const [editingNotebook, setEditingNotebook] = useState(null);
  
  // 🔍 검색 및 정렬 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('modifiedAt'); // 'modifiedAt', 'createdAt', 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  
  // 🌳 트리 구조 상태
  const [expandedNotebooks, setExpandedNotebooks] = useState(new Set(['all']));
  const [sortOption, setSortOption] = useState('date'); // 'date', 'created', 'title'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'
  
  // 🔐 개별 메모 비밀번호 상태
  const [isPrivateMemo, setIsPrivateMemo] = useState(false);
  const [privateMemoPassword, setPrivateMemoPassword] = useState('');
  const [showPrivatePassword, setShowPrivatePassword] = useState(false);

  // 모달 상태들
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrivateMemoModal, setShowPrivateMemoModal] = useState(false);
  const [memoToMove, setMemoToMove] = useState(null);
  const [targetNotebookId, setTargetNotebookId] = useState('');
  const [privateMemoToUnlock, setPrivateMemoToUnlock] = useState(null);
  const [privateMemoUnlockPassword, setPrivateMemoUnlockPassword] = useState('');
  const [privateMemoUnlockError, setPrivateMemoUnlockError] = useState('');
  
  // ⚙️ 자동 백업 설정
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => Storage.load('auto-backup-enabled') || false);
  const [autoBackupInterval, setAutoBackupInterval] = useState(() => Storage.load('auto-backup-interval') || 30); // 분 단위
  const [lastAutoBackup, setLastAutoBackup] = useState(() => Storage.load('last-auto-backup') || null);
  const [autoBackupTimer, setAutoBackupTimer] = useState(null);
  // 🎉 토스트 메시지 표시
  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, duration);
  }, []);

  // 🔐 Google 로그인 설정
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('🎉 로그인 성공');
      const token = tokenResponse.access_token;
      
      setAccessToken(token);
      Storage.save('access-token', token);
      Storage.save('token-expiry', Date.now() + (tokenResponse.expires_in || 3600) * 1000);
      
      // 사용자 정보 가져오기
      try {
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUser(userResponse.data);
        Storage.save('user', userResponse.data);
        
        showToast('Google 로그인 성공!', 'success');
        
        // 앱 폴더 설정
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
    
    // 🔐 비밀번호 해시는 보존하고 나머지만 삭제
    Storage.remove('access-token');
    Storage.remove('token-expiry');
    Storage.remove('user');
    Storage.remove('app-folder-id');
    Storage.remove('encrypted-file-id');
    // 'password-hash'와 'theme'는 보존
    
    showToast('로그아웃되었습니다.', 'success');
  };
  // 📂 앱 폴더 설정
  const setupAppFolder = async (token) => {
    try {
      setIsLoading(true);
      
      // 기존 폴더 찾기
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
        // 새 폴더 생성
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
      
      // 암호화 파일 확인
      await checkEncryptedFile(token, folderId);
      
    } catch (error) {
      console.error('❌ 앱 폴더 설정 실패:', error);
      showToast('앱 폴더 설정에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  // 🔍 암호화 파일 확인
  const checkEncryptedFile = async (token, folderId) => {
    try {
      const searchResponse = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          q: `name='${ENCRYPTED_DATA_FILE}' and '${folderId}' in parents and trashed=false`,
          fields: 'files(id, name, modifiedTime)'
        }
      });
      
      const files = searchResponse.data.files || [];
      
      if (files.length > 0) {
        setEncryptedFileId(files[0].id);
        setIsPasswordSet(true); // 🔐 Drive에 파일이 있으면 보안 설정 완료
        console.log('✅ 기존 암호화 파일 찾음:', files[0].id);
        
        // 🔑 로컬 해시가 없으면 재생성 (이전 로그인 정보 복원)
        const storedHash = Storage.load('password-hash');
        if (!storedHash) {
          console.log('💡 로컬 해시 없음 - 비밀번호 입력 필요');
          // 파일은 있지만 로컬 해시가 없는 경우 (로그아웃 후 재로그인)
          // 비밀번호만 다시 입력하면 됨
        }
      } else {
        console.log('📝 새로운 사용자 - 암호화 파일 없음');
        setIsPasswordSet(false);
      }
      
    } catch (error) {
      console.error('❌ 암호화 파일 확인 실패:', error);
    }
  };

  // 🔐 비밀번호 설정
  const handlePasswordSetup = async (password) => {
    try {
      setIsLoading(true);
      setMasterPassword(password);
      
      // 비밀번호 해시 저장
      const passwordHash = CryptoUtils.hashPassword(password);
      Storage.save('password-hash', passwordHash);
      
      // 초기 데이터 구조 생성
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
      
      // 암호화해서 Drive에 저장
      await saveEncryptedData(initialData, password);
      
      setAppData(initialData);
      setIsPasswordSet(true);
      setIsUnlocked(true);
      
      showToast('보안 설정이 완료되었습니다!', 'success');
      
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
      
      // 🔑 로컬 해시가 있으면 우선 해시로 검증
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
      
      // 🔐 실제 데이터 복호화로 비밀번호 검증 (해시가 없거나 해시 검증 통과 시)
      try {
        const data = await loadEncryptedData(password);
        if (data) {
          // ✅ 성공: 데이터 로드 및 해시 저장
          setAppData(data);
          setMasterPassword(password);
          setIsUnlocked(true);
          setLoginAttempts(0);
          
          // 로컬 해시가 없었다면 새로 저장
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
        // ❌ 복호화 실패 = 잘못된 비밀번호
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
  // 💾 암호화된 데이터 저장
  const saveEncryptedData = async (data, password = masterPassword) => {
    if (!accessToken || !appFolderId || !password) {
      throw new Error('필요한 정보가 없습니다.');
    }
    
    try {
      // 메타데이터 업데이트
      const updatedData = {
        ...data,
        metadata: {
          ...data.metadata,
          lastModified: new Date().toISOString(),
          totalMemos: data.memos.length,
          totalNotebooks: data.notebooks.length
        }
      };
      
      // 데이터 암호화
      const encryptedContent = CryptoUtils.encrypt(updatedData, password);
      
      // Drive에 저장
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;
      
      let requestBody;
      let url;
      
      if (encryptedFileId) {
        // 기존 파일 업데이트
        url = `https://www.googleapis.com/upload/drive/v3/files/${encryptedFileId}?uploadType=multipart`;
        requestBody = delimiter + 
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
          '{}' + delimiter + 
          'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + 
          encryptedContent + close_delim;
      } else {
        // 새 파일 생성
        url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const metadata = {
          name: ENCRYPTED_DATA_FILE,
          parents: [appFolderId],
          mimeType: 'text/plain'
        };
        
        requestBody = delimiter + 
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
          JSON.stringify(metadata) + delimiter + 
          'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + 
          encryptedContent + close_delim;
      }
      
      const response = await axios({
        method: encryptedFileId ? 'PATCH' : 'POST',
        url: url,
        data: requestBody,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        }
      });
      
      if (!encryptedFileId) {
        setEncryptedFileId(response.data.id);
        Storage.save('encrypted-file-id', response.data.id);
      }
      
      console.log('✅ 암호화된 데이터 저장 완료');
      return updatedData;
      
    } catch (error) {
      console.error('❌ 데이터 저장 실패:', error);
      throw error;
    }
  };
  // 📖 암호화된 데이터 로드
  const loadEncryptedData = async (password = masterPassword) => {
    if (!accessToken || !encryptedFileId || !password) {
      console.log('📝 로드할 데이터가 없습니다.');
      return null;
    }
    
    try {
      const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${encryptedFileId}?alt=media`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      const decryptedData = CryptoUtils.decrypt(response.data, password);
      console.log('✅ 암호화된 데이터 로드 완료');
      
      return decryptedData;
      
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      throw error;
    }
  };

  // 📝 메모 생성
  const createMemo = async () => {
    if (!newMemoContent.trim()) {
      showToast('메모 내용을 입력해주세요.', 'error');
      return;
    }
    
    if (isPrivateMemo && !privateMemoPassword.trim()) {
      showToast('개별 비밀번호를 입력해주세요.', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const firstLine = newMemoContent.split('\n')[0].slice(0, 50).trim();
      const title = firstLine || '제목 없는 메모';
      
      let content = newMemoContent;
      
      // 개별 비밀번호가 설정된 경우 내용 암호화
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
        // 개별 비밀번호 관련 필드
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
  // ✏️ 메모 업데이트
  const updateMemo = async (memo) => {
    if (!memo) return;
    
    try {
      setIsLoading(true);
      
      let contentToSave = memo.content;
      
      // 개별 비밀번호가 설정된 메모인 경우 다시 암호화
      if (memo.hasPrivatePassword && memo._privatePassword) {
        contentToSave = CryptoUtils.encrypt(memo.content, memo._privatePassword);
      }
      
      const updatedMemo = {
        ...memo,
        content: contentToSave,
        modifiedAt: new Date().toISOString()
      };
      
      // _로 시작하는 임시 속성들 제거
      delete updatedMemo._originalEncryptedContent;
      delete updatedMemo._privatePassword;
      
      const updatedData = {
        ...appData,
        memos: appData.memos.map(m => m.id === memo.id ? updatedMemo : m)
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      
      // 선택된 메모도 업데이트 (복호화된 상태 유지)
      setSelectedMemo({
        ...updatedMemo,
        content: memo.content, // 복호화된 내용 유지
        _originalEncryptedContent: contentToSave,
        _privatePassword: memo._privatePassword
      });
      
      showToast('메모가 저장되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 메모 업데이트 실패:', error);
      showToast('메모 저장에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 🗑️ 메모 삭제 (휴지통으로 이동)
  const deleteMemo = async (memoId, memoTitle) => {
    const confirmed = window.confirm(`"${memoTitle}" 메모를 삭제하시겠습니까?`);
    if (!confirmed) return;
    
    try {
      setIsLoading(true);
      
      const memoToDelete = appData.memos.find(m => m.id === memoId);
      if (!memoToDelete) return;
      
      const deletedItem = {
        ...memoToDelete,
        deletedAt: new Date().toISOString(),
        type: 'memo'
      };
      
      const updatedData = {
        ...appData,
        memos: appData.memos.filter(m => m.id !== memoId),
        deletedItems: [deletedItem, ...appData.deletedItems]
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      
      if (selectedMemo && selectedMemo.id === memoId) {
        setSelectedMemo(null);
      }
      
      showToast('메모가 휴지통으로 이동되었습니다.', 'success');
      
    } catch (error) {
      console.error('❌ 메모 삭제 실패:', error);
      showToast('메모 삭제에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  // 📂 노트북 생성
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

  // ✏️ 노트북 이름 변경
  const updateNotebook = async (notebookId, newName) => {
    if (!newName.trim()) {
      showToast('노트북 이름을 입력해주세요.', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const updatedData = {
        ...appData,
        notebooks: appData.notebooks.map(nb => 
          nb.id === notebookId 
            ? { ...nb, name: newName, modifiedAt: new Date().toISOString() }
            : nb
        ).sort((a, b) => a.name.localeCompare(b.name))
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      setEditingNotebook(null);
      
      showToast('노트북 이름이 변경되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 노트북 이름 변경 실패:', error);
      showToast('노트북 이름 변경에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  // 🗑️ 노트북 삭제
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
    
    try {
      setIsLoading(true);
      
      // 노트북과 관련 메모들을 휴지통으로 이동
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
      
      const updatedData = {
        ...appData,
        notebooks: appData.notebooks.filter(nb => nb.id !== notebookId),
        memos: appData.memos.filter(m => m.notebookId !== notebookId),
        deletedItems: [deletedNotebook, ...deletedMemos, ...appData.deletedItems]
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      
      if (selectedNotebookId === notebookId) {
        setSelectedNotebookId('all');
      }
      
      showToast('노트북이 삭제되었습니다.', 'success');
      
    } catch (error) {
      console.error('❌ 노트북 삭제 실패:', error);
      showToast('노트북 삭제에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 📁 메모 이동
  const moveMemo = async (memoId, targetNotebookId) => {
    try {
      setIsLoading(true);
      
      const updatedData = {
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
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      
      setShowMoveModal(false);
      setMemoToMove(null);
      setTargetNotebookId('');
      
      showToast('메모가 이동되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 메모 이동 실패:', error);
      showToast('메모 이동에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  // 🔄 휴지통에서 복구
  const restoreFromTrash = async (item) => {
    try {
      setIsLoading(true);
      
      let updatedData = { ...appData };
      
      if (item.type === 'memo') {
        const restoredMemo = { ...item };
        delete restoredMemo.deletedAt;
        delete restoredMemo.type;
        
        updatedData.memos = [restoredMemo, ...updatedData.memos];
      } else if (item.type === 'notebook') {
        const restoredNotebook = { ...item };
        delete restoredNotebook.deletedAt;
        delete restoredNotebook.type;
        
        updatedData.notebooks = [...updatedData.notebooks, restoredNotebook]
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      
      updatedData.deletedItems = updatedData.deletedItems.filter(di => di.id !== item.id);
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      
      showToast(`${item.type === 'memo' ? '메모' : '노트북'}가 복구되었습니다!`, 'success');
      
    } catch (error) {
      console.error('❌ 복구 실패:', error);
      showToast('복구에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 휴지통에서 영구 삭제
  const permanentDelete = async (item) => {
    const confirmed = window.confirm(
      `"${item.title || item.name}"를 영구적으로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;
    
    try {
      setIsLoading(true);
      
      const updatedData = {
        ...appData,
        deletedItems: appData.deletedItems.filter(di => di.id !== item.id)
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      
      showToast('영구적으로 삭제되었습니다.', 'success');
      
    } catch (error) {
      console.error('❌ 영구 삭제 실패:', error);
      showToast('영구 삭제에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 💾 자동 백업 생성
  const createBackup = async () => {
    if (!accessToken || !appFolderId) {
      showToast('백업을 생성할 수 없습니다.', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const backupData = {
        ...appData,
        metadata: {
          ...appData.metadata,
          backupCreatedAt: new Date().toISOString()
        }
      };
      
      const encryptedBackup = CryptoUtils.encrypt(backupData, masterPassword);
      const backupFileName = `${BACKUP_PREFIX}${new Date().toISOString().split('T')[0]}.enc`;
      
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;
      
      const metadata = {
        name: backupFileName,
        parents: [appFolderId],
        mimeType: 'text/plain'
      };
      
      const requestBody = delimiter + 
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
        JSON.stringify(metadata) + delimiter + 
        'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + 
        encryptedBackup + close_delim;
      
      await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          }
        }
      );
      
      // 메타데이터 업데이트
      const updatedData = {
        ...appData,
        metadata: {
          ...appData.metadata,
          lastBackup: new Date().toISOString()
        }
      };
      
      await saveEncryptedData(updatedData);
      setAppData(updatedData);
      
      // 자동 백업인 경우 마지막 백업 시간 저장
      const now = new Date().toISOString();
      setLastAutoBackup(now);
      Storage.save('last-auto-backup', now);
      
      showToast('백업이 생성되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 백업 생성 실패:', error);
      showToast('백업 생성에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ⚙️ 자동 백업 설정
  const setupAutoBackup = () => {
    // 기존 타이머 정리
    if (autoBackupTimer) {
      clearInterval(autoBackupTimer);
    }
    
    if (autoBackupEnabled && isUnlocked) {
      const intervalMs = autoBackupInterval * 60 * 1000; // 분을 밀리초로 변환
      const timer = setInterval(() => {
        console.log('🔄 자동 백업 실행 중...');
        createBackup();
      }, intervalMs);
      
      setAutoBackupTimer(timer);
      console.log(`✅ 자동 백업 활성화: ${autoBackupInterval}분마다`);
    }
  };

  // ⚙️ 자동 백업 설정 변경
  const updateAutoBackupSettings = (enabled, interval) => {
    setAutoBackupEnabled(enabled);
    setAutoBackupInterval(interval);
    
    Storage.save('auto-backup-enabled', enabled);
    Storage.save('auto-backup-interval', interval);
    
    setupAutoBackup();
    
    if (enabled) {
      showToast(`자동 백업이 활성화되었습니다 (${interval}분마다)`, 'success');
    } else {
      showToast('자동 백업이 비활성화되었습니다', 'success');
    }
  };
  // 📤 데이터 내보내기 (JSON)
  const exportData = () => {
    try {
      const exportData = {
        ...appData,
        exportedAt: new Date().toISOString(),
        version: '2.0'
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `secure_memo_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      showToast('데이터가 내보내기되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 데이터 내보내기 실패:', error);
      showToast('데이터 내보내기에 실패했습니다.', 'error');
    }
  };

  // 🔐 개별 비밀번호 메모 선택 처리
  const handleMemoSelect = (memo) => {
    if (memo.hasPrivatePassword) {
      setPrivateMemoToUnlock(memo);
      setPrivateMemoUnlockPassword('');
      setPrivateMemoUnlockError('');
      setShowPrivateMemoModal(true);
    } else {
      setSelectedMemo(memo);
    }
  };

  // 🔓 개별 비밀번호 메모 잠금 해제
  const unlockPrivateMemo = () => {
    if (!privateMemoUnlockPassword.trim()) {
      setPrivateMemoUnlockError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      // 암호화된 내용 복호화 시도
      const decryptedContent = CryptoUtils.decrypt(privateMemoToUnlock.content, privateMemoUnlockPassword);
      
      // 복호화 성공 시 메모 선택
      setSelectedMemo({
        ...privateMemoToUnlock,
        content: decryptedContent,
        _originalEncryptedContent: privateMemoToUnlock.content,
        _privatePassword: privateMemoUnlockPassword
      });
      
      setShowPrivateMemoModal(false);
      setPrivateMemoToUnlock(null);
      setPrivateMemoUnlockPassword('');
      setPrivateMemoUnlockError('');
      
      showToast('개별 비밀번호 메모가 잠금 해제되었습니다.', 'success');
      
    } catch (error) {
      setPrivateMemoUnlockError('잘못된 비밀번호입니다.');
    }
  };

  // 🎛️ 테마 토글
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    Storage.save('theme', newTheme);
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
    
    // 🔍 검색 필터링
    if (searchQuery.trim()) {
      filteredMemos = filteredMemos.filter(memo => {
        // 개별 비밀번호가 설정된 메모는 제목만 검색
        if (memo.hasPrivatePassword) {
          return memo.title.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
          // 일반 메모는 제목과 내용 모두 검색
          return memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 memo.content.toLowerCase().includes(searchQuery.toLowerCase());
        }
      });
    }
    
    // 📊 정렬
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

  // 🚀 앱 시작 시 토큰 복원
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
      // 만료된 토큰 제거
      Storage.remove('access-token');
      Storage.remove('token-expiry');
    }
  }, []);

  // 🎨 테마에 따른 body 배경색 설정
  useEffect(() => {
    const colors = {
      light: '#f8f9fa',
      dark: '#121212'
    };
    
    document.body.style.backgroundColor = colors[theme];
    document.documentElement.style.backgroundColor = colors[theme];
    
    // 컴포넌트 언마운트 시 기본값으로 복원
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, [theme]);

  // 🔄 자동 백업 설정
  useEffect(() => {
    setupAutoBackup();
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (autoBackupTimer) {
        clearInterval(autoBackupTimer);
      }
    };
  }, [autoBackupEnabled, autoBackupInterval, isUnlocked]);
  // 🎨 메인 렌더링
  return (
    <div style={styles.container}>
      {/* 로딩 스피너 */}
      {isLoading && <Spinner styles={styles} />}
      
      {/* 토스트 메시지 */}
      <Toast show={toast.show} message={toast.message} type={toast.type} styles={styles} />
      
      {/* 🔐 로그인하지 않은 경우 */}
      {!accessToken && (
        <div style={styles.securityContainer}>
          <div style={styles.securityCard}>
            <div style={styles.securityHeader}>
              <div style={styles.securityIcon}>🔐</div>
              <h1>보안 메모장</h1>
              <p>모든 메모가 강력한 AES 암호화로 보호됩니다.</p>
            </div>
            
            <div style={{...styles.statusCard, ...styles.statusSecure}}>
              <Icons.Shield />
              <span>완전 암호화 시스템</span>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <h4>🛡️ 보안 기능</h4>
              <ul style={{ textAlign: 'left', lineHeight: 1.6 }}>
                <li>전체 데이터 AES 암호화</li>
                <li>자동 백업 시스템</li>
                <li>데이터 내보내기/가져오기</li>
                <li>휴지통 복구 기능</li>
              </ul>
            </div>
            
            <button 
              style={{...styles.button, ...styles.primaryButton}}
              onClick={login}
            >
              <Icons.Key />
              Google로 로그인
            </button>
          </div>
        </div>
      )}
      
      {/* 🔐 비밀번호 설정/입력 단계 */}
      {accessToken && !isPasswordSet && (
        <PasswordSetup onPasswordSet={handlePasswordSetup} styles={styles} />
      )}
      
      {accessToken && isPasswordSet && !isUnlocked && (
        <PasswordUnlock 
          onPasswordEnter={handlePasswordUnlock} 
          styles={styles} 
          error={passwordError}
          attempts={loginAttempts}
        />
      )}      
      {/* 🎯 메인 앱 화면 */}
      {accessToken && isPasswordSet && isUnlocked && (
        <>
          {/* 왼쪽 패널 */}
          <div style={styles.leftPanel}>
            {/* 헤더 */}
            <div style={styles.header}>
              <div style={styles.profileSection}>
                {user?.picture && <img src={user.picture} alt="Profile" style={styles.profileImage} />}
                <div>
                  <div style={{ fontWeight: '600' }}>{user?.name}</div>
                  <div style={{ fontSize: '10px', color: styles.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: styles.success }}>🔐 암호화됨</span>
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
                <button 
                  style={styles.iconButton} 
                  onClick={handleLogout}
                  title="로그아웃"
                >
                  🚪
                </button>
              </div>
            </div>            
            {/* 트리 구조 메모 탐색기 섹션 */}
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
          {/* 오른쪽 패널 - 에디터 */}
          <div style={styles.rightPanel}>
            {selectedMemo ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* 에디터 헤더 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '16px',
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
                
                {/* 에디터 */}
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
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                <h2>보안 메모장</h2>
                <p style={{ color: styles.textSecondary, maxWidth: '400px' }}>
                  왼쪽에서 메모를 선택하거나 새로운 메모를 작성해보세요.<br/>
                  모든 데이터는 AES 암호화로 안전하게 보호됩니다.
                </p>
                
                <div style={{ marginTop: '32px', textAlign: 'left' }}>
                  <h4>✨ 주요 기능</h4>
                  <ul style={{ lineHeight: 1.6 }}>
                    <li>🔐 전체 데이터 AES 암호화</li>
                    <li>📁 노트북으로 메모 정리</li>
                    <li>🗑️ 휴지통 및 복구 기능</li>
                    <li>💾 자동 백업 시스템</li>
                    <li>📤 데이터 내보내기/가져오기</li>
                    <li>🌙 다크/라이트 테마</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}      
      {/* 메모 이동 모달 */}
      {showMoveModal && memoToMove && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>메모 이동</h3>
            <p>"{memoToMove.title}" 메모를 어디로 이동하시겠습니까?</p>
            
            <select
              value={targetNotebookId}
              onChange={(e) => setTargetNotebookId(e.target.value)}
              style={{...styles.input, marginBottom: '16px'}}
            >
              <option value="">이동할 위치를 선택하세요</option>
              <option value="main">📋 메인 (모든 메모)</option>
              {appData.notebooks.map(notebook => (
                <option key={notebook.id} value={notebook.id}>
                  📁 {notebook.name}
                </option>
              ))}
            </select>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setMemoToMove(null);
                  setTargetNotebookId('');
                }}
                style={{...styles.button, backgroundColor: '#6c757d', color: 'white'}}
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (targetNotebookId) {
                    moveMemo(memoToMove.id, targetNotebookId);
                  } else {
                    showToast('이동할 위치를 선택해주세요.', 'error');
                  }
                }}
                style={{...styles.button, ...styles.successButton}}
                disabled={!targetNotebookId}
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
            <p>삭제된 항목들을 복구하거나 영구 삭제할 수 있습니다.</p>
            
            {appData.deletedItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: styles.textSecondary }}>
                휴지통이 비어있습니다.
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {appData.deletedItems.map(item => (
                  <div key={item.id} style={{
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
                        삭제일: {new Date(item.deletedAt).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => restoreFromTrash(item)}
                        style={{...styles.button, ...styles.successButton, padding: '6px 12px', fontSize: '12px'}}
                      >
                        복구
                      </button>
                      <button
                        onClick={() => permanentDelete(item)}
                        style={{...styles.button, ...styles.dangerButton, padding: '6px 12px', fontSize: '12px'}}
                      >
                        영구삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setShowTrashModal(false)}
                style={{...styles.button, backgroundColor: '#6c757d', color: 'white'}}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 설정 모달 */}
      {showSettingsModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>⚙️ 설정</h3>
            
            {/* 통계 정보 */}
            <div style={{ marginBottom: '24px' }}>
              <h4>📊 현황</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px',
                padding: '16px',
                backgroundColor: styles.bg,
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <div>📝 총 메모: {appData.memos.length}개</div>
                <div>📁 노트북: {appData.notebooks.length}개</div>
                <div>🗑️ 휴지통: {appData.deletedItems.length}개</div>
                <div>💾 마지막 백업: {
                  appData.metadata.lastBackup 
                    ? new Date(appData.metadata.lastBackup).toLocaleString('ko-KR')
                    : '없음'
                }</div>
              </div>
            </div>
            
            {/* 자동 백업 설정 */}
            <div style={{ marginBottom: '24px' }}>
              <h4>🔄 자동 백업</h4>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoBackupEnabled}
                    onChange={(e) => updateAutoBackupSettings(e.target.checked, autoBackupInterval)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <span>자동 백업 활성화</span>
                </label>
              </div>
              
              {autoBackupEnabled && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                    백업 주기:
                  </label>
                  <select
                    value={autoBackupInterval}
                    onChange={(e) => updateAutoBackupSettings(autoBackupEnabled, parseInt(e.target.value))}
                    style={{...styles.input, width: '100%'}}
                  >
                    <option value={15}>15분마다</option>
                    <option value={30}>30분마다</option>
                    <option value={60}>1시간마다</option>
                    <option value={120}>2시간마다</option>
                    <option value={360}>6시간마다</option>
                  </select>
                </div>
              )}
              
              {lastAutoBackup && (
                <div style={{ fontSize: '12px', color: styles.textSecondary }}>
                  마지막 자동 백업: {new Date(lastAutoBackup).toLocaleString('ko-KR')}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{...styles.button, backgroundColor: '#6c757d', color: 'white'}}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 개별 비밀번호 메모 잠금 해제 모달 */}
      {showPrivateMemoModal && privateMemoToUnlock && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>🔒 메모 잠금 해제</h3>
            <p>"{privateMemoToUnlock.title}" 메모에 설정된 개별 비밀번호를 입력하세요.</p>
            
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="password"
                placeholder="개별 비밀번호 입력..."
                value={privateMemoUnlockPassword}
                onChange={(e) => {
                  setPrivateMemoUnlockPassword(e.target.value);
                  setPrivateMemoUnlockError('');
                }}
                style={styles.passwordInput}
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && unlockPrivateMemo()}
              />
            </div>
            
            {privateMemoUnlockError && (
              <div style={styles.errorMessage}>
                {privateMemoUnlockError}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPrivateMemoModal(false);
                  setPrivateMemoToUnlock(null);
                  setPrivateMemoUnlockPassword('');
                  setPrivateMemoUnlockError('');
                }}
                style={{...styles.button, backgroundColor: '#6c757d', color: 'white'}}
              >
                취소
              </button>
              <button
                onClick={unlockPrivateMemo}
                style={{...styles.button, ...styles.primaryButton}}
                disabled={!privateMemoUnlockPassword.trim()}
              >
                <Icons.Unlock />
                잠금 해제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎯 최종 앱 컴포넌트
function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <SecureMemoApp />
    </GoogleOAuthProvider>
  );
}

export default App;
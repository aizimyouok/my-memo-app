// 🔐 완전 암호화 메모장 앱 - 향상된 탭 기능 적용
// 모든 데이터가 암호화되어 Google Drive에 저장됩니다.

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
};// 💾 로컬 스토리지 관리
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

// 🎨 테마 스타일 (향상된 탭 스타일 포함)
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
    },    // 메인 앱 레이아웃
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
    },    // 리스트
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
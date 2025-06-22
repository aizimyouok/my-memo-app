// src/App.js

import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// 여기에 GCP에서 발급받은 클라이언트 ID를 붙여넣으세요.
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// 환경변수 검증 및 디버그 정보
console.log('Environment check:');
console.log('CLIENT_ID:', CLIENT_ID);
console.log('All env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));

if (!CLIENT_ID) {
  console.error('Google Client ID가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';
const SECRET_PREFIX = 'secret_';

// --- 아이콘 컴포넌트들 ---
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const BookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;

// --- 유틸리티 함수들 ---
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(`memo-app-${key}`, JSON.stringify(data));
    console.log(`💾 Saved to localStorage: ${key}`, data);
  } catch (error) {
    console.error('❌ Failed to save to localStorage:', error);
  }
};

const loadFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(`memo-app-${key}`);
    const parsed = data ? JSON.parse(data) : null;
    console.log(`📂 Loaded from localStorage: ${key}`, parsed);
    return parsed;
  } catch (error) {
    console.error('❌ Failed to load from localStorage:', error);
    return null;
  }
};

// --- UI 컴포넌트들 ---
const Spinner = ({ themeStyles }) => {
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(styleSheet);
    return () => { document.head.removeChild(styleSheet); };
  }, []);
  return ( <div style={themeStyles.spinnerOverlay}><div style={themeStyles.spinner}></div></div> );
};

const Toast = ({ show, message, type, themeStyles }) => {
  if (!show) return null;
  const toastStyle = type === 'success' ? themeStyles.toastSuccess : themeStyles.toastError;
  return ( <div style={{ ...themeStyles.toast, ...toastStyle }}>{message}</div> );
};

const ConfirmModal = ({ show, message, onConfirm, onCancel, themeStyles }) => {
  if (!show) return null;
  return (
    <div style={themeStyles.modalOverlay}>
      <div style={themeStyles.modalContent}>
        <p style={{whiteSpace: 'pre-wrap'}}>{message}</p>
        <div style={themeStyles.modalActions}>
          <button style={{...themeStyles.button, ...themeStyles.modalButton}} onClick={onCancel}>취소</button>
          <button style={{...themeStyles.button, ...themeStyles.modalButton, ...themeStyles.dangerButton}} onClick={onConfirm}>확인</button>
        </div>
      </div>
    </div>
  );
};

// --- 커스텀 훅 ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

// --- 동적 스타일링 ---
const getDynamicStyles = (theme = 'light') => {
    const colors = {
        light: { bg: '#f8f9fa', panelBg: '#ffffff', text: '#212529', textSecondary: '#6c757d', border: '#dee2e6', accent: '#007bff', accentText: '#ffffff', activeBg: '#e6f7ff', buttonBg: '#f1f3f5', buttonHoverBg: '#e9ecef', danger: '#dc3545', },
        dark: { bg: '#121212', panelBg: '#1e1e1e', text: '#e9ecef', textSecondary: '#adb5bd', border: '#495057', accent: '#0d6efd', accentText: '#ffffff', activeBg: '#032a58', buttonBg: '#343a40', buttonHoverBg: '#495057', danger: '#e03131', }
    };
    const c = colors[theme];
    return {
        container: { display: 'flex', height: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", backgroundColor: c.bg, color: c.text },
        loginContainer: { margin: 'auto', textAlign: 'center' },
        loginButton: { padding: '12px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: c.accent, color: c.accentText, border: 'none', borderRadius: '5px' },
        leftPanel: { width: '320px', borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', backgroundColor: c.panelBg, flexShrink: 0 },
        rightPanel: { flexGrow: 1, padding: '20px', display: 'flex', flexDirection: 'column' },
        header: { padding: '15px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
        profileSection: { display: 'flex', alignItems: 'center', gap: '10px' },
        profileImage: { borderRadius: '50%', width: '32px', height: '32px' },
        iconButton: { background: 'none', border: 'none', color: c.textSecondary, cursor: 'pointer', padding: '5px' },
        section: { padding: '15px' },
        newNotebookForm: { display: 'flex', gap: '5px', marginTop: '10px' },
        input: { width: '100%', padding: '8px', boxSizing: 'border-box', border: `1px solid ${c.border}`, borderRadius: '5px', backgroundColor: c.bg, color: c.text, outline: 'none' },
        button: { padding: '10px', backgroundColor: c.accent, color: c.accentText, border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        notebookList: { listStyle: 'none', padding: 0, margin: '10px 0', overflowY: 'auto' },
        listItem: { padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '5px' },
        activeListItem: { padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '5px', backgroundColor: c.activeBg, fontWeight: 'bold' },
        memoList: { listStyle: 'none', padding: 0, margin: '10px 0 0 0', overflowY: 'auto' },
        memoListItem: { padding: '12px', borderTop: `1px solid ${c.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        activeMemoListItem: { backgroundColor: c.activeBg },
        memoName: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
        deleteButton: { background: 'none', border: 'none', color: c.textSecondary, cursor: 'pointer', fontSize: '16px', padding: '5px', opacity: 0.7, transition: 'opacity 0.2s' },
        placeholder: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: c.textSecondary, textAlign: 'center' },
        editorContainer: { display: 'flex', flexGrow: 1, flexDirection: 'column', backgroundColor: c.panelBg, border: `1px solid ${c.border}`, borderRadius: '8px' },
        editorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: `1px solid ${c.border}` },
        viewModeToggle: { display: 'flex', border: `1px solid ${c.border}`, borderRadius: '5px', overflow: 'hidden' },
        toggleButton: { background: c.panelBg, border: 'none', padding: '8px 15px', cursor: 'pointer', color: c.text },
        toggleButtonActive: { background: c.accent, border: 'none', padding: '8px 15px', cursor: 'pointer', color: c.accentText },
        editorPane: { flexGrow: 1, display: 'flex', flexDirection: 'column' },
        memoContentArea: { flexGrow: 1, border: 'none', padding: '15px', fontSize: '16px', fontFamily: 'monospace', resize: 'none', outline: 'none', backgroundColor: c.panelBg, color: c.text },
        previewContent: { flexGrow: 1, padding: '15px', overflowY: 'auto', lineHeight: 1.7, backgroundColor: c.panelBg },
        spinnerOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
        spinner: { border: '4px solid rgba(255, 255, 255, 0.3)', borderTop: '4px solid white', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
        toast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 20px', borderRadius: '5px', color: 'white', zIndex: 1000 },
        toastSuccess: { backgroundColor: '#28a745' },
        toastError: { backgroundColor: '#dc3545' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modalContent: { backgroundColor: c.panelBg, padding: '20px 30px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', maxWidth: '400px' },
        modalActions: { marginTop: '20px', display: 'flex', gap: '10px' },
        modalButton: { flex: 1, backgroundColor: c.buttonBg, color: c.text, border: `1px solid ${c.border}` },
        dangerButton: { backgroundColor: c.danger, color: c.accentText, border: 'none' },
    };
};

function MemoApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem('memo-theme') || 'light');
  const styles = getDynamicStyles(theme);

  // 🔧 State 초기화 - localStorage에서 바로 복원
  const [notebooks, setNotebooks] = useState(() => loadFromLocalStorage('notebooks') || []);
  const [selectedNotebookId, setSelectedNotebookId] = useState(() => {
    const saved = loadFromLocalStorage('selectedNotebookId');
    return saved || 'all';
  });
  const [newNotebookName, setNewNotebookName] = useState('');
  
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => {
    const token = localStorage.getItem('memo-app-access-token');
    const expiry = localStorage.getItem('memo-app-token-expiry');
    
    if (token && expiry) {
      const expiryTime = parseInt(expiry);
      const now = Date.now();
      
      // 토큰이 아직 유효한지 확인 (10분 여유)
      if (now < expiryTime - 10 * 60 * 1000) {
        console.log('🔧 앱 시작 시 토큰 복원');
        return token;
      } else {
        console.log('⏰ 저장된 토큰 만료, 삭제');
        localStorage.removeItem('memo-app-access-token');
        localStorage.removeItem('memo-app-token-expiry');
      }
    }
    return null;
  });
  
  const [memos, setMemos] = useState(() => {
    const savedNotebookId = loadFromLocalStorage('selectedNotebookId') || 'all';
    return loadFromLocalStorage(`memos-${savedNotebookId}`) || [];
  });
  
  const [newMemoContent, setNewMemoContent] = useState('');
  const [isNewMemoSecret, setIsNewMemoSecret] = useState(false);
  const [newMemoPassword, setNewMemoPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [viewMode, setViewMode] = useState('edit');

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modal, setModal] = useState({ show: false, message: '', onConfirm: () => {} });

  console.log('🚀 앱 상태:', {
    accessToken: accessToken ? accessToken.substring(0, 20) + '...' : null,
    notebooks: notebooks.length,
    memos: memos.length,
    selectedNotebookId
  });

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => { setToast({ show: false, message: '', type: 'success' }); }, duration);
  }, []);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('🎉 Login successful:', tokenResponse);
      const token = tokenResponse.access_token;
      
      // 🔧 토큰을 localStorage에 저장
      localStorage.setItem('memo-app-access-token', token);
      
      // 토큰 만료 시간도 저장 (1시간 후)
      const expiryTime = Date.now() + (tokenResponse.expires_in || 3600) * 1000;
      localStorage.setItem('memo-app-token-expiry', expiryTime.toString());
      
      // 토큰 설정 (React state)
      setAccessToken(token);
      
      console.log('⏰ 토큰 설정 완료, 3초 후 데이터 로드 시작...');
      showToast('로그인 성공! 잠시 후 데이터를 불러옵니다...', 'success');
      
      // 🔧 더 긴 지연과 재시도 로직
      const attemptDataLoad = async (attempt = 1, maxAttempts = 3) => {
        try {
          setIsLoading(true);
          console.log(`🚀 데이터 로드 시도 ${attempt}/${maxAttempts}`);
          
          // 사용자 정보 가져오기
          const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('✅ 사용자 정보 로드 성공:', userResponse.data.name);
          setUser(userResponse.data);
          
          // Google Drive에서 데이터 로드
          await loadDataFromDrive(token);
          
          console.log('🎉 로그인 후 데이터 로드 성공!');
          
        } catch (error) {
          console.error(`❌ 데이터 로드 시도 ${attempt} 실패:`, error);
          
          if (attempt < maxAttempts) {
            const delay = attempt * 2000; // 2초, 4초 순으로 증가
            console.log(`⏰ ${delay/1000}초 후 재시도...`);
            showToast(`데이터 로드 실패, ${delay/1000}초 후 재시도... (${attempt}/${maxAttempts})`, 'error');
            
            setTimeout(() => {
              attemptDataLoad(attempt + 1, maxAttempts);
            }, delay);
          } else {
            console.error('❌ 모든 재시도 실패');
            showToast('데이터 로드에 실패했습니다. 🔄 새로고침 버튼을 눌러주세요.', 'error');
            setIsLoading(false);
          }
        }
      };
      
      // 3초 후 첫 번째 시도
      setTimeout(() => {
        attemptDataLoad();
      }, 3000);
    },
    onError: (errorResponse) => {
      console.error('Login Failed:', errorResponse);
      showToast('로그인에 실패했습니다. Google Cloud Console 설정을 확인해주세요.', 'error');
    },
    scope: SCOPES,
  });
  
  const handleLogout = () => {
    googleLogout(); 
    setUser(null); 
    setAccessToken(null); 
    setNotebooks([]); 
    setMemos([]);
    setSelectedMemo(null); 
    setSelectedNotebookId('all');
    
    // 🔧 localStorage에서 토큰 정보 삭제
    localStorage.removeItem('memo-app-access-token');
    localStorage.removeItem('memo-app-token-expiry');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('memo-theme', newTheme);
  };

  // 🔧 Google Drive에서 데이터 로드하는 함수
  const loadDataFromDrive = async (token) => {
    try {
      console.log('📁 Google Drive에서 데이터 로드 시작...');
      console.log('🔑 사용 중인 토큰:', token.substring(0, 20) + '...');
      
      // 먼저 간단한 테스트 호출로 토큰 유효성 확인
      console.log('🔍 토큰 유효성 테스트 중...');
      const testResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ 토큰 유효성 확인 완료:', testResponse.data.email);
      
      // Drive API 기본 권한 테스트
      console.log('🔍 Drive API 권한 테스트 중...');
      const aboutResponse = await axios.get('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Drive API 접근 가능:', aboutResponse.data.user.emailAddress);
      
      // 노트북(폴더) 가져오기
      console.log('🔍 노트북 검색 중...');
      const notebooksResponse = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
          fields: 'files(id, name, mimeType, parents)',
          pageSize: 100
        }
      });
      
      const driveNotebooks = notebooksResponse.data.files || [];
      console.log(`✅ 노트북 ${driveNotebooks.length}개 발견:`, driveNotebooks);
      
      if (driveNotebooks.length > 0) {
        console.log('📁 노트북 상태 업데이트 중...');
        setNotebooks(driveNotebooks);
        saveToLocalStorage('notebooks', driveNotebooks);
        setSelectedNotebookId(driveNotebooks[0].id);
        console.log('✅ 노트북 상태 업데이트 완료');
      } else {
        console.log('📁 노트북이 없음, "모든 메모"로 설정');
        setSelectedNotebookId('all');
      }
      
      // 메모(텍스트 파일) 가져오기
      console.log('🔍 메모 검색 중...');
      const memosResponse = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          q: "(mimeType='text/plain' or name contains '.txt') and trashed=false",
          fields: 'files(id, name, mimeType, parents, createdTime)',
          orderBy: 'createdTime desc',
          pageSize: 200
        }
      });
      
      const driveMemos = memosResponse.data.files || [];
      console.log(`✅ 메모 ${driveMemos.length}개 발견:`, driveMemos);
      
      if (driveMemos.length > 0) {
        console.log('📝 메모 상태 업데이트 중...');
        setMemos(driveMemos);
        saveToLocalStorage('memos-all', driveMemos);
        saveToLocalStorage(`memos-${selectedNotebookId || 'all'}`, driveMemos);
        console.log('✅ 메모 상태 업데이트 완료');
      } else {
        console.log('📝 메모가 없음');
        setMemos([]);
      }
      
      console.log('🎉 Drive 데이터 로드 완료!');
      showToast(`노트북 ${driveNotebooks.length}개, 메모 ${driveMemos.length}개를 불러왔습니다!`, 'success');
      
    } catch (error) {
      console.error('❌ Drive 데이터 로드 실패:', error);
      console.error('❌ 오류 상세:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // 실패한 경우 캐시된 데이터라도 보여주기
      const cachedNotebooks = loadFromLocalStorage('notebooks');
      const cachedMemos = loadFromLocalStorage('memos-all');
      
      if (cachedNotebooks) {
        setNotebooks(cachedNotebooks);
        console.log(`📂 캐시된 노트북 ${cachedNotebooks.length}개 복원`);
      }
      
      if (cachedMemos) {
        setMemos(cachedMemos);
        console.log(`📝 캐시된 메모 ${cachedMemos.length}개 복원`);
      }
      
      if (error.response?.status === 403) {
        showToast('Google Drive 권한이 필요합니다. OAuth 설정을 확인해주세요.', 'error');
      } else if (error.response?.status === 401) {
        showToast('토큰이 만료되었습니다. 다시 로그인해주세요.', 'error');
      } else {
        showToast(`Drive 연결 실패: ${error.message}`, 'error');
      }
      
      throw error; // 상위에서 에러를 처리할 수 있도록
    } finally {
      setIsLoading(false); // 🔧 성공/실패 관계없이 로딩 상태 해제
    }
  };

  // 🔧 토큰이 있으면 사용자 정보 가져오고 데이터 로드
  useEffect(() => {
    if (accessToken && !user) {
      console.log('🔧 토큰 복원 후 데이터 로드 중...');
      
      const initializeData = async () => {
        try {
          setIsLoading(true);
          
          // 사용자 정보 가져오기
          const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          console.log('✅ 사용자 정보 가져오기 성공');
          setUser(response.data);
          
          // Drive 데이터 로드
          await loadDataFromDrive(accessToken);
          
        } catch (error) {
          console.error('❌ 토큰 복원 후 데이터 로드 실패:', error);
          if (error.response?.status === 401) {
            // 토큰이 만료된 경우
            console.log('🔐 토큰 만료, 삭제합니다');
            localStorage.removeItem('memo-app-access-token');
            localStorage.removeItem('memo-app-token-expiry');
            setAccessToken(null);
          } else {
            // 다른 오류의 경우 캐시된 데이터 표시
            const cachedNotebooks = loadFromLocalStorage('notebooks');
            const cachedMemos = loadFromLocalStorage('memos-all');
            
            if (cachedNotebooks) setNotebooks(cachedNotebooks);
            if (cachedMemos) setMemos(cachedMemos);
            
            showToast('온라인 데이터 로드 실패. 캐시된 데이터를 표시합니다.', 'error');
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      initializeData();
    }
  }, [accessToken, user]);

  // 🔧 selectedNotebookId 변경사항 저장 및 메모 필터링
  useEffect(() => {
    if (selectedNotebookId) {
      saveToLocalStorage('selectedNotebookId', selectedNotebookId);
      
      // 선택된 노트북에 따라 메모 필터링
      const allMemos = loadFromLocalStorage('memos-all') || [];
      
      if (selectedNotebookId === 'all') {
        // 모든 메모 표시
        setMemos(allMemos);
        console.log(`📁 "모든 메모" 선택됨, 메모 ${allMemos.length}개 표시`);
      } else {
        // 특정 노트북의 메모만 표시
        const notebookMemos = allMemos.filter(memo => 
          memo.parents && memo.parents.includes(selectedNotebookId)
        );
        setMemos(notebookMemos);
        console.log(`📁 노트북 "${selectedNotebookId}" 선택됨, 메모 ${notebookMemos.length}개 표시`);
      }
    }
  }, [selectedNotebookId]);

  const createMemo = async () => {
    if (!accessToken || !newMemoContent.trim() || (isNewMemoSecret && !newMemoPassword.trim())) {
      if (isNewMemoSecret && !newMemoPassword.trim()) showToast('비밀번호를 입력해주세요.', 'error');
      return;
    }
    
    // "모든 메모"가 선택된 경우 appDataFolder에 직접 저장
    let targetParent = selectedNotebookId;
    if (selectedNotebookId === 'all' || !selectedNotebookId) {
        targetParent = 'appDataFolder';
    }
    
    setIsLoading(true);
    let contentToSave = newMemoContent;
    let fileNamePrefix = '';
    if (isNewMemoSecret) {
      contentToSave = CryptoJS.AES.encrypt(newMemoContent, newMemoPassword).toString();
      fileNamePrefix = SECRET_PREFIX;
    }
    const firstLine = newMemoContent.split('\n')[0].slice(0, 30).trim();
    const safeFileName = firstLine.replace(/[\\/:*?"<>|]/g, "") + ".txt";
    const fileName = fileNamePrefix + (firstLine ? safeFileName : `memo-${Date.now()}.txt`);
    const metadata = { name: fileName, mimeType: 'text/plain', parents: [targetParent] };
    
    console.log('📝 Creating memo:', {
      fileName,
      targetParent,
      selectedNotebookId,
      metadata,
      contentLength: contentToSave.length
    });
    
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;
    let multipartRequestBody = delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + contentToSave + close_delim;
    try {
      const res = await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', multipartRequestBody, { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` } });
      
      console.log('✅ Memo created successfully:', res.data);
      
      // 저장된 메모를 즉시 목록에 추가
      const newMemo = {
        id: res.data.id,
        name: fileName,
        mimeType: 'text/plain',
        parents: [targetParent],
        createdTime: new Date().toISOString()
      };
      
      // 전체 메모 목록 업데이트
      const currentAllMemos = loadFromLocalStorage('memos-all') || [];
      const updatedAllMemos = [newMemo, ...currentAllMemos];
      saveToLocalStorage('memos-all', updatedAllMemos);
      
      // 현재 선택된 노트북에 맞게 표시할 메모 결정
      if (selectedNotebookId === 'all' || selectedNotebookId === targetParent) {
        setMemos(prevMemos => {
          const updatedMemos = [newMemo, ...prevMemos];
          return updatedMemos;
        });
      }
      
      console.log('✅ 새 메모가 목록에 추가됨:', fileName);
      
      showToast('메모가 성공적으로 저장되었습니다.', 'success');
      setNewMemoContent('');
      setIsNewMemoSecret(false);
      setNewMemoPassword('');
      
    } catch (error) { 
      console.error('❌ Error creating memo:', error); 
      showToast('메모 저장에 실패했습니다.', 'error'); 
    } 
    finally { setIsLoading(false); }
  };

  const getMemoContent = async (fileId, fileName) => {
    setViewMode('edit');
    if (!accessToken) return;
    if (fileName.startsWith(SECRET_PREFIX)) {
      const password = window.prompt("비밀번호를 입력하세요:");
      if (!password) return;
      setIsLoading(true);
      setSelectedMemo(null);
      try {
        const res = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const decryptedBytes = CryptoJS.AES.decrypt(res.data, password);
        const decryptedContent = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedContent) {
          showToast('비밀번호가 틀렸습니다.', 'error');
          return;
        }
        setSelectedMemo({ id: fileId, name: fileName, content: decryptedContent, isSecret: true, password });
      } catch (error) { console.error('Error decrypting memo:', error); showToast('비밀번호가 틀렸거나 파일이 손상되었습니다.', 'error'); } 
      finally { setIsLoading(false); }
    } else {
      setIsLoading(true);
      setSelectedMemo(null);
      try {
        const res = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        setSelectedMemo({ id: fileId, name: fileName, content: res.data });
      } catch (error) { console.error('Error getting memo content:', error); showToast('메모를 불러오는데 실패했습니다.', 'error'); } 
      finally { setIsLoading(false); }
    }
  };

  const updateMemo = async () => {
    if (!accessToken || !selectedMemo) return;
    setIsLoading(true);
    let contentToSave = selectedMemo.content;
    if (selectedMemo.isSecret) {
      contentToSave = CryptoJS.AES.encrypt(selectedMemo.content, selectedMemo.password).toString();
    }
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;
    let multipartRequestBody = delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + '{}' + delimiter + 'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + contentToSave + close_delim;
    try {
      await axios.patch(`https://www.googleapis.com/upload/drive/v3/files/${selectedMemo.id}?uploadType=multipart`, multipartRequestBody, { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` } });
      showToast('메모가 성공적으로 업데이트되었습니다.', 'success');
    } catch (error) { console.error('Error updating memo:', error); showToast('메모 업데이트에 실패했습니다.', 'error'); } 
    finally { setIsLoading(false); }
  };

  const deleteMemo = (memoId) => {
    if (!accessToken) return;
    const confirmDelete = async () => {
      setIsLoading(true);
      try {
        await axios.delete(`https://www.googleapis.com/drive/v3/files/${memoId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        
        // 로컬 상태 업데이트
        setMemos(prevMemos => {
          const updatedMemos = prevMemos.filter(memo => memo.id !== memoId);
          saveToLocalStorage(`memos-${selectedNotebookId}`, updatedMemos);
          return updatedMemos;
        });
        
        if (selectedMemo?.id === memoId) {
          setSelectedMemo(null);
        }
        showToast('메모가 삭제되었습니다.', 'success');
      } catch (error) { console.error('Error deleting memo:', error); showToast('메모 삭제에 실패했습니다.', 'error'); } 
      finally { setIsLoading(false); setModal({ show: false, message: '', onConfirm: () => {} }); }
    };
    setModal({ show: true, message: '이 메모를 삭제하시겠습니까?', onConfirm: confirmDelete });
  };

  const filteredMemos = memos.filter(memo => memo.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
  
  return (
    <div style={styles.container}>
      {isLoading && <Spinner themeStyles={styles} />}
      <Toast show={toast.show} message={toast.message} type={toast.type} themeStyles={styles} />
      <ConfirmModal show={modal.show} message={modal.message} onConfirm={modal.onConfirm} onCancel={() => setModal({ show: false, message: '', onConfirm: () => {} })} themeStyles={styles} />
      
      {!accessToken ? (
        <div style={styles.loginContainer}>
          <h1>메모장 앱</h1>
          <p>Google Drive와 연동하여 메모를 안전하게 저장하세요.</p>
          <button style={styles.loginButton} onClick={login}>Google로 로그인</button>
        </div>
      ) : (
        <>
          <div style={styles.leftPanel}>
            <div style={styles.header}>
              <div style={styles.profileSection}>
                {user?.picture && <img src={user.picture} alt="Profile" style={styles.profileImage} />}
                <span>{user?.name || 'User'}</span>
              </div>
              <div style={{display: 'flex', gap: '5px'}}>
                <button style={styles.iconButton} onClick={toggleTheme} title="테마 변경">
                  {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
                <button style={styles.iconButton} onClick={handleLogout} title="로그아웃">
                  <LogoutIcon />
                </button>
              </div>
            </div>
            
            <div style={styles.section}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <h3>📁 노트북</h3>
                {accessToken && (
                  <button 
                    style={{
                      ...styles.iconButton, 
                      fontSize: '12px', 
                      border: `1px solid ${styles.border}`,
                      borderRadius: '3px',
                      padding: '4px 8px'
                    }} 
                    onClick={() => loadDataFromDrive(accessToken)}
                    title="Google Drive에서 데이터 새로고침"
                  >
                    🔄
                  </button>
                )}
              </div>
              <ul style={styles.notebookList}>
                <li style={selectedNotebookId === 'all' ? styles.activeListItem : styles.listItem} onClick={() => setSelectedNotebookId('all')}>
                  📋 모든 메모
                </li>
                {notebooks.map(notebook => (
                  <li key={notebook.id} style={selectedNotebookId === notebook.id ? styles.activeListItem : styles.listItem} onClick={() => setSelectedNotebookId(notebook.id)}>
                    <BookIcon /> {notebook.name}
                  </li>
                ))}
              </ul>
            </div>
            
            <div style={{...styles.section, flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
              <h3>📝 메모</h3>
              <input type="text" placeholder="메모 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{...styles.input, marginBottom: '10px'}} />
              
              <div style={{marginBottom: '10px'}}>
                <textarea placeholder="새 메모를 작성하세요..." value={newMemoContent} onChange={(e) => setNewMemoContent(e.target.value)} style={{...styles.input, height: '80px', resize: 'vertical'}}></textarea>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px'}}>
                    <input type="checkbox" checked={isNewMemoSecret} onChange={(e) => setIsNewMemoSecret(e.target.checked)} />
                    🔒 비밀 메모
                  </label>
                  {isNewMemoSecret && <input type="password" placeholder="비밀번호" value={newMemoPassword} onChange={(e) => setNewMemoPassword(e.target.value)} style={{...styles.input, flex: 1}} />}
                  <button onClick={createMemo} style={{...styles.button, flexShrink: 0}}>저장</button>
                </div>
              </div>
              
              <ul style={styles.memoList}>
                {filteredMemos.map(memo => (
                    <li key={memo.id} onClick={() => getMemoContent(memo.id, memo.name)} style={{ ...styles.memoListItem, ...(selectedMemo?.id === memo.id ? styles.activeMemoListItem : {}) }}>
                        <div style={styles.memoName}>
                          {memo.name.startsWith(SECRET_PREFIX) ? '🔒 ' : ''}
                          {memo.name.replace('.txt', '').replace(SECRET_PREFIX, '')}
                          <div style={{fontSize: '12px', color: styles.textSecondary, marginTop: '2px'}}>
                            {memo.createdTime ? new Date(memo.createdTime).toLocaleDateString('ko-KR') : '날짜 없음'}
                          </div>
                        </div>
                        <button 
                          style={styles.deleteButton} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            deleteMemo(memo.id); 
                          }}
                          title="메모 삭제"
                        >🗑️</button>
                    </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={styles.rightPanel}>
            {selectedMemo ? (
              <div style={styles.editorContainer}>
                <div style={styles.editorHeader}>
                  <div style={styles.viewModeToggle}>
                    <button style={viewMode === 'edit' ? styles.toggleButtonActive : styles.toggleButton} onClick={() => setViewMode('edit')}>편집</button>
                    <button style={viewMode === 'preview' ? styles.toggleButtonActive : styles.toggleButton} onClick={() => setViewMode('preview')}>미리보기</button>
                  </div>
                  <button style={{...styles.button, width: 'auto', padding: '8px 15px'}} onClick={updateMemo}>{isLoading ? '저장 중...' : '변경사항 저장'}</button>
                </div>
                <div style={styles.editorPane}>
                  {viewMode === 'edit' ? (
                    <textarea style={styles.memoContentArea} value={selectedMemo.content} onChange={(e) => setSelectedMemo({ ...selectedMemo, content: e.target.value })} />
                  ) : (
                    <div style={styles.previewContent} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(selectedMemo.content || '')) }}></div>
                  )}
                </div>
              </div>
            ) : ( 
              <div style={styles.placeholder}>
                <h2>✅ 메모장 앱이 준비되었습니다!</h2>
                <p>← 왼쪽에서 메모를 선택하거나 새로 작성해보세요.</p>
                <div style={{marginTop: '20px', textAlign: 'left'}}>
                  <h4>🔧 데이터 지속성 해결됨!</h4>
                  <p>✅ 새로고침해도 메모가 사라지지 않습니다</p>
                  <p>✅ 로그인 상태가 유지됩니다</p>
                  <p>✅ 선택한 노트북이 기억됩니다</p>
                  
                  <h4>📊 현재 상태:</h4>
                  <p>📁 노트북: {notebooks.length}개</p>
                  <p>📝 메모: {memos.length}개</p>
                  <p>🔐 로그인: {user?.name || '완료'}</p>
                </div>
              </div> 
            )}
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  return ( <GoogleOAuthProvider clientId={CLIENT_ID}><MemoApp /></GoogleOAuthProvider> );
}

export default App;

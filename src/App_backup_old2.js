// 간단하고 확실한 버전의 App.js

import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';
const SECRET_PREFIX = 'secret_';

// 아이콘 컴포넌트들
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const BookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;

// 유틸리티 함수들
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(`memo-app-${key}`, JSON.stringify(data));
    console.log(`💾 Saved: ${key}`, data);
  } catch (error) {
    console.error('❌ Save failed:', error);
  }
};

const loadFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(`memo-app-${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Load failed:', error);
    return null;
  }
};

// UI 컴포넌트들
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

// 스타일링
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
        debugInfo: { 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          backgroundColor: c.panelBg, 
          border: `1px solid ${c.border}`, 
          borderRadius: '5px', 
          padding: '10px', 
          fontSize: '12px',
          maxWidth: '300px',
          zIndex: 1000
        }
    };
};

function MemoApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem('memo-theme') || 'light');
  const styles = getDynamicStyles(theme);

  const [notebooks, setNotebooks] = useState([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState('all');
  const [newNotebookName, setNewNotebookName] = useState('');
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [memos, setMemos] = useState([]);
  const [newMemoContent, setNewMemoContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [viewMode, setViewMode] = useState('edit');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // 🔧 디버그 정보 상태
  const [debugInfo, setDebugInfo] = useState({
    tokenExists: false,
    apiWorking: false,
    lastError: '',
    dataLoadTime: null
  });

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    console.log(`📢 Toast: ${type} - ${message}`);
    setToast({ show: true, message, type });
    setTimeout(() => { setToast({ show: false, message: '', type: 'success' }); }, duration);
  }, []);

  // 🔧 간단한 API 테스트 함수
  const testGoogleAPI = async (token) => {
    try {
      console.log('🔍 API 테스트 시작...');
      
      // 1. 사용자 정보 확인
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ 사용자 정보:', userResponse.data);
      
      // 2. Drive 정보 확인
      const aboutResponse = await axios.get('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Drive 정보:', aboutResponse.data);
      
      // 3. 토큰 정보 확인
      try {
        const tokenInfoResponse = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
        console.log('✅ 토큰 정보:', tokenInfoResponse.data);
      } catch (tokenError) {
        console.log('⚠️ 토큰 정보 확인 실패:', tokenError.response?.status);
      }
      
      setDebugInfo(prev => ({ ...prev, apiWorking: true, lastError: '' }));
      return userResponse.data;
    } catch (error) {
      console.error('❌ API 테스트 실패:', error);
      console.error('❌ 응답 상세:', error.response?.data);
      setDebugInfo(prev => ({ 
        ...prev, 
        apiWorking: false, 
        lastError: `${error.response?.status} ${error.response?.statusText || error.message}` 
      }));
      throw error;
    }
  };

  // 🔧 메모장 앱 전용 폴더 생성 또는 찾기
  const ensureMemoAppFolder = async (token) => {
    try {
      // 1. 기존 MemoApp 폴더 찾기
      console.log('🔍 MemoApp 폴더 검색 중...');
      const searchResponse = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          q: "name='MemoApp' and mimeType='application/vnd.google-apps.folder' and trashed=false",
          fields: 'files(id, name)'
        }
      });
      
      const existingFolders = searchResponse.data.files || [];
      
      if (existingFolders.length > 0) {
        console.log('✅ 기존 MemoApp 폴더 찾음:', existingFolders[0].id);
        return existingFolders[0].id;
      }
      
      // 2. MemoApp 폴더 생성
      console.log('📁 MemoApp 폴더 생성 중...');
      const createResponse = await axios.post(
        'https://www.googleapis.com/drive/v3/files',
        {
          name: 'MemoApp',
          mimeType: 'application/vnd.google-apps.folder'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('✅ MemoApp 폴더 생성 완료:', createResponse.data.id);
      return createResponse.data.id;
      
    } catch (error) {
      console.error('❌ MemoApp 폴더 설정 실패:', error);
      throw error;
    }
  };
    try {
      setIsLoading(true);
      setDebugInfo(prev => ({ ...prev, dataLoadTime: new Date().toLocaleTimeString() }));
      
      console.log('📁 데이터 로드 시작...');
      
      // 1. 사용자 정보 확인
      const userData = await testGoogleAPI(token);
      setUser(userData);
      
      // 2. 노트북 로드 - 메모장 앱 관련 폴더만
      console.log('📁 메모장 노트북 로드 중...');
      
      // appDataFolder 하위 폴더만 검색 (메모장 앱 전용)
      let loadedNotebooks = [];
      try {
        const appDataResponse = await axios.get('https://www.googleapis.com/drive/v3/files', {
          headers: { 'Authorization': `Bearer ${token}` },
          params: {
            q: "'appDataFolder' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name, parents)',
            pageSize: 50
          }
        });
        loadedNotebooks = appDataResponse.data.files || [];
        console.log(`✅ 메모장 노트북 ${loadedNotebooks.length}개 로드:`, loadedNotebooks);
      } catch (error) {
        console.log('📁 appDataFolder 접근 불가:', error.response?.status);
        // appDataFolder 접근 불가 시 빈 배열 유지
      }
      
      setNotebooks(loadedNotebooks);
      saveToLocalStorage('notebooks', loadedNotebooks);
      
      // 3. 메모 로드 - 정확한 메모장 앱 파일만
      console.log('📝 메모장 메모 로드 중...');
      
      let allFoundMemos = [];
      
      // 먼저 appDataFolder 검색 (메모장 앱 전용)
      try {
        console.log('🔍 appDataFolder 내 메모 검색...');
        const appDataResponse = await axios.get('https://www.googleapis.com/drive/v3/files', {
          headers: { 'Authorization': `Bearer ${token}` },
          params: {
            q: "'appDataFolder' in parents and trashed=false",
            fields: 'files(id, name, parents, createdTime, mimeType)',
            orderBy: 'createdTime desc',
            pageSize: 100
          }
        });
        
        const appDataFiles = appDataResponse.data.files || [];
        console.log(`   → appDataFolder 파일 ${appDataFiles.length}개:`, appDataFiles.map(f => f.name));
        
        // 메모장 앱 파일만 필터링 (OAuth 파일 제외)
        const memoFiles = appDataFiles.filter(file => 
          file.mimeType !== 'application/vnd.google-apps.folder' && 
          file.mimeType === 'text/plain' && 
          file.name.endsWith('.txt') &&
          !file.name.includes('client_secret') &&
          !file.name.includes('secrets.toml') &&
          !file.name.includes('.json')
        );
        
        console.log(`   → 진짜 메모 파일 ${memoFiles.length}개:`, memoFiles.map(f => f.name));
        allFoundMemos = memoFiles;
        
      } catch (error) {
        console.log('📝 appDataFolder 접근 실패:', error.response?.status);
      }
      
      // appDataFolder에서 메모를 못 찾았다면 다른 위치에서 메모장 앱이 만든 파일 검색
      if (allFoundMemos.length === 0) {
        console.log('🔍 다른 위치에서 메모장 앱 파일 검색...');
        
        try {
          // 메모장 앱이 만든 .txt 파일만 검색
          const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
              q: "name contains '.txt' and mimeType='text/plain' and trashed=false",
              fields: 'files(id, name, parents, createdTime, mimeType)',
              orderBy: 'createdTime desc',
              pageSize: 50
            }
          });
          
          const foundFiles = response.data.files || [];
          console.log(`   → .txt 파일 ${foundFiles.length}개:`, foundFiles.map(f => f.name));
          
          // OAuth 파일들과 시스템 파일들 제외
          const realMemoFiles = foundFiles.filter(file => 
            !file.name.includes('client_secret') &&
            !file.name.includes('secrets.toml') &&
            !file.name.includes('config') &&
            !file.name.includes('auth') &&
            !file.name.includes('.json') &&
            !file.name.includes('oauth') &&
            (file.name.includes('memo') || file.name.includes('secret_') || file.name.length < 50) // 간단한 이름의 파일들만
          );
          
          console.log(`   → 필터링된 메모 ${realMemoFiles.length}개:`, realMemoFiles.map(f => f.name));
          allFoundMemos = realMemoFiles;
          
        } catch (error) {
          console.log('📝 다른 위치 검색도 실패:', error.response?.status);
        }
      }
      
      console.log(`✅ 총 진짜 메모 ${allFoundMemos.length}개 발견:`, allFoundMemos);
      setMemos(allFoundMemos);
      saveToLocalStorage('memos-all', allFoundMemos);
      
      showToast(`노트북 ${loadedNotebooks.length}개, 메모 ${allFoundMemos.length}개 로드 완료!`, 'success');
      
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      
      // 실패 시 캐시된 데이터 로드
      const cachedNotebooks = loadFromLocalStorage('notebooks') || [];
      const cachedMemos = loadFromLocalStorage('memos-all') || [];
      
      if (cachedNotebooks.length > 0) {
        setNotebooks(cachedNotebooks);
        console.log(`📂 캐시된 노트북 ${cachedNotebooks.length}개 복원`);
      }
      
      if (cachedMemos.length > 0) {
        setMemos(cachedMemos);
        console.log(`📝 캐시된 메모 ${cachedMemos.length}개 복원`);
      }
      
      showToast(`데이터 로드 실패: ${error.response?.status || error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인 함수
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('🎉 로그인 성공:', tokenResponse);
      const token = tokenResponse.access_token;
      
      // 토큰 저장
      localStorage.setItem('memo-app-access-token', token);
      const expiryTime = Date.now() + (tokenResponse.expires_in || 3600) * 1000;
      localStorage.setItem('memo-app-token-expiry', expiryTime.toString());
      
      setAccessToken(token);
      setDebugInfo(prev => ({ ...prev, tokenExists: true }));
      
      // 즉시 데이터 로드
      await loadData(token);
    },
    onError: (errorResponse) => {
      console.error('❌ 로그인 실패:', errorResponse);
      showToast('로그인에 실패했습니다.', 'error');
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
    setDebugInfo({ tokenExists: false, apiWorking: false, lastError: '', dataLoadTime: null });
    
    localStorage.removeItem('memo-app-access-token');
    localStorage.removeItem('memo-app-token-expiry');
  };

  // 앱 시작 시 토큰 복원
  useEffect(() => {
    const savedToken = localStorage.getItem('memo-app-access-token');
    const savedExpiry = localStorage.getItem('memo-app-token-expiry');
    
    if (savedToken && savedExpiry) {
      const expiryTime = parseInt(savedExpiry);
      const now = Date.now();
      
      if (now < expiryTime - 10 * 60 * 1000) {
        console.log('🔧 토큰 복원 중...');
        setAccessToken(savedToken);
        setDebugInfo(prev => ({ ...prev, tokenExists: true }));
        
        // 복원된 토큰으로 데이터 로드
        loadData(savedToken);
      } else {
        console.log('⏰ 토큰 만료');
        localStorage.removeItem('memo-app-access-token');
        localStorage.removeItem('memo-app-token-expiry');
      }
    } else {
      // 토큰이 없어도 캐시된 데이터 복원
      const cachedNotebooks = loadFromLocalStorage('notebooks');
      const cachedMemos = loadFromLocalStorage('memos-all');
      
      if (cachedNotebooks) setNotebooks(cachedNotebooks);
      if (cachedMemos) setMemos(cachedMemos);
    }
  }, []);

  // 노트북 선택 시 메모 필터링
  useEffect(() => {
    if (selectedNotebookId && memos.length > 0) {
      console.log(`📁 노트북 "${selectedNotebookId}" 선택됨`);
      
      if (selectedNotebookId === 'all') {
        // 모든 메모 표시
        console.log(`📝 모든 메모 ${memos.length}개 표시`);
      } else {
        // 특정 노트북의 메모만 필터링
        const filteredMemos = memos.filter(memo => 
          memo.parents && memo.parents.includes(selectedNotebookId)
        );
        console.log(`📝 필터링된 메모 ${filteredMemos.length}개 표시`);
        setMemos(filteredMemos);
      }
    }
  }, [selectedNotebookId]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('memo-theme', newTheme);
  };

  // 메모 생성
  const createMemo = async () => {
    if (!accessToken || !newMemoContent.trim()) {
      showToast('메모 내용을 입력해주세요.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      const firstLine = newMemoContent.split('\n')[0].slice(0, 30).trim();
      const safeFileName = firstLine.replace(/[\\/:*?"<>|]/g, "") + ".txt";
      const fileName = firstLine ? safeFileName : `memo-${Date.now()}.txt`;
      
      const metadata = { 
        name: fileName, 
        mimeType: 'text/plain', 
        parents: ['appDataFolder'] // 메모장 앱 전용 폴더에 저장
      };
      
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;
      const multipartRequestBody = delimiter + 
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
        JSON.stringify(metadata) + delimiter + 
        'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + 
        newMemoContent + close_delim;
      
      const response = await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', 
        multipartRequestBody, 
        { 
          headers: { 
            'Authorization': `Bearer ${accessToken}`, 
            'Content-Type': `multipart/related; boundary=${boundary}` 
          } 
        }
      );
      
      console.log('✅ 메모 생성 완료:', response.data);
      
      // 새 메모를 목록에 추가
      const newMemo = {
        id: response.data.id,
        name: fileName,
        mimeType: 'text/plain',
        parents: ['appDataFolder'],
        createdTime: new Date().toISOString()
      };
      
      setMemos(prevMemos => {
        const updatedMemos = [newMemo, ...prevMemos];
        saveToLocalStorage('memos-all', updatedMemos);
        return updatedMemos;
      });
      
      setNewMemoContent('');
      showToast('메모가 저장되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 메모 생성 실패:', error);
      showToast('메모 저장에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 메모 내용 가져오기
  const getMemoContent = async (fileId, fileName) => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setSelectedMemo({ id: fileId, name: fileName, content: response.data });
    } catch (error) {
      console.error('❌ 메모 내용 로드 실패:', error);
      showToast('메모를 불러올 수 없습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 노트북 생성
  const createNotebook = async () => {
    if (!accessToken || !newNotebookName.trim()) {
      showToast('노트북 이름을 입력해주세요.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      const metadata = { 
        name: newNotebookName, 
        mimeType: 'application/vnd.google-apps.folder', 
        parents: ['appDataFolder'] 
      };
      
      const response = await axios.post(
        'https://www.googleapis.com/drive/v3/files', 
        metadata, 
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      console.log('✅ 노트북 생성 완료:', response.data);
      
      // 새 노트북을 목록에 추가
      const newNotebook = {
        id: response.data.id,
        name: response.data.name
      };
      
      setNotebooks(prevNotebooks => {
        const updatedNotebooks = [...prevNotebooks, newNotebook].sort((a, b) => a.name.localeCompare(b.name));
        saveToLocalStorage('notebooks', updatedNotebooks);
        return updatedNotebooks;
      });
      
      setNewNotebookName('');
      setSelectedNotebookId(response.data.id);
      showToast('노트북이 생성되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 노트북 생성 실패:', error);
      showToast('노트북 생성에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 메모 업데이트
  const updateMemo = async () => {
    if (!accessToken || !selectedMemo) return;
    
    setIsLoading(true);
    try {
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;
      const multipartRequestBody = delimiter + 
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
        '{}' + delimiter + 
        'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + 
        selectedMemo.content + close_delim;
      
      await axios.patch(
        `https://www.googleapis.com/upload/drive/v3/files/${selectedMemo.id}?uploadType=multipart`, 
        multipartRequestBody, 
        { 
          headers: { 
            'Authorization': `Bearer ${accessToken}`, 
            'Content-Type': `multipart/related; boundary=${boundary}` 
          } 
        }
      );
      
      console.log('✅ 메모 업데이트 완료');
      showToast('메모가 저장되었습니다!', 'success');
      
    } catch (error) {
      console.error('❌ 메모 업데이트 실패:', error);
      showToast('메모 저장에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {isLoading && <Spinner themeStyles={styles} />}
      <Toast show={toast.show} message={toast.message} type={toast.type} themeStyles={styles} />
      
      {/* 🔧 디버그 정보 표시 */}
      {accessToken && (
        <div style={styles.debugInfo}>
          <strong>🔧 디버그 정보</strong><br />
          토큰: {debugInfo.tokenExists ? '✅' : '❌'}<br />
          API: {debugInfo.apiWorking ? '✅' : '❌'}<br />
          {debugInfo.lastError && <>오류: {debugInfo.lastError}<br /></>}
          {debugInfo.dataLoadTime && <>로드: {debugInfo.dataLoadTime}<br /></>}
          노트북: {notebooks.length}개<br />
          메모: {memos.length}개
        </div>
      )}
      
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
                <button 
                  style={{...styles.iconButton, border: `1px solid ${styles.border}`, borderRadius: '3px', padding: '4px'}} 
                  onClick={() => loadData(accessToken)}
                  title="데이터 새로고침"
                >
                  🔄
                </button>
                <button style={styles.iconButton} onClick={toggleTheme} title="테마 변경">
                  {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
                <button style={styles.iconButton} onClick={handleLogout} title="로그아웃">
                  <LogoutIcon />
                </button>
              </div>
            </div>
            
            <div style={styles.section}>
              <h3>📁 노트북</h3>
              
              {/* 새 노트북 생성 */}
              <div style={{marginBottom: '10px'}}>
                <div style={{display: 'flex', gap: '5px'}}>
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
                    style={{...styles.button, padding: '8px 12px'}}
                    disabled={!newNotebookName.trim()}
                  >
                    ➕
                  </button>
                </div>
              </div>
              
              <ul style={styles.notebookList}>
                <li 
                  style={selectedNotebookId === 'all' ? styles.activeListItem : styles.listItem} 
                  onClick={() => setSelectedNotebookId('all')}
                >
                  📋 모든 메모
                </li>
                {notebooks.map(notebook => (
                  <li 
                    key={notebook.id} 
                    style={selectedNotebookId === notebook.id ? styles.activeListItem : styles.listItem} 
                    onClick={() => setSelectedNotebookId(notebook.id)}
                  >
                    <BookIcon /> {notebook.name}
                  </li>
                ))}
              </ul>
            </div>
            
            <div style={{...styles.section, flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
              <h3>📝 메모</h3>
              
              {/* 새 메모 작성 영역 */}
              <div style={{marginBottom: '15px'}}>
                <textarea 
                  placeholder="새 메모를 작성하세요..." 
                  value={newMemoContent} 
                  onChange={(e) => setNewMemoContent(e.target.value)} 
                  style={{
                    ...styles.input, 
                    height: '80px', 
                    resize: 'vertical',
                    marginBottom: '5px'
                  }}
                />
                <button 
                  onClick={createMemo} 
                  style={{
                    ...styles.button, 
                    width: '100%',
                    padding: '8px'
                  }}
                  disabled={!newMemoContent.trim()}
                >
                  💾 메모 저장
                </button>
              </div>
              
              <ul style={styles.memoList}>
                {memos.map(memo => (
                  <li 
                    key={memo.id} 
                    onClick={() => getMemoContent(memo.id, memo.name)} 
                    style={{ 
                      ...styles.memoListItem, 
                      ...(selectedMemo?.id === memo.id ? styles.activeMemoListItem : {}) 
                    }}
                  >
                    <div style={styles.memoName}>
                      {memo.name.startsWith(SECRET_PREFIX) ? '🔒 ' : '📄 '}
                      {memo.name.replace('.txt', '').replace(SECRET_PREFIX, '')}
                      <div style={{fontSize: '12px', color: styles.textSecondary, marginTop: '2px'}}>
                        {memo.createdTime ? new Date(memo.createdTime).toLocaleDateString('ko-KR') : '날짜 없음'}
                      </div>
                    </div>
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
                  <button 
                    style={{...styles.button, padding: '8px 15px'}} 
                    onClick={updateMemo}
                    disabled={isLoading}
                  >
                    {isLoading ? '저장 중...' : '💾 저장'}
                  </button>
                </div>
                <div style={styles.editorPane}>
                  {viewMode === 'edit' ? (
                    <textarea 
                      style={styles.memoContentArea} 
                      value={selectedMemo.content} 
                      onChange={(e) => setSelectedMemo({ ...selectedMemo, content: e.target.value })} 
                    />
                  ) : (
                    <div style={styles.previewContent} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(selectedMemo.content || '')) }}></div>
                  )}
                </div>
              </div>
            ) : ( 
              <div style={styles.placeholder}>
                <h2>간단한 메모장 앱</h2>
                <p>← 왼쪽에서 메모를 선택해보세요.</p>
                
                <div style={{marginTop: '20px', textAlign: 'left'}}>
                  <h4>🔧 문제 해결 가이드:</h4>
                  <p>1. 우상단 디버그 정보 확인</p>
                  <p>2. 🔄 새로고침 버튼 클릭</p>
                  <p>3. F12 → Console 탭에서 오류 확인</p>
                  <p>4. Google Drive API 권한 확인</p>
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

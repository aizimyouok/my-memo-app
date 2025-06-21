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

// --- 강화된 진단 함수들 ---
const comprehensiveDiagnosis = async (accessToken) => {
  if (!accessToken) return;
  
  console.log('\n🚀 ===== 종합 진단 시작 =====');
  console.log(`🔑 Client ID: ${CLIENT_ID}`);
  console.log(`🔐 Access Token: ${accessToken.substring(0, 20)}...`);
  
  try {
    // 1. 권한 확인
    console.log('\n📋 1. OAuth 권한 확인...');
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ 사용자:', userInfo.data.email);
    
    // 2. Drive API 기본 연결 테스트
    console.log('\n📋 2. Drive API 연결 테스트...');
    const about = await axios.get('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ Drive 연결 성공:', about.data.user.emailAddress);
    
    // 3. 모든 파일 검색 (광범위)
    console.log('\n📋 3. 전체 Drive 파일 검색...');
    const allFiles = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { 
        fields: 'files(id, name, mimeType, parents, createdTime, size)',
        pageSize: 1000,
        orderBy: 'createdTime desc'
      }
    });
    
    console.log(`📊 전체 파일 개수: ${allFiles.data.files.length}`);
    
    // 파일 분류
    const textFiles = allFiles.data.files.filter(f => 
      f.mimeType === 'text/plain' || f.name.endsWith('.txt')
    );
    const folders = allFiles.data.files.filter(f => 
      f.mimeType === 'application/vnd.google-apps.folder'
    );
    const memoFiles = allFiles.data.files.filter(f => 
      f.name.includes('memo') || f.name.startsWith('secret_')
    );
    
    console.log(`📄 텍스트 파일: ${textFiles.length}개`);
    console.log(`📁 폴더: ${folders.length}개`);
    console.log(`📝 메모 파일: ${memoFiles.length}개`);
    
    // 상세 정보 출력
    if (textFiles.length > 0) {
      console.log('\n📄 발견된 텍스트 파일들:');
      textFiles.slice(0, 10).forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.id}) - ${file.createdTime}`);
        console.log(`     부모: ${file.parents ? file.parents.join(', ') : '없음'}`);
      });
    }
    
    // 4. appDataFolder 전용 검색
    console.log('\n📋 4. appDataFolder 파일 검색...');
    try {
      const appDataFiles = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { 
          q: "'appDataFolder' in parents",
          fields: 'files(id, name, mimeType, parents, createdTime)',
          pageSize: 1000
        }
      });
      
      console.log(`📁 appDataFolder 파일: ${appDataFiles.data.files.length}개`);
      if (appDataFiles.data.files.length > 0) {
        appDataFiles.data.files.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (${file.id})`);
        });
      }
    } catch (error) {
      console.error('❌ appDataFolder 접근 실패:', error.response?.data);
    }
    
    // 5. 특정 검색어로 파일 찾기
    console.log('\n📋 5. 메모 관련 파일 검색...');
    const searchQueries = [
      "name contains '.txt'",
      "name contains 'memo'",
      "name contains 'secret_'",
      "mimeType='text/plain'"
    ];
    
    for (let query of searchQueries) {
      try {
        const searchResult = await axios.get('https://www.googleapis.com/drive/v3/files', {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { 
            q: query + " and trashed=false",
            fields: 'files(id, name, mimeType, parents, createdTime)',
            pageSize: 100
          }
        });
        
        console.log(`🔍 "${query}" 검색 결과: ${searchResult.data.files.length}개`);
        if (searchResult.data.files.length > 0) {
          searchResult.data.files.slice(0, 5).forEach(file => {
            console.log(`  - ${file.name} (부모: ${file.parents ? file.parents.join(',') : '없음'})`);
          });
        }
      } catch (error) {
        console.error(`❌ 검색 실패 "${query}":`, error.response?.data);
      }
    }
    
    // 6. 권한 범위 확인
    console.log('\n📋 6. OAuth 스코프 확인...');
    try {
      const tokenInfo = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
      console.log('✅ 현재 권한 스코프:', tokenInfo.data.scope);
    } catch (error) {
      console.error('❌ 토큰 정보 확인 실패:', error);
    }
    
    console.log('\n🎯 ===== 진단 완료 =====');
    
    // 진단 결과 요약
    const summary = {
      totalFiles: allFiles.data.files.length,
      textFiles: textFiles.length,
      folders: folders.length,
      memoFiles: memoFiles.length,
      appDataFiles: 0 // 위에서 설정됨
    };
    
    console.log('\n📊 진단 결과 요약:', summary);
    return summary;
    
  } catch (error) {
    console.error('❌ 종합 진단 실패:', error);
    if (error.response?.status === 403) {
      console.error('🚫 권한 오류 - OAuth 설정을 확인하세요');
    } else if (error.response?.status === 401) {
      console.error('🔐 인증 오류 - 토큰이 만료되었습니다');
    }
    throw error;
  }
};

// 강화된 메모 복구 함수
const smartMemoRecovery = async (accessToken, showToast) => {
  if (!accessToken) {
    showToast('로그인이 필요합니다.', 'error');
    return;
  }
  
  console.log('\n🔧 ===== 스마트 메모 복구 시작 =====');
  
  try {
    // 1. 종합 진단 실행
    const diagnosis = await comprehensiveDiagnosis(accessToken);
    
    // 2. 복구 전략 결정
    let recoveredMemos = [];
    let recoveredNotebooks = [];
    
    // 전략 A: 모든 텍스트 파일 복구
    console.log('\n🔧 전략 A: 모든 텍스트 파일 복구...');
    const allFiles = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { 
        q: "(mimeType='text/plain' or name contains '.txt') and trashed=false",
        fields: 'files(id, name, mimeType, parents, createdTime, size)',
        pageSize: 1000,
        orderBy: 'createdTime desc'
      }
    });
    
    recoveredMemos = allFiles.data.files.filter(file => 
      file.mimeType === 'text/plain' || file.name.endsWith('.txt')
    );
    
    console.log(`📄 복구된 메모: ${recoveredMemos.length}개`);
    
    // 전략 B: 폴더 복구
    console.log('\n🔧 전략 B: 폴더(노트북) 복구...');
    const allFolders = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { 
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name, mimeType, parents, createdTime)',
        pageSize: 1000
      }
    });
    
    recoveredNotebooks = allFolders.data.files;
    console.log(`📁 복구된 노트북: ${recoveredNotebooks.length}개`);
    
    // 3. 결과 반환
    const result = {
      memos: recoveredMemos,
      notebooks: recoveredNotebooks,
      diagnosis: diagnosis
    };
    
    console.log('\n✅ ===== 복구 완료 =====');
    console.log(`총 ${recoveredMemos.length}개 메모, ${recoveredNotebooks.length}개 노트북 복구`);
    
    return result;
    
  } catch (error) {
    console.error('❌ 스마트 복구 실패:', error);
    throw error;
  }
};

// 간단한 연결 테스트
const quickConnectionTest = async (accessToken) => {
  if (!accessToken) return;
  
  console.log('\n⚡ ===== 빠른 연결 테스트 =====');
  
  try {
    // 1. 기본 연결 확인
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ 로그인 상태:', userInfo.data.email);
    
    // 2. Drive API 권한 확인  
    const about = await axios.get('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ Drive API 접근:', about.data.user.emailAddress);
    
    // 3. 파일 개수 확인
    const files = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { 
        fields: 'files(id)',
        pageSize: 1
      }
    });
    console.log('✅ Drive 파일 접근 가능');
    
    console.log('🎯 연결 테스트 성공!');
    return true;
    
  } catch (error) {
    console.error('❌ 연결 테스트 실패:', error);
    return false;
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

const MoveModal = ({ show, memo, notebooks, onMove, onCancel, themeStyles }) => {
  const [selectedNotebook, setSelectedNotebook] = useState('');
  
  if (!show || !memo) return null;
  
  return (
    <div style={themeStyles.modalOverlay}>
      <div style={themeStyles.modalContent}>
        <h3>메모 이동</h3>
        <p>'{memo.name.replace('.txt', '').replace(SECRET_PREFIX, '')}' 메모를 어느 노트북으로 이동하시겠습니까?</p>
        
        <select 
          value={selectedNotebook}
          onChange={(e) => setSelectedNotebook(e.target.value)}
          style={{
            ...themeStyles.input,
            marginTop: '15px',
            marginBottom: '20px'
          }}
        >
          <option value="">노트북 선택...</option>
          <option value="appDataFolder">📋 모든 메모</option>
          {notebooks.map(nb => (
            <option key={nb.id} value={nb.id}>📁 {nb.name}</option>
          ))}
        </select>
        
        <div style={themeStyles.modalActions}>
          <button 
            style={{...themeStyles.button, ...themeStyles.modalButton}} 
            onClick={onCancel}
          >
            취소
          </button>
          <button 
            style={{...themeStyles.button, ...themeStyles.modalButton}}
            onClick={() => {
              if (selectedNotebook) {
                onMove(memo, selectedNotebook);
                setSelectedNotebook('');
              }
            }}
            disabled={!selectedNotebook}
          >
            이동
          </button>
        </div>
      </div>
    </div>
  );
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

const Toast = ({ show, message, type, themeStyles }) => {
  if (!show) return null;
  const toastStyle = type === 'success' ? themeStyles.toastSuccess : themeStyles.toastError;
  return ( <div style={{ ...themeStyles.toast, ...toastStyle }}>{message}</div> );
};

const MarkdownToolbar = ({ onInsert, themeStyles }) => {
  const buttons = [
    { label: 'H1', action: () => onInsert('# ', ''), title: '큰 제목' }, { label: 'H2', action: () => onInsert('## ', ''), title: '중간 제목' },
    { label: 'B', action: () => onInsert('**', '**'), title: '굵게' }, { label: 'I', action: () => onInsert('*', '*'), title: '기울임' },
    { label: '―', action: () => onInsert('\n---\n', ''), title: '구분선' }, { label: '•', action: () => onInsert('- ', ''), title: '목록' },
    { label: '>', action: () => onInsert('> ', ''), title: '인용구' }
  ];
  return (
    <div style={themeStyles.toolbar}>
      {buttons.map((btn, index) => (<button key={index} onClick={btn.action} style={themeStyles.toolbarButton} title={btn.title}>{btn.label}</button>))}
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
        toolbar: { padding: '8px', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: '5px', flexWrap: 'wrap', backgroundColor: c.bg },
        toolbarButton: { background: c.buttonBg, border: `1px solid ${c.border}`, borderRadius: '3px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', color: c.text },
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
        // 새로운 진단 도구 스타일
        diagnosticPanel: { 
            backgroundColor: c.buttonBg, 
            border: `1px solid ${c.border}`, 
            borderRadius: '5px', 
            padding: '10px', 
            margin: '10px 0',
            fontSize: '14px'
        },
        diagnosticButton: {
            padding: '6px 12px',
            fontSize: '12px',
            margin: '2px',
            backgroundColor: c.buttonBg,
            color: c.text,
            border: `1px solid ${c.border}`,
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }
    };
};

function MemoApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem('memo-theme') || 'light');
  const styles = getDynamicStyles(theme);

  const [notebooks, setNotebooks] = useState([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState(null);
  const [newNotebookName, setNewNotebookName] = useState('');
  
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [memos, setMemos] = useState([]);
  
  const [newMemoContent, setNewMemoContent] = useState('');
  const [isNewMemoSecret, setIsNewMemoSecret] = useState(false);
  const [newMemoPassword, setNewMemoPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [viewMode, setViewMode] = useState('edit');

  const [editingNotebook, setEditingNotebook] = useState(null);
  const [editingNotebookName, setEditingNotebookName] = useState('');

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modal, setModal] = useState({ show: false, message: '', onConfirm: () => {} });
  const editorRef = useRef(null);

  // 새로운 진단 상태
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => { setToast({ show: false, message: '', type: 'success' }); }, duration);
  }, []);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Login successful:', tokenResponse);
      setAccessToken(tokenResponse.access_token);
    },
    onError: (errorResponse) => {
      console.error('Login Failed:', errorResponse);
      showToast('로그인에 실패했습니다. Google Cloud Console 설정을 확인해주세요.', 'error');
    },
    scope: SCOPES,
  });
  
  const handleLogout = () => {
    googleLogout(); setUser(null); setAccessToken(null); setNotebooks([]); setMemos([]);
    setSelectedMemo(null); setSelectedNotebookId(null); setDiagnosticInfo(null);
  };

  // 강화된 진단 및 복구 함수들
  const runDiagnosis = async () => {
    if (!accessToken) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 종합 진단 시작...');
      const result = await comprehensiveDiagnosis(accessToken);
      setDiagnosticInfo(result);
      setShowDiagnostics(true);
      showToast('진단이 완료되었습니다. 콘솔에서 자세한 정보를 확인하세요.', 'success');
    } catch (error) {
      console.error('진단 실패:', error);
      showToast('진단 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const runQuickTest = async () => {
    if (!accessToken) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const success = await quickConnectionTest(accessToken);
      if (success) {
        showToast('연결 테스트 성공!', 'success');
      } else {
        showToast('연결 테스트 실패', 'error');
      }
    } catch (error) {
      showToast('연결 테스트 중 오류 발생', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const runSmartRecovery = async () => {
    if (!accessToken) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🔧 스마트 복구 시작...');
      const result = await smartMemoRecovery(accessToken, showToast);
      
      if (result.memos.length > 0) {
        setMemos(result.memos);
        saveToLocalStorage('memos-all', result.memos);
        showToast(`${result.memos.length}개의 메모를 복구했습니다!`, 'success');
      }
      
      if (result.notebooks.length > 0) {
        setNotebooks(result.notebooks);
        saveToLocalStorage('notebooks', result.notebooks);
        showToast(`${result.notebooks.length}개의 노트북을 복구했습니다!`, 'success');
      }
      
      if (result.memos.length === 0 && result.notebooks.length === 0) {
        showToast('복구할 수 있는 메모나 노트북을 찾지 못했습니다.', 'error');
      }
      
    } catch (error) {
      console.error('스마트 복구 실패:', error);
      showToast('복구 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

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

  const clearMemoCache = () => {
    // 모든 메모 캐시 삭제
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('memo-app-memos-')) {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared cache: ${key}`);
      }
    });
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('memo-theme', newTheme);
  };
  // 중복 호출 방지를 위한 ref
  const isLoadingMemosRef = useRef(false);
  const isLoadingNotebooksRef = useRef(false);

  const listMemos = useCallback(async (token, notebookId) => {
    if (!token || !notebookId || isLoadingMemosRef.current) return;
    
    isLoadingMemosRef.current = true;
    setIsLoading(true);
    setMemos([]);
    setSelectedMemo(null);
    
    console.log('📋 Listing memos:', {
      notebookId,
      token: token.substring(0, 20) + '...'
    });
    
    try {
        // 🔧 강화된 검색: 여러 방법으로 파일 찾기
        let allFoundFiles = [];
        
        // 방법 1: 모든 파일 검색
        console.log('🔍 방법 1: 전체 파일 검색...');
        const allFilesRes = await axios.get('https://www.googleapis.com/drive/v3/files', { 
          headers: { Authorization: `Bearer ${token}` }, 
          params: { 
            q: 'trashed=false',
            fields: 'files(id, name, createdTime, mimeType, parents)', 
            orderBy: 'createdTime desc',
            pageSize: 1000
          } 
        });
        allFoundFiles = [...allFilesRes.data.files];
        
        // 방법 2: appDataFolder 전용 검색
        console.log('🔍 방법 2: appDataFolder 검색...');
        try {
          const appDataRes = await axios.get('https://www.googleapis.com/drive/v3/files', { 
            headers: { Authorization: `Bearer ${token}` }, 
            params: { 
              q: "'appDataFolder' in parents and trashed=false",
              fields: 'files(id, name, createdTime, mimeType, parents)', 
              orderBy: 'createdTime desc',
              pageSize: 1000
            } 
          });
          // 중복 제거하면서 합치기
          appDataRes.data.files.forEach(file => {
            if (!allFoundFiles.find(f => f.id === file.id)) {
              allFoundFiles.push(file);
            }
          });
        } catch (appError) {
          console.log('⚠️ appDataFolder 검색 실패 (정상):', appError.response?.status);
        }
        
        // 방법 3: 텍스트 파일만 검색
        console.log('🔍 방법 3: 텍스트 파일 검색...');
        try {
          const textFilesRes = await axios.get('https://www.googleapis.com/drive/v3/files', { 
            headers: { Authorization: `Bearer ${token}` }, 
            params: { 
              q: "(mimeType='text/plain' or name contains '.txt') and trashed=false",
              fields: 'files(id, name, createdTime, mimeType, parents)', 
              orderBy: 'createdTime desc',
              pageSize: 1000
            } 
          });
          // 중복 제거하면서 합치기
          textFilesRes.data.files.forEach(file => {
            if (!allFoundFiles.find(f => f.id === file.id)) {
              allFoundFiles.push(file);
            }
          });
        } catch (textError) {
          console.log('⚠️ 텍스트 파일 검색 실패:', textError.response?.status);
        }
        
        console.log('✅ 총 발견된 파일들:', allFoundFiles.length);
        console.log('📊 발견된 파일 목록:', allFoundFiles);
        
        // 메모 필터링
        let filteredFiles;
        if (notebookId === 'all') {
          // 모든 메모 - 폴더가 아닌 모든 파일 표시
          filteredFiles = allFoundFiles.filter(file => {
            const isNotFolder = file.mimeType !== 'application/vnd.google-apps.folder';
            const isTextLike = file.mimeType === 'text/plain' || 
                              file.name.endsWith('.txt') || 
                              file.name.includes('memo') ||
                              file.name.startsWith('secret_');
            
            console.log(`🔍 파일 분석: ${file.name}`, {
              mimeType: file.mimeType,
              isNotFolder,
              isTextLike,
              parents: file.parents
            });
            
            return isNotFolder && isTextLike;
          });
        } else {
          // 특정 노트북의 메모
          filteredFiles = allFoundFiles.filter(file => {
            const isNotFolder = file.mimeType !== 'application/vnd.google-apps.folder';
            const isTextLike = file.mimeType === 'text/plain' || file.name.endsWith('.txt');
            const hasParents = file.parents && file.parents.length > 0;
            const inNotebook = hasParents && file.parents.includes(notebookId);
            
            console.log(`🔍 노트북 파일 분석: ${file.name}`, {
              mimeType: file.mimeType,
              isNotFolder,
              isTextLike,
              parents: file.parents,
              inNotebook,
              targetNotebookId: notebookId
            });
            
            return isNotFolder && isTextLike && inNotebook;
          });
        }
        
        // 생성일 기준으로 정렬
        filteredFiles.sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));
        
        console.log('📄 최종 필터링된 메모들:', filteredFiles.length);
        console.log('📄 메모 목록:', filteredFiles);
        
        setMemos(filteredFiles);
        
        // 로컬 스토리지에 백업
        if (filteredFiles.length > 0) {
          saveToLocalStorage(`memos-${notebookId}`, filteredFiles);
        }
        
        if (filteredFiles.length === 0) {
          console.log('⚠️ 메모를 찾지 못했습니다. 스마트 복구를 시도해보세요.');
        }
        
    } catch (error) { 
        console.error('❌ Error listing memos:', error);
        if (error.response?.status === 403) {
          showToast("Google Drive API 권한이 없습니다. 🔧 진단 도구를 사용해보세요.", "error");
        } else if (error.response?.status === 401) {
          showToast("인증이 만료되었습니다. 다시 로그인해주세요.", "error");
          googleLogout(); 
          setUser(null); 
          setAccessToken(null); 
          setNotebooks([]); 
          setMemos([]);
          setSelectedMemo(null); 
          setSelectedNotebookId(null);
        } else {
          showToast("메모 목록을 불러오는데 실패했습니다. 🔧 진단 도구를 사용해보세요.", "error");
        }
    }
    finally { 
      setIsLoading(false); 
      isLoadingMemosRef.current = false;
    }
  }, []); // ← showToast 제거 (안정된 함수이므로)

  const listNotebooks = useCallback(async (token) => {
    if (!token || isLoadingNotebooksRef.current) return;
    
    isLoadingNotebooksRef.current = true;
    console.log('🔍 Attempting to list notebooks with token:', token.substring(0, 20) + '...');
    
    try {
        // 🔧 강화된 노트북 검색
        let allFoundFolders = [];
        
        // 방법 1: 모든 폴더 검색
        console.log('🔍 방법 1: 전체 폴더 검색...');
        const allFoldersRes = await axios.get('https://www.googleapis.com/drive/v3/files', { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }, 
          params: { 
            q: "mimeType='application/vnd.google-apps.folder' and trashed=false", 
            fields: 'files(id, name, mimeType, parents)',
            pageSize: 1000
          }
        });
        allFoundFolders = [...allFoldersRes.data.files];
        
        // 방법 2: appDataFolder 하위 폴더 검색
        console.log('🔍 방법 2: appDataFolder 하위 폴더 검색...');
        try {
          const appDataFoldersRes = await axios.get('https://www.googleapis.com/drive/v3/files', { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }, 
            params: { 
              q: "'appDataFolder' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false", 
              fields: 'files(id, name, mimeType, parents)',
              pageSize: 1000
            }
          });
          // 중복 제거하면서 합치기
          appDataFoldersRes.data.files.forEach(folder => {
            if (!allFoundFolders.find(f => f.id === folder.id)) {
              allFoundFolders.push(folder);
            }
          });
        } catch (appError) {
          console.log('⚠️ appDataFolder 폴더 검색 실패 (정상):', appError.response?.status);
        }
        
        console.log('✅ 총 발견된 폴더들:', allFoundFolders.length);
        console.log('📁 발견된 폴더 목록:', allFoundFolders);
        
        // appDataFolder 하위 폴더만 필터링 (더 관대하게)
        const appDataFolders = allFoundFolders.filter(folder => {
          const isInAppData = folder.parents && folder.parents.includes('appDataFolder');
          const looksLikeNotebook = folder.name && !folder.name.startsWith('.');
          
          console.log('🔍 폴더 분석:', folder.name, {
            parents: folder.parents,
            isInAppData,
            looksLikeNotebook
          });
          
          return isInAppData || looksLikeNotebook; // 더 관대한 조건
        });
        
        console.log('📁 최종 노트북들:', appDataFolders.length);
        console.log('📁 노트북 목록:', appDataFolders);
        
        const sortedNotebooks = appDataFolders.sort((a, b) => a.name.localeCompare(b.name));
        setNotebooks(sortedNotebooks);
        
        // 로컬 스토리지에 백업
        if (sortedNotebooks.length > 0) {
          saveToLocalStorage('notebooks', sortedNotebooks);
        }
        
        const notebookToSelect = sortedNotebooks.length > 0 ? sortedNotebooks[0].id : 'all';
        console.log('🎯 Selected notebook ID:', notebookToSelect);
        setSelectedNotebookId(notebookToSelect);
        
    } catch (error) { 
        console.error('❌ API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
        
        if (error.response?.status === 403) {
          const errorMessage = error.response?.data?.error?.message || 'Unknown 403 error';
          console.error('🚫 403 Error Details:', errorMessage);
          showToast(`Google Drive API 권한 오류. 🔧 진단 도구를 사용해보세요.`, "error");
        } else if (error.response?.status === 401) {
          showToast("인증이 만료되었습니다. 다시 로그인해주세요.", "error");
          googleLogout(); 
          setUser(null); 
          setAccessToken(null); 
          setNotebooks([]); 
          setMemos([]);
          setSelectedMemo(null); 
          setSelectedNotebookId(null);
        } else {
          showToast(`노트북 목록 로드 실패. 🔧 진단 도구를 사용해보세요.`, "error");
        }
    } finally {
      isLoadingNotebooksRef.current = false;
    }
  }, []); // ← showToast 제거 (안정된 함수이므로)
  
  const updateNotebook = async () => {
    if (!accessToken || !editingNotebook || !editingNotebookName.trim()) return;
    
    setIsLoading(true);
    try {
      await axios.patch(`https://www.googleapis.com/drive/v3/files/${editingNotebook.id}`, 
        { name: editingNotebookName },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      // 로컬 상태 업데이트
      const updatedNotebooks = notebooks.map(nb => 
        nb.id === editingNotebook.id 
          ? { ...nb, name: editingNotebookName }
          : nb
      ).sort((a, b) => a.name.localeCompare(b.name));
      
      setNotebooks(updatedNotebooks);
      saveToLocalStorage('notebooks', updatedNotebooks);
      
      setEditingNotebook(null);
      setEditingNotebookName('');
      showToast('노트북 이름이 변경되었습니다.', 'success');
      
    } catch (error) {
      console.error('Error updating notebook:', error);
      showToast('노트북 이름 변경에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNotebook = (notebook) => {
    if (!accessToken) return;
    
    const confirmDelete = async () => {
      setIsLoading(true);
      try {
        await axios.delete(`https://www.googleapis.com/drive/v3/files/${notebook.id}`, 
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        
        // 로컬 상태 업데이트
        const updatedNotebooks = notebooks.filter(nb => nb.id !== notebook.id);
        setNotebooks(updatedNotebooks);
        saveToLocalStorage('notebooks', updatedNotebooks);
        
        // 삭제된 노트북이 현재 선택된 노트북이라면 'all'로 변경
        if (selectedNotebookId === notebook.id) {
          setSelectedNotebookId('all');
          listMemos(accessToken, 'all');
        }
        
        showToast('노트북이 삭제되었습니다.', 'success');
        
      } catch (error) {
        console.error('Error deleting notebook:', error);
        showToast('노트북 삭제에 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
        setModal({ show: false, message: '', onConfirm: () => {} });
      }
    };
    
    setModal({ 
      show: true, 
      message: `'${notebook.name}' 노트북을 삭제하시겠습니까?\n\n⚠️ 노트북 안의 모든 메모도 함께 삭제됩니다.`, 
      onConfirm: confirmDelete 
    });
  };

  const createNotebook = async () => {
    if (!accessToken || !newNotebookName.trim()) return;
    setIsLoading(true);
    const metadata = { name: newNotebookName, mimeType: 'application/vnd.google-apps.folder', parents: ['appDataFolder'] };
    
    console.log('📁 Creating notebook with metadata:', metadata);
    
    try {
        const res = await axios.post('https://www.googleapis.com/drive/v3/files', metadata, { headers: { Authorization: `Bearer ${accessToken}` } });
        
        console.log('✅ Notebook created successfully:', res.data);
        
        setNewNotebookName('');
        
        // 생성된 노트북을 즉시 목록에 추가
        const newNotebook = {
          id: res.data.id,
          name: res.data.name
        };
        
        const updatedNotebooks = [...notebooks, newNotebook].sort((a, b) => a.name.localeCompare(b.name));
        setNotebooks(updatedNotebooks);
        setSelectedNotebookId(res.data.id);
        
        // 로컬 스토리지에 즉시 백업
        saveToLocalStorage('notebooks', updatedNotebooks);
        
        showToast("노트북이 생성되었습니다.", "success");
        
    } catch (error) { 
        console.error('❌ Error creating notebook:', error); 
        showToast("노트북 생성에 실패했습니다.", "error"); 
    } 
    finally { setIsLoading(false); }
  };
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
        createdTime: new Date().toISOString()
      };
      
      setMemos(prevMemos => {
        const updatedMemos = [newMemo, ...prevMemos];
        // 로컬 스토리지에 즉시 백업
        saveToLocalStorage(`memos-${selectedNotebookId || 'all'}`, updatedMemos);
        return updatedMemos;
      });
      
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
        setSelectedMemo({ id: fileId, name: fileName, content: res.data, isSecret: false });
      } catch (error) { console.error('Error getting memo content:', error); showToast('메모 내용을 불러오는데 실패했습니다.', 'error'); } 
      finally { setIsLoading(false); }
    }
  };
  
  const deleteMemo = (fileId) => {
    if (!accessToken) return;
    const confirmDelete = async () => {
        setIsLoading(true);
        try {
          await axios.delete(`https://www.googleapis.com/drive/v3/files/${fileId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
          
          // 즉시 UI에서 제거
          const updatedMemos = memos.filter(memo => memo.id !== fileId);
          setMemos(updatedMemos);
          saveToLocalStorage(`memos-${selectedNotebookId || 'all'}`, updatedMemos);
          
          showToast('메모가 삭제되었습니다.', 'success');
          
        } catch (error) { 
          console.error('Error deleting memo:', error); 
          showToast('메모 삭제에 실패했습니다.', 'error'); 
        } 
        finally { 
          setIsLoading(false); 
          setModal({ show: false, message: '', onConfirm: () => {} }); 
        }
    };
    setModal({ show: true, message: '정말 이 메모를 삭제하시겠습니까?', onConfirm: confirmDelete });
  };

  const [movingMemo, setMovingMemo] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const moveMemoToNotebook = async (memo, targetNotebookId) => {
    if (!accessToken || !memo || !targetNotebookId) return;
    
    setIsLoading(true);
    try {
      console.log('📂 Moving memo:', {
        memoId: memo.id,
        memoName: memo.name,
        currentParents: memo.parents,
        targetNotebookId
      });
      
      // 현재 부모 폴더 확인
      const currentParent = memo.parents && memo.parents.length > 0 ? memo.parents[0] : 'appDataFolder';
      
      // Google Drive API로 파일의 parents 변경 (더 안전한 방법)
      const updateData = {
        addParents: targetNotebookId === 'appDataFolder' ? 'appDataFolder' : targetNotebookId,
        removeParents: currentParent
      };
      
      console.log('📡 API Update params:', updateData);
      
      await axios.patch(
        `https://www.googleapis.com/drive/v3/files/${memo.id}`,
        {},
        { 
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: updateData
        }
      );
      
      console.log('✅ Memo moved successfully');
      
      // 현재 메모 목록에서 제거
      const updatedMemos = memos.filter(m => m.id !== memo.id);
      setMemos(updatedMemos);
      saveToLocalStorage(`memos-${selectedNotebookId || 'all'}`, updatedMemos);
      
      // 모든 메모 캐시 무효화 (이동으로 인한 변경사항 반영)
      clearMemoCache();
      
      const targetNotebook = notebooks.find(nb => nb.id === targetNotebookId);
      const targetName = targetNotebookId === 'appDataFolder' ? '모든 메모' : (targetNotebook?.name || '모든 메모');
      showToast(`메모가 '${targetName}' 노트북으로 이동되었습니다. 새로고침 버튼(🔄)을 눌러 확인하세요.`, 'success');
      
      setMovingMemo(null);
      setShowMoveModal(false);
      
    } catch (error) {
      console.error('❌ Error moving memo:', error);
      showToast('메모 이동에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemo = async () => {
    if (!accessToken || !selectedMemo) return;
    let contentToSave = selectedMemo.content;
    if (selectedMemo.isSecret) {
      const password = selectedMemo.password;
      if (!password) { showToast('오류: 비밀 메모의 암호를 찾을 수 없습니다.', 'error'); return; }
      contentToSave = CryptoJS.AES.encrypt(selectedMemo.content, password).toString();
    }
    setIsLoading(true);
    try {
      await axios.patch(`https://www.googleapis.com/upload/drive/v3/files/${selectedMemo.id}?uploadType=media`, contentToSave, { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'text/plain' } });
      showToast('메모가 성공적으로 수정되었습니다.', 'success');
    } catch (error) { console.error('Error updating memo:', error); showToast('메모 수정에 실패했습니다.', 'error'); } 
    finally { setIsLoading(false); }
  };

  const handleMarkdownInsert = (startTag, endTag = '') => {
    const textarea = editorRef.current;
    if (!textarea || !selectedMemo) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedMemo.content;
    const selectedText = text.substring(start, end);
    let newText;
    if (selectedText) { newText = `${text.substring(0, start)}${startTag}${selectedText}${endTag}${text.substring(end)}`; } 
    else { newText = `${text.substring(0, start)}${startTag}${endTag}${text.substring(start)}`; }
    setSelectedMemo({ ...selectedMemo, content: newText });
    textarea.focus();
    setTimeout(() => {
        if(selectedText) {
            textarea.selectionStart = start + startTag.length;
            textarea.selectionEnd = start + startTag.length + selectedText.length;
        } else {
            textarea.selectionStart = textarea.selectionEnd = start + startTag.length;
        }
    }, 0);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (accessToken) {
        setIsLoading(true);
        try {
            const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { 'Authorization': `Bearer ${accessToken}` } });
            setUser(userInfoRes.data);
            
            // 함수를 직접 호출 (의존성 배열에서 제거)
            await Promise.all([
              listNotebooks(accessToken),
              listMemos(accessToken, 'all')
            ]);
            
        } catch (error) { 
            console.error(error); 
            showToast('초기 데이터 로딩에 실패했습니다.', 'error'); 
        } 
        finally { setIsLoading(false); }
      }
    };
    fetchInitialData();
  }, [accessToken]); // ← 함수들 제거!
  
  useEffect(() => {
    if (accessToken && selectedNotebookId) {
        listMemos(accessToken, selectedNotebookId);
    }
  }, [accessToken, selectedNotebookId]); // ← listMemos 제거!
  
  const filteredMemos = memos.filter(memo => memo.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
  return (
    <div style={styles.container}>
      {isLoading && <Spinner themeStyles={styles} />}
      <Toast show={toast.show} message={toast.message} type={toast.type} themeStyles={styles} />
      <ConfirmModal show={modal.show} message={modal.message} onConfirm={modal.onConfirm} onCancel={() => setModal({ show: false, message: '', onConfirm: () => {} })} themeStyles={styles} />
      <MoveModal 
        show={showMoveModal} 
        memo={movingMemo} 
        notebooks={notebooks}
        onMove={(memo, targetNotebookId) => {
          moveMemoToNotebook(memo, targetNotebookId);
          setShowMoveModal(false);
        }}
        onCancel={() => {
          setShowMoveModal(false);
          setMovingMemo(null);
        }}
        themeStyles={styles} 
      />
      {!user ? (
        <div style={styles.loginContainer}>
          <h2>나만의 비밀 메모장</h2>
          <p>모든 아이디어를 한 곳에, 안전하게.</p>
          <button onClick={() => login()} style={styles.loginButton} disabled={isLoading}>{isLoading ? "로딩 중..." : "구글 계정으로 로그인 🚀"}</button>
        </div>
      ) : (
        <>
          <div style={styles.leftPanel}>
            <div style={styles.header}>
              <div style={styles.profileSection}>
                <img src={user.picture} alt="프로필" style={styles.profileImage} />
                <span style={{ fontWeight: 'bold' }}>{user.name}</span>
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={toggleTheme} style={styles.iconButton} title="테마 변경">{theme === 'light' ? <MoonIcon/> : <SunIcon/>}</button>
                <button onClick={handleLogout} style={styles.iconButton} title="로그아웃"><LogoutIcon/></button>
              </div>
            </div>

            {/* 강화된 진단 도구 패널 */}
            <div style={styles.section}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>🔧 진단 도구</h3>
                <button 
                  onClick={() => setShowDiagnostics(!showDiagnostics)} 
                  style={styles.iconButton} 
                  title="진단 패널 토글"
                >
                  {showDiagnostics ? '🔼' : '🔽'}
                </button>
              </div>
              
              {showDiagnostics && (
                <div style={styles.diagnosticPanel}>
                  <div style={{marginBottom: '10px', fontSize: '12px', color: styles.textSecondary}}>
                    Google Drive API 연결 문제 해결 도구
                  </div>
                  
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px'}}>
                    <button 
                      onClick={runQuickTest}
                      style={{...styles.button, fontSize: '11px', padding: '5px 8px'}}
                      disabled={!accessToken || isLoading}
                      title="기본 연결 상태 확인"
                    >
                      ⚡ 빠른 테스트
                    </button>
                    
                    <button 
                      onClick={runDiagnosis}
                      style={{...styles.button, fontSize: '11px', padding: '5px 8px'}}
                      disabled={!accessToken || isLoading}
                      title="상세한 API 권한 및 파일 분석"
                    >
                      🔍 종합 진단
                    </button>
                    
                    <button 
                      onClick={runSmartRecovery}
                      style={{...styles.button, fontSize: '11px', padding: '5px 8px', backgroundColor: '#28a745'}}
                      disabled={!accessToken || isLoading}
                      title="모든 메모와 노트북 복구 시도"
                    >
                      🔧 스마트 복구
                    </button>
                  </div>
                  
                  {diagnosticInfo && (
                    <div style={{fontSize: '11px', padding: '8px', backgroundColor: styles.bg, borderRadius: '3px'}}>
                      <strong>진단 결과:</strong><br />
                      총 파일: {diagnosticInfo.totalFiles}개<br />
                      텍스트 파일: {diagnosticInfo.textFiles}개<br />
                      폴더: {diagnosticInfo.folders}개<br />
                      메모 파일: {diagnosticInfo.memoFiles}개
                    </div>
                  )}
                  
                  <div style={{fontSize: '10px', color: styles.textSecondary, marginTop: '8px'}}>
                    💡 문제 발생 시: 1) 빠른 테스트 → 2) 종합 진단 → 3) 스마트 복구 순으로 실행하세요.
                  </div>
                </div>
              )}
            </div>

            <div style={{ ...styles.section, flexShrink: 0 }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>노트북</h3>
                <button onClick={() => listNotebooks(accessToken)} style={{...styles.iconButton}} title="노트북 목록 새로고침">🔄</button>
              </div>
              <ul style={styles.notebookList}>
                <li onClick={() => setSelectedNotebookId('all')} style={selectedNotebookId === 'all' ? styles.activeListItem : styles.listItem}>
                  📋 모든 메모 ({memos.length})
                </li>
                {notebooks.map(nb => (
                  <li key={nb.id} style={selectedNotebookId === nb.id ? styles.activeListItem : styles.listItem}>
                    {editingNotebook?.id === nb.id ? (
                      <div style={{display: 'flex', alignItems: 'center', gap: '5px', width: '100%'}}>
                        <input 
                          type="text" 
                          value={editingNotebookName} 
                          onChange={(e) => setEditingNotebookName(e.target.value)}
                          style={{...styles.input, margin: 0, flex: 1}}
                          onKeyPress={(e) => e.key === 'Enter' && updateNotebook()}
                          autoFocus
                        />
                        <button onClick={updateNotebook} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px'}}>✅</button>
                        <button onClick={() => setEditingNotebook(null)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px'}}>❌</button>
                      </div>
                    ) : (
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}} onClick={() => setSelectedNotebookId(nb.id)}>
                          <BookIcon />
                          <span>{nb.name}</span>
                        </div>
                        <div style={{display: 'flex', gap: '5px'}}>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setEditingNotebook(nb); 
                              setEditingNotebookName(nb.name); 
                            }} 
                            style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.7}}
                            title="노트북 이름 편집"
                          >✏️</button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteNotebook(nb); }} 
                            style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.7}}
                            title="노트북 삭제"
                          >🗑️</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              
              <div style={styles.newNotebookForm}>
                <input type="text" placeholder="새 노트북 이름" value={newNotebookName} onChange={(e) => setNewNotebookName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && createNotebook()} style={styles.input} />
                <button onClick={createNotebook} style={{...styles.button, width: 'auto', flexShrink: 0}}>+</button>
              </div>
            </div>

            <div style={{ ...styles.section, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>메모 ({filteredMemos.length})</h3>
                <button onClick={() => listMemos(accessToken, selectedNotebookId)} style={{...styles.iconButton}} title="메모 목록 새로고침">🔄</button>
              </div>
              
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
                        <div style={{display: 'flex', gap: '5px'}}>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setMovingMemo(memo); 
                              setShowMoveModal(true); 
                            }}
                            style={{
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer', 
                              fontSize: '14px', 
                              padding: '5px',
                              opacity: 0.7
                            }}
                            title="메모 이동"
                          >📂</button>
                          <button 
                            style={styles.deleteButton} 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              deleteMemo(memo.id); 
                            }}
                            title="메모 삭제"
                          >🗑️</button>
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
                  <button style={{...styles.button, width: 'auto', padding: '8px 15px'}} onClick={updateMemo}>{isLoading ? '저장 중...' : '변경사항 저장'}</button>
                </div>
                {viewMode === 'edit' && <MarkdownToolbar onInsert={handleMarkdownInsert} themeStyles={styles} />}
                <div style={styles.editorPane}>
                  {viewMode === 'edit' ? (
                    <textarea ref={editorRef} style={styles.memoContentArea} value={selectedMemo.content} onChange={(e) => setSelectedMemo({ ...selectedMemo, content: e.target.value })} />
                  ) : (
                    <div style={styles.previewContent} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(selectedMemo.content || '')) }}></div>
                  )}
                </div>
              </div>
            ) : ( 
              <div style={styles.placeholder}>
                <p>← 왼쪽에서 노트북과 메모를 선택하세요.</p>
                {memos.length === 0 && (
                  <div style={{marginTop: '20px', textAlign: 'left'}}>
                    <h4>🚀 시작하기</h4>
                    <p>1. 위의 🔧 진단 도구를 열어보세요</p>
                    <p>2. ⚡ 빠른 테스트로 연결을 확인하세요</p>
                    <p>3. 문제가 있다면 🔧 스마트 복구를 시도하세요</p>
                    <p>4. 새 메모를 작성해보세요!</p>
                  </div>
                )}
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
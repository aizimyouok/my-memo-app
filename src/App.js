// src/App.js

import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// 여기에 GCP에서 발급받은 클라이언트 ID를 붙여넣으세요.
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// 환경변수 검증
if (!CLIENT_ID) {
  console.error('Google Client ID가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const SECRET_PREFIX = 'secret_';

// --- 아이콘 컴포넌트들 ---
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const BookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;

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
        deleteButton: { background: 'none', border: 'none', color: c.textSecondary, cursor: 'pointer', fontSize: '16px', padding: '5px' },
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

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modal, setModal] = useState({ show: false, message: '', onConfirm: () => {} });
  const editorRef = useRef(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => { setToast({ show: false, message: '', type: 'success' }); }, duration);
  }, []);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
    },
    onError: (errorResponse) => console.log('Login Failed:', errorResponse),
    scope: SCOPES,
  });
  
  const handleLogout = () => {
    googleLogout(); setUser(null); setAccessToken(null); setNotebooks([]); setMemos([]);
    setSelectedMemo(null); setSelectedNotebookId(null);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('memo-theme', newTheme);
  };

  const listMemos = useCallback(async (token, notebookId) => {
    if (!token || !notebookId) return;
    setIsLoading(true);
    setMemos([]);
    setSelectedMemo(null);
    let query = `'${notebookId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`;
    if (notebookId === 'all') {
        query = `'appDataFolder' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`;
    }
    try {
        const res = await axios.get('https://www.googleapis.com/drive/v3/files', { headers: { Authorization: `Bearer ${token}` }, params: { q: query, fields: 'files(id, name, createdTime)', orderBy: 'createdTime desc' } });
        setMemos(res.data.files);
    } catch (error) { console.error('Error listing memos:', error); showToast("메모 목록을 불러오는데 실패했습니다.", "error"); }
    finally { setIsLoading(false); }
  }, [showToast]);

  const listNotebooks = useCallback(async (token) => {
    if (!token) return;
    try {
        const res = await axios.get('https://www.googleapis.com/drive/v3/files', { headers: { Authorization: `Bearer ${token}` }, params: { q: "mimeType='application/vnd.google-apps.folder' and 'appDataFolder' in parents and trashed=false", fields: 'files(id, name)' } });
        const sortedNotebooks = res.data.files.sort((a, b) => a.name.localeCompare(b.name));
        setNotebooks(sortedNotebooks);
        const notebookToSelect = sortedNotebooks.length > 0 ? sortedNotebooks[0].id : 'all';
        setSelectedNotebookId(notebookToSelect);
    } catch (error) { console.error('Error listing notebooks:', error); showToast("노트북 목록을 불러오는데 실패했습니다.", "error"); }
  }, [showToast]);
  
  const createNotebook = async () => {
    if (!accessToken || !newNotebookName.trim()) return;
    setIsLoading(true);
    const metadata = { name: newNotebookName, mimeType: 'application/vnd.google-apps.folder', parents: ['appDataFolder'] };
    try {
        const res = await axios.post('https://www.googleapis.com/drive/v3/files', metadata, { headers: { Authorization: `Bearer ${accessToken}` } });
        setNewNotebookName('');
        const updatedNotebooks = [...notebooks, res.data].sort((a, b) => a.name.localeCompare(b.name));
        setNotebooks(updatedNotebooks);
        setSelectedNotebookId(res.data.id);
        showToast("노트북이 생성되었습니다.", "success");
    } catch (error) { console.error('Error creating notebook:', error); showToast("노트북 생성에 실패했습니다.", "error"); } 
    finally { setIsLoading(false); }
  };
  
  const createMemo = async () => {
    if (selectedNotebookId === 'all' || !selectedNotebookId) {
        showToast("메모를 저장할 노트북을 먼저 선택해주세요.", "error");
        return;
    }
    if (!accessToken || !newMemoContent.trim() || (isNewMemoSecret && !newMemoPassword.trim())) {
      if (isNewMemoSecret && !newMemoPassword.trim()) showToast('비밀번호를 입력해주세요.', 'error');
      return;
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
    const metadata = { name: fileName, mimeType: 'text/plain', parents: [selectedNotebookId] };
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;
    let multipartRequestBody = delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + contentToSave + close_delim;
    try {
      await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', multipartRequestBody, { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` } });
      showToast('메모가 성공적으로 저장되었습니다.', 'success');
      setNewMemoContent('');
      setIsNewMemoSecret(false);
      setNewMemoPassword('');
      await listMemos(accessToken, selectedNotebookId);
    } catch (error) { console.error('Error creating memo:', error); showToast('메모 저장에 실패했습니다.', 'error'); } 
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
          showToast('메모가 삭제되었습니다.', 'success');
          await listMemos(accessToken, selectedNotebookId);
        } catch (error) { console.error('Error deleting memo:', error); showToast('메모 삭제에 실패했습니다.', 'error'); } 
        finally { setIsLoading(false); setModal({ show: false, message: '', onConfirm: () => {} }); }
    };
    setModal({ show: true, message: '정말 이 메모를 삭제하시겠습니까?', onConfirm: confirmDelete });
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
            await listNotebooks(accessToken);
        } catch (error) { console.error(error); showToast('초기 데이터 로딩에 실패했습니다.', 'error'); } 
        finally { setIsLoading(false); }
      }
    };
    fetchInitialData();
  }, [accessToken, listNotebooks]);
  
  useEffect(() => {
    if (accessToken && selectedNotebookId) {
        listMemos(accessToken, selectedNotebookId);
    }
  }, [accessToken, selectedNotebookId, listMemos]);
  
  const filteredMemos = memos.filter(memo => memo.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

  return (
    <div style={styles.container}>
      {isLoading && <Spinner themeStyles={styles} />}
      <Toast show={toast.show} message={toast.message} type={toast.type} themeStyles={styles} />
      <ConfirmModal show={modal.show} message={modal.message} onConfirm={modal.onConfirm} onCancel={() => setModal({ show: false, message: '', onConfirm: () => {} })} themeStyles={styles} />
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

            <div style={{ ...styles.section, flexShrink: 0 }}>
              <h3>노트북</h3>
              <ul style={styles.notebookList}>
                <li onClick={() => setSelectedNotebookId('all')} style={selectedNotebookId === 'all' ? styles.activeListItem : styles.listItem}>모든 메모</li>
                {notebooks.map(nb => (
                    <li key={nb.id} onClick={() => setSelectedNotebookId(nb.id)} style={selectedNotebookId === nb.id ? styles.activeListItem : styles.listItem}>
                        <BookIcon /> <span>{nb.name}</span>
                    </li>
                ))}
              </ul>
              <div style={styles.newNotebookForm}>
                <input type="text" value={newNotebookName} onChange={e => setNewNotebookName(e.target.value)} placeholder="새 노트북 이름" style={styles.input} onKeyPress={e => e.key === 'Enter' && createNotebook()} />
                <button onClick={createNotebook} style={{...styles.button, width: 'auto', padding: '8px 12px'}}>+</button>
              </div>
            </div>
            
            <div style={{ ...styles.section, flexGrow: 1, display: 'flex', flexDirection: 'column', borderBottom: 'none' }}>
              <h3 style={{marginTop: '10px'}}>새 메모 작성</h3>
              <textarea value={newMemoContent} onChange={(e) => setNewMemoContent(e.target.value)} placeholder="새 메모 내용을 입력하세요..." style={{...styles.input, height: '60px', resize: 'vertical', margin: '10px 0'}} />
              <div style={{ margin: '5px 0' }}>
                  <label><input type="checkbox" checked={isNewMemoSecret} onChange={(e) => setIsNewMemoSecret(e.target.checked)} /> 비밀 메모 🔒</label>
                  {isNewMemoSecret && (<input type="password" value={newMemoPassword} onChange={(e) => setNewMemoPassword(e.target.value)} placeholder="비밀번호" style={{ ...styles.input, marginTop: '5px' }} />)}
              </div>
              <button onClick={createMemo} style={{...styles.button, marginTop: '10px'}} >+ 새 메모 저장</button>

              <h3 style={{marginTop: '20px'}}>메모 목록</h3>
              <input type="text" placeholder="메모 검색..." style={{...styles.input, marginTop: '10px'}} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <ul style={styles.memoList}>
                {filteredMemos.map(memo => (
                    <li key={memo.id} style={{...styles.memoListItem, ...(selectedMemo?.id === memo.id && styles.activeListItem)}} onClick={() => getMemoContent(memo.id, memo.name)}>
                        <span style={styles.memoName}>{memo.name.startsWith(SECRET_PREFIX) ? `🔒 ${memo.name.substring(SECRET_PREFIX.length).replace('.txt', '')}` : memo.name.replace('.txt', '')}</span>
                        <button style={styles.deleteButton} onClick={(e) => { e.stopPropagation(); deleteMemo(memo.id); }}>×</button>
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
            ) : ( <div style={styles.placeholder}><p>← 왼쪽에서 노트북과 메모를 선택하세요.</p></div> )}
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

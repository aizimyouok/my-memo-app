// src/App.js

import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import axios from 'axios';

// 여기에 GCP에서 발급받은 클라이언트 ID를 붙여넣으세요.
const CLIENT_ID = '656430754313-hq9aecvdkdgqu0gbkrfj95c16npv8rv0.apps.googleusercontent.com';

// 우리가 구글에 요청할 권한 목록
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

// 앱의 실제 내용이 담길 컴포넌트
function MemoApp() {
  // === 상태 변수 정의 ===
  const [user, setUser] = useState(null); // 로그인된 사용자 정보
  const [token, setToken] = useState(null); // API 호출을 위한 액세스 토큰
  const [memos, setMemos] = useState([]); // 내 메모 목록
  const [newMemo, setNewMemo] = useState(''); // 새로 작성 중인 메모 내용
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태

  // === 로그인 처리 ===
  const login = useGoogleLogin({
    scope: SCOPES,
    onSuccess: (tokenResponse) => {
      console.log('로그인 성공! 토큰:', tokenResponse);
      setToken(tokenResponse);
    },
    onError: (error) => {
      console.log('로그인 실패', error);
    },
  });

  // === 로그아웃 처리 ===
  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setToken(null);
    setMemos([]);
  };

  // === 메모 목록 불러오기 함수 ===
  const listMemos = async (accessToken) => {
    if (!accessToken) return;
    setIsLoading(true);
    console.log("메모 목록을 불러옵니다...");
    try {
      const res = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          spaces: 'appDataFolder',
          fields: 'files(id, name, createdTime)',
          orderBy: 'createdTime desc'
        }
      });
      console.log('메모 목록 응답:', res.data);
      setMemos(res.data.files);
    } catch (error) {
      console.error('메모 목록 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // === 새 메모 저장 함수 ===
  const createMemo = async () => {
    if (!token || !newMemo.trim()) return;
    setIsLoading(true);
    console.log("새 메모를 저장합니다...");
    const metadata = {
      name: `memo-${Date.now()}.txt`,
      mimeType: 'text/plain',
      parents: ['appDataFolder']
    };
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;
    let multipartRequestBody =
      delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
      delimiter + 'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + newMemo + close_delim;
    try {
      await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', multipartRequestBody, {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        }
      });
      console.log('메모 저장 성공!');
      setNewMemo('');
      await listMemos(token.access_token);
    } catch (error) {
      console.error('메모 저장 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // === useEffect: 토큰이 생기면 사용자 정보와 메모 목록을 가져옴 ===
  useEffect(() => {
    const fetchInitialData = async () => {
      if (token) {
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${token.access_token}` }
        });
        console.log('사용자 정보:', userInfoRes.data);
        setUser(userInfoRes.data);
        await listMemos(token.access_token);
      }
    };
    fetchInitialData().catch(console.error);
  }, [token]);

  // === UI 렌더링 부분 ===
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      {user ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={user.picture} alt="프로필 사진" style={{ borderRadius: '50%', width: '50px' }} />
            <h3>{user.name}님, 환영합니다!</h3>
            <button onClick={handleLogout}>로그아웃</button>
          </div>
          <hr/>
          <div>
            <h3>새 메모 작성</h3>
            <textarea rows="5" cols="60" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} placeholder="여기에 메모를 입력하세요..." style={{ display: 'block', marginBottom: '10px' }}></textarea>
            <button onClick={createMemo} disabled={isLoading || !newMemo.trim()}>{isLoading ? '처리 중...' : '메모 저장'}</button>
          </div>
          <hr />
          <div>
            <h3>내 메모 목록</h3>
            {isLoading && memos.length === 0 && <p>목록을 불러오는 중...</p>}
            <ul>
              {memos.length > 0 ? memos.map(memo => (
                <li key={memo.id}>{memo.name} ({new Date(memo.createdTime).toLocaleString('ko-KR')})</li>
              )) : (
                !isLoading && <p>저장된 메모가 없습니다.</p>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <h2>나만의 비밀 메모장</h2>
          <p>로그인하고 메모를 관리해보세요.</p>
          <button onClick={() => login()} style={{ padding: '10px 15px', fontSize: '16px' }}>구글 계정으로 로그인 🚀</button>
        </div>
      )}
    </div>
  );
}

// 최상위 App 컴포넌트: GoogleOAuthProvider로 전체 앱을 감싸는 역할만 함
function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <MemoApp />
    </GoogleOAuthProvider>
  );
}

export default App;

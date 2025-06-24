# 🚀 메모장 앱 배포 가이드

## 📋 배포 전 체크리스트

### 1. Google OAuth 설정
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** → **사용자 인증 정보** → **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
4. 애플리케이션 유형: **웹 애플리케이션**
5. **승인된 JavaScript 원본** 추가:
   ```
   http://localhost:3000 (개발용)
   https://your-app-name.netlify.app (배포용)
   https://yourdomain.com (커스텀 도메인)
   ```
6. 생성된 **클라이언트 ID**를 `.env` 파일에 업데이트

### 2. 환경 변수 설정
```bash
# .env 파일
REACT_APP_GOOGLE_CLIENT_ID=your-new-client-id-here
```

### 3. OAuth 동의 화면 설정
1. **OAuth 동의 화면** → **외부** 선택 (공개 배포용)
2. 앱 정보 입력:
   - 앱 이름: **보안 메모장**
   - 사용자 지원 이메일: **your-email@example.com**
   - 승인된 도메인: **your-domain.com**
3. 범위 추가: `https://www.googleapis.com/auth/drive`
4. 테스트 사용자 추가 (필요시)

## 🌐 웹 배포 방법

### Netlify 배포
1. 앱 빌드: `npm run build`
2. [Netlify](https://netlify.com) 접속 → 계정 생성/로그인
3. **Sites** → **Add new site** → **Deploy manually**
4. `build` 폴더를 드래그앤드롭
5. 배포 완료!

### Vercel 배포
1. [Vercel](https://vercel.com) 접속 → 계정 생성/로그인
2. GitHub에 코드 푸시
3. Vercel에서 GitHub 저장소 연결
4. 자동 배포 완료!

## 💻 데스크톱 앱 배포

### Electron 빌드
```bash
npm run electron-pack
```

### 배포 파일
- **실행 파일**: `dist/win-unpacked/electron.exe`
- **배포 방법**: `win-unpacked` 폴더 전체를 압축하여 배포

## 👥 다중 사용자 지원

### ✅ 각 사용자별 완전 분리
- 개별 Google 계정 로그인
- 개별 Google Drive 저장소
- 개별 마스터 비밀번호
- 완전 독립적인 데이터

### 🔐 보안 특징
- **AES 암호화**: 모든 메모 데이터 암호화
- **Google Drive 저장**: 클라우드 백업
- **개별 비밀번호**: 메모별 추가 암호화 가능
- **로컬 모드**: 인터넷 없이도 사용 가능

## 📱 PWA (모바일 앱) 기능

### 자동 포함된 기능
- **홈 화면 추가**: 모바일에서 앱처럼 사용
- **오프라인 지원**: 인터넷 없이도 기본 기능 사용
- **푸시 알림**: 향후 확장 가능

## 🛠️ 문제 해결

### OAuth 오류 시
1. Google Cloud Console에서 도메인 확인
2. 클라이언트 ID 재확인
3. 브라우저 캐시 삭제

### 빌드 오류 시
```bash
npm install
npm run build
```

### Electron 오류 시
```bash
npm install electron-is-dev
npm run electron
```

## 📞 지원

문제가 발생하면:
1. 브라우저 개발자 도구 → Console 탭에서 오류 확인
2. GitHub Issues에 오류 로그와 함께 문의
3. 이메일 지원: your-email@example.com

---

## 🎉 배포 성공!

이제 다른 사람들이:
1. 앱 URL에 접속
2. 본인의 Google 계정으로 로그인
3. 본인만의 마스터 비밀번호 설정
4. 안전한 개인 메모장 사용!

**모든 사용자의 데이터는 완전히 분리되고 암호화됩니다.** 🔐

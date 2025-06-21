# 🗒️ 나만의 비밀 메모장

Google Drive를 이용한 클라우드 기반 개인 메모 애플리케이션입니다.

## ✨ 주요 기능

- 🔐 **비밀 메모**: AES 암호화로 보호되는 프라이빗 메모
- 📖 **노트북 분류**: 메모를 카테고리별로 정리
- 🌓 **다크/라이트 테마**: 사용자 취향에 맞는 테마 선택
- 📝 **마크다운 지원**: 마크다운 문법으로 풍부한 텍스트 편집
- 🔍 **실시간 검색**: 메모 제목으로 빠른 검색
- ☁️ **클라우드 동기화**: Google Drive와 자동 동기화
- 📱 **반응형 디자인**: 모든 디바이스에서 최적화된 경험

## 🚀 시작하기

### 필수 요구사항

- Node.js 16.0.0 이상
- Google Cloud Console 프로젝트
- Google Drive API 활성화

### 설치 방법

1. **레포지토리 클론**
   ```bash
   git clone https://github.com/aizimyouok/my-memo-app.git
   cd my-memo-app
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경변수 설정**
   ```bash
   # .env 파일 생성 (이미 생성됨)
   # REACT_APP_GOOGLE_CLIENT_ID를 본인의 Google Client ID로 변경
   ```

4. **Google Cloud Console 설정**
   - [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
   - Google Drive API 활성화
   - OAuth 2.0 클라이언트 ID 생성
   - 승인된 JavaScript 원본에 `http://localhost:3000` 추가

5. **개발 서버 실행**
   ```bash
   npm start
   ```

## 🛠️ 기술 스택

- **Frontend**: React 19, JavaScript
- **인증**: Google OAuth 2.0
- **스토리지**: Google Drive AppData
- **암호화**: CryptoJS (AES)
- **스타일링**: Vanilla CSS (CSS-in-JS)
- **마크다운**: Marked + DOMPurify
- **빌드**: Create React App + Craco

## 📁 프로젝트 구조

```
my-memo-app/
├── public/
├── src/
│   ├── App.js          # 메인 애플리케이션 컴포넌트
│   ├── App.css         # 스타일시트
│   └── index.js        # 앱 엔트리 포인트
├── .env                # 환경변수 (Git에서 제외됨)
├── craco.config.js     # Webpack 설정 오버라이드
└── package.json        # 프로젝트 의존성
```

## 🔒 보안 기능

- **클라이언트 사이드 암호화**: 비밀 메모는 AES-256으로 암호화
- **OAuth 2.0 인증**: Google 계정을 통한 안전한 로그인
- **AppData 폴더**: Google Drive의 앱 전용 폴더에 데이터 저장
- **XSS 방지**: DOMPurify로 마크다운 렌더링 시 XSS 공격 방지

## 🚀 배포

### Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경변수 `REACT_APP_GOOGLE_CLIENT_ID` 설정
3. Google Cloud Console에서 배포된 도메인을 승인된 JavaScript 원본에 추가

### Netlify 배포

1. Netlify에 프로젝트 연결
2. Build command: `npm run build`
3. Publish directory: `build`
4. 환경변수 `REACT_APP_GOOGLE_CLIENT_ID` 설정

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📧 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 등록해 주세요.

---

**⚠️ 주의사항**: .env 파일에 있는 Google Client ID는 절대 공개 저장소에 커밋하지 마세요!
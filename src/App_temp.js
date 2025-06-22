// 🔐 완전 암호화 메모장 앱 - 향상된 탭 기능 적용
// 모든 데이터가 암호화되어 Google Drive에 저장됩니다.
// 
// 🔥 최신 개선사항 (2025-06-23):
// ✅ 우클릭 문제 해결 - 항상 보이는 편집/삭제 버튼으로 대체
// ✅ 메모 폴더 이동 버튼 명확히 표시 - "📁 이동" 텍스트 포함
// ✅ 다크모드 탭 글씨 색상 문제 해결 - 강제 흰색 적용
// ✅ 탭 아이콘 제거 및 가로 길이 축소 - 더 컴팩트한 디자인
// ✅ 컨텍스트 메뉴 완전 제거 - 직관적인 버튼 인터페이스로 개선

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
};
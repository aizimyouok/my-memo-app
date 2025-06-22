// 🔐 완전 암호화 메모장 앱 - 향상된 탭 기능 적용
// 모든 데이터가 암호화되어 Google Drive에 저장됩니다.

import { GoogleOAuthProvider, googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './enhanced-tabs.css';
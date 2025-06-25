// 📱 모바일 최적화 유틸리티
import { useState, useEffect } from 'react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return isMobile;
};

// 🎨 모바일 최적화 테마 스타일
const getMobileOptimizedStyles = (theme = 'light', isMobile = false) => {
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
    // 📱 반응형 컨테이너
    container: { 
      display: 'flex', 
      height: '100vh', 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", 
      backgroundColor: c.bg, 
      color: c.text,
      flexDirection: isMobile ? 'column' : 'row' // 모바일에서는 세로 레이아웃
    },
    
    // 📱 모바일 최적화 왼쪽 패널
    leftPanel: { 
      width: isMobile ? '100%' : '450px',
      height: isMobile ? 'auto' : '100vh',
      maxHeight: isMobile ? '40vh' : 'none',
      borderRight: isMobile ? 'none' : `1px solid ${c.border}`,
      borderBottom: isMobile ? `1px solid ${c.border}` : 'none',
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: c.panelBg,
      overflowY: isMobile ? 'auto' : 'visible'
    },
    
    // 📱 모바일 최적화 오른쪽 패널
    rightPanel: { 
      flexGrow: 1, 
      padding: isMobile ? '12px' : '24px', 
      display: 'flex', 
      flexDirection: 'column',
      height: isMobile ? '60vh' : 'auto',
      overflowY: 'auto'
    },
    
    // 📱 모바일 최적화 헤더
    header: { 
      padding: isMobile ? '12px 16px' : '20px', 
      borderBottom: `1px solid ${c.border}`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      gap: isMobile ? '8px' : '0'
    },
    
    // 📱 모바일 최적화 프로필 섹션
    profileSection: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '8px' : '12px',
      fontSize: isMobile ? '14px' : '16px'
    },
    
    profileImage: { 
      borderRadius: '50%', 
      width: isMobile ? '28px' : '36px', 
      height: isMobile ? '28px' : '36px' 
    },
    
    // 📱 모바일 최적화 섹션
    section: { 
      padding: isMobile ? '8px 12px' : '12px 20px',
      borderBottom: `1px solid ${c.border}`
    },
    
    sectionTitle: {
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: '600',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    
    // 📱 모바일 최적화 입력 필드
    input: { 
      width: '100%', 
      padding: isMobile ? '14px 12px' : '12px', 
      border: `1px solid ${c.border}`, 
      borderRadius: '8px', 
      backgroundColor: c.bg, 
      color: c.text, 
      outline: 'none',
      fontSize: isMobile ? '16px' : '14px', // iOS 줌 방지를 위해 16px
      minHeight: isMobile ? '44px' : 'auto' // 터치 친화적 높이
    },
    
    // 📱 모바일 최적화 버튼
    button: {
      width: '100%',
      padding: isMobile ? '16px' : '16px',
      fontSize: isMobile ? '16px' : '16px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      minHeight: isMobile ? '48px' : 'auto' // 터치 친화적 높이
    },
    
    // 📱 모바일 최적화 아이콘 버튼
    iconButton: { 
      background: 'none', 
      border: `1px solid ${c.border}`, 
      color: c.textSecondary, 
      cursor: 'pointer', 
      padding: isMobile ? '12px' : '8px', 
      borderRadius: '8px',
      transition: 'all 0.2s',
      minWidth: isMobile ? '44px' : 'auto',
      minHeight: isMobile ? '44px' : 'auto'
    },
    
    // 📱 모바일 최적화 리스트
    list: { 
      listStyle: 'none', 
      padding: 0, 
      margin: 0 
    },
    
    listItem: { 
      padding: isMobile ? '16px 12px' : '12px 16px', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '8px' : '12px', 
      borderRadius: '8px',
      margin: '4px 0',
      transition: 'background-color 0.2s',
      minHeight: isMobile ? '56px' : 'auto' // 터치 친화적 높이
    },
    
    activeListItem: { 
      backgroundColor: c.activeBg, 
      fontWeight: '600'
    },
    
    // 📱 모바일 최적화 에디터
    editor: {
      flexGrow: 1,
      border: 'none',
      padding: isMobile ? '16px' : '20px',
      fontSize: isMobile ? '16px' : '16px',
      fontFamily: isMobile ? 'system-ui, -apple-system' : 'Monaco, Menlo, monospace',
      resize: 'none',
      outline: 'none',
      backgroundColor: c.bg,
      color: c.text,
      lineHeight: 1.6
    },
    
    // 🔐 모바일 최적화 보안 컨테이너
    securityContainer: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: isMobile ? '12px' : '20px',
      backgroundColor: c.bg,
      zIndex: 1000
    },
    
    securityCard: {
      backgroundColor: c.cardBg,
      borderRadius: '16px',
      padding: isMobile ? '24px 20px' : '40px',
      boxShadow: `0 8px 32px ${c.shadowColor}`,
      border: `1px solid ${c.border}`,
      maxWidth: isMobile ? '100%' : '500px',
      width: '100%',
      maxHeight: isMobile ? '90vh' : 'auto',
      overflowY: isMobile ? 'auto' : 'visible'
    },
    
    securityHeader: {
      textAlign: 'center',
      marginBottom: isMobile ? '20px' : '30px'
    },
    
    securityIcon: {
      fontSize: isMobile ? '36px' : '48px',
      marginBottom: '16px'
    },
    
    // 📱 모바일 최적화 비밀번호 입력
    passwordInput: {
      width: '100%',
      padding: isMobile ? '16px 12px' : '16px',
      fontSize: '16px',
      border: `2px solid ${c.border}`,
      borderRadius: '12px',
      backgroundColor: c.bg,
      color: c.text,
      outline: 'none',
      marginBottom: '16px',
      transition: 'border-color 0.3s',
      minHeight: isMobile ? '48px' : 'auto'
    },
    
    // 📱 추가 색상들
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
    
    // 기타 스타일들 유지
    statusCard: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: isMobile ? '13px' : '14px'
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
    
    errorMessage: {
      color: c.danger,
      fontSize: isMobile ? '13px' : '14px',
      marginBottom: '16px',
      padding: '12px',
      backgroundColor: `${c.danger}10`,
      borderRadius: '8px',
      border: `1px solid ${c.danger}30`
    },
    
    helpText: {
      fontSize: isMobile ? '11px' : '12px',
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: '20px',
      lineHeight: 1.5
    },
    
    // 📱 모바일 최적화 모달
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 2000,
      padding: isMobile ? '12px' : '20px'
    },
    modalContent: {
      backgroundColor: c.cardBg, 
      padding: isMobile ? '20px 16px' : '32px', 
      borderRadius: '16px',
      minWidth: isMobile ? '100%' : '400px', 
      maxWidth: isMobile ? '100%' : '600px', 
      maxHeight: isMobile ? '90vh' : '80vh', 
      overflow: 'auto', 
      boxShadow: `0 16px 64px ${c.shadowColor}`
    },
    
    // 기타 스타일들...
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
    
    toast: { 
      position: 'fixed', 
      bottom: isMobile ? '12px' : '24px', 
      left: '50%', 
      transform: 'translateX(-50%)', 
      padding: isMobile ? '12px 16px' : '16px 24px', 
      borderRadius: '12px', 
      color: 'white', 
      zIndex: 1000, 
      minWidth: isMobile ? '280px' : '300px', 
      textAlign: 'center',
      boxShadow: `0 8px 32px ${c.shadowColor}`,
      fontSize: isMobile ? '14px' : '16px'
    },
    toastSuccess: { backgroundColor: c.success },
    toastError: { backgroundColor: c.danger },
    toastWarning: { backgroundColor: c.warning, color: c.text }
  };
};

export { useIsMobile, getMobileOptimizedStyles };
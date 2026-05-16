import React, { useState } from 'react';
import { IconSettings, IconLock, IconDownload, IconUpload, IconTrash, IconLogout, IconMoon, IconSun, IconDeviceMobile } from '@tabler/icons-react';

const MobileSettingsTab = ({ 
  user,
  appData,
  onPasswordChange,
  onDataExport,
  onDataImport,
  onClearAllData,
  onLogout,
  darkMode,
  onDarkModeToggle,
  viewMode,
  onViewModeChange
}) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordSubmit = () => {
    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (newPassword.length < 4) {
      alert('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    onPasswordChange(oldPassword, newPassword);
    setShowPasswordForm(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClearData = () => {
    if (window.confirm('모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      if (window.confirm('정말로 모든 메모와 노트북을 삭제하시겠습니까?')) {
        onClearAllData();
      }
    }
  };

  const styles = {
    container: {
      height: 'calc(100vh - 70px)',
      backgroundColor: '#f8fafc',
      overflow: 'auto'
    },
    header: {
      backgroundColor: 'white',
      padding: '16px',
      borderBottom: '1px solid #e5e7eb',
      position: 'sticky',
      top: 0,
      zIndex: 10
    },
    title: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#1f2937'
    },
    content: {
      padding: '16px 16px 80px'
    },
    section: {
      backgroundColor: 'white',
      borderRadius: '12px',
      marginBottom: '16px',
      overflow: 'hidden'
    },
    sectionHeader: {
      padding: '16px',
      borderBottom: '1px solid #f3f4f6',
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937'
    },
    settingItem: {
      padding: '16px',
      borderBottom: '1px solid #f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease'
    },
    settingItemLast: {
      borderBottom: 'none'
    },
    settingLeft: {
      display: 'flex',
      alignItems: 'center',
      flex: 1
    },
    settingIcon: {
      marginRight: '12px',
      color: '#6b7280'
    },
    settingInfo: {
      flex: 1
    },
    settingTitle: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#1f2937',
      marginBottom: '2px'
    },
    settingDescription: {
      fontSize: '12px',
      color: '#6b7280'
    },
    toggle: {
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      position: 'relative'
    },
    toggleActive: {
      backgroundColor: '#3b82f6'
    },
    toggleInactive: {
      backgroundColor: '#d1d5db'
    },
    toggleKnob: {
      width: '20px',
      height: '20px',
      borderRadius: '10px',
      backgroundColor: 'white',
      position: 'absolute',
      top: '2px',
      transition: 'transform 0.2s ease'
    },
    toggleKnobActive: {
      transform: 'translateX(20px)'
    },
    toggleKnobInactive: {
      transform: 'translateX(2px)'
    },
    button: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    dangerButton: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    userInfo: {
      padding: '16px',
      display: 'flex',
      alignItems: 'center'
    },
    userAvatar: {
      width: '48px',
      height: '48px',
      borderRadius: '24px',
      marginRight: '12px'
    },
    userName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '2px'
    },
    userEmail: {
      fontSize: '14px',
      color: '#6b7280'
    },
    passwordForm: {
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderTop: '1px solid #e5e7eb'
    },
    input: {
      width: '100%',
      padding: '12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      marginBottom: '12px',
      outline: 'none'
    },
    formActions: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end'
    },
    cancelButton: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      color: '#6b7280',
      cursor: 'pointer'
    },
    statItem: {
      textAlign: 'center',
      flex: 1
    },
    statNumber: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#1f2937',
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '12px',
      color: '#6b7280'
    },
    statsContainer: {
      display: 'flex',
      padding: '16px',
      gap: '16px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>설정</h1>
      </div>

      <div style={styles.content}>
        {/* 사용자 정보 */}
        <div style={styles.section}>
          <div style={styles.userInfo}>
            <img 
              src={user?.picture} 
              alt="Profile" 
              style={styles.userAvatar}
            />
            <div>
              <div style={styles.userName}>{user?.name}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          
          <div style={styles.statsContainer}>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>{appData.memos.length}</div>
              <div style={styles.statLabel}>메모</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>{appData.notebooks.length}</div>
              <div style={styles.statLabel}>노트북</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>
                {appData.memos.filter(m => m.starred).length}
              </div>
              <div style={styles.statLabel}>즐겨찾기</div>
            </div>
          </div>
        </div>

        {/* 표시 설정 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>표시 설정</div>
          
          <div style={styles.settingItem}>
            <div style={styles.settingLeft}>
              <div style={styles.settingIcon}>
                {darkMode ? <IconMoon size={20} /> : <IconSun size={20} />}
              </div>
              <div style={styles.settingInfo}>
                <div style={styles.settingTitle}>다크 모드</div>
                <div style={styles.settingDescription}>어두운 테마 사용</div>
              </div>
            </div>
            <button
              style={{
                ...styles.toggle,
                ...(darkMode ? styles.toggleActive : styles.toggleInactive)
              }}
              onClick={onDarkModeToggle}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  ...(darkMode ? styles.toggleKnobActive : styles.toggleKnobInactive)
                }}
              />
            </button>
          </div>

          <div style={{...styles.settingItem, ...styles.settingItemLast}}>
            <div style={styles.settingLeft}>
              <div style={styles.settingIcon}>
                {viewMode === 'mobile' ? <IconDeviceMobile size={20} /> : <span style={{fontSize: '20px'}}>🖥️</span>}
              </div>
              <div style={styles.settingInfo}>
                <div style={styles.settingTitle}>보기 모드</div>
                <div style={styles.settingDescription}>
                  {viewMode === 'mobile' ? '모바일 레이아웃' : '데스크톱 레이아웃'}
                </div>
              </div>
            </div>
            <button
              style={{...styles.button, ...styles.primaryButton}}
              onClick={() => onViewModeChange(viewMode === 'mobile' ? 'desktop' : 'mobile')}
            >
              전환
            </button>
          </div>
        </div>

        {/* 보안 설정 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>보안</div>
          
          <div 
            style={{...styles.settingItem, ...styles.settingItemLast}}
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            <div style={styles.settingLeft}>
              <div style={styles.settingIcon}>
                <IconLock size={20} />
              </div>
              <div style={styles.settingInfo}>
                <div style={styles.settingTitle}>비밀번호 변경</div>
                <div style={styles.settingDescription}>앱 잠금 비밀번호 변경</div>
              </div>
            </div>
          </div>

          {showPasswordForm && (
            <div style={styles.passwordForm}>
              <input
                type="password"
                placeholder="현재 비밀번호"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={styles.input}
              />
              <input
                type="password"
                placeholder="새 비밀번호"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
              />
              <input
                type="password"
                placeholder="새 비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
              />
              <div style={styles.formActions}>
                <button
                  style={styles.cancelButton}
                  onClick={() => setShowPasswordForm(false)}
                >
                  취소
                </button>
                <button
                  style={{...styles.button, ...styles.primaryButton}}
                  onClick={handlePasswordSubmit}
                >
                  변경
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 데이터 관리 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>데이터 관리</div>
          
          <div style={styles.settingItem}>
            <div style={styles.settingLeft}>
              <div style={styles.settingIcon}>
                <IconDownload size={20} />
              </div>
              <div style={styles.settingInfo}>
                <div style={styles.settingTitle}>데이터 내보내기</div>
                <div style={styles.settingDescription}>모든 메모를 파일로 저장</div>
              </div>
            </div>
            <button
              style={{...styles.button, ...styles.primaryButton}}
              onClick={onDataExport}
            >
              내보내기
            </button>
          </div>

          <div style={styles.settingItem}>
            <div style={styles.settingLeft}>
              <div style={styles.settingIcon}>
                <IconUpload size={20} />
              </div>
              <div style={styles.settingInfo}>
                <div style={styles.settingTitle}>데이터 가져오기</div>
                <div style={styles.settingDescription}>백업 파일에서 복원</div>
              </div>
            </div>
            <button
              style={{...styles.button, ...styles.primaryButton}}
              onClick={onDataImport}
            >
              가져오기
            </button>
          </div>

          <div style={{...styles.settingItem, ...styles.settingItemLast}}>
            <div style={styles.settingLeft}>
              <div style={styles.settingIcon}>
                <IconTrash size={20} />
              </div>
              <div style={styles.settingInfo}>
                <div style={styles.settingTitle}>모든 데이터 삭제</div>
                <div style={styles.settingDescription}>모든 메모와 노트북 삭제</div>
              </div>
            </div>
            <button
              style={{...styles.button, ...styles.dangerButton}}
              onClick={handleClearData}
            >
              삭제
            </button>
          </div>
        </div>

        {/* 계정 */}
        <div style={styles.section}>
          <div 
            style={{...styles.settingItem, ...styles.settingItemLast}}
            onClick={onLogout}
          >
            <div style={styles.settingLeft}>
              <div style={styles.settingIcon}>
                <IconLogout size={20} />
              </div>
              <div style={styles.settingInfo}>
                <div style={styles.settingTitle}>로그아웃</div>
                <div style={styles.settingDescription}>Google 계정에서 로그아웃</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSettingsTab;
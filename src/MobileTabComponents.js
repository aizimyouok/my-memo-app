// 📁 노트북 관리 탭 화면
import React, { useState } from 'react';

const MobileNotebooksTab = ({ 
  notebooks,
  selectedNotebookId,
  setSelectedNotebookId,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  getMemosByNotebook,
  styles 
}) => {
  const [showAddNotebook, setShowAddNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [editingNotebook, setEditingNotebook] = useState(null);

  const handleCreateNotebook = () => {
    if (newNotebookName.trim()) {
      createNotebook(newNotebookName.trim());
      setNewNotebookName('');
      setShowAddNotebook(false);
    }
  };

  const handleUpdateNotebook = (notebookId, newName) => {
    if (newName.trim()) {
      updateNotebook(notebookId, newName.trim());
      setEditingNotebook(null);
    }
  };

  return (
    <div style={{
      height: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: styles.panelBg
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${styles.border}`,
        backgroundColor: styles.panelBg
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            📁 노트북 ({notebooks.length})
          </h2>
          <button
            onClick={() => setShowAddNotebook(!showAddNotebook)}
            style={{
              ...styles.iconButton,
              backgroundColor: styles.accent,
              color: 'white',
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: '20px'
            }}
          >
            {showAddNotebook ? '✕' : '➕'}
          </button>
        </div>

        {/* 새 노트북 추가 */}
        {showAddNotebook && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: styles.bg,
            borderRadius: '8px',
            border: `1px solid ${styles.border}`
          }}>
            <input
              type="text"
              placeholder="노트북 이름..."
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              style={{
                ...styles.input,
                width: '100%',
                marginBottom: '8px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateNotebook()}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateNotebook}
                disabled={!newNotebookName.trim()}
                style={{
                  ...styles.button,
                  ...styles.successButton,
                  flex: 1,
                  minHeight: '44px'
                }}
              >
                ➕ 추가
              </button>
              <button
                onClick={() => {
                  setNewNotebookName('');
                  setShowAddNotebook(false);
                }}
                style={{
                  ...styles.button,
                  backgroundColor: styles.textSecondary,
                  color: 'white',
                  minHeight: '44px',
                  padding: '0 16px'
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 노트북 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 전체 메모 */}
        <div
          onClick={() => setSelectedNotebookId('all')}
          style={{
            padding: '16px',
            borderBottom: `1px solid ${styles.border}`,
            backgroundColor: selectedNotebookId === 'all' ? styles.activeBg : 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '4px'
              }}>
                <span style={{ fontSize: '18px' }}>📋</span>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  모든 메모
                </h3>
              </div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: styles.textSecondary
              }}>
                전체 메모 보기
              </p>
            </div>
            <div style={{
              backgroundColor: styles.accent,
              color: 'white',
              borderRadius: '12px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              전체
            </div>
          </div>
        </div>

        {/* 개별 노트북들 */}
        {notebooks.map(notebook => {
          const memoCount = getMemosByNotebook(notebook.id).length;
          
          return (
            <div
              key={notebook.id}
              onClick={() => setSelectedNotebookId(notebook.id)}
              style={{
                padding: '16px',
                borderBottom: `1px solid ${styles.border}`,
                backgroundColor: selectedNotebookId === notebook.id ? styles.activeBg : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontSize: '18px' }}>📁</span>
                    {editingNotebook === notebook.id ? (
                      <input
                        type="text"
                        defaultValue={notebook.name}
                        style={{
                          ...styles.input,
                          padding: '4px 8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          width: '200px'
                        }}
                        autoFocus
                        onBlur={(e) => handleUpdateNotebook(notebook.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateNotebook(notebook.id, e.target.value);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {notebook.name}
                      </h3>
                    )}
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: styles.textSecondary
                  }}>
                    생성일: {new Date(notebook.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    backgroundColor: styles.accent,
                    color: 'white',
                    borderRadius: '12px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {memoCount}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNotebook(notebook.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      color: styles.textSecondary,
                      fontSize: '16px'
                    }}
                  >
                    ✏️
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotebook(notebook.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      color: styles.danger,
                      fontSize: '16px'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ⚙️ 설정 탭 화면
const MobileSettingsTab = ({ 
  theme,
  toggleTheme,
  user,
  handleLogout,
  appData,
  showTrashModal,
  setShowTrashModal,
  styles 
}) => {
  return (
    <div style={{
      height: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: styles.panelBg
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${styles.border}`,
        backgroundColor: styles.panelBg
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>
          ⚙️ 설정
        </h2>
      </div>

      {/* 설정 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 사용자 정보 */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${styles.border}`
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: styles.textSecondary
          }}>
            👤 계정 정보
          </h3>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            {user?.picture && (
              <img 
                src={user.picture} 
                alt="Profile" 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '24px'
                }}
              />
            )}
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '14px', color: styles.textSecondary }}>
                {user?.email}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              ...styles.button,
              ...styles.dangerButton,
              width: '100%',
              minHeight: '44px'
            }}
          >
            🚪 로그아웃
          </button>
        </div>

        {/* 앱 설정 */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${styles.border}`
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            color: styles.textSecondary
          }}>
            🎨 앱 설정
          </h3>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '500' }}>
                {theme === 'light' ? '☀️' : '🌙'} 테마
              </div>
              <div style={{ fontSize: '14px', color: styles.textSecondary }}>
                {theme === 'light' ? '라이트 모드' : '다크 모드'}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                ...styles.iconButton,
                backgroundColor: styles.accent,
                color: 'white',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '22px'
              }}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>

        {/* 데이터 관리 */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${styles.border}`
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            color: styles.textSecondary
          }}>
            💾 데이터 관리
          </h3>
          
          <button
            onClick={() => setShowTrashModal(true)}
            style={{
              ...styles.button,
              backgroundColor: styles.warning,
              color: 'white',
              width: '100%',
              minHeight: '44px',
              marginBottom: '8px'
            }}
          >
            🗑️ 휴지통 ({appData.deletedItems.length})
          </button>
        </div>

        {/* 앱 정보 */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${styles.border}`
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            color: styles.textSecondary
          }}>
            📊 앱 정보
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            padding: '12px',
            backgroundColor: styles.bg,
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <div style={{ fontWeight: '600' }}>📝 총 메모</div>
              <div style={{ color: styles.textSecondary }}>
                {appData.memos.length}개
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>📁 노트북</div>
              <div style={{ color: styles.textSecondary }}>
                {appData.notebooks.length}개
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>🗑️ 휴지통</div>
              <div style={{ color: styles.textSecondary }}>
                {appData.deletedItems.length}개
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>💾 마지막 백업</div>
              <div style={{ color: styles.textSecondary }}>
                {appData.metadata.lastBackup 
                  ? new Date(appData.metadata.lastBackup).toLocaleDateString('ko-KR')
                  : '없음'
                }
              </div>
            </div>
          </div>
        </div>

        {/* 보안 정보 */}
        <div style={{
          padding: '16px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            color: styles.textSecondary
          }}>
            🔐 보안 상태
          </h3>
          
          <div style={{
            ...styles.statusCard,
            ...styles.statusSecure,
            marginBottom: 0
          }}>
            <span style={{ fontSize: '16px' }}>🔐</span>
            <span>모든 데이터가 AES 암호화로 보호됩니다</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export { MobileNotebooksTab, MobileSettingsTab };
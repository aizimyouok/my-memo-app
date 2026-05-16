// 📱 모바일 전용 하단 탭 네비게이션 컴포넌트
import React, { useState } from 'react';

// 📱 하단 탭 네비게이션
const MobileBottomTabs = ({ 
  activeTab, 
  onTabChange, 
  memoCount, 
  notebookCount, 
  styles 
}) => {
  const tabs = [
    {
      id: 'editor',
      icon: '📝',
      label: '에디터',
      badge: null
    },
    {
      id: 'memos',
      icon: '📋',
      label: '메모',
      badge: memoCount
    },
    {
      id: 'notebooks',
      icon: '📁',
      label: '노트북',
      badge: notebookCount
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: '설정',
      badge: null
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
      backgroundColor: styles.panelBg,
      borderTop: `1px solid ${styles.border}`,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom)', // iOS 노치 대응
      boxShadow: `0 -2px 10px ${styles.shadowColor}`
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            color: activeTab === tab.id ? styles.accent : styles.textSecondary,
            position: 'relative'
          }}
        >
          <div style={{
            fontSize: '20px',
            filter: activeTab === tab.id ? 'none' : 'grayscale(0.3)',
            transform: activeTab === tab.id ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.2s'
          }}>
            {tab.icon}
          </div>
          
          <span style={{
            fontSize: '11px',
            fontWeight: activeTab === tab.id ? '600' : '400'
          }}>
            {tab.label}
          </span>
          
          {/* 배지 표시 */}
          {tab.badge !== null && tab.badge > 0 && (
            <div style={{
              position: 'absolute',
              top: '2px',
              right: '50%',
              transform: 'translateX(50%)',
              backgroundColor: styles.accent,
              color: 'white',
              borderRadius: '10px',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: '600',
              padding: '0 4px'
            }}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </div>
          )}
          
          {/* 활성 탭 인디케이터 */}
          {activeTab === tab.id && (
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '4px',
              height: '4px',
              backgroundColor: styles.accent,
              borderRadius: '2px'
            }} />
          )}
        </button>
      ))}
    </div>
  );
};

// 📝 메모 에디터 탭 화면
const MobileEditorTab = ({ 
  selectedMemo, 
  setSelectedMemo, 
  updateMemo, 
  styles, 
  isLoading 
}) => {
  return (
    <div style={{
      height: 'calc(100vh - 80px)', // 하단 탭 높이 제외
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      paddingBottom: '0'
    }}>
      {selectedMemo ? (
        <>
          {/* 메모 헤더 */}
          <div style={{
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: `1px solid ${styles.border}`
          }}>
            <input
              type="text"
              value={selectedMemo.title}
              onChange={(e) => setSelectedMemo({
                ...selectedMemo,
                title: e.target.value
              })}
              style={{
                ...styles.input,
                fontSize: '18px',
                fontWeight: '600',
                border: 'none',
                padding: '8px 0',
                backgroundColor: 'transparent'
              }}
              placeholder="메모 제목..."
            />
            <div style={{
              fontSize: '12px',
              color: styles.textSecondary,
              marginTop: '4px'
            }}>
              {selectedMemo.hasPrivatePassword && '🔒 '}
              마지막 수정: {new Date(selectedMemo.modifiedAt).toLocaleString('ko-KR')}
            </div>
          </div>

          {/* 메모 에디터 */}
          <textarea
            value={selectedMemo.content}
            onChange={(e) => setSelectedMemo({
              ...selectedMemo,
              content: e.target.value,
              title: e.target.value.split('\n')[0].slice(0, 50).trim() || '제목 없는 메모'
            })}
            style={{
              flex: 1,
              border: 'none',
              padding: '0',
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              resize: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: styles.text,
              lineHeight: 1.6
            }}
            placeholder="메모를 작성하세요..."
          />

          {/* 저장 버튼 */}
          <div style={{
            padding: '16px 0',
            borderTop: `1px solid ${styles.border}`,
            marginTop: '16px'
          }}>
            <button
              onClick={() => updateMemo(selectedMemo)}
              disabled={isLoading}
              style={{
                ...styles.button,
                ...styles.successButton,
                width: '100%',
                minHeight: '48px'
              }}
            >
              {isLoading ? '저장 중...' : '💾 저장'}
            </button>
          </div>
        </>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          color: styles.textSecondary
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ margin: '0 0 8px 0' }}>메모 선택</h3>
          <p style={{ margin: 0 }}>
            아래 메모 탭에서<br/>
            편집할 메모를 선택하세요
          </p>
        </div>
      )}
    </div>
  );
};

// 📋 메모 목록 탭 화면
const MobileMemosTab = ({ 
  filteredMemos,
  selectedMemo,
  onMemoSelect,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  newMemoContent,
  setNewMemoContent,
  createMemo,
  deleteMemo,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  getPaginatedMemos,
  getTotalPages,
  goToPage,
  styles,
  isLoading
}) => {
  const [showNewMemo, setShowNewMemo] = useState(false);

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
            📋 메모 ({filteredMemos.length})
          </h2>
          <button
            onClick={() => setShowNewMemo(!showNewMemo)}
            style={{
              ...styles.iconButton,
              backgroundColor: styles.accent,
              color: 'white',
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: '20px'
            }}
          >
            {showNewMemo ? '✕' : '➕'}
          </button>
        </div>

        {/* 새 메모 작성 */}
        {showNewMemo && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: styles.bg,
            borderRadius: '8px',
            border: `1px solid ${styles.border}`
          }}>
            <textarea
              placeholder="새 메모 작성..."
              value={newMemoContent}
              onChange={(e) => setNewMemoContent(e.target.value)}
              style={{
                ...styles.input,
                width: '100%',
                height: '80px',
                marginBottom: '8px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  createMemo();
                  setShowNewMemo(false);
                }}
                disabled={!newMemoContent.trim() || isLoading}
                style={{
                  ...styles.button,
                  ...styles.successButton,
                  flex: 1,
                  minHeight: '44px'
                }}
              >
                💾 저장
              </button>
              <button
                onClick={() => {
                  setNewMemoContent('');
                  setShowNewMemo(false);
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

        {/* 검색 */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <input
            type="text"
            placeholder="🔍 메모 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              ...styles.input,
              width: '100%',
              paddingLeft: '12px'
            }}
          />
        </div>

        {/* 정렬 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              ...styles.input,
              flex: 1,
              fontSize: '14px'
            }}
          >
            <option value="modifiedAt">📅 수정일순</option>
            <option value="createdAt">🆕 생성일순</option>
            <option value="title">🔤 제목순</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            style={{
              ...styles.iconButton,
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* 메모 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {getPaginatedMemos().map(memo => (
          <div
            key={memo.id}
            onClick={() => onMemoSelect(memo)}
            style={{
              padding: '16px',
              borderBottom: `1px solid ${styles.border}`,
              backgroundColor: selectedMemo?.id === memo.id ? styles.activeBg : 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span>{memo.hasPrivatePassword ? '🔒' : '📄'}</span>
                  <h4 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {memo.title}
                  </h4>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: styles.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {memo.content.split('\n')[0]}
                </p>
                <div style={{
                  fontSize: '12px',
                  color: styles.textSecondary,
                  marginTop: '4px'
                }}>
                  {new Date(memo.modifiedAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMemo(memo.id, memo.title);
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
        ))}
      </div>

      {/* 페이지네이션 */}
      {filteredMemos.length > itemsPerPage && (
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${styles.border}`,
          backgroundColor: styles.panelBg,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              ...styles.iconButton,
              minWidth: '40px',
              minHeight: '40px',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            ←
          </button>
          
          <span style={{
            fontSize: '14px',
            color: styles.textSecondary,
            margin: '0 8px'
          }}>
            {currentPage} / {getTotalPages()}
          </span>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === getTotalPages()}
            style={{
              ...styles.iconButton,
              minWidth: '40px',
              minHeight: '40px',
              opacity: currentPage === getTotalPages() ? 0.5 : 1
            }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};

export { MobileBottomTabs, MobileEditorTab, MobileMemosTab };
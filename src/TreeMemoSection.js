// 🌳 트리 구조 메모 섹션 컴포넌트
import React from 'react';

const TreeMemoSection = ({ 
  styles, 
  appData, 
  searchQuery, 
  setSearchQuery,
  sortOption, 
  setSortOption,
  sortDirection, 
  setSortDirection,
  expandedNotebooks,
  toggleNotebook,
  selectedNotebookId,
  setSelectedNotebookId,
  selectedMemo,
  setSelectedMemo,
  newNotebookName,
  setNewNotebookName,
  createNotebook,
  editingNotebook,
  setEditingNotebook,
  updateNotebook,
  deleteNotebook,
  getMemosByNotebook,
  getFilteredMemos,
  setMemoToMove,
  setShowMoveModal,
  deleteMemo,
  newMemoContent,
  setNewMemoContent,
  createMemo,
  isPrivateMemo,
  setIsPrivateMemo,
  privateMemoPassword,
  setPrivateMemoPassword,
  showPrivatePassword,
  setShowPrivatePassword,
  Icons,
  createBackup,
  exportData,
  setShowSettingsModal,
  setShowTrashModal,
  isLoading
}) => {
  return (
    <div style={{ ...styles.notebookSection, ...styles.memoSection }}>
      {/* 🏷️ 섹션 제목 */}
      <div style={styles.sectionTitle}>
        📚 메모 탐색기
      </div>
      
      {/* 🔍 검색 및 정렬 컨트롤 */}
      <div style={{ marginBottom: '16px' }}>
        {/* 검색 바 */}
        <div style={{ marginBottom: '8px', position: 'relative' }}>
          <input
            type="text"
            placeholder="메모 검색... (제목 또는 내용)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              ...styles.input,
              width: '100%',
              paddingLeft: '32px'
            }}
          />
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '14px',
            color: styles.textSecondary,
            pointerEvents: 'none'
          }}>
            🔍
          </div>
        </div>
        
        {/* 정렬 옵션 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              ...styles.input,
              flex: 1,
              fontSize: '12px'
            }}
          >
            <option value="date">수정일순</option>
            <option value="created">생성일순</option>
            <option value="title">제목순</option>
          </select>
          
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            style={{
              ...styles.iconButton,
              fontSize: '12px',
              padding: '8px'
            }}
            title={sortDirection === 'asc' ? '오름차순' : '내림차순'}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
      
      {/* 🔧 새 노트북 입력 */}
      <div style={{ ...styles.inputGroup, marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="새 노트북 이름..."
          value={newNotebookName}
          onChange={(e) => setNewNotebookName(e.target.value)}
          style={styles.input}
          onKeyPress={(e) => e.key === 'Enter' && createNotebook()}
        />
        <button
          onClick={createNotebook}
          style={{...styles.addButton, ...styles.primaryButton}}
          disabled={!newNotebookName.trim()}
          title="노트북 생성"
        >
          ➕
        </button>
      </div>
      
      {/* 📝 새 메모 작성 */}
      <div style={{ marginBottom: '16px' }}>
        <textarea
          placeholder="새 메모 작성..."
          value={newMemoContent}
          onChange={(e) => setNewMemoContent(e.target.value)}
          style={{ ...styles.input, height: '60px', resize: 'vertical', marginBottom: '8px' }}
        />
        
        {/* 개별 비밀번호 설정 */}
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={isPrivateMemo}
              onChange={(e) => {
                setIsPrivateMemo(e.target.checked);
                if (!e.target.checked) {
                  setPrivateMemoPassword('');
                }
              }}
              style={{ transform: 'scale(1.1)' }}
            />
            <span style={{ fontSize: '12px' }}>🔒 이 메모에 개별 비밀번호 설정</span>
          </label>
          
          {isPrivateMemo && (
            <div style={{ position: 'relative' }}>
              <input
                type={showPrivatePassword ? 'text' : 'password'}
                placeholder="개별 비밀번호 입력..."
                value={privateMemoPassword}
                onChange={(e) => setPrivateMemoPassword(e.target.value)}
                style={{
                  ...styles.input,
                  fontSize: '12px',
                  padding: '8px',
                  width: 'calc(100% - 32px)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPrivatePassword(!showPrivatePassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showPrivatePassword ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={createMemo}
          style={{...styles.button, ...styles.successButton, width: '100%', marginTop: '8px'}}
          disabled={!newMemoContent.trim() || (isPrivateMemo && !privateMemoPassword.trim())}
        >
          💾 메모 저장
        </button>
      </div>
      
      {/* 🌳 트리 구조 노트북 + 메모 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 전체 메모 */}
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              ...styles.listItem,
              ...(selectedNotebookId === 'all' ? styles.activeListItem : {}),
              justifyContent: 'space-between',
              fontWeight: '600'
            }}
            onClick={() => {
              setSelectedNotebookId('all');
              toggleNotebook('all');
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', width: '12px' }}>
                {expandedNotebooks.has('all') ? '▼' : '▶'}
              </span>
              📋 모든 메모 ({getFilteredMemos().length})
            </div>
          </div>
          
          {/* 전체 메모 하위 목록 */}
          {expandedNotebooks.has('all') && (
            <div style={{ marginLeft: '20px' }}>
              {getFilteredMemos().map(memo => (
                <div
                  key={memo.id}
                  style={{
                    ...styles.memoListItem,
                    ...(selectedMemo?.id === memo.id ? styles.activeMemoListItem : {}),
                    marginBottom: '4px',
                    padding: '6px 8px'
                  }}
                  onClick={() => setSelectedMemo(memo)}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1,
                    minWidth: 0
                  }}>
                    <span style={{ fontSize: '12px', flexShrink: 0 }}>
                      {memo.hasPrivatePassword ? '🔒' : '📄'}
                    </span>
                    <span style={{ 
                      fontWeight: '500', 
                      fontSize: '12px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {memo.title}
                    </span>
                    <span style={{ 
                      fontSize: '10px', 
                      color: styles.textSecondary,
                      flexShrink: 0
                    }}>
                      {new Date(memo.modifiedAt).toLocaleDateString('ko-KR', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemoToMove(memo);
                        setShowMoveModal(true);
                      }}
                      style={{
                        padding: '2px 4px',
                        fontSize: '10px',
                        border: 'none',
                        borderRadius: '3px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        cursor: 'pointer',
                        opacity: 0.7
                      }}
                      title="이동"
                    >
                      📁
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMemo(memo.id, memo.title);
                      }}
                      style={{
                        padding: '2px 4px',
                        fontSize: '10px',
                        border: 'none',
                        borderRadius: '3px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        cursor: 'pointer',
                        opacity: 0.7
                      }}
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 각 노트북들 */}
        {appData.notebooks.map(notebook => {
          const notebookMemos = getMemosByNotebook(notebook.id);
          
          return (
            <div key={notebook.id} style={{ marginBottom: '8px' }}>
              <div
                style={{
                  ...styles.listItem,
                  ...(selectedNotebookId === notebook.id ? styles.activeListItem : {}),
                  justifyContent: 'space-between'
                }}
              >
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    flex: 1, 
                    cursor: 'pointer' 
                  }}
                  onClick={() => {
                    setSelectedNotebookId(notebook.id);
                    toggleNotebook(notebook.id);
                  }}
                >
                  <span style={{ fontSize: '12px', width: '12px' }}>
                    {expandedNotebooks.has(notebook.id) ? '▼' : '▶'}
                  </span>
                  📁
                  {editingNotebook === notebook.id ? (
                    <input
                      type="text"
                      defaultValue={notebook.name}
                      style={{...styles.input, padding: '4px 8px', fontSize: '12px'}}
                      autoFocus
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== notebook.name) {
                          updateNotebook(notebook.id, e.target.value.trim());
                        } else {
                          setEditingNotebook(null);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span>{notebook.name}</span>
                      <span style={{ fontSize: '11px', color: styles.textSecondary }}>
                        ({notebookMemos.length})
                      </span>
                    </>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNotebook(notebook.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      fontSize: '11px'
                    }}
                    title="이름 수정"
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
                      padding: '2px',
                      fontSize: '11px',
                      color: styles.danger
                    }}
                    title="노트북 삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {/* 노트북별 메모들 */}
              {expandedNotebooks.has(notebook.id) && (
                <div style={{ marginLeft: '20px' }}>
                  {notebookMemos.map(memo => (
                    <div
                      key={memo.id}
                      style={{
                        ...styles.memoListItem,
                        ...(selectedMemo?.id === memo.id ? styles.activeMemoListItem : {}),
                        marginBottom: '4px',
                        padding: '6px 8px'
                      }}
                      onClick={() => setSelectedMemo(memo)}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '8px',
                        flex: 1,
                        minWidth: 0
                      }}>
                        <span style={{ fontSize: '12px', flexShrink: 0 }}>
                          {memo.hasPrivatePassword ? '🔒' : '📄'}
                        </span>
                        <span style={{ 
                          fontWeight: '500', 
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {memo.title}
                        </span>
                        <span style={{ 
                          fontSize: '10px', 
                          color: styles.textSecondary,
                          flexShrink: 0
                        }}>
                          {new Date(memo.modifiedAt).toLocaleDateString('ko-KR', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemoToMove(memo);
                            setShowMoveModal(true);
                          }}
                          style={{
                            padding: '2px 4px',
                            fontSize: '10px',
                            border: 'none',
                            borderRadius: '3px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            cursor: 'pointer',
                            opacity: 0.7
                          }}
                          title="이동"
                        >
                          📁
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMemo(memo.id, memo.title);
                          }}
                          style={{
                            padding: '2px 4px',
                            fontSize: '10px',
                            border: 'none',
                            borderRadius: '3px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            cursor: 'pointer',
                            opacity: 0.7
                          }}
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* 하단 버튼들 */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
        <button
          onClick={createBackup}
          style={{
            ...styles.button, 
            ...styles.successButton, 
            flex: 1, 
            fontSize: '11px',
            padding: '8px 4px',
            whiteSpace: 'nowrap'
          }}
          title="백업 생성"
          disabled={isLoading}
        >
          백업
        </button>
        <button
          onClick={exportData}
          style={{
            ...styles.button, 
            ...styles.primaryButton, 
            flex: 1, 
            fontSize: '11px',
            padding: '8px 4px',
            whiteSpace: 'nowrap'
          }}
          title="데이터 내보내기"
        >
          내보내기
        </button>
        <button
          onClick={() => setShowSettingsModal(true)}
          style={{
            ...styles.button, 
            ...styles.primaryButton, 
            flex: 1, 
            fontSize: '11px',
            padding: '8px 4px',
            whiteSpace: 'nowrap'
          }}
          title="설정"
        >
          설정
        </button>
        <button
          onClick={() => setShowTrashModal(true)}
          style={{
            ...styles.button, 
            ...styles.dangerButton, 
            flex: 1, 
            fontSize: '11px',
            padding: '8px 4px',
            whiteSpace: 'nowrap'
          }}
          title="휴지통"
        >
          휴지통
        </button>
      </div>
    </div>
  );
};

export default TreeMemoSection;

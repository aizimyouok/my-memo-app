import React, { useState } from 'react';
import { IconFolder, IconPlus, IconEdit, IconTrash, IconCheck, IconX, IconFolderOpen } from '@tabler/icons-react';

const MobileNotebooksTab = ({ 
  appData, 
  selectedNotebook,
  onNotebookSelect,
  onNotebookCreate,
  onNotebookUpdate,
  onNotebookDelete
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [editName, setEditName] = useState('');

  const getMemoCount = (notebookId) => {
    return appData.memos.filter(memo => memo.notebookId === notebookId).length;
  };

  const handleCreateStart = () => {
    setIsCreating(true);
    setNewNotebookName('');
  };

  const handleCreateConfirm = () => {
    if (newNotebookName.trim()) {
      onNotebookCreate(newNotebookName.trim());
      setIsCreating(false);
      setNewNotebookName('');
    }
  };

  const handleCreateCancel = () => {
    setIsCreating(false);
    setNewNotebookName('');
  };

  const handleEditStart = (notebook) => {
    setEditingId(notebook.id);
    setEditName(notebook.name);
  };

  const handleEditConfirm = () => {
    if (editName.trim()) {
      onNotebookUpdate(editingId, editName.trim());
      setEditingId(null);
      setEditName('');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (notebookId) => {
    if (window.confirm('이 노트북을 삭제하시겠습니까?\n노트북 안의 모든 메모가 기본 노트북으로 이동됩니다.')) {
      onNotebookDelete(notebookId);
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
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#1f2937'
    },
    createButton: {
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#3b82f6',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    notebookList: {
      padding: '8px 16px 80px'
    },
    allNotebooksCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '8px',
      border: '2px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    allNotebooksCardActive: {
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff'
    },
    notebookCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '8px',
      border: '1px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    notebookCardActive: {
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff'
    },
    notebookHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    notebookInfo: {
      display: 'flex',
      alignItems: 'center',
      flex: 1,
      marginRight: '8px'
    },
    notebookIcon: {
      marginRight: '12px',
      color: '#6b7280'
    },
    notebookName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      flex: 1
    },
    notebookCount: {
      fontSize: '14px',
      color: '#6b7280',
      marginLeft: '8px'
    },
    notebookActions: {
      display: 'flex',
      gap: '4px'
    },
    iconButton: {
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    createForm: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '8px',
      border: '2px solid #3b82f6'
    },
    createInput: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      marginBottom: '12px',
      outline: 'none'
    },
    createActions: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end'
    },
    confirmButton: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      backgroundColor: '#3b82f6',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    cancelButton: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      color: '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    editInput: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      border: '1px solid #3b82f6',
      borderRadius: '4px',
      padding: '4px 8px',
      flex: 1,
      outline: 'none'
    },
    defaultBadge: {
      padding: '2px 8px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
      color: '#6b7280',
      marginLeft: '8px'
    }
  };

  const totalMemos = appData.memos.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>노트북</h1>
          <button
            style={styles.createButton}
            onClick={handleCreateStart}
          >
            <IconPlus size={20} />
          </button>
        </div>
      </div>

      <div style={styles.notebookList}>
        {/* 전체 메모 카드 */}
        <div
          style={{
            ...styles.allNotebooksCard,
            ...(selectedNotebook === 'all' ? styles.allNotebooksCardActive : {})
          }}
          onClick={() => onNotebookSelect('all')}
        >
          <div style={styles.notebookHeader}>
            <div style={styles.notebookInfo}>
              <IconFolderOpen style={styles.notebookIcon} size={24} />
              <span style={styles.notebookName}>전체 메모</span>
              <span style={styles.notebookCount}>{totalMemos}개</span>
            </div>
          </div>
        </div>

        {/* 새 노트북 생성 폼 */}
        {isCreating && (
          <div style={styles.createForm}>
            <input
              type="text"
              placeholder="노트북 이름을 입력하세요"
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              style={styles.createInput}
              autoFocus
            />
            <div style={styles.createActions}>
              <button
                style={styles.cancelButton}
                onClick={handleCreateCancel}
              >
                <IconX size={16} />
              </button>
              <button
                style={styles.confirmButton}
                onClick={handleCreateConfirm}
              >
                <IconCheck size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 노트북 목록 */}
        {appData.notebooks.map(notebook => (
          <div
            key={notebook.id}
            style={{
              ...styles.notebookCard,
              ...(selectedNotebook === notebook.id ? styles.notebookCardActive : {})
            }}
            onClick={() => onNotebookSelect(notebook.id)}
          >
            <div style={styles.notebookHeader}>
              <div style={styles.notebookInfo}>
                <IconFolder style={styles.notebookIcon} size={24} />
                {editingId === notebook.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={styles.editInput}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span style={styles.notebookName}>
                    {notebook.name}
                    {notebook.isDefault && (
                      <span style={styles.defaultBadge}>기본</span>
                    )}
                  </span>
                )}
                <span style={styles.notebookCount}>
                  {getMemoCount(notebook.id)}개
                </span>
              </div>
              
              <div style={styles.notebookActions}>
                {editingId === notebook.id ? (
                  <>
                    <button
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCancel();
                      }}
                    >
                      <IconX size={16} />
                    </button>
                    <button
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditConfirm();
                      }}
                    >
                      <IconCheck size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart(notebook);
                      }}
                    >
                      <IconEdit size={16} />
                    </button>
                    {!notebook.isDefault && (
                      <button
                        style={styles.iconButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notebook.id);
                        }}
                      >
                        <IconTrash size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileNotebooksTab;
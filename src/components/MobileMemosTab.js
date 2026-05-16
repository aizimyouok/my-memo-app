import React, { useState, useMemo } from 'react';
import { IconSearch, IconPlus, IconEdit, IconTrash, IconStar, IconStarFilled } from '@tabler/icons-react';

const MobileMemosTab = ({ 
  appData, 
  selectedNotebook, 
  onMemoSelect, 
  onMemoCreate, 
  onMemoDelete,
  onMemoToggleStar,
  searchTerm,
  onSearchTermChange,
  sortBy,
  onSortByChange,
  currentMemo
}) => {
  const [showSearch, setShowSearch] = useState(false);

  // 메모 필터링 및 정렬 로직
  const filteredAndSortedMemos = useMemo(() => {
    let filtered = appData.memos;

    // 노트북 필터
    if (selectedNotebook && selectedNotebook !== 'all') {
      filtered = filtered.filter(memo => memo.notebookId === selectedNotebook);
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(memo => 
        memo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memo.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 정렬
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'starred':
          if (a.starred !== b.starred) {
            return b.starred - a.starred;
          }
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        default:
          return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }, [appData.memos, selectedNotebook, searchTerm, sortBy]);

  const getNotebookName = (notebookId) => {
    const notebook = appData.notebooks.find(nb => nb.id === notebookId);
    return notebook ? notebook.name : '기본';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '오늘';
    if (diffDays === 2) return '어제';
    if (diffDays <= 7) return `${diffDays - 1}일 전`;
    
    return date.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric' 
    });
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
      alignItems: 'center',
      marginBottom: '12px'
    },
    title: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#1f2937'
    },
    headerActions: {
      display: 'flex',
      gap: '8px'
    },
    iconButton: {
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    searchContainer: {
      display: showSearch ? 'block' : 'none'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      backgroundColor: '#f9fafb',
      outline: 'none'
    },
    sortContainer: {
      display: 'flex',
      gap: '8px',
      marginTop: '12px'
    },
    sortButton: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: '500',
      border: '1px solid #d1d5db',
      borderRadius: '20px',
      backgroundColor: 'white',
      color: '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    sortButtonActive: {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
      color: 'white'
    },
    memoList: {
      padding: '8px 16px 80px'
    },
    memoCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '8px',
      border: '1px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    memoCardActive: {
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff'
    },
    memoHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    },
    memoTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      flex: 1,
      marginRight: '8px'
    },
    memoActions: {
      display: 'flex',
      gap: '4px'
    },
    memoContent: {
      fontSize: '14px',
      color: '#6b7280',
      lineHeight: '1.4',
      marginBottom: '8px',
      maxHeight: '40px',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical'
    },
    memoMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px',
      color: '#9ca3af'
    },
    notebookBadge: {
      padding: '2px 8px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
      color: '#6b7280'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#9ca3af'
    },
    emptyIcon: {
      width: '48px',
      height: '48px',
      margin: '0 auto 16px',
      color: '#d1d5db'
    },
    fabButton: {
      position: 'fixed',
      bottom: '90px',
      right: '20px',
      width: '56px',
      height: '56px',
      borderRadius: '28px',
      backgroundColor: '#3b82f6',
      border: 'none',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
      zIndex: 100
    }
  };

  const sortOptions = [
    { value: 'updated', label: '최근 수정' },
    { value: 'created', label: '최근 생성' },
    { value: 'title', label: '제목순' },
    { value: 'starred', label: '즐겨찾기' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>메모 목록</h1>
          <div style={styles.headerActions}>
            <button
              style={styles.iconButton}
              onClick={() => setShowSearch(!showSearch)}
            >
              <IconSearch size={20} />
            </button>
          </div>
        </div>

        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="메모 검색..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.sortContainer}>
          {sortOptions.map(option => (
            <button
              key={option.value}
              style={{
                ...styles.sortButton,
                ...(sortBy === option.value ? styles.sortButtonActive : {})
              }}
              onClick={() => onSortByChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.memoList}>
        {filteredAndSortedMemos.length === 0 ? (
          <div style={styles.emptyState}>
            <IconEdit style={styles.emptyIcon} />
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
              아직 메모가 없습니다
            </div>
            <div style={{ fontSize: '14px' }}>
              첫 번째 메모를 작성해보세요!
            </div>
          </div>
        ) : (
          filteredAndSortedMemos.map(memo => (
            <div
              key={memo.id}
              style={{
                ...styles.memoCard,
                ...(currentMemo?.id === memo.id ? styles.memoCardActive : {})
              }}
              onClick={() => onMemoSelect(memo)}
            >
              <div style={styles.memoHeader}>
                <div style={styles.memoTitle}>{memo.title || '제목 없음'}</div>
                <div style={styles.memoActions}>
                  <button
                    style={{ ...styles.iconButton, width: '32px', height: '32px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMemoToggleStar(memo.id);
                    }}
                  >
                    {memo.starred ? 
                      <IconStarFilled size={16} color="#fbbf24" /> : 
                      <IconStar size={16} />
                    }
                  </button>
                  <button
                    style={{ ...styles.iconButton, width: '32px', height: '32px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMemoDelete(memo.id);
                    }}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
              
              <div style={styles.memoContent}>
                {memo.content || '내용 없음'}
              </div>
              
              <div style={styles.memoMeta}>
                <span style={styles.notebookBadge}>
                  {getNotebookName(memo.notebookId)}
                </span>
                <span>{formatDate(memo.updatedAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        style={styles.fabButton}
        onClick={onMemoCreate}
      >
        <IconPlus size={24} />
      </button>
    </div>
  );
};

export default MobileMemosTab;
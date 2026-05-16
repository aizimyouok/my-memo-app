import React from 'react';
import { IconEdit, IconList, IconFolder, IconSettings, IconTrash } from '@tabler/icons-react';

const BottomTabs = ({ 
  activeTab, 
  onTabChange, 
  memoCount, 
  notebookCount, 
  trashCount 
}) => {
  const tabs = [
    {
      id: 'editor',
      icon: IconEdit,
      label: '메모',
      count: null
    },
    {
      id: 'memos',
      icon: IconList,
      label: '목록',
      count: memoCount
    },
    {
      id: 'notebooks',
      icon: IconFolder,
      label: '노트북',
      count: notebookCount
    },
    {
      id: 'settings',
      icon: IconSettings,
      label: '설정',
      count: null
    },
    {
      id: 'trash',
      icon: IconTrash,
      label: '휴지통',
      count: trashCount
    }
  ];

  const styles = {
    bottomTabs: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '70px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom)'
    },
    tab: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '50px',
      padding: '8px 4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative'
    },
    tabActive: {
      color: '#3b82f6'
    },
    tabInactive: {
      color: '#6b7280'
    },
    tabIcon: {
      width: '24px',
      height: '24px',
      marginBottom: '2px'
    },
    tabLabel: {
      fontSize: '10px',
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: '12px'
    },
    badge: {
      position: 'absolute',
      top: '2px',
      right: '8px',
      backgroundColor: '#ef4444',
      color: 'white',
      fontSize: '10px',
      padding: '1px 5px',
      borderRadius: '10px',
      minWidth: '16px',
      height: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600'
    }
  };

  return (
    <div style={styles.bottomTabs}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <div
            key={tab.id}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : styles.tabInactive)
            }}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon style={styles.tabIcon} />
            <span style={styles.tabLabel}>{tab.label}</span>
            {tab.count > 0 && (
              <div style={styles.badge}>
                {tab.count > 99 ? '99+' : tab.count}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BottomTabs;
// 🔥 향상된 노트북 탭 기능을 위한 JavaScript 코드
// 기존 App.js의 노트북 탭 섹션을 이 코드로 교체하세요

// CSS 파일 import 추가 (App.js 상단에 추가)
// import './enhanced-tabs.css';

// 컨텍스트 메뉴 상태 추가 (기존 상태들과 함께)
const [contextMenu, setContextMenu] = useState(null);

// 컨텍스트 메뉴 함수들 추가 (기존 함수들과 함께)
const showContextMenu = (e, notebook) => {
  e.preventDefault();
  
  setContextMenu({
    x: e.clientX,
    y: e.clientY,
    notebook: notebook
  });
};

const hideContextMenu = () => {
  setContextMenu(null);
};

// 클릭 외부 영역 감지 useEffect 추가
useEffect(() => {
  if (contextMenu) {
    const handleClick = () => hideContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }
}, [contextMenu]);

// 향상된 노트북 탭 JSX (기존 노트북 탭 div 전체를 이것으로 교체)
const enhancedNotebookTabs = (
  <>
    {/* 노트북 탭 버튼들 */}
    <div 
      className="notebook-tabs-container"
      onWheel={(e) => {
        e.preventDefault();
        e.currentTarget.scrollLeft += e.deltaY;
      }}
    >
      {/* 전체 메모 탭 */}
      <button
        className={`tab-button ${selectedNotebookId === 'all' ? 'active' : ''}`}
        onClick={() => setSelectedNotebookId('all')}
        onContextMenu={(e) => e.preventDefault()}
      >
        📋 모든 메모 ({appData.memos.length})
      </button>
      
      {/* 노트북 탭들 */}
      {appData.notebooks.map(notebook => (
        <button
          key={notebook.id}
          className={`tab-button ${selectedNotebookId === notebook.id ? 'active' : ''}`}
          onClick={() => setSelectedNotebookId(notebook.id)}
          onContextMenu={(e) => showContextMenu(e, notebook)}
        >
          📁 {notebook.name} ({appData.memos.filter(m => m.notebookId === notebook.id).length})
        </button>
      ))}
      
      {/* 새 노트북 추가 탭 */}
      <button
        className="tab-button add-new"
        onClick={() => {
          const name = prompt('새 노트북 이름을 입력하세요:');
          if (name && name.trim()) {
            setNewNotebookName(name.trim());
            createNotebook();
          }
        }}
        title="새 노트북 추가"
      >
        ➕ 새 노트북
      </button>
    </div>

    {/* 컨텍스트 메뉴 */}
    {contextMenu && (
      <div
        className="context-menu"
        style={{
          top: contextMenu.y,
          left: contextMenu.x
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="context-menu-item"
          onClick={() => {
            setEditingNotebook(contextMenu.notebook.id);
            hideContextMenu();
          }}
        >
          ✏️ 이름 변경
        </div>
        <div
          className="context-menu-item danger"
          onClick={() => {
            deleteNotebook(contextMenu.notebook.id);
            hideContextMenu();
          }}
        >
          🗑️ 삭제
        </div>
      </div>
    )}
  </>
);

// 📝 사용 방법:
// 1. App.js 상단에 CSS import 추가: import './enhanced-tabs.css';
// 2. 상태 변수에 contextMenu 추가: const [contextMenu, setContextMenu] = useState(null);
// 3. 함수들 추가: showContextMenu, hideContextMenu, useEffect
// 4. 기존 노트북 탭 div를 enhancedNotebookTabs로 교체

// 교체할 기존 코드 위치:
// {/* 노트북 탭 버튼들 */} 주석부터
// </div> 까지 (노트북 탭 컨테이너 끝)를
// 위의 enhancedNotebookTabs로 교체하세요.

export default enhancedNotebookTabs;
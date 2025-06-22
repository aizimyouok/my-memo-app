              {/* 향상된 노트북 탭 버튼들 */}
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
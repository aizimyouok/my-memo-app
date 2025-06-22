              {/* 🔥 향상된 노트북 탭 버튼들 */}
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
                >
                  모든 메모 ({appData.memos.length})
                </button>
                
                {/* 노트북 탭들 */}
                {appData.notebooks.map(notebook => (
                  <button
                    key={notebook.id}
                    className={`tab-button ${selectedNotebookId === notebook.id ? 'active' : ''}`}
                    onClick={() => setSelectedNotebookId(notebook.id)}
                  >
                    {notebook.name} ({appData.memos.filter(m => m.notebookId === notebook.id).length})
                    
                    {/* 호버 시 나타나는 편집/삭제 버튼 */}
                    <div className="tab-actions">
                      <button 
                        className="tab-action-btn tab-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNotebook(notebook.id);
                        }}
                        title="이름 변경"
                      >
                        ✏
                      </button>
                      <button 
                        className="tab-action-btn tab-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotebook(notebook.id);
                        }}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
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
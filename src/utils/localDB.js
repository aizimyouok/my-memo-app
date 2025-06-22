// src/utils/localDB.js
// 로컬 데이터베이스 관리 유틸리티

const DB_NAME = 'MemoAppDB';
const DB_VERSION = 1;
const STORE_NAMES = {
  NOTEBOOKS: 'notebooks',
  MEMOS: 'memos',
  MEMO_CONTENTS: 'memoContents'
};

class LocalDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 노트북 저장소
        if (!db.objectStoreNames.contains(STORE_NAMES.NOTEBOOKS)) {
          const notebookStore = db.createObjectStore(STORE_NAMES.NOTEBOOKS, { keyPath: 'id' });
          notebookStore.createIndex('name', 'name', { unique: false });
        }
        
        // 메모 목록 저장소
        if (!db.objectStoreNames.contains(STORE_NAMES.MEMOS)) {
          const memoStore = db.createObjectStore(STORE_NAMES.MEMOS, { keyPath: 'id' });
          memoStore.createIndex('name', 'name', { unique: false });
          memoStore.createIndex('createdTime', 'createdTime', { unique: false });
        }
        
        // 메모 내용 저장소
        if (!db.objectStoreNames.contains(STORE_NAMES.MEMO_CONTENTS)) {
          const contentStore = db.createObjectStore(STORE_NAMES.MEMO_CONTENTS, { keyPath: 'id' });
        }
      };
    });
  }

  async saveNotebooks(notebooks) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([STORE_NAMES.NOTEBOOKS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.NOTEBOOKS);
    
    // 기존 데이터 모두 삭제
    await store.clear();
    
    // 새 데이터 저장
    for (const notebook of notebooks) {
      await store.add({
        ...notebook,
        lastUpdated: Date.now()
      });
    }
    
    return transaction.complete;
  }

  async getNotebooks() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAMES.NOTEBOOKS], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.NOTEBOOKS);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveMemos(memos) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([STORE_NAMES.MEMOS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.MEMOS);
    
    // 기존 데이터 모두 삭제
    await store.clear();
    
    // 새 데이터 저장
    for (const memo of memos) {
      await store.add({
        ...memo,
        lastUpdated: Date.now()
      });
    }
    
    return transaction.complete;
  }

  async getMemos() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAMES.MEMOS], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.MEMOS);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveMemoContent(memoId, content, isSecret = false) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([STORE_NAMES.MEMO_CONTENTS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.MEMO_CONTENTS);
    
    return store.put({
      id: memoId,
      content,
      isSecret,
      lastUpdated: Date.now()
    });
  }

  async getMemoContent(memoId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAMES.MEMO_CONTENTS], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.MEMO_CONTENTS);
      const request = store.get(memoId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMemoContent(memoId) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([STORE_NAMES.MEMO_CONTENTS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.MEMO_CONTENTS);
    
    return store.delete(memoId);
  }

  async clearAll() {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([
      STORE_NAMES.NOTEBOOKS, 
      STORE_NAMES.MEMOS, 
      STORE_NAMES.MEMO_CONTENTS
    ], 'readwrite');
    
    await Promise.all([
      transaction.objectStore(STORE_NAMES.NOTEBOOKS).clear(),
      transaction.objectStore(STORE_NAMES.MEMOS).clear(),
      transaction.objectStore(STORE_NAMES.MEMO_CONTENTS).clear()
    ]);
    
    return transaction.complete;
  }

  async getLastSyncTime() {
    return localStorage.getItem('last-sync-time') || '0';
  }

  async setLastSyncTime(timestamp) {
    localStorage.setItem('last-sync-time', timestamp.toString());
  }
}

export const localDB = new LocalDB();

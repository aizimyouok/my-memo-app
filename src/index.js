import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // ⭐️ 이 줄 추가

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA를 위해 serviceWorker를 등록합니다.
serviceWorkerRegistration.register(); // ⭐️ 이 부분으로 변경

reportWebVitals();
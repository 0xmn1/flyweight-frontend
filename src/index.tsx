import './index.css';

import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';

const rootEle = document.getElementById('root');
if (rootEle) {
  const root = ReactDOM.createRoot(rootEle);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.warn('To render this app, please add a html element with id "root"');
}

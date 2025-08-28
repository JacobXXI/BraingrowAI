import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Disable StrictMode during dev to avoid double effects/fetches
  <BrowserRouter basename="/braingrow-ai">
    <App />
  </BrowserRouter>
);

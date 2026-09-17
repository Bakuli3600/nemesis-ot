import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installThreeCompat } from '@cognitia/ui';
import './style.css';

// Suppress the R3F-internal THREE.Clock deprecation warning (their issue #3741).
installThreeCompat();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

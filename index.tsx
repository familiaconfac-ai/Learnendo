import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ✅ Importa o CSS (Tailwind/estilos) pelo bundler (Vite/React)
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Fatal Error: Root element '#root' not found in document.");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
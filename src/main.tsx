import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import { WorkspaceProvider } from './state/workspace';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);

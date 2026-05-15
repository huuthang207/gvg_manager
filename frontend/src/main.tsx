import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SystemDialogProvider } from './features/app/SystemDialogProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemDialogProvider>
      <App />
    </SystemDialogProvider>
  </StrictMode>,
);

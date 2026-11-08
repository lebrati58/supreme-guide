import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
// Cyrillic for Russian; Hebrew, Arabic and Chinese use the device's system fonts.
import '@fontsource/nunito/cyrillic-400.css';
import '@fontsource/nunito/cyrillic-700.css';
import '@fontsource/nunito/cyrillic-800.css';
import './styles/app.css';
import { AppProvider } from './state';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider><App /></AppProvider>
  </StrictMode>,
);

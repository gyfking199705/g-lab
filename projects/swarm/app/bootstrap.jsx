import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const el = document.getElementById('root');
const loading = document.querySelector('.sw-loading');
if (loading) loading.remove();
createRoot(el).render(<App />);

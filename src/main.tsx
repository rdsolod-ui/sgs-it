import React from 'react';import {createRoot} from 'react-dom/client';import App from './App';import Admin from './Admin';import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode>{import.meta.env.VITE_PUBLIC_PREVIEW!=='true'&&location.pathname.startsWith('/admin')?<Admin/>:<App/>}</React.StrictMode>);
if('serviceWorker' in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{scope:import.meta.env.BASE_URL}).catch(()=>{}));

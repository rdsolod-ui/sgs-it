import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:process.env.VITE_PUBLIC_BASE||'/',plugins:[react()],server:{watch:{usePolling:true,interval:400},proxy:{'/api':'http://127.0.0.1:8787'}},build:{outDir:process.env.VITE_PUBLIC_PREVIEW==='true'?'dist-preview':'dist',chunkSizeWarningLimit:1200}});

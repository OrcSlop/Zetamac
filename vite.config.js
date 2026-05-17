import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',  // Tells Vite to use relative paths for the file:// protocol
    server: {
        host: '127.0.0.1', // Force IPv4
        port: 5173,
        strictPort: true,  // Fail instead of silently moving to another port
        hmr: {
            host: '127.0.0.1',
        }
    },
})
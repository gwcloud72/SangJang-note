import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages의 /repository-name/ 하위 경로에서도 asset 경로가 깨지지 않도록 상대 경로로 빌드합니다.
  base: './',
});

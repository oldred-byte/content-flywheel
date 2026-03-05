import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // 注意：API Key 由用户在浏览器中输入，不通过构建配置注入
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    // 构建配置：提高浏览器兼容性
    build: {
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      // 如果某个包有问题，可以在这里排除它不参与构建优化
      // commonjsOptions: {
      //   exclude: ['some-problematic-package'],
      // },
    },
    // 使用官方插件处理旧浏览器兼容
    esbuild: {
      target: 'es2020',
    },
  };
});

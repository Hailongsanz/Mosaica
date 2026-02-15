import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // load .env files into process.env for Vite config
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // OpenAI proxy
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, '/v1'),
        headers: {
          'Authorization': `Bearer ${env.VITE_OPENAI_API_KEY || ''}`
        }
      },
      // Groq proxy (free tier available)
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, '/openai/v1'),
        headers: {
          'Authorization': `Bearer ${env.VITE_GROQ_API_KEY || ''}`
        }
      },
      // Ollama proxy (local models)
      '/api/ollama': {
        target: env.VITE_OLLAMA_URL || 'http://localhost:11434',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/ollama/, '/v1')
      }
    }
  }
  };
});

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Hard requirement: the app cannot initialize Web3Auth without a client ID,
// so every mode (dev, build, preview) fails fast when it is absent.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  if (!env.VITE_WEB3AUTH_CLIENT_ID || !env.VITE_WEB3AUTH_CLIENT_ID.trim()) {
    throw new Error(
      'VITE_WEB3AUTH_CLIENT_ID is missing. Add it to .env (see .env.example) — Web3Auth cannot initialize without it.',
    )
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node', // Use Node for testing Prisma and DB connections
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})

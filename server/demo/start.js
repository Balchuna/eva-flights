// Entrada do npm run demo: liga o modo antes de carregar o servidor, sem depender de .env
process.env.DEMO_MODE = 'true'
await import('../index.js')

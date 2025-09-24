const isHosted = typeof window !== 'undefined' && window.location.host.includes('onrender.com');

// lokale Dev-API vs. Render-API
export const API_BASE = isHosted
  ? 'https://webtech-eudurak.onrender.com' // dein Backend auf Render
  : 'http://localhost:4000';
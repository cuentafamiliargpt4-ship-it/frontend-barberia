export const API_BASE_URL =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
    'http://localhost:3000';

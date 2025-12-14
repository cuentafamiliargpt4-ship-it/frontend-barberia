const getApiBaseUrl = () => {
    const raw = import.meta.env.VITE_API_URL as string | undefined;

    // Fallback local
    if (!raw) return 'http://localhost:3000';

    let url = raw.trim();

    // 1. Asegurar protocolo (https por defecto si falta)
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    // 2. Quitar slash final para evitar dobles //
    url = url.replace(/\/$/, '');

    return url;
};

export const API_BASE_URL = getApiBaseUrl();

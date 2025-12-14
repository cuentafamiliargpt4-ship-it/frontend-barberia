import axios from 'axios';
import { API_BASE_URL } from '../config/env';

export const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add JWT token to requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle response - unwrap the backend's { success, data } wrapper
apiClient.interceptors.response.use(
    (response) => {
        // The backend wraps all responses in { success: boolean, data: T, message?: string }
        // We extract the 'data' field so consumers get the actual payload directly
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
            response.data = response.data.data;
        }
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const isLoginPage = window.location.pathname === '/login';

        // Para 401 en login, no redirigir - dejar que el componente maneje el error
        if (status === 401 && !isLoginPage) {
            // Clear token on unauthorized (solo si NO estamos en login)
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login
            window.location.href = '/login';
        }

        // Extraer mensaje de error del backend o usar uno por defecto amigable
        let errorMessage = error.response?.data?.error
            || error.response?.data?.message
            || error.message;

        // Traducir errores comunes a español
        if (status === 401) {
            errorMessage = 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
        } else if (status === 404) {
            errorMessage = 'Usuario no encontrado.';
        } else if (status === 500) {
            errorMessage = 'Error del servidor. Intenta más tarde.';
        } else if (error.message === 'Network Error') {
            errorMessage = 'Error de conexión. Verifica tu internet.';
        }

        return Promise.reject(new Error(errorMessage));
    }
);

export default apiClient;

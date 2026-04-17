// WordPress API Bridge
// This captures the variables sent from PHP via wp_localize_script
const WP_BASE_URL = window.appParams?.restUrl || '/wp-json/full-send/v1';
const NONCE = window.appParams?.nonce || '';

export const base44 = {
  request: async (endpoint, options = {}) => {
    // Ensure the endpoint starts with a slash
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const response = await fetch(`${WP_BASE_URL}${path}`, {
      ...options,
      // CRITICAL: This allows WordPress to see your login cookies
      credentials: 'include', 
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': NONCE,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Network response was not ok');
    }

    return response.json();
  },

  get: (url) => base44.request(url, { method: 'GET' }),
  post: (url, data) => base44.request(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => base44.request(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => base44.request(url, { method: 'DELETE' }),
};

export default base44;
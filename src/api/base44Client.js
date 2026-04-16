// WordPress API Bridge
const WP_BASE_URL = window.appParams?.restUrl || '/wp-json/fs/v1';
const NONCE = window.appParams?.nonce || '';

export const base44 = {
  // Generic fetcher that talks to your full-send-app.php endpoints
  request: async (endpoint, options = {}) => {
    const response = await fetch(`${WP_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': NONCE,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Network response was not ok');
    }

    return response.json();
  },

  // Map the old "Base44" methods to your new WordPress routes
  get: (url) => base44.request(url, { method: 'GET' }),
  post: (url, data) => base44.request(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => base44.request(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => base44.request(url, { method: 'DELETE' }),
};

export default base44;
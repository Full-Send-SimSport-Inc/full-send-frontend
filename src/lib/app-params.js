const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) return defaultValue;

	// Check for WordPress-injected params first
	if (window.appParams && window.appParams[paramName]) {
		return window.appParams[paramName];
	}

	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);

	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}

	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}

	const storedValue = storage.getItem(storageKey);
	if (storedValue) return storedValue;

	return defaultValue || null;
}

const getAppParams = () => {
    // Keep your original token cleanup logic
    if (getAppParamValue("clear_access_token") === 'true') {
        storage.removeItem('base44_access_token');
        storage.removeItem('token');
    }

    return {
        // --- NEW WORDPRESS PARAMS ---
        restUrl: getAppParamValue("restUrl"),
        nonce: getAppParamValue("nonce"),

        // --- ORIGINAL LEGACY PARAMS ---
        appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
        token: getAppParamValue("access_token", { removeFromUrl: true }),
        fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
        functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
        appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
    }
}

export default getAppParams();
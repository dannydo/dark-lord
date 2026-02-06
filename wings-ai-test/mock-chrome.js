// MOCK CHROME API

// Ensure window.chrome exists
if (typeof window.chrome === 'undefined') {
    window.chrome = {};
}

// Create the mock storage object
const mockStorage = {
    sync: {
        get: (keys) => {
            return new Promise((resolve) => {
                console.log("[Mock] Storage Sync Get:", keys);
                const data = {};
                const keyList = Array.isArray(keys) ? keys : [keys];
                keyList.forEach(k => {
                    const val = localStorage.getItem('sync_' + k);
                    try {
                        data[k] = val ? JSON.parse(val) : null;
                    } catch(e) { data[k] = val; }
                });
                resolve(data);
            });
        },
        set: (items) => {
            return new Promise((resolve) => {
                console.log("[Mock] Storage Sync Set:", items);
                Object.keys(items).forEach(k => {
                    localStorage.setItem('sync_' + k, JSON.stringify(items[k]));
                });
                resolve();
            });
        }
    },
    local: {
        get: (keys) => {
            return new Promise((resolve) => {
                 console.log("[Mock] Storage Local Get:", keys);
                const data = {};
                const keyList = Array.isArray(keys) ? keys : [keys];
                keyList.forEach(k => {
                    const val = localStorage.getItem('local_' + k);
                    try {
                        data[k] = val ? JSON.parse(val) : null;
                    } catch(e) { data[k] = val; }
                });
                resolve(data);
            });
        },
        set: (items) => {
            return new Promise((resolve) => {
                 console.log("[Mock] Storage Local Set:", items);
                Object.keys(items).forEach(k => {
                    localStorage.setItem('local_' + k, JSON.stringify(items[k]));
                });
                resolve();
            });
        }
    }
};

// Forcefully attach/overwrite storage on the global chrome object
try {
    window.chrome.storage = mockStorage;
} catch (e) {
    console.warn("[Mock] Failed to assign chrome.storage directly, trying defineProperty");
    Object.defineProperty(window.chrome, 'storage', {
        value: mockStorage,
        writable: true,
        configurable: true
    });
}

// Mock runtime as well
if (!window.chrome.runtime) window.chrome.runtime = {};
window.chrome.runtime.getManifest = () => ({ version: "TEST-HARNESS" });
window.chrome.runtime.onMessage = { addListener: () => {} };

console.log("[Mock] Chrome API Initialized", window.chrome);

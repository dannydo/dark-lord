/**
 * worker.js - Mocked Background Service for Standalone Mode
 * This file replaces background.js and handles API calls directly.
 */

const VERSION = "3.5-standalone";
console.log(`Wings Standalone Worker v${VERSION} LOADED`);

// --- Mocked Persistence ---
const storage = {
    sync: {
        get: (keys, callback) => {
            const result = {};
            const keysArr = Array.isArray(keys) ? (typeof keys === 'string' ? [keys] : keys) : Object.keys(keys);
            keysArr.forEach(key => {
                const val = localStorage.getItem(`wings_sync_${key}`);
                result[key] = val ? JSON.parse(val) : (typeof keys === 'object' ? keys[key] : null);
            });
            if (callback) callback(result);
            return Promise.resolve(result);
        },
        set: (data, callback) => {
            for (const key in data) {
                localStorage.setItem(`wings_sync_${key}`, JSON.stringify(data[key]));
            }
            if (callback) callback();
            return Promise.resolve();
        }
    },
    local: {
        get: (keys, callback) => {
            const result = {};
            const keysArr = Array.isArray(keys) ? (typeof keys === 'string' ? [keys] : keys) : Object.keys(keys);
            keysArr.forEach(key => {
                const val = localStorage.getItem(`wings_local_${key}`);
                result[key] = val ? JSON.parse(val) : (typeof keys === 'object' ? keys[key] : null);
            });
            if (callback) callback(result);
            return Promise.resolve(result);
        },
        set: (data, callback) => {
            for (const key in data) {
                localStorage.setItem(`wings_local_${key}`, JSON.stringify(data[key]));
            }
            if (callback) callback();
            return Promise.resolve();
        }
    }
};

// --- API Logic (Ported from background.js) ---

async function handleGenerateReply(chatHistory, clientName, clientPhone, clientId, apiEnv, tones, userStyle, modelChoice, language) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await storage.sync.get(['geminiApiKey', 'businessContext', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token || staffUser.status !== 'approved') {
            return { error: "UNAUTHORIZED_ACCESS", message: `Please log in via Settings.` };
        }
        if (!settings.geminiApiKey) {
            return { error: "Missing Gemini API Key. Please set it in Settings." };
        }

        const apiKey = settings.geminiApiKey;
        const context = settings.businessContext || "Wings Lashes assistant.";
        const selectedTones = (tones && tones.length > 0) ? tones.join(", ") : "Cheerful";
        const targetStyle = userStyle || "Ngắn gọn, vui vẻ, có emoji";
        
        let liveHistoryContext = "";
        let historyData = null;
        let bookingSlotsContext = "";
        
        if (clientPhone) {
            try {
                historyData = await fetchClientHistory(clientPhone, clientId, apiEnv);
                
                if (historyData && historyData.error) {
                    liveHistoryContext = `Client History Error: ${historyData.error}`;
                } else if (historyData) {
                    let historyLines = [];
                    if (historyData.diamond_balance !== undefined) historyLines.push(`- Diamonds: ${historyData.diamond_balance} 💎`);
                    if (historyData.recent_styles) historyLines.push(`- Preferred Styles: ${historyData.recent_styles}`);
                    
                    liveHistoryContext = `\n# CLIENT HISTORY\n${historyLines.join('\n')}\n`;

                    // Booking Context
                    let storeRef = historyData.store_name || "PXL"; 
                    try {
                        const today = new Date().toISOString().split('T')[0];
                        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                        const slotData = await fetchAvailableSlots(storeRef, today, tomorrow, apiEnv);
                        
                        bookingSlotsContext = "\n# REAL-TIME SLOTS\n";
                        if (slotData && slotData.dates) {
                            for (const [date, info] of Object.entries(slotData.dates)) {
                                const availableTimes = Object.keys(info.slots).filter(t => info.slots[t] > 0).slice(0, 5);
                                if (availableTimes.length > 0) bookingSlotsContext += `- ${date}: ${availableTimes.join(', ')}\n`;
                            }
                        }
                    } catch (e) {}
                }
            } catch (err) {}
        }
        
        const systemInstruction = `
ROLE: Expert CS for Wings Lashes. 
CONTEXT: ${context}
${liveHistoryContext}
${bookingSlotsContext}

GREETING: Be cheeky and warm (5-second laugh rule).
STYLE: ${targetStyle}. Tone: ${selectedTones}. 
LANG: ${language}.
`;

        const response = await callGeminiAPI(apiKey, systemInstruction, chatHistory, modelChoice);
        return { 
            reply: response, 
            historyData: historyData 
        };

    } catch (error) {
        return { error: error.message };
    }
}

async function callGeminiAPI(apiKey, systemInstruction, chatHistory, modelChoice) {
    const model = modelChoice === "2.5" ? "gemini-2.5-flash" : "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: `${systemInstruction}\n\nHistory:\n${chatHistory}`
            }]
        }]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    }
    throw new Error(data.error?.message || "No response from AI");
}

async function requestOTP(phone, env) {
    const fetchEnv = env || 'orb';
    const baseUrl = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
    const response = await fetch(`${baseUrl}/3/staff/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    });
    return await response.json();
}

async function verifyOTP(phone, otp, env) {
    const fetchEnv = env || 'orb';
    const baseUrl = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
    const response = await fetch(`${baseUrl}/3/staff/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
    });
    const res = await response.json();
    if (res.status === 'success' || res.token) {
        const staffData = {
            token: res.token,
            name: res.staff_name || "Staff",
            status: 'approved'
        };
        await storage.sync.set({ [`staffUser_${fetchEnv}`]: staffData });
        return { success: true };
    }
    return { success: false, error: res.message || "Invalid OTP" };
}

async function fetchClientHistory(phone, clientId, env) {
    const fetchEnv = env || 'orb';
    const settings = await storage.sync.get([`staffUser_${fetchEnv}`]);
    const staffUser = settings[`staffUser_${fetchEnv}`];
    if (!staffUser || !staffUser.token) return null;

    const baseUrl = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
    const response = await fetch(`${baseUrl}/3/client/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, session_token: staffUser.token })
    });
    return await response.json();
}

async function fetchAvailableSlots(storeId, from, to, env) {
    const fetchEnv = env || 'orb';
    const settings = await storage.sync.get([`staffUser_${fetchEnv}`]);
    const staffUser = settings[`staffUser_${fetchEnv}`];
    if (!staffUser || !staffUser.token) return {};

    const baseUrl = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
    const url = `${baseUrl}/3/booking/slots/available?storeId=${storeId}&from=${from}&to=${to}&session_token=${staffUser.token}`;
    const response = await fetch(url);
    const json = await response.json();
    return json.data || {};
}

async function fetchActiveTechnicians(storeId, env) {
    const fetchEnv = env || 'orb';
    const settings = await storage.sync.get([`staffUser_${fetchEnv}`]);
    const staffUser = settings[`staffUser_${fetchEnv}`];
    if (!staffUser || !staffUser.token) return [];

    const baseUrl = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
    const url = `${baseUrl}/3/technician/active?storeId=${storeId}&session_token=${staffUser.token}`;
    const response = await fetch(url);
    const json = await response.json();
    return json.data || [];
}

async function handleAction(request) {
    console.log("[Worker] Action:", request.action);
    switch (request.action) {
        case "generateReply":
            return await handleGenerateReply(request.history, request.clientName, request.clientPhone, request.clientId, request.apiEnv, request.tones, request.userStyle, request.modelChoice, request.language);
        case "fetchTechsOnly":
            return await fetchActiveTechnicians(request.storeId, request.apiEnv);
        case "fetchSlotsOnly":
            return await fetchAvailableSlots(request.storeId, request.from, request.to, request.apiEnv);
        case "requestOTP":
            const resReq = await requestOTP(request.phone, request.apiEnv);
            return { success: resReq.status === 'success', error: resReq.message };
        case "verifyOTP":
            return await verifyOTP(request.phone, request.otp, request.apiEnv);
        case "saveSettings":
            await storage.sync.set({ geminiApiKey: request.key });
            return { success: true };
        case "getSettings":
            const settings = await storage.sync.get(['geminiApiKey', 'staffUser_orb', 'staffUser_live']);
            return { 
                apiKey: settings.geminiApiKey,
                staffUser: settings['staffUser_orb'] || settings['staffUser_live'] 
            };
        case "logout":
            await storage.sync.set({ 'staffUser_orb': null, 'staffUser_live': null });
            return { success: true };
        default:
            return { error: "Unknown action: " + request.action };
    }
}

// Global Message Simulator
window.wingsWorker = {
    sendMessage: async (request, callback) => {
        const response = await handleAction(request);
        if (callback) callback(response);
        return response;
    }
};

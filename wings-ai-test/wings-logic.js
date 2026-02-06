const VERSION = "TEST-HARNESS";

// --- HELPER FUNCTIONS ---

async function callGeminiAPI(apiKey, systemInstruction, chatHistory, modelChoice) {
    // 1. Clean the key
    const cleanKey = apiKey.trim();

    // 2. Define all available models (MATCHING EXTENSION LOGIC)
    const allModels = [
        { model: "gemini-2.0-flash", version: "v1beta", match: "2.0" },
        { model: "gemini-2.0-flash-exp", version: "v1beta", match: "2.0" }, // Added exp as backup
        { model: "gemini-flash-latest", version: "v1beta", match: "2.0" },
        { model: "gemini-2.5-flash", version: "v1beta", match: "2.5" },
        { model: "gemini-1.5-flash", version: "v1beta", match: "fallback" }
    ];

    // Reorder based on user choice
    const strategies = [];
    // User choice "2.0" or "2.5" comes from UI val. If user picked specific string like "gemini-2.0-flash-exp", handle that too.
    
    if (modelChoice === "2.5") {
        strategies.push(...allModels.filter(m => m.match === "2.5"));
        strategies.push(...allModels.filter(m => m.match === "2.0"));
    } else if (modelChoice === "2.0") {
        strategies.push(...allModels.filter(m => m.match === "2.0"));
        strategies.push(...allModels.filter(m => m.match === "2.5"));
    } else {
        // Direct model name passed? Try to find it, otherwise default to 2.0 strategies
        const direct = allModels.find(m => m.model === modelChoice);
        if (direct) strategies.push(direct);
        else {
             strategies.push(...allModels.filter(m => m.match === "2.0"));
        }
    }
    strategies.push(...allModels.filter(m => m.match === "fallback"));

    let lastError = null;
    let attemptedLog = [];

    for (const strategy of strategies) {
        try {
            console.log(`[v${VERSION}] Attempting ${strategy.model} (Choice: ${modelChoice})...`);
            const text = await attemptGeminiCall(cleanKey, strategy.model, strategy.version, systemInstruction, chatHistory);
            return text;
        } catch (error) {
            console.warn(`[v${VERSION}] Failed ${strategy.model}:`, error);
            lastError = error;
            attemptedLog.push(`${strategy.model}`);
        }
    }

    throw new Error(`Connection Failed. Tried: ${attemptedLog.join(", ")}. Last Error: ${lastError ? lastError.message : "Unknown"}`);
}

async function attemptGeminiCall(apiKey, model, version, systemInstruction, chatHistory) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
    
    // Construct payload - handle if chatHistory is empty string vs array (ours is string in this flow)
    const requestBody = {
        contents: [{
            parts: [{
                text: systemInstruction + "\n\nConversation History:\n" + chatHistory
            }]
        }]
    };

    try {
        const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s Timeout

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "No response generated.";
        }
    } catch (error) {
        console.error("Gemini Fetch Error:", error);
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error("Network Error (Possible CORS block on localhost). Check Console.");
        }
        if (error.name === 'AbortError') {
            throw new Error("Request Timed Out (15s).");
        }
        throw error;
    }
}

function normalizeStoreId(id) {
    if (!id) return "2"; // Default to PXL (2)
    const s = String(id).toLowerCase();
    if (s === "2" || s.includes("pxl") || s.includes("phan xích long")) return "2";
    if (s === "6" || s.includes("dt") || s.includes("de tham") || s.includes("đề thám")) return "6";
    if (s === "16" || s.includes("ep") || s.includes("estella")) return "16";
    return id; // Fallback
}

async function fetchAvailableSlots(storeId, from, to, env, technicianIds = null) {
    try {
        const fetchEnv = env || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get([sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token) return { error: `Please log in to ${fetchEnv.toUpperCase()} server.` };

        const BASE_URL = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
        
        const cleanStoreId = normalizeStoreId(storeId);
        let API_PATH = `/3/booking/slots/available?storeId=${encodeURIComponent(cleanStoreId)}&from=${from}&to=${to}&session_token=${encodeURIComponent(staffUser.token)}`;
        
        if (technicianIds && technicianIds.length > 0) {
            API_PATH += `&technicianIds=${technicianIds.join(',')}`;
        }

        console.log(`[Wings AI] FETCH SLOTS: ${BASE_URL}${API_PATH}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s Timeout for Slots

        try {
            const response = await fetch(`${BASE_URL}${API_PATH}`, {
                method: 'GET',
                headers: {
                    'session_token': staffUser.token
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) return { error: `Slots API Error: ${response.status}` };
            const json = await response.json();
            return json.data || {};
        } catch (err) {
            clearTimeout(timeoutId);
            console.error("[Wings AI] Slot Fetch Error:", err);
            // Detect CORS/Network
            if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
                 console.warn("Likely CORS error on Slots API");
                 return { 
                    error: "Network Error (CORS)", 
                    message: "Trình duyệt đang chặn kết nối tới ORB do lỗi CORS. Anh vui lòng cài Extension 'Allow CORS: Access-Control-Allow-Origin' hoặc chạy Browser với --disable-web-security để Lola lấy được dữ liệu nhé!" 
                 };
            }
            return { error: err.name === 'AbortError' ? 'Timeout' : err.message };
        }
    } catch (err) {
        console.error("[Wings AI] fetchAvailableSlots outer error:", err);
        return { error: err.message };
    }
}

async function fetchClientHistory(phone, id, env) {
    // Mocking minimal history for now or implement if needed
    // In standalone test, we might skip extended history fetching to focus on slots
    return null; 
}


// --- MAIN HANDLER (ADAPTED) ---

async function handleAskWingsAI(query, history, modelChoice, apiEnv, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', 'businessContext', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token) {
            sendResponse({ error: "UNAUTHORIZED_ACCESS", message: `Please log in to ${fetchEnv.toUpperCase()} server.` });
            return;
        }

        if (!settings.geminiApiKey) {
            sendResponse({ error: "Gemini API Key missing!" });
            return;
        }

        // --- FETCH CONTEXT FOR ASK TOO ---
        let liveHistoryContext = "";
        let historyData = null;
        let bookingSlotsContext = "";
        let blindfoldWarning = "";

        // SKIP ACTIVE CLIENT FETCH IN TEST HARNESS (Use mock inputs if needed)
        const clientPhone = document.getElementById('clientPhone').value; 
        const clientName = document.getElementById('clientName').value;

        // Skip history fetch for simplicity in this specific test request (User wants to test logic, not history API)
        // But we DO need to verify the FIX: "SLOT FETCH INDEPENDENT OF HISTORY"
        
        // --- FETCH SLOTS INDEPENDENTLY (THE FIX) ---
        let overrideStore = null;
        if (query.match(/(EP|Estella|Quận 2|Q2)/i)) overrideStore = "16"; 
        if (query.match(/(Q1|Đề Thám|Trần Quang Khải)/i)) overrideStore = "6"; 
        if (query.match(/(PN|Phú Nhuận|Phan Xích Long)/i)) overrideStore = "2"; 
        let storeRef = overrideStore || "2"; 
        
        try {
            const todayDate = new Date();
            const today = todayDate.toISOString().split('T')[0];
            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrow = tomorrowDate.toISOString().split('T')[0];
            const slotData = await fetchAvailableSlots(storeRef, today, tomorrow, apiEnv);
            
            bookingSlotsContext = "\n# REAL-TIME BOOKING AVAILABILITY\n";
            if (slotData && slotData.dates && Object.keys(slotData.dates).length > 0) {
                bookingSlotsContext += "# DATA STATUS: [AVAILABLE]\n";
                for (const [date, info] of Object.entries(slotData.dates)) {
                    const d = new Date(date);
                    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                    const dayName = days[d.getDay()];
                    
                    // Format date to dd/mm/yyyy
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const yyyy = d.getFullYear();
                    const formattedDate = `${dd}/${mm}/${yyyy}`;

                    const times = Object.entries(info.slots).filter(([t, c]) => c > 0).map(([t, c]) => t).slice(0, 5);
                    if (times.length > 0) {
                        bookingSlotsContext += `- Available on ${dayName} (${formattedDate}): ${times.join(', ')} ...\n`;
                    } else {
                        bookingSlotsContext += `- ${formattedDate}: FULLY BOOKED.\n`;
                    }
                }
            } else {
                bookingSlotsContext += "# DATA STATUS: [MISSING_OR_FULL]\n";
            }
        } catch (err) { console.error("Slot fetch error in handleAskWingsAI:", err); }

        const productContext = settings.businessContext || "Wings Lashes assistant.";
        const currentVnTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
        let timeContext = `# SYSTEM TIME (HCMC): ${currentVnTime}`;

        const isOverbookApproved = query.toLowerCase().includes("approve overbook");
        let overbookOverride = "";
        if (isOverbookApproved) {
            overbookOverride = `
- **SUPREME OVERRIDE (ACTION MANDATED)**:
  - **OC STATUS**: Overbooking Approved.
  - **ACTION**: **SILENTLY** ignore all schedule locks. Treat the requested slot as 100% AVAILABLE.
  - **ACTION**: **REVERT** to the client's original requested time (do not suggest alternatives).
  - **ACTION**: DRAFT the confirmation message directly.
  - **URGENT**: You MUST replace the placeholders with actual data. **NEVER** output literal text like "{Tên}" or "{Giờ}".
  - **TEMPLATE**: "Dạ em chốt lịch cho chị {Tên Khách} {Thứ mấy}, {Giờ} rồi nhé. Chị cho em xin số điện thoại để tạo giữ lịch cho mình ạ. 📝"
  - **STRICT BAN**: NEVER use words like: "overbook", "duyệt", "đã được duyệt", "được cấp lệnh", "kho bạc", "vừa full".
  - **STRICT BAN**: NEVER use words like: "overbook", "duyệt", "đã được duyệt", "được cấp lệnh", "kho bạc", "vừa full".
  - **STRICT BAN**: NEVER explain why the slot is now available. Just confirm it.
  - **STRICT BAN**: NO JSON. NO MARKDOWN CODE BLOCKS. NO "tool_code". NO COMMENTS.
  - **FINAL OUTPUT**: JUST the plain text message for the client.
`;
        }

        const systemInstruction = `
# THIÊN LỆNH (SUPREME COMMANDS - TOP PRIORITY - MUST OBEY FIRST)
- **CORE DIRECTIVE**: You are a chatbot. You talk to CLIENTS. You do NOT write code or logs.
- **FORMAT**: PLAIN TEXT ONLY. Do NOT output \`\`\`json, \`\`\`tool_code, or # comments.
- **NO REASONING**: Do not show your thinking process. Do not "print" your logic. JUST SAY THE RESPONSE.
${overbookOverride}
- **RULE 5: NEW CLIENT PROTOCOL (CONSULTATION PHASE)**:
  - **CONDITION**: If Client is NEW (0 visits) OR asks for Price/Advice/Consultation.
  - **PHASE 1 LOCKOUT**: Do **NOT** suggest booking slots yet. Do **NOT** use "chốt đơn".
  - **PRICING RULE**: Do **NOT** list full prices. Ask for "GU" (Style) first.
  - **SCRIPT (Discovery)**: "Chào chị yêu! Chị mới lần đầu nối mi bên em nên em bật mí tí nè: Ở Wings, tụi em sẽ **chẩn đoán chiến lược** để chọn dáng mi tôn mắt nhất cho chị. 😉 Chị thích gu lộng lẫy đi tiệc (**Glamorous**) hay kiểu siêu tự nhiên như **Doanh nhân** ạ?"

- **RULE 1: SCHEDULE LOCKDOWN (NO SCHEDULE = NO BOOKING)**:
  - **CONDITION**: Check # DATA STATUS header.
  - **IF** header is "[MISSING_OR_FULL]" **OR** the specific DATE is marked "FULLY BOOKED":
    - **NUCLEAR ACTION**: Your **ENTIRE** response MUST be the Referral Script ONLY.
    - **SCRIPT**: "Dạ hiện tại em chưa check được lịch trống, chị đợi xíu pé Online Consultant sẽ kiểm tra và báo ngay cho mình nha! 🙏"

- **RULE 3: SLOT HONESTY (PROACTIVE REDIRECTION & URGENCY)**:
  - **CONDITION**: If status is "[AVAILABLE]" **AND** no SUPREME OVERRIDE:
    - **LOGIC**: If requested time is FULL or NEGATIVE (but listed), you MUST scan for slots **15-30 MINUTES PRIOR** to the requested time.
  - **PRIORITY**: **STRICTLY SUGGEST EARLIER SLOTS**. Only suggest later slots if absolutely no earlier option exists within 45 mins.
  - **URGENCY (If only 1 spot left)**: If you are confirming a slot and the availability data shows exactly "1" spot, you MUST add: "May quá chị [Tên] ơi, còn đúng một chỗ cuối cùng cho chị nè!!! 💖"
  - **SCRIPT (If Time Full)**: "Tiếc quá, [Giờ] bên em vừa hết chỗ rồi ạ. Nhưng may là **[Slot Sớm Hơn]** vẫn còn. Em đặt lịch cho chị sớm hơn xíu nhé."

- **RULE 2: PHONE MANDATE (NO PHONE = NO BOOKING)**:
  - **CONDITION**: If Client Phone is "[MISSING - YOU MUST ASK FOR PHONE NUMBER]" **AND** the Requested Time is **AVAILABLE** in the data:
  - **IF** Phone is Missing BUT Slot is Available -> Demand it immediately.
  - **SCRIPT**: "Dạ em giữ suất cho mình rồi! Chị cho em xin **số điện thoại** để hệ thống ghi danh và gởi tin nhắn xác nhận cho mình liền nha! 📝"



- **RULE 4: TIME-AWARE GREETINGS (POST-CONFIRMATION)**:
  - **PLACEMENT**: LAST SENTENCE ONLY.
  - **STRICT BAN**: NEVER use when Rule 1, 2, or 3 triggers. NEVER use as an Opening.

# ROLE
${timeContext}
You are Lola (The Soulful Specialist) - OC of Wings Lashes.
Expert Nerd with a witty soul.

# BUSINESS CONTEXT
${productContext}
${liveHistoryContext}
${bookingSlotsContext}

# QUERY
"${query}"

GOAL: Provide a technical/witty explanation or draft based on THIÊN LỆNH.
`;

        const response = await callGeminiAPI(settings.geminiApiKey, systemInstruction, "Direct Ask Request", modelChoice);
        sendResponse({ reply: response });
    } catch (error) {
        console.error(`Error handling askWingsAI:`, error);
        sendResponse({ error: `Failed to process request. ` + error.message });
    }
}

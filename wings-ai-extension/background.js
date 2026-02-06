const VERSION = "6.6.31";
console.log(`Wings Background Service Worker v${VERSION} (2026 Edition) LOADED`);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateReply") {
        handleGenerateReply(request.history, request.clientName, request.clientPhone, request.clientId, request.apiEnv, request.tones, request.userStyle, request.modelChoice, request.language, sendResponse);
        return true; 
    }
    if (request.action === "improveReply") {
        handleImproveReply(request.currentText, request.modelChoice, request.apiEnv, sendResponse);
        return true;
    }
    if (request.action === "shortenReply") {
        handleShortenReply(request.currentText, request.modelChoice, request.apiEnv, sendResponse);
        return true;
    }
    if (request.action === "formatReply") {
        handleFormatReply(request.currentText, request.modelChoice, request.apiEnv, sendResponse);
        return true;
    }
    if (request.action === "referralReply") {
        handleReferralReply(request.currentText, request.modelChoice, request.apiEnv, sendResponse);
        return true;
    }
    if (request.action === "requestPhoneReply") {
        handleRequestPhoneReply(request.currentText, request.modelChoice, request.apiEnv, sendResponse);
        return true;
    }
    if (request.action === "fetchTechsOnly") {
        fetchActiveTechnicians(request.storeId, request.apiEnv).then(sendResponse);
        return true;
    }
    if (request.action === "fetchSlotsOnly") {
        fetchAvailableSlots(request.storeId, request.from, request.to, request.apiEnv, request.technicianIds).then(sendResponse);
        return true;
    }
    if (request.action === "zaloRequestOTP") {
        requestZaloOTP(request.phone, request.apiEnv).then(sendResponse);
        return true;
    }
    if (request.action === "zaloVerifyOTP") {
        verifyZaloOTP(request.phone, request.otp, request.apiEnv).then(sendResponse);
        return true;
    }
    if (request.action === "checkStaffStatus") {
        checkStaffStatus(request.apiEnv).then(sendResponse);
        return true;
    }
    if (request.action === "createBooking") {
        createBooking(request.payload, request.apiEnv).then(sendResponse);
        return true;
    }
    if (request.action === "extractBookingIntent") {
        handleExtractIntent(request.text, request.modelChoice, request.apiEnv, sendResponse);
        return true;
    }
    if (request.action === "summarizeCombos") {
        handleSummarizeCombos(request.historyData, request.clientName, request.modelChoice, sendResponse);
        return true;
    }
    if (request.action === "fetchTechAppointments") {
        fetchTechnicianAppointments(request.technicianId, request.startDate, request.endDate, request.apiEnv).then(sendResponse);
        return true;
    }
    if (request.action === "askWingsAI") {
        handleAskWingsAI(request.query, request.history, request.modelChoice, request.apiEnv, sendResponse);
        return true;
    }
});

async function handleAskWingsAI(query, history, modelChoice, apiEnv, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', 'businessContext', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token || staffUser.status !== 'approved') {
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

        const activeClient = await chrome.storage.local.get(['active_client']);
        const clientPhone = activeClient.active_client?.phone;
        const clientName = activeClient.active_client?.name || "Client";
        const clientId = activeClient.active_client?.id;

        if (clientPhone) {
            try {
                historyData = await fetchClientHistory(clientPhone, clientId, apiEnv);
                if (historyData && !historyData.error) {
                    let historyLines = [];
                    if (historyData.last_service_name) historyLines.push(`- Last Service: ${historyData.last_service_name}`);
                    if (historyData.recent_styles) historyLines.push(`- Preferred Styles: ${historyData.recent_styles}`);
                    
                    const isPhoneMissing = !clientPhone || clientPhone.includes('123456789') || clientPhone.toLowerCase().includes('unknown');
                    const phoneDisplay = isPhoneMissing ? "[MISSING - YOU MUST ASK FOR PHONE NUMBER]" : clientPhone;

                    liveHistoryContext = `
# CRITICAL CLIENT HISTORY (REAL DATA FROM BACKEND)
The client ${clientName} (${phoneDisplay}) context:
${historyLines.join('\n')}
- Total Completed Services: ${historyData.total_completed || 0}
- Total Cancellations/No-Shows: ${historyData.total_cancelled || 0}
- General Staff Notes: ${historyData.general_notes || historyData.notes || 'None'}
`;

                }
            } catch (err) { console.error("Context fetch error in handleAskWingsAI:", err); }
        }

        // --- FETCH SLOTS INDEPENDENTLY ---
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

        const isOverbookApproved = query.toLowerCase().includes("approve overbook") || (history && history.toLowerCase().includes("approve overbook"));
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

async function handleReferralReply(currentText, modelChoice, apiEnv, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token || staffUser.status !== 'approved') {
            sendResponse({ error: "UNAUTHORIZED_ACCESS", message: `Please log in to ${fetchEnv.toUpperCase()} server.` });
            return;
        }
        if (!settings.geminiApiKey) {
            sendResponse({ error: "API Key logic error." });
            return;
        }

        const systemInstruction = `
# ROLE
You are a High-End Sales Consultant for Wings Lashes (Nối Mi Bóng Tối).

# OBJECTIVE
Your goal is to politely and persuasively ask the current client to refer their friends to us.

# THE OFFER (CRITICAL BUSINESS RULE)
- REWARD FOR YOU (referrer): "Only referring NEW clients gets 100 Diamonds" (Chỉ giới thiệu khách mới chưa từng làm mới được nhận 100 Kim Cương ~ 100k).
- REWARD FOR FRIEND (referee): "The friend you refer gets 30% OFF their first service" (Bạn của chị sẽ được giảm 30% cho lần đầu tiên).
- Win-Win: Make sure to mention BOTH benefits to make it irresistible.

# STYLE
- Cheeky, fun, "bén" (sharp), and caring.
- Use emojis 💎✨.
- Keep it short and natural.
- If there is DRAFT TEXT below, try to weave the referral request into it or append it naturally. If the text is empty, just create a standalone referral request.

# DRAFT TEXT
"${currentText}"

REPLY WITH THE MESSAGE ONLY in the same language as the draft text (or Vietnamese if empty).
`;

        const response = await callGeminiAPI(settings.geminiApiKey, systemInstruction, "Ref request", modelChoice);
        sendResponse({ reply: response });
    } catch (error) {
        console.error(`Error generating referral reply:`, error);
        sendResponse({ error: `Failed to gen referral. ` + error.message });
    }
}

async function handleImproveReply(currentText, modelChoice, apiEnv, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token || staffUser.status !== 'approved') {
            sendResponse({ error: "UNAUTHORIZED_ACCESS", message: `Please log in to ${fetchEnv.toUpperCase()} server.` });
            return;
        }
        if (!settings.geminiApiKey) {
            sendResponse({ error: "API Key logic error." });
            return;
        }

        const systemInstruction = `
# ROLE
You are a High-End Sales Consultant for Wings Lashes. 

# OBJECTIVE
Your goal is to "UPGRADE" the draft message provided below to be more persuasive, elite, and successful in closing a sale.

# REFINEMENT RULES
1. INJECT SOCIAL PROOF: Mention that this style or choice is highly popular among elite clients (entrepreneurs, influencers, sành điệu clients).
2. ELITE POSITIONING: Use sophisticated but warm language. Make the client feel like they are getting a "premium" experience.
3. KEEP IT NATURAL: Do not make it sound like an ad. Maintain the "bén" (sharp) and caring tone of Wings Lashes.
4. DO NOT CHANGE THE STYLE: If they suggested "Classic", keep it "Classic" but make it sound more desirable.
5. LENGTH: Keep it relatively short and punchy, similar to the original.

# DRAFT MESSAGE TO IMPROVE:
"${currentText}"

REPLY WITH THE IMPROVED VERSION ONLY.
`;

        const response = await callGeminiAPI(settings.geminiApiKey, systemInstruction, "No history needed for refinement.", modelChoice);
        sendResponse({ reply: response });
    } catch (error) {
        console.error(`Error refining reply:`, error);
        sendResponse({ error: `Failed to refine reply. ` + error.message });
    }
}

async function handleShortenReply(currentText, modelChoice, apiEnv, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token || staffUser.status !== 'approved') {
            sendResponse({ error: "UNAUTHORIZED_ACCESS", message: `Please log in to ${fetchEnv.toUpperCase()} server.` });
            return;
        }
        if (!settings.geminiApiKey) {
            sendResponse({ error: "API Key logic error." });
            return;
        }

        const systemInstruction = `
# ROLE
You are a High-End Sales Consultant for Wings Lashes.

# OBJECTIVE
Your goal is to "SHORTEN" the draft message provided below while keeping the core meaning and the polite, "bén" tone.

# RULES
1. REMOVE FLUFF: Cut unnecessary words.
2. KEEP KEY INFO: Do NOT remove prices, times, or important questions.
3. PRESERVE EMOJIS: Keep at least 1-2 emojis if they exist.
4. MAKE IT PUNCHY: The result should be quick to read but still polite.

# DRAFT MESSAGE:
"${currentText}"

REPLY WITH THE SHORTENED VERSION ONLY.
`;

        const response = await callGeminiAPI(settings.geminiApiKey, systemInstruction, "Shorten request", modelChoice);
        sendResponse({ reply: response });
    } catch (error) {
        console.error(`Error shortening reply:`, error);
        sendResponse({ error: `Failed to shorten reply. ` + error.message });
    }
}

async function handleFormatReply(currentText, modelChoice, apiEnv, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token || staffUser.status !== 'approved') {
            sendResponse({ error: "UNAUTHORIZED_ACCESS", message: `Please log in to ${fetchEnv.toUpperCase()} server.` });
            return;
        }
        if (!settings.geminiApiKey) {
            sendResponse({ error: "API Key logic error." });
            return;
        }

        const systemInstruction = `
# ROLE
You are a High-End Sales Consultant for Wings Lashes.

# OBJECTIVE
Your goal is to REFORMAT the draft message provided below to be extremely easy to read on a mobile phone screen.

# RULES
1. MULTIPLE LINES: Break long paragraphs into single sentences or short chunks.
2. SPACING: Use double newlines between chunks to create visual breathing room.
3. LISTS: Use bullet points or emojis for any list of items, prices, or times.
4. NO CONTENT DELETION: Do not remove any information. Just restructure the layout.
5. TONE: Maintain the polite, "bén" tone.

# DRAFT MESSAGE:
"${currentText}"

REPLY WITH THE FORMATTED VERSION ONLY.
`;

        const response = await callGeminiAPI(settings.geminiApiKey, systemInstruction, "Format request", modelChoice);
        sendResponse({ reply: response });
    } catch (error) {
        console.error(`Error formatting reply:`, error);
        sendResponse({ error: `Failed to format reply. ` + error.message });
    }
}

async function handleRequestPhoneReply(currentText, modelChoice, apiEnv, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token || staffUser.status !== 'approved') {
            sendResponse({ error: "UNAUTHORIZED_ACCESS", message: `Please log in to ${fetchEnv.toUpperCase()} server.` });
            return;
        }
        if (!settings.geminiApiKey) {
            sendResponse({ error: "API Key logic error." });
            return;
        }

        const systemInstruction = `
# ROLE
You are a High-End Sales Consultant for Wings Lashes (Nối Mi Bóng Tối).

# OBJECTIVE
Your goal is to politely and persuasively ask the client for their phone number so you can assist them better (e.g., for booking, sending photos, or diamond balance updates).

# RULES
1. BE POLITE & WARM: Use "bén" (sharp) but caring Vietnamese.
2. REASONING: Give a quick reason why we need it (e.g., "để em tiện gởi mẫu cho chị", "để em check số kim cương cho chị nè").
3. KEEP IT SHORT: 1-2 sentences maximum.
4. EMOJIS: Use 📞✨.
5. INTEGRATION: If there is DRAFT TEXT, weave the request into it. If empty, create a standalone request.

# DRAFT TEXT:
"${currentText}"

REPLY WITH THE MESSAGE ONLY.
`;

        const response = await callGeminiAPI(settings.geminiApiKey, systemInstruction, "Phone request", modelChoice);
        sendResponse({ reply: response });
    } catch (error) {
        console.error(`Error requesting phone:`, error);
        sendResponse({ error: `Failed to request phone. ` + error.message });
    }
}

async function handleGenerateReply(chatHistory, clientName, clientPhone, clientId, apiEnv, tones, userStyle, modelChoice, language, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', 'businessContext', sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token || staffUser.status !== 'approved') {
            sendResponse({ error: "UNAUTHORIZED_ACCESS", message: `Please log in to ${fetchEnv.toUpperCase()} server.` });
            return;
        }
        if (!settings.geminiApiKey) {
            sendResponse({ error: "API Key logic error." });
            return;
        }

        const apiKey = settings.geminiApiKey;
        const context = settings.businessContext || "Wings Lashes assistant.";
        const selectedTones = (tones && tones.length > 0) ? tones.join(", ") : "Cheerful";
        const targetStyle = userStyle || "Ngắn gọn, vui vẻ, có emoji";
        
        // V3.0: Live Data Integration (Fetch Actual History)
        let liveHistoryContext = "";
        let historyData = null;
        let bookingSlotsContext = "";
        
        if (clientPhone) {
            try {
                // Pass environment (orb/live)
                historyData = await fetchClientHistory(clientPhone, clientId, apiEnv);
                
                // Fetch CS Owner
                if (historyData && historyData.user_id) {
                    const csData = await fetchCSOwner(historyData.user_id, apiEnv);
                    if (csData && csData.status === 'success') {
                        historyData.cs_owner = { id: csData.cs_id, name: csData.cs_name };
                    }
                }

                if (historyData && historyData.error) {
                    liveHistoryContext = `Client History Error: ${historyData.error}`;
                } else if (historyData) {
                    let historyLines = [];
                    // Ensure diamond balance is shown even if 0
                    const diaBalance = historyData.diamond_balance !== undefined ? historyData.diamond_balance : 0;
                    if (historyData.diamond_referral > 0) {
                         historyLines.push(`- Referral Diamonds: ${historyData.diamond_referral} 💎`);
                    }

                    if (historyData.critical_notes) {
                        historyLines.push(`- ⚠️ CRITICAL ALERTS: ${historyData.critical_notes}`);
                    }
                    
                    if (historyData.last_service_name && historyData.last_service_date) {
                        historyLines.push(`- LAST SERVICE: ${historyData.last_service_name} on ${historyData.last_service_date} (Tech: ${historyData.last_technician || 'N/A'})`);
                    }

                    if (historyData.top_technician && historyData.top_technician !== "N/A") {
                        historyLines.push(`- FAVORITE TECH: ${historyData.top_technician}`);
                    }

                    if (historyData.recent_styles) {
                        historyLines.push(`- PREFERRED STYLES/DESIGN: ${historyData.recent_styles}`);
                    }

                    if (historyData.active_combos) {
                        historyLines.push(`- ACTIVE PACKAGES: ${historyData.active_combos}`);
                    }

                    if (historyData.social_connections) {
                        historyLines.push(`- SOCIAL CIRCLE (Friends): ${historyData.social_connections}`);
                    }
                    
                    if (historyData.next_order_name && historyData.next_order_date) {
                        historyLines.push(`- UPCOMING BOOKING: ${historyData.next_order_name} on ${historyData.next_order_date} (Store: ${historyData.store_name})`);
                    }

                    if (historyData.total_spending) {
                        const formattedSpending = new Intl.NumberFormat('vi-VN').format(historyData.total_spending);
                        historyLines.push(`- LIFETIME SPENDING: ${formattedSpending} VND (VIP Candidate)`);
                    }
                    if (historyData.first_visit_date) historyLines.push(`- LOYAL CLIENT SINCE: ${historyData.first_visit_date.split(' ')[0]}`);

                    const isPhoneMissing = !clientPhone || clientPhone.includes('123456789') || clientPhone.toLowerCase().includes('unknown');
                    const phoneDisplay = isPhoneMissing ? "[MISSING - MANDATORY COLLECTION]" : clientPhone;

                    liveHistoryContext = `
# CRITICAL CLIENT HISTORY (REAL DATA FROM BACKEND)
The client ${clientName} (${phoneDisplay}) context:
${historyLines.join('\n')}
- Total Completed Services: ${historyData.total_completed || 0}
- Total Cancellations/No-Shows: ${historyData.total_cancelled || 0}
- General Staff Notes: ${historyData.general_notes || historyData.notes || 'None'}
`;

                    // --- V3.5: BOOKING SLOTS & TECHNICIAN INTEGRATION ---
                    // --- V6.6.18: DYNAMIC STORE PARSING ---
                    let overrideStore = null;
                    const lastUserMsg = chatHistory.split("User:").pop() || "";
                    if (chatHistory.match(/(EP|Estella|Quận 2|Q2)/i)) overrideStore = "16"; 
                    if (chatHistory.match(/(Q1|Đề Thám|Trần Quang Khải)/i)) overrideStore = "6"; 
                    if (chatHistory.match(/(PN|Phú Nhuận|Phan Xích Long)/i)) overrideStore = "2"; 

                    let storeRef = overrideStore || historyData.store_name || "2"; 
                    
                    try {
                        const todayDate = new Date();
                        const today = todayDate.toISOString().split('T')[0];
                        const tomorrowDate = new Date();
                        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                        const tomorrow = tomorrowDate.toISOString().split('T')[0];
                        
                        // 1. Fetch Slots
                        const slotData = await fetchAvailableSlots(storeRef, today, tomorrow, apiEnv);
                        
                        // 2. Fetch Active Technicians for today
                        const techData = await fetchActiveTechnicians(storeRef, apiEnv);
                        const activeTechs = Array.isArray(techData) ? techData : [];
                        
                        // 3. Construct Booking Context
                        bookingSlotsContext = "\n# REAL-TIME BOOKING & STAFF STATUS\n";
                        bookingSlotsContext += `Current Store: ${storeRef}\n`;
                        
                        if (historyData.top_technician) {
                            const isFavWorking = activeTechs.find(t => t.name.toLowerCase().includes(historyData.top_technician.toLowerCase()));
                            if (isFavWorking) {
                                bookingSlotsContext += `- FAVORITE TECH STATUS: ${historyData.top_technician} IS WORKING TODAY (Shift: ${isFavWorking.working_shift?.start} - ${isFavWorking.working_shift?.end}).\n`;
                            } else {
                                bookingSlotsContext += `- FAVORITE TECH STATUS: ${historyData.top_technician} is OFF or not at this store today.\n`;
                            }
                        }

                        if (slotData && slotData.dates && Object.keys(slotData.dates).length > 0) {
                            bookingSlotsContext += "# DATA STATUS: [AVAILABLE]\n";
                            for (const [date, info] of Object.entries(slotData.dates)) {
                                const availableTimes = Object.entries(info.slots)
                                    .filter(([time, count]) => count > 0)
                                    .map(([time, count]) => time)
                                    .slice(0, 10); 
                                
                                const d = new Date(date);
                                // Format date to dd/mm/yyyy
                                const dd = String(d.getDate()).padStart(2, '0');
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const yyyy = d.getFullYear();
                                const formattedDate = `${dd}/${mm}/${yyyy}`;

                                if (availableTimes.length > 0) {
                                    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                                    const dayName = days[d.getDay()];
                                    bookingSlotsContext += `- Available on ${dayName} (${formattedDate}): ${availableTimes.join(', ')} ...\n`;
                                } else {
                                    bookingSlotsContext += `- ${formattedDate}: FULLY BOOKED.\n`;
                                }
                            }
                        } else {
                             bookingSlotsContext += "# DATA STATUS: [MISSING_OR_FULL]\n";
                        }
                    } catch (slotErr) {
                        console.warn("[Wings AI] Failed to fetch slots/techs:", slotErr);
                    }
                }
            } catch (err) {
                console.warn("[Wings AI] Failed to fetch live history:", err);
            }
        }
        
        // Language Logic
        let langInstruction = "";
        if (language === "EN") langInstruction = "RESPONSE LANGUAGE: ENGLISH (MUST REPLY IN ENGLISH ONLY).";
        else if (language === "VI") langInstruction = "RESPONSE LANGUAGE: VIETNAMESE (MUST REPLY IN VIETNAMESE ONLY).";
        else langInstruction = "RESPONSE LANGUAGE: AUTO (Detect the language of the client's last message and respond in that same language naturally).";

        // Fetch recent corrections for "Fail Faster" learning
        const localData = await chrome.storage.local.get(['wings_ai_corrections']);
        const corrections = localData.wings_ai_corrections || [];
        let correctionPrompt = "";
        if (corrections.length > 0) {
            correctionPrompt = "\n# RECENT CORRECTIONS (MANDATORY RULES based on past mistakes):\n";
            // Sort by latest first and take top 10 to keep prompt clean
            const sorted = [...corrections].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
            sorted.forEach(c => {
                correctionPrompt += `- ${c.text}\n`;
            });
        }

                // --- V6.6.11: BLINDFOLD MODE INJECTION ---
        const hasPhoto = chatHistory.includes("[SENT PHOTO]");
        let blindfoldWarning = "";
        if (!hasPhoto) {
            blindfoldWarning = `
# SYSTEM ALERT: BLINDFOLD MODE ACTIVATED 🕶️
- **CONTEXT**: The user has **NOT** sent any photo in this session. You CANNOT see them.
- **CRITICAL BAN**: You are STRICTLY FORBIDDEN from using visual compliments/diagnoses such as:
  - "dáng mắt mlem mlem" / "mắt chị đẹp"
  - "nhìn hình" / "zoom hình" / "full HD"
  - "táy máy" / "bắt mạch"
  - "khuôn mặt chị"
- **ACTION**: If you need to assess their features, you MUST ASK for a photo first.
- **SAFE FILLER**: Compliment their **TASTE/CHOICE** instead (e.g., "Gu chị chọn đỉnh quá", "Dòng này là best choice").
`;
        }

                // --- V6.6.24: TIME AWARENESS INJECTION ---
        const currentVnTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
        const vnDate = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
        const vnHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }));
        
        let timeContext = `
# SYSTEM TIME (HCMC): ${currentVnTime}
- Date: ${vnDate}
- Current Hour: ${vnHour}h
- Phase Logic: ${vnHour < 11 ? 'Sáng' : vnHour < 14 ? 'Trưa' : vnHour < 18 ? 'Chiều' : vnHour < 22 ? 'Tối' : 'Đêm'}
`;
        const isOverbookApproved = chatHistory.toLowerCase().includes("approve overbook");
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
    - **NUCLEAR ACTION**: Your **ENTIRE** response MUST be the Mandatory Script ONLY.
    - **BANNED**: No openings, no persona fluff, no well-wishes.
    - **MANDATORY SCRIPT**: "Dạ hiện tại em chưa check được lịch trống, chị đợi xíu pé Online Consultant sẽ kiểm tra và báo ngay cho mình nha! 🙏"

- **RULE 3: SLOT HONESTY (PROACTIVE REDIRECTION & URGENCY)**:
  - **CONDITION**: If status is "[AVAILABLE]" **AND** no SUPREME OVERRIDE:
    - **LOGIC**: If requested time is **NOT LISTED** in the available data (Full or Invalid), you MUST scan for slots **15-30 MINUTES PRIOR** to the requested time.
  - **PRIORITY**: **STRICTLY SUGGEST EARLIER SLOTS**. Only suggest later slots if absolutely no earlier option exists within 45 mins.
  - **URGENCY (If only 1 spot left)**: If you are confirming a slot and the availability data shows exactly "1" spot, you MUST add: "May quá chị [Tên] ơi, còn đúng một chỗ cuối cùng cho chị nè!!! 💖"
  - **SCRIPT (If Time Full)**: "Tiếc quá, [Giờ] bên em vừa hết chỗ rồi ạ. Nhưng may là **[Slot Sớm Hơn]** vẫn còn. Em đặt lịch cho chị sớm hơn xíu nhé."

- **RULE 2: PHONE MANDATE (NO PHONE = NO CONFIRMATION)**:
  - **CONDITION**: If Client Phone is "[MISSING - MANDATORY COLLECTION]" **AND** the Requested Time is **AVAILABLE** in the data:
    - **ACTION**: You are BANNED from confirming the time/booking.
    - **ACTION**: Demand the phone number immediately.
    - **MANDATORY SCRIPT**: "Dạ em giữ suất cho mình rồi! Chị cho em xin **số điện thoại** để hệ thống ghi danh và gởi tin nhắn xác nhận cho mình liền nha! 📝"


- **RULE 4: TIME-AWARE GREETINGS (POST-CONFIRMATION)**:
  - **PLACEMENT**: LAST SENTENCE ONLY.
  - **STRICT BAN**: NEVER use when Rule 1, 2, or 3 triggers. NEVER use as an Opening.

# ROLE
${timeContext}
You are Lola (The Soulful Specialist) - OC of Wings Lashes. 
Expert Nerd with a witty soul. Focus: Booking & Retention.

# BUSINESS CONTEXT
${context}
${correctionPrompt}
${liveHistoryContext}
${bookingSlotsContext}
${blindfoldWarning}

# CS OWNERSHIP
${historyData?.cs_owner ? `Dedicated CS Owner: ${historyData.cs_owner.name}` : `Currently Unassigned.`}

# ADDITIONAL RULES
- **BRANCH LIST**: PN (309 PXL), Q1 (159 Đề Thám), Q2 (Estella).
- **CRISIS SOS**: If client is angry -> Sincere apology + Pivot to HyperLight.
- **TONE**: Helpful but technical.
- **FORMAT**: No mid-sentence breaks. Double newline for separation.
- ${langInstruction}

# CONVERSATION History
Client Name: ${clientName}
${chatHistory}

GOAL: Apply THIÊN LỆNH first. If all rules are met, then respond as Lola.
`;

        // Call Gemini API
        const response = await callGeminiAPI(apiKey, systemInstruction, chatHistory, modelChoice);
            // V3.0: Send back the history data so the UI can show diamond counts etc.
            sendResponse({ 
                reply: response, 
                liveHistory: liveHistoryContext,
                historyData: historyData 
            });

    } catch (error) {
        console.error(`Error calling Gemini (v${VERSION}):`, error);
        sendResponse({ error: `Failed to generate reply (v${VERSION}). ` + error.message });
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

async function fetchActiveTechnicians(storeId, env) {
    try {
        const fetchEnv = env || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get([sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token) return { error: `Please log in to ${fetchEnv.toUpperCase()} server.` };

        const BASE_URL = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
        
        const cleanStoreId = normalizeStoreId(storeId);
        const API_PATH = `/3/technician/active?storeId=${encodeURIComponent(cleanStoreId)}&session_token=${encodeURIComponent(staffUser.token)}`;

        console.log(`[Wings AI] FETCH TECHS: ${BASE_URL}${API_PATH}`);

        const response = await fetch(`${BASE_URL}${API_PATH}`, {
            method: 'GET',
            headers: {
                'session_token': staffUser.token
            }
        });

        if (!response.ok) return { error: `Tech API Error: ${response.status}` };
        const json = await response.json();
        return json.data || [];
    } catch (err) {
        console.error("[Wings AI] Tech Fetch Error:", err);
        return [];
    }
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
        
        // Add technician filter if provided
        if (technicianIds && technicianIds.length > 0) {
            API_PATH += `&technicianIds=${technicianIds.join(',')}`;
        }

        console.log(`[Wings AI] FETCH SLOTS: ${BASE_URL}${API_PATH}`);

        const response = await fetch(`${BASE_URL}${API_PATH}`, {
            method: 'GET',
            headers: {
                'session_token': staffUser.token
            }
        });

        if (!response.ok) return { error: `Slots API Error: ${response.status}` };
        const json = await response.json();
        return json.data || {};
    } catch (err) {
        console.error("[Wings AI] Slot Fetch Error:", err);
        return { error: err.message };
    }
}

async function fetchTechnicianAppointments(technicianId, startDate, endDate, env) {
    try {
        const fetchEnv = env || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get([sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token) {
            return { error: `Please log in to ${fetchEnv.toUpperCase()} server.` };
        }

        const BASE_URL = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
        const API_PATH = `/3/technician/appointments?technician_id=${technicianId}&start_date=${startDate}&end_date=${endDate}&session_token=${encodeURIComponent(staffUser.token)}`;

        console.log(`[Wings AI] FETCH APPOINTMENTS: ${BASE_URL}${API_PATH}`);

        const response = await fetch(`${BASE_URL}${API_PATH}`, {
            method: 'GET',
            headers: {
                'session_token': staffUser.token
            }
        });

        if (!response.ok) {
            return { error: `Appointments API Error: ${response.status}` };
        }

        const json = await response.json();
        return json; // Return full response including status and data
    } catch (err) {
        console.error("[Wings AI] Appointments Fetch Error:", err);
        return { error: err.message };
    }
}

async function callGeminiAPI(apiKey, systemInstruction, chatHistory, modelChoice) {
    // 1. Clean the key (remove spaces/newlines)
    const cleanKey = apiKey.trim();

    // 2. Define all available models
    const allModels = [
        { model: "gemini-2.0-flash", version: "v1beta", match: "2.0" },
        { model: "gemini-flash-latest", version: "v1beta", match: "2.0" },
        { model: "gemini-2.5-flash", version: "v1beta", match: "2.5" },
        { model: "gemini-1.5-flash", version: "v1beta", match: "fallback" },
        { model: "gemini-pro-latest", version: "v1beta", match: "pro" }
    ];

    // Reorder based on user choice
    const strategies = [];
    if (modelChoice === "2.5") {
        strategies.push(...allModels.filter(m => m.match === "2.5"));
        strategies.push(...allModels.filter(m => m.match === "2.0"));
    } else {
        strategies.push(...allModels.filter(m => m.match === "2.0"));
        strategies.push(...allModels.filter(m => m.match === "2.5"));
    }
    strategies.push(...allModels.filter(m => m.match === "fallback" || m.match === "pro"));

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

    throw new Error(`Connection Failed. Tried: ${attemptedLog.join(", ")}. Last Error: ${lastError.message}`);
}

async function attemptGeminiCall(apiKey, model, version, systemInstruction, chatHistory) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: systemInstruction + "\n\nConversation History:\n" + chatHistory
            }]
        }]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errText = await response.text();
        // If the error text is JSON, try to parse it to show a cleaner message
        try {
            const errJson = JSON.parse(errText);
            if (errJson.error && errJson.error.message) {
                throw new Error(errJson.error.message);
            }
        } catch (e) {
            // Ignore parse error
        }
        throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    } else {
        return "No response generated.";
    }
}

async function fetchCSOwner(clientId, env) {
    try {
        const fetchEnv = env || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get([sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token) return { status: 'error', message: `Please log in to ${fetchEnv.toUpperCase()} server.` };

        const baseUrl = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
        const response = await fetch(`${baseUrl}/3/cs/get-owner`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_token: staffUser.token,
                client_id: clientId
            })
        });
        return await response.json();
    } catch (err) {
        return { status: 'error', message: err.message };
    }
}

async function createBooking(payload, env) {
    try {
        const fetchEnv = env || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get([sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token) return { status: 'error', message: `Please log in to ${fetchEnv.toUpperCase()} server.` };

        const baseUrl = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
        
        // Ensure session_token is in the payload
        const finalPayload = {
            ...payload,
            session_token: staffUser.token
        };

        const response = await fetch(`${baseUrl}/3/booking/create`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(finalPayload)
        });
        return await response.json();
    } catch (err) {
        return { status: 'error', message: err.message };
    }
}

async function fetchClientHistory(phone, clientId, env) {
    try {
        const fetchEnv = env || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get([sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser || !staffUser.token) return { error: `Please log in to ${fetchEnv.toUpperCase()} server.` };

        const BASE_URL = fetchEnv === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
        const API_PATH = '/3/client/history'; 

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 9) return null;

        const url = `${BASE_URL}${API_PATH}`;
        
        // Use provided clientId OR check persistent storage for cached ID
        let activeId = clientId;
        if (!activeId) {
            const cache = await chrome.storage.local.get(['phoneToId']);
            activeId = (cache.phoneToId || {})[cleanPhone];
        }
        
        const payload = {
            phone: cleanPhone,
            user_id: activeId, // Maximize match accuracy
            limit: 5,
            session_token: staffUser.token
        };
        
        console.log(`[Wings AI] API REQUEST: Phone=${cleanPhone}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) return { error: `API Error: ${response.status}` };

        const json = await response.json();
        
        console.log("[Wings AI] API JSON Keys:", Object.keys(json));
        console.log("[Wings AI] Active Combos Value:", json.active_combos);
        
        // Save UID
        if (json.user_id) {
            const cache = await chrome.storage.local.get(['phoneToId']);
            const mapping = cache.phoneToId || {};
            if (mapping[cleanPhone] !== json.user_id) {
                mapping[cleanPhone] = json.user_id;
                await chrome.storage.local.set({ phoneToId: mapping });
            }
        }

        // --- NEW INTELLIGENCE PARSING ---

        // 1. Parse Profile Notes (Critical Warnings)
        let criticalNotes = [];
        let generalNotes = [];
        if (Array.isArray(json.profile_notes)) {
            json.profile_notes.forEach(n => {
                const noteText = `[${n.type.toUpperCase()}] ${n.note} (by ${n.staff_name})`;
                if (n.type === 'danger' || n.type === 'warning' || n.is_pinned === '1') {
                    criticalNotes.push(noteText);
                } else {
                    generalNotes.push(noteText);
                }
            });
        }

        // 2. Parse History (Technician Loyalty & Style Preferences)
        let historyHighlights = [];
        let favoriteTechs = {};
        let recentStyles = [];
        let storeName = "Unknown";
        let lastServiceDate = null;
        let lastServiceName = null;
        let lastTechnician = null;
        let nextOrderName = null;
        let nextOrderDate = null;

        if (Array.isArray(json.history_list)) {
            // Sort by date descending just in case
            const sortedHistory = json.history_list.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
            
            // Analyze last 5 visits
            sortedHistory.slice(0, 5).forEach(h => {
                // Technician count
                if (h.technician_name) {
                    favoriteTechs[h.technician_name] = (favoriteTechs[h.technician_name] || 0) + 1;
                }
                // Style tracking (Design + Color)
                if (h.design || h.color) {
                    recentStyles.push(`${h.design || ''} ${h.color || ''}`.trim());
                }
            });

            // Get Last Past Service
            const now = new Date();
            const past = sortedHistory.filter(h => new Date(h.service_date) <= now && h.status === 'Completed');
            const upcoming = sortedHistory.filter(h => new Date(h.service_date) > now && h.status !== 'Cancelled');
            
            if (past.length > 0) {
                const last = past[0];
                lastServiceDate = last.service_date;
                lastServiceName = last.service_name;
                lastTechnician = last.technician_name;
                storeName = last.store_name;
                
                // Add specific style details to highlights
                let styleDetail = "";
                if (last.design) styleDetail += `Design: ${last.design}, `;
                if (last.color) styleDetail += `Color: ${last.color}`;
                if (styleDetail) historyHighlights.push(`Last Preference: ${styleDetail}`);
            }

            if (upcoming.length > 0) {
                const next = upcoming[upcoming.length - 1]; // Closest to now
                nextOrderName = next.service_name;
                nextOrderDate = next.service_date;
            }
        }

        // Determine Favorite Tech
        let topTech = "N/A";
        let maxCount = 0;
        for (const [tech, count] of Object.entries(favoriteTechs)) {
            if (count > maxCount) {
                maxCount = count;
                topTech = tech;
            }
        }
        if (topTech !== "N/A") {
            historyHighlights.push(`Favorite Technician: ${topTech} (${maxCount} visits)`);
        }

        // 3. Parse Referrals (Social Proof)
        let socialProof = [];
        if (Array.isArray(json.referral_list)) {
            json.referral_list.forEach(r => {
                socialProof.push(`${r.name} (Visited: ${r.last_visited?.split(' ')[0]})`);
            });
        }

        // 4. Parse Active Combos (Packages)
        let activePackages = [];
        if (Array.isArray(json.active_combos)) {
            json.active_combos.forEach(c => {
                // Determine simplest status for AI
                const remaining = c.sessions_remaining || (c.count_new + c.count_refill);
                activePackages.push(`${c.combo_name} (${remaining} sessions left)`);
            });
        }

        // Construct the rich context object
        return {
            user_id: json.user_id,
            client_name: json.client_name || 'Valued Client',
            diamond_balance: json.diamond || 0,
            diamond_referral: json.diamond_referral || 0,
            total_spending: json.total_spending || 0,
            first_visit_date: json.first_visit_date,
            
            // Standard Return Fields (Legacy support)
            last_service_name: lastServiceName,
            last_service_date: lastServiceDate,
            last_technician: lastTechnician,
            next_order_name: nextOrderName,
            next_order_date: nextOrderDate,
            store_name: storeName,
            total_completed: json.total_completed,
            total_cancelled: (json.total_cancelled || 0) + (json.total_not_coming || 0),
            
            // Advanced Intelligence Fields
            top_technician: topTech,
            recent_styles: [...new Set(recentStyles)].join(", "), // Unique styles
            social_connections: socialProof.join(", "),
            active_combos: activePackages.join(", "),
            active_combos_raw: json.active_combos || [],
            critical_notes: criticalNotes.join("\n"),
            general_notes: generalNotes.join("\n"),
            
            // Raw Error (if any logic failed internally, though we covered most)
            error: null
        };

    } catch (err) {
        console.error("[Wings AI] API Fetch Error:", err);
        return { error: `Fetch Failed: ${err.message}` };
    }
}

async function requestZaloOTP(phone, env) {
    try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const baseUrl = env === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
        console.log(`[Wings AI] Requesting OTP for ${cleanPhone} on ${env}`);
        
        const response = await fetch(`${baseUrl}/1/public/user/contact/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: cleanPhone, client_business_id: 1, language_id: 2 })
        });
        
        const json = await response.json();
        console.log(`[Wings AI] Request OTP Response:`, json);
        return json;
    } catch (err) {
        console.error(`[Wings AI] Request OTP Error:`, err);
        return { status: 'error', error: err.message };
    }
}

async function verifyZaloOTP(phone, otp, env) {
    try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const baseUrl = env === 'live' ? 'https://api.wingslashes.com' : 'http://api.orb';
        console.log(`[Wings AI] Verifying OTP for ${cleanPhone} on ${env}`);
        
        const response = await fetch(`${baseUrl}/1/public/user/contact/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: cleanPhone, verification_code: otp })
        });
        const json = await response.json();
        console.log(`[Wings AI] Verify OTP Response:`, json);
        
        if (json.status === 'success' && json.data?.user) {
            // Admin Bypass logic
            // Admin Bypass logic
            const user = json.data.user;
            const isAdmin = user.full_name === 'Danny Do' 
                            || user.phone_number.endsWith('3944')
                            || user.role === 'admin'
                            || user.is_admin === true
                            || user.is_admin === 1
                            || user.user_id === 51702
                            || user.user_id === 45103;
            
            // Save staff user (Environment Specific)
            const staffUser = {
                uid: `zalo-${json.data.user.user_id}`,
                displayName: json.data.user.full_name,
                phoneNumber: json.data.user.phone_number,
                token: json.data.user.login_token,
                status: isAdmin ? 'approved' : 'pending' 
            };
            const sessionKey = `staffUser_${env}`;
            await chrome.storage.sync.set({ [sessionKey]: staffUser });
        }
        return json;
    } catch (err) {
        return { status: 'error', error: err.message };
    }
}

async function checkStaffStatus(env) {
    try {
        const fetchEnv = env || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get([sessionKey]);
        const staffUser = settings[sessionKey];

        if (!staffUser) return { status: 'none' };
        
        // Auto-approve whitelisted users if they are still pending
        if (staffUser.status === 'pending') {
            const uid = staffUser.uid || "";
            if (uid.includes('51702') || uid.includes('45103')) {
                staffUser.status = 'approved';
                await chrome.storage.sync.set({ [sessionKey]: staffUser });
            }
        }

        return { status: staffUser.status, user: staffUser };
    } catch (err) {
        return { status: 'error', error: err.message };
    }
}
async function handleExtractIntent(text, modelChoice, apiEnv, sendResponse) {
    try {
        const fetchEnv = apiEnv || 'orb';
        const sessionKey = `staffUser_${fetchEnv}`;
        const settings = await chrome.storage.sync.get(['geminiApiKey', sessionKey]);

        if (!settings.geminiApiKey) {
            sendResponse({ error: "API Key missing." });
            return;
        }

        const systemInstruction = `
# ROLE
You are a Data Extractor AI for Wings Lashes.

# OBJECTIVE
Extract booking details from the provided text and return ONLY a JSON object.

# MAPPING RULES (IMPORTANT - USE THESE IDs ONLY)
- Store: 
    - Phan Xích Long, PXL, Phú Nhuận -> "2"
    - Đề Thám, Quận 1, District 1 -> "6"
    - Estella Place, Quận 2, District 2, An Phú -> "16"

- Date: Convert relative terms to YYYY-MM-DD. 
    - Today is: ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})} (${new Date().toISOString().split('T')[0]})
    - "Mai" = Tomorrow
    - "Thứ Tư", "Thứ Năm", etc. = Next occurrence of that day.

- Time: Convert to "HH:MM" (24h format). Handle "h sáng", "h chiều", "h tối".

- Staff: Extract name if mentioned (e.g. "với Khanh", "bé Giang").

# OUTPUT FORMAT
Value must be string or null.
{
  "storeId": "2" | "6" | "16" | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "techName": "string or null"
}

# INPUT TEXT:
"${text}"
`;

        const responseText = await callGeminiAPI(settings.geminiApiKey, systemInstruction, "Intent Extract", modelChoice || "gemini-2.0-flash-exp");
        
        // Clean markdown if AI returns it
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleaned);
        sendResponse({ intent: json });
    } catch (error) {
        console.error("Extraction error:", error);
        sendResponse({ error: error.message });
    }
}

async function handleSummarizeCombos(historyData, clientName, modelChoice, sendResponse) {
    console.log("[Wings AI] handleSummarizeCombos called with:", { historyData, clientName, modelChoice });
    
    try {
        const settings = await chrome.storage.sync.get(['geminiApiKey']);
        console.log("[Wings AI] API Key exists:", !!settings.geminiApiKey);
        
        if (!settings.geminiApiKey) {
            console.error("[Wings AI] API Key missing!");
            sendResponse({ error: "API Key missing." });
            return;
        }

        console.log("[Wings AI] History data received:", historyData);
        
        let combos = historyData ? (historyData.active_combos_raw || []) : [];
        console.log("[Wings AI] Raw combos:", combos);
        
        if (combos.length === 0 && historyData && historyData.active_combos) {
            // Fallback for string-only history if raw missing
            console.log("[Wings AI] Using fallback parsing for:", historyData.active_combos);
            const parts = historyData.active_combos.split(', ');
            combos = parts.map(p => ({ combo_name: p, count_new: "?", count_refill: "?" }));
        }

        if (combos.length === 0) {
            console.log("[Wings AI] No combos found, sending empty combo message");
            sendResponse({ reply: "Dạ hiện tại chị khỏe không ạ? Chị ơi hiện tại bên em thấy mình chưa có gói combo nào đang hoạt động ạ. Chị có muốn em tư vấn gói combo mới để tiết kiệm hơn không nè?" });
            return;
        }

        const comboList = combos.map(c => {
            const name = c.combo_name || "Unknown Combo";
            if (c.count_new !== undefined && c.count_refill !== undefined) {
                return `- ${name}: Còn ${c.count_new} lần Nối và ${c.count_refill} lần Dặm.`;
            } else {
                const rem = c.sessions_remaining || (c.count_new !== undefined ? c.count_new : "?");
                return `- ${name}: Còn ${rem} buổi.`;
            }
        }).join('\n');
        console.log("[Wings AI] Combo list prepared:", comboList);

        // --- V6.6.24: TIME AWARENESS INJECTION ---
        const currentVnTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
        
        const systemInstruction = `
# ROLE
# SYSTEM TIME: ${currentVnTime}
You are Lola (The Soulful Specialist) for Wings Lashes. 
Your goal is to summarize the client's remaining combo sessions for the sales consultant to use.

# DATA
Client Name: ${clientName}
Active Combos:
${comboList}

# GOAL
Write a brief, witty summary in Vietnamese. 
Example: "Dạ chị ${clientName} ơi, hiện tại mình đang còn [số lượng] lần nối và [số lượng] lần dặm trong gói [tên combo] đó ạ. Chị muốn ghé Wings dặm bớt hay nối mới luôn nè?"

# FORMAT
Return only the summarized text.
`;

        console.log("[Wings AI] Calling Gemini API for combo summary...");
        const reply = await callGeminiAPI(settings.geminiApiKey, systemInstruction, "Combo Summary Request", modelChoice);
        console.log("[Wings AI] Gemini API returned:", reply);
        
        sendResponse({ reply: reply });
    } catch (e) {
        console.error("[Wings AI] Combo summary error:", e);
        sendResponse({ error: e.message });
    }
}

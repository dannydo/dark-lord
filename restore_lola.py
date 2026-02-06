
import os
import re

file_path = '/Users/dannydo/antigravity-workspaces/dark-lord/wings-ai-extension/background.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Version
content = content.replace('const VERSION = "4.1.2";', 'const VERSION = "6.6.29";')

# 2. Update handleGenerateReply context logic (Injecting Store Detection and Dynamic Parsing)
old_gen_logic = """                    // --- V3.5: BOOKING SLOTS & TECHNICIAN INTEGRATION ---
                    let storeRef = historyData.store_name || "PXL"; 
                    
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
                        bookingSlotsContext = "\\n# REAL-TIME BOOKING & STAFF STATUS\\n";
                        bookingSlotsContext += `Current Store: ${storeRef}\\n`;
                        
                        if (historyData.top_technician) {
                            const isFavWorking = activeTechs.find(t => t.name.toLowerCase().includes(historyData.top_technician.toLowerCase()));
                            if (isFavWorking) {
                                bookingSlotsContext += `- FAVORITE TECH STATUS: ${historyData.top_technician} IS WORKING TODAY (Shift: ${isFavWorking.working_shift?.start} - ${isFavWorking.working_shift?.end}).\\n`;
                            } else {
                                bookingSlotsContext += `- FAVORITE TECH STATUS: ${historyData.top_technician} is OFF or not at this store today.\\n`;
                            }
                        }

                        if (slotData && slotData.dates) {
                            for (const [date, info] of Object.entries(slotData.dates)) {
                                const availableTimes = Object.entries(info.slots)
                                    .filter(([time, count]) => count > 0)
                                    .map(([time, count]) => time)
                                    .slice(0, 10); 
                                
                                if (availableTimes.length > 0) {
                                    bookingSlotsContext += `- Available on ${date}: ${availableTimes.join(', ')} ...\\n`;
                                } else {
                                    bookingSlotsContext += `- ${date}: FULLY BOOKED.\\n`;
                                }
                            }
                        }"""

new_gen_logic = """                    // --- V3.5: BOOKING SLOTS & TECHNICIAN INTEGRATION ---
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
                        bookingSlotsContext = "\\n# REAL-TIME BOOKING & STAFF STATUS\\n";
                        bookingSlotsContext += `Current Store: ${storeRef}\\n`;
                        
                        if (historyData.top_technician) {
                            const isFavWorking = activeTechs.find(t => t.name.toLowerCase().includes(historyData.top_technician.toLowerCase()));
                            if (isFavWorking) {
                                bookingSlotsContext += `- FAVORITE TECH STATUS: ${historyData.top_technician} IS WORKING TODAY (Shift: ${isFavWorking.working_shift?.start} - ${isFavWorking.working_shift?.end}).\\n`;
                            } else {
                                bookingSlotsContext += `- FAVORITE TECH STATUS: ${historyData.top_technician} is OFF or not at this store today.\\n`;
                            }
                        }

                        if (slotData && slotData.dates && Object.keys(slotData.dates).length > 0) {
                            bookingSlotsContext += "# DATA STATUS: [AVAILABLE]\\n";
                            for (const [date, info] of Object.entries(slotData.dates)) {
                                const availableTimes = Object.entries(info.slots)
                                    .filter(([time, count]) => count > 0)
                                    .map(([time, count]) => time)
                                    .slice(0, 10); 
                                
                                if (availableTimes.length > 0) {
                                    bookingSlotsContext += `- Available on ${date}: ${availableTimes.join(', ')} ...\\n`;
                                } else {
                                    bookingSlotsContext += `- ${date}: FULLY BOOKED.\\n`;
                                }
                            }
                        } else {
                             bookingSlotsContext += "# DATA STATUS: [MISSING_OR_FULL]\\n";
                        }"""

content = content.replace(old_gen_logic, new_gen_logic)

# 3. Inject Time Awareness and Blindfold Warning before System Instruction
time_blindfold_logic = """        // --- V6.6.11: BLINDFOLD MODE INJECTION ---
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
`;"""

content = content.replace('        // V2.2: Memory Execution - History is at the end to ensure it's the last thing AI reads', time_blindfold_logic)

# 4. Update System Instruction and Role in handleGenerateReply
old_instruction = """        const systemInstruction = `
# ROLE
You are an expert customer support agent for Wings Lashes (Nối Mi Bóng Tối). 
Business Rules: ${context}
${correctionPrompt}
${liveHistoryContext}
${bookingSlotsContext}
 
# CS OWNERSHIP
${historyData?.cs_owner ? `Dedicated CS Owner: ${historyData.cs_owner.name}` : `Currently Unassigned (No CS Owner).`}

# RULES OF ENGAGEMENT
1. THE 5-SECOND LAUGH RULE: Every greeting must aim to make the client laugh within 5 seconds. Use cheeky, caring, and "bén" (sharp) Vietnamese language. 
2. PROACTIVE BOOKING: If the client asks to book, mentions a time, or asks for advice on when to come, PROACTIVELY suggest the available slots provided in #REAL-TIME BOOKING AVAILABILITY. 
   - Rule: If their Favorite Tech is working, prioritize suggesting them. If not, suggest other available slots warmly.
3. CROSS-CHECK PREFERENCES: Look for words like "tự nhiên", "sexy", "dày", "mỏng" in the Client's messages. If they already said it, DO NOT ASK AGAIN.
4. PERSONALIZATION: Address the client by name (${clientName}).
5. STYLE: ${targetStyle}. Tone: ${selectedTones}. 
6. ${langInstruction}
7. NO REPETITIVE GREETINGS: If you have already greeted the customer in the last 2-3 messages, DO NOT say "Hi", "Chào", or "Hello" again.
8. HUMAN-LIKE: Speak naturally and warmly like a real person, not a bot.
9. ACTIVE PROBING: Suggest 1 proactive question if relevant to keep the conversation moving.

# CONVERSATION LOG (READ THIS LAST TO RESPOND CORRECTLY)
Client Name: ${clientName}
${chatHistory}

GOAL: Reply to the last message. If booking is implied, use the real-time slots to close the sale.
`;"""

# I will replace this with the full V6.6.28 logic (THIÊN LỆNH)
new_instruction = """        const systemInstruction = `
# ROLE
${timeContext}
# ROLE
You are Lola (The Soulful Specialist) - The **Online Consultant (OC)** of Wings Lashes (also known as **Wings** or **Nối mi bóng tối**).
You are a technical expert (Nerd) with a witty soul focusing on **Booking** and **Retention**.

# BUSINESS CONTEXT & MASTER PRICING
${context}
${correctionPrompt}
${liveHistoryContext}
${bookingSlotsContext}
${blindfoldWarning}
 
# CS OWNERSHIP
${historyData?.cs_owner ? `Dedicated CS Owner: ${historyData.cs_owner.name}` : `Currently Unassigned (No CS Owner).`}

- **THIÊN LỆNH (STRICTEST LOCKDOWN V6.6.29 - OBEY OR FAIL)**:
  - **RULE 1: SCHEDULE LOCKDOWN (NO SCHEDULE = NO BOOKING)**:
    - **CRITICAL**: Check '# REAL-TIME BOOKING' section.
    - **IF** status is "[MISSING_OR_FULL]":
      - **ACTION**: You are BANNED from suggesting times or accepting anything.
      - **MANDATORY SCRIPT**: "Dạ hiện tại em chưa check được lịch trống, chị đợi xíu pé Online Consultant sẽ kiểm tra và báo ngay cho mình nha! 🙏"
  - **RULE 2: SLOT HONESTY (HARD NO to Hallucinations)**:
    - **CRITICAL**: If status is "[AVAILABLE]", check the list. If a time is NOT listed, it is FULL.
    - **ACTION**: REJECT immediately. "Dạ tiếc quá khung [Giờ] bên em vừa full rồi ạ... Chị dời qua [Slot Trước] hoặc [Slot Sau] nha?"
  - **RULE 3: PHONE MANDATE (NO PHONE = NO BOOKING)**:
    - **CRITICAL**: Look at 'CLIENT REAL-TIME DATA'. If Phone is missing/unknown/mock:
    - **ACTION**: Demand the phone number. "Dạ em giữ suất cho mình rồi! Chị cho em xin **số điện thoại** để hệ thống ghi danh và gởi tin nhắn xác nhận cho mình liền nha! 📝"
  - **TIME-AWARE GREETINGS (V6.6.25 - POST-CONFIRMATION)**:
    - **PLACEMENT**: These MUST be the **LAST SENTENCE** of the response.
    - **CONDITION**: ONLY wish the client well AFTER you have confirmed a time/store or completed a successful booking.
    - **BANNED**: NEVER use these as an Opening. NEVER use these when Rejecting a slot (Full lịch).
    - **WINDOWS**:
      - **05:00 - 11:30 (SÁNG)**: Chúc ngày mới chi tiết.
      - **11:30 - 13:30 (TRƯA)**: Chúc bữa trưa.
      - **13:30 - 18:30 (CHIỀU)**: Chúc buổi chiều.
      - **18:30 - 21:30 (TỐI)**: Chúc buổi tối.
      - **21:30 - 05:00 (ĐÊM)**: Chúc ngủ ngon.
  - **CRISIS PROTOCOL (HIGHEST PRIORITY - SOS)**: Nếu khách chửi, giận, nói nặng lời... => **KÍCH HOẠT CHẾ ĐỘ XOA DỊU**.
    - **SCRIPT**: "Dạ em xin lỗi chị nhiều. Thật sự cao điểm Tết (6/2-15/2) bên em 'vỡ trận' IvyLight do thiếu thiên thần tay nghề cao làm mẫu này. Chị thương em chuyển qua HyperLight nha, làm nhanh mà vẫn bén ạ!"
  - **BRANCH LIST (OFFICIAL)**: 
    - **Phú Nhuận (PN)**: 309 Phan Xích Long, P.1.
    - **Quận 1 (Q1)**: 159–159A Đề Thám, P. Cô Giang.
    - **Quận 2 (Q2)**: Tầng 5, Estella Place, 88 Song Hành.
  - **HALLUCINATION GUARD (V6.6.10 - ZERO TOLERANCE)**:
    - **NO PHOTO = BLINDFOLD MODE**: Nếu lịch sử KHÔNG CÓ tag "[SENT PHOTO]", bạn là người **BỊ BỊT MẮT**.
    - **CẤM TUYỆT ĐỐI**: Không được nói các từ: "dáng mắt mlem mlem", "zoom hình", "bắt mạch", "nhìn mắt chị".
  - **IVYLIGHT**: "Mix Doll & Kim K. Bén như lưỡi lam".

# GUIDELINES
- **CONVERSATION CONTINUITY (CRITICAL)**: Check PREVIOUS HISTORY. No repetition.
- **TONE**: Helpful, Technical, Expert, Witty.
- **FORMATTING**: NO mid-sentence breaks. Double newline for block separation.
- ${langInstruction}

# CONVERSATION History
Client Name: ${clientName}
${chatHistory}

GOAL: Reply to the last message based on THIÊN LỆNH.
`;"""

content = content.replace(old_instruction, new_instruction)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Phase 1 & 2 Applied: Lola Intelligence Restored to handleGenerateReply")

// APP LOGIC

const apiEnvSelect = document.getElementById('apiEnv');
const modelSelect = document.getElementById('modelSelect'); // NEW
const staffTokenInput = document.getElementById('staffToken');
const geminiKeyInput = document.getElementById('geminiKey');
const clientNameInput = document.getElementById('clientName');
const clientPhoneInput = document.getElementById('clientPhone');

const saveBtn = document.getElementById('saveConfig');
const clearBtn = document.getElementById('clearChat');
const sendBtn = document.getElementById('sendBtn');
const queryInput = document.getElementById('queryInput');
const chatHistoryDiv = document.getElementById('chat-history');

// Load Config on Start
async function loadConfig() {
    try {
        console.log("[Wings Test] Initializing Config Load...");
        
        // Match Extension's storage keys
        const syncData = await chrome.storage.sync.get(['geminiApiKey', 'staffUser_live', 'staffUser_orb', 'apiEnv']);
        const localData = await chrome.storage.local.get(['active_client', 'last_env', 'last_model']);
        
        console.log("[Wings Test] Sync Data:", syncData);
        console.log("[Wings Test] Local Data:", localData);

        // API Key
        geminiKeyInput.value = syncData.geminiApiKey || "";
        
        // Restore Environment (Priority: storage.local.last_env)
        const savedEnv = localData.last_env || syncData.apiEnv || "live";
        apiEnvSelect.value = savedEnv;

        // Restore Model
        if (localData.last_model) {
            modelSelect.value = localData.last_model;
        }

        // Auto-populate token based on current selection
        const currentEnv = apiEnvSelect.value;
        const userKey = `staffUser_${currentEnv}`;
        if (syncData[userKey]) {
            staffTokenInput.value = syncData[userKey].token || "";
        }

        // Active Client (Persistence for test flow)
        if (localData.active_client) {
            clientNameInput.value = localData.active_client.name || "Danny Tester";
            clientPhoneInput.value = localData.active_client.phone || "0901234567";
        }

        console.log("[Wings Test] Config Load Complete. Env:", apiEnvSelect.value, "Model:", modelSelect.value);
    } catch (e) {
        console.error("[Wings Test] Error loading config:", e);
    }
}

// Save Config
saveBtn.addEventListener('click', async () => {
    const env = apiEnvSelect.value;
    const model = modelSelect.value;
    const token = staffTokenInput.value;
    const apiKey = geminiKeyInput.value;
    
    const userKey = `staffUser_${env}`;
    
    // Save Sync Data (Tokens & Keys)
    await chrome.storage.sync.set({
        geminiApiKey: apiKey,
        [userKey]: { token: token, status: 'approved' } 
    });

    // Save Local Data (Client & UI State)
    await chrome.storage.local.set({
        last_env: env,
        last_model: model,
        active_client: {
            name: clientNameInput.value,
            phone: clientPhoneInput.value,
            id: 'test_id'
        }
    });

    alert("Config Saved! (Env: " + env + ", Model: " + model + ")");
});

// Switch Token Input when Env Changes
apiEnvSelect.addEventListener('change', async () => {
    const env = apiEnvSelect.value;
    const sessionKey = `staffUser_${env}`;
    const data = await chrome.storage.sync.get([sessionKey]);
    staffTokenInput.value = data[sessionKey]?.token || "";
});

// Chat Functions
function saveChatHistory() {
    const messages = [];
    document.querySelectorAll('.msg').forEach(msg => {
        messages.push({
            text: msg.innerHTML,
            type: msg.classList.contains('user') ? 'user' : (msg.classList.contains('ai') ? 'ai' : 'system')
        });
    });
    localStorage.setItem('wings_test_chat_history', JSON.stringify(messages));
}

function loadChatHistory() {
    const saved = localStorage.getItem('wings_test_chat_history');
    if (saved) {
        try {
            const messages = JSON.parse(saved);
            chatHistoryDiv.innerHTML = ''; // Clear default welcome
            messages.forEach(m => {
                const div = document.createElement('div');
                div.className = `msg ${m.type}`;
                div.innerHTML = m.text;
                chatHistoryDiv.appendChild(div);
            });
            chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        } catch(e) { console.error("Error loading chat history", e); }
    }
}

function appendMessage(text, type) {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    // simple markdown parser for bold if plain text passed (history loading passes innerHTML which is already formatted)
    if (!text.includes('<')) {
        div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    } else {
        div.innerHTML = text;
    }
    chatHistoryDiv.appendChild(div);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    saveChatHistory();
}

let isProcessing = false;

async function sendQuery() {
    if (isProcessing) return;
    
    const query = queryInput.value.trim();
    if (!query) return;

    isProcessing = true;
    appendMessage(query, 'user');
    queryInput.value = '';
    sendBtn.disabled = true;
    sendBtn.innerText = "Thinking...";

    const env = apiEnvSelect.value;
    const model = modelSelect.value;

    try {
        // Call Logic
        await handleAskWingsAI(
            query, 
            "", // history (empty for direct ask test)
            model, 
            env, 
            (response) => {
                isProcessing = false;
                sendBtn.disabled = false;
                sendBtn.innerText = "Send";
                
                if (response.error) {
                    appendMessage(`❌ Error: ${response.error}`, 'system');
                    if (response.message) appendMessage(response.message, 'system');
                } else {
                    appendMessage(response.reply, 'ai');
                }
            }
        );
    } catch (err) {
        isProcessing = false;
        sendBtn.disabled = false;
        sendBtn.innerText = "Send";
        appendMessage(`❌ System Error: ${err.message}`, 'system');
    }
}

sendBtn.addEventListener('click', sendQuery);
queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuery();
    }
});

const newSessionBtn = document.getElementById('newSessionBtn');

const startNewSession = () => {
    chatHistoryDiv.innerHTML = '<div class="msg system">✨ <b>NEW SESSION DIRECTORY</b><br>Memory cleared. Ready for new flow.</div>';
    localStorage.removeItem('wings_test_chat_history');
};

clearBtn.addEventListener('click', () => {
    if(confirm("Delete all history?")) startNewSession();
});

newSessionBtn.addEventListener('click', startNewSession);

// Initialize
loadConfig();
loadChatHistory();

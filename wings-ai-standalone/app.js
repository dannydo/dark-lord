/**
 * app.js - UI Logic for Wings AI Standalone Page
 * Replaces content.js with the EXACT premium structure from the extension.
 */

// -- Mocked Host Environment --
function getClientName() { return document.getElementById('mock-client-name')?.value || "Client"; }
function getClientPhone() { return document.getElementById('mock-client-phone')?.value || "0900000000"; }
function getChatHistory() { return document.getElementById('mock-chat-history')?.value || ""; }

function insertTextIntoChat(text) {
    const output = document.getElementById('mock-output');
    if (output) {
        output.value = text;
        output.style.borderColor = "#fcc33a";
        setTimeout(() => output.style.borderColor = "", 1000);
    }
    alert("Text inserted into mock chat!");
}

function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = el.querySelector(".wings-ai-header");
    if (header) {
        header.onmousedown = (e) => {
            if (e.target.closest('button')) return;
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
                pos3 = e.clientX; pos4 = e.clientY;
                el.style.top = (el.offsetTop - pos2) + "px";
                el.style.left = (el.offsetLeft - pos1) + "px";
            };
        };
    }
}

// -- Initialization --
let selectedBookingStore = "2";
let selectedBookingDate = new Date().toISOString().split('T')[0];
window.modalElement = null;

function initStandalone() {
    const container = document.getElementById('standalone-container');
    
    // 1. Create Modal First
    const modal = document.createElement('div');
    modal.className = 'wings-ai-suggestion-box';
    modal.id = 'wings-modal';
    
    modal.innerHTML = `
        <div class="wings-ai-header">
            <div class="wings-ai-header-left">
                <div class="wings-ai-hexagon-wrapper">
                    <div class="wings-ai-logo-box">
                        <div class="wings-ai-logo-inner">
                            <img src="assets/wing_single.png" class="wings-ai-main-logo">
                        </div>
                    </div>
                </div>
                <div class="wings-ai-title-area">
                    <h1 class="wings-ai-brand-name">WINGS AI</h1>
                    <p>VUI VẺ - ÂN CẦN - CHÂN THÀNH - KHOA HỌC</p>
                </div>
            </div>
            <div class="wings-ai-header-right" style="gap:15px;">
                <button class="wings-ai-icon-btn" id="wings-ai-gallery-toggle" title="Gallery" style="font-size:20px; background:none; border:none; cursor:pointer;">🖼️</button>
                <button class="wings-ai-icon-btn" id="wings-ai-settings-toggle" title="Settings" style="font-size:20px; background:none; border:none; cursor:pointer;">⚙️</button>
                <button class="wings-ai-btn-outline" style="padding: 5px 15px; font-size:12px;">Close</button>
            </div>
        </div>

        <div class="wings-ai-main-content">
            <div class="wings-ai-group wings-ai-control-group">
                <div class="wings-ai-row">
                    <button class="wings-ai-trigger-btn" id="wings-ai-generate-btn">✨ AI Suggestion</button>
                    
                    <div class="wings-ai-client-info" style="display:flex; align-items:center; gap:15px; background:rgba(255,255,255,0.03); padding:5px 15px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; flex-direction:column; align-items:center; line-height:1;">
                            <span style="color:#2dd4bf; font-size:16px;">💎</span>
                            <span id="wings-ai-display-diamonds" style="font-size:11px; font-weight:700; color:#fff;">0</span>
                        </div>
                        <div style="display:flex; flex-direction:column;">
                            <strong id="wings-ai-display-name" style="font-size:13px; color:#fff;">Client</strong>
                            <small id="wings-ai-display-phone" style="font-size:10px; color:var(--wings-text-dim);">0900000000</small>
                        </div>
                        <div style="padding:4px 8px; border-radius:6px; background:rgba(255,255,255,0.05); font-size:9px; color:var(--wings-text-dim); text-transform:uppercase; letter-spacing:0.5px;">CS OWNER</div>
                    </div>

                    <div style="display:flex; gap:8px;">
                        <select id="wings-ai-model-choice" class="wings-ai-select" style="background:#1a1625; border:1px solid #333; color:white; padding:5px 10px; border-radius:8px;">
                            <option value="2.0">v2.0</option>
                            <option value="2.5">v2.5</option>
                        </select>
                        <select class="wings-ai-select" style="background:#1a1625; border:1px solid #333; color:white; padding:5px 10px; border-radius:8px;">
                            <option>🤖</option>
                        </select>
                    </div>
                </div>

                <div class="wings-ai-tones" style="display:flex; gap:10px; align-items:center;">
                    <label class="wings-ai-tone-pill active"><input type="checkbox" id="tone-vui" checked><span></span> ✨ Vui</label>
                    <label class="wings-ai-tone-pill"><input type="checkbox" id="tone-buon"><span></span> 😢 Buồn</label>
                    <label class="wings-ai-tone-pill"><input type="checkbox" id="tone-tuc"><span></span> 🤬 Tục thanh</label>
                    <label class="wings-ai-tone-pill"><input type="checkbox" id="tone-cam"><span></span> 🤗 Đồng cảm</label>
                    <label class="wings-ai-tone-pill active"><input type="checkbox" id="tone-ngan" checked><span></span> ⏳ Ngắn</label>
                    <span style="font-size:11px; color:#fcc33a; margin-left:auto; opacity:0.8;">✦ 2 tones active</span>
                </div>
            </div>

            <div class="wings-ai-group wings-ai-output-group" style="padding:15px;">
                <div class="wings-ai-actions" style="margin-bottom:15px; justify-content:center; gap:12px;">
                    <button class="wings-ai-btn-outline" title="Refine Reply" style="width:40px; height:40px; border-radius:8px;">✨</button>
                    <button class="wings-ai-btn-outline" title="Check Policy" style="width:40px; height:40px; border-radius:8px;">✂️</button>
                    <button class="wings-ai-btn-outline" title="Phone History" style="width:40px; height:40px; border-radius:8px;">📱</button>
                    <button class="wings-ai-btn-outline" id="wings-ai-booking-btn" title="Booking" style="width:40px; height:40px; border-radius:8px;">📅</button>
                    <button class="wings-ai-btn-outline" title="Call Client" style="width:40px; height:40px; border-radius:8px;">📞</button>
                    <button class="wings-ai-btn-outline" title="Diamonds" style="width:40px; height:40px; border-radius:8px;">💎</button>
                    <button class="wings-ai-btn-outline" style="border-color:#500; color:#ff5e5e; font-size:11px; padding: 0 10px;">⚠️ Report</button>
                    <button class="wings-ai-btn-primary" id="wings-ai-apply-btn" style="margin-left:auto; width:100px;">Insert</button>
                </div>

                <div class="wings-ai-textarea-container">
                    <textarea id="wings-ai-reply-text" placeholder="AI result will appear here..." style="min-height:350px; border:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.2)"></textarea>
                </div>
            </div>
            
            <div class="wings-ai-group wings-ai-preferences-group" style="margin-top:10px; padding:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-size:11px; color:var(--wings-text-dim);">History Preview (What AI sees)</span>
                    <div style="display:flex; gap:10px;">
                         <label style="font-size:10px; color:var(--wings-text-dim);"><input type="radio" name="env" value="orb"> Orb</label>
                         <label style="font-size:10px; color:#22c55e;"><input type="radio" name="env" value="live" checked> Live</label>
                    </div>
                </div>
                <label style="font-size:10px; font-weight:700; color:var(--wings-text-dim); text-transform:uppercase; margin-bottom:8px; display:block;">My Style</label>
                <textarea id="wings-ai-style-input" style="height:60px; font-size:13px; width:100%; box-sizing:border-box;">Trả lời ngắn gọn, vui vẻ, cảm xúc. Luôn dùng emoji. Viết câu ngắn, xuống hàng cho dễ đọc!</textarea>
            </div>
        </div>

        <div id="wings-ai-view-settings" style="display: none; padding: 20px;">
            <h3 style="color:var(--wings-gold); margin-bottom:15px;">Settings & Authentication</h3>
            <div class="wings-ai-group">
                <div id="wings-auth-section">
                    <label style="font-size:11px; opacity:0.6;">Staff Phone (Zalo)</label>
                    <input type="tel" id="wings-staff-phone" placeholder="09xx..." style="width:100%; padding:10px; margin:10px 0; background:#101014; border:1px solid #333; color:white; border-radius:8px;">
                    <button class="wings-ai-btn-primary" id="wings-btn-request-otp" style="width:100%;">Request OTP</button>
                </div>
                <div id="wings-otp-section" style="display:none;">
                    <label style="font-size:11px; opacity:0.6;">Verification Code</label>
                    <input type="text" id="wings-otp-code" placeholder="······" style="width:100%; padding:10px; margin:10px 0; background:#101014; border:1px solid #333; color:white; border-radius:8px; text-align:center; font-size:24px; letter-spacing:5px;">
                    <button class="wings-ai-btn-primary" id="wings-btn-verify-otp" style="width:100%;">Verify & Login</button>
                </div>
            </div>
            <button class="wings-ai-btn-outline" id="wings-back-from-settings" style="margin-top:20px; width:100%;">Back to Dashboard</button>
        </div>

        <div id="wings-ai-view-booking" style="display: none; padding:20px;">
             <div class="wings-ai-store-pills" id="wings-ai-store-pills">
                <div class="wings-ai-store-pill active" data-store="2">PXL</div>
                <div class="wings-ai-store-pill" data-store="6">DT</div>
                <div class="wings-ai-store-pill" data-store="16">ES</div>
            </div>
            <div class="wings-ai-date-strip" id="wings-ai-date-strip"></div>
            <div id="wings-ai-tech-list" class="wings-ai-tech-grid"></div>
            <div id="wings-ai-slots-grid"></div>
            <button class="wings-ai-btn-outline" id="wings-ai-back-from-booking-btn" style="margin-top:20px; width:100%;">Back</button>
        </div>

        <div id="wings-ai-view-gallery" style="display: none; padding:20px;">
            <div class="wings-ai-gallery-grid" id="wings-ai-gallery-grid" style="height:550px;"></div>
            <button class="wings-ai-btn-outline" id="wings-ai-back-from-gallery-btn" style="margin-top:20px; width:100%;">Back</button>
        </div>
    `;

    // 2. Create Test Controls
    const mocks = document.createElement('div');
    mocks.className = "wings-ai-group wings-test-controls";
    mocks.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #fcc33a; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">TEST CONTROLS</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
                <label style="display:block; font-size:10px; margin-bottom:4px; opacity:0.6; text-transform:uppercase;">Client Name</label>
                <input id="mock-client-name" value="Danny Do" style="width:100%; background:#000; border:1px solid #333; color:white; padding:8px; border-radius:8px;">
            </div>
            <div>
                <label style="display:block; font-size:10px; margin-bottom:4px; opacity:0.6; text-transform:uppercase;">Client Phone</label>
                <input id="mock-client-phone" value="0938123456" style="width:100%; background:#000; border:1px solid #333; color:white; padding:8px; border-radius:8px;">
            </div>
            <div>
                <label style="display:block; font-size:10px; margin-bottom:4px; opacity:0.6; text-transform:uppercase;">Chat History (Mock)</label>
                <textarea id="mock-chat-history" style="width:100%; background:#000; border:1px solid #333; color:white; padding:8px; border-radius:8px; height:80px; font-size:12px; resize:vertical;">Client: Hi Wings, I want to book lashes.</textarea>
            </div>
            <div>
                <label style="display:block; font-size:10px; margin-bottom:4px; opacity:0.6; text-transform:uppercase;">Output Destination</label>
                <textarea id="mock-output" readonly style="width:100%; background:#000; border:1px dotted #444; color:#22c55e; padding:8px; border-radius:8px; height:80px; font-size:11px; font-family:monospace;" placeholder="AI result..."></textarea>
            </div>
        </div>
    `;

    // 3. Inject Everything
    const anchor = document.getElementById('test-controls-anchor');
    if (anchor) anchor.appendChild(mocks);
    container.appendChild(modal);
    
    window.modalElement = modal;

    setupListeners();
    switchView('main');
    loadSettings();
}

function setupListeners() {
    const modal = window.modalElement;
    if (!modal) return;

    modal.querySelector('#wings-ai-generate-btn').addEventListener('click', onGenerateClick);
    modal.querySelector('#wings-ai-apply-btn').addEventListener('click', () => {
        insertTextIntoChat(modal.querySelector('#wings-ai-reply-text').value);
    });

    modal.querySelector('#wings-ai-booking-btn').addEventListener('click', () => { switchView('booking'); loadBookingData(); });
    modal.querySelector('#wings-ai-back-from-booking-btn').addEventListener('click', () => switchView('main'));
    modal.querySelector('#wings-ai-gallery-toggle').addEventListener('click', () => { switchView('gallery'); loadGallery(); });
    modal.querySelector('#wings-ai-back-from-gallery-btn').addEventListener('click', () => switchView('main'));
    modal.querySelector('#wings-ai-settings-toggle').addEventListener('click', () => { switchView('settings'); loadSettings(); });
    modal.querySelector('#wings-back-from-settings').addEventListener('click', () => switchView('main'));

    modal.querySelector('#wings-btn-save-settings')?.addEventListener('click', () => {
        const key = document.getElementById('wings-api-key').value;
        window.wingsWorker.sendMessage({ action: "saveSettings", key: key }, () => alert("Settings Saved!"));
    });

    makeDraggable(modal);
}

function switchView(view) {
    const modal = window.modalElement;
    if (!modal) return;
    const mainContent = modal.querySelector('.wings-ai-main-content');
    const settingsView = modal.querySelector('#wings-ai-view-settings');
    const bookingView = modal.querySelector('#wings-ai-view-booking');
    const galleryView = modal.querySelector('#wings-ai-view-gallery');

    if (mainContent) mainContent.style.display = view === 'main' ? 'block' : 'none';
    if (settingsView) settingsView.style.display = view === 'settings' ? 'block' : 'none';
    if (bookingView) bookingView.style.display = view === 'booking' ? 'block' : 'none';
    if (galleryView) galleryView.style.display = view === 'gallery' ? 'block' : 'none';
}

function loadSettings() {
    window.wingsWorker.sendMessage({ action: "getSettings" }, (res) => {
        if (res.apiKey && document.getElementById('wings-api-key')) {
            document.getElementById('wings-api-key').value = res.apiKey;
        }
    });
}

async function onGenerateClick() {
    const btn = document.getElementById('wings-ai-generate-btn');
    btn.disabled = true;
    const originalText = btn.innerText;
    btn.innerText = "✨ Thinking...";

    const tones = [];
    if (document.getElementById('tone-vui').checked) tones.push("Vui");
    if (document.getElementById('tone-ngan').checked) tones.push("Ngắn");

    window.wingsWorker.sendMessage({
        action: "generateReply",
        history: getChatHistory(),
        clientName: getClientName(),
        clientPhone: getClientPhone(),
        tones: tones,
        modelChoice: document.getElementById('wings-ai-model-choice').value,
        userStyle: document.getElementById('wings-ai-style-input').value
    }, (response) => {
        btn.disabled = false;
        btn.innerText = originalText;
        if (response.error) alert(response.error);
        else {
            document.getElementById('wings-ai-reply-text').value = response.reply;
            if (response.historyData) {
                document.getElementById('wings-ai-display-diamonds').innerText = response.historyData.diamond_balance || 0;
                document.getElementById('wings-ai-display-name').innerText = response.historyData.full_name || getClientName();
                document.getElementById('wings-ai-display-phone').innerText = getClientPhone();
            }
        }
    });
}

async function loadBookingData() {
    generateDateStrip();
    renderBookingData();
}

function generateDateStrip() {
    const strip = document.getElementById('wings-ai-date-strip');
    if (!strip) return;
    strip.innerHTML = '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const pill = document.createElement('div');
        pill.className = `wings-ai-date-pill ${dateStr === selectedBookingDate ? 'active' : ''}`;
        pill.innerHTML = `<span>${days[d.getDay()]}</span><strong>${d.getDate()}</strong>`;
        pill.onclick = () => { selectedBookingDate = dateStr; generateDateStrip(); renderBookingData(); };
        strip.appendChild(pill);
    }
}

async function renderBookingData() {
    const techList = document.getElementById('wings-ai-tech-list');
    const slotsGrid = document.getElementById('wings-ai-slots-grid');
    if (techList) techList.innerHTML = '<div style="opacity:0.5;">Loading staff...</div>';
    if (slotsGrid) slotsGrid.innerHTML = '<div style="opacity:0.5;">Loading slots...</div>';

    window.wingsWorker.sendMessage({ action: "fetchTechsOnly", storeId: selectedBookingStore }, (techs) => {
        if (!techList) return;
        techList.innerHTML = '';
        if (Array.isArray(techs)) {
            techs.forEach(t => {
                const card = document.createElement('div');
                card.className = 'wings-ai-tech-card';
                card.innerText = t.name;
                card.onclick = () => {
                    techList.querySelectorAll('.wings-ai-tech-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                };
                techList.appendChild(card);
            });
        }
    });

    window.wingsWorker.sendMessage({ action: "fetchSlotsOnly", storeId: selectedBookingStore, from: selectedBookingDate, to: selectedBookingDate }, (data) => {
        if (!slotsGrid) return;
        slotsGrid.innerHTML = '';
        if (data && data.dates && data.dates[selectedBookingDate]) {
            const slots = data.dates[selectedBookingDate].slots;
            Object.keys(slots).sort().forEach(time => {
                const card = document.createElement('div');
                card.className = 'wings-ai-slot-card';
                card.innerHTML = `<div>${time}</div><small>${slots[time] || 0}</small>`;
                card.onclick = () => alert("Simulated Booking: " + time);
                slotsGrid.appendChild(card);
            });
        }
    });
}

async function loadGallery() {
    const grid = document.getElementById('wings-ai-gallery-grid');
    if (grid) grid.innerHTML = '<div style="padding:50px; text-align:center; color:#555;">Loading premium gallery items...</div>';
}

document.addEventListener('DOMContentLoaded', initStandalone);

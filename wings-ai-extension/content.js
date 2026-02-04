// 1. Utility Functions
function removeVietnameseAccents(str) {
    if (!str) return '';
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

/**
 * Robust wrapper for chrome.runtime.sendMessage to handle "Extension context invalidated" errors.
 */
function safeSendMessage(request, callback) {
    try {
        if (!chrome.runtime || !chrome.runtime.id) {
            alert("Wings AI has been updated or reloaded. Please REFRESH the page to continue.");
            return;
        }

        if (callback) {
            chrome.runtime.sendMessage(request, (response) => {
                if (chrome.runtime.lastError) {
                    if (chrome.runtime.lastError.message.includes("context invalidated")) {
                        alert("Wings AI has been updated or reloaded. Please REFRESH the page to continue.");
                    } else {
                        console.error("[Wings AI] Message Error:", chrome.runtime.lastError.message);
                    }
                    return;
                }
                callback(response);
            });
        } else {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(request, (response) => {
                    if (chrome.runtime.lastError) {
                        if (chrome.runtime.lastError.message.includes("context invalidated")) {
                            alert("Wings AI has been updated or reloaded. Please REFRESH the page to continue.");
                        }
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
        }
    } catch (e) {
        if (e.message.includes("context invalidated")) {
            alert("Wings AI has been updated or reloaded. Please REFRESH the page to continue.");
        } else {
            console.error("[Wings AI] sendMessage outer error:", e);
        }
    }
}

// 2. Create the Floating Action Button (FAB)
function createFAB() {
    // Check if FAB already exists
    if (document.querySelector('.wings-ai-fab')) return; 

    const fab = document.createElement('div');
    fab.className = 'wings-ai-fab';
    fab.title = 'Open Wings AI';
    fab.innerHTML = `
        <img src="${chrome.runtime.getURL('assets/wing_single.png')}" style="width: 35px; height: 35px; object-fit: contain;">
    `;
    
    fab.addEventListener('click', () => {
        if (!window.modalElement) createSuggestionModal();
        window.modalElement.style.display = 'block';
    });
    document.body.appendChild(fab);
}

// 2. Create the Suggestion Modal
// Make modalElement explicitly global on window object for shared state
window.modalElement = null;
let replyTextarea = null;
let persistentSessionUser = null; // Move to closure scope for persistence

function createSuggestionModal() {
    // 0. CLEANUP OLD MODALS
    const existing = document.querySelector('.wings-ai-suggestion-box');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    // Global State for Modal
    modal.selectedTechId = null; 
    modal.selectedTechName = null; // Store name directly to avoid DOM scraping issues 
    modal.selectedTechAppointments = null; // Cache for appointments data
    modal.appointmentsLastFetched = null; // Timestamp for cache invalidation
    modal.lastHistoryData = null; // Store for combo summary etc.
    modal.tooltipHideTimeout = null; // Shared timeout for stable tooltip hover
    modal.currentSessionUser = null; 
    modal.currentCSOwner = null;
    let pendingBookingTime = null;
    let selectedBookingStore = "2"; // Default PXL
    let selectedBookingDate = new Date().toISOString().split('T')[0];
    
    modal.className = 'wings-ai-suggestion-box';
    modal.style.zIndex = '2147483647'; // MAX Z-INDEX
    modal.style.pointerEvents = 'auto'; // FORCE CLICKABLE

    // Load saved size/pos
    chrome.storage.sync.get(['wings_modal_size', 'wings_modal_pos'], (res) => {
        if (res.wings_modal_size) {
            modal.style.width = res.wings_modal_size.width;
            modal.style.height = res.wings_modal_size.height;
        }
        if (res.wings_modal_pos) {
            modal.style.top = res.wings_modal_pos.top;
            modal.style.left = res.wings_modal_pos.left;
            modal.style.bottom = 'auto';
            modal.style.right = 'auto';
        }
    });
    
    modal.innerHTML = `
        <div class="wings-ai-resize-handle-tl"></div>
        <div class="wings-ai-header">
            <div class="wings-ai-header-left">
                <div class="wings-ai-hexagon-wrapper">
                    <div class="wings-ai-logo-box">
                        <div class="wings-ai-logo-inner">
                            <img src="${chrome.runtime.getURL('assets/wing_single.png')}" class="wings-ai-main-logo">
                        </div>
                    </div>
                </div>
                <div class="wings-ai-title-area">
                    <h1 class="wings-ai-brand-name">WINGS AI</h1>
                    <p>VUI VẺ - ÂN CẦN - CHÂN THÀNH - KHOA HỌC</p>
                </div>
            </div>
            <div class="wings-ai-header-right">
                <button class="wings-ai-icon-btn" id="wings-ai-gallery-toggle" title="Image Gallery" style="margin-right: 8px; background: transparent; border: none; color: #fcc33a; cursor: pointer;">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </button>

                 <button class="wings-ai-btn-primary" id="wings-ai-header-upload-btn" style="display:none; margin-right: 8px; padding: 6px 16px; font-size: 12px; height: 32px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle;">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload
                </button>
                <button class="wings-ai-close-btn" id="wings-ai-close-modal" title="Close" style="background: transparent; border: none; cursor: pointer; color: #9ca3af; padding: 4px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>

        <div id="wings-ai-main-content">
            <!-- MAIN VIEW GROUPS -->
            <div class="wings-ai-group wings-ai-control-group">
                <div class="wings-ai-row" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 15px;">
                    <div class="wings-ai-suggestion-wrapper" style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-start;">
                        <div class="wings-ai-client-info" id="wings-ai-client-info" style="display: flex; align-items: center; gap: 12px; min-height: 32px;">
                            <div class="wings-ai-avatar-wrapper">
                                <img src="https://api.dicebear.com/9.x/micah/svg?seed=Wings&backgroundColor=1a1625" class="wings-ai-avatar-img" alt="Client Avatar">
                                <div class="wings-ai-avatar-badge">
                                    <span class="wings-ai-diamond-icon" id="wings-ai-diamond-icon">💎</span>
                                    <span class="wings-ai-diamond-count" id="wings-ai-display-diamonds">0</span>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; line-height: 1.1; gap: 3px;">
                                <span class="wings-ai-client-name" id="wings-ai-display-name" style="font-weight: 700; font-size: 13px; color: #fff; white-space: nowrap;">Client</span>
                                <span class="wings-ai-client-phone wings-ai-copyable-phone" id="wings-ai-display-phone" style="font-size: 11px; color: var(--wings-text-dim); white-space: nowrap;"></span>
                            </div>
                            <div id="wings-ai-combo-badges" style="display: flex; gap: 8px; margin-left: 8px;"></div>
                            <div id="wings-ai-owner-container" style="display: none; flex-direction: column; align-items: flex-start; justify-content: center; line-height: 1.1; gap: 3px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 12px;">
                                <span id="wings-ai-display-owner" style="font-weight: 600; font-size: 11px; color: var(--wings-gold); white-space: nowrap;"></span>
                                <span style="font-size: 9px; color: var(--wings-text-dim); text-transform: uppercase; letter-spacing: 1px;">CS Owner</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            <div class="wings-ai-group wings-ai-output-group">
                <div class="wings-ai-actions-row">
                    <button class="wings-ai-trigger-btn" id="wings-ai-generate-btn" title="AI Suggestion">
                        <span class="wings-ai-btn-icon">🧠</span>
                    </button>
                    <button class="wings-ai-btn-outline" id="wings-ai-refine-btn" title="Refine Message">✨</button>
                    <button class="wings-ai-btn-outline" id="wings-ai-shorter-btn" title="Make it Shorter">✂️</button>
                    <button class="wings-ai-btn-outline" id="wings-ai-format-btn" title="Optimize for Phone Reading">📱</button>
                    <button class="wings-ai-btn-outline" id="wings-ai-phone-btn" title="Request Phone Number">📞</button>
                    <button class="wings-ai-btn-outline" id="wings-ai-booking-btn" title="View Availability">📅</button>
                    <button class="wings-ai-btn-outline" id="wings-ai-refer-btn" title="Ask for Referral">💎</button>
                    <button class="wings-ai-btn-outline" id="wings-ai-combo-summary-btn" title="Summarize Combo" style="display: none;">📦</button>
                </div>
                <div class="wings-ai-textarea-container">
                    <textarea id="wings-ai-reply-text" placeholder="Click 'AI Suggestion' above to generate a reply..."></textarea>
                </div>
                <div class="wings-ai-bottom-actions">
                    <button class="wings-ai-btn-outline" id="wings-ai-report-btn" title="Correct AI Mistake" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); font-size: 11px; padding: 4px 8px;">
                        <svg viewBox="0 0 24 24" style="width:12px; height:12px; margin-right:4px; fill:currentColor; display:inline-block; vertical-align:middle;"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> Report
                    </button>
                    <button class="wings-ai-btn-primary" id="wings-ai-apply-btn">Insert</button>
                </div>
            </div>

            <div class="wings-ai-group wings-ai-preferences-group">
                <div class="wings-ai-prefs-header">
                    <span class="wings-ai-link" id="view-history">History Preview (What AI sees)</span>
                </div>
                <div id="wings-ai-history-panel" style="display:none;"><pre id="wings-ai-debug-history"></pre></div>
                <div class="wings-ai-ask-container">
                    <input type="text" id="wings-ai-ask-input" class="wings-ai-ask-input" placeholder="Ask Wings AI...">
                    <button id="wings-ai-ask-send-btn" class="wings-ai-ask-send-btn">➤</button>
                </div>
            </div>

            <!-- SPECIALIST VIEWS -->
            <div id="wings-ai-view-booking" style="display: none;">
                <div class="wings-ai-group-header">
                    <h3>Real-Time Booking</h3>
                    <div style="display:flex; gap: 8px;">
                        <button class="wings-ai-btn-outline" id="wings-ai-back-from-booking-btn">← Back</button>
                        <button class="wings-ai-btn-outline" id="wings-ai-refresh-booking-btn">🔄 Refresh</button>
                    </div>
                </div>
                <div class="wings-ai-booking-controls">
                    <div class="wings-ai-store-pills" id="wings-ai-store-pills">
                        <div id="wings-store-2" class="wings-ai-store-pill active" data-store="2">PXL</div>
                        <div id="wings-store-6" class="wings-ai-store-pill" data-store="6">De Tham</div>
                        <div id="wings-store-16" class="wings-ai-store-pill" data-store="16">Estella</div>
                    </div>
                    <div class="wings-ai-date-strip" id="wings-ai-date-strip"></div>
                </div>
                <div class="wings-ai-booking-content">
                    <div class="wings-ai-booking-section"><label>STAFF ON SHIFT</label><div id="wings-ai-tech-list" class="wings-ai-tech-grid"></div></div>
                    <div class="wings-ai-booking-section"><div id="wings-ai-slots-grid" class="wings-ai-slots-grid"></div></div>
                </div>
            </div>

            <div id="wings-ai-view-gallery" style="display: none;">
                <div class="wings-ai-gallery-controls">
                    <div class="wings-ai-search-wrapper">
                        <input type="text" id="wings-ai-gallery-search" placeholder="Search styles..." class="wings-ai-search-box">
                    </div>
                    <div class="wings-ai-filters">
                        <button class="wings-ai-filter-pill active" data-filter="all">All</button>
                        <button class="wings-ai-filter-pill" data-filter="natural">Natural</button>
                        <button class="wings-ai-filter-pill" data-filter="trending">Trending 🔥</button>
                    </div>
                </div>
                <div class="wings-ai-gallery-grid" id="wings-ai-gallery-grid"></div>
            </div>

            <div id="wings-ai-view-upload" style="display: none;">
                <div class="wings-ai-group-header">
                    <h3>Upload Styles</h3>
                    <button class="wings-ai-btn-outline" id="wings-ai-back-to-gallery-btn">Back</button>
                </div>
                <div class="wings-ai-upload-zone" id="wings-ai-upload-zone">
                    <input type="file" id="wings-ai-hidden-input" accept="image/*" multiple style="display:none">
                    <div class="wings-ai-upload-content">
                        <div class="wings-ai-sparkle-icon">✨</div>
                        <h3>Drop photos here</h3>
                        <input type="text" id="wings-ai-upload-tags" placeholder="Add tags..." style="width: 80%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px; color: white;">
                        <button class="wings-ai-btn-outline-gold" id="wings-ai-browse-btn">BROWSE</button>
                    </div>
                </div>
                <div class="wings-ai-upload-list" id="wings-ai-upload-list"></div>
            </div>
        </div>

        <div class="wings-ai-footer" id="wings-ai-global-footer">
            <span class="wings-ai-footer-left">POWERED BY WINGS AI v4.1.2</span>
            
            <div class="wings-ai-settings-container" style="margin-left: auto; margin-right: 12px;">
                <span class="wings-ai-settings-trigger" title="Settings">⚙️</span>
                <div class="wings-ai-settings-tooltip">
                    <div class="wings-ai-settings-section">
                        <div class="wings-ai-tones">
                            <label class="wings-ai-tone-pill"><input type="checkbox" id="tone-vui" checked> VUI</label>
                            <label class="wings-ai-tone-pill"><input type="checkbox" id="tone-buon"> BUỒN</label>
                            <label class="wings-ai-tone-pill"><input type="checkbox" id="tone-tucthanh"> TỤC THANH</label>
                            <label class="wings-ai-tone-pill"><input type="checkbox" id="tone-dongcam"> ĐỒNG CẢM</label>
                            <label class="wings-ai-tone-pill"><input type="checkbox" id="tone-ngan" checked> NGẮN</label>
                        </div>
                    </div>
                    <div class="wings-ai-settings-divider"></div>
                    <div class="wings-ai-settings-section" style="justify-content: space-between;">
                         <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="wings-ai-model-selector">
                                <select id="wings-ai-model-choice" style="height: 24px; padding: 0 4px; font-size: 10px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; width: auto;"><option value="2.0">v2.0</option><option value="2.5">v2.5</option></select>
                            </div>
                            <div class="wings-ai-lang-selector">
                                <select id="wings-ai-lang-choice" style="height: 24px; padding: 0 4px; font-size: 10px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; width: auto;"><option value="AUTO">🤖</option><option value="VI">🇻🇳</option><option value="EN">🇬🇧</option></select>
                            </div>
                        </div>
                        <div class="wings-ai-status-indicator" style="font-size: 10px;">
                            <span id="wings-ai-active-tones-count">2</span> tones active
                        </div>
                    </div>
                     <div class="wings-ai-settings-divider"></div>
                     <div class="wings-ai-settings-section" style="justify-content: center;">
                        <div class="wings-ai-env-toggle-tooltip">
                            <label><input type="radio" name="api_env" value="orb" checked> Orb</label>
                            <span style="opacity:0.3">|</span>
                            <label><input type="radio" name="api_env" value="live"> Live</label>
                        </div>
                     </div>
                </div>
            </div>


        </div>

        <!-- Confirm Overlay -->
        <div id="wings-ai-confirm-overlay" class="wings-ai-booking-overlay" style="display: none;">
            <div class="wings-ai-confirm-card">
                <div class="wings-ai-confirm-icon">📅</div>
                <h3>Confirm Booking?</h3>
                <div class="wings-ai-confirm-details">
                    <div class="wings-ai-row"><span>Client:</span> <input type="text" id="wings-conf-name" class="wings-ai-confirm-input"></div>
                    <div class="wings-ai-row"><span>Phone:</span> <input type="text" id="wings-conf-phone" class="wings-ai-confirm-input"></div>
                    <div class="wings-ai-row"><span>Time:</span> <strong id="wings-conf-time" style="color:var(--wings-gold)"></strong></div>
                    <div class="wings-ai-row"><span>Store:</span> <strong id="wings-conf-store"></strong></div>
                    <div class="wings-ai-row"><span>Tech:</span> <select id="wings-conf-tech-select" class="wings-ai-confirm-input"></select></div>
                    <div class="wings-ai-row"><span>Booked by:</span> <select id="wings-conf-creator" class="wings-ai-confirm-input"></select></div>
                    <div class="wings-ai-row" style="flex-direction: column; align-items: flex-start;">
                        <span>Note:</span>
                        <textarea id="wings-conf-note" style="width: 100%; min-height: 40px;">Booked by Wings AI</textarea>
                    </div>
                </div>
                <div id="wings-ai-confirm-actions" class="wings-ai-confirm-actions">
                    <button class="wings-ai-btn-outline" id="wings-conf-cancel">Cancel</button>
                    <button class="wings-ai-btn-primary" id="wings-conf-submit">Confirm NOW</button>
                </div>
                <div id="wings-ai-confirm-loading" style="display:none; color:var(--wings-gold);">⏳ Booking in progress...</div>
                <div id="wings-ai-confirm-success" style="display:none;">
                    <div style="font-size: 32px;">✅</div>
                    <h3 style="color: #22c55e;">Booking Success!</h3>
                    <button id="wings-conf-lang-toggle">Translate to English</button>
                    <textarea id="wings-conf-msg-preview" style="width: 100%; min-height: 120px;"></textarea>
                    <div class="wings-ai-confirm-actions">
                        <button class="wings-ai-btn-outline" id="wings-conf-success-close">Close</button>
                        <button class="wings-ai-btn-primary" id="wings-conf-copy-close">Copy & Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.modalElement = modal;
    
    replyTextarea = modal.querySelector('#wings-ai-reply-text');

    // Close Button Logic
    const closeBtn = modal.querySelector('#wings-ai-close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    } else {
        console.error("[Wings AI] Close button not found");
    }

    // Click-to-Copy Phone in Header
    const headerPhone = modal.querySelector('#wings-ai-display-phone');
    if (headerPhone) {
        headerPhone.title = 'Click to copy phone';
        headerPhone.onclick = (e) => {
            const phone = e.target.textContent.trim();
            if (!phone || phone === 'Copied!') return;
            navigator.clipboard.writeText(phone).then(() => {
                const original = e.target.textContent;
                e.target.textContent = 'Copied!';
                e.target.classList.add('copied');
                setTimeout(() => {
                    e.target.textContent = original;
                    e.target.classList.remove('copied');
                }, 1000);
            });
        };
    }
    
    // Safe Event Listener Helper
    function safeAddListener(selector, event, handler, context = modal) {
        const element = context.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        } else {
            console.warn(`[Wings AI] Element not found: ${selector}`);
            return false;
        }
    }

    // Nav: Logo to Main
    const logoArea = modal.querySelector('.wings-ai-header-left');
    if(logoArea) {
        logoArea.style.cursor = 'pointer';
        logoArea.onclick = () => {
             switchView('main');
        };
    }
    

    safeAddListener('#wings-ai-model-choice', 'change', (e) => {
        chrome.storage.sync.set({ lastModelChoice: e.target.value });
    });
    safeAddListener('#wings-ai-lang-choice', 'change', (e) => {
        chrome.storage.sync.set({ lastLangChoice: e.target.value });
    });

    chrome.storage.sync.get(['lastModelChoice', 'lastLangChoice', 'apiEnv'], (result) => {
        // if (result.lastMyStyle) document.getElementById('wings-ai-style-input').value = result.lastMyStyle;
        if (result.lastModelChoice) document.getElementById('wings-ai-model-choice').value = result.lastModelChoice;
        if (result.lastLangChoice) document.getElementById('wings-ai-lang-choice').value = result.lastLangChoice;
        
        if (result.apiEnv) {
            const radio = modal.querySelector(`input[name="api_env"][value="${result.apiEnv}"]`);
            if (radio) radio.checked = true;
        }
    });

    // Helper for Global Action Loading
    function setActionsLoading(isLoading, activeId = null) {
        const btnIds = [
            '#wings-ai-refine-btn', '#wings-ai-shorter-btn', '#wings-ai-format-btn', 
            '#wings-ai-phone-btn', '#wings-ai-refer-btn', '#wings-ai-combo-summary-btn',
            '#wings-ai-booking-btn' // Added Booking Button
        ];
        
        btnIds.forEach(id => {
            const btn = modal.querySelector(id);
            if (btn) {
                if (isLoading) {
                    // Only change text if it's the active button
                    if (id === activeId) {
                        btn.dataset.originalHtml = btn.innerHTML;
                        btn.innerHTML = "⏳";
                    }
                    btn.disabled = true;
                } else {
                    // Restore text if we saved it (meaning it was the active one)
                    if (btn.dataset.originalHtml) {
                        btn.innerHTML = btn.dataset.originalHtml;
                        delete btn.dataset.originalHtml; // Clean up
                    }
                    btn.disabled = false;
                }
            }
        });
        
        // Booking Btn is now in the main list, so no need to separately disable it.
    }

    // Env Change listener for modal
    modal.querySelectorAll('input[name="api_env"]').forEach(r => {
        r.addEventListener('change', (e) => {
            chrome.storage.sync.set({ apiEnv: e.target.value });
        });
    });
    
    // --- ASK WINGS AI LISTENER ---
    const askInput = modal.querySelector('#wings-ai-ask-input');
    const askBtn = modal.querySelector('#wings-ai-ask-send-btn');
    
    function handleAskWingsAction() {
        const query = askInput.value.trim();
        if (!query) return;

        const originalBtnText = askBtn.innerHTML;
        askBtn.innerHTML = "⏳";
        askBtn.disabled = true;
        askInput.disabled = true;

        safeSendMessage({
            action: "askWingsAI",
            query: query,
            modelChoice: document.getElementById('wings-ai-model-choice').value,
            apiEnv: (window.modalElement?.querySelector('input[name="api_env"]:checked')?.value) || 'orb'
        }, (response) => {
            askBtn.innerHTML = originalBtnText;
            askBtn.disabled = false;
            askInput.disabled = false;
            askInput.value = ''; // Clear input

            if (response && response.reply) {
                // Insert reply into main textarea
                replyTextarea.value = response.reply;
            } else if (response && response.error) {
                alert(response.error);
            }
        });
    }

    if (askBtn && askInput) {
        askBtn.addEventListener('click', handleAskWingsAction);
        askInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAskWingsAction();
        });
    } else {
        console.warn("[Wings AI] Ask input or button not found");
    }

    // --- Header Navigation Logic ---
    // Clicking the Logo Area resets to Home (AI View)
    const headerLeft = modal.querySelector('.wings-ai-header-left');
    if (headerLeft) {
        headerLeft.addEventListener('click', () => {
            const bookingView = document.getElementById('wings-ai-view-booking');
            const galleryView = document.getElementById('wings-ai-view-gallery');
            const uploadView = document.getElementById('wings-ai-view-upload');
            const controlGroup = modal.querySelector('.wings-ai-control-group');
            const outputGroup = modal.querySelector('.wings-ai-output-group');
            const prefsGroup = modal.querySelector('.wings-ai-preferences-group');
            const galleryToggle = document.getElementById('wings-ai-gallery-toggle');
            const uploadBtn = document.getElementById('wings-ai-header-upload-btn');
            
            if (bookingView) bookingView.style.display = 'none';
            if (galleryView) galleryView.style.display = 'none';
            if (uploadView) uploadView.style.display = 'none';
            if (controlGroup) controlGroup.style.display = 'block';
            if (outputGroup) outputGroup.style.display = 'block';
            if (prefsGroup) prefsGroup.style.display = 'block';
            if (galleryToggle) galleryToggle.style.color = '#52525b';
            if (uploadBtn) uploadBtn.style.display = 'none';
        });
    } else {
        console.warn("[Wings AI] Header left element not found");
    }
    
    const generateBtn = modal.querySelector('#wings-ai-generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', onGenerateClick);
    } else {
        console.error("[Wings AI] Generate button not found");
    }

    const applyBtn = modal.querySelector('#wings-ai-apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const text = replyTextarea.value;
            if(text) insertTextIntoChat(text);
        });
    } else {
        console.error("[Wings AI] Apply button not found");
    }

    // --- REFER BUTTON LISTENER ---
    safeAddListener('#wings-ai-refer-btn', 'click', async () => {
        const currentText = replyTextarea.value;
        setActionsLoading(true, '#wings-ai-refer-btn');

        safeSendMessage({
            action: "referralReply",
            currentText: currentText, 
            modelChoice: document.getElementById('wings-ai-model-choice').value,
            apiEnv: (window.modalElement?.querySelector('input[name="api_env"]:checked')?.value) || 'orb'
        }, (response) => {
            setActionsLoading(false);
            
            if (response && response.reply) {
                // If there was text, maybe append? or replace? Usually replacement or appending is safer.
                // Let's replace for now, as it's a specific "Refer" intent.
                replyTextarea.value = response.reply;
            } else if (response && response.error) {
                alert(response.error);
            }
        });
    });

    safeAddListener('#wings-ai-refine-btn', 'click', async () => {
        const currentText = replyTextarea.value;
        if (!currentText) return;

        setActionsLoading(true, '#wings-ai-refine-btn');

        safeSendMessage({
            action: "improveReply",
            currentText: currentText,
            modelChoice: document.getElementById('wings-ai-model-choice').value,
            apiEnv: (window.modalElement?.querySelector('input[name="api_env"]:checked')?.value) || 'orb'
        }, (response) => {
            setActionsLoading(false);
            
            if (response && response.reply) {
                replyTextarea.value = response.reply;
            } else if (response && response.error) {
                alert(response.error);
            }
        });
    });

    safeAddListener('#wings-ai-shorter-btn', 'click', async () => {
        const currentText = replyTextarea.value;
        if (!currentText) return;

        setActionsLoading(true, '#wings-ai-shorter-btn');

        safeSendMessage({
            action: "shortenReply",
            currentText: currentText,
            modelChoice: document.getElementById('wings-ai-model-choice').value,
            apiEnv: (window.modalElement?.querySelector('input[name="api_env"]:checked')?.value) || 'orb'
        }, (response) => {
            setActionsLoading(false);
            
            if (response && response.reply) {
                replyTextarea.value = response.reply;
            } else if (response && response.error) {
                alert(response.error);
            }
        });
    });

    safeAddListener('#wings-ai-format-btn', 'click', async () => {
        const currentText = replyTextarea.value;
        if (!currentText) return;

        setActionsLoading(true, '#wings-ai-format-btn');

        safeSendMessage({
            action: "formatReply",
            currentText: currentText,
            modelChoice: document.getElementById('wings-ai-model-choice').value,
            apiEnv: (window.modalElement?.querySelector('input[name="api_env"]:checked')?.value) || 'orb'
        }, (response) => {
            setActionsLoading(false);
            
            if (response && response.reply) {
                replyTextarea.value = response.reply;
            } else if (response && response.error) {
                alert(response.error);
            }
        });
    });

    safeAddListener('#wings-ai-phone-btn', 'click', async () => {
        const currentText = replyTextarea.value;
        setActionsLoading(true, '#wings-ai-phone-btn');

        safeSendMessage({
            action: "requestPhoneReply",
            currentText: currentText,
            modelChoice: document.getElementById('wings-ai-model-choice').value,
            apiEnv: (window.modalElement?.querySelector('input[name="api_env"]:checked')?.value) || 'orb'
        }, (response) => {
            setActionsLoading(false);
            
            if (response && response.reply) {
                replyTextarea.value = response.reply;
            } else if (response && response.error) {
                alert(response.error);
            }
        });
    });

    safeAddListener('#wings-ai-report-btn', 'click', showCorrectionUI);

    // --- DELEGATED COMBO SUMMARY LISTENER ---
    // This handles the click regardless of button recreation
    modal.addEventListener('click', async (e) => {
        const btn = e.target.closest('#wings-ai-combo-summary-btn');
        if (!btn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        console.log("[Wings AI] Combo Summary Clicked (Delegated)");
        
        // Visual Feedback
        setActionsLoading(true, '#wings-ai-combo-summary-btn');
        
        try {
            const clientName = getClientName();
            const modelChoice = document.getElementById('wings-ai-model-choice').value;
            // Use global history data which is set in onGenerateClick
            const historyData = window.modalElement?.lastHistoryData;

            if (!historyData) {
                alert("No client history found. Please generate an AI suggestion first.");
                setActionsLoading(false);
                return;
            }

            const responseSum = await safeSendMessage({
                action: "summarizeCombos",
                historyData: historyData,
                clientName: clientName,
                modelChoice: modelChoice
            });

            if (responseSum && responseSum.reply) {
                replyTextarea.value = responseSum.reply;
            } else if (responseSum && responseSum.error) {
                alert("Wings AI Error: " + responseSum.error);
            }
        } catch (err) {
            console.error("[Wings AI] Combo Error:", err);
            alert("Error: " + err.message);
        } finally {
             setActionsLoading(false);
        }
    });

    safeAddListener('#view-history', 'click', () => {
        const panel = modal.querySelector('#wings-ai-history-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // Update active tones count
    const toneCheckboxes = modal.querySelectorAll('.wings-ai-tones input');
    const updateCount = () => {
        const count = Array.from(toneCheckboxes).filter(cb => cb.checked).length;
        document.getElementById('wings-ai-active-tones-count').innerText = count;
    };
    toneCheckboxes.forEach(cb => cb.addEventListener('change', updateCount));

    makeDraggable(modal);
    makeResizable(modal);
    
    // Gallery Logic
    const mainGroups = modal.querySelectorAll('.wings-ai-control-group, .wings-ai-output-group, .wings-ai-preferences-group');
    const galleryView = modal.querySelector('#wings-ai-view-gallery');
    const uploadView = modal.querySelector('#wings-ai-view-upload');
    const galleryBtn = modal.querySelector('#wings-ai-gallery-toggle');
    const headerUploadBtn = modal.querySelector('#wings-ai-header-upload-btn');

    // --- Booking State ---
    // Variables moved to top to fix scope

    function switchView(viewName) {
        const bookingView = modal.querySelector('#wings-ai-view-booking');
        const galleryView = modal.querySelector('#wings-ai-view-gallery');
        const uploadView = modal.querySelector('#wings-ai-view-upload');
        const mainGroups = modal.querySelectorAll('.wings-ai-control-group, .wings-ai-output-group, .wings-ai-preferences-group');
        
        // Ensure listeners are fresh on every view switch
        rebindDelegatedListeners();

        // 1. Hide everything
        mainGroups.forEach(el => el.style.display = 'none');
        galleryView.style.display = 'none';
        uploadView.style.display = 'none';
        bookingView.style.display = 'none';
        headerUploadBtn.style.display = 'none';
        galleryBtn.style.color = '#52525b';

        // 2. Show target
        if (viewName === 'main') {
            mainGroups.forEach(el => el.style.display = 'block');
        } else if (viewName === 'gallery') {
            galleryView.style.display = 'block'; 
            galleryBtn.style.color = '#fcc33a'; // Active Gold
            headerUploadBtn.style.display = 'block';
            loadGallery();
        } else if (viewName === 'upload') {
            uploadView.style.display = 'block'; 
            // Clear previous uploads
            const list = document.getElementById('wings-ai-upload-list');
            if(list) list.innerHTML = '';
            const countEl = document.getElementById('wings-ai-upload-count');
            if(countEl) countEl.innerText = '0 Processing';
        } else if (viewName === 'booking') {
            bookingView.style.display = 'block';
            generateDateStrip();
            loadBookingData();
        }

        // Reset scroll position to top
        const contentArea = modal.querySelector('#wings-ai-main-content');
        if (contentArea) contentArea.scrollTop = 0;
    }

    safeAddListener('#wings-ai-gallery-toggle', 'click', () => {
        if (galleryView.style.display === 'none') {
            switchView('gallery');
        } else {
            switchView('main');
        }
    });

    safeAddListener('#wings-ai-back-to-gallery-btn', 'click', () => {
        switchView('gallery');
    });

    safeAddListener('#wings-ai-header-upload-btn', 'click', () => {
        switchView('upload');
    });

    safeAddListener('#wings-ai-booking-btn', 'click', async () => {
        const text = replyTextarea.value;
        const modelChoice = document.getElementById('wings-ai-model-choice').value;

        // Reset manual selections to allow AI to pre-select fresh
        if (window.modalElement) {
            window.modalElement.selectedTechId = null;
            window.modalElement.selectedTechName = null;
            window.modalElement.suggestedTechName = null;
            window.modalElement.suggestedTime = null;
        }

        // Use Global Loading
        setActionsLoading(true, '#wings-ai-booking-btn');

        safeSendMessage({
            action: "extractBookingIntent",
            text: text,
            modelChoice: modelChoice
        }, (response) => {
            setActionsLoading(false);

            let intent = {};
            if (response && response.intent) {
                 intent = response.intent;
                 console.log("[Wings AI] AI Extracted Intent:", intent);
            } else {
                 console.warn("[Wings AI] AI Parse failed, falling back to Regex");
                 intent = parseBookingIntent(text);
            }
            
            if (intent.storeId) selectedBookingStore = intent.storeId;
            
            if (intent.date) {
                selectedBookingDate = intent.date;
            } else {
                 selectedBookingDate = new Date().toISOString().split('T')[0];
            }
            
            if (window.modalElement) {
                window.modalElement.suggestedTime = intent.time;
                window.modalElement.suggestedTechName = intent.techName;
            }

            switchView('booking');
            generateDateStrip();
        });
    });


    const backFromBookingBtn = modal.querySelector('#wings-ai-back-from-booking-btn');
    if (backFromBookingBtn) {
        backFromBookingBtn.addEventListener('click', () => {
            switchView('main');
        });
    } else {
        console.warn("[Wings AI] Back from booking button not found");
    }


    const refreshBookingBtn = modal.querySelector('#wings-ai-refresh-booking-btn');
    if (refreshBookingBtn) {
        refreshBookingBtn.addEventListener('click', () => {
            loadBookingData();
        });
    } else {
        console.warn("[Wings AI] Refresh booking button not found");
    }

    // Store Picker Logic (Direct ID Binding)
    function rebindDelegatedListeners() {
        // 1. Close Button
        const closeBtn = modal.querySelector('#wings-ai-close-modal');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                modal.style.display = 'none';
            };
        }

        // 2. Logo -> Main
        const logo = modal.querySelector('.wings-ai-header-left');
        if (logo) {
            logo.onclick = (e) => {
                e.stopPropagation();
                switchView('main');
            };
        }

        // 3. Store Picker
        const storePills = modal.querySelectorAll('.wings-ai-store-pill');
        storePills.forEach(pill => {
            pill.onclick = (e) => {
                e.stopPropagation();
                storePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedBookingStore = pill.getAttribute('data-store');
                loadBookingData();
            };
        });
    }

    // Initial Bind
    rebindDelegatedListeners();

    // The catch-all delegation as backup
    modal.addEventListener('click', (e) => {
        // ... (This can stay or be redundant now)
    });

    function generateDateStrip() {
        const strip = document.getElementById('wings-ai-date-strip');
        if (!strip) return;
        strip.innerHTML = '';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 0; i < 28; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const fullDate = `${yyyy}-${mm}-${dd}`;
            
            // Re-normalize dayName so logic matches request
            const dayName = days[date.getDay()].toUpperCase();
            
            const pill = document.createElement('div');
            pill.className = `wings-ai-date-pill ${fullDate === selectedBookingDate ? 'active' : ''}`;
            
            // Special Styling for SUN
            const isSunday = dayName === 'SUN';
            const dayStyle = isSunday ? 'color: #fff; font-weight: 800;' : 'opacity: 0.7;';
            
            pill.innerHTML = `<div style="font-size: 9px; margin-bottom: 2px; ${dayStyle}">${dayName}</div>
                              <div style="font-size: 14px; font-weight: 700;">${date.getDate()}</div>`;
            
            pill.addEventListener('click', () => {
                modal.querySelectorAll('.wings-ai-date-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedBookingDate = fullDate;
                loadBookingData();
            });
            strip.appendChild(pill);
        }
    }

    // --- Custom Modal Logic (Moved Up) ---

    function confirmBooking(time) {
        console.log("[Wings AI] confirmBooking triggered for:", time);
        pendingBookingTime = time;
        const scrapedName = getClientName();
        const scrapedPhone = getClientPhone();
        
        let techName = "Any Technician";
        // Use global window.modalElement to avoid closure scope issues
        // Relaxed check: Show name if it exists, even if ID is 0 or technically falsy (though it should be valid)
        if (window.modalElement && window.modalElement.selectedTechName) {
            techName = window.modalElement.selectedTechName;
        }
        
        // Populate Modal Inputs
        const nameInput = document.getElementById('wings-conf-name');
        const phoneInput = document.getElementById('wings-conf-phone');
        
        if (nameInput) nameInput.value = scrapedName;
        if (phoneInput) phoneInput.value = scrapedPhone;
        
        document.getElementById('wings-conf-time').textContent = `${time} (${selectedBookingDate})`;
        
        let storeName = "PXL";
        if (selectedBookingStore == "6") storeName = "De Tham";
        if (selectedBookingStore == "16") storeName = "Estella";
        document.getElementById('wings-conf-store').textContent = storeName;
        
        document.getElementById('wings-conf-store').textContent = storeName;
        
        // Populate Tech Dropdown
        const techSelect = document.getElementById('wings-conf-tech-select');
        if (techSelect) {
            techSelect.innerHTML = '';
            
            // Default Option: Any Technician
            const anyOpt = document.createElement('option');
            anyOpt.value = "0";
            anyOpt.textContent = "Any Technician";
            techSelect.appendChild(anyOpt);

            // Populate from saved techs pool
            if (window.modalElement.currentStoreTechs && Array.isArray(window.modalElement.currentStoreTechs)) {
                window.modalElement.currentStoreTechs.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.name;
                    techSelect.appendChild(opt);
                });
            }

            // Set current selection
            if (window.modalElement.selectedTechId) {
                techSelect.value = String(window.modalElement.selectedTechId);
            }
        }
        
        // Default Note
        document.getElementById('wings-conf-note').value = "Booked by Wings AI";

        // Populate Creator Dropdown
        const creatorSelect = document.getElementById('wings-conf-creator');
        if (creatorSelect) {
            creatorSelect.innerHTML = '';
            
            // Default Option: None (No Attribution)
            const noneOpt = document.createElement('option');
            noneOpt.value = "0";
            noneOpt.textContent = "─ Select Staff ─";
            creatorSelect.appendChild(noneOpt);

            const addedIds = new Set();
            addedIds.add("0");
            
            // Option 1: CS Owner (Default)
            if (window.modalElement.currentCSOwner) {
                const opt = document.createElement('option');
                opt.value = window.modalElement.currentCSOwner.id;
                opt.textContent = window.modalElement.currentCSOwner.name;
                creatorSelect.appendChild(opt);
                addedIds.add(String(opt.value));
                // Set as default if available
                creatorSelect.value = String(opt.value);
            }
            
            // Option 2: Session User (Me)
            const sessionUser = window.modalElement.currentSessionUser || persistentSessionUser;
            if (sessionUser) {
                const staffId = String(sessionUser.uid?.split('-')[1] || "0");
                if (staffId !== "0" && !addedIds.has(staffId)) {
                    const opt = document.createElement('option');
                    opt.value = staffId;
                    opt.textContent = (sessionUser.displayName || "Me");
                    creatorSelect.appendChild(opt);
                }
            }
        }

        // Reset State
        document.getElementById('wings-ai-confirm-actions').style.display = 'flex';
        document.getElementById('wings-ai-confirm-loading').style.display = 'none';
        document.getElementById('wings-ai-confirm-success').style.display = 'none';
        
        const confOverlay = document.getElementById('wings-ai-confirm-overlay');
        confOverlay.style.display = 'flex';

        // --- FORCE RE-BINDING ON SHOW ---
        const cancelBtn = confOverlay.querySelector('#wings-conf-cancel');
        const submitBtn = confOverlay.querySelector('#wings-conf-submit');

        // Safe Reset of Button Styles
        [cancelBtn, submitBtn].forEach(btn => {
            if(btn) {
                btn.style.pointerEvents = 'auto'; // Force clickable
                btn.style.position = 'relative'; 
                btn.style.zIndex = '310000'; // Higher than overlay (300,000)
                btn.style.cursor = 'pointer';
            }
        });

        if (cancelBtn) {
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("[Wings AI] Cancel Clicked (Re-bound)");
                document.getElementById('wings-ai-confirm-overlay').style.display = 'none';
                pendingBookingTime = null;
            };
        }

        if (submitBtn) {
            submitBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("[Wings AI] Submit Clicked (Re-bound)");
                if (pendingBookingTime) submitBooking(pendingBookingTime);
            };
        }
    }



    const STORE_INFO = {
        "2": { 
            name: "PXL", 
            address: "180 Nguyễn Lương Bằng, Phường Tân Phú, Quận 7", 
            hotline: "19008154" 
        },
        "6": { 
            name: "De Tham", 
            address: "114 - 116 Đề Thám, Phường Cầu Ông Lãnh, Quận 1", 
            hotline: "19008154" 
        },
        "16": { 
            name: "Estella", 
            address: "L5-08, 09 Estella Place, 88 Song Hành, Quận 2", 
            hotline: "19008154" 
        }
    };

    function generateConfirmationMessage(data) {
        const { clientName, time, date, storeId, technicianName, lastRetainDate, lang = "VN" } = data;
        
        const isEN = lang === "EN";

        // Format Time (HH:MM -> HH:MM AM/PM)
        let formattedTime = time;
        try {
            const [hh, mm] = time.split(':');
            const h = parseInt(hh);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            formattedTime = `${displayH}:${mm} ${ampm}`;
        } catch (e) {}

        // Format Day of Week
        const daysVN = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        const daysEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const bookingDate = new Date(date);
        const dayOfWeek = isEN ? daysEN[bookingDate.getDay()] : daysVN[bookingDate.getDay()];

        // Format Date (YYYY-MM-DD -> DD/MM/YYYY)
        const [y, m, d] = date.split('-');
        const formattedDate = `${d}/${m}/${y}`;

        // Store Info
        const info = STORE_INFO[String(storeId)] || { address: "[Store Address]", hotline: "19008154" };

        // Cycle Gap Logic
        let cycleLine = "";
        if (lastRetainDate) {
            const retainDate = new Date(lastRetainDate);
            const diffTime = Math.abs(bookingDate - retainDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            cycleLine = isEN ? ` - Cycle: ${diffDays} days` : ` - Chu kì: ${diffDays} ngày`;
        }

        // Tech Line
        let techLine = "";
        if (technicianName && technicianName !== "Any Technician") {
            const label = isEN ? "Technician" : "Chuyên Viên";
            techLine = `\n👩‍🎨 ${label}: ${technicianName}`;
        }

        if (isEN) {
            return `Hi ${clientName}, here is your booking confirmation:\n\n🗓️ ${formattedTime} ${dayOfWeek}, ${formattedDate}${cycleLine}\n📍 Address: ${info.address} - HOTLINE ${info.hotline}${techLine}\n\nPlease try to arrive 5-10 minutes early so our Wings Angels can serve you best! <3`;
        }

        return `Dạ đây là lịch hẹn của chị ${clientName} \n\n🗓️ ${formattedTime} ${dayOfWeek}, ${formattedDate}${cycleLine}\n📍 D/c: ${info.address} - HOTLINE ${info.hotline}${techLine}\n\nChị đẹp cố gắng sắp xếp ghé em sớm 5 10 phút để Thiên Thần Wings phục vụ mình tốt hơn nhen! <3`;
    }

    async function submitBooking(time) {
        console.log("[Wings AI] submitBooking triggered for:", time);
        // UI Loading State
        document.getElementById('wings-ai-confirm-actions').style.display = 'none';
        document.getElementById('wings-ai-confirm-loading').style.display = 'block';
        document.getElementById('wings-ai-confirm-loading').textContent = '⏳ Booking in progress...';

        const clientName = document.getElementById('wings-conf-name').value.trim();
        const clientPhone = document.getElementById('wings-conf-phone').value.trim();
        const apiEnv = modal.querySelector('input[name="api_env"]:checked').value;

        if (!clientName || !clientPhone) {
            alert("Please enter both Client Name and Phone number");
            document.getElementById('wings-ai-confirm-actions').style.display = 'flex';
            document.getElementById('wings-ai-confirm-loading').style.display = 'none';
            return;
        }

        const techId = parseInt(modal.querySelector('#wings-conf-tech-select')?.value) || 0;
        const bookedByUserId = parseInt(modal.querySelector('#wings-conf-creator')?.value) || 0;
        const noteValue = modal.querySelector('#wings-conf-note')?.value || "Booked by Wings AI";

        // Build base payload (Modal OVERRIDES all other settings)
        const payload = {
            phone: clientPhone,
            full_name: clientName,
            store_id: parseInt(selectedBookingStore) || 2,
            start_time: `${selectedBookingDate} ${time}:00`,
            services: [1], // Correct API Field: Must be an array
            note: noteValue
        };

        // 1. Technician Assignment: 
        // Any Technician = unassigned (OMIT IT)
        if (techId !== 0) {
            payload.technician_id = techId;
        }

        // 2. Created By Assignment (Attribution):
        // If bookedByUserId is NOT 0, send the staff ID.
        // If it IS 0 ("Select Staff"), OMIT it (per user request).
        if (bookedByUserId !== 0) {
            payload.created_by_staff_id = bookedByUserId;
        }

        console.log("[Wings AI] Preparing Booking Submission...");
        console.table(payload);

        safeSendMessage({
            action: "createBooking",
            payload: payload,
            apiEnv: apiEnv
        }, (response) => {
            if (response && response.status === 'success') {
                // Transition to Success State
                document.getElementById('wings-ai-confirm-loading').style.display = 'none';
                const successContainer = document.getElementById('wings-ai-confirm-success');
                const previewTextarea = document.getElementById('wings-conf-msg-preview');
                
                successContainer.style.display = 'block';

                // Generate Message
                const techSelect = modal.querySelector('#wings-conf-tech-select');
                const techName = techSelect ? techSelect.options[techSelect.selectedIndex]?.text : null;
                const lastRetainDate = window.modalElement.lastHistoryData?.last_normal_retain_date;

                const message = generateConfirmationMessage({
                    clientName,
                    time,
                    date: selectedBookingDate,
                    storeId: selectedBookingStore,
                    technicianName: techName,
                    lastRetainDate: lastRetainDate
                });

                let currentLang = "VN";
                const langToggle = document.getElementById('wings-conf-lang-toggle');

                const updateMsg = (l) => {
                    const message = generateConfirmationMessage({
                        clientName,
                        time,
                        date: selectedBookingDate,
                        storeId: selectedBookingStore,
                        technicianName: techName,
                        lastRetainDate: lastRetainDate,
                        lang: l
                    });
                    previewTextarea.value = message;
                    langToggle.textContent = l === "VN" ? "Translate to English" : "Dịch sang Tiếng Việt";
                };

                updateMsg(currentLang);

                langToggle.onclick = () => {
                    currentLang = currentLang === "VN" ? "EN" : "VN";
                    updateMsg(currentLang);
                };
                
                // Re-bind success buttons
                document.getElementById('wings-conf-success-close').onclick = () => {
                    document.getElementById('wings-ai-confirm-overlay').style.display = 'none';
                    document.getElementById('wings-ai-confirm-success').style.display = 'none';
                    loadBookingData();
                };

                document.getElementById('wings-conf-copy-close').onclick = () => {
                    navigator.clipboard.writeText(previewTextarea.value).then(() => {
                        document.getElementById('wings-ai-confirm-overlay').style.display = 'none';
                        document.getElementById('wings-ai-confirm-success').style.display = 'none';
                        loadBookingData();
                    });
                };

            } else {
                // Show Error
                const errMsg = response ? response.message || response.error : "Unknown Error";
                document.getElementById('wings-ai-confirm-loading').innerHTML = `<span style="color:#ef4444; font-size:12px;">❌ Failed: ${errMsg}</span>`;
                // Allow trying again?
                setTimeout(() => {
                    document.getElementById('wings-ai-confirm-actions').style.display = 'flex';
                }, 2000);
            }
        });
    }

    // --- Smart Parsing Logic ---
    function parseBookingIntent(text) {
        if (!text) return {};
        const result = {};

        // 1. Store
        const lower = text.toLowerCase();
        if (lower.includes('thám') || lower.includes('de tham')) result.storeId = "6";
        else if (lower.includes('estella') || lower.includes('quận 2') || lower.includes('quan 2')) result.storeId = "16"; // Added Q2 alias
        else if (lower.includes('pxl') || lower.includes('phố') || lower.includes('xích') || lower.includes('long')) result.storeId = "2"; // More keywords for PXL

        // 2. Date Parsing
        const today = new Date();
        
        // A. ISO Date (YYYY-MM-DD) - Priority 1
        // Matches "2026-02-03"
        const isoRegex = /(\d{4})-(\d{2})-(\d{2})/;
        const isoMatch = text.match(isoRegex);
        
        // B. Regex for dd/mm (e.g. 03/02, 3/2) - Priority 2
        // Relaxed Regex: (\d{1,2})\/(\d{1,2})
        const simpleRegex = /(\d{1,2})\/(\d{1,2})/; 
        const simpleMatch = text.match(simpleRegex);

        if (isoMatch) {
             result.date = isoMatch[0]; // Already in YYYY-MM-DD
        } else if (simpleMatch) {
            const day = parseInt(simpleMatch[1]);
            const month = parseInt(simpleMatch[2]) - 1; // Month is 0-indexed
            const year = today.getFullYear();
            
            // Create date object
            const targetDate = new Date(year, month, day);
            
            // Validate: If date is in the past (more than 1 day ago), assume next year
            if (targetDate < new Date(today.getTime() - 86400000)) {
                 targetDate.setFullYear(year + 1);
            }

            const yyyy = targetDate.getFullYear();
            const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const dd = String(targetDate.getDate()).padStart(2, '0');
            result.date = `${yyyy}-${mm}-${dd}`;
        } 
        // C. Keywords 
        // B. Keywords
        else if (lower.includes('hôm nay') || lower.includes('tí nữa') || lower.includes('lát nữa') || lower.includes('xíu nữa')) {
             result.date = today.toISOString().split('T')[0];
        } else if (lower.includes('ngày mai')) {
             const tmr = new Date(today);
             tmr.setDate(tmr.getDate() + 1);
             result.date = tmr.toISOString().split('T')[0];
        }

        // 3. Time (e.g., 3h30, 15h30, 9h, 10:00)
        // Improved Regex: (\d{1,2})[h:](\d{2})? 
        // Matches 10h, 10:30, 9h30
        const timeMatch = text.match(/[\*\s](\d{1,2})[h:](\d{0,2})[\*\s]?/i);
        if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            let mStr = timeMatch[2];
            
            // Handle "10h" -> mStr is empty or undefined
            // Handle "10:30" -> mStr is "30"
            const m = mStr ? parseInt(mStr) : 0;
            
            // Heuristic: If hour < 8, assume PM (e.g., 2h -> 14h) unless specifically "AM"/"sáng" (not checked here)
            if (h < 8) h += 12; 

            result.time = `${h}:${String(m).padStart(2, '0')}`;
            // Format to HH:MM (padding)
            if (result.time.length === 4) result.time = `0${result.time}`; 
        }

        // 4. Staff Name
        // Look for patterns like "**Name**" or "với Name"
        // In the screenshot: "...cho chị yêu **Danny Do**..." (Client name)
        // ... "vào ngày mai..."
        // It doesn't seem to explicitly name a tech in the AI text provided.
        // However, if the user manually mentioned a tech in the PROMPT, the AI might parrot it.
        // The user request: "Wait for staff to click". 
        // Implication: If AI text HAS a staff name, highlight it. 
        // Pattern: "với [Name]" or "bé [Name]" or "em [Name]"
        // Regex for capitalized words after keywords
        const staffRegex = /(?:với|bé|em)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)?)/u;
        const staffMatch = text.match(staffRegex);
        if (staffMatch) {
             result.techName = staffMatch[1];
        }

        console.log("[Wings AI] Parsed Intent:", result);
        return result;
    }

    // === APPOINTMENT INDICATOR & TOOLTIP SYSTEM ===

    function createAppointmentIndicator(appointments) {
        const indicator = document.createElement('div');
        indicator.className = 'wings-ai-appointment-indicator';
        
        // Multiple appointments
        if (appointments.length > 1) {
            indicator.classList.add('multiple');
            indicator.textContent = appointments.length;
        }
        
        // Store data for tooltip
        indicator.dataset.appointments = JSON.stringify(appointments);
        
        // Hover and Hide Timing
        let hoverTimeout;

        indicator.addEventListener('mouseenter', (e) => {
            clearTimeout(window.modalElement?.tooltipHideTimeout); // Cancel any pending hide
            hoverTimeout = setTimeout(() => {
                showAppointmentTooltip(e.target, appointments);
            }, 200);
        });
        
        indicator.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            // Shared hide timeout to allow moving to tooltip
            if (window.modalElement) {
                window.modalElement.tooltipHideTimeout = setTimeout(() => {
                    hideAppointmentTooltip();
                }, 300); // 300ms safe zone
            }
        });
        
        return indicator;
    }

    function showAppointmentTooltip(indicatorEl, appointments) {
        // Remove existing tooltip
        hideAppointmentTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'wings-ai-appointment-tooltip';
        tooltip.id = 'wings-ai-apt-tooltip';
        
        // Build content based on appointment count
        if (appointments.length === 1) {
            tooltip.innerHTML = buildSingleAppointmentTooltip(appointments[0]);
        } else {
            tooltip.innerHTML = buildMultipleAppointmentsTooltip(appointments);
        }
        
        document.body.appendChild(tooltip);
        
        // --- PRECISION POSITIONING ---
        const rect = indicatorEl.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // 1. Vertical Positioning (below unless space is tight)
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < tooltipRect.height + 20 && spaceAbove > tooltipRect.height + 20) {
            tooltip.style.top = `${rect.top - tooltipRect.height - 12}px`;
        } else {
            tooltip.style.top = `${rect.bottom + 12}px`;
        }
        
        // 2. Horizontal Positioning (Center-aligned with viewport safety)
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        const margin = 15;
        if (left < margin) left = margin;
        if (left + tooltipRect.width > window.innerWidth - margin) {
            left = window.innerWidth - tooltipRect.width - margin;
        }
        tooltip.style.left = `${left}px`;
        
        // Prevent closing when hovering tooltip
        tooltip.addEventListener('mouseenter', () => {
            tooltip.dataset.hovering = 'true';
            clearTimeout(window.modalElement?.tooltipHideTimeout);
        });
        tooltip.addEventListener('mouseleave', () => {
            tooltip.dataset.hovering = 'false';
            if (window.modalElement) {
                window.modalElement.tooltipHideTimeout = setTimeout(hideAppointmentTooltip, 300);
            }
        });

        // Add Click-to-Copy for phone numbers
        tooltip.querySelectorAll('.wings-ai-copyable-phone').forEach(span => {
            span.title = 'Click to copy phone';
            span.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const phone = e.target.textContent.trim();
                if (phone === 'Copied!') return;
                navigator.clipboard.writeText(phone).then(() => {
                    const original = e.target.textContent;
                    e.target.textContent = 'Copied!';
                    e.target.classList.add('copied');
                    setTimeout(() => {
                        e.target.textContent = original;
                        e.target.classList.remove('copied');
                    }, 1000);
                });
            };
        });
    }

    function hideAppointmentTooltip() {
        const existing = document.getElementById('wings-ai-apt-tooltip');
        if (existing && existing.dataset.hovering !== 'true') {
            existing.remove();
        }
    }

    function buildSingleAppointmentTooltip(apt) {
        const duration = apt.estimated_duration;
        const endTime = calculateEndTime(apt.time_booked, duration.total_minute);
        
        let lastVisitHtml = '';
        if (apt.last_visit) {
            const lv = apt.last_visit;
            const serviceStr = lv.services && lv.services.length > 0 
                ? `🛠️ ${lv.services[0].service_name} by ${lv.services[0].technician_name}`
                : '';
            lastVisitHtml = `
                <div class="tooltip-last-visit">
                    📅 Last: ${lv.date} (${lv.days_ago}d ago)
                    <br>${serviceStr}
                </div>
            `;
        }

        // Variant based on type
        if (duration.type === 'individual') {
            return `
                <div class="tooltip-time">🕐 ${apt.time_booked} - ${endTime} (${duration.total_minute} min)</div>
                <div class="tooltip-badge">⚡ ADAPTIVE SPEED</div>
                <div class="tooltip-client">${apt.client_name} • <span class="wings-ai-copyable-phone">${apt.client_phone}</span></div>
                <div class="tooltip-visit">⭐ Visit #${apt.visit_count}</div>
                ${lastVisitHtml}
                <div class="tooltip-service">${apt.service_name}</div>
                ${apt.attributes ? `<div class="tooltip-attrs">${apt.attributes}</div>` : ''}
                <div class="tooltip-phases">
                    📊 Prep (${duration.breakdown.preparation}m) → 
                    Check (${duration.breakdown.pre_servicing}m) → 
                    Clean (${duration.breakdown.cleaning}m) → 
                    Service (${duration.breakdown.servicing}m)
                </div>
                <div class="tooltip-status">${getStatusIcon(apt.status)} ${apt.status}</div>
                ${apt.notes ? `<div class="tooltip-notes">📝 ${truncateNotes(apt.notes, 60)}</div>` : ''}
            `;
        } else {
            // projected_group_avg
            return `
                <div class="tooltip-time">🕐 ${apt.time_booked} - ${endTime} (${duration.total_minute} min)</div>
                <div class="tooltip-badge">📊 ESTIMATED</div>
                <div class="tooltip-client">${apt.client_name} • <span class="wings-ai-copyable-phone">${apt.client_phone}</span></div>
                <div class="tooltip-visit">⭐ Visit #${apt.visit_count}</div>
                ${lastVisitHtml}
                <div class="tooltip-service">${apt.service_name}</div>
                ${apt.attributes ? `<div class="tooltip-attrs">${apt.attributes}</div>` : '<div class="tooltip-attrs">(No design specified)</div>'}
                <div class="tooltip-speed">⚡ ${Math.round(duration.speed_ratio * 100)}% speed</div>
                <div class="tooltip-status">${getStatusIcon(apt.status)} ${apt.status}</div>
                ${apt.notes ? `<div class="tooltip-notes">📝 ${truncateNotes(apt.notes, 60)}</div>` : ''}
            `;
        }
    }

    function buildMultipleAppointmentsTooltip(appointments) {
        let html = `<div class="tooltip-header">🕐 ${appointments[0].time_booked} - Multiple Bookings (${appointments.length})</div>`;
        
        appointments.forEach((apt, idx) => {
            html += `
                <div class="tooltip-apt-item">
                    <div>${idx + 1}. ${apt.client_name} • <span class="wings-ai-copyable-phone">${apt.client_phone}</span></div>
                    <div class="tooltip-service-sm">${apt.service_name} (${apt.estimated_duration.total_minute} min)</div>
                    <div class="tooltip-visit-sm">Visit #${apt.visit_count}</div>
                </div>
            `;
            if (idx < appointments.length - 1) html += '<div class="tooltip-divider"></div>';
        });
        
        html += '<div class="tooltip-warning">⚠️ OVERBOOKING ALERT</div>';
        return html;
    }

    function calculateEndTime(startTime, minutes) {
        const [h, m] = startTime.split(':').map(Number);
        const totalMinutes = h * 60 + m + minutes;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    function getStatusIcon(status) {
        const icons = { 
            'New': '⏱', 
            'Confirmed': '✓', 
            'Completed': '✅', 
            'Cancelled': '❌' 
        };
        return icons[status] || '•';
    }

    function truncateNotes(notes, maxLen) {
        return notes.length > maxLen ? notes.substring(0, maxLen) + '...' : notes;
    }

    // === END APPOINTMENT SYSTEM ===

    async function fetchAndCacheAppointments(techId, selectedDate, apiEnv) {
        if (!window.modalElement) return;
        
        // Check cache (5 minutes = 300,000ms)
        const now = Date.now();
        const cache = window.modalElement.selectedTechAppointments;
        const cacheValid = cache && 
                          window.modalElement.appointmentsLastFetched && 
                          (now - window.modalElement.appointmentsLastFetched < 5 * 60 * 1000) &&
                          cache.technicianId === techId &&
                          cache.date === selectedDate;
        
        if (cacheValid) {
            console.log("[Wings AI] Using cached appointments for", techId, "on", selectedDate);
            return; // Use cached data
        }
        
        console.log("[Wings AI] Fetching appointments for tech:", techId, "date:", selectedDate);
        
        // For now, fetch single day (matching the selected booking date)
        const startDate = selectedDate;
        const endDate = selectedDate;
        
        safeSendMessage({
            action: "fetchTechAppointments",
            technicianId: techId,
            startDate: startDate,
            endDate: endDate,
            apiEnv: apiEnv
        }, (response) => {
            if (response && response.status === 'success' && response.data) {
                window.modalElement.selectedTechAppointments = {
                    technicianId: techId,
                    date: selectedDate,
                    appointments: response.data
                };
                window.modalElement.appointmentsLastFetched = Date.now();
                console.log(`[Wings AI] Cached ${response.data.length} appointments`);
                
                // Re-render slots to show indicators
                renderBookingData(selectedBookingStore, apiEnv);
            } else {
                console.warn("[Wings AI] Failed to fetch appointments:", response);
            }
        });
    }

    async function loadBookingData() {
        const techList = document.getElementById('wings-ai-tech-list');
        const slotsGrid = document.getElementById('wings-ai-slots-grid');
        
        techList.innerHTML = '<div class="wings-ai-loading">Fetching staff...</div>';
        slotsGrid.innerHTML = '<div class="wings-ai-loading">Fetching slots...</div>';

        const clientPhone = getClientPhone();
        const envEl = window.modalElement?.querySelector('input[name="api_env"]:checked');
        const apiEnv = envEl ? envEl.value : 'orb';

        // Sync UI pills to match selectedBookingStore
        const syncPills = (id) => {
            window.modalElement.querySelectorAll('.wings-ai-store-pill').forEach(p => {
                if (p.getAttribute('data-store') == id) p.classList.add('active');
                else p.classList.remove('active');
            });
        };

        // Auto-select store if we haven't manually picked one yet
        if (!selectedBookingStore) {
             safeSendMessage({
                action: "generateReply", 
                history: "", 
                clientName: "System",
                clientPhone: clientPhone,
                apiEnv: apiEnv
            }, (response) => {
                let storeId = "2"; // Default to PXL (2)
                if (response && response.historyData) {
                    const name = (response.historyData.store_name || "").toLowerCase();
                    if (name.includes("tham") || name.includes("đề")) storeId = "6";
                    else if (name.includes("estella")) storeId = "16";
                }
                selectedBookingStore = storeId;
                syncPills(selectedBookingStore);
                renderBookingData(selectedBookingStore, apiEnv);
            });
        } else {
             syncPills(selectedBookingStore);
             renderBookingData(selectedBookingStore, apiEnv);
        }
    }

    async function renderBookingData(storeRef, apiEnv) {
        const techList = document.getElementById('wings-ai-tech-list');
        const slotsContainer = document.getElementById('wings-ai-slots-grid'); 

        // 1. Fetch Techs (Status for Today)
        safeSendMessage({ 
            action: "fetchTechsOnly", 
            storeId: storeRef, 
            apiEnv: apiEnv 
        }, (techs) => {
            if (window.modalElement) {
                window.modalElement.currentStoreTechs = techs || [];
                // Trigger appointment fetch if a tech is already selected (auto-select or navigation)
                if (window.modalElement.selectedTechId) {
                    fetchAndCacheAppointments(window.modalElement.selectedTechId, selectedBookingDate, apiEnv);
                } else {
                    // Clear indicators if no tech selected
                    window.modalElement.selectedTechAppointments = null;
                }
            }
            techList.innerHTML = '';
            
            if (techs && techs.error) {
                console.error("[Wings AI] Tech Fetch Failed:", techs.error);
                techList.innerHTML = `<div class="wings-ai-loading" style="color:#ef4444">⚠️ ${techs.error}</div>`;
                return;
            }
            
            if (!techs) {
                techList.innerHTML = '<div class="wings-ai-loading" style="color:#ef4444">⚠️ Connection Timeout</div>';
                return;
            }

            // API returns Full English Names: Monday, Tuesday, etc. in 'weekly_day_off'
            const dayMapping = {
                'Monday': 'T2', 
                'Tuesday': 'T3', 
                'Wednesday': 'T4',
                'Thursday': 'T5', 
                'Friday': 'T6', 
                'Saturday': 'T7', 
                'Sunday': 'CN'
            };

            if (Array.isArray(techs) && techs.length > 0) {
                techs.forEach(t => {
                    // ... card creation logic ...
                    const card = document.createElement('div');
                    card.className = 'wings-ai-tech-card';
                    // STRICT CHECK: Ensure it's not null and matches
                    // Use t.id based on debug findings
                    let isSelected = false;
                    if (window.modalElement && window.modalElement.selectedTechId !== null && window.modalElement.selectedTechId == t.id) {
                        isSelected = true;
                    }
                    
                    // SMART SUGGESTION: Auto-select if name matches and nothing manually picked yet
                    if (!isSelected && window.modalElement && window.modalElement.suggestedTechName) {
                         const suggested = removeVietnameseAccents(window.modalElement.suggestedTechName).toLowerCase();
                         const techName = removeVietnameseAccents(t.name).toLowerCase();
                         
                         // Check for exact match or inclusion in normalized form
                         if (techName.includes(suggested)) {
                             window.modalElement.selectedTechId = t.id;
                             window.modalElement.selectedTechName = t.name;
                             isSelected = true;
                         }
                    }

                    if (isSelected) {
                        card.classList.add('selected');
                    }
                    
                    let dayTag = "";
                    if (t.weekly_day_off) {
                        const cleanDay = t.weekly_day_off.trim();
                        const code = dayMapping[cleanDay] || cleanDay;
                        dayTag = `<span class="wings-ai-tech-day-tag">[${code}]</span> `;
                    }

                    const subText = t.working_shift 
                        ? `<span class="wings-ai-tech-shift">🕒 ${t.working_shift.start.slice(0,5)} - ${t.working_shift.end.slice(0,5)}</span>`
                        : `<span class="wings-ai-tech-off">OFF Today</span>`;

                    card.innerHTML = `
                        <div class="wings-ai-tech-name">
                             ${dayTag}${t.name}
                        </div>
                        ${subText}
                    `;

                    card.onclick = () => {
                        if (card.classList.contains('selected')) {
                            // Deselect
                            card.classList.remove('selected');
                            if(window.modalElement) {
                                window.modalElement.selectedTechId = null;
                                window.modalElement.selectedTechName = null;
                                // Clear appointments cache
                                window.modalElement.selectedTechAppointments = null;
                                window.modalElement.appointmentsLastFetched = null;
                            }
                            // Reload slots WITHOUT filter (show aggregate)
                            renderBookingData(storeRef, apiEnv);
                        } else {
                            // Select
                            if(window.modalElement) {
                                window.modalElement.querySelectorAll('.wings-ai-tech-card').forEach(c => c.classList.remove('selected'));
                                window.modalElement.selectedTechId = t.id;
                                window.modalElement.selectedTechName = t.name; 
                            }
                            card.classList.add('selected');
                            // renderBookingData will handle the fetch in next cycle
                            renderBookingData(storeRef, apiEnv);
                        }
                    };

                    techList.appendChild(card);
                });
            } else {
                techList.innerHTML = '<div class="wings-ai-loading">No active technicians found for this store.</div>';
            }
        });

        // 2. Fetch Slots for Selected Date
        // Build technicianIds array if a tech is selected
        const techIds = (window.modalElement && window.modalElement.selectedTechId) 
            ? [window.modalElement.selectedTechId] 
            : null;
        
        safeSendMessage({ 
            action: "fetchSlotsOnly", 
            storeId: storeRef, 
            from: selectedBookingDate, 
            to: selectedBookingDate, 
            technicianIds: techIds,
            apiEnv: apiEnv 
        }, (data) => {
            slotsContainer.className = '';
            slotsContainer.innerHTML = ''; 
            
            if (!data) {
                slotsContainer.innerHTML = '<div class="wings-ai-loading" style="color:#ef4444">⚠️ Connection Timeout</div>';
                return;
            }

            if (data && data.error) {
                console.error("[Wings AI] Slots Fetch Failed:", data.error);
                slotsContainer.innerHTML = `<div class="wings-ai-loading" style="color:#ef4444">⚠️ ${data.error}</div>`;
                return;
            }

            if (data && data.dates && data.dates[selectedBookingDate]) {
                const slots = data.dates[selectedBookingDate].slots;
                const sortedTimes = Object.keys(slots).sort();
                
                const morning = [];
                const afternoon = [];
                const evening = [];

                sortedTimes.forEach(time => {
                    const hour = parseInt(time.split(':')[0]);
                    if (hour < 12) morning.push(time);
                    else if (hour < 18) afternoon.push(time);
                    else evening.push(time);
                });

                // Find Nearest Time for Suggestion (e.g. 11:10 -> 11:15)
                let bestMatchTime = null;
                if (window.modalElement && window.modalElement.suggestedTime) {
                    const suggest = window.modalElement.suggestedTime;
                    const suggestMins = (h, m) => parseInt(h) * 60 + parseInt(m);
                    const [sh, sm] = suggest.split(':');
                    const targetMins = suggestMins(sh, sm);
                    
                    let minDiff = Infinity;
                    sortedTimes.forEach(t => {
                        // Only suggest if count > 0 (available)
                        if (slots[t] > 0) {
                            const [th, tm] = t.split(':');
                            const diff = Math.abs(suggestMins(th, tm) - targetMins);
                            if (diff < minDiff) {
                                minDiff = diff;
                                bestMatchTime = t;
                            }
                        }
                    });
                    // Store the result for appendSection to use
                    window.modalElement.suggestedTimeMatch = bestMatchTime;
                }

                const appendSection = (title, times) => {
                    if (times.length === 0) return;
                    
                    const section = document.createElement('div');
                    section.className = 'wings-ai-slot-section';

                    const titleEl = document.createElement('div');
                    titleEl.className = 'wings-ai-slot-section-title';
                    titleEl.innerText = `${title}`;
                    titleEl.innerHTML += ` <span style="font-weight:400; font-size:9px; opacity:0.6; margin-left:4px;">${times[0]} ➝ ${times[times.length-1]}</span>`;
                    section.appendChild(titleEl);

                    const grid = document.createElement('div');
                    grid.className = 'wings-ai-slots-grid';
                    
                    times.forEach(time => {
                        const count = slots[time];
                        const card = document.createElement('div');
                        card.className = 'wings-ai-slot-card';
                        
                        // Smart Highlight: Pulse the BEST MATCH suggested time slot
                        if (window.modalElement && window.modalElement.suggestedTimeMatch === time) {
                             card.classList.add('wings-ai-suggested-slot');
                             // Focus the user's eye
                             setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
                        }
                        
                        let countClass = 'wings-ai-count-neg'; // Default to Red (<= 0)
                        if (count === null || count === undefined || isNaN(count)) {
                            countClass = 'wings-ai-count-zero'; // Grey for systemically blocked
                        } else if (count >= 3) {
                            countClass = 'wings-ai-count-high'; // Green
                        } else if (count > 0) {
                            countClass = 'wings-ai-count-med'; // Yellow/Gold
                        }

                        const isHour = time.endsWith(':00');

                        card.innerHTML = `
                            <div class="wings-ai-slot-time ${isHour ? 'on-hour' : ''}">${time}</div>
                            <div class="wings-ai-slot-count ${countClass}">${count > 0 ? `+${count}` : count}</div>
                        `;

                        // Add appointment indicators if technician is selected
                        if (window.modalElement && window.modalElement.selectedTechAppointments) {
                            const aptData = window.modalElement.selectedTechAppointments;
                            const appointmentsAtTime = (aptData.appointments || []).filter(
                                apt => String(apt.time_booked).substring(0,5) === String(time).substring(0,5)
                            );
                            
                            if (appointmentsAtTime.length > 0) {
                                console.log(`[Wings AI] Rendering ${appointmentsAtTime.length} appointment(s) at ${time}`);
                                const indicator = createAppointmentIndicator(appointmentsAtTime);
                                card.appendChild(indicator);
                            }
                        }

                        // OVERBOOKING PROTOCOL: STRICT RULE - Always interactive
                        card.style.cursor = 'pointer';
                        card.onclick = () => {
                            confirmBooking(time);
                        };

                        grid.appendChild(card);
                    });
                    section.appendChild(grid);
                    slotsContainer.appendChild(section);
                };

                appendSection('MORNING', morning);
                appendSection('AFTERNOON', afternoon);
                appendSection('EVENING', evening);

                if (sortedTimes.length === 0) {
                     slotsContainer.innerHTML = '<div class="wings-ai-loading">No slots configured.</div>';
                }

            } else {
                slotsContainer.innerHTML = '<div class="wings-ai-loading">No availability data.</div>';
            }
        });
    }



    // --- Upload Logic ---
    const uploadZone = modal.querySelector('#wings-ai-upload-zone');
    const fileInput = modal.querySelector('#wings-ai-hidden-input');
    const folderInput = modal.querySelector('#wings-ai-folder-input');
    const browseBtn = modal.querySelector('#wings-ai-browse-btn');
    const folderBtn = modal.querySelector('#wings-ai-folder-btn');

    browseBtn.addEventListener('click', () => fileInput.click());
    folderBtn.addEventListener('click', () => folderInput.click());

    // Handle File Selection
    const handleSelect = (e) => {
        if (e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            // Update count
            const countEl = document.getElementById('wings-ai-upload-count');
            if(countEl) {
                const current = parseInt(countEl.innerText) || 0;
                countEl.innerText = `${current + files.length} Processing`;
            }
            files.forEach(file => handleFile(file));
        }
    };

    fileInput.addEventListener('change', handleSelect);
    folderInput.addEventListener('change', handleSelect);

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#fcc33a';
        uploadZone.style.background = 'rgba(252, 195, 58, 0.05)';
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        uploadZone.style.background = 'rgba(0,0,0,0.2)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        uploadZone.style.background = 'rgba(0,0,0,0.2)';
        if (e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
             // Update count
            const countEl = document.getElementById('wings-ai-upload-count');
            if(countEl) {
                const current = parseInt(countEl.innerText) || 0;
                countEl.innerText = `${current + files.length} Processing`;
            }
            files.forEach(file => handleFile(file));
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG).');
            return;
        }

        // Add visual item to list
        const list = document.getElementById('wings-ai-upload-list');
        const item = document.createElement('div');
        item.className = 'wings-ai-upload-item';
        item.innerHTML = `
             <div class="wings-ai-file-icon" style="background-image: url('${URL.createObjectURL(file)}')"></div>
             <div class="wings-ai-upload-info">
                <div class="wings-ai-upload-name">${file.name}</div>
                <div class="wings-ai-progress-track">
                     <div class="wings-ai-progress-bar" style="width: 0%;"></div>
                </div>
             </div>
             <div class="wings-ai-upload-status">Uploading...</div>
        `;
        list.prepend(item); // Add to top

        // Simulate upload & save
        const progressBar = item.querySelector('.wings-ai-progress-bar');
        const statusText = item.querySelector('.wings-ai-upload-status');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressBar.style.width = progress + '%';
            if (progress >= 100) {
                clearInterval(interval);
                statusText.innerText = 'Completed';
                statusText.classList.add('complete');
                item.classList.add('completed');
                item.insertAdjacentHTML('beforeend', '<div class="wings-ai-check-icon">✔</div>');
                
                // Actual save
                saveImage(file);
            }
        }, 200);
    }

    function saveImage(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
             const newImage = {
                id: Date.now(),
                name: file.name,
                subtitle: "Custom Upload",
                url: e.target.result, // Base64 data
                tags: ["custom", ...modal.querySelector('#wings-ai-upload-tags').value.split(',').map(t => t.trim()).filter(t => t)]
            };

            chrome.storage.local.get(['wings_gallery_images'], (result) => {
                const images = result.wings_gallery_images || [];
                images.unshift(newImage); // Add to beginning
                chrome.storage.local.set({ wings_gallery_images: images }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Storage error:", chrome.runtime.lastError);
                        alert("Error saving image.");
                        return;
                    }
                    console.log('Image saved');
                    
                    // Clear input for next time
                    modal.querySelector('#wings-ai-hidden-input').value = '';
                    modal.querySelector('#wings-ai-upload-tags').value = '';
                    
                    // Auto-switch back to gallery to show result
                    setTimeout(() => {
                        switchView('gallery');
                    }, 500); 
                });
            });
        };
        reader.readAsDataURL(file);
    }
    
    // Updated loadGallery function
    async function loadGallery() {
        const grid = document.getElementById('wings-ai-gallery-grid');
        grid.innerHTML = '';
        
        // Add "Add New Style" card
        const addCard = document.createElement('div');
        addCard.className = 'wings-ai-style-card add-card';
        addCard.innerHTML = `
            <div class="add-icon">+</div>
            <div>Add New Style</div>
        `;
        addCard.onclick = () => switchView('upload');
        
        // --- Drag to Upload ---
        addCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            addCard.style.borderColor = 'var(--wings-gold)';
            addCard.style.background = 'rgba(252, 195, 58, 0.05)';
        });
        addCard.addEventListener('dragleave', () => {
            addCard.style.borderColor = '';
            addCard.style.background = '';
        });
        addCard.addEventListener('drop', (e) => {
            e.preventDefault();
            addCard.style.borderColor = '';
            addCard.style.background = '';
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                switchView('upload');
                // Update processing count manually since we bypassed handleSelect
                const countEl = document.getElementById('wings-ai-upload-count');
                if(countEl) {
                    const current = parseInt(countEl.innerText) || 0;
                    countEl.innerText = `${current + files.length} Processing`;
                }
                files.forEach(file => handleFile(file));
            }
        });

        grid.appendChild(addCard);

        // 1. Fetch Local Custom Images
        const localData = await new Promise(resolve => {
            chrome.storage.local.get(['wings_gallery_images'], (result) => {
                resolve(result.wings_gallery_images || []);
            });
        });

        // 1.5 Fetch Hidden System IDs
        const hiddenIds = await new Promise(resolve => {
            chrome.storage.local.get(['wings_hidden_ids'], (result) => {
                resolve(result.wings_hidden_ids || []);
            });
        });

        // 2. Fetch System Gallery Data
        let systemData = [];
        try {
            const response = await fetch(chrome.runtime.getURL('gallery_data.json'));
            const rawData = await response.json();
            // Filter out hidden system items
            systemData = rawData.filter(item => !hiddenIds.includes(item.id));
        } catch (e) {
            console.error('Failed to load system gallery', e);
        }

        // 3. Merge & Display
        const allItems = [...localData, ...systemData];

        // Filter Logic
        const searchVal = document.getElementById('wings-ai-gallery-search').value.toLowerCase();
        // Get active filter pill
        const activeFilter = document.querySelector('.wings-ai-filter-pill.active')?.dataset.filter || 'all';

        const filteredItems = allItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchVal) || (item.tags && item.tags.some(t => t.toLowerCase().includes(searchVal)));
            const matchesFilter = activeFilter === 'all' || (item.tags && item.tags.includes(activeFilter)) || (item.subtitle && item.subtitle.toLowerCase().includes(activeFilter));
            return matchesSearch && matchesFilter;
        });

        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'wings-ai-style-card';
            
            // Delete Button (Available for ALL cards)
            const deleteBtn = `
            <div class="wings-ai-delete-btn" title="Delete" style="position:absolute; top:8px; right:8px; width:24px; height:24px; background:rgba(255,0,0,0.7); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; opacity:0; transition:opacity 0.2s; z-index:20; cursor: pointer;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>`;

                // Edit Button (Only for custom cards)
                let editBtn = '';
                if (item.tags && item.tags.includes('custom')) {
                    editBtn = `
                    <div class="wings-ai-edit-btn" title="Edit" style="position:absolute; top:8px; right:40px; width:24px; height:24px; background:rgba(252,195,58,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; color:black; opacity:0; transition:opacity 0.2s; z-index:20; cursor: pointer;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>`;
                }

                const displaySubtitle = (item.tags && item.tags.length > 0) 
                    ? item.tags.filter(t => t !== 'custom').join(', ') || item.subtitle
                    : item.subtitle;

                card.innerHTML = `
                    <div class="wings-ai-card-image-wrap">
                        <img src="${item.url}" alt="${item.name}">
                        <div class="wings-ai-card-overlay">
                            <div class="wings-ai-action-icon">
                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                        </div>
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                    <div class="wings-ai-card-content">
                        <div class="wings-ai-card-title">${item.name}</div>
                        <div class="wings-ai-card-subtitle">${displaySubtitle}</div>
                    </div>
                `;
            
            // Handle clicks
            card.onclick = (e) => {
                if (e.target.closest('.wings-ai-delete-btn')) {
                    e.stopPropagation();
                    if(confirm('Delete this style?')) {
                        deleteImage(item);
                    }
                    return;
                }
                if (e.target.closest('.wings-ai-edit-btn')) {
                    e.stopPropagation();
                    editImage(item);
                    return;
                }
                insertImageDirectly(item.url); 
            };
            
            // Hover for buttons
            card.onmouseenter = () => {
                const dBtn = card.querySelector('.wings-ai-delete-btn');
                const eBtn = card.querySelector('.wings-ai-edit-btn');
                if(dBtn) dBtn.style.opacity = '1';
                if(eBtn) eBtn.style.opacity = '1';
            };
            card.onmouseleave = () => {
                const dBtn = card.querySelector('.wings-ai-delete-btn');
                const eBtn = card.querySelector('.wings-ai-edit-btn');
                if(dBtn) dBtn.style.opacity = '0';
                if(eBtn) eBtn.style.opacity = '0';
            };

            grid.appendChild(card);
        });
    }

    function deleteImage(item) {
        // If Custom: Remove from 'wings_gallery_images'
        if (item.tags && item.tags.includes('custom')) {
            chrome.storage.local.get(['wings_gallery_images'], (result) => {
                const images = result.wings_gallery_images || [];
                const newImages = images.filter(img => img.id !== item.id);
                chrome.storage.local.set({ wings_gallery_images: newImages }, () => {
                    loadGallery();
                });
            });
        } else {
            // If System: Add ID to 'wings_hidden_ids'
            chrome.storage.local.get(['wings_hidden_ids'], (result) => {
                const hidden = result.wings_hidden_ids || [];
                if (!hidden.includes(item.id)) {
                    hidden.push(item.id);
                    chrome.storage.local.set({ wings_hidden_ids: hidden }, () => {
                        loadGallery();
                    });
                }
            });
        }
    }

    function editImage(item) {
        const newName = prompt('Enter new name for this style:', item.name);
        if (newName === null) return;
        
        const currentTags = item.tags ? item.tags.filter(t => t !== 'custom').join(', ') : '';
        const newTagsStr = prompt('Enter tags (comma separated):', currentTags);
        if (newTagsStr === null) return;
        
        const newTags = newTagsStr.split(',').map(t => t.trim()).filter(t => t);
        
        // Ensure 'custom' stays
        if (!newTags.includes('custom')) {
            newTags.push('custom');
        }
        
        chrome.storage.local.get(['wings_gallery_images'], (result) => {
            let images = result.wings_gallery_images || [];
            const index = images.findIndex(img => img.id === item.id);
            if (index !== -1) {
                images[index].name = newName;
                images[index].tags = newTags;
                chrome.storage.local.set({ wings_gallery_images: images }, () => {
                    loadGallery();
                });
            }
        });
    }

    // Filter listeners
    document.getElementById('wings-ai-gallery-search').addEventListener('input', loadGallery);
    document.querySelectorAll('.wings-ai-filter-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.wings-ai-filter-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            loadGallery();
        });
    });


}

// 2.1 Dragging Logic
function makeDraggable(el) {
    const handles = el.querySelectorAll('.wings-ai-header, .wings-ai-footer');
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    handles.forEach(handle => {
        handle.onmousedown = dragMouseDown;
        handle.style.cursor = 'grab';
    });

    function dragMouseDown(e) {
        // Skip if clicking resize handle or buttons
        if (e.target.closest('.wings-ai-resize-handle-tl')) return;
        if (e.target.closest('button') || e.target.closest('select')) return;
        if (e.target.closest('input') || e.target.closest('textarea')) return;
        
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        
        handles.forEach(h => h.style.cursor = 'grabbing');
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
        el.style.bottom = 'auto';
        el.style.right = 'auto';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        handles.forEach(h => h.style.cursor = 'grab');
        
        // Save Position
        chrome.storage.sync.set({
            wings_modal_pos: {
                top: el.style.top,
                left: el.style.left
            }
        });
    }
}

// 2.2 Resizing Logic (Top-Left)
function makeResizable(el) {
    const handle = el.querySelector('.wings-ai-resize-handle-tl');
    if (!handle) return;
    
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    handle.onmousedown = resizeMouseDown;

    function resizeMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        startX = e.clientX;
        startY = e.clientY;
        startWidth = el.offsetWidth;
        startHeight = el.offsetHeight;
        startLeft = el.offsetLeft;
        startTop = el.offsetTop;
        
        document.onmouseup = closeResizeElement;
        document.onmousemove = elementResize;
        document.body.style.cursor = 'nw-resize';
    }

    function elementResize(e) {
        const diffX = startX - e.clientX;
        const diffY = startY - e.clientY;
        
        const newWidth = startWidth + diffX;
        const newHeight = startHeight + diffY;
        
        // Min bounds matching styles.css
        if (newWidth >= 400 && newHeight >= 500) {
            el.style.width = newWidth + 'px';
            el.style.height = newHeight + 'px';
            
            // Adjust position because we are resizing from top-left
            el.style.left = (startLeft - diffX) + 'px';
            el.style.top = (startTop - diffY) + 'px';
            el.style.bottom = 'auto';
            el.style.right = 'auto';
        }
    }

    function closeResizeElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.body.style.cursor = 'default';
        
        // Save both Size and Position
        chrome.storage.sync.set({
            wings_modal_size: {
                width: el.style.width,
                height: el.style.height
            },
            wings_modal_pos: {
                top: el.style.top,
                left: el.style.left
            }
        });
    }
}

// 3. Logic to Scrape Chat Context
function getClientName() {
    // Priority selectors for Pancake
    const commonSelectors = [
        '.note-customer-ls .name',
        '#customerCol .name',
        '.customer-name', 
        '.user-full-name', 
        '.conversation-header .name',
        '.profile-info .name',
        '[class*="header"] [class*="name"]',
        '.conversation-center .header-info .name'
    ];
    
    for (const selector of commonSelectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.trim()) return el.innerText.trim();
    }
    return "Client";
}

function getClientPhone() {
    // 1. Try to find in the customer details panel ONLY (the "Thông tin" section)
    // We look for common Pancake selectors for the right sidebar
    const infoPanelSelectors = ['#customerCol', '.customer-details-container', '[class*="CustomerDetails"]'];
    const phoneRegex = /(0[3|5|7|8|9][0-9]{8})/g;
    
    for (const selector of infoPanelSelectors) {
        const panel = document.querySelector(selector);
        if (panel) {
            const matches = panel.innerText.match(phoneRegex);
            if (matches) return matches[0];
        }
    }
    
    // We NO LONGER check document.body because it picks up fake numbers from chat
    return "";
}

function getClientId() {
    // We no longer scrape UID from Pancake because it's irrelevant. 
    // The background script will use the Phone Number to fetch our real system UID.
    return "";
}

function getChatHistory() {
    // 1. Find the main chat area (the big middle part)
    const candidates = Array.from(document.querySelectorAll('div')).filter(el => {
        const style = window.getComputedStyle(el);
        return el.offsetHeight > 300 && el.offsetWidth > 300 && 
               (style.overflowY === 'auto' || style.overflowY === 'scroll' || el.classList.contains('messenger-content') || el.classList.contains('conversation-content'));
    });
    
    // Pick the most likely chat container (usually the one with most child divs)
    let activePanel = candidates.sort((a, b) => b.querySelectorAll('div').length - a.querySelectorAll('div').length)[0];

    if (!activePanel) activePanel = document.body;

    // 2. Find all elements that look like message bubbles
    // Pancake uses many classes: .message-item, .messenger-message-item, .message-content, etc.
    const bubbles = activePanel.querySelectorAll('[class*="message"], [class*="bubble"], [class*="chat-item"]');
    
    let lines = [];
    let lastText = "";

    bubbles.forEach(el => {
        // Skip hidden or empty elements
        if (el.offsetWidth === 0 || el.innerText.trim().length < 1) return;
        
        // Skip common UI noise
        if (el.innerText.includes('AI Suggestion') || el.innerText.includes('my style:')) return;

        // Determine sender (Staff vs Client)
        // Staff messages in Pancake are usually:
        // - Greenish color (#e6f3ff or similar)
        // - Aligned to the right
        // - Has .me, .is-admin, or .admin-avatar
        const style = window.getComputedStyle(el);
        const bgColor = style.backgroundColor;
        const isRightAligned = style.textAlign === 'right' || style.justifyContent === 'flex-end';
        const isStaff = isRightAligned || 
                         el.classList.contains('me') || 
                         el.classList.contains('is-admin') || 
                         el.querySelector('.admin-avatar') ||
                         bgColor.includes('230, 243, 255') || // Light blue/green staff bubble
                         bgColor.includes('204, 255, 204');    // Greenish staff bubble

        const sender = isStaff ? "Staff" : "Client";
        
        // Clean text (remove time, redundant spaces)
        let text = el.innerText.split('\n')[0].trim(); // Take first line of the bubble
        if (text.length < 2) return;
        
        // Prevent duplicate lines from nested divs
        if (text !== lastText) {
            lines.push(`${sender}: ${text}`);
            lastText = text;
        }
    });

    // 3. Final cleaning: Take the last 20 unique lines
    const uniqueLines = lines.filter((line, index) => lines.indexOf(line) === index);
    const result = uniqueLines.slice(-20).join('\n');
    
    return result || "Could not find chat history. Please make sure the chat is visible.";
}

// 4. Main Generator Logic
async function onGenerateClick() {
    const btn = document.getElementById('wings-ai-generate-btn');
    const iconSpan = btn.querySelector('.wings-ai-btn-icon');
    const debugHist = document.getElementById('wings-ai-debug-history');
    
    // UI Loading State
    if (iconSpan) {
        iconSpan.textContent = "💭";
        iconSpan.classList.add('wings-ai-pulsing-icon');
    }
    btn.disabled = true;
    
    const history = getChatHistory();
    const clientName = getClientName();
    const clientPhone = getClientPhone();
    const clientId = getClientId(); // Added this
    const userStyle = ""; // Removed legacy input
    
    // Display Client Info in Header
    document.getElementById('wings-ai-display-name').textContent = clientName;
    document.getElementById('wings-ai-display-phone').textContent = clientPhone;
    
    if (debugHist) debugHist.textContent = history; 
    
    const tones = [];
    if (document.getElementById('tone-vui').checked) tones.push("Vui vẻ (Cheerful)");
    if (document.getElementById('tone-buon').checked) tones.push("Buồn (Sad)");
    if (document.getElementById('tone-tucthanh').checked) tones.push("Tục Thanh (đố/nói tục giảng thanh)");
    if (document.getElementById('tone-dongcam').checked) tones.push("Đồng cảm (Sympathetic)");
    if (document.getElementById('tone-ngan').checked) tones.push("Ngắn gọn (Short)");

    const modelChoice = document.getElementById('wings-ai-model-choice').value;
    const langChoice = document.getElementById('wings-ai-lang-choice').value;

    replyTextarea.value = "Generating response (" + modelChoice + ") for " + clientName + "...";

    try {
        const envEl = window.modalElement?.querySelector('input[name="api_env"]:checked');
        const envChoice = envEl ? envEl.value : 'orb';
        
        // Save env preference
        chrome.storage.sync.set({ apiEnv: envChoice });

        // Send to Background
        const response = await safeSendMessage({
            action: "generateReply",
            history: history,
            clientName: clientName, 
            clientPhone: clientPhone,
            clientId: clientId, // Added this
            apiEnv: envChoice,
            tones: tones,
            userStyle: userStyle,
            modelChoice: modelChoice,
            language: langChoice
        });
        if (response.error) {
            replyTextarea.value = "Error: " + response.error;
        } else {
            replyTextarea.value = response.reply;
            if (window.modalElement) window.modalElement.lastHistoryData = response.historyData;

            // Render Combo Badges
            const badgesContainer = document.getElementById('wings-ai-combo-badges');
            if (badgesContainer && response.historyData) {
                badgesContainer.innerHTML = ''; // Clear previous

                let rawCombos = response.historyData.active_combos_raw;

                // Fallback: Parse from string if raw array is missing (Stale background.js)
                if ((!rawCombos || rawCombos.length === 0) && response.historyData.active_combos) {
                    // String format: "Name (X sessions left), Name 2 (Y sessions left)"
                    const parts = response.historyData.active_combos.split(', ');
                    rawCombos = parts.map(p => {
                        const match = p.match(/^(.*?) \((\d+) sessions left\)$/);
                        if (match) {
                            return {
                                combo_name: match[1],
                                count_new: match[2], // Approximate as we merge new/refill in string
                                count_refill: 0 
                            };
                        }
                        return null;
                    }).filter(x => x);
                }

                if (rawCombos && Array.isArray(rawCombos) && rawCombos.length > 0) {
                     rawCombos.forEach(combo => {
                        let symbol = 'T'; // Default to Top
                        const name = (combo.combo_name || '').toLowerCase();
                        
                        // STRICT RULE: Only "under" triggers U
                        if (name.includes('under')) {
                            symbol = 'U';
                        }
                        
                        // Handle counts (Fallback string has merged count, Raw has split)
                        let countDisplay = "";
                        if (combo.count_new !== undefined && combo.count_refill !== undefined) {
                            countDisplay = `${combo.count_new}|${combo.count_refill}`;
                        } else {
                            // Fallback if only one number usually
                            countDisplay = `${combo.count_new || 0}`; 
                        }

                        const badgeGroup = document.createElement('div');
                        badgeGroup.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 2px;';
                        
                        const circle = document.createElement('div');
                        circle.style.cssText = 'width: 24px; height: 24px; border-radius: 50%; background: #fff; color: #000; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; border: 1px solid #000; line-height: 1;';
                        circle.innerText = symbol;

                        const subtext = document.createElement('span');
                        subtext.style.cssText = 'font-size: 9px; color: #fff; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.5);';
                        subtext.innerText = countDisplay;

                        badgeGroup.appendChild(circle);
                        badgeGroup.appendChild(subtext);
                        badgesContainer.appendChild(badgeGroup);
                    });
                }

                // Toggle Combo Summary Button Visibility
                const comboSummaryBtn = document.getElementById('wings-ai-combo-summary-btn');
                if (comboSummaryBtn) {
                    if (rawCombos && rawCombos.length > 0) {
                        comboSummaryBtn.style.display = 'inline-flex';
                        // No clone/replace needed - Delegated listener handles it
                    } else {
                        comboSummaryBtn.style.display = 'none';
                    }
                }
                        

            }
            
            // Update Diamond Display
            const diaCount = document.getElementById('wings-ai-display-diamonds');
            if (diaCount) {
                if (response.historyData && response.historyData.diamond_balance !== undefined) {
                    diaCount.textContent = response.historyData.diamond_balance;
                } else {
                    diaCount.textContent = "0";
                }
            }

            // Update CS Owner Display
            const ownerContainer = document.getElementById('wings-ai-owner-container');
            const ownerName = document.getElementById('wings-ai-display-owner');
            if (response.historyData && response.historyData.cs_owner) {
                ownerName.textContent = response.historyData.cs_owner.name;
                ownerContainer.style.display = 'flex';
                // Save to modal state for booking dropdown
                if (window.modalElement) window.modalElement.currentCSOwner = response.historyData.cs_owner;
            } else {
                ownerContainer.style.display = 'none';
            }

            if (debugHist && response.liveHistory) {
                debugHist.textContent = response.liveHistory + "\n---\n" + history;
            }
        }
        
        // Restore UI
        if (iconSpan) {
            iconSpan.textContent = "🧠";
            iconSpan.classList.remove('wings-ai-pulsing-icon');
        }
        btn.disabled = false;
        
    } catch (e) {
        console.error("[Wings AI] Generation Error:", e);
        if (iconSpan) {
            iconSpan.textContent = "🧠";
            iconSpan.classList.remove('wings-ai-pulsing-icon');
        }
        btn.disabled = false;
        replyTextarea.value = "Error communicating with extension.";
    }
}
// Helper to Insert Image directly via Paste simulation
async function insertImageDirectly(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], "lash_style.png", { type: blob.type });

        // Find targets - prioritizing contenteditable for paste
        const selectors = [
            'div[contenteditable="true"][role="textbox"]',
            '.messenger-input-area div[contenteditable="true"]',
            '#replyBoxComposer', 
            'textarea#replyBoxComposer'
        ];

        let target = null;
        for (const s of selectors) {
             const found = document.querySelectorAll(s);
             for(const f of found) {
                 if(f.offsetWidth > 0 && f.offsetHeight > 0) {
                     target = f;
                     break;
                 }
             }
             if(target) break;
        }

        if (!target) {
            alert("Could not find chat box. Copying to clipboard.");
            navigator.clipboard.writeText(imageUrl);
            return;
        }

        // Strategy: Simulate PASTE event (often better handled than drop for inline images)
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer
        });

        target.focus();
        target.dispatchEvent(pasteEvent);

        // Notify
        const originalText = document.querySelector('.wings-ai-footer-left').innerText;
        document.querySelector('.wings-ai-footer-left').innerText = "Pasted! �";
        setTimeout(() => {
             if(document.querySelector('.wings-ai-footer-left')) 
                document.querySelector('.wings-ai-footer-left').innerText = originalText;
        }, 2000);

    } catch (err) {
        console.error('Failed to insert image: ', err);
        alert("Auto-paste failed. Copying URL instead.");
        navigator.clipboard.writeText(imageUrl);
    }
}

// 5. Logic to Insert Text
function insertTextIntoChat(text) {
    // 1. Try to find the Pancake/Messenger input box
    // Common selectors for Pancake/Pages.fm/Facebook
    const selectors = [
        '#replyBoxComposer', // Exact ID from devtools screenshot
        'textarea#replyBoxComposer',
        'div[contenteditable="true"][role="textbox"]',
        '.messenger-input-area div[contenteditable="true"]',
        'textarea[placeholder*="Trả lời"]',
        '#chat-input-textarea',
        'div[contenteditable="true"]'
    ];

    let targetInput = null;
    for (const selector of selectors) {
        const els = document.querySelectorAll(selector);
        // Pick the visible one
        for (const el of els) {
            if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                targetInput = el;
                break;
            }
        }
        if (targetInput) break;
    }

    if (targetInput) {
        targetInput.focus();
        
        // Strategy A: document.execCommand (best for contenteditable)
        const Selection = window.getSelection();
        if (targetInput.hasAttribute('contenteditable')) {
            // Clear if needed or just insert
            // For Pancake, usually we want to replace or append. Let's insert at cursor.
            document.execCommand('insertText', false, text);
        } else {
            // Strategy B: Value property for standard textareas
            const start = targetInput.selectionStart;
            const end = targetInput.selectionEnd;
            const val = targetInput.value;
            targetInput.value = val.slice(0, start) + text + val.slice(end);
        }

        // Trigger input events so the 'Send' button enables
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Scroll to bottom of input if needed
        targetInput.scrollTop = targetInput.scrollHeight;
    } else {
        // Last resort: just copy to clipboard and tell the user
        navigator.clipboard.writeText(text);
        alert("Found no message box. The reply has been COPIED to your clipboard! Please paste it into the chat.");
    }
}

function showCorrectionUI() {
    // Remove if already exists
    const existing = document.querySelector('.wings-ai-correction-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'wings-ai-correction-overlay';
    overlay.innerHTML = `
        <div class="wings-ai-correction-header">
            <h3>Correct AI Mistake</h3>
            <button id="wings-ai-close-correction">×</button>
        </div>
        <p style="font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">
            Tell the AI what it got wrong (e.g. price, retention, style).
        </p>
        <textarea id="wings-ai-correction-text" placeholder="Example: Retention is 4 weeks, not 2 weeks. Price for Classic is 550k..."></textarea>
        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
            <button class="wings-ai-btn-primary" id="wings-ai-save-correction" style="padding: 4px 12px; font-size: 12px;">Save Correction</button>
        </div>
    `;

    modalElement.appendChild(overlay);

    overlay.querySelector('#wings-ai-close-correction').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#wings-ai-save-correction').addEventListener('click', () => {
        const text = document.getElementById('wings-ai-correction-text').value;
        if (!text.trim()) return;

        chrome.storage.local.get(['wings_ai_corrections'], (result) => {
            const corrections = result.wings_ai_corrections || [];
            corrections.push({
                text: text.trim(),
                timestamp: Date.now()
            });
            // Keep only last 20
            const truncated = corrections.slice(-20);
            chrome.storage.local.set({ wings_ai_corrections: truncated }, () => {
                const btn = document.getElementById('wings-ai-save-correction');
                btn.innerText = "Saved!";
                btn.style.background = "#10b981";
                setTimeout(() => overlay.remove(), 1000);
            });
        });
    });
}

// Initialize
function initWingsAI() {
    chrome.storage.sync.get(['apiEnv'], (settings) => {
        const env = settings.apiEnv || 'orb';
        
        // We check status for the current env
        safeSendMessage({ action: "checkStaffStatus", apiEnv: env }, (response) => {
            // If not approved on current env, try the other one just in case
            if (!response || response.status !== 'approved') {
                const otherEnv = env === 'live' ? 'orb' : 'live';
                safeSendMessage({ action: "checkStaffStatus", apiEnv: otherEnv }, (secondResp) => {
                    if (secondResp && secondResp.status === 'approved') {
                        proceedWithInit(secondResp.user);
                    } else {
                        console.log("Wings AI: No approved staff session found on either env.");
                    }
                });
            } else {
                proceedWithInit(response.user);
            }
        });
    });

    function proceedWithInit(user) {
        console.log("Wings AI Approved. Initializing v4.0.0...");
        persistentSessionUser = user;
        createFAB();
        createSuggestionModal();
        if (window.modalElement && user) {
            window.modalElement.currentSessionUser = user;
        }

        // ROBUSTNESS: Persistent check for FAB
        setInterval(() => {
            if (!document.querySelector('.wings-ai-fab')) {
                createFAB();
            }
        }, 5000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWingsAI);
} else {
    initWingsAI();
}

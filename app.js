document.addEventListener('DOMContentLoaded', () => {
    const nexusCanvas = document.getElementById('nexus-canvas');
    const nexusSvg = document.getElementById('nexus-svg');
    const nexusCoreBg = document.querySelector('.nexus-core-bg');
    const dataStream = document.getElementById('data-stream');
    const terminalLogs = document.getElementById('terminal-logs');

    // --- VOICE FEEDBACK SYSTEM ---
    const synth = window.speechSynthesis;
    let voice = null;

    function initVoice() {
        const voices = synth.getVoices();
        voice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) || voices[0];
    }
    
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = initVoice;
    }
    initVoice();

    function speak(text) {
        if (!text) return;
        const utter = new SpeechSynthesisUtterance(text);
        utter.voice = voice;
        utter.pitch = 0.8;
        utter.rate = 1.1;
        utter.volume = 0.5;
        synth.speak(utter);
    }

    setTimeout(() => {
        speak("Obsidian Matrix online. 3D Neural system active.");
    }, 1000);

    // --- THREE.JS 3D NEURAL CORE ---
    let scene, camera, renderer, coreMesh, wireframeMesh, pointCloud;
    
    function init3D() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 5;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(600, 600);
        nexusCoreBg.appendChild(renderer.domElement);

        // Central Glowing Orb
        const coreGeo = new THREE.SphereGeometry(1.2, 32, 32);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.15
        });
        coreMesh = new THREE.Mesh(coreGeo, coreMat);
        scene.add(coreMesh);

        // Neural Wireframe
        const wireGeo = new THREE.IcosahedronGeometry(2.1, 2);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        wireframeMesh = new THREE.Mesh(wireGeo, wireMat);
        scene.add(wireframeMesh);

        // Particles (Neural Nodes)
        const partGeo = new THREE.BufferGeometry();
        const partCount = 200;
        const partData = new Float32Array(partCount * 3);
        for (let i = 0; i < partCount * 3; i++) {
            partData[i] = (Math.random() - 0.5) * 6;
        }
        partGeo.setAttribute('position', new THREE.BufferAttribute(partData, 3));
        const partMat = new THREE.PointsMaterial({
            color: 0x00e5ff,
            size: 0.05,
            transparent: true,
            opacity: 0.6
        });
        pointCloud = new THREE.Points(partGeo, partMat);
        scene.add(pointCloud);

        // Lighting
        const light = new THREE.PointLight(0x00e5ff, 1, 10);
        light.position.set(0, 0, 2);
        scene.add(light);
    }

    function animate3D() {
        requestAnimationFrame(animate3D);
        
        coreMesh.rotation.y += 0.005;
        wireframeMesh.rotation.y -= 0.002;
        wireframeMesh.rotation.x += 0.001;
        pointCloud.rotation.y += 0.001;

        // Subtle pulse
        const pulse = Math.sin(Date.now() * 0.002) * 0.05;
        coreMesh.scale.set(1 + pulse, 1 + pulse, 1 + pulse);

        renderer.render(scene, camera);
    }

    init3D();
    animate3D();
    // ----------------------------

    // 1. Generate Agent Nodes with Personas
    const agents = [
        { id: '01', name: 'NEXUS_ALPHA', status: 'ACTIVE', persona: 'sentry' },
        { id: '02', name: 'COBALT_SENTRY', status: 'DEPLO', persona: 'sentry' },
        { id: '03', name: 'NEURAL_LINK', status: 'ACTIVE', persona: 'link' },
        { id: '04', name: 'DATA_MINER', status: 'ACTIVE', persona: 'miner' },
        { id: '05', name: 'CORE_SENTINEL', status: 'DEPLO', persona: 'observer' },
        { id: '06', name: 'ORBIT_OBSERVER', status: 'ACTIVE', persona: 'observer' }
    ];

    const controlMenu = document.createElement('div');
    controlMenu.className = 'control-menu';
    controlMenu.innerHTML = `
        <button class="control-btn analyze">ANALYZE <span>ALT+A</span></button>
        <button class="control-btn deploy">DEPLOY <span>ALT+D</span></button>
        <button class="control-btn reset">RESET <span>ALT+R</span></button>
    `;
    document.body.appendChild(controlMenu);

    const agentNodes = [];
    const neuralLines = [];
    const radius = 210;

    function updateNexus() {
        const centerX = nexusCanvas.offsetWidth / 2;
        const centerY = nexusCanvas.offsetHeight / 2;

        agents.forEach((agent, index) => {
            const angle = (index / agents.length) * Math.PI * 2;
            const x = Math.cos(angle) * radius + centerX;
            const y = Math.sin(angle) * radius + centerY;

            // Update or Create Line
            let line = neuralLines[index];
            if (!line) {
                line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('class', 'neural-line');
                line.id = `line-${agent.id}`;
                nexusSvg.appendChild(line);
                neuralLines[index] = line;
            }
            line.setAttribute('x1', centerX);
            line.setAttribute('y1', centerY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', y);

            // Update or Create Node
            let node = agentNodes[index];
            if (!node) {
                node = document.createElement('div');
                node.className = 'agent-node';
                node.style.position = 'absolute';
                node.innerHTML = `
                    <div class="node-icon ${agent.persona}"></div>
                    <div class="node-label">${agent.name}</div>
                    <div class="node-status-tag">${agent.status}</div>
                `;
                
                node.addEventListener('mouseenter', () => line.classList.add('active'));
                node.addEventListener('mouseleave', () => line.classList.remove('active'));
                node.addEventListener('click', (e) => {
                    e.stopPropagation();
                    controlMenu.style.left = `${e.pageX + 10}px`;
                    controlMenu.style.top = `${e.pageY + 10}px`;
                    controlMenu.classList.add('active');
                    window.activeAgent = agent;
                    speak(`${agent.name} selected.`);
                });
                
                nexusCanvas.appendChild(node);
                agentNodes[index] = node;
            }
            node.style.left = `${x - 30}px`;
            node.style.top = `${y - 30}px`;
        });
    }

    updateNexus();
    window.addEventListener('resize', updateNexus);

    document.addEventListener('click', () => {
        controlMenu.classList.remove('active');
    });

    // --- MODAL SYSTEM ---
    const reportModal = document.getElementById('report-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const summaryText = document.getElementById('report-summary-text');
    const reportDetails = document.getElementById('report-details');
    const modalRefId = document.getElementById('modal-ref-id');
    const modalTimestamp = document.getElementById('modal-timestamp');

    closeModalBtn.addEventListener('click', () => {
        reportModal.classList.remove('active');
    });

    function generateSummary(fullText) {
        const errorCount = (fullText.match(/❌/g) || []).length;
        const successCount = (fullText.match(/✅/g) || []).length;
        const criticalMatch = fullText.match(/CRITICAL ERROR|FAILED|ERROR/gi);
        
        if (errorCount > 0 || criticalMatch) {
            return `System analysis complete. Detected ${errorCount} service failures. Critical intervention may be required for optimal production health.`;
        } else if (successCount > 0) {
            return `All production systems are nominal. Verified ${successCount} critical services. System health is at 100%.`;
        } else {
            return `Analysis sequence complete. All systems report operational status with no anomalies detected.`;
        }
    }

    controlMenu.addEventListener('click', async (e) => {
        const btn = e.target.closest('.control-btn');
        if (!btn) return;
        const action = btn.classList[1].toUpperCase();
        const agentName = window.activeAgent ? window.activeAgent.name : 'SYSTEM';
        
        const log = document.createElement('p');
        log.className = 'log-entry success';
        log.innerHTML = `<span style="color:var(--accent-cyan)">[${agentName}]</span> EXECUTING ${action}...`;
        terminalLogs.prepend(log);

        if (action === 'ANALYZE' && agentName === 'NEXUS_ALPHA') {
            speak(`Initiating deep neural scan of production cron-jobs for ${agentName}.`);
            
            try {
                const response = await fetch('/api/analyze', { method: 'POST' });
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                let fullReportText = '';
                
                // Create a container for the entire report to preserve internal order
                const reportContainer = document.createElement('div');
                reportContainer.className = 'report-container';
                terminalLogs.prepend(reportContainer);
                
                let currentLogEntry = document.createElement('p');
                currentLogEntry.className = 'log-entry system';
                currentLogEntry.innerText = '> ';
                reportContainer.appendChild(currentLogEntry);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    fullReportText += chunk;
                    const lines = chunk.split('\n');
                    lines.forEach((line, i) => {
                        if (line.trim()) {
                            if (i === 0) {
                                currentLogEntry.innerText += line;
                            } else {
                                currentLogEntry = document.createElement('p');
                                currentLogEntry.className = 'log-entry system';
                                currentLogEntry.innerText = `> ${line}`;
                                reportContainer.appendChild(currentLogEntry);
                            }
                        }
                    });
                }
                
                // Finalize and Show Modal
                const reportSummary = generateSummary(fullReportText);
                modalRefId.innerText = Math.random().toString(36).substr(2, 9).toUpperCase();
                modalTimestamp.innerText = new Date().toLocaleString();
                summaryText.innerText = reportSummary;
                reportDetails.innerText = fullReportText;
                
                reportModal.classList.add('active');
                speak(reportSummary);
                
            } catch (err) {
                console.error(err);
                speak("Data link failure. Unable to reach production server.");
            }
        } else {
            speak(`${action} sequence initiated for ${agentName}.`);
        }

        btn.style.borderColor = 'var(--accent-lime)';
        setTimeout(() => btn.style.borderColor = '', 300);
    });

    // 2. Simulate Data Stream
    const metrics = ['NETWORK TRAFFIC', 'LATENCY', 'CPU LOAD', 'MEMORY UTIL', 'IO THRUPUT'];
    function updateStream() {
        dataStream.innerHTML = '';
        metrics.forEach(m => {
            const val = (Math.random() * 100).toFixed(2);
            const unit = m === 'LATENCY' ? 'ms' : (m.includes('LOAD') ? '%' : 'GB/s');
            const item = document.createElement('div');
            item.className = 'stream-item';
            item.innerHTML = `<span>${m}:</span> <span class="val">${val} ${unit}</span>`;
            dataStream.appendChild(item);
        });
    }
    setInterval(updateStream, 2000);
    updateStream();

    // 3. Simulate Terminal Logs
    const logPool = [
        'ENCRYPTING HANDSHAKE...', 'AGENT_04 SYNCHRONIZED', 'CLEANING CACHE BUFFERS',
        'CORE TEMPERATURE NOMINAL', 'INBOUND REQUEST INTERCEPTED', 'ROUTING VIA PROXY_7',
        'OPTIMIZING NEURAL PATHS'
    ];
    function addLog() {
        const entry = document.createElement('p');
        entry.className = 'log-entry system';
        entry.innerText = `> ${logPool[Math.floor(Math.random() * logPool.length)]}`;
        terminalLogs.prepend(entry);
        if (terminalLogs.children.length > 15) terminalLogs.removeChild(terminalLogs.lastChild);
    }
    setInterval(addLog, 3500);
    addLog();

    // 4. Initialize Metric Visualization (Chart.js)
    const chartDefaults = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { display: false },
            y: { 
                grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                ticks: { color: '#666', font: { size: 9, family: 'JetBrains Mono' } }
            }
        },
        elements: { line: { tension: 0.4, borderWidth: 2, fill: true }, point: { radius: 0 } }
    };

    const perfCtx = document.getElementById('performance-chart').getContext('2d');
    const utilCtx = document.getElementById('utilization-chart').getContext('2d');
    const perfChart = new Chart(perfCtx, {
        type: 'line',
        data: { labels: Array(20).fill(''), datasets: [{ borderColor: '#00e5ff', backgroundColor: 'rgba(0, 229, 255, 0.05)', data: Array(20).fill(0).map(() => Math.random() * 100) }] },
        options: chartDefaults
    });
    const utilChart = new Chart(utilCtx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [
                { borderColor: '#ccff00', backgroundColor: 'rgba(204, 255, 0, 0.05)', data: Array(20).fill(0).map(() => Math.random() * 100) },
                { borderColor: '#2962ff', backgroundColor: 'rgba(41, 98, 255, 0.05)', data: Array(20).fill(0).map(() => Math.random() * 100) }
            ]
        },
        options: chartDefaults
    });

    function updateCharts() {
        [perfChart, utilChart].forEach(chart => {
            chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
                dataset.data.push(Math.random() * 100);
            });
            chart.update('none');
        });
    }
    setInterval(updateCharts, 1000);
});

// Dynamic Node CSS injection
const style = document.createElement('style');
style.textContent = `
    .agent-node { transition: transform 0.3s ease; cursor: pointer; text-align: center; z-index: 5; }
    .node-label { font-size: 9px; color: var(--text-primary); white-space: nowrap; margin-top: 5px; text-shadow: 0 0 10px #000; }
    .node-status-tag { 
        font-size: 7px; color: var(--accent-lime); background: rgba(0, 0, 0, 0.6);
        padding: 2px 5px; border-radius: 4px; display: inline-block; margin-top: 2px;
        border: 1px solid rgba(204,255,0,0.3);
    }
`;
document.head.appendChild(style);

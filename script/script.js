/* --- VARIABLES --- */
let zIndexCounter = 100;
const desktop = document.getElementById('desktop');
const taskList = document.getElementById('task-list');
const startMenu = document.getElementById('start-menu');
const startBtn = document.getElementById('start-btn');
const ctxMenu = document.getElementById('context-menu');
let activeContextTask = null;
let deletedIcons = [];

/* --- SOUND SYSTEM --- */
const sounds = {
    startup: document.getElementById('snd-startup'),
    shutdown: document.getElementById('snd-shutdown'),
    click: document.getElementById('snd-click'),
    chord: document.getElementById('snd-chord'),
    recycle: document.getElementById('snd-recycle')
};

function playSound(name) {
    if(sounds[name]) {
        // Clone node to allow overlapping sounds (rapid clicking)
        const audio = sounds[name].cloneNode();
        audio.volume = 0.5; // Adjust volume if needed
        audio.play().catch(e => console.log("Audio play blocked (interaction required)"));
    }
}

/* --- GLOBAL CLICK SOUND --- */
document.addEventListener('mousedown', (e) => {
    // Play click sound on buttons, icons, and menu items
    if (e.target.closest('.win95-btn') || 
        e.target.closest('.desktop-icon') || 
        e.target.closest('.start-item') || 
        e.target.closest('.task-item') ||
        e.target.closest('.title-btn')) {
        playSound('click');
    }
});

// ADDED: Double click sound for opening icons
document.addEventListener('dblclick', (e) => {
    if (e.target.closest('.desktop-icon')) {
        playSound('click');
    }
});

/* --- BOOT SEQUENCE --- */
window.onload = () => {
    let mem = 0; const memEl = document.getElementById('mem-test');
    const interval = setInterval(() => {
        mem += 4096; memEl.innerText = mem;
        if(mem >= 64000) { clearInterval(interval); triggerBootSteps(); }
    }, 10);
};

function triggerBootSteps() {
    setTimeout(() => document.querySelectorAll('.hidden-delay-1').forEach(el => el.style.opacity = 1), 400);
    setTimeout(() => document.querySelectorAll('.hidden-delay-2').forEach(el => el.style.opacity = 1), 1000);
    setTimeout(() => document.querySelectorAll('.hidden-delay-3').forEach(el => el.style.opacity = 1), 1500);
    setTimeout(() => {
        document.getElementById('boot-screen').style.display = 'none';
        document.getElementById('splash-screen').style.display = 'flex';
        
        // Try to play startup sound (might be blocked by browser until interaction)
        playSound('startup');

        // Simulate splash loading for 3 seconds
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            initClock(); 
            initDesktopIcons(); 
        }, 3000);
    }, 2500);
}

function initClock() {
    const updateTime = () => {
        const d = new Date();
        document.getElementById('clock').innerText = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    };
    updateTime();
    setInterval(updateTime, 1000);
}

/* --- DESKTOP ICONS GRID --- */
const GRID_X = 80; const GRID_Y = 90; const MARGIN_TOP = 10; const MARGIN_LEFT = 10;
function initDesktopIcons() {
    const icons = document.querySelectorAll('.desktop-icon');
    let row = 0;
    let col = 0;
    const maxRows = Math.floor((window.innerHeight - 40) / GRID_Y);

    icons.forEach(icon => {
        icon.style.top = (MARGIN_TOP + (row * GRID_Y)) + 'px';
        icon.style.left = (MARGIN_LEFT + (col * GRID_X)) + 'px';
        row++;
        if (row >= maxRows) { row = 0; col++; }
    });
}

function snapIconToGrid(icon) {
    const l = parseInt(icon.style.left||0), t = parseInt(icon.style.top||0);
    icon.style.left = (Math.max(0, Math.round(l/GRID_X)*GRID_X+MARGIN_LEFT)) + 'px';
    icon.style.top = (Math.max(0, Math.round(t/GRID_Y)*GRID_Y+MARGIN_TOP)) + 'px';
}

/* --- DRAG & DROP LOGIC (Unified Mouse & Touch) --- */
let isDraggingIcon = false, draggedIconEl = null, iconDragOffset = {x:0,y:0};

function handleStartIconDrag(e, icon) {
    e.stopPropagation();
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    icon.classList.add('selected');
    draggedIconEl = icon;
    isDraggingIcon = true;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = icon.getBoundingClientRect();
    iconDragOffset.x = clientX - rect.left;
    iconDragOffset.y = clientY - rect.top;
    icon.style.zIndex = 999;
}

document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('mousedown', (e) => handleStartIconDrag(e, icon));
    icon.addEventListener('touchstart', (e) => handleStartIconDrag(e, icon), {passive: false});
});

/* --- GLOBAL MOVE HANDLER --- */
function handleGlobalMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if(isDraggingIcon && draggedIconEl) {
        if(e.preventDefault) e.preventDefault(); // Prevent scroll on touch
        draggedIconEl.style.left = (clientX - iconDragOffset.x) + 'px';
        draggedIconEl.style.top = (clientY - iconDragOffset.y) + 'px';
    }
    
    if(isDraggingWindow && draggedWindow) {
        if(e.preventDefault) e.preventDefault();
        let newX = clientX - dragOffset.x;
        let newY = clientY - dragOffset.y;
        
        // Fix 2: Constrain to screen top
        newY = Math.max(0, newY);
        // Constrain to left/right bounds loosely
        newX = Math.max(-draggedWindow.offsetWidth + 50, Math.min(window.innerWidth - 50, newX));
        
        draggedWindow.style.left = newX + 'px';
        draggedWindow.style.top = newY + 'px';
    }
    
    if(isResizing && draggedWindow) {
        if(e.preventDefault) e.preventDefault();
        // Fix 3: Min Size Constraints
        const newWidth = Math.max(200, clientX - draggedWindow.offsetLeft);
        const newHeight = Math.max(150, clientY - draggedWindow.offsetTop);
        
        draggedWindow.style.width = newWidth + 'px';
        draggedWindow.style.height = newHeight + 'px';
    }
    
    if(painting) drawPaint(e);
}

document.addEventListener('mousemove', handleGlobalMove);
document.addEventListener('touchmove', handleGlobalMove, {passive: false});

/* --- GLOBAL UP HANDLER --- */
function handleGlobalUp() {
    if(isDraggingIcon && draggedIconEl) {
        const bin = document.getElementById('icon-recycle');
        const binRect = bin.getBoundingClientRect();
        const iconRect = draggedIconEl.getBoundingClientRect();
        if (draggedIconEl.id !== 'icon-recycle' && 
            iconRect.left < binRect.right && iconRect.right > binRect.left &&
            iconRect.top < binRect.bottom && iconRect.bottom > binRect.top) {
            deleteIcon(draggedIconEl);
        } else {
            snapIconToGrid(draggedIconEl);
        }
        draggedIconEl.style.zIndex = '';
    }
    isDraggingIcon = false; draggedIconEl = null;
    isDraggingWindow = false; isResizing = false; draggedWindow = null;
    if(painting) painting = false;
}

document.addEventListener('mouseup', handleGlobalUp);
document.addEventListener('touchend', handleGlobalUp);

desktop.addEventListener('mousedown', (e) => {
    if(e.target === desktop) {
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        if(startMenu.style.display === 'flex') toggleStartMenu();
    }
});

/* --- RECYCLE BIN --- */
function deleteIcon(icon) {
    icon.style.display = 'none';
    playSound('recycle'); // Play recycle sound
    if(!deletedIcons.includes(icon)) deletedIcons.push(icon);
    document.getElementById('recycle-img').style.backgroundImage = "url('https://win98icons.alexmeub.com/icons/png/recycle_bin_full-4.png')";
    refreshRecycleWin();
}
function restoreAllIcons() {
    deletedIcons.forEach(icon => icon.style.display = 'flex');
    deletedIcons = [];
    playSound('recycle'); // Play recycle sound
    document.getElementById('recycle-img').style.backgroundImage = "url('https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-4.png')";
    refreshRecycleWin();
}
function emptyRecycle() {
    if(deletedIcons.length === 0) return;
    if(confirm("Are you sure you want to permanently delete these items?")) {
        deletedIcons = [];
        playSound('recycle'); // Play recycle sound
        document.getElementById('recycle-img').style.backgroundImage = "url('https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-4.png')";
        refreshRecycleWin();
    }
}
function refreshRecycleWin() {
    // Refresh any open recycle bins
    document.querySelectorAll('.window').forEach(win => {
        if(win.dataset.appType === 'recycle') updateRecycleGrid(win);
    });
}
function updateRecycleGrid(win) {
    const grid = win.querySelector('.recycle-grid');
    if(!grid) return;
    grid.innerHTML = '';
    if(deletedIcons.length === 0) {
        grid.innerHTML = '<p style="padding:10px; width:100%; text-align:center;">The Recycle Bin is empty.</p>';
    } else {
        deletedIcons.forEach(icon => {
            const item = document.createElement('div');
            item.className = 'project-file';
            item.innerHTML = icon.innerHTML; 
            grid.appendChild(item);
        });
    }
}

/* --- WINDOW SYSTEM (Multi-Tasking Fixed) --- */
function openWindow(id) {
    const template = document.getElementById(`tpl-${id}`);
    if(!template) return;

    // Fix 6: Unique ID for multi-tasking
    const uid = id + '-' + Date.now();
    const win = document.createElement('div');
    win.id = `win-${uid}`;
    win.className = 'window bevel-outset';
    win.dataset.appType = id; // Identify app type for refreshing logic
    
    // Set initial size if needed to avoid overflow
    if (id === 'resume') {
        win.style.width = '600px'; 
        win.style.height = '500px'; 
    }
    // FIX: Set proper Paint window size
    if (id === 'paint') {
        win.style.width = '800px'; 
        win.style.height = '600px'; 
    }

    const offset = (document.querySelectorAll('.window').length % 10) * 20;
    win.style.left = (50 + offset) + 'px';
    win.style.top = (30 + offset) + 'px';
    win.style.zIndex = ++zIndexCounter;

    const titles = {
        'computer':'My Computer', 'projects':'My Projects', 'skills':'Skills',
        'paint':'Vala Paint', 'resume':'Resume - Aryan Vala', 'contact':'New Message',
        'internet':'Aryan Explorer', 'recycle':'Recycle Bin', 'notepad':'Notepad',
        'calc':'Calculator', 'msdos':'MS-DOS Prompt', 'run':'Run', 'control':'Control Panel', 'help':'Help',
        'doom':'DOOM'
    };
    
    // Icon Mappings
    const iconClass = {
        'paint':'ico-paint',
        'computer':'ico-computer',
        'notepad':'ico-notepad',
        'calc':'ico-calc',
        'msdos':'ico-msdos',
        'internet':'ico-internet',
        'recycle':'ico-recycle',
        'resume':'ico-text',
        'contact':'ico-mail',
        'projects':'ico-projects',
        'skills':'ico-folder',
        'doom':'ico-doom',
        'control':'ico-control',
        'help':'ico-help',
        'run':'ico-run'
    }[id] || 'ico-prog';

    win.innerHTML = `
        <div class="title-bar" onmousedown="startWindowDrag(event, '${win.id}')" ontouchstart="startWindowDrag(event, '${win.id}')">
            <div class="title-text" style="display:flex;align-items:center;">
                <div class="icon-img ${iconClass}" style="width:16px;height:16px;margin-right:5px;margin-bottom:0;"></div>
                ${titles[id] || 'Program'}
            </div>
            <div class="title-bar-controls">
                <div class="title-btn" onclick="minimizeWindow('${win.id}')">_</div>
                <div class="title-btn" onclick="maximizeWindow('${win.id}')">□</div>
                <div class="title-btn" onclick="closeWindow('${win.id}')">X</div>
            </div>
        </div>
        <div class="window-body" onmousedown="bringToFront(document.getElementById('${win.id}'))" ontouchstart="bringToFront(document.getElementById('${win.id}'))">
            <!-- For Paint, we inject the iframe directly, bypassing template content -->
            ${id === 'paint' ? '<iframe src="https://paint.js.org/" style="width:100%; height:100%; border:none;"></iframe>' : template.innerHTML}
        </div>
        <div class="resize-handle" onmousedown="startResize(event, '${win.id}')" ontouchstart="startResize(event, '${win.id}')"></div>
    `;
    desktop.appendChild(win);
    addToTaskbar(uid, titles[id], iconClass);
    
    // Scoped Initialization
    // Note: initPaint is removed because we use the iframe now
    if(id==='notepad') initNotepad(win);
    if(id==='msdos') initDOS(win);
    if(id==='computer') initComputer(win);
    if(id==='recycle') updateRecycleGrid(win);
    if(id==='internet') initInternet(win);
    if(id==='doom') initDoom(win);
    if(id==='projects') initProjects(win);
    if(id==='resume') initResume(win);

    startMenu.style.display='none'; startBtn.classList.remove('active');
}

function closeWindow(winId) { 
    const win = document.getElementById(winId);
    if(win) win.remove();
    const task = document.getElementById(`task-${winId}`);
    if(task) task.remove();
}
function minimizeWindow(winId) { 
    document.getElementById(winId).style.display='none'; 
    document.getElementById(`task-${winId}`).classList.remove('active'); 
}

// Fix 1: Maximize with Memory
function maximizeWindow(winId) { 
    const win = document.getElementById(winId);
    if(win.dataset.isMaximized === "true") {
        // Restore
        win.style.width = win.dataset.prevWidth;
        win.style.height = win.dataset.prevHeight;
        win.style.top = win.dataset.prevTop;
        win.style.left = win.dataset.prevLeft;
        win.dataset.isMaximized = "false";
    } else {
        // Maximize
        win.dataset.prevWidth = win.style.width || "450px";
        win.dataset.prevHeight = win.style.height || "auto";
        win.dataset.prevTop = win.style.top;
        win.dataset.prevLeft = win.style.left;
        
        win.style.width='100%'; 
        win.style.height='calc(100% - 28px)'; 
        win.style.top='0'; 
        win.style.left='0'; 
        win.dataset.isMaximized = "true";
    }
    bringToFront(win);
}

function bringToFront(win) {
    if(!win) return;
    document.querySelectorAll('.window').forEach(w => w.classList.add('inactive'));
    win.classList.remove('inactive'); 
    win.style.display='flex'; 
    win.style.zIndex=++zIndexCounter;
    
    document.querySelectorAll('.task-item').forEach(t => t.classList.remove('active'));
    const task = document.getElementById(`task-${win.id}`);
    if(task) task.classList.add('active');
}

function addToTaskbar(uid, title, iconClass) {
    const item = document.createElement('div');
    item.id = `task-win-${uid}`; 
    item.className = 'task-item active bevel-outset';
    item.innerHTML = `<div class="icon-img ${iconClass}" style="width:16px;height:16px;margin-right:5px;margin-bottom:0;"></div> ${title}`;
    item.onclick = () => {
        const win = document.getElementById(`win-${uid}`);
        if(win.style.display==='none' || win.classList.contains('inactive')) bringToFront(win);
        else minimizeWindow(`win-${uid}`);
    };
    item.oncontextmenu = (e) => {
        e.preventDefault(); activeContextTask = `win-${uid}`;
        ctxMenu.style.display='block'; ctxMenu.style.left=e.clientX+'px'; ctxMenu.style.top=(e.clientY-ctxMenu.offsetHeight)+'px';
    };
    taskList.appendChild(item);
}

let isDraggingWindow=false, isResizing=false, draggedWindow=null, dragOffset={x:0,y:0};
function startWindowDrag(e, winId) {
    if(e.target.closest('.title-btn')) return;
    isDraggingWindow=true; draggedWindow=document.getElementById(winId);
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    dragOffset.x=clientX - draggedWindow.offsetLeft; 
    dragOffset.y=clientY - draggedWindow.offsetTop;
    bringToFront(draggedWindow);
}
function startResize(e, winId) { 
    if(e.stopPropagation) e.stopPropagation(); 
    isResizing=true; draggedWindow=document.getElementById(winId); bringToFront(draggedWindow); 
}

/* --- APP: CALCULATOR (Scoped) --- */
let calcState = { val:'0', opStr:'' }; // Simple object, but needs scoping per window really. 
// For simplicity in this prompt, we attach state to the window DOM element
function calcNum(btn, n) { 
    const win = btn.closest('.window');
    let val = win.dataset.calcVal || '0';
    val = val==='0' ? String(n) : val+n; 
    win.dataset.calcVal = val;
    win.querySelector('.calc-display').value = val;
}
function calcOp(btn, op) { 
    const win = btn.closest('.window');
    let val = win.dataset.calcVal || '0';
    win.dataset.calcOpStr = val + op; 
    win.dataset.calcVal = '0';
    win.querySelector('.calc-display').value = '0';
}
function calcEq(btn) { 
    const win = btn.closest('.window');
    try { 
        // Fix 6: Precision Logic
        let res = eval((win.dataset.calcOpStr||'') + (win.dataset.calcVal||'0')); 
        res = parseFloat(res.toPrecision(12)); // Fix floating point errors
        win.dataset.calcVal = String(res);
    } catch(e){ win.dataset.calcVal='Error'; } 
    win.querySelector('.calc-display').value = win.dataset.calcVal;
}
function calcClear(btn) { 
    const win = btn.closest('.window');
    win.dataset.calcVal='0'; win.dataset.calcOpStr=''; 
    win.querySelector('.calc-display').value = '0'; 
}

/* --- APP: NOTEPAD --- */
function initNotepad(win) {
    const area = win.querySelector('.notepad-area');
    // Unique storage key based on Window ID would be ideal, but for now shared storage
    area.value = localStorage.getItem('notepad_data') || "Welcome to ValaNuOS.\nType here to save...";
    area.addEventListener('input', () => localStorage.setItem('notepad_data', area.value));
}

/* --- APP: DOOM (ARCHIVE.ORG EMBED FIX) --- */
function initDoom(win) {
    const container = win.querySelector('.dosbox-wrapper');
    // Using Archive.org embed - Extremely stable and supports HTTPS
    container.innerHTML = `
        <div style="width:100%; height:100%; background:#000;">
            <iframe 
                src="https://archive.org/embed/doom-play" 
                style="width:100%; height:100%; border:none;" 
                allowfullscreen 
                webkitallowfullscreen="true" 
                mozallowfullscreen="true"
            ></iframe>
        </div>
    `;
}

/* --- APP: MS-DOS --- */
let dosPath = "C:\\WINDOWS";
function initDOS(win) {
    const input = win.querySelector('.dos-input');
    const history = win.querySelector('.dos-history');
    input.addEventListener('keydown', (e) => {
        if(e.key==='Enter') {
            const cmd = input.value.trim();
            history.innerHTML += `<div>${dosPath}> ${cmd}</div>`;
            const args = cmd.toLowerCase().split(' ');
            if(args[0]==='help') history.innerHTML += `<div>COMMANDS: HELP, DIR, VER, CLS, CD, ECHO, EXIT</div>`;
            else if(args[0]==='ver') history.innerHTML += `<div>ValaNuOS [Version 4.00.950]</div>`;
            else if(args[0]==='cls') history.innerHTML = '';
            else if(args[0]==='echo') history.innerHTML += `<div>${cmd.substring(5)}</div>`;
            else if(args[0]==='cd') { 
                if(args[1] === '..') dosPath = "C:\\"; else if(args[1]) dosPath += "\\" + args[1]; 
                win.querySelector('.dos-prompt').innerText = dosPath + ">"; 
            }
            else if(args[0]==='dir') history.innerHTML += `<div>Directory of ${dosPath}<br> . <DIR><br> .. <DIR><br> SYSTEM <DIR><br> 3 file(s)</div>`;
            else if(args[0]==='exit') closeWindow(win.id);
            else if(cmd) history.innerHTML += `<div>Bad command or file name</div>`;
            input.value=''; win.querySelector('.window-content-inner').scrollTop = win.querySelector('.window-content-inner').scrollHeight;
        }
    });
}

/* --- APP: INTERNET EXPLORER --- */
function initInternet(win) {
    const urlInput = win.querySelector('.url-input');
    const goBtn = win.querySelector('.go-btn');
    const viewport = win.querySelector('.ie-viewport'); 
    const toolbar = win.querySelector('.address-bar');

    if (!toolbar.querySelector('.retro-check')) {
        const label = document.createElement('label');
        label.className = 'retro-check';
        label.style.marginLeft = '10px'; label.style.fontSize = '11px'; label.style.display = 'flex'; label.style.alignItems = 'center';
        
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = true;
        chk.style.marginRight = '4px';
        
        const span = document.createElement('span');
        span.innerText = "Retro Mode";
        
        label.appendChild(chk); label.appendChild(span); toolbar.appendChild(label);

        const extBtn = document.createElement('button');
        extBtn.className = 'win95-btn';
        extBtn.innerHTML = '&#x2197;'; 
        extBtn.title = "Open in New Tab";
        extBtn.style.marginLeft = '5px';
        extBtn.onclick = () => window.open(urlInput.value.startsWith('http')?urlInput.value:'https://'+urlInput.value, '_blank');
        toolbar.appendChild(extBtn);
    }

    const loadUrl = async () => {
        let url = urlInput.value.trim();
        if (!url.includes('.') && !url.startsWith('http')) {
            url = 'https://www.bing.com/search?q=' + encodeURIComponent(url);
        } else if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        urlInput.value = url;
        
        const useRetro = toolbar.querySelector('input[type="checkbox"]').checked;

        if (useRetro) {
            viewport.innerHTML = `<div style="padding:20px; font-family:'Segoe UI'; text-align:center;">
                <p><strong>Connecting...</strong></p>
                <div class="progress-bar-win bevel-inset" style="width:200px; height:20px; margin:0 auto; position:relative;">
                    <div style="background:#000080; width:50%; height:100%;"></div>
                </div>
            </div>`;
            
            try {
                const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
                if(!res.ok) throw new Error("Connection failed");
                let html = await res.text();
                
                html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
                html = html.replace(/X-Frame-Options/gim, ""); 
                
                const baseTag = `<base href="${url}" target="_self">`;
                if(html.includes('<head>')) html = html.replace('<head>', '<head>' + baseTag);
                else html = baseTag + html;

                const frame = document.createElement('iframe');
                frame.style.cssText = "width:100%; height:100%; border:none; background:#fff;";
                frame.sandbox = "allow-same-origin allow-forms allow-popups";
                viewport.innerHTML = '';
                viewport.appendChild(frame);
                
                const doc = frame.contentWindow.document;
                doc.open(); doc.write(html); doc.close();

                frame.contentWindow.document.addEventListener('click', function(e) {
                    const link = e.target.closest('a');
                    if(link && link.href) {
                        e.preventDefault();
                        window.parent.postMessage({action: 'loadUrl', url: link.href}, '*');
                    }
                });

            } catch(e) {
                viewport.innerHTML = `<div style="padding:20px; color:red;"><p>Error: ${e.message}</p></div>`;
            }
        } else {
            viewport.innerHTML = `<iframe src="${url}" style="width:100%;height:100%;border:none;background:#fff;"></iframe>`;
        }
    };
    
    // Add event listener only once per window load
    if(!window.messageListenerAdded) {
        window.addEventListener('message', (event) => {
            if(event.data && event.data.action === 'loadUrl') {
                // Find the active internet window
                const activeWin = document.querySelector('.window[data-app-type="internet"]:not(.inactive)');
                if(activeWin) {
                    activeWin.querySelector('.url-input').value = event.data.url;
                    // Trigger click on go button of that window
                    activeWin.querySelector('.go-btn').click(); 
                }
            }
        });
        window.messageListenerAdded = true;
    }

    goBtn.onclick = (e) => { e.stopPropagation(); loadUrl(); };
    urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadUrl(); });
}

/* --- APP: COMPUTER --- */
function initComputer(win) {
    const content = win.querySelector('.comp-content');
    const address = win.querySelector('.comp-address');

    // Define function on the window element to avoid global scope pollution/conflicts
    win.renderDriveC = () => {
        address.innerText = "Address: C:\\";
        content.innerHTML = `
             <div class="project-file" onclick="this.closest('.window').initComputer()"><div class="icon-img ico-folder"></div><div class="project-name">[..]</div></div>
             <div class="project-file"><div class="icon-img ico-folder-prog"></div><div class="project-name">Windows</div></div>
             <div class="project-file"><div class="icon-img ico-folder-prog"></div><div class="project-name">Program Files</div></div>
        `;
    };
    win.initComputer = () => {
         address.innerText = "Address: My Computer";
         content.innerHTML = `
            <div class="project-file" onclick="this.closest('.window').renderDriveC()"><div class="icon-img" style="background-image:url('https://win98icons.alexmeub.com/icons/png/hard_disk_drive-4.png')"></div><div class="project-name">(C:)</div></div>
            <div class="project-file"><div class="icon-img" style="background-image:url('https://win98icons.alexmeub.com/icons/png/cd_drive-4.png')"></div><div class="project-name">(D:)</div></div>
            <div class="project-file" onclick="openWindow('control')"><div class="icon-img ico-settings"></div><div class="project-name">Control Panel</div></div>
        `;
    };
    // Init
    win.initComputer();
}

/* --- APP: PROJECTS --- */
function initProjects(win) {
    // Target elements by their data-link attribute
    const showcaseFile = win.querySelector('.project-file[data-link="showcase"]');
    const oldPortfolioFile = win.querySelector('.project-file[data-link="old-portfolio"]');
    const githubFile = win.querySelector('.project-file[data-link="github"]');
    const linkedinFile = win.querySelector('.project-file[data-link="linkedin"]');

    if (showcaseFile) {
        showcaseFile.onclick = () => window.open('https://projects.aryanvala.online', '_blank');
    }
    if (oldPortfolioFile) {
        oldPortfolioFile.onclick = () => window.open('https://oldportfolio.aryanvala.online', '_blank');
    }
    if (githubFile) {
        githubFile.onclick = () => window.open('https://github.com/devbyaryanvala', '_blank');
    }
    if (linkedinFile) {
        linkedinFile.onclick = () => window.open('https://www.linkedin.com/in/aryan-vala-ba62a1212/', '_blank');
    }
}

/* --- APP: RESUME (DOWNLOAD FIX) --- */
function initResume(win) {
    // Add logic to handle download button click
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'win95-btn';
    downloadBtn.innerText = 'Download PDF';
    downloadBtn.style.marginTop = '10px';
    downloadBtn.onclick = downloadResume;
    
    // Find the print button container and append the download button
    const centerFlex = win.querySelector('.center-flex');
    if (centerFlex) {
        centerFlex.appendChild(downloadBtn);
    }
}

function downloadResume() {
    const link = document.createElement('a');
    link.href = 'Aryan-Vala-CV.pdf'; // Assuming the file is in the same directory
    link.download = 'Aryan-Vala-CV.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleStartMenu(e) {
    if(e) e.stopPropagation();
    if(startMenu.style.display==='flex') { startMenu.style.display='none'; startBtn.classList.remove('active'); } 
    else { startMenu.style.display='flex'; startBtn.classList.add('active'); startMenu.style.zIndex = 20000; }
}
document.addEventListener('click', (e) => {
    if(!startMenu.contains(e.target) && !startBtn.contains(e.target)) { startMenu.style.display='none'; startBtn.classList.remove('active'); }
    if(!e.target.closest('#context-menu')) { ctxMenu.style.display = 'none'; }
});
function ctxAction(a) {
    if(!activeContextTask) return;
    if(a==='close') closeWindow(activeContextTask.replace('win-',''));
    if(a==='minimize') minimizeWindow(activeContextTask);
    if(a==='restore') bringToFront(document.getElementById(activeContextTask));
    ctxMenu.style.display='none';
}
function performShutdown() {
    desktop.style.display='none'; document.getElementById('taskbar').style.display='none';
    document.getElementById('shutdown-screen').style.display='flex';
    playSound('shutdown');
}
function sendEmail() {
    const subject = document.getElementById('email-subject').value;
    const body = document.getElementById('email-body').value;
    window.location.href = `mailto:aryanvala66@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
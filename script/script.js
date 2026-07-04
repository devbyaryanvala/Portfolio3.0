/* --- VARIABLES --- */
let zIndexCounter = 100;
const desktop = document.getElementById('desktop');
const taskList = document.getElementById('task-list');
const startMenu = document.getElementById('start-menu');
const startBtn = document.getElementById('start-btn');
const ctxMenu = document.getElementById('context-menu');
const desktopCtxMenu = document.getElementById('desktop-context-menu');
let activeContextTask = null;
let deletedIcons = [];
let painting = false;

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
            // Show Clippy immediately on boot
            document.getElementById('clippy-container').style.display = 'flex';
            playSound('chord');
            
            // Auto-show bubble after a brief delay
            setTimeout(() => {
                document.querySelector('.clippy-bubble').style.display = 'block';
            }, 1000);

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
    
    if(painting && typeof drawPaint === 'function') drawPaint(e);
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
        'doom':'DOOM', 'about':'About', 'minesweeper':'Minesweeper', 'mediaplayer':'Media Player',
        'display':'Display Properties'
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
    if(id==='projects') initProjects(win);
    if(id==='doom') initDoom(win);
    if(id==='run') initRun(win);
    if(id==='minesweeper') initMinesweeper(win);
    if(id==='mediaplayer') initMediaPlayer(win);
    if(id==='recycle') updateRecycleGrid(win);
    if(id==='internet') initInternet(win);
    if(id==='doom') initDoom(win);
    if(id==='projects') initProjects(win);
    if(id==='run') initRun(win);

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
            
            // BSOD Easter Egg Triggers
            if (['crash', 'format', 'bsod'].includes(args[0])) {
                triggerBSOD();
                return;
            }
            
            if(args[0]==='help') history.innerHTML += `<div>COMMANDS: HELP, DIR, VER, CLS, CD, ECHO, EXIT</div>`;
            else if(args[0]==='ver') history.innerHTML += `<div>ValaNuOS [Version 4.00.950]</div>`;
            else if(args[0]==='cls') history.innerHTML = '';
            else if(args[0]==='echo') history.innerHTML += `<div>${cmd.substring(5)}</div>`;
            else if(args[0]==='cd') { 
                if(args[1] === '..') dosPath = "C:\\"; else if(args[1]) dosPath += "\\" + args[1]; 
                win.querySelector('.dos-prompt').innerText = dosPath + ">"; 
            }
            else if(args[0]==='dir') history.innerHTML += `<div>Directory of ${dosPath}<br> . &lt;DIR&gt;<br> .. &lt;DIR&gt;<br> SYSTEM &lt;DIR&gt;<br> 3 file(s)</div>`;
            else if(args[0]==='exit') closeWindow(win.id);
            else if(cmd) history.innerHTML += `<div>Bad command or file name</div>`;
            input.value=''; win.querySelector('.window-content-inner').scrollTop = win.querySelector('.window-content-inner').scrollHeight;
        }
    });
}

function triggerBSOD() {
    const bsod = document.getElementById('bsod-screen');
    bsod.style.display = 'flex';
    bsod.focus();
    
    // Stop all sounds
    Object.values(sounds).forEach(s => {
        s.pause();
        s.currentTime = 0;
    });

    // Play error sound repeatedly for effect
    let crashCount = 0;
    const crashInterval = setInterval(() => {
        if (!isMuted) sounds.error.play();
        crashCount++;
        if (crashCount > 5) clearInterval(crashInterval);
    }, 100);

    // Any key reloads the page
    bsod.addEventListener('keydown', () => {
        window.location.reload();
    });
}

/* --- APP: INTERNET EXPLORER --- */
function initInternet(win) {
    const urlInput = win.querySelector('.url-input');
    const goBtn = win.querySelector('.go-btn');
    const viewport = win.querySelector('.ie-viewport'); 
    const toolbar = win.querySelector('.address-bar');

    if (!toolbar.querySelector('.ie-ext-btn')) {
        const extBtn = document.createElement('button');
        extBtn.className = 'win95-btn ie-ext-btn';
        extBtn.innerHTML = '&#x2197;'; 
        extBtn.title = "Open in New Tab";
        extBtn.style.marginLeft = '5px';
        extBtn.onclick = () => {
            let u = urlInput.value.trim();
            if (!u.startsWith('http')) u = 'https://' + u;
            window.open(u, '_blank');
        };
        toolbar.appendChild(extBtn);
    }

    const showHomepage = () => {
        urlInput.value = 'home';
        viewport.innerHTML = `<div style="padding:20px; font-family:'Segoe UI',sans-serif; background:#fff; height:100%; overflow:auto;">
            <div style="text-align:center; padding:20px 0; border-bottom:2px solid #000080;">
                <div class="icon-img ico-internet" style="width:48px;height:48px;margin:0 auto 8px auto;"></div>
                <h2 style="margin:0; color:#000080; font-size:22px;">Aryan Explorer</h2>
                <p style="margin:4px 0 0; font-size:12px; color:#808080;">Your Window to the Internet</p>
            </div>
            <div style="max-width:500px; margin:20px auto;">
                <p style="font-size:13px; margin:0 0 12px; font-weight:bold;">🔍 Quick Search</p>
                <p style="font-size:12px; color:#666; margin:0 0 15px;">Type anything in the address bar and press Go to search Google.</p>
                <p style="font-size:13px; margin:0 0 8px; font-weight:bold;">⭐ Bookmarks</p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <div class="win95-btn" style="cursor:pointer; padding:8px; justify-content:flex-start;" onclick="window.open('https://github.com/devbyaryanvala', '_blank');">
                        📁 My GitHub ↗
                    </div>
                    <div class="win95-btn" style="cursor:pointer; padding:8px; justify-content:flex-start;" onclick="window.open('https://www.linkedin.com/in/aryan-vala-ba62a1212/', '_blank');">
                        💼 My LinkedIn ↗
                    </div>
                    <div class="win95-btn" style="cursor:pointer; padding:8px; justify-content:flex-start;" onclick="window.open('https://en.wikipedia.org', '_blank');">
                        📖 Wikipedia ↗
                    </div>
                    <div class="win95-btn" style="cursor:pointer; padding:8px; justify-content:flex-start;" onclick="window.open('https://projects.aryanvala.online', '_blank');">
                        🚀 My Projects ↗
                    </div>
                </div>
                <hr style="border:none; border-top:1px solid #c0c0c0; margin:15px 0;">
                <p style="font-size:11px; color:#808080; margin:0; text-align:center;">
                    💡 Tip: Bookmarks open in a new tab for security reasons. Use the address bar for general browsing.
                </p>
            </div>
        </div>`;
    };

    const loadUrl = () => {
        let url = urlInput.value.trim();
        if (!url || url === 'home') { showHomepage(); return; }

        // Text search → Google iframe search
        if (!url.includes('.') && !url.startsWith('http')) {
            url = 'https://www.google.com/search?igu=1&q=' + encodeURIComponent(url);
            urlInput.value = url;
            viewport.innerHTML = '';
            const frame = document.createElement('iframe');
            frame.style.cssText = "width:100%; height:100%; border:none; background:#fff;";
            frame.src = url;
            viewport.appendChild(frame);
            return;
        }

        // Ensure https prefix
        if (!url.startsWith('http')) url = 'https://' + url;
        urlInput.value = url;

        // Show loading state
        viewport.innerHTML = `<div style="padding:40px; font-family:'Segoe UI'; text-align:center; color:#000;">
            <div class="icon-img ico-internet" style="width:32px;height:32px;margin:0 auto 10px auto;"></div>
            <p style="margin:0;"><strong>Connecting to ${new URL(url).hostname}...</strong></p>
            <div class="bevel-inset" style="width:260px; height:18px; margin:15px auto; padding:2px; background:#fff;">
                <div style="background:linear-gradient(90deg, #000080, #1084d0); height:100%; animation: ieLoad 2s ease-in-out infinite; width:30%;"></div>
            </div>
            <p style="font-size:11px; color:#808080; margin:0;">If the page doesn't load, use ↗ to open in a new tab</p>
        </div>`;

        // Try direct iframe — many sites allow this
        const frame = document.createElement('iframe');
        frame.style.cssText = "width:100%; height:100%; border:none; background:#fff;";
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.src = url;

        // Track if iframe loaded successfully
        let didLoad = false;
        frame.onload = () => { didLoad = true; };

        // After a delay, check if it loaded. If not, try Google Translate proxy
        setTimeout(() => {
            if (!didLoad) {
                // Use Google Translate as a proxy — this reliably loads most sites
                try {
                    const parsedUrl = new URL(url);
                    const translateUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(url)}`;
                    frame.src = translateUrl;
                } catch(e) { /* invalid URL, ignore */ }
            }
        }, 3000);

        viewport.innerHTML = '';
        viewport.appendChild(frame);
    };
    
    // Add event listener only once
    if (!window.messageListenerAdded) {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.action === 'loadUrl') {
                const activeWin = document.querySelector('.window[data-app-type="internet"]:not(.inactive)');
                if (activeWin) {
                    activeWin.querySelector('.url-input').value = event.data.url;
                    activeWin.querySelector('.go-btn').click(); 
                }
            }
        });
        window.messageListenerAdded = true;
    }

    goBtn.onclick = (e) => { e.stopPropagation(); loadUrl(); };
    urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadUrl(); });
    
    // Show homepage on open
    showHomepage();
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

/* --- APP: RESUME (PDF VIEWER) --- */
function downloadResume() {
    const link = document.createElement('a');
    link.href = './assets/Aryan-Vala-CV.pdf';
    link.download = 'Aryan-Vala-CV.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function printResume(btn) {
    const win = btn.closest('.window');
    const iframe = win ? win.querySelector('.resume-pdf-wrapper iframe') : null;
    if (iframe && iframe.contentWindow) {
        try { iframe.contentWindow.print(); } catch(e) { window.open('./assets/Aryan-Vala-CV.pdf', '_blank'); }
    } else {
        window.open('./assets/Aryan-Vala-CV.pdf', '_blank');
    }
}

/* --- APP: RUN DIALOG --- */
function initRun(win) {
    const input = win.querySelector('.run-input');
    if (input) {
        input.focus();
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeRunCommand(input);
        });
    }
}

function executeRunCommand(btn) {
    const win = btn.closest('.window');
    const input = win.querySelector('.run-input');
    const cmd = input ? input.value.trim().toLowerCase() : '';
    const appMap = {
        'paint': 'paint', 'mspaint': 'paint', 'notepad': 'notepad',
        'calc': 'calc', 'calculator': 'calc', 'cmd': 'msdos',
        'msdos': 'msdos', 'doom': 'doom', 'internet': 'internet',
        'explorer': 'computer', 'help': 'help', 'resume': 'resume',
        'mail': 'contact', 'email': 'contact', 'projects': 'projects',
        'skills': 'skills', 'control': 'control'
    };
    if (appMap[cmd]) {
        closeWindow(win.id);
        openWindow(appMap[cmd]);
    } else if (cmd.startsWith('http') || cmd.includes('.')) {
        closeWindow(win.id);
        openWindow('internet');
        setTimeout(() => {
            const inetWin = document.querySelector('.window[data-app-type="internet"]');
            if (inetWin) { inetWin.querySelector('.url-input').value = cmd; inetWin.querySelector('.go-btn').click(); }
        }, 100);
    } else if (cmd) {
        alert('Cannot find "' + cmd + '". Make sure you typed the name correctly.');
    }
}

/* --- ABOUT DIALOG --- */
function showAboutDialog(title, message) {
    openWindow('about');
    setTimeout(() => {
        const wins = document.querySelectorAll('.window[data-app-type="about"]');
        const win = wins[wins.length - 1];
        if (win) {
            const msgEl = win.querySelector('.about-message');
            if (msgEl) msgEl.textContent = message;
            const titleText = win.querySelector('.title-text');
            if (titleText) titleText.lastChild.textContent = ' ' + title;
        }
    }, 50);
}

/* --- MUTE TOGGLE --- */
let isMuted = false;
function toggleMute() {
    isMuted = !isMuted;
    const volIcon = document.querySelector('.tray-icon.volume');
    if (isMuted) {
        Object.values(sounds).forEach(s => s.volume = 0);
        volIcon.style.opacity = '0.4';
        volIcon.title = 'Sound: Muted (click to unmute)';
    } else {
        Object.values(sounds).forEach(s => s.volume = 1);
        volIcon.style.opacity = '1';
        volIcon.title = 'Sound: On (click to mute)';
    }
}

function toggleStartMenu(e) {
    if(e) e.stopPropagation();
    if(startMenu.style.display==='flex') { startMenu.style.display='none'; startBtn.classList.remove('active'); } 
    else { startMenu.style.display='flex'; startBtn.classList.add('active'); startMenu.style.zIndex = 20000; }
}
document.addEventListener('click', (e) => {
    if(!startMenu.contains(e.target) && !startBtn.contains(e.target)) { startMenu.style.display='none'; startBtn.classList.remove('active'); }
    if(!e.target.closest('#context-menu')) { ctxMenu.style.display = 'none'; }
    if(desktopCtxMenu && !e.target.closest('#desktop-context-menu')) { desktopCtxMenu.style.display = 'none'; }
});

// Desktop Right Click Menu
document.addEventListener('contextmenu', (e) => {
    if(!e.target.closest('.window') && !e.target.closest('.taskbar') && !e.target.closest('.desktop-icon') && !e.target.closest('#clippy-container')) {
        e.preventDefault();
        desktopCtxMenu.style.display = 'block';
        desktopCtxMenu.style.left = e.clientX + 'px';
        desktopCtxMenu.style.top = e.clientY + 'px';
    } else if (desktopCtxMenu) {
        desktopCtxMenu.style.display = 'none';
    }
});
function ctxAction(a) {
    if(!activeContextTask) return;
    if(a==='close') closeWindow(activeContextTask);
    if(a==='minimize') minimizeWindow(activeContextTask);
    if(a==='restore') bringToFront(document.getElementById(activeContextTask));
    ctxMenu.style.display='none';
}
function performShutdown() {
    startMenu.style.display='none'; startBtn.classList.remove('active');
    desktop.style.display='none'; document.getElementById('taskbar').style.display='none';
    document.getElementById('shutdown-screen').style.display='flex';
    playSound('shutdown');
}
function sendEmail(form) {
    const subject = form.querySelector('.email-subject').value;
    const body = form.querySelector('.email-body').value;
    window.location.href = `mailto:aryanvala88@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* --- CLIPPY ASSISTANT --- */
function toggleClippyBubble() {
    const bubble = document.querySelector('.clippy-bubble');
    if (bubble) {
        bubble.style.display = (bubble.style.display === 'none' || bubble.style.display === '') ? 'block' : 'none';
        if (bubble.style.display === 'block') playSound('click');
    }
}

function closeClippy() {
    const container = document.getElementById('clippy-container');
    if (container) container.style.display = 'none';
}

/* --- APP: MEDIA PLAYER --- */
function initMediaPlayer(win) {
    const audio = win.querySelector('.mp-audio');
    if (audio && !audio.src) {
        audio.src = './assets/audio/windowsChords.mp3';
    }
}
function mpAction(btn, action) {
    const win = btn.closest('.window');
    const audio = win.querySelector('.mp-audio');
    const bars = win.querySelector('.mp-bars');
    const timeDisplay = win.querySelector('.mp-time');
    
    if (action === 'play') {
        audio.play();
        bars.classList.add('active');
        if (!audio.dataset.interval) {
            audio.dataset.interval = setInterval(() => {
                const mins = Math.floor(audio.currentTime / 60).toString().padStart(2, '0');
                const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
                if(timeDisplay) timeDisplay.innerText = `${mins}:${secs}`;
            }, 1000);
        }
    } else if (action === 'pause') {
        audio.pause();
        bars.classList.remove('active');
    } else if (action === 'stop') {
        audio.pause();
        audio.currentTime = 0;
        bars.classList.remove('active');
        if(timeDisplay) timeDisplay.innerText = '00:00';
    }
}
function mpLoadFile(input) {
    const win = input.closest('.window');
    const audio = win.querySelector('.mp-audio');
    const titleDisplay = win.querySelector('.mp-title');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Use URL.createObjectURL to allow playing a local file directly
        const fileURL = URL.createObjectURL(file);
        
        // Stop current playing song if any
        mpAction(input, 'stop');
        
        // Load the new file
        audio.src = fileURL;
        titleDisplay.innerText = file.name;
        
        // Auto-play
        setTimeout(() => mpAction(input, 'play'), 200);
    }
}

/* --- APP: MINESWEEPER --- */
function initMinesweeper(win) {
    const grid = win.querySelector('.minesweeper-grid');
    const face = win.querySelector('.ms-face');
    const timerEl = win.querySelector('.ms-timer');
    const minesEl = win.querySelector('.ms-mines');
    
    // Config (Beginner: 9x9, 10 mines)
    const rows = 9, cols = 9, totalMines = 10;
    let board = [], mines = [], gameOver = false, flags = 0, revealedCount = 0, timer = 0, timerInterval = null;
    
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${cols}, 20px)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 20px)`;
    face.innerText = '🙂';
    minesEl.innerText = String(totalMines).padStart(3, '0');
    timerEl.innerText = '000';
    if(win.dataset.timerInterval) clearInterval(win.dataset.timerInterval);
    
    // Initialize Board Arrays
    for(let r=0; r<rows; r++) {
        board[r] = [];
        for(let c=0; c<cols; c++) board[r][c] = { mine: false, revealed: false, flagged: false, count: 0, el: null };
    }
    
    // Plant Mines
    let planted = 0;
    while(planted < totalMines) {
        let r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols);
        if(!board[r][c].mine) { board[r][c].mine = true; mines.push({r,c}); planted++; }
    }
    
    // Calculate Adjacent Numbers
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            if(board[r][c].mine) continue;
            let count = 0;
            dirs.forEach(d => {
                let nr = r + d[0], nc = c + d[1];
                if(nr>=0 && nr<rows && nc>=0 && nc<cols && board[nr][nc].mine) count++;
            });
            board[r][c].count = count;
        }
    }
    
    // Build UI
    const startTimer = () => {
        if(!timerInterval) {
            timerInterval = setInterval(() => { timer++; timerEl.innerText = String(Math.min(timer, 999)).padStart(3, '0'); }, 1000);
            win.dataset.timerInterval = timerInterval;
        }
    };
    const checkWin = () => {
        if (revealedCount === (rows * cols) - totalMines) {
            gameOver = true; face.innerText = '😎'; clearInterval(timerInterval);
        }
    };
    const reveal = (r, c) => {
        if(gameOver || board[r][c].revealed || board[r][c].flagged) return;
        startTimer();
        board[r][c].revealed = true; revealedCount++;
        const cell = board[r][c].el;
        cell.classList.add('revealed');
        
        if(board[r][c].mine) {
            cell.classList.add('mine'); cell.innerText = '💣'; gameOver = true; face.innerText = '😵';
            clearInterval(timerInterval);
            mines.forEach(m => {
                if(!board[m.r][m.c].flagged) { board[m.r][m.c].el.classList.add('revealed', 'mine'); board[m.r][m.c].el.innerText = '💣'; }
            });
            return;
        }
        
        if(board[r][c].count > 0) {
            cell.innerText = board[r][c].count; cell.classList.add('ms-c' + board[r][c].count);
        } else {
            dirs.forEach(d => {
                let nr = r + d[0], nc = c + d[1];
                if(nr>=0 && nr<rows && nc>=0 && nc<cols) reveal(nr, nc);
            });
        }
        checkWin();
    };
    
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'ms-cell';
            board[r][c].el = cell;
            cell.addEventListener('mousedown', (e) => {
                if(gameOver) return;
                if(e.button === 0 && !board[r][c].flagged) { face.innerText = '😮'; }
            });
            cell.addEventListener('mouseup', (e) => {
                if(gameOver) return;
                face.innerText = '🙂';
                if(e.button === 0) {
                    reveal(r, c);
                } else if(e.button === 2) {
                    if(!board[r][c].revealed) {
                        board[r][c].flagged = !board[r][c].flagged;
                        cell.innerText = board[r][c].flagged ? '🚩' : '';
                        flags += board[r][c].flagged ? 1 : -1;
                        minesEl.innerText = String(Math.max(totalMines - flags, 0)).padStart(3, '0');
                    }
                }
            });
            cell.addEventListener('contextmenu', (e) => e.preventDefault());
            grid.appendChild(cell);
        }
    }
}

/* --- THEME SYSTEM --- */
function setTheme(val) {
    document.getElementById('desktop').style.background = val;
    localStorage.setItem('win95_theme', val);
}

// Load saved theme on startup
(function loadTheme() {
    const savedTheme = localStorage.getItem('win95_theme');
    if(savedTheme) document.getElementById('desktop').style.background = savedTheme;
})();
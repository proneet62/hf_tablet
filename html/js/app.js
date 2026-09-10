// ============================================
// Global Variables
// ============================================

let currentApps = [];
let currentConfig = {};
let currentScreen = 'home';

// Layout & customization state
let layoutData = null;       // { version, grid: [ { position, appId, type, folderId?, name?, children? } ] }
let userSettings = null;     // { backgroundColor, backgroundImage, backgroundType }
let isEditMode = false;

// Drag state
let dragState = {
    active: false,
    sourceIndex: null,
    sourceElement: null,
    ghostElement: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    longPressTimer: null,
    longPressTriggered: false,
    hoverTarget: null,
    hoverTimer: null,
};

// Currently open folder
let openFolderId = null;

// ============================================
// NUI Message Handler
// ============================================

window.addEventListener('message', function(event) {
    const data = event.data;

    switch(data.action) {
        case 'openTablet':
            openTablet(data.apps, data.config, data.layout, data.settings);
            break;
        case 'closeTablet':
            closeTabletUI();
            break;
        case 'updateApps':
            updateApps(data.apps);
            break;
        case 'showHome':
            showScreen('home');
            break;
        case 'showSettings':
            showScreen('settings');
            break;
    }
});

// ============================================
// Tablet Functions
// ============================================

/**
 * タブレットを開く
 */
function openTablet(apps, config, layout, settings) {
    currentApps = apps;
    currentConfig = config;

    // レイアウトを適用（なければデフォルト生成）
    if (layout && layout.grid && layout.grid.length > 0) {
        layoutData = layout;
    } else {
        layoutData = generateDefaultLayout(apps);
    }

    // 設定を適用
    if (settings) {
        userSettings = settings;
    } else {
        userSettings = {
            backgroundColor: config.backgroundColor || '#1a1a1a',
            backgroundImage: '',
            backgroundType: 'color',
        };
    }

    applyUserSettings();
    renderApps();

    $('#tablet-container').removeClass('tablet-hidden');
    updateClock();
    setInterval(updateClock, 1000);
    showScreen('home');
}

/**
 * デフォルトレイアウトを生成
 */
function generateDefaultLayout(apps) {
    const grid = [];
    apps.forEach((app, index) => {
        grid.push({
            position: index,
            appId: app.id,
            type: 'app',
        });
    });
    return { version: 1, grid: grid };
}

/**
 * ユーザー設定を適用
 */
function applyUserSettings() {
    const contentArea = document.getElementById('content-area');
    if (!contentArea || !userSettings) return;

    if (userSettings.backgroundType === 'image' && userSettings.backgroundImage) {
        contentArea.style.setProperty('--tablet-bg-color', 'transparent');
        contentArea.style.setProperty('--tablet-bg-image', `url(${userSettings.backgroundImage})`);
        contentArea.style.backgroundImage = `url(${userSettings.backgroundImage})`;
        contentArea.style.backgroundColor = 'transparent';
    } else {
        const bgColor = userSettings.backgroundColor || '#1a1a1a';
        contentArea.style.setProperty('--tablet-bg-color', bgColor);
        contentArea.style.setProperty('--tablet-bg-image', 'none');
        contentArea.style.backgroundImage = 'none';
        contentArea.style.backgroundColor = bgColor;
    }

    // Settings UI sync
    const colorPicker = document.getElementById('bg-color-picker');
    const colorHex = document.getElementById('bg-color-hex');
    if (colorPicker && userSettings.backgroundColor) {
        // Ensure valid 7-char hex
        let col = userSettings.backgroundColor;
        if (col.length > 7) col = col.substring(0, 7);
        colorPicker.value = col;
        if (colorHex) colorHex.textContent = col;
    }

    const imageUrl = document.getElementById('bg-image-url');
    if (imageUrl && userSettings.backgroundImage) {
        imageUrl.value = userSettings.backgroundImage;
        updateImagePreview(userSettings.backgroundImage);
    }

    // Sync background type toggle
    if (userSettings.backgroundType === 'image') {
        document.getElementById('bg-type-color')?.classList.remove('active');
        document.getElementById('bg-type-image')?.classList.add('active');
        document.getElementById('color-settings')?.classList.add('hidden');
        document.getElementById('image-settings')?.classList.remove('hidden');
    } else {
        document.getElementById('bg-type-color')?.classList.add('active');
        document.getElementById('bg-type-image')?.classList.remove('active');
        document.getElementById('color-settings')?.classList.remove('hidden');
        document.getElementById('image-settings')?.classList.add('hidden');
    }
}

/**
 * タブレットUIを閉じる
 */
function closeTabletUI() {
    $('#tablet-container').addClass('tablet-hidden');
    exitEditMode();
    closeFolderOverlay();
}

/**
 * タブレットを閉じる（NUIに通知）
 */
function closeTablet() {
    closeTabletUI();
    $.post('https://hf_tablet/closeTablet', JSON.stringify({}));
}

/**
 * アプリを更新（動的登録対応）
 */
function updateApps(apps) {
    currentApps = apps;
    // レイアウトに新しいアプリを追加（既存にないもの）
    const existingIds = new Set(layoutData.grid.map(item => {
        if (item.type === 'folder') {
            return item.children || [];
        }
        return item.appId;
    }).flat());

    apps.forEach(app => {
        if (!existingIds.has(app.id)) {
            // 空いてるポジションに追加
            const maxPos = layoutData.grid.reduce((max, item) => Math.max(max, item.position), -1);
            layoutData.grid.push({
                position: maxPos + 1,
                appId: app.id,
                type: 'app',
            });
        }
    });

    renderApps();
}

// ============================================
// Rendering
// ============================================

/**
 * アプリをレンダリング
 */
function renderApps() {
    const appGrid = document.getElementById('app-grid');
    appGrid.innerHTML = '';

    // レイアウトデータに基づいてレンダリング
    const sortedGrid = [...layoutData.grid].sort((a, b) => a.position - b.position);

    sortedGrid.forEach((gridItem, visualIndex) => {
        if (gridItem.type === 'folder') {
            renderFolderItem(appGrid, gridItem, visualIndex);
        } else {
            const app = findAppById(gridItem.appId);
            if (app) {
                renderAppItem(appGrid, app, gridItem, visualIndex);
            }
        }
    });
}

/**
 * 通常アプリのレンダリング
 */
function renderAppItem(container, app, gridItem, visualIndex) {
    const appColor = app.color || '#3498db';
    const appColorDark = darkenColor(appColor, 20);

    const appItem = document.createElement('div');
    appItem.className = 'app-item' + (isEditMode ? ' editing' : '');
    appItem.style.animationDelay = `${visualIndex * 0.03}s`;
    appItem.dataset.gridIndex = gridItem.position;
    appItem.dataset.appId = app.id;
    appItem.dataset.itemType = 'app';

    const appIcon = document.createElement('div');
    appIcon.className = 'app-icon';
    appIcon.style.setProperty('--app-color', appColor);
    appIcon.style.setProperty('--app-color-dark', appColorDark);
    appIcon.innerHTML = `<i class="${app.icon}"></i>`;

    const appName = document.createElement('div');
    appName.className = 'app-name';
    appName.textContent = app.name;

    appItem.appendChild(appIcon);
    appItem.appendChild(appName);

    // Events
    setupItemEvents(appItem, gridItem);

    container.appendChild(appItem);
}

/**
 * フォルダアイテムのレンダリング
 */
function renderFolderItem(container, gridItem, visualIndex) {
    const appItem = document.createElement('div');
    appItem.className = 'app-item' + (isEditMode ? ' editing' : '');
    appItem.style.animationDelay = `${visualIndex * 0.03}s`;
    appItem.dataset.gridIndex = gridItem.position;
    appItem.dataset.folderId = gridItem.folderId;
    appItem.dataset.itemType = 'folder';

    // Folder icon: mini grid of up to 9 child apps
    const folderIcon = document.createElement('div');
    folderIcon.className = 'folder-icon';

    const children = gridItem.children || [];
    const showCount = Math.min(children.length, 9);
    for (let i = 0; i < showCount; i++) {
        const childApp = findAppById(children[i]);
        if (childApp) {
            const mini = document.createElement('div');
            mini.className = 'mini-icon';
            mini.style.background = `linear-gradient(135deg, ${childApp.color || '#3498db'} 0%, ${darkenColor(childApp.color || '#3498db', 20)} 100%)`;
            mini.innerHTML = `<i class="${childApp.icon}" style="font-size:9px;"></i>`;
            folderIcon.appendChild(mini);
        }
    }

    const folderName = document.createElement('div');
    folderName.className = 'app-name';
    folderName.textContent = gridItem.name || 'フォルダ';

    appItem.appendChild(folderIcon);
    appItem.appendChild(folderName);

    // Events
    setupItemEvents(appItem, gridItem);

    container.appendChild(appItem);
}

/**
 * アイテムにイベントを設定
 */
function setupItemEvents(element, gridItem) {
    // Pointer events for long press + drag
    element.addEventListener('pointerdown', (e) => onPointerDown(e, element, gridItem));
    element.addEventListener('pointermove', (e) => onPointerMove(e, element));
    element.addEventListener('pointerup', (e) => onPointerUp(e, element, gridItem));
    element.addEventListener('pointercancel', (e) => onPointerCancel(e));

    // Prevent context menu
    element.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ============================================
// Long Press & Drag & Drop
// ============================================

function onPointerDown(e, element, gridItem) {
    if (e.button !== 0) return; // Left click only
    e.preventDefault();

    const rect = element.getBoundingClientRect();
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.offsetX = e.clientX - rect.left;
    dragState.offsetY = e.clientY - rect.top;
    dragState.sourceElement = element;
    dragState.sourceIndex = gridItem.position;
    dragState.longPressTriggered = false;

    // If already in edit mode, start drag immediately after small move
    if (isEditMode) {
        dragState.longPressTimer = null;
        // Will start actual drag on pointermove threshold
    } else {
        // Long press timer (500ms)
        dragState.longPressTimer = setTimeout(() => {
            dragState.longPressTriggered = true;
            enterEditMode();
        }, 500);
    }

    element.setPointerCapture(e.pointerId);
}

function onPointerMove(e, element) {
    if (!dragState.sourceElement) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Cancel long press if moved too much
    if (!dragState.longPressTriggered && !isEditMode && distance > 10) {
        clearTimeout(dragState.longPressTimer);
        return;
    }

    // Start drag if in edit mode and moved enough
    if (isEditMode && distance > 5 && !dragState.active) {
        startDrag(e);
    }

    if (dragState.active) {
        updateDragPosition(e);
        checkDropTarget(e);
    }
}

function onPointerUp(e, element, gridItem) {
    clearTimeout(dragState.longPressTimer);

    if (dragState.active) {
        finishDrag(e);
    } else if (!dragState.longPressTriggered) {
        // Normal tap — open app/folder
        if (!isEditMode) {
            if (gridItem.type === 'folder') {
                openFolder(gridItem);
            } else {
                openApp(findAppById(gridItem.appId));
            }
        }
    }

    resetDragState();
}

function onPointerCancel(e) {
    clearTimeout(dragState.longPressTimer);
    if (dragState.active) {
        cancelDrag();
    }
    resetDragState();
}

function startDrag(e) {
    dragState.active = true;
    const el = dragState.sourceElement;
    el.classList.add('dragging');
    el.classList.remove('editing');

    // Move element with pointer
    el.style.position = 'fixed';
    el.style.zIndex = '1000';
    el.style.width = el.offsetWidth + 'px';
    updateDragPosition(e);
}

function updateDragPosition(e) {
    const el = dragState.sourceElement;
    el.style.left = (e.clientX - dragState.offsetX) + 'px';
    el.style.top = (e.clientY - dragState.offsetY) + 'px';
}

function checkDropTarget(e) {
    // Clear previous hover states
    document.querySelectorAll('.drop-target, .folder-merge-target').forEach(el => {
        el.classList.remove('drop-target', 'folder-merge-target');
    });

    // Hide dragged element temporarily to check what's under the cursor
    const dragEl = dragState.sourceElement;
    dragEl.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    dragEl.style.pointerEvents = '';

    if (!elementBelow) {
        clearHoverTimer();
        return;
    }

    const targetItem = elementBelow.closest('.app-item');
    if (!targetItem || targetItem === dragState.sourceElement) {
        clearHoverTimer();
        dragState.hoverTarget = null;
        return;
    }

    const targetIndex = parseInt(targetItem.dataset.gridIndex);
    const sourceIndex = dragState.sourceIndex;
    if (targetIndex === sourceIndex) {
        clearHoverTimer();
        return;
    }

    // If hovering over another item for 400ms → folder merge indicator
    if (dragState.hoverTarget !== targetItem) {
        clearHoverTimer();
        dragState.hoverTarget = targetItem;
        targetItem.classList.add('drop-target');

        dragState.hoverTimer = setTimeout(() => {
            targetItem.classList.remove('drop-target');
            targetItem.classList.add('folder-merge-target');
        }, 400);
    }
}

function clearHoverTimer() {
    if (dragState.hoverTimer) {
        clearTimeout(dragState.hoverTimer);
        dragState.hoverTimer = null;
    }
}

function finishDrag(e) {
    const dragEl = dragState.sourceElement;

    // Remove drag visual
    dragEl.classList.remove('dragging');
    dragEl.style.position = '';
    dragEl.style.left = '';
    dragEl.style.top = '';
    dragEl.style.zIndex = '';
    dragEl.style.width = '';

    // Check what element is under cursor
    dragEl.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    dragEl.style.pointerEvents = '';

    const targetItem = elementBelow ? elementBelow.closest('.app-item') : null;

    if (targetItem && targetItem !== dragEl) {
        const targetIndex = parseInt(targetItem.dataset.gridIndex);
        const sourceIndex = dragState.sourceIndex;

        // Check if folder merge (held long enough)
        if (targetItem.classList.contains('folder-merge-target')) {
            createFolderFromMerge(sourceIndex, targetIndex);
        } else {
            // Swap positions
            swapGridItems(sourceIndex, targetIndex);
        }
    }

    // Clear states
    document.querySelectorAll('.drop-target, .folder-merge-target').forEach(el => {
        el.classList.remove('drop-target', 'folder-merge-target');
    });
    clearHoverTimer();

    renderApps();
    saveLayout();
}

function cancelDrag() {
    const dragEl = dragState.sourceElement;
    if (dragEl) {
        dragEl.classList.remove('dragging');
        dragEl.style.position = '';
        dragEl.style.left = '';
        dragEl.style.top = '';
        dragEl.style.zIndex = '';
        dragEl.style.width = '';
    }
    document.querySelectorAll('.drop-target, .folder-merge-target').forEach(el => {
        el.classList.remove('drop-target', 'folder-merge-target');
    });
    clearHoverTimer();
}

function resetDragState() {
    dragState.active = false;
    dragState.sourceElement = null;
    dragState.sourceIndex = null;
    dragState.longPressTriggered = false;
    dragState.hoverTarget = null;
}

// ============================================
// Layout Manipulation
// ============================================

/**
 * グリッドアイテムの位置を入れ替え
 */
function swapGridItems(sourcePos, targetPos) {
    const sourceItem = layoutData.grid.find(item => item.position === sourcePos);
    const targetItem = layoutData.grid.find(item => item.position === targetPos);

    if (sourceItem && targetItem) {
        sourceItem.position = targetPos;
        targetItem.position = sourcePos;
    }
}

/**
 * 2つのアイテムからフォルダを作成
 */
function createFolderFromMerge(sourcePos, targetPos) {
    const sourceItem = layoutData.grid.find(item => item.position === sourcePos);
    const targetItem = layoutData.grid.find(item => item.position === targetPos);

    if (!sourceItem || !targetItem) return;

    // Collect app IDs
    let childIds = [];

    if (targetItem.type === 'folder') {
        // Add source to existing folder
        childIds = [...(targetItem.children || [])];
        if (sourceItem.type === 'folder') {
            childIds.push(...(sourceItem.children || []));
        } else {
            childIds.push(sourceItem.appId);
        }
        targetItem.children = childIds;
        // Remove source from grid
        layoutData.grid = layoutData.grid.filter(item => item.position !== sourcePos);
        // Re-index positions
        reindexPositions();
        return;
    }

    if (sourceItem.type === 'folder') {
        // Add target to existing folder of source
        childIds = [...(sourceItem.children || [])];
        childIds.push(targetItem.appId);
        sourceItem.children = childIds;
        sourceItem.position = targetPos;
        // Remove target from grid
        layoutData.grid = layoutData.grid.filter(item => item !== targetItem);
        reindexPositions();
        return;
    }

    // Both are apps → create new folder
    const folderId = 'folder_' + Date.now();
    const folderItem = {
        position: targetPos,
        type: 'folder',
        folderId: folderId,
        name: 'フォルダ',
        children: [targetItem.appId, sourceItem.appId],
    };

    // Replace target with folder, remove source
    layoutData.grid = layoutData.grid.filter(
        item => item.position !== sourcePos && item.position !== targetPos
    );
    layoutData.grid.push(folderItem);
    reindexPositions();
}

/**
 * ポジションを再整列
 */
function reindexPositions() {
    layoutData.grid.sort((a, b) => a.position - b.position);
    layoutData.grid.forEach((item, index) => {
        item.position = index;
    });
}

// ============================================
// Edit Mode
// ============================================

function enterEditMode() {
    isEditMode = true;
    document.querySelectorAll('.app-item').forEach(el => {
        el.classList.add('editing');
        el.classList.add('no-hover');
    });
    document.getElementById('edit-mode-banner').classList.remove('hidden');
}

function exitEditMode() {
    isEditMode = false;
    document.querySelectorAll('.app-item').forEach(el => {
        el.classList.remove('editing', 'no-hover');
    });
    document.getElementById('edit-mode-banner')?.classList.add('hidden');
    saveLayout();
}

// ============================================
// Folder Management
// ============================================

/**
 * フォルダを開く
 */
function openFolder(gridItem) {
    openFolderId = gridItem.folderId;

    const overlay = document.getElementById('folder-overlay');
    const folderGrid = document.getElementById('folder-grid');
    const nameInput = document.getElementById('folder-name-input');

    overlay.classList.remove('hidden');
    nameInput.value = gridItem.name || 'フォルダ';
    folderGrid.innerHTML = '';

    const children = gridItem.children || [];
    children.forEach((childId, index) => {
        const app = findAppById(childId);
        if (app) {
            const appColor = app.color || '#3498db';
            const appColorDark = darkenColor(appColor, 20);

            const appItem = document.createElement('div');
            appItem.className = 'app-item';
            appItem.style.animationDelay = `${index * 0.05}s`;

            const appIcon = document.createElement('div');
            appIcon.className = 'app-icon';
            appIcon.style.setProperty('--app-color', appColor);
            appIcon.style.setProperty('--app-color-dark', appColorDark);
            appIcon.innerHTML = `<i class="${app.icon}"></i>`;

            const appName = document.createElement('div');
            appName.className = 'app-name';
            appName.textContent = app.name;

            appItem.appendChild(appIcon);
            appItem.appendChild(appName);

            appItem.addEventListener('click', () => {
                openApp(app);
            });

            folderGrid.appendChild(appItem);
        }
    });
}

/**
 * フォルダオーバーレイを閉じる
 */
function closeFolderOverlay() {
    const overlay = document.getElementById('folder-overlay');
    if (overlay) overlay.classList.add('hidden');

    // Save folder name if changed
    if (openFolderId) {
        const nameInput = document.getElementById('folder-name-input');
        const folderItem = layoutData.grid.find(item => item.folderId === openFolderId);
        if (folderItem && nameInput) {
            folderItem.name = nameInput.value || 'フォルダ';
            saveLayout();
            renderApps();
        }
    }
    openFolderId = null;
}

// ============================================
// App Functions
// ============================================

/**
 * アプリを開く
 */
function openApp(app) {
    if (!app) return;

    // システムアプリの処理
    if (app.type === 'system') {
        if (app.id === 'home') {
            showScreen('home');
            return;
        } else if (app.id === 'settings') {
            showScreen('settings');
            return;
        }
    }

    // NUIにメッセージを送信
    $.post('https://hf_tablet/openApp', JSON.stringify({
        appId: app.id
    }), function(response) {
        if (response.success) {
            console.log(`App opened: ${app.name}`);
        } else {
            console.error(`Failed to open app: ${response.message}`);
        }
    });
}

/**
 * 画面を切り替える
 */
function showScreen(screenId) {
    $('.screen').removeClass('active');
    $(`#${screenId}-screen`).addClass('active');

    let title = 'ホーム';
    if (screenId === 'settings') {
        title = '設定';
    }
    $('#page-title').text(title);
    currentScreen = screenId;

    // Close folder overlay when switching screens
    closeFolderOverlay();
    if (screenId !== 'home') {
        exitEditMode();
    }
}

// ============================================
// Navigation Functions
// ============================================

function goHome() {
    showScreen('home');
}

function goBack() {
    if (openFolderId) {
        closeFolderOverlay();
        return;
    }
    if (currentScreen === 'settings') {
        showScreen('home');
    }
}

// ============================================
// Settings Functions
// ============================================

/**
 * 設定を保存してNUIに送信
 */
function saveSettings() {
    if (!userSettings) return;
    $.post('https://hf_tablet/saveSettings', JSON.stringify({
        settings: userSettings
    }));
}

/**
 * レイアウトを保存してNUIに送信
 */
function saveLayout() {
    if (!layoutData) return;
    $.post('https://hf_tablet/saveLayout', JSON.stringify({
        layout: layoutData
    }));
}

/**
 * レイアウトをリセット
 */
function resetLayout() {
    layoutData = generateDefaultLayout(currentApps);
    renderApps();
    saveLayout();
}

/**
 * 画像プレビューを更新
 */
function updateImagePreview(url) {
    const preview = document.getElementById('bg-image-preview');
    if (!preview) return;

    if (url && url.trim()) {
        preview.style.backgroundImage = `url(${url})`;
        preview.classList.add('has-image');
    } else {
        preview.style.backgroundImage = '';
        preview.classList.remove('has-image');
    }
}

// ============================================
// Utility Functions
// ============================================

function findAppById(appId) {
    return currentApps.find(app => app.id === appId) || null;
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    $('#current-time').text(`${hours}:${minutes}`);
}

function darkenColor(color, percent) {
    if (!color || color.length < 4) return '#000000';
    const cleaned = color.replace('#', '').substring(0, 6);
    const num = parseInt(cleaned, 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

// ============================================
// Event Listeners
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Edit mode done button
    document.getElementById('edit-mode-done')?.addEventListener('click', () => {
        exitEditMode();
    });

    // Folder overlay close
    document.getElementById('folder-backdrop')?.addEventListener('click', () => {
        closeFolderOverlay();
    });
    document.getElementById('folder-close-btn')?.addEventListener('click', () => {
        closeFolderOverlay();
    });

    // Background type toggle
    document.getElementById('bg-type-color')?.addEventListener('click', () => {
        document.getElementById('bg-type-color').classList.add('active');
        document.getElementById('bg-type-image').classList.remove('active');
        document.getElementById('color-settings').classList.remove('hidden');
        document.getElementById('image-settings').classList.add('hidden');

        userSettings.backgroundType = 'color';
        applyUserSettings();
        saveSettings();
    });

    document.getElementById('bg-type-image')?.addEventListener('click', () => {
        document.getElementById('bg-type-image').classList.add('active');
        document.getElementById('bg-type-color').classList.remove('active');
        document.getElementById('image-settings').classList.remove('hidden');
        document.getElementById('color-settings').classList.add('hidden');

        userSettings.backgroundType = 'image';
        applyUserSettings();
        saveSettings();
    });

    // Color picker
    document.getElementById('bg-color-picker')?.addEventListener('input', (e) => {
        const color = e.target.value;
        document.getElementById('bg-color-hex').textContent = color;
        userSettings.backgroundColor = color;
        applyUserSettings();
    });

    document.getElementById('bg-color-picker')?.addEventListener('change', (e) => {
        saveSettings();
    });

    // Preset colors
    document.querySelectorAll('.preset-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            document.querySelectorAll('.preset-color-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            userSettings.backgroundColor = color;
            document.getElementById('bg-color-picker').value = color;
            document.getElementById('bg-color-hex').textContent = color;
            applyUserSettings();
            saveSettings();
        });
    });

    // Image URL apply
    document.getElementById('bg-image-apply')?.addEventListener('click', () => {
        const url = document.getElementById('bg-image-url').value.trim();
        userSettings.backgroundImage = url;
        updateImagePreview(url);
        applyUserSettings();
        saveSettings();
    });

    // Image URL enter key
    document.getElementById('bg-image-url')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('bg-image-apply').click();
        }
    });

    // Reset layout
    document.getElementById('reset-layout-btn')?.addEventListener('click', () => {
        resetLayout();
    });

    // Brightness slider
    document.getElementById('brightness-slider')?.addEventListener('input', (e) => {
        const brightness = e.target.value;
        document.querySelector('.tablet-device').style.opacity = brightness / 100;
    });
});

// ============================================
// Keyboard Events
// ============================================

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (isEditMode) {
            exitEditMode();
            return;
        }
        if (openFolderId) {
            closeFolderOverlay();
            return;
        }
        closeTablet();
    }

    if (event.key === 'Backspace') {
        event.preventDefault();
        goBack();
    }
});

// ============================================
// Debug Functions (開発用)
// ============================================

if (window.location.protocol === 'file:') {
    console.log('[DEBUG] Running in file:// mode');

    const dummyApps = [
        { id: 'home', name: 'ホーム', icon: 'fas fa-home', color: '#5C6D85', type: 'system', system: true, order: 0 },
        { id: 'profile', name: 'プロフィール', icon: 'fas fa-user', color: '#16B8FF', type: 'command', order: 2 },
        { id: 'multijob', name: 'マイジョブ', icon: 'fas fa-briefcase', color: '#56694f', type: 'command', order: 3 },
        { id: 'level', name: 'レベル状況', icon: 'fa-solid fa-arrow-up', color: '#56694f', type: 'command', order: 4 },
        { id: 'lsbbs', name: '青空広場', icon: 'fa-solid fa-chalkboard', color: '#16B8FF', type: 'command', order: 5 },
        { id: 'wanted', name: '指名手配一覧', icon: 'fa-solid fa-address-book', color: '#c8705a', type: 'command', order: 7 },
        { id: 'dealerviewer', name: '車両価格一覧', icon: 'fas fa-car', color: '#5C6D85', type: 'command', order: 11 },
        { id: 'present', name: '受け取りbox', icon: 'fa-solid fa-gift', color: '#d9a85c', type: 'command', order: 12 },
        { id: 'nexus', name: 'HEXA', icon: 'fa-solid fa-comments', color: '#16B8FF', type: 'command', order: 14 },
        { id: 'transfer', name: '送金', icon: 'fa-solid fa-money-bill', color: '#d9a85c', type: 'command', order: 15 },
        { id: 'settings', name: '設定', icon: 'fas fa-cog', color: '#5C6D85', type: 'system', system: true, order: 999 },
    ];

    const dummyConfig = {
        backgroundColor: '#1a1a1a',
        iconSize: 80,
        grid: { columns: 4, rows: 3 },
        animationSpeed: 300,
    };

    // Simulate saved layout with a folder
    const dummyLayout = null; // null to test default generation

    const dummySettings = null; // null to test default

    setTimeout(() => {
        openTablet(dummyApps, dummyConfig, dummyLayout, dummySettings);
    }, 500);
}

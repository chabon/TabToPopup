
import { getSetting, setSetting } from './settings.js';


const TabToPopup = {
    popupWindows: [], // settings.popupWindows のストレージと同値
    prevBoundsList : [], // settings.prevBoundsList のストレージと同値
    isInitialized: false,
    timerID: 0,
    bookmarkNum: 20,
};


const Listeners = {};

Listeners.popupWindowUpdated = async function (updatedTabId, changeInfo, tab) {
    console.log("[★event fired] chrome.tabs.onUpdated");
    await TabToPopup.init();

    if (TabToPopup.popupWindows.length === 0) return;
    for (let i = 0; i < TabToPopup.popupWindows.length; i++) {
        if (tab.windowId === TabToPopup.popupWindows[i].windowId) {
            console.log(`tab [${updatedTabId}] updated. try execute script`);
            TabToPopup.executeScript(updatedTabId);
        }
    }
};


Listeners.popupWindowBoundsChanged = async function (win) {
    console.log("[★event fired] chrome.windows.onBoundsChanged");
    await TabToPopup.init();
    
    for(const popupWindow of TabToPopup.popupWindows){
        if(win.id === popupWindow.windowId){
            const tab = ( await chrome.windows.get(win.id, {populate:true}) ).tabs[0];
            const bounds = { left:win.left, top:win.top, width:win.width, height:win.height };
            popupWindow.bounds = bounds;
            await setSetting("popupWindows", TabToPopup.popupWindows);
        }
    }
};


TabToPopup.init = async function () {
    if(!TabToPopup.isInitialized){
        console.log("TabToPopup Initialize start");
        TabToPopup.isInitialized = true;
        TabToPopup.popupWindows.length = 0;
        TabToPopup.prevBoundsList.length = 0;
        await TabToPopup.loadPopupWindowList();
        this.prevBoundsList = await getSetting("prevBoundsList");
        await this.initContextMenu();
        // 一覧にポップアップウィンドウが無い場合
        // onUpdated, onBoundsChanged イベントリスナーを削除(不要なServiceWorkerの起動を抑えるため)
        if(TabToPopup.popupWindows.length === 0){
            chrome.tabs.onUpdated.removeListener(Listeners.popupWindowUpdated);
            console.log("[(-)remove listener] chrome.tabs.onUpdated")
            chrome.windows.onBoundsChanged.removeListener(Listeners.popupWindowBoundsChanged);
            console.log("[(-)remove listener] chrome.windows.onBoundsChanged")
        }
        console.log("TabToPopup.isInitialized = " + TabToPopup.isInitialized);
    }
};


TabToPopup.initEvents = function () {
    console.log("[function start] TabToPopup.initEvents()");

    // 拡張機能アイコンクリック時
    chrome.action.onClicked.addListener(async () => {
        console.log("[★event fired] chrome.action.onClicked (extension icon clicked)");
        await TabToPopup.init();
        TabToPopup.createPopupWindow(null, -1);
    });

    // コンテキストメニュークリック時
    chrome.contextMenus.onClicked.addListener( async (info, tab) => {
        console.log("[★event fired] chrome.contextMenus.onClicked");
        await TabToPopup.init();

        if (info.menuItemId === "openFromLinks") {
            TabToPopup.createPopupWindow(info.linkUrl, -1);
            return;
        }
        for (let i = 0; i < TabToPopup.bookmarkNum; i++) {
            if (info.menuItemId === "openBookmark_" + i) {
                const url = await getSetting(`bookmark_url_${i}`);
                if (url) { TabToPopup.createPopupWindow(url, i); }
            }
        }
    });

    // メッセージ受信時
    chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => { // chrome.runtime.onMessage.addListenerにasync関数は仕様上避けるべき。then構文はok
        console.log("[★event fired] chrome.runtime.onMessage. request:", request);
        if (request.name === "TabToPopup_Command") {
            switch (request.command) {
                case "initContextMenu":
                    TabToPopup.initContextMenu().then( () => {
                        sendResponse({ result: "OK" });
                    });
                    return true;
                default:
                    return false;
            }
        }
    });

    // ウインドウクローズ時
    chrome.windows.onRemoved.addListener(async function(windowId){
        console.log("[★event fired] chrome.windows.onRemoved");
        // このイベント時だけは、初期化関数を呼ぶ前に、位置サイズの保存処理を行う(先に初期化処理を行うと、閉じたウインドウがリストから消えてしまう)
        TabToPopup.popupWindows   = await getSetting("popupWindows");   // SW終了していた場合に必要
        TabToPopup.prevBoundsList = await getSetting("prevBoundsList"); // "
        for(const popupWindow of TabToPopup.popupWindows){
            if(popupWindow.windowId === windowId){
                // 閉じたウインドウの矩形情報をリストとストレージに保存
                if(popupWindow.bounds){
                    const existing = TabToPopup.prevBoundsList
                                      .find( b => b.bookmarkIndex === popupWindow.bookmarkIndex);
                    if(existing) existing.bounds = popupWindow.bounds;
                    else TabToPopup.prevBoundsList
                                   .push({ bookmarkIndex: popupWindow.bookmarkIndex, bounds : popupWindow.bounds });
                    console.log(`window bounds saved. bookmarkIndex:${popupWindow.bookmarkIndex}, bounds:`, popupWindow.bounds);
                    await setSetting("prevBoundsList", TabToPopup.prevBoundsList);
                }

                // 閉じたウインドウをポップアップウインドウリストから削除。ストレージも更新
                const index = TabToPopup.popupWindows.indexOf(popupWindow);
                TabToPopup.popupWindows.splice(index, 1);
                await setSetting("popupWindows", TabToPopup.popupWindows);
                console.log(`window(id:${windowId}) removed. remaining windows:`, TabToPopup.popupWindows);
                break;
            }
        }

        await TabToPopup.init();
    });

    // インストール時(拡張機能の更新時、再読み込み時にも呼ばれる)
    chrome.runtime.onInstalled.addListener(async(details) => {
        console.log("[★event fired] chrome.runtime.onInstalled");
        console.log(details);
        await TabToPopup.init();
    });

    // -------------------------------------------
    // 以下、動的なイベントリスナー(ここ以外でも追加、不要になれば削除する)

    // ページ更新時(ポップアップウィンドウ以外も対象)
    chrome.tabs.onUpdated.addListener(Listeners.popupWindowUpdated);
    console.log("[(+)add listener] chrome.tabs.onUpdated")

    // ウインドウ位置とサイズ変更時、その値を保存する
    chrome.windows.onBoundsChanged.addListener(Listeners.popupWindowBoundsChanged);
    console.log("[(+)add listener] chrome.windows.onBoundsChanged")

};


TabToPopup.initContextMenu = async function () {
    console.log("[function start] TabToPopup.initContextMenu");
    // リンク上のコンテキストメニューを初期化
    await chrome.contextMenus.removeAll();
    const addRightClickMenu = await getSetting('addRightClickMenu');
    if (addRightClickMenu) {
        chrome.contextMenus.create({
            title: "open in popup window",
            type: "normal",
            id: "openFromLinks",
            contexts: ["link"]
        });
    }

    // アイコン上の右クリックメニューを初期化
    for (let i = 0; i < TabToPopup.bookmarkNum; i++) {
        const url = await getSetting(`bookmark_url_${i}`);
        if (url) {
            const name = await getSetting(`bookmark_name_${i}`);
            chrome.contextMenus.create({
                title: name || `Bookmark ${i}`,
                type: "normal",
                id: "openBookmark_" + i,
                contexts: ["action"]
            });
        }
    }
};


TabToPopup.loadPopupWindowList = async function () {
    console.log("[function start] TabToPopup.loadPopupWindowList");
    const loadedPopupWindowList = await getSetting("popupWindows");
    console.log("loaded popup window list : ", loadedPopupWindowList);

    // ストレージから読み込んだウインドウが、実際に今存在しているのかチェックし、存在しているものだけをリストに追加
    const windowList = await chrome.windows.getAll({ populate: true });
    for (const loadedPopupWindow of loadedPopupWindowList) {
        for (const window of windowList) {
            if (loadedPopupWindow.windowId === window.id) {
                TabToPopup.popupWindows.push(loadedPopupWindow);
                break;
            }
        }
    }
    console.log("existing popup window list : " ,TabToPopup.popupWindows);

    // ストレージ更新
    await setSetting("popupWindows", TabToPopup.popupWindows);
};


TabToPopup.createPopupWindow = async function (linkUrl, bookmarkIndex) {
    console.log("[function start] TabToPopup.createPopupWindow");
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
    const _url = linkUrl || tabs[0].url;

    // デフォルト位置・サイズの定義(Null指定するとChromeで自動決定される)
    const defaultBounds = {
        left:   null,
        top:    null,
        width:  Math.floor(tabs[0].width  * 2 / 3),
        height: Math.floor(tabs[0].height * 2 / 3)
    }

    // ウインドウ位置とサイズ
    let newWndBounds = defaultBounds;
    
    // 記憶されたウインドウ位置とサイズの復元
    const useSavedBounds =
        bookmarkIndex >= 0
        ? (await getSetting(`bookmark_saveBounds_${bookmarkIndex}`)) ? bookmarkIndex : null  // ブックマークからのウインドウ
        : (await getSetting('saveWindowBounds')) ? -1 : null; // 通常のウインドウ
    if (useSavedBounds !== null) {
        const prev = this.prevBoundsList.find(b => b.bookmarkIndex === useSavedBounds);
        if (prev?.bounds) newWndBounds = prev.bounds;
    }

    // 明示的にウインドウ位置・サイズを指定(ブックマークの場合は除外)
    if(bookmarkIndex < 0){
        if (await getSetting('specifyWindowPos')) {
            newWndBounds.left = Number( await getSetting('popupWindowPosX') );
            newWndBounds.top  = Number( await getSetting('popupWindowPosY') );
        }
        if (await getSetting('specifyWindowSize')) {
            newWndBounds.width  = Number.parseInt( await getSetting("popupWindowWidth") );
            newWndBounds.height = Number.parseInt( await getSetting("popupWindowHeight") );
        }
    }

    // 作成
    console.log(`open:${_url} bookmarkIndex:${bookmarkIndex} bounds:`, newWndBounds);
    let newWindow;
    try{
        newWindow = await chrome.windows.create({ url: _url, focused: true, type: 'popup', ...newWndBounds });
    }catch(e){
        // 失敗した場合、デフォルト位置・サイズで再生成する
        console.warn(e);
        console.warn("Failed to create the window. Retrying with default bounds");
        newWndBounds = defaultBounds;
        newWindow = await chrome.windows.create({ url: _url, focused: true, type: 'popup', ...newWndBounds });
    }

    // 作成したポップアップウィンドウの情報を一覧に追加
    const popupWindowInfo = {
        windowId : newWindow.id,
        bookmarkIndex : bookmarkIndex ?? -1
    }
    TabToPopup.popupWindows.push(popupWindowInfo);

    // Service Worker が終了すると popupWindows の内容が失われるため、ストレージに保存
    await setSetting("popupWindows", TabToPopup.popupWindows );

    // 設定により、現在表示中のページを閉じる
    if (!linkUrl) {
        const closeOrgWindow = await getSetting('closeOrgWindow');
        if (closeOrgWindow) {
            chrome.tabs.remove(tabs[0].id);
        }
    }

    // ポップアップウィンドウの監視を開始
    chrome.tabs.onUpdated.addListener(Listeners.popupWindowUpdated);
    console.log("[(+)add listener] chrome.tabs.onUpdated")
    chrome.windows.onBoundsChanged.addListener(Listeners.popupWindowBoundsChanged);
    console.log("[(+)add listener] chrome.windows.onBoundsChanged")
};


TabToPopup.executeScript = async function (tabId) {
    // 繰り返し呼び出された場合は1sec以上の間隔を要求するようにする(タイマーを利用)
    clearTimeout(TabToPopup.timerID); 
    TabToPopup.timerID = setTimeout(async function () {
        const hideScrollBar = await getSetting('hideScrollBar');
        const insertCSS     = await getSetting('insertCSS');

        // タブの存在チェック
        try {
            const tab = await chrome.tabs.get(tabId);
        } catch (error) {
            console.warn(`target tab (id: ${tabId} ) is not found`);
            return; // タブが存在しない
        }

        if (hideScrollBar) {
            console.log("hideScrollBar.js execute...");
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["hideScrollBar.js"]
            });
        }

        if (insertCSS) {
            console.log("insertCSS...");
            const cssCode = await getSetting('cssCode');
            chrome.scripting.insertCSS({
                target: { tabId: tabId },
                css: cssCode || ""
            });
        }
    }, 1000);
};


// .addListener()は Service Worker 起動直後に完了させる(.addListener() の前に await すると、イベント発火に間に合わない)
TabToPopup.initEvents();




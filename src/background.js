
import { getSetting, setSetting } from './settings.js';


const TabToPopup = {
    currentTab: null,
    popupWindows: [],
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
        if (updatedTabId === TabToPopup.popupWindows[i].tabs[0].id) {
            console.log(`tab [${updatedTabId}] updated. try execute script`);
            TabToPopup.executeScript(TabToPopup.popupWindows[i].tabs[0].id);
        }
    }
};


TabToPopup.init = async function () {
    console.log("[function start] TabToPopup.init()");
    console.log("TabToPopup.isInitialized = " + TabToPopup.isInitialized);
    if(!TabToPopup.isInitialized){
        TabToPopup.isInitialized = true;
        await TabToPopup.loadPopupWindowList();
        await this.initContextMenu();
        // 一覧にポップアップウィンドウが無い場合は、onUpdatedイベントリスナーを削除(不要なServiceWorkerの起動を抑えるため)
        if(TabToPopup.popupWindows.length === 0){
            chrome.tabs.onUpdated.removeListener(Listeners.popupWindowUpdated);
            console.log("[(-)remove listener] chrome.tabs.onUpdated")
        }
    }

    console.log("[function end] TabToPopup.init()");
};


TabToPopup.initEvents = function () {
    console.log("[function start] TabToPopup.initEvents()");

    // 拡張機能アイコンクリック時
    chrome.action.onClicked.addListener(async () => {
        console.log("[★event fired] chrome.action.onClicked (extension icon clicked)");
        await TabToPopup.init();
        TabToPopup.createPopupWindow();
    });
    console.log("[(+)add listener] chrome.action.onClicked (extension icon clicked)")

    // コンテキストメニュークリック時
    chrome.contextMenus.onClicked.addListener( async (info, tab) => {
        console.log("[★event fired] chrome.contextMenus.onClicked");
        await TabToPopup.init();

        if (info.menuItemId === "openFromLinks") {
            TabToPopup.createPopupWindow(info.linkUrl);
            return;
        }
        for (let i = 0; i < TabToPopup.bookmarkNum; i++) {
            if (info.menuItemId === "openBookmark_" + i) {
                const url = await getSetting(`bookmark_url_${i}`);
                if (url) { TabToPopup.createPopupWindow(url, i); }
            }
        }
    });
    console.log("[(+)add listener] chrome.contextMenus.onClicked")

    // メッセージ受信時
    chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => { // chrome.runtime.onMessage.addListenerにasync関数は仕様上避けるべき。then構文はok
        console.log("[★event fired] chrome.runtime.onMessage");
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
        // TabToPopup.init().then( () => {
        // });
    });
    console.log("[(+)add listener] chrome.runtime.onMessage")

    // ページ更新時(ポップアップウィンドウ以外も対象)
    chrome.tabs.onUpdated.addListener(Listeners.popupWindowUpdated);
    console.log("[(+)add listener] chrome.tabs.onUpdated")

    // インストール時(拡張機能の更新時、再読み込み時にも呼ばれる)
    chrome.runtime.onInstalled.addListener(async(details) => {
        console.log("[★event fired] chrome.runtime.onInstalled");
        console.log(details);
        await TabToPopup.init();
    });
    console.log("[(+)add listener] chrome.runtime.onInstalled")
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

    console.log("[function end] TabToPopup.initContextMenu");
};


TabToPopup.loadPopupWindowList = async function () {
    console.log("[function start] TabToPopup.loadPopupWindowList");
    const result = await getSetting("WindowObjects");
    const tempArray = result ? JSON.parse(result) : [];

    // ストレージから読み込んだウインドウが、実際に今存在しているのかチェック
    const windowList = await chrome.windows.getAll({ populate: true });
    for (const temp of tempArray) {
        for (const wnd of windowList) {
            if (temp.id === wnd.id) {
                TabToPopup.popupWindows.push(wnd);
                break;
            }
        }
    }
    console.log("loaded popup window count : " + TabToPopup.popupWindows.length);
    console.log(TabToPopup.popupWindows);

    // 実際に存在するウインドウが無いなら、ストレージを空にする
    if(TabToPopup.popupWindows.length === 0){
        await setSetting("WindowObjects", null);
    }

    console.log("[function end] TabToPopup.loadPopupWindowList");
};


TabToPopup.createPopupWindow = async function (linkUrl, bookmarkIndex) {
    console.log("[function start] TabToPopup.createPopupWindow");
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
    TabToPopup.currentTab = tabs[0];
    const _url = linkUrl || tabs[0].url;

    // ウインドウサイズ
    let popupWndWidth, popupWndHeight;

    // 明示的にウインドウサイズを指定
    if (Number.isInteger(bookmarkIndex)) {
        // ブックマーク設定による指定
        popupWndWidth  = Number.parseInt( await getSetting(`bookmark_width_${bookmarkIndex}`) );
        popupWndHeight = Number.parseInt( await getSetting(`bookmark_height_${bookmarkIndex}`) );
    } else {
        // アプリ設定による指定
        const specifyWindowSize = await getSetting('specifyWindowSize');
        if (specifyWindowSize) {
            popupWndWidth   = Number.parseInt( await getSetting("popupWindowWidth") );
            popupWndHeight  = Number.parseInt( await getSetting("popupWindowHeight") );
        }
    }

    // 数値が未定義もしくは不正な場合のデフォルトサイズ
    if (!Number.isInteger(popupWndWidth) || popupWndWidth <= 0)   popupWndWidth  = Math.floor(tabs[0].width  * 2 / 3);
    if (!Number.isInteger(popupWndHeight) || popupWndHeight <= 0) popupWndHeight = Math.floor(tabs[0].height * 2 / 3);


    // ウインドウ位置
    let popupWndPosX, popupWndPosY;

    // 明示的にウインドウ位置を指定
    if (Number.isInteger(bookmarkIndex)) {
        // ブックマーク設定による指定
        popupWndPosX = Number.parseInt( await getSetting(`bookmark_posX_${bookmarkIndex}`) );
        popupWndPosY = Number.parseInt( await getSetting(`bookmark_posY_${bookmarkIndex}`) );
    } else {
        // アプリ設定による指定
        const specifyWindowPos = await getSetting('specifyWindowPos');
        if (specifyWindowPos) {
            popupWndPosX = await getSetting('popupWindowPosX');
            popupWndPosY = await getSetting('popupWindowPosY');
        }
    }

    // 数値が未定義もしくは不正な場合はNull指定(Chromeで自動決定される)
    if (!Number.isInteger(popupWndPosX)) popupWndPosX = null;
    if (!Number.isInteger(popupWndPosY)) popupWndPosY = null;

    // 作成
    console.log(`open: ${_url} width: ${popupWndWidth} height: ${popupWndHeight} posx: ${popupWndPosX} posy: ${popupWndPosY}`);
    const newWindow = await chrome.windows.create({
        url: _url,
        focused: true,
        type: 'popup',
        width: popupWndWidth,
        height: popupWndHeight,
        left: popupWndPosX,
        top: popupWndPosY
    });

    // 作成したポップアップウィンドウを一覧に追加
    TabToPopup.popupWindows.push(newWindow);

    // Service Worker が終了すると popupWindows の内容が失われるため、現在のウィンドウ一覧をストレージに保存
    await setSetting("WindowObjects", JSON.stringify(TabToPopup.popupWindows) );

    // 設定により、現在表示中のページを閉じる
    if (!linkUrl) {
        const closeOrgWindow = await getSetting('closeOrgWindow');
        if (closeOrgWindow) {
            chrome.tabs.remove(TabToPopup.currentTab.id);
        }
    }

    // ポップアップウィンドウの監視を開始
    chrome.tabs.onUpdated.addListener(Listeners.popupWindowUpdated);
    console.log("[(+)add listener] chrome.tabs.onUpdated")

    console.log("[function end] TabToPopup.createPopupWindow");
};


TabToPopup.executeScript = async function (tabId) {
    // 繰り返し呼び出された場合は1sec以上の間隔を要求するようにする(タイマーを利用)
    clearTimeout(TabToPopup.timerID); 
    TabToPopup.timerID = setTimeout(async function () {
        const hideScrollBar = await getSetting('hideScrollBar');
        const insertCSS     = await getSetting('insertCSS');

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




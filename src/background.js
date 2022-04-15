
var TabToPopup = {
    currentTab : null,
    popupWindows : new Array(),
    timerID : 0,
    bookmarkNum : 20
};



TabToPopup.init = function(){
    this.initEvents();
    this.loadParameter();
    this.initContextMenu();
    this.initMessage();
}



TabToPopup.executeScript = function(tabId){
    clearTimeout(TabToPopup.timerID); //何度も実行されるのを軽減するためのタイマー
    TabToPopup.timerID = setTimeout(function(){
        if(localStorage.getItem("opt_hideScrollBar")?JSON.parse(localStorage.getItem("opt_hideScrollBar")):true){
            chrome.tabs.executeScript(tabId, {
                file: "executeScript.js",
                allFrames: false
            });
            //console.log("executeScript"); 
        }
        if(localStorage.getItem("opt_insertCSS")?JSON.parse(localStorage.getItem("opt_insertCSS")):false){
            console.log("insert css");
            var code = localStorage.getItem("opt_cssCode")?localStorage.getItem("opt_cssCode"):"";
            chrome.tabs.insertCSS(tabId, {
                code: code,
                allFrames: true
            });
        }
    }, 1000);
}



TabToPopup.callback_onCompleted = function(details){
    //console.log(TabToPopup.popupWindows);
    if(TabToPopup.popupWindows.length == 0){return;}
    for(var i=0; i< TabToPopup.popupWindows.length; i++){
        if (details.tabId == TabToPopup.popupWindows[i].tabs[0].id) {
            TabToPopup.executeScript(TabToPopup.popupWindows[i].tabs[0].id);
            return;
        }
    }
    
}



TabToPopup.initEvents = function(){
    // browserAction onClicked
    chrome.browserAction.onClicked.addListener(function(tab){
        TabToPopup.createPopupWindow();
        
    });
    // on window removed
    chrome.windows.onRemoved.addListener(function(windowId){
        for(var i=0; i<TabToPopup.popupWindows.length; i++){
            if(TabToPopup.popupWindows[i].id == windowId){
                TabToPopup.popupWindows.splice(i, 1);
                break;
            }
        }
        if(TabToPopup.popupWindows.length == 0){TabToPopup.Quit();}     
    });
    // on contextmenu clicked
    function getClickHandler() {
        return function(info, tab) {
            if(info.menuItemId == "openFromLinks"){
                TabToPopup.createPopupWindow(info.linkUrl);
                return;
            }
            for (var i = 0; i < TabToPopup.bookmarkNum; ++i) {
                if(info.menuItemId == "openBookmark_" + i.toString() ){
                    if(localStorage.getItem("opt_bookmark_url_" + i.toString() )){
                        // console.log('opt_bookmark_url_'    + i.toString() + ' : ' + localStorage.getItem("opt_bookmark_url_" + i.toString()) );
                        // console.log('opt_bookmark_width_'  + i.toString() + ' : ' + localStorage.getItem("opt_bookmark_width_" + i.toString()) );
                        // console.log('opt_bookmark_height_' + i.toString() + ' : ' + localStorage.getItem("opt_bookmark_height_" + i.toString()) );
                        // console.log('opt_bookmark_posX_'   + i.toString() + ' : ' + localStorage.getItem("opt_bookmark_posX_" + i.toString()) );
                        // console.log('opt_bookmark_posY_'   + i.toString() + ' : ' + localStorage.getItem("opt_bookmark_posY_" + i.toString()) );
                        TabToPopup.createPopupWindow(
                            localStorage.getItem("opt_bookmark_url_" + i.toString() ),
                            Number.parseInt( localStorage.getItem("opt_bookmark_width_"  + i.toString()) ),
                            Number.parseInt( localStorage.getItem("opt_bookmark_height_" + i.toString()) ),
                            Number.parseInt( localStorage.getItem("opt_bookmark_posX_"   + i.toString()) ),
                            Number.parseInt( localStorage.getItem("opt_bookmark_posY_"   + i.toString()) ),
                            );   
                    }
                }
            }  
        };
    };
    chrome.contextMenus.onClicked.addListener(getClickHandler());
    
}



TabToPopup.createPopupWindow = function(linkUrl, width, height, posX, posY){
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        // console.log('url :' + linkUrl);
        // console.log('width :' + width);
        // console.log('height :' + height);
        // console.log('pos x :' + posX);
        // console.log('pos y :' + posY);

        TabToPopup.currentTab = tabs[0];
        var _url;
        if(linkUrl){
            _url = linkUrl;
        }else{
            _url = tabs[0].url;
        }

        // default window size
        var popupWndWidth =  Math.floor( tabs[0].width  * 2 / 3 );
        var popupWndHeight = Math.floor( tabs[0].height * 2 / 3 );
        
        // specified window size
        if (Number.isInteger(width) || Number.isInteger(height)){
            if(Number.isInteger(width)  && width  >= 0) popupWndWidth  = width;
            if(Number.isInteger(height) && height >= 0) popupWndHeight = height;
        }
        else if(localStorage.getItem("opt_specifyWindowSize")?JSON.parse(localStorage.getItem("opt_specifyWindowSize")):false){
            width  = Number.parseInt( localStorage.getItem("opt_popupWindowWidth") );
            height = Number.parseInt( localStorage.getItem("opt_popupWindowHeight") );
            popupWndWidth  = Number.isInteger(width)  && width  >= 0 ? width  : 640;
            popupWndHeight = Number.isInteger(height) && height >= 0 ? height : 480;
        }
        
        // default window pos
        var popupWndPosX = null;
        var popupWndPosY = null;

        // specified window pos
        if (Number.isInteger(posX) || Number.isInteger(posY)){
            popupWndPosX = Number.isInteger(posX) ? posX : null;
            popupWndPosY = Number.isInteger(posY) ? posY : null;
        }
        else if(localStorage.getItem("opt_specifyWindowPos")?JSON.parse(localStorage.getItem("opt_specifyWindowPos")):false){
            popupWndPosX = Number(localStorage.getItem("opt_popupWindowPosX") );
            popupWndPosY = Number(localStorage.getItem("opt_popupWindowPosY") );
        }
        
        // create
        chrome.windows.create({
            url     : _url,
            focused : true,
            type    : 'popup',
            width   : popupWndWidth,
            height  : popupWndHeight,
            left    : popupWndPosX,
            top     : popupWndPosY,
        },function(newWindow){
            // keep newWindow obj
            TabToPopup.popupWindows.push(newWindow);
            localStorage.setItem("WindowObjects", JSON.stringify(TabToPopup.popupWindows));
            // on webNavigation Completed
            chrome.webNavigation.onCompleted.addListener(TabToPopup.callback_onCompleted);
            // remove current window
            if(linkUrl){return;}
            if(localStorage.getItem("opt_closeOrgWindow")?JSON.parse(localStorage.getItem("opt_closeOrgWindow")):true){
                chrome.tabs.remove(TabToPopup.currentTab.id, function(){});
            }
        });
    });
}



TabToPopup.initContextMenu = function(){
    //remove
    chrome.contextMenus.removeAll(function(){});
    //create menu on link
    if(localStorage.getItem("opt_addRightClickMenu")?JSON.parse(localStorage.getItem("opt_addRightClickMenu")):false){
        chrome.contextMenus.create({
            title : "open in popup window",
            type : "normal",
            id : "openFromLinks",
            contexts : ["link"]
        });
    }
    //create menu on Icon right-click menu
    for (var i = 0; i < TabToPopup.bookmarkNum; ++i) {
        if(localStorage.getItem("opt_bookmark_url_" + i.toString() ) ){
            var url = localStorage.getItem("opt_bookmark_url_" + i.toString());
            if(url.length > 0){
                chrome.contextMenus.create({
                    title : localStorage.getItem("opt_bookmark_name_" + i.toString()),
                    type : "normal",
                    id : "openBookmark_" + i.toString(),
                    parentId: null,
                    contexts : ["browser_action"]
                });
                
            }
        }
    }
    
}



TabToPopup.Quit = function(){
    //console.log("try to remove Listener");
    chrome.webNavigation.onCompleted.removeListener(TabToPopup.callback_onCompleted);
    localStorage.removeItem("WindowObjects");
}



TabToPopup.loadParameter = function(){
    var tempArray = new Array();
    if(localStorage.getItem("WindowObjects")){
        tempArray = JSON.parse(localStorage.getItem("WindowObjects"));
    }
    else{ return;}
    //check ローカルストレージから読み込んだウインドウが、実際に今存在しているのか
    chrome.windows.getAll({populate:true}, function(windowList){
        for(var i=0; i<tempArray.length; i++){
            for(j=0; j<windowList.length; j++){
                if(tempArray[i].id == windowList[j].id ){
                    TabToPopup.popupWindows.push(windowList[j]);
                    break;
                }
            }
        }
    });
}



TabToPopup.initMessage = function(){
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.name === "TabToPopup_Command") {
            switch(request.command){
            case "initContextMenu":
                TabToPopup.initContextMenu();
                break;
            default:
                break;
            }
        }
    });
}



TabToPopup.init();



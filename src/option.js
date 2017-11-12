
// General
document.getElementById("closeOrgWindow").onclick = function(){
    localStorage.setItem("opt_closeOrgWindow", JSON.stringify(document.getElementById("closeOrgWindow").checked));
}

document.getElementById("hideScrollBar").onclick = function(){
    localStorage.setItem("opt_hideScrollBar", JSON.stringify(document.getElementById("hideScrollBar").checked));
}

document.getElementById("addRightClickMenu").onclick = function(){
    localStorage.setItem("opt_addRightClickMenu", JSON.stringify(document.getElementById("addRightClickMenu").checked));
    chrome.runtime.sendMessage({
        name: "TabToPopup_Command",
        command:"initContextMenu"
    }, function(response) {});
}


// insertCSS
document.getElementById("insertCSS").onclick = function(){
    localStorage.setItem("opt_insertCSS", JSON.stringify(document.getElementById("insertCSS").checked));
}

document.getElementById("cssCode").onchange = function(){
    //console.log(this);
    if(this.value != ""){
        localStorage.setItem("opt_cssCode", document.getElementById("cssCode").value);
    }else{
        localStorage.removeItem("opt_cssCode");
    }
}
//use tab key (http://d.hatena.ne.jp/hokaccha/20111028/1319814792)
document.getElementById("cssCode").addEventListener("keydown", function(e) {
    if (e.keyCode === 9) {
        e.preventDefault();
        var elem = e.target;
        var val = elem.value;
        var pos = elem.selectionStart;
        elem.value = val.substr(0, pos) + '\t' + val.substr(pos, val.length);
        elem.setSelectionRange(pos + 1, pos + 1);
    }
});

// specify popup window size
document.getElementById("specifyWindowSize").onclick = function(){
    var b = document.getElementById("specifyWindowSize").checked;
    localStorage.setItem("opt_specifyWindowSize", JSON.stringify(b));
    document.getElementById("popupWindowWidth").disabled = !b;
    document.getElementById("popupWindowHeight").disabled = !b;
}
document.getElementById("popupWindowWidth").onchange = function(){
    localStorage.setItem("opt_popupWindowWidth", document.getElementById("popupWindowWidth").value);
}
document.getElementById("popupWindowHeight").onchange = function(){
    localStorage.setItem("opt_popupWindowHeight", document.getElementById("popupWindowHeight").value);
}


// Add the following sites to the right-click menu on the icon
var textBox_bookmark_name = document.getElementsByName("bookmark_name");
var textBox_bookmark_name_onchange = function(i){
    return function(){
        localStorage.setItem("opt_bookmark_name_" + i.toString(), textBox_bookmark_name[i].value);
        chrome.runtime.sendMessage({
            name: "TabToPopup_Command",
            command:"initContextMenu"
        }, function(response) {});
    }
}
for (var i = 0; i < textBox_bookmark_name.length; ++i) {
    textBox_bookmark_name[i].onchange = textBox_bookmark_name_onchange(i);
}


var textBox_bookmark_url = document.getElementsByName("bookmark_url");
var textBox_bookmark_url_onchange = function(i){
    return function(){
        localStorage.setItem("opt_bookmark_url_" + i.toString(), textBox_bookmark_url[i].value);
        chrome.runtime.sendMessage({
            name: "TabToPopup_Command",
            command:"initContextMenu"
        }, function(response) {});
    }
}
for (var i = 0; i < textBox_bookmark_url.length; ++i) {
    textBox_bookmark_url[i].onchange = textBox_bookmark_url_onchange(i);
}



// onload
document.body.onload = function(){
    
    if(localStorage.getItem("opt_closeOrgWindow")){
        document.getElementById("closeOrgWindow").checked = JSON.parse( localStorage.getItem("opt_closeOrgWindow") );
    }
    if(localStorage.getItem("opt_hideScrollBar")){
        document.getElementById("hideScrollBar").checked = JSON.parse( localStorage.getItem("opt_hideScrollBar") );
    }
    if(localStorage.getItem("opt_addRightClickMenu")){
        document.getElementById("addRightClickMenu").checked = JSON.parse( localStorage.getItem("opt_addRightClickMenu") );
    }
    if(localStorage.getItem("opt_insertCSS")){
        document.getElementById("insertCSS").checked = JSON.parse( localStorage.getItem("opt_insertCSS") );
    }
    if(localStorage.getItem("opt_cssCode")){
        document.getElementById("cssCode").value = localStorage.getItem("opt_cssCode");
    }
    if(localStorage.getItem("opt_specifyWindowSize")){
        document.getElementById("specifyWindowSize").checked = JSON.parse( localStorage.getItem("opt_specifyWindowSize") );
    }
    if(localStorage.getItem("opt_popupWindowWidth")){
        document.getElementById("popupWindowWidth").value = localStorage.getItem("opt_popupWindowWidth");
    }
    if(localStorage.getItem("opt_popupWindowHeight")){
        document.getElementById("popupWindowHeight").value = localStorage.getItem("opt_popupWindowHeight");
    }

    // bookmarks
    for (var i = 0; i < textBox_bookmark_name.length; ++i) {
        if(localStorage.getItem("opt_bookmark_name_" + i.toString() )){
            textBox_bookmark_name[i].value = localStorage.getItem("opt_bookmark_name_" + i.toString() );
        }
        
    }
    for (var i = 0; i < textBox_bookmark_url.length; ++i) {
        if(localStorage.getItem("opt_bookmark_url_" + i.toString() )){
            textBox_bookmark_url[i].value = localStorage.getItem("opt_bookmark_url_" + i.toString() );
        }
        
    }
}

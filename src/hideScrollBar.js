
var timerID = 0;

var initialize = function(){
	
	if (document.body == null || window.outerWidth < 1) { 
		return;
	}
    
    //scrollBar
	hideScrollBar();
	
	//init events
	document.body.onmouseover = function(){
		showScrollBar();
	}
	
	document.body.addEventListener("mousewheel", function(){
		showScrollBar();
	});
	
	
	window.onscroll = function(){
		showScrollBar();
	}
	
}

var hideScrollBar = function(){
	clearTimeout(timerID);
	timerID = setTimeout(function(){
		var htmlElement = document.getElementsByTagName("html")[0];
		htmlElement.style.cssText = "overflow:hidden !important";
	}, 2500);
}

var showScrollBar = function(){
	var htmlElement = document.getElementsByTagName("html")[0];
	htmlElement.style.cssText = "overflow:auto !important";
	hideScrollBar();
}



initialize();

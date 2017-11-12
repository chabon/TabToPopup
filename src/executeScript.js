
//var cnt = 0;
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
		//console.log("mouse on" + cnt);
		//cnt += 1;
	}
	
	document.body.addEventListener("mousewheel", function(){
		//console.log("wheel");
		showScrollBar();
	});
	
	
	window.onscroll = function(){
		//console.log("scroll");
		showScrollBar();
	}
	
}

var hideScrollBar = function(){
	clearTimeout(timerID);
	timerID = setTimeout(function(){
		//document.body.style.overflow = "hidden";
		//document.body.style.cssText = "overflow:hidden !important";
		var htmlElement = document.getElementsByTagName("html")[0];
		htmlElement.style.cssText = "overflow:hidden !important";
	}, 2500);
}

var showScrollBar = function(){
	//document.body.style.overflow = "auto";
	//document.body.style.cssText = "overflow:auto !important";
	var htmlElement = document.getElementsByTagName("html")[0];
	htmlElement.style.cssText = "overflow:auto !important";
	hideScrollBar();
}



initialize();

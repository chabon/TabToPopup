
//executeScript.jsのinitialize関数で使用してた
//どうしても、styleSheets.item(i).cssRulesのリストが取得できない
//styleSheetsのリストはできてるが、hrefプロパティを持ち、外部cssを読み込んでるならcssRulesがnullに


var releaseFixedElements = function(){
	//extract all element
	//var tags = document.getElementsByTagName("*");
	//console.log(tags);
	// Get all elements that have a style attribute
 	var elementList = document.querySelectorAll('*[style]');
	console.log(elementList);
	for(var i=0; i<elementList.length; i++){
		if(elementList[i].style.position == "fixed"){
			console.log("hit!");
			console.log(elementList[i]);
		}
		//elementList[i].style.position = "absolute"
	}
	
	/* niconico
	var hoge = document.getElementById("siteHeader");
	console.log(hoge);
	console.log(hoge.style.position);
	hoge.style.position = "relative";
	*/
	
	//css operate
	console.log("sheets");
	console.log(document.styleSheets);
	for(var i=0; i<document.styleSheets.length; i++){
		var cssRules = document.styleSheets.item(i).cssRules;
		console.log("css rules");
		console.log(i);
		console.log(cssRules);
		if(cssRules){
			for(var j=0; j<cssRules.length; j++){
				if(cssRules.item(j).style.getPropertyValue("position") == "fixed"){
					console.log("css hit!");
					cssRules.item(j).style.setProperty("position","relative");
				}
			}
		}
		else{
			//console.log(document.styleSheets.item(i).styleSheet);
			if(document.styleSheets.item(i).href){
				 //document.styleSheets.item(i).getOwnerRule();
				 console.log("owner rule");
				 console.log(document.styleSheets.item(i).ownerRule);
				 //test
				 console.log(document.styleSheets.item(i).imports);
				
			}
		
		}
	}
	
	//
	console.log(document.styleSheets);
}
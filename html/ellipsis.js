dojo.provide("dojox.html.ellipsis");

dojo.require("dojo.behavior");

(function(d){
	if(d.isFF){
		// The delay (in ms) to wait so that we don't keep querying when many 
		// changes happen at once - set config "dojoxFFEllipsisDelay" if you
		// want a different value
		var delay = 1;
		if("dojoxFFEllipsisDelay" in d.config){
			delay = Number(d.config.dojoxFFEllipsisDelay);
			if(isNaN(delay)){
				delay = 1;
			}
		}
		
		// Create our stub XUL elements for cloning later
		var sNS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
		var xml = document.createElementNS(sNS, 'window');
		var label = document.createElementNS(sNS, 'description');
		label.setAttribute('crop', 'end');
		xml.appendChild(label);
		
		var createXULEllipsis = function(/* Node */ n){
			// Summary:
			//		Given a node, it creates the XUL and sets its
			//		content so that it will have an ellipsis
			var x = xml.cloneNode(true);
			x.firstChild.setAttribute('value', n.textContent);
			n.innerHTML = '';
			n.appendChild(x);
		};
		
		// Create our iframe elements for cloning later
		var create = d.create;
		var dd = d.doc;
		var dp = d.place;
		var iFrame = create("iframe", {className: "dojoxEllipsisIFrame",
					src: "javascript:'<html><head><script>if(\"loadFirebugConsole\" in window){window.loadFirebugConsole();}</script></head><body></body></html>'"});
		var rollRange = function(/* W3C Range */ r, /* int? */ cnt){
			// Summary:
			//		Rolls the given range back one character from the end
			//
			//	r: W3C Range
			//		The range to roll back
			//	cnt: int?
			//		An optional number of times to roll back (defaults 1)
			if(r.collapsed){
				// Do nothing - we are already collapsed
				return;
			}
			if(cnt > 0){
				do{
					rollRange(r);
					cnt--;
				}while(cnt);
				return;
			}
			if(r.endContainer.nodeType == 3 && r.endOffset > 0){
				r.setEnd(r.endContainer, r.endOffset - 1);
			}else if(r.endContainer.nodeType == 3){
				r.setEndBefore(r.endContainer);
				rollRange(r);
				return;
			}else if(r.endOffset && r.endContainer.childNodes.length >= r.endOffset){
				var nCont = r.endContainer.childNodes[r.endOffset - 1];
				if(nCont.nodeType == 3){
					r.setEnd(nCont, nCont.length - 1);
				}else if(nCont.childNodes.length){
					r.setEnd(nCont, nCont.childNodes.length);
					rollRange(r);
					return;
				}else{
					r.setEndBefore(nCont);
					rollRange(r);
					return;
				}
			}else{
				r.setEndBefore(r.endContainer);
				rollRange(r);
				return;
			}
		};
		var createIFrameEllipsis = function(/* Node */ n){
			// Summary:
			//		Given a node, it creates an iframe and and ellipsis div and
			//		sets up the connections so that they will work correctly.
			//		This function is used when createXULEllipsis is not able
			//		to be used (because there is markup within the node) - it's
			//		a bit slower, but does the trick
			var c = create("div", {className: "dojoxEllipsisContainer"});
			var e = create("div", {className: "dojoxEllipsisShown", style: {display: "none"}});
			n.parentNode.replaceChild(c, n);
			c.appendChild(n);
			c.appendChild(e);
			var i = iFrame.cloneNode(true);
			var ns = n.style;
			var es = e.style;
			var ranges;
			var resizeNode = function(){
				ns.display = "";
				es.display = "none";
				if(n.scrollWidth <= n.offsetWidth){ return; }
				var r = dd.createRange();
				r.selectNodeContents(n);
				ns.display = "none";
				es.display = "";
				var done = false;
				do{
					var numRolls = 1;
					dp(r.cloneContents(), e, "only");
					var sw = e.scrollWidth, ow = e.offsetWidth;
					done = (sw <= ow);
					var pct = (1 - ((ow * 1) / sw));
					if(pct > 0){
						numRolls = Math.max(Math.round(e.textContent.length * pct) - 1, 1);
					}
					rollRange(r, numRolls);
				}while(!r.collapsed && !done);
			};
			i.onload = function(){
				i.contentWindow.onresize = resizeNode;
				resizeNode();
			};
			c.appendChild(i);
		};

		// Add our behavior
		var b = d.behavior;
		var hc = d.hasClass;
		b.add({
			".dojoxEllipsis": function(n){
				if(n.textContent == n.innerHTML && !hc(n, "dojoxEllipsisSelectable")){
					// We can do the faster XUL version, instead of calculating
					createXULEllipsis(n);
				}else{
					createIFrameEllipsis(n);
				}
			}
		});
		
		d.addOnLoad(function(){
			// Apply our initial stuff
			b.apply();
			var t = null;
			var running = false;
			
			// Connect to the modified function so that we can catch
			// future changes
			d.connect(d.body(), "DOMSubtreeModified", function(){
				if(running){ 
					// We are in the process of applying - so we just return
					return;
				}
				if(t){ clearTimeout(t); }
				t = setTimeout(function(){
					t = null;
					running = true;
					b.apply();
					running = false;
				}, delay);
			});
		});
	}
})(dojo);
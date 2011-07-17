
// SmoothScroll v1.0.1
// Licensed under the terms of the MIT license.
// Balázs Galambosi (c) 2011

/**
 * A module for middle mouse scrolling.
 */
(function(window){

// local settings
var img = document.createElement("div"); // img at the reference point
img.setAttribute("class","scroller-vertical");
img.setAttribute("id","scroller-vertical");
document.body.appendChild(img);

var scrolling = false; // guards one phase
var enabled   = true; // from settings
var framerate = 400;

// we check the OS for default middlemouse behavior only!
var isLinux   = (navigator.platform.indexOf("Linux") != -1); 
 
/**
 * Shows the reference image, and binds event listeners for scrolling.
 * It also manages the animation.
 * @param {Object} event
 */
function mousedown(e) {    
    var isLink = false;
    var elem   = e.target;
    
    // linux middle mouse shouldn't be overwritten (paste)
    var linux = (isLinux && /input|textarea/i.test(elem.nodeName));
   
    do {
        isLink = isNodeName(elem, "a");
        if (isLink) break;
    } while (elem = elem.parentNode);
        
    elem = overflowingAncestor(e.target);
    
    // if it's not the middle button, or
    // it's being used on an <a> element
    // take the default action
    if (!elem || !enabled || e.button !== 1 || isLink || linux) {
        return true;
    }
    
    // we don't want the default by now
    e.preventDefault();
    
    // quit if there's an ongoing scrolling
    if (scrolling) {
        return false;
    }
    
    // set up a new scrolling phase
    scrolling = true;
 
    // reference point
    img.style.left = e.clientX - 24 + "px";
    img.style.top  = e.clientY - 24 + "px";    
    
    img.style.display = "block";
    
    var refereceX = e.clientX;
    var refereceY = e.clientY;

    var speedX = 0;
    var speedY = 0;
    
    // animation loop
    var last = +new Date;
    var delay = 1000 / framerate;
    var finished = false;
    
    requestFrame(function step(time){
        var now = time || +new Date;
        var elapsed = now - last;
        elem.scrollLeft += (speedX * elapsed) >> 0;
        elem.scrollTop  += (speedY * elapsed) >> 0;
        last = now;
        if (!finished) {
            requestFrame(step, elem, delay);
        }
    }, elem, delay);
    
    var first = true;

    function mousemove(e) {
        if (first) {
            addEvent("mouseup", remove);
            first = false;
        }
        speedX = (e.clientX - refereceX) * 10 / 1000;
        speedY = (e.clientY - refereceY) * 10 / 1000;
    }
    
    function remove(e) {
        removeEvent("mousemove", mousemove);
        removeEvent("mousedown", remove);
        removeEvent("mouseup", remove);
        removeEvent("keydown", remove);
        img.style.display = "none";
        scrolling = false;
        finished  = true;
    }
    
    addEvent("mousemove", mousemove);
    addEvent("mousedown", remove);
    addEvent("keydown", remove);
}

addEvent("mousedown", mousedown);

})(window);

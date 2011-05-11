// ------------------------------------------------------------------------------------------------
// Simplenote common functions.
// ------------------------------------------------------------------------------------------------

// global debug switch
var commonDebug = false;

function logGeneral(s,prefix,target) {
    if (!commonDebug)
        return;

    if (!target)
        target=console;
    if (!prefix)
        prefix="";

    if (typeof s == "string")
        target.log( prefix + '::' + s);
    else
        target.log(s);
}

function convertDate(serverDate) {
    return new Date(serverDate*1000);
}

function dateAgo(d) {
    var diffms = ((new Date()) - (new Date(d*1000)));
    var hrs = Math.floor(diffms/(1000*60*60));
    var mins = Math.floor((diffms % (1000*60*60))/(1000*60));
    var secs = Math.floor((diffms % (1000*60))/(1000));
    if (hrs==0)
        return (mins>0?mins + "m":"") + (secs + "s ") + "ago";
    else
        return (hrs>0?hrs + "h":"")+ (mins + "m ") + "ago";
}

function logNote(note) {
    console.log("NOTE s: " + note.syncnum + "v:" + note.version);
    console.log("created " + dateAgo(note.createdate) + ", modified " + dateAgo(note.modifydate));
    console.log("note is " + (note.deleted==1?"DELETED":"not deleted"));
    console.log(note);
}

function note2str(note, content) {
    var s = "";
/*
 *content: "asdfgghhhh↵↵fgghgg"
  createdate: "1302427972.910837"
deleted: 0
key: "agtzaW1wbGUtbm90ZXINCxIETm90ZRi-89kHDA"
minversion: 1
modifydate: "1302427972.910837"
syncnum: 6
systemtags: Array[0]
tags: Array[0]
version: 6
__proto__: Object*/
    s += "d:"+note.deleted;
    s += " s:"+note.syncnum;
    s += " v:"+note.version;
    s += " t:";
    if (note.tags)
        $.each(note.tags,function(i,e) {s+=e + " ";});
    s += " st:";
    if (note.systemtags)
        $.each(note.systemtags,function(i,e) {s+=e + " ";});
    s += " m:" + dateAgo(note.modifydate);
    s += " c:" + dateAgo(note.createdate);
    s += " <br> k:" + note.key;
    if (content) {
        if (note.content)
            s += "\n" + note.content;
        else
            s += "\n[note has no content]";
    }
    return s;
}

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
function mergeobj(obj1,obj2){
    var obj3 = {};
    for (attrname in obj1) {obj3[attrname] = obj1[attrname];}
    for (attrname in obj2) {obj3[attrname] = obj2[attrname];}
    return obj3;
}

/**
 * jQuery.fn.sortElements
 * --------------
 * @param Function comparator:
 *   Exactly the same behaviour as [1,2,3].sort(comparator)
 *
 * @param Function getSortable
 *   A function that should return the element that is
 *   to be sorted. The comparator will run on the
 *   current collection, but you may want the actual
 *   resulting sort to occur on a parent or another
 *   associated element.
 *
 *   E.g. $('td').sortElements(comparator, function(){
 *      return this.parentNode;
 *   })
 *
 *   The <td>'s parent (<tr>) will be sorted instead
 *   of the <td> itself.
 */
jQuery.fn.sortElements = (function(){

    var sort = [].sort;

    return function(comparator, getSortable) {

        getSortable = getSortable || function(){return this;};

        var placements = this.map(function(){

            var sortElement = getSortable.call(this),
                parentNode = sortElement.parentNode,

                // Since the element itself will change position, we have
                // to have some way of storing its original position in
                // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode(''),
                    sortElement.nextSibling
                );

            return function() {

                if (parentNode === this) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }

                // Insert before flag:
                parentNode.insertBefore(this, nextSibling);
                // Remove flag:
                parentNode.removeChild(nextSibling);

            };

        });

        return sort.call(this, comparator).each(function(i){
            placements[i].call(getSortable.call(this));
        });

    };

})();

function uiEvent(name,data) {
    if (name == undefined)
        throw "uiEvent must have name supplied"

    if (data == undefined || data.name)
        throw "uiEvent data must not be empty and must not have name field"

    data.name = name;
    chrome.extension.sendRequest(data);
}

function validateEmail(email)
{
 var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
 return email.match(re)
}

function openURLinTab(href) {
    chrome.tabs.create({url:href});
}

//  ---------------------------------------

function pad(n){
    return n<10 ? '0'+n : n
}

RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//function parseUrl2(data) {
//    var e=/((http|https):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+\.[^#?\s]+)(#[\w\-]+)?/;
//
//    if (data.match(e)) {
//        return  {url: RegExp['$&'],
//                protocol: RegExp.$2,
//                host:RegExp.$3,
//                path:RegExp.$4,
//                file:RegExp.$6,
//                hash:RegExp.$7};
//    }
//    else {
//        return  {url:"", protocol:"",host:"",path:"",file:"",hash:""};
//    }
//}

function get_manifest(callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(JSON.parse(xhr.responseText));
  };
  xhr.open('GET', '../manifest.json', true);
  xhr.send(null);
}

// jquery ":focus" selector
jQuery.expr[':'].focus = function( elem ) { return elem === document.activeElement && ( elem.type || elem.href );  };

function arrayEqual(arr1,arr2) {
    if (arr1.length != arr2.length)
        return false;

    for (var i in arr1)
        if (arr1[i]!=arr2[i])
            return false;

    return true;
}
// ------------------------------------------------------------------------------------------------
// Simplenote common functions.
// ------------------------------------------------------------------------------------------------

var extData = {
    syncpadManifest : undefined,
    
    webnoteregstr : "^SYNCPADWEBNOTE\\[(.*),(\\d+px),(\\d+px),(\\d+px)?,(\\d+px)?\\]$",
    
    debugFlags : {
        general     : true,
        popup       : true,
        popup2BG    : false,
        BG          : true,
        DB          : true,
        LS          : true,
        API         : true,
        CM          : true,
        Timestamp   : false,
        GA          : false,
        alertExc    : true,
        tictoc      : true
    },
    
    chromeVersion : undefined,
    
    webnotereg : undefined
}

extData.webnotereg = new RegExp(extData.webnoteregstr,"m")

function logGeneral(s,prefix,target) {
    if (!extData.debugFlags.general)
        return;

    if (extData.debugFlags.Timestamp) {
        var t = new Date();
        prefix = t.toTimeString().substr(0,t.toTimeString().indexOf(" "))+ "." + pad(t.getMilliseconds(),3) + " - " + prefix;
    }
    if (!target)
        target=console;
    if (!prefix)
        prefix="";

    if (typeof s == "string")
        target.log( prefix + '::' + s);
    else
        target.log(s);
}
//
//function logNote(note) {
//    console.log("NOTE s: " + note.syncnum + "v:" + note.version);
//    console.log("created " + dateAgo(note.createdate) + ", modified " + dateAgo(note.modifydate));
//    console.log("note is " + (note.deleted==1?"DELETED":"not deleted"));
//    console.log(note);
//}


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
//jQuery.fn.sortElements = (function(){
//
//    var sort = [].sort;
//
//    return function(comparator, getSortable) {
//
//        getSortable = getSortable || function(){return this;};
//
//        var placements = this.map(function(){
//
//            var sortElement = getSortable.call(this),
//                parentNode = sortElement.parentNode,
//
//                // Since the element itself will change position, we have
//                // to have some way of storing its original position in
//                // the DOM. The easiest way is to have a 'flag' node:
//                nextSibling = parentNode.insertBefore(
//                    document.createTextNode(''),
//                    sortElement.nextSibling
//                );
//
//            return function() {
//
//                if (parentNode === this) {
//                    throw new Error(
//                        "You can't sort elements if any one is a descendant of another."
//                    );
//                }
//
//                // Insert before flag:
//                parentNode.insertBefore(this, nextSibling);
//                // Remove flag:
//                parentNode.removeChild(nextSibling);
//
//            };
//
//        });
//
//        return sort.call(this, comparator).each(function(i){
//            placements[i].call(getSortable.call(this));
//        });
//
//    };
//
//})();

function uiEvent(name,data) {
    if (name == undefined)
        throw new Error("must have name supplied");

    if (data == undefined || data.name)
        throw new Error("data must not be empty and must not have name field");

    data.name = name;
    chrome.extension.sendRequest(data);
}

function validateEmail(email)
{
 var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
 return email.match(re)
}

function openURLinTab(href, inBackground) {    
     chrome.tabs.create({url:href, selected:!inBackground});    
}

//  ---------------------------------------

function pad(n,k){
    if (k == undefined || k == 2)
        return n<10 ? '0'+n : n
    else if (k == 3)
        return n<100 ? '0'+pad(n) : n
}

RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function get_manifest(callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(JSON.parse(xhr.responseText));
  };
  xhr.open('GET', chrome.extension.getURL("/manifest.json"), false);
  xhr.send(null);
}

// jquery ":focus" selector
if (jQuery) {
    jQuery.expr[':'].focus = function( elem ) {return elem === document.activeElement && ( elem.type || elem.href );};
}

// order matters
function arrayEqual(arr1,arr2) {
    if (arr1.length != arr2.length)
        return false;

    for (var i in arr1)
        if (arr1[i]!=arr2[i])
            return false;

    return true;
}
// order doesnt matter
function arraySame(arr1,arr2) {
    if (arr1.length != arr2.length)
        return false;

    for (var i in arr1)
        if (arr2.indexOf(arr1[i]) == -1)
            return false;

    return true;
}

//function slideInPosition(note, modifyChanged, pinnedNowOn, pinnedNowOff) {
//    var $noterow = $('div.noterow#' + note.key);
//
//
//    if (note.systemtags.indexOf("pinned")>=0) {
//        var $before = findBefore($noterow,$("div.noterow:has(div.pinned)").not("#" + note.key));
//    } else
//        var $before = findBefore($noterow,$("div.noterow:not(:has(div.pinned))").not("#" + note.key));
//
//    if ($before == "keep" || (typeof $before != "string" && ($noterow.index() == $before.index() || $noterow.index() == $before.index() - 1)))
//        return;
//    else if (typeof $before != "string" && $noterow.index() < $before.index()) {
//            slideSwap($noterow,$noterow.parent().children().slice($noterow.index()+1,$before.index()));
//    } else { // noterow up
//        if ($before == "last") // only possible case: append to pinned notes
//            slideSwap($noterow.parent().children().slice($("div.noterow:has(div.pinned)").last().index()+1,$noterow.index()), $noterow);
//        else
//            slideSwap($noterow.parent().children().slice($before.index(),$noterow.index()), $noterow);
//    }
//}
//
//function slideSwap($set1, $set2) {
//
//
//    var $set3 = $set2.last().nextAll();
////    $set1.css("color", "red");
////    $set2.css("color", "blue");
////    $set3.css("color", "green");
//
//    var mb_prev = cssprop($set1.first().prev(), "margin-bottom");
//    if (isNaN(mb_prev)) mb_prev = 0;
//    var mt_next = cssprop($set2.last().next(), "margin-top");
//    if (isNaN(mt_next)) mt_next = 0;
//
//    var mt_1 = cssprop($set1.first(), "margin-top");
//    var mb_1 = cssprop($set1.last(), "margin-bottom");
//    var mt_2 = cssprop($set2.first(), "margin-top");
//    var mb_2 = cssprop($set2.last(), "margin-bottom");
//
//    var h1 = $set1.last().offset().top + $set1.last().outerHeight() - $set1.first().offset().top;
//    var h2 = $set2.last().offset().top + $set2.last().outerHeight() - $set2.first().offset().top;
//
//    var move1 = h2 + Math.max(mb_2, mt_1) + Math.max(mb_prev, mt_2) - Math.max(mb_prev, mt_1);
//    var move2 = -h1 - Math.max(mb_1, mt_2) - Math.max(mb_prev, mt_1) + Math.max(mb_prev, mt_2);
//    var move3 = move1 + $set1.first().offset().top + h1 - $set2.first().offset().top - h2 +
//        Math.max(mb_1,mt_next) - Math.max(mb_2,mt_next);
//
//    //$set1.append("  m:" + move1);
//    //$set2.append("  m:" + move2);
//    // let's move stuff
//    $set1.css('position', 'relative');
//    $set2.css('position', 'relative');
//    $set3.css('position', 'relative');
//    $set1.animate({'top': move1}, {duration: 500});
//    $set3.animate({'top': move3}, {duration: 500});
//    $set2.animate({'top': move2}, {duration: 500, complete: function() {
//            // rearrange the DOM and restore positioning when we're done moving
//            $set1.insertAfter($set2.last())
//            $set1.css({'position': 'static', 'top': 0});
//            $set2.css({'position': 'static', 'top': 0});
//            $set3.css({'position': 'static', 'top': 0});
//        }
//    });
//
//
//}
//
function cssprop(e, id) {
    return parseInt($(e).css(id), 10);
}
//
//function findBefore($noterow,$set) {
//
//    if ($set.length <= 1)
//        return "keep";
//
//    var thiskey = $noterow.attr("sortkey");
//    var allkeys = $set.map(function(i,e) {
//        return $(e).attr("sortkey");
//    }).get();
//
//    if (thiskey==allkeys[0])
//        return "keep"
//    if (thiskey>=allkeys[0])
//        return $set.first();
//    if (thiskey<=allkeys[allkeys.length-1])
//        return "last";
//
//    for (var i = 0; i < allkeys.length-2; i++)
//        if (allkeys[i]>=thiskey && thiskey >= allkeys[i+1])
//            return $($set.get(i+1));
//
//    return "last";
//}

//function resort(callback) {
//    logGeneral("resort()","common.js");
//    var $filteredData = $("div.noterow").clone();
//
//    var $sortedData = $filteredData.sorted({
//        reversed:localStorage.option_sortby=="alpha"?localStorage.option_sortbydirection != 1:localStorage.option_sortbydirection == 1,
//        by: function(v) {
//          return $(v).attr('sortkey');
//        }
//      });
//
//
//    $("#notes").css("height",$("#notes").height());
//    // finally, call quicksand
//    $("#notes").quicksand($sortedData, {
//      duration: 500,
//      attribute: "id",
//      adjustHeight: false,
//      //dy: -18,
//      enhancement: function(e) { $(e).css("height","auto"); $(e).find("abbr.notetime").timeago();}
//    }, callback);
//}
//
//// Custom sorting plugin
//(function($) {
//  $.fn.sorted = function(customOptions) {
//    var options = {
//      reversed: false,
//      by: function(a) { return a.text(); }
//    };
//    $.extend(options, customOptions);
//    $data = $(this);
//    arr = $data.get();
//    arr.sort(function(a, b) {
//      $a=$(a);$b=$(b);
//      ap =$a.attr("pinned") == "true"; bp =$b.attr("pinned") == "true";
//      if (ap && bp || !ap && !bp) {
//          var valA = options.by($a);
//          var valB = options.by($b);
//          if (options.reversed) {
//            return (valA < valB) ? 1 : (valA > valB) ? -1 : 0;
//          } else {
//            return (valA < valB) ? -1 : (valA > valB) ? 1 : 0;
//          }
//      } else if (ap)
//          return -1;
//      else
//          return 1;
//    });
//    return $(arr);
//  };
//})(jQuery);

var ticktock, last;
function tick(s) {    
    
    if (extData.debugFlags.tictoc) {                
        ticktock = (new Date()).getTime();
        last = ticktock;
        if (s)
            console.log("[0] %s",s)
    }
}

function tock(s) {
    if (extData.debugFlags.tictoc) {
        var now = ((new Date()).getTime());
        console.log( "[%i] %ims until %s", now - ticktock, now - last, s);
        last = now;
    }
        
}

function headings(notes,full) {
    return notes.filter(function(n) {
        return n.content != undefined;
    }).map(function(n) {
        if (n.content != undefined) {
            var title = noteTitle(n);
            if (full) {
                n.title = title;
                return n;
            } else             
                return {
                    title: title,
                    key: n.key
                };
            
        } else
            return null
    });
}

//function noteTitle(note) {
//    return note.content.split("\n").filter(function(l) {return l!= "";})[0].trim();
//}

function getCBval(sel) {
    return $(sel).attr("checked") == "checked";
}

function setCBval(sel, bool) {
    if (bool == "true")
        bool = true;
    else if (bool == "false")
        bool = false;
        
    if (typeof bool != "boolean")
        throw new Error("setCBval wants booleans or 'true', 'false'");

    if (bool)
        $(sel).attr("checked","checked");
    else
        $(sel).removeAttr("checked");
}

function exceptionCaught(e,src,line) {
    if (!extData.syncpadManifest)
        get_manifest(function(mf) {
            extData.syncpadManifest = mf;
    });
    
    var funname = filename = message = filepos = "";
    if (src != undefined) {
        filepos = src.match(/chrome-extension:\/\/.*\/javascripts\/(.*)/);
        filepos = filepos[1];
        message = line + ":" + e;
    } else if (e.stack) {
        where = e.stack.match(/at (.*) \(chrome-extension:\/\/.*\/javascripts\/(.*):(\d+):\d+\)/);
        funname = where[1];
        filename = where[2];
        line = where[3];
        
        filepos = filename;
        message = line + ":" + funname + ":" + e.message;
    }
    
    var beacon = ['_trackEvent', 'exception_' + extData.syncpadManifest.version, filepos, message];
    
    console.log(beacon.join(","));
    if (e.stack)
        console.log(e.stack);
    
    _gaq.push(beacon);
    
    if (extData.debugFlags.gerneral && extData.debugFlags.alertExc)
        alert(beacon.join(","));
}

window.onerror = function(msg,src,line) {
    exceptionCaught(msg, src, line);
};

function getChromeVersion() {
    var v = "unknown";
    if (navigator && navigator.appVersion) {
        var m = navigator.appVersion.match(/chrome\/([\d+|\.]+)/i);
        if (m && m.length >= 2)
            v = m[1];
        
    }
    return v;
}

function scheduleGA(ms) {
    setTimeout(function() {
        var ga = document.createElement('script');ga.type = 'text/javascript';ga.async = true;
        if (extData.debugFlags.general && extData.debugFlags.GA)
            ga.src = 'https://ssl.google-analytics.com/u/ga_debug.js';
        else
            ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];s.parentNode.insertBefore(ga, s);
    },ms == undefined?100:ms);
}

extData.chromeVersion = getChromeVersion();

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-22573090-2']);
_gaq.push(['_setCustomVar', 
      1,                    // This custom var is set to slot #1.  Required parameter.
      'Chrome Version (user)',     // The name acts as a kind of category for the user activity.  Required parameter.
      extData.chromeVersion,        // This value of the custom variable.  Required parameter.
      1                     // Sets the scope to session-level.  Optional parameter.
   ]);
   
   
get_manifest(function(mf) {
    extData.syncpadManifest = mf;
    _gaq.push(['_setCustomVar',
      2,                    // This custom var is set to slot #1.  Required parameter.
      'Syncpad Version',     // The name acts as a kind of category for the user activity.  Required parameter.
      mf.version,        // This value of the custom variable.  Required parameter.
      1                     // Sets the scope to session-level.  Optional parameter.
   ]);
});

_gaq.push(['_setCustomVar', 
      3,                    // This custom var is set to slot #1.  Required parameter.
      'Chrome String',     // The name acts as a kind of category for the user activity.  Required parameter.
      navigator.appVersion,        // This value of the custom variable.  Required parameter.
      2                     // Sets the scope to session-level.  Optional parameter.
   ]);
    
_gaq.push(["_setVar",navigator.appVersion.replace(/\./g,",").replace(/ /g,"_")]);

_gaq.push(['_trackPageview']);


var NoteFactory = function(key, callback) {
    chrome.extension.sendRequest({action:"note", key:key},callback);                
}

function Note(note) {
    if (!note || !note.key)
        throw new Error("cannot create Note object, input missing")
    
    for (var f in note)
        this[f] = note[f];
}

Note.prototype.stripCustomFields = function() {
    for (var f in this)
        if (/^_/.test(f))
            delete this[f];
    
    return this;
}

Note.prototype.isCreatedNote = function() {
    return this.key.match(/^created/) != null;
}

Note.prototype.isDeleted = function() {
    return this.deleted == 1;
}

Note.prototype.title = function() {    
    return this.content.split("\n").filter(function(l) {return l!= "";})[0].trim();
}

Note.prototype.isContent = function() {
    return this.content !== undefined;
}

Note.prototype.isWebnote = function() {
    if (!this.isContent())
        return undefined;
        
    return this.content.match(extData.webnotereg) != null;
}

Note.prototype.isLastOpen = function() {
    return localStorage.lastopennote_key == this.key;
}

Note.prototype.isSyncNote= function() {        
    return this._syncNote == true;
}

Note.prototype.setSyncNote= function(to) {        
    this._syncNote = to;
}

// SYSTEMTAGS
Note.prototype.isSystemtag = function(tag) {
    return this.systemtags.indexOf(tag) > -1;
}
Note.prototype.addSystemTag = function(tag) {
    if (!this.isSystemTag(tag))
        this.systemtags.push(tag);        
}
Note.prototype.removeSystemTag = function(tag) {
    if (this.isSystemTag(tag))
        this.systemtags.splice(this.systemtags.indexOf(tag),1);
}
Note.prototype.isPinned = function() {
    return this.isSystemtag("pinned");
}
Note.prototype.isPublished = function() {
    return this.isSystemtag("published");
}
Note.prototype.isShared = function() {
    return this.isSystemtag("shared");
}
Note.prototype.isMarkdown = function() {
    return this.isSystemtag("markdown");
}

// TAGS
Note.prototype.isTag = function(tag) {
    return this.tags.indexOf(tag) > -1;
}
Note.prototype.addTag = function(tag) {
    if (!this.isTag(tag))
        this.tags.push(tag);        
}
Note.prototype.removeTag = function(tag) {
    if (this.isTag(tag))
        this.tags.splice(this.tags.indexOf(tag),1);
}

Note.prototype.tagsEqual = function(tagsOrNote) {
    if (tagsOrNote.key != undefined)
        return arrayEqual(this.tags,tagsOrNote.tags);
    else
        return arrayEqual(this.tags,tagsOrNote);
}

Note.prototype.tagsSame = function(tagsOrNote) {
    if (tagsOrNote.key != undefined)
        return arraySame(this.tags,tagsOrNote.tags);
    else
        return arraySame(this.tags,tagsOrNote);
}

Note.prototype.deltaTo = function(toNote) {
    var res = {};
    for (var f in toNote)
        if (this[f] === undefined ) {
            res[f] = this[f];
        } else if ((this[f] instanceof Array) && !arrayEqual(this[f],toNote[f])) {
            res[f] = this[f];
        } else if (!(this[f] instanceof Array) && this[f] != toNote[f]) {
            res[f] = this[f];
        }
    return res;
}

// POPUP specific
Note.prototype.$row = function() {
    return $('#' + this.key);
}
Note.prototype.$pin = function() {
    return $('#' + this.key + " .pin-toggle");
}
Note.prototype.$published = function() {
    return $('#' + this.key + " .published-toggle");
}
Note.prototype.$shared = function() {
    return $('#' + this.key + " .shared-toggle");
}
Note.prototype.$syncnote = function() {
    return $('#' + this.key + " .syncnote-icon");
}
Note.prototype.$time = function() {
    return $('#' + this.key + " .notetime");
}

Note.prototype.$webnote = function() {
    return $('#' + this.key + " .webnote-icon");
}
Note.prototype.$heading = function() {
    return $('#' + this.key + "heading");
}
Note.prototype.$abstract = function() {
    return $('#' + this.key + "abstract");
}


Note.prototype.$isIndexNote = function() {
    return this.$row().length > 0;
}

Note.prototype.$remove = function() {
    this.$row().attr("deleteanimation","true");
    this.$row().hide("slow", function() {$(this).remove();});
}

Note.prototype.$update = function() {
    var $row = this.$row();
    
    if (this.$isIndexNote()) {
        
        this.$pin().toggleClass("active", this.isPinned());
        this.$published().toggleClass("active", this.isPublished());
        this.$shared().toggleClass("active", this.isShared());
        this.$syncnote().toggleClass("active", this.isSyncNote());
        this.$webnote().toggleClass("active", this.isWebnote());        
    }

    if (this.$isEditorNote()) {
        snEditor.setPintoggle(this.isPinned());
        snEditor.setMarkdownToggle(this.isMarkdown());        
    }
}

Note.prototype.$isEditorNote = function() {
    return snEditor && snEditor.note && snEditor.note.key == this.key
}

Note.prototype.toString = function(content) {    
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
    s += "d:"+this.deleted;
    s += " s:"+this.syncnum;
    s += " v:"+this.version;
    s += " t:";
    if (this.tags)
        $.each(this.tags,function(i,e) {s+=e + " ";});
    s += " st:";
    if (this.systemtags)
        $.each(this.systemtags,function(i,e) {s+=e + " ";});
    s += " m:" + dateAgo(this.modifydate);
    s += " c:" + dateAgo(this.createdate);
    s += " <br> k:" + this.key;
    
    if (!content)
        return s;
    
    if (this.content)
        s += "\n" + this.content;
    else
        s += "\n[note has no content]";
    return s;
}

function clone(obj) {
    // A clone of an object is an empty object 
            // with a prototype reference to the original.

    // a private constructor, used only by this one clone.
    function Clone() { } 
    Clone.prototype = obj;
    var c = new Clone();
            c.constructor = Clone;
            return c;
}

var snLastOpen = {
    noteDeleted : function(key) {
        if (localStorage.lastopennote_key == key)
            localStorage.lastopennote_key = "";
    },
    
    isKey : function(key) {
        return localStorage.lastopennote_key == key;
    },
    
    key : function() {
        return localStorage.lastopennote_key;
    },
    
    openTo : function(key) {
        localStorage.lastopennote_key = key;
        localStorage.lastopennote_open = "true";
    },
    
    dontOpen : function() {
        localStorage.lastopennote_open = "false";
    },
    
    isOpenTo : function(key) {
        return this.isOpen() && this.isOpenTo(key);
    },
    
    isOpen : function() {
        return localStorage.lastopennote_key != undefined && localStorage.lastopennote_key != "" && localStorage.lastopennote_open == "true" && localStorage.option_opentonote == "true";
    }
}
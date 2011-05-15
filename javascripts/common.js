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
jQuery.expr[':'].focus = function( elem ) {return elem === document.activeElement && ( elem.type || elem.href );};

function arrayEqual(arr1,arr2) {
    if (arr1.length != arr2.length)
        return false;

    for (var i in arr1)
        if (arr1[i]!=arr2[i])
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

function resort() {   
        
    var $filteredData = $("div.noterow").clone();
    
    var $sortedData = $filteredData.sorted({
        reversed:localStorage.option_sortbydirection == 1,
        by: function(v) {
          return $(v).attr('sortkey');
        }
      });
    
    // finally, call quicksand
    $("#notes").quicksand($sortedData, {
      duration: 500,
      attribute: "id",
      adjustHeight: false,
      dy: -18,
      enhancement: function(e) { $(e).css("height","auto"); $(e).find("abbr.notetime").timeago(); }
    });
}

// Custom sorting plugin
(function($) {
  $.fn.sorted = function(customOptions) {
    var options = {
      reversed: false,
      by: function(a) { return a.text(); }
    };
    $.extend(options, customOptions);
    $data = $(this);
    arr = $data.get();
    arr.sort(function(a, b) {
      $a=$(a);$b=$(b);
      ap =$a.attr("pinned") == "true"; bp =$b.attr("pinned") == "true";
      if (ap && bp || !ap && !bp) {
          var valA = options.by($a);
          var valB = options.by($b);
          if (options.reversed) {
            return (valA < valB) ? 1 : (valA > valB) ? -1 : 0;
          } else {
            return (valA < valB) ? -1 : (valA > valB) ? 1 : 0;
          }
      } else if (ap)
          return -1;
      else
          return 1;
    });
    return $(arr);
  };
})(jQuery);
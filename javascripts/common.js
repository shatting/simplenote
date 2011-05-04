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

// insert at caret
jQuery.fn.extend({
    insertAtCaret: function(myValue){
      return this.each(function(i) {
        if (document.selection) {
          this.focus();
          sel = document.selection.createRange();
          sel.text = myValue;
          this.focus();
        }
        else if (this.selectionStart || this.selectionStart == '0') {
          var startPos = this.selectionStart;
          var endPos = this.selectionEnd;
          var scrollTop = this.scrollTop;
          this.value = this.value.substring(0, startPos)+myValue+this.value.substring(endPos,this.value.length);
          this.focus();
          this.selectionStart = startPos + myValue.length;
          this.selectionEnd = startPos + myValue.length;
          this.scrollTop = scrollTop;
        } else {
          this.value += myValue;
          this.focus();
        }
      })
    }
});

function indentSelection(indent) {
    var sel, range;
    
    sel = window.getSelection();
    console.log("selection");
    console.log(sel);
    if (sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);

        console.log("range")
        console.log(range)
        console.log("Ancestor: " + range.commonAncestorContainer.id);
        console.log(range.startContainer.nodeValue);
        console.log(range.endContainer.nodeValue);
        if (range.startContainer == range.endContainer) {
            sel.anchorNode.parentElement.innerHTML = indentHTML(sel.anchorNode.parentElement.innerHTML,indent);            
        } else {
            var inrange = false;
            for (var i=0;i<range.commonAncestorContainer.children.length;i++) {
                if (range.commonAncestorContainer.children[i] == range.startContainer.parentElement)
                    inrange = true;
                else if (range.commonAncestorContainer.children[i-1] == range.endContainer.parentElement)
                    inrange = false;

                if (inrange)
                    range.commonAncestorContainer.children[i].innerHTML = indentHTML(range.commonAncestorContainer.children[i].innerHTML,indent);
            }                
        }
        range.setStart(range.startContainer, range.startOffset + indent);
        range.setEnd(range.endContainer, range.endOffset + indent);
        range.startContainer.parentElement.focus();
    }

}

function insertHtmlAtCursor(html) {
    var range, node;
    if (window.getSelection && window.getSelection().getRangeAt) {
        range = window.getSelection().getRangeAt(0);
        node = range.createContextualFragment(html);
        x = range.insertNode(node);
    } else if (document.selection && document.selection.createRange) {
        document.selection.createRange().pasteHTML(html);
    }
}

function indentHTML(html,amount) {
    
    if (amount<0) {
        for (var i=0;i<-amount;i++)
            if (html.indexOf("&nbsp;") == 0)
                html=html.substring(6);
            else
                break;
            
        return html;
    } else if (amount>0) {
        var indent = "&nbsp";
        for (var i=1;i<amount;i++)
            indent+="&nbsp";
        return indent + html;
    }
    else
        return html;
}

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
var background = chrome.extension.getBackgroundPage();
var popup = this;

var isDebug = true && commonDebug;
var isDebugToBg =  true && isDebug;

// this will hold the CodeMirror instance
var codeMirror = null;
// amount of vertical viewport size to add for preloading notes in index
var preLoadFactor = 1/4;
var currentView = "index";
var slideEasing = "swing"; // swing or linear
var slideDuration = 300;

//  ---------------------------------------
var fontUrls = {
    "Droid Sans Mono"   : '<link href="http://fonts.googleapis.com/css?family=Droid+Sans+Mono:regular" rel="stylesheet" type="text/css" >',
    "Walter Turncoat"   : '<link href="http://fonts.googleapis.com/css?family=Walter+Turncoat:regular" rel="stylesheet" type="text/css" >',
    "Inconsolata"       : '<link href="http://fonts.googleapis.com/css?family=Inconsolata:regular" rel="stylesheet" type="text/css" >',
    "Lekton"            : '<link href="http://fonts.googleapis.com/css?family=Lekton" rel="stylesheet" type="text/css">',
    "Yanone Kaffeesatz" : '<link href="http://fonts.googleapis.com/css?family=Yanone+Kaffeesatz:300" rel="stylesheet" type="text/css" >',
    "Vollkorn"          : '<link href="http://fonts.googleapis.com/css?family=Vollkorn:regular" rel="stylesheet" type="text/css" >'
}

function log(s) {
    if (isDebug)
        logGeneral(s,"popup.js",console);
    if (isDebugToBg)
        logGeneral(s,"popup.js",background.console);
}

//  ---------------------------------------
// event listener for popup close
// defer save to background
addEventListener("unload", function (event) {    
    if (editorIsNoteDirty()) {
        var note = {};
        log("(unload): requesting background save");
                
        if (codeMirror.dirty)
            note.content = codeMirror.getCode();
        if ($('div#note input#pinned').attr("dirty")=="true")
            note.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[]; // todo: "read" systag       
        if ($('div#note input#tags').attr("dirty")=="true")
            note.tags = $('div#note input#tags').val().split(" ");
        
        note.key = codeMirror.note.key;

        log("(unload): note:");
        log(note);
        
        background.saveNote = note;
        background.setTimeout("popupClosed()", 1);
    } else 
        log("(unload): no background save");
}, true);

//  ---------------------------------------
//  event listener for "uiEvents" (anything background->popup)
//
// {name:"sync", status: "started|done|error", changes : {hadchanges: false|true, added:[keys],changed:[keys],deleted:[keys]}}
// {name:"noteadded", note:{note}}
// {name:"notedeleted", key: key}
// {name:"noteupdated", newnote:{note}, oldnote: {note}, changes:{hadChanges: false|true, added:[fields],changed:[fields], deleted:[fields]}}
// {name:"offlinechanged", status:true|false}
// {name:"synclistchanged", added|removed:key}
function uiEventListener(eventData, sender, sendResponse) {
        
    if (eventData.name == "sync") {
        
        log("EventListener:sync:" + eventData.status + ", hadChanges=" + eventData.changes.hadchanges );

        if (eventData.status == "started") {
            $("#sync").html("syncing..");
        } else if (eventData.status == "done") {
            if (eventData.changes.hadchanges) {
                fillTags(true);
                $("#sync").html("sync done, had changes");
            } else {
                $("#sync").html("sync done");
            }            
        } else if (eventData.status == "error") {
            $("#sync").html("sync error");
        }

    } else if (eventData.name == "noteadded") {
        log("EventListener:" + eventData.name);
        fillTags(true);
    } else if (eventData.name == "noteupdated") {
        log("EventListener:" + eventData.name);
        if (eventData.changes.changed.indexOf("deleted")>=0) {
            $('div.noterow#' + eventData.newnote.key).hide();
            fillTags(false);
        } else if (eventData.changes.changed.indexOf("tags")>=0 || eventData.changes.changed.indexOf("systemtags")>=0 || eventData.changes.changed.indexOf("modifydate")>=0) {
            fillTags(true);
        } else {
            indexAddNote("replace", eventData.newnote);
            indexFillNote(eventData.newnote);
        }
    } else if (eventData.name == "offlinechanged") {
        log("EventListener:offline:" + eventData.status);
        if (eventData.status)
            $("#offline").html("offline mode");
        else
            $("#offline").html("");
    } else if (eventData.name == "synclistchanged") {
        log("EventListener:" + eventData.name);
        if (eventData.added)
            $('div.noterow#' + eventData.added).css("background","#ccc");
        if (eventData.removed)
            $('div.noterow#' + eventData.removed).css("background","");
    } else if (eventData.name == "notedeleted") {
        log("EventListener:" + eventData.name);
        $('div.noterow#' + eventData.key).hide();
    } else {
        log("EventListener:" + eventData.name);
    }
}

// shortcuts
jQuery.expr[':'].focus = function( elem ) {
  return elem === document.activeElement && ( elem.type || elem.href );
};

$(document).keydown(shorcuts);
function shorcuts(event) {

    if (currentView=="index") {
    // - index: up, down, enter/right, s search, ctrl-t tags, ctrl-a add
        var notesheight = $("div#notes").get(0).scrollHeight;

        if (!event.altKey && !event.ctrlKey && !event.shiftKey)
        switch(event.keyCode) {
            case 38: //up
                $("div#notes").scrollTop($("div#notes").scrollTop()-notesheight/20)
            break;
            case 40: //down
                $("div#notes").scrollTop($("div#notes").scrollTop()+notesheight/20)
            break;
            case 39: //right
            break;
            case 84: //t
                if (!$("div#index #notetags").is(":focus")) {
                    $("div#index #notetags").focus();
                    event.preventDefault();
                }
            break;
            case 83: //s
                if (!$("div#index input#q").is(":focus")) {
                    $("div#index input#q").focus();
                    event.preventDefault();
                }
                break;
            case 65: //a
                if (!$("div#index input#q").is(":focus")) {
                    $("div#index #add").click();                    
                }
            break;
        }
    } else if (currentView=="editor") {        
        // - editor: alt-b66=back, crtl-d68=trash, alt-u85=undo, alt-p80=pin, alt-w87=wordwrap, alt-t84=tags
        if (event.altKey && !event.shiftKey)
            switch(event.keyCode) {
                case 83: //s
                    searchForSelection(); break;
                case 86: // v
                    insertUrl(); break;
                case 66: //b
                    $('div#note input#backtoindex').click();break;
                case 67: //c
                    if (event.ctrlKey && $('div#note input#destroy').val()=="Cancel")
                        $('div#note input#destroy').click();break;
                case 68: //d
                    if (event.ctrlKey && $('div#note input#destroy').val()=="Trash")
                        $('div#note input#destroy').click();break;
                case 85: //u
                    $('div#note input#undo').click();break;
                case 80: //p
                    $('div#note input#pinned').attr("checked",!$('div#note input#pinned').attr("checked"));
                    $('div#note input#pinned').change();
                    break;
                case 87: //w
                    $("div#note input#wordwrap").attr("checked",!$("div#note input#wordwrap").attr("checked"));
                    $("div#note input#wordwrap").change();
                    break;
                case 84: //t
                    event.preventDefault();
                    $("div#note input#tags").focus();break;
                case 69: //e
                    event.preventDefault();
                    codeMirror.focus();
                    break;
            }
    }
}

//  ---------------------------------------
$(document).ready(function() {
    
    log("---------------- popup opened ---------------------");

    var signUpLink =  "<a href='https://simple-note.appspot.com/create/'>signup</a>";
    var optionsLink = "<a href='options.html'>options page</a>";
    
    if ( !localStorage.option_email || !localStorage.option_password) {
        var message = "Please " + signUpLink + " for a Simplenote account and enter your credentials on the " + optionsLink + ".";
        displayStatusMessage(message);
    } else {
        chrome.extension.sendRequest({action : "login"}, function(result) {
            if (result.success) {
                
                log("(ready): login success, requesting full sync.");                
                chrome.extension.sendRequest({action: "sync", fullsync:true}, function() {
                    log("(ready): sync request complete");
                    chrome.extension.onRequest.addListener(uiEventListener);
                });
                                
                if (localStorage.opentonotekey && localStorage.opentonotekey != "" && localStorage.option_opentonote == "true") {
                    log("(ready): sending request for open to note");
                    chrome.extension.sendRequest({action:"note",key:localStorage.opentonotekey}, function(note) {
                        //fillTags(true);
                        if (note)
                            editorShowNote(note,0);
                    });                    
                }
                
                $("#note").hide();

                fillTags(true);

                // bind ADD button
                $('div#index div#toolbar div#add').click(function() {
                    editorShowNote();
                });

                // bind SYNC div
                $("#sync").click( function() {
                    chrome.extension.sendRequest({action: "sync", fullsync:true});
                })

                $("div.noterow").live("mouseover", function(event) {                    
                    $("abbr.notetime",this).css("color","#ddd");
                    $("div.abstract",this).css("color","#ccc");
                    $("div.noteheading",this).css("color","#fff");
                });

                $("div.noterow").live("mouseleave", function(event) {
                    $("abbr.notetime",this).css("color","");
                    $("div.abstract",this).css("color","");
                    $("div.noteheading",this).css("color","");
                });

                // bind SEARCH field
                var options = {
                    callback : function() {
                        log("typewatch: calling fillIndex");
                        fillIndex();
                    },
                    wait : 250,
                    highlight : false,
                    captureLength : -1 // needed for empty string ('') capture
                };
                $('div#index div#toolbar input#q').typeWatch(options);                                                

                $.timeago.settings.strings= {
                    prefixAgo: null,
                    prefixFromNow: null,
                    suffixAgo: "",
                    suffixFromNow: "from now",
                    seconds: "<1 min",
                    minute: "1 min",
                    minutes: "%d min",
                    hour: "1 h",
                    hours: "%d h",
                    day: "1 d",
                    days: "%d d",
                    month: "1 month",
                    months: "%d months",
                    year: "1 year",
                    years: "%d years",
                    numbers: []
                }
                
            }
            else {
                log("(ready): login error, message=" + result.message);
                if (!result.message)
                    result.message = "Login for email '" + localStorage.option_email + "' failed, please check your Simplenote email address and password on the " + optionsLink + "!";
                else
                    result.message += "<br><br>Alternatively you can try to correct your username and password on the " + optionsLink + "!";
                displayStatusMessage(result.message);
            }
        });
    }
});


/*
 * Displays a status message.
 * @param message The HTML content of the status message to display. All links
 *     in the message are be adjusted to open in a new window and close the
 *     popup.
 */
function displayStatusMessage(message) {    
    $('#toolbar').hide();
    $('#statusbar').hide();
    $('#notes').html(message);
    $('body').css("background","#fff");
    links = $('a');
    links.attr('target', '_blank');
    links.click(function() {window.close();});
}

/*
 * Fills the Tags dropdown with all tags from the DB.
 *
 * @param callFillIndex boolean, call fillIndex() after tags are filled or not
 */
function fillTags(callFillIndex) {
    log("fillTags");
    chrome.extension.sendRequest({action:"tags"}, function(taginfos) {
        // fill dropdown
        $("#notetags").unbind();
        var stillhavetag = false;
        var oldval = $("#notetags").val();
        $("#notetags").html("");
        var style;
        $.each(taginfos,function(i,taginfo) {
            style = taginfo.count > 0?"":'style="color:#aaa"';
            if (taginfo.tag == "#all#")
                $("#notetags").append('<option value="" ' + style +  '>(all) [' + taginfo.count + ']</option>');
            else if (taginfo.tag == "#notag#")
                $("#notetags").append('<option value="#notag#" ' + style +  '>(untagged) [' + taginfo.count + ']</option>');
            else if (taginfo.tag == "#trash#")
                $("#notetags").append('<option value="#trash#" ' + style +  '>(deleted) [' + taginfo.count + ']</option>');
            else
                $("#notetags").append('<option value="' + taginfo.tag + '" ' + style +  '>' + taginfo.tag + " [" + taginfo.count + "] </option>");

            if (oldval == taginfo.tag)
                stillhavetag = true;
        });        
        if (!stillhavetag) {
            oldval = "#all#";
        }
       // add handler        
        $("#notetags").val(oldval);
        $("#notetags").change(function(event) {
            log("#notetags:changed: calling fillIndex");
            fillIndex();
        });

        if (callFillIndex)
            fillIndex();
    });
}
/*
 * Fills the index pane with noterows.
 */
function fillIndex() {    
    
    var req =               {action : "getnotes", deleted : 0};
    req     = mergeobj(req, {tag : $("#notetags").val()});
    req     = mergeobj(req, {contentquery : $('#q').val()});
    req     = mergeobj(req, {sort:localStorage.option_sortby, sortdirection:localStorage.option_sortbydirection});

    log("fillIndex:");
    log(req);
      
    $('div#index div#notes').empty();    
    
    chrome.extension.sendRequest(req, function(notes) {
        log("fillIndex:request complete");
        var note;

        if (notes.length > 0) {
            for(var i = 0; i < notes.length; i ++ ) {
                note = notes[i];
                indexAddNote("append",note);
                if (i<15 && note.content != undefined)
                    indexFillNote(note);
            }
            checkInView();
        } else
            $('div#index div#notes').html("<div id='nonotes'>no notes found.</div>");

        $('div#notes').scroll(checkInView);
       
    });
  
}
/*
 * Appends/prepends/replaces a noterow div in the index pane.
 *
 * @param mode "delteAndPrepend", "append", "replace"
 * @param note must at least be a note from and index api call
 */
function indexAddNote(mode, note){
    var date, prefix, shareds = [], html =  "";

    // assemble noterow html string
    if (mode!= "replace")
        html = "<div class='noterow' id='" + note.key  + "' >";    

    // date abbr
    if (localStorage.option_showdate == "true") {
        if (localStorage.option_sortby == "createdate") {
            date = convertDate(note.createdate);
            prefix = "created: ";
        } else {
            date = convertDate(note.modifydate);
            prefix = "modified: ";
        }
        
        html+=      "<abbr class='notetime' id='" + note.key + "time' title='" + ISODateString(date) + "'>" + prefix + localeDateString(date) + "</abbr>";
    }
    // pin/shared/published
    if (note.deleted == 0) {
        html+=      "<div title='Click to pin/unpin' class='" + (note.systemtags.indexOf("pinned")>=0?"pinned":"unpinned") + "' id='" + note.key + "pin'>&nbsp;</div>";
        html+=      "<div title='Click to view published version of this note' class='" + (note.publishkey != undefined?"published":"unpublished") + "' id='" + note.key + "published'>&nbsp;</div>";
        $.each(note.tags, function (i,tag) {
            if (validateEmail(tag)) {
                shareds.push(tag);                
            }
        });
        if (shareds.length > 0)
            html+= "<div class='shared' id='" + note.key + "shared' title='Shared with " + shareds.join(", ") + "'>&nbsp;</div>";
    } else {
        $("div#" + note.key).attr("title", "Click to undelete");
    }
    // note heading div
    html+=          "<div class='noteheading' id='" + note.key + "heading'></div>";
    // note abstract div
    html+=          "<div class='abstract' id='" + note.key + "abstract'>&nbsp;<br>&nbsp;</div>";

    if (mode!="replace")
        html+="</div>";

    // insert the html string into document
    if (mode=="delteAndPrepend") {
        $('div.noterow#' + note.key).remove();
        $('#notes').prepend(html);                
    } else if (mode=="append") {
        $('#notes').append(html);        
    } else if (mode=="replace")
        $('div.noterow#' + note.key).html(html);

    // bind timeago for time abbr
    if (localStorage.option_showdate == "true")
        $("#" + note.key + "time").timeago();
    
    if (note.deleted != 0) return;

    // bind pinned klick
    $("#" + note.key +"pin").unbind();
    $("#" + note.key +"pin").click(note.key,function(event) {
            var tag = $(this).attr("class")=="pinned"?[]:["pinned"];
            event.stopPropagation();
            chrome.extension.sendRequest({action:"update",key:event.data,systemtags:tag}, function (note) {
                $("#" + note.key +"pin").attr("class",note.systemtags.indexOf("pinned")>=0?"pinned":"unpinned");                
            });
        });
    // bind published click
    if (note.publishkey) {
        $("#" + note.key +"published").unbind();
        $("#" + note.key +"published").click(note.publishkey,function(event) {            
            event.stopPropagation();
            openURLinTab("http://simp.ly/publish/"+event.data);
        }); 
    }
}

/*
 *  Fills a noterow div from the note.content. Callback from checkInView.
 *
 *  @param elementOrNote jquery object div.noterow#key or note object with .content
 */
function indexFillNote(elementOrNote) {

    if (elementOrNote.key) {//note        
        indexFillNoteReqComplete(elementOrNote);
    } else {
        var key = elementOrNote.attr("id");

        // reflowing triggers scrolls
        if (elementOrNote.data("requested"))
            return;

        $('#' + key + "heading").append('<img id="' +key + 'loader" src="images/loader_small.gif"/>');
        $('#' + key + "heading").attr("align","center");

        chrome.extension.sendRequest({action : "note", key :key}, indexFillNoteReqComplete);

        elementOrNote.data("requested",true);
    }
}
/*
 *  Fills a noterow div from the note.content. Callback from checkInView.
 *
 *  @param note note with .content, .key and .deleted
 */
function indexFillNoteReqComplete(note) {
        
        var $noterow = $('#' + note.key);
        var $noteheading = $('#' + note.key + "heading");
        var $abstract = $('#' + note.key + "abstract");
            
        var lines = note.content.split("\n").filter(function(line) {
            return ( line.trim().length > 0 )
            });

        // heading
        $('#' + note.key + 'loader').remove();
        $noteheading.removeAttr("align"); // from loader
        // set actual heading
        $noteheading.html(htmlEncode(lines[0],100)); // dont need more than 100 chars
        // deleted note css style
        if (note.deleted == 1) {
            $noteheading.addClass("noteheadingdeleted"); // for text color
            $noterow.addClass("noterowdeleted"); // for undelete image on hover
        }

        // abstract
        var abstractlines;
        if (localStorage.option_abstractlines>=0)
            abstractlines = lines.slice(1,Math.min(lines.length,localStorage.option_abstractlines*1+1));
        else // -1 ~ all
            abstractlines = lines;
        // set actual abstract
        $abstract.html(htmlEncode(abstractlines,100).join("<br/>"));

        $noterow.unbind();
        // add dblclick binding
        //$noterow.css("height",$noterow.height());
        //$noterow.data('origheight',$noterow.height());
        //$noterow.dblclick(maximize);
                
        // add click binding        
        if (note.deleted == 0)
            $noterow.click(note, function(event) {
                editorShowNote(event.data);
            });
        else {
            $noterow.attr("title", "Click to undelete");
            $noterow.click(function() {
                chrome.extension.sendRequest({action : "update", key : note.key, deleted : 0});
            });
        }

        // sync note 
        if (note._syncNote)
            $noterow.css("background","#ccc");        

        //$noterow.hover(maximize,minimize);
                
        // check new inview, might have changed due to reflow
        $noterow.data('loaded',true);
        
        checkInView();    
}

// encode string or string array into html equivalent
function htmlEncode(s, maxchars)
{
    if (!s)
        return "";
    if (!maxchars)
        maxchars = 1000000;
        
    if (s instanceof Array)
        return s.map(function(s) {
            return htmlSafe(s.substring(0,maxchars)).replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;");
        });
    else
        return htmlSafe(s.substring(0,maxchars)).replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;");
}

// make string html safe
function htmlSafe(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

//function htmlUnsafe(s) {
//    return s.replace(/&gt;/gi, ">").replace(/&lt;/gi, "<").replace(/&amp;/gi,"&");
//}
//
//function htmlDecode(s) {
//    return htmlUnsafe(s.replace(/<br>/gi,"\n").replace(/&nbsp;/gi," "));
//}

//function maximize(event) {
//    var key = this.id;
//    var $this = $(this);
//    var lines = $this.data("fulltext").split("\n");
//
//    // insert full text into abstract div
//    //$('#' + key + 'abstract').html(htmlEncode(lines.slice(1,lines.length-1)));
//
//    //$('div.noterow').not($(this)).trigger('mouseleave');
//    //$('div.noterow').not($(this)).stop( true, false );
//
//    // animate
//    var $clone = $this.clone().css({
//        height: 'auto',
//        position: 'absolute',
//        zIndex: '-9999',
//        left: '-9999px',
//        width: $this.width()
//    })
//    .appendTo($this);
//    $this.animate({
//        height: $clone.height()
//    }, 100);
//    $clone.detach();
//
//    $this.unbind('dblclick');
//    $this.dblclick(minimize);
////$('#' + key).animate( {height:'+=' + (lines*10), duration:500 }, function(){
////$('#' + key).removeAttr('style');
////});
//// $('#' + key).slideDown();
//
////$('html,body').animate({scrollTop: $(this).offset().top}, 100);
//}

//function minimize(event) {
//    var key = this.id;
//    var $this = $(this);
//    var lines = $(this).data("fulltext").split("\n",10).filter(function(line) {
//        return ( line.length > 1 )
//        });
//
//    //$('#' + key + "abstract").html(makeAbstract(lines.slice(1, 3)));
//
//    $this.animate({
//        height: $this.data('origheight')
//    }, 50);
//
//    $this.unbind('dblclick');
//    $this.dblclick(maximize);
//}

//  ---------------------------------------
function ISODateString(d) {
    return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+ pad(d.getUTCDate())+'T'+ pad(d.getUTCHours())+':'+ pad(d.getUTCMinutes())+':'+ pad(d.getUTCSeconds())+'Z'
}
//  ---------------------------------------
function localeDateString(d) {    
    var s = d.toLocaleString();
    return s.substring(0, s.indexOf("GMT")-1);
}
//  ---------------------------------------
function slideEditor(callback, duration) {
    if (duration == undefined)
        duration = slideDuration;
    $("#note").show();
    $('div#index').animate({left:"-=400"}, {duration: duration, complete: callback, easing: slideEasing});
    $('div#note').animate({left:"-=400"}, {duration: duration, complete: function() { $("#index").hide(); },easing: slideEasing});
    $('body').animate({width:"+=400"}, {duration: duration, easing: slideEasing});
    currentView = "editor";
}
//  ---------------------------------------
function slideIndex(callback, duration) {
    if (duration == undefined)
        duration = slideDuration;
    localStorage.opentonotekey = "";
    editorClearDirty();
    $("#index").show();
    $('div#index').animate({left:"+=400"}, {duration: duration, complete: callback, easing: slideEasing});
    $('div#note').animate({left:"+=400"}, {duration:duration, complete: function() { $("#note").hide(); }, easing: slideEasing});
    $('body').animate({width : "-=400"}, {duration:duration, easing: slideEasing});
    currentView = "index";   
}

function editorSetFont() {
    var $head = $(codeMirror.editor.container.ownerDocument.head);
    var $editbox = $(codeMirror.editor.container);
    
    // get fontinfo if there
    var fontinfo;
    if (localStorage.editorfontinfo)
        fontinfo = JSON.parse(localStorage.editorfontinfo);

    // inject font url
    // keeping this so we can easily delete already loaded fonts
    // otherwise could add a fontinfo field for url
    var fontname = localStorage.option_editorfont?localStorage.option_editorfont:fontinfo.family;
    for(var name in fontUrls) {
        if (fontname == name) {
            $head.append(fontUrls[name]);
            delete fontUrls[name];
            break;
        }
    }
    // set font properties
    if (fontinfo) {
        $editbox.css("font-family",fontinfo.family);
        $editbox.css("font-size",fontinfo.size);
        $editbox.css("letter-spacing",fontinfo.letter_spacing);
        $editbox.css("word-spacing",fontinfo.word_spacing);
        $editbox.css("line-height",fontinfo.line_height);
    } else {
        $editbox.css("font-family", localStorage.option_editorfont);
        $editbox.css("font-size", localStorage.option_editorfontsize);
    }

    // set font shadow
    if (localStorage.option_editorfontshadow && localStorage.option_editorfontshadow == "true")
        $editbox.css("text-shadow","2px 2px 2px #aaa" );
}

function editorInitialize() {

    if (codeMirror.initialized)
        return;

    var $editbox = $(codeMirror.editor.container);
                
    // add note content change (dirty) event listeners
    $editbox.unbind();
    $editbox.bind('change keyup paste cut', function(event) {
        var note = codeMirror.note;

        if (note.content != codeMirror.getCode()) {
            if (!codeMirror.dirty)
                log("content dirty now (" + event.type + ")");
            codeMirror.dirty = true;
        } else {
            if (codeMirror.dirty)
                log("content not dirty now (" + event.type + ")");;
            codeMirror.dirty = false;
        }
        if (editorIsNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","disabled");
    });

    // fix for home not scrolling all to the left
    $editbox.keydown(shorcuts);
    $editbox.keyup(function(event) {
        if (event.keyCode == 36) { //home key
            $editbox.scrollLeft(Math.max(0,$editbox.scrollLeft()-300));
        }
    });

        // add note tags change (dirty) event listeners
    $('div#note input#tags').unbind();
    $('div#note input#tags').bind('change keyup paste cut', function(event) {
        var note = codeMirror.note;
        if (note.tags.join(" ") != $(this).val().trim()) {
            if ($('div#note input#tags').attr('dirty') != "true")
                log("tags dirty now (" + event.type + ")");
            $('div#note input#tags').attr('dirty', 'true');
        } else {
            log("tags not dirty now (" + event.type + ")");
            $('div#note input#tags').removeAttr('dirty');
        }
        if (editorIsNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","disabled");
    });

    // add note pinned (dirty) event listeners
    $('div#note input#pinned').unbind();
    $('div#note input#pinned').bind('change', function(event) {
        var note = codeMirror.note;
        var waspinned = note.systemtags.indexOf("pinned")>=0;

        if (waspinned != $("div#note input#pinned").attr("checked")) {
            if ($('div#note input#pinned').attr('dirty') != "true")
                log("pinned dirty now (" + event.type + ")");
            $('div#note input#pinned').attr('dirty', 'true');
        } else {
            log("pinned not dirty now (" + event.type + ")");
            $('div#note input#pinned').removeAttr('dirty');
        }
        if (editorIsNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","disabled");
    });

    // bind back button
    $('div#note input#backtoindex').unbind();
    $('div#note input#backtoindex').click(function(event) {
        if (editorIsNoteDirty()) {
            log("back clicked, note dirty.");
            editorNoteChanged(codeMirror.note.key);
        } else {
            log("back clicked, note not dirty.");
            slideIndex();
        }
    });

    // bind word wrap
    $("div#note input#wordwrap").unbind();
    $("div#note input#wordwrap").bind('change', function(event) {
        localStorage.wordwrap = $("#wordwrap").attr("checked");
        codeMirror.setTextWrapping($("div#note input#wordwrap").attr("checked"))
    });
    if (localStorage.wordwrap != undefined && localStorage.wordwrap == "true") {
        $("div#note input#wordwrap").attr("checked","true");
    } else {
        $("div#note input#wordwrap").attr("checked","");
    }
    $("div#note input#wordwrap").change();

    
    // bind UNDO button
    $('div#note input#undo').unbind();
    $('div#note input#undo').click(function(event) {
        // reset content
        var note = codeMirror.note;
        codeMirror.setCode(note.content);
        // reset tags
        $('div#note input#tags').val(note.tags.join(" "));
        // reset pinned
        if (note.systemtags.indexOf("pinned")>=0)
            $('div#note input#pinned').attr("checked","checked");
        else
            $('div#note input#pinned').removeAttr("checked");

        $('div#note input#undo').attr("disabled","disabled");
        //editorClearDirty(); // should not dont need this here b/c of callbacks
    });

    // bind DELETE/CANCEL
    $('div#note input#destroy').unbind();
    $('div#note input#destroy').click(function(event) {
        var note = codeMirror.note;
        if (note.key != "")
            editorTrashNote(note.key);
        slideIndex();
    });

    // bind links
    $(".sn-link",$editbox).die();
    $(".sn-link",$editbox).live("click",function(event) {
       if (event.ctrlKey)
           return;
       var url = this.textContent;
       openURLinTab(url);
    });
    $editbox.bind('keydown', function(event) {
        if (event.keyCode == 17) // ctrl
            $(".sn-link",$editbox).addClass("sn-link-unhot");
    });

    $editbox.bind('keyup', function(event) {
        if (event.keyCode == 17) // ctrl
            $(".sn-link",$editbox).removeClass("sn-link-unhot");
    });

    // add context menu
    editorMakeContextMenu();

    codeMirror.initialized = true;
}

function insertUrl() {
    var $editbox = $(codeMirror.editor.container);
    chrome.tabs.getSelected(undefined,function(tab) {
        codeMirror.replaceSelection(tab.url);
        $editbox.change();
    });
}

function searchForSelection() {
    openURLinTab("http://google.com/search?q=" + encodeURIComponent(codeMirror.selection().trim()));
}

//  ---------------------------------------
function editorMakeContextMenu() {

    var $editbox = $(codeMirror.editor.container);
    var menu1 = [
//      {'Cut (crtl-x)': function(menuItem,menu) {
//              console.log($editbox);
//              console.log($editbox.get(0));
//            $editbox.get(0).execCommand("cut");
//      }},
//      {'Copy (crtl-c)': function(menuItem,menu) {
//            execCommand("copy");
//      }},
//      {'Paste (crtl-v)': function(menuItem,menu) {
//            execCommand("paste");
//      }},
//      $.contextMenu.separator,
      {'Insert tab URL (alt-v)':insertUrl},
      
      {'Search for selection (alt-s)':
        {
            onclick: searchForSelection,
            className: "disableonnoselection"
        }
      }
      //,$.contextMenu.separator
    ];
    $editbox.contextMenu(menu1,{
        theme:'gloss',
        offsetX:0,
        offsetY:20,
        direction:'down',
        beforeShow: function() {
            if (codeMirror.selection().trim() == "")
                $(this.menu).find('.disableonnoselection').each(function() {
                        $(this).toggleClass("context-menu-item-disabled", true);
                 });
            else
                $(this.menu).find('.disableonnoselection').each(function() {
                        $(this).toggleClass("context-menu-item-disabled", false);
                 });

            return true;
        },
    });
}

//  ---------------------------------------
function editorShowNote(note, duration) {
    log("showNote");      
            
    // new note dummy data
    if (note==undefined)
        note = {content:"",tags:[],systemtags:[], key:""};

    codeMirror.note = note;

    editorClearDirty();
    editorSetFont();
    editorInitialize();

    // get note contents
    if (note.key == "") { // new note
        
        // delete button now cancel button
        $('div#note input#destroy').val("Cancel");
        $('div#note input#destroy').attr("title","Dont save note, return to notes (ctrl-alt-c)");

        // hide undo
        $('div#note input#undo').hide();                

    } else { // existing note
        
        // delete button now delete button
        $('div#note input#destroy').val("Trash");
        $('div#note input#destroy').attr("title","Send note to trash (ctrl-alt-d)");

        // show undo
        $('div#note input#undo').show();
        
        localStorage.opentonotekey = note.key;
    }
    
    // trigger undo click-> fills everything
    $('div#note input#undo').click();
    
    slideEditor(function () {codeMirror.focus();}, duration);

}

//  ---------------------------------------
function editorNoteChanged(key) {
    
    var noteData = {};
    if (codeMirror.dirty)
        noteData.content = codeMirror.getCode();
    if ($('div#note input#pinned').attr("dirty")=="true")
        noteData.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[];
    if ($('div#note input#tags').attr("dirty")=="true")
        noteData.tags = $('div#note input#tags').val().trim().split(" ");

    log("editorNoteChanged:noteData:");
    log(noteData);
    
    if (noteData.content == '' && key !='')     // existing note emptied -> trash
        editorTrashNote(key);
    else if (key != '' ) {                  // existing note, new data -> update
        noteData.key = key;
        noteData.action = "update";
    } else if (noteData.content && noteData.content != '')          // new note, new data -> create
        noteData.action = "create";
    
    slideIndex();
       
    if (noteData.action) {        
        chrome.extension.sendRequest(noteData, function(note) {
            log("editorNoteChanged: request complete");            
        });        
    }
    
}
//  ---------------------------------------
function editorIsNoteDirty() {
    return codeMirror.dirty || $('div#note input#pinned').attr("dirty")=="true" || $('div#note input#tags').attr("dirty")=="true";
}
//  ---------------------------------------
function editorClearDirty() {
    log("editorClearDirty");
    codeMirror.dirty = false;
    $('div#note input#pinned').removeAttr("dirty");
    $('div#note input#tags').removeAttr('dirty');
}
//  ---------------------------------------
function editorTrashNote(key) {
    log("editorTrashNote");
    $('div#note input').attr('disabled', 'disabled');    
    chrome.extension.sendRequest({action : "update", key : key, deleted : 1},
            function() {
                $('div#note input').removeAttr('disabled');
            });
}

//  ---------------------------------------
// from inview.js
function getViewportSize() {
    var mode, domObject, size = {
        height: window.innerHeight, 
        width: window.innerWidth
    };

    // if this is correct then return it. iPad has compat Mode, so will
    // go into check clientHeight/clientWidth (which has the wrong value).
    if (!size.height) {
        mode = document.compatMode;
        if (mode || !$.support.boxModel) { // IE, Gecko
            domObject = mode === 'CSS1Compat' ?
            document.documentElement : // Standards
            document.body; // Quirks
            size = {
                height: domObject.clientHeight,
                width:  domObject.clientWidth
            };
        }
    }

    return size;
}
//  ---------------------------------------
// from inview.js
function getViewportOffset() {
    return {
        top:  window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
        left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft
    };
}

//  ---------------------------------------
// from inview.js
function checkInView() {
    var elements = $('div.noterow').get(), elementsLength, i = 0, viewportSize, viewportOffset;
    var allLoaded = true;    
    elements = elements.filter(function (e) {
        return !$(e).data('loaded');
    });    
    elementsLength = elements.length;

    if (elementsLength) {
        viewportSize   = getViewportSize();
        viewportOffset = getViewportOffset();

        //log("checkInView:viewportSize=[" + viewportSize.height + "," + viewportSize.width + "], viewportOffset=[" + viewportOffset.left + "," + viewportOffset.top + "]");
        // fix a bug on first load, size not initialized
        if (viewportSize.height == 0 && viewportSize.width == 0) {
            viewportSize.height = 502;viewportSize.width = 400;
        }
        
        for (; i<elementsLength; i++) {

            var $element      = $(elements[i]),
            elementSize   = {
                height: $element.height(), 
                width: $element.width()
            },
            elementOffset = $element.offset(),
            loaded        = $element.data('loaded'),
            inview        = false;

            //log("checkInView:elementSize=[" + elementSize.height + "," + elementSize.width + "], elementOffset=[" + elementOffset.left + "," + elementOffset.top + "]");

            inview = elementOffset.top <= viewportOffset.top + viewportSize.height*(1 + preLoadFactor) &&
                elementOffset.left + elementSize.width >= viewportOffset.left &&
                elementOffset.left <= viewportOffset.left + viewportSize.width;
                         
//            console.log(i + ": loaded " + loaded + ", inview=" + inview);
//            console.log(elementOffset);
//            console.log(elementOffset);
            
            allLoaded = allLoaded && loaded;
            if (!loaded && inview) {
                indexFillNote($element);                
            }
        }
    }
        
    $("div#notes").data('allLoaded',allLoaded);
}

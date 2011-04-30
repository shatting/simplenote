var background = chrome.extension.getBackgroundPage();
var popup = this;

var isDebug = true && commonDebug;
var isDebugToBg =  true && isDebug;

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
                
        if (editor.dirty)
            note.content = editor.getCode();
        if ($('div#note input#pinned').attr("dirty")=="true")
            note.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[]; // todo: "read" systag       
        if ($('div#note input#tags').attr("dirty")=="true")
            note.tags = $('div#note input#tags').val().split(" ");
        
        note.key = editor.note.key;

        log("(unload): note:");
        log(note);
        
        background.saveNote = note;
        background.setTimeout("popupClosed()", 1);
    } else 
        log("(unload): no background save");
}, true);

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

var fontUrls = {
    "Droid Sans Mono"   : '<link href="http://fonts.googleapis.com/css?family=Droid+Sans+Mono:regular" rel="stylesheet" type="text/css" >',
    "Walter Turncoat"   : '<link href="http://fonts.googleapis.com/css?family=Walter+Turncoat:regular" rel="stylesheet" type="text/css" >',
    "Inconsolata"       : '<link href="http://fonts.googleapis.com/css?family=Inconsolata:regular" rel="stylesheet" type="text/css" >',
    "Lekton"            : '<link href="http://fonts.googleapis.com/css?family=Lekton" rel="stylesheet" type="text/css">',
    "Yanone Kaffeesatz" : '<link href="http://fonts.googleapis.com/css?family=Yanone+Kaffeesatz:300" rel="stylesheet" type="text/css" >',
    "Vollkorn"          : '<link href="http://fonts.googleapis.com/css?family=Vollkorn:regular" rel="stylesheet" type="text/css" >'
}
//
//  ---------------------------------------
$(document).ready(function() {
    
    log("---------------- popup opened ---------------------");
    //if (!isDebug)
    //    $('div#note2').hide();   
    //if (!isDebug)
    //     $('div#note div#info').hide();

    var signUpLink =  "<a href='https://simple-note.appspot.com/create/'>signup</a>";
    var optionsLink = "<a href='options.html'>options page</a>";
    
    if ( !localStorage.option_email || !localStorage.option_password) {
        var message = "Please " + signUpLink + " for a Simplenote account and enter your credentials on the " + optionsLink + ".";
        displayStatusMessage(message);
    }
    else {                
        chrome.extension.sendRequest({action : "login"}, function(result) {
            if (result.success) {
                
                log("(ready): login success, requesting full sync.");                
                chrome.extension.sendRequest({action: "sync", fullsync:true}, function() {
                    log("(ready): calling fillTags");                    

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
                
                fillTags(true);

                // bind ADD button
                $('div#index div#toolbar div#add').click(function() {
                    editorShowNote();
                });

                // bind SYNC div
                $("#sync").click( function() {
                    chrome.extension.sendRequest({action: "sync", fullsync:true});
                })

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


//  ---------------------------------------
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

//  ---------------------------------------
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

//  ---------------------------------------
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

//mode: delteAndPrepend, append, replace
function indexAddNote(mode, note){
    
    var html =  "";
    if (mode!= "replace")
        html = "<div class='noterow' id='" + note.key  + "' >";
    var date, prefix, shareds = [];
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
    html+=          "<div class='noteheading' id='" + note.key + "heading'>";    
    html+=          "</div>";
    html+=          "<div class='abstract' id='" + note.key + "abstract'>&nbsp;<br>&nbsp;</div>";

    if (mode!="replace")
        html+=      "</div>";
    
    if (mode=="delteAndPrepend") {
        $('div.noterow#' + note.key).remove();
        $('#notes').prepend(html);                
    } else if (mode=="append") {
        $('#notes').append(html);        
    } else if (mode=="replace")
        $('div.noterow#' + note.key).html(html);

    if (localStorage.option_showdate == "true")
        $("#" + note.key + "time").timeago();

    if (note.deleted != 0)
        return

    // bind pin div
    $("#" + note.key +"pin").unbind();
    $("#" + note.key +"pin").click(note.key,function(event) {
            var tag = $(this).attr("class")=="pinned"?[]:["pinned"];
            event.stopPropagation();
            chrome.extension.sendRequest({action:"update",key:event.data,systemtags:tag}, function (note) {
                $("#" + note.key +"pin").attr("class",note.systemtags.indexOf("pinned")>=0?"pinned":"unpinned");                
            });
        });
    if (note.publishkey) {
        $("#" + note.key +"published").unbind();
        $("#" + note.key +"published").click(note.publishkey,function(event) {            
            event.stopPropagation();
            openURLinTab("http://simp.ly/publish/"+event.data);
        }); 
    }
    //$('div.noterow#' + note.key).data("modify",note.modifydate);
}


// element: jquery div.noterow#key or note object
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

function indexFillNoteReqComplete(note) {
        // fields: noteData.key, noteData.text
        
        var $noterow = $('#' + note.key);
        var $noteheading = $('#' + note.key + "heading");
        var $abstract = $('#' + note.key + "abstract");
            
        var lines = note.content.split("\n").filter(function(line) {
            return ( line.trim().length > 0 )
            });

        // first line
        $('#' + note.key + 'loader').remove();
        $noteheading.removeAttr("align");
        $noteheading.html(htmlEncode(lines[0]));
        if (note.deleted == 1) {
            $noteheading.addClass("noteheadingdeleted"); // for text color
            $noterow.addClass("noterowdeleted"); // for undelete image on hover
        }

        // abstract
        var abstractlines;
        if (localStorage.option_abstractlines>=0)
            abstractlines = lines.slice(1,Math.min(lines.length,localStorage.option_abstractlines*1+1));
        else
            abstractlines = lines;

        $abstract.html(htmlEncode(abstractlines).join("<br/>"));
                
        // add dblclick binding
        $noterow.css("height",$noterow.height());
        $noterow.data('origheight',$noterow.height());
        //$noterow.dblclick(maximize);
                
        // add click binding        
        $noterow.unbind();
        if (note.deleted == 0)
            $noterow.click(note, function(event) {
                editorShowNote(event.data);
            });
        else {

            $noterow.attr("title", "Click to undelete");
            $noterow.click(function() {
                chrome.extension.sendRequest({
                    action : "update",
                    key : note.key,
                    deleted : 0
                    });
            });
        }

        if (note._syncNote)
            $noterow.css("background","#ccc");        

        //$noterow.hover(maximize,minimize);
                
        // check new inview, might have changed due to reflow
        $noterow.data('loaded',true);        
        checkInView();    
}

//function makeAbstract(lines) {
//    var abstracttext = lines.map(function(element) {
//        var shorttext = element.substr(0, 45);
//        return shorttext.length + 3 < element.length ? shorttext + "..." : element;
//    });
//    return htmlEncode(abstracttext).join("<br />");
//}

// encode string or string array into html equivalent
function htmlEncode(s)
{
    if (!s)
        return "";
    if (s instanceof Array)
        return s.map(function(s) {
            return htmlSafe(s).replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;");
        });
    else
        return htmlSafe(s).replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;");
}

// make string html safe
function htmlSafe(s) {
    //return s.replace(/&(?!\w+([;\s]|$))/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlUnsafe(s) {
    return s.replace(/&gt;/gi, ">").replace(/&lt;/gi, "<").replace(/&amp;/gi,"&");
}

function htmlDecode(s) {
    return htmlUnsafe(s.replace(/<br>/gi,"\n").replace(/&nbsp;/gi," "));
}

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
    return d.getUTCFullYear()+'-'
    + pad(d.getUTCMonth()+1)+'-'
    + pad(d.getUTCDate())+'T'
    + pad(d.getUTCHours())+':'
    + pad(d.getUTCMinutes())+':'
    + pad(d.getUTCSeconds())+'Z'
}

function localeDateString(d) {
    //var now = new Date(Date.now());
    var s = d.toLocaleString();
    return s.substring(0, s.indexOf("GMT")-1);
}

//  ---------------------------------------

function slideEditor(callback, duration) {
    if (duration == undefined)
        duration = 300;
    $('div#index').animate({left:"-=400"}, {duration: duration, complete: callback});
    $('div#note').animate({left:"-=400"}, duration);
    $('body').animate({width:"+=400"}, duration);
}

function slideIndex(callback, duration) {
    if (duration == undefined)
        duration = 300;
    localStorage.opentonotekey = "";
    editorClearDirty();
    $('div#index').animate({left:"+=400"}, {duration: duration, complete: callback});
    $('div#note').animate({left:"+=400"}, duration);   
    $('body').animate({width : "-=400"},duration);
}

var editor = null;

function editorShowNote(note, duration) {
    log("showNote");      
    
    editorClearDirty();
    
    // new note dummy data
    if (note==undefined)
        note = {content:"",tags:[],systemtags:[], key:""};

    var $editbox = $(editor.editor.container);
    // the following could be done with activeTokens config property
    $(".sn-link",$editbox).die();
    $(".sn-link",$editbox).live("click",function(event) {
       var url = this.textContent;
       openURLinTab(url);
    });
    
    var $head = $(editor.editor.container.ownerDocument.head);    
    for(var name in fontUrls) {        
        if (name == localStorage.option_editorfont) {
            $head.append(fontUrls[name]);
            delete fontUrls[name];
            break;
        }
    }
        
    if (localStorage.option_editorfont )
        $editbox.css("font-family",localStorage.option_editorfont );
    if (localStorage.option_editorfontsize )
        $editbox.css("font-size",localStorage.option_editorfontsize + "px" );
    if (localStorage.option_editorfontshadow && localStorage.option_editorfontshadow == "true")
        $editbox.css("text-shadow","2px 2px 2px #aaa" );
    
    editor.note = note;

    // add note content change (dirty) event listeners
    editor.dirty = false;
    $editbox.unbind();
    $editbox.bind('change keyup paste cut', note, function(event) {
        var note=event.data;        
       
        if (note.content != editor.getCode()) {
            if (!editor.dirty)
                log("content dirty now (" + event.type + ")");
            //$('div#note').attr('dirty', 'true');
            editor.dirty = true;
        } else {
            if (editor.dirty)
                log("content not dirty now (" + event.type + ")");
            //$('div#note #contenteditor').removeAttr('dirty');
            editor.dirty = false;
        }
        if (editorIsNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","disabled");
    });

    // fix for home not scrolling all to the left
    $(editor.editor.container,$editbox).keydown(function(event) {        
        if (event.keyCode == 36) //home key            
            $editbox.scrollLeft($editbox.scrollLeft()-650);            
    });
    
    // add note tags change (dirty) event listeners
    $('div#note input#tags').unbind();
    $('div#note input#tags').bind('change keyup paste cut', note, function(event) {
        var note = event.data;
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
    $('div#note input#pinned').bind('change', note, function(event) {
        var note = event.data;
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
    $('div#note input#backtoindex').click(note,function(event) {        
        if (editorIsNoteDirty()) {
            log("back clicked, note dirty.");
            editorNoteChanged(event.data.key);
        } else {
            log("back clicked, note not dirty.");
            slideIndex();
        }
    });

    // bind word wrap           
    $("div#note input#wordwrap").unbind();
    $("div#note input#wordwrap").bind('change', function(event) {
        localStorage.wordwrap = $("#wordwrap").attr("checked");
        editor.setTextWrapping($("div#note input#wordwrap").attr("checked"))
    });

    if (localStorage.wordwrap != undefined && localStorage.wordwrap == "true") {
        $("div#note input#wordwrap").attr("checked","true");
    } else {
        $("div#note input#wordwrap").attr("checked","");
    }
    $("div#note input#wordwrap").change();

    // set editor style

    
    // get note contents
    if (note.key == "") { // new note
        
        // delete button now cancel button
        $('div#note input#destroy').val("Cancel");
        $('div#note input#destroy').attr("title","Dont save note, return to notes");
        $('div#note input#destroy').unbind();
        $('div#note input#destroy').click(function() {
            slideIndex();
        });
    
        // insert data
        editor.setCode("");
        //$('div#note div#info').html("");

        // show/hide elements        
        $("div#note input#pinned").attr("checked","");        
        $('div#note input#tags').val("");
        $('div#note input#undo').hide();                

    } else { // existing note
        
        // bind TRASH button
        $('div#note input#destroy').val("Trash");
        $('div#note input#destroy').attr("title","Send note to trash");
        $('div#note input#destroy').unbind();
        $('div#note input#destroy').click(note,function(event) {
            editorTrashNote(event.data.key);
            slideIndex();
        });

        // bind UNDO button
        $('div#note input#undo').unbind();
        $('div#note input#undo').click(note,function(event) {
            editor.setCode(note.content);
            $('div#note input#tags').val(note.tags.join(" "));
            if (note.systemtags.indexOf("pinned")>=0)
                $('div#note input#pinned').attr("checked","checked");
            else
                $('div#note input#pinned').removeAttr("checked");

            $('div#note input#undo').attr("disabled","disabled");
            editorClearDirty();
        });
        $('div#note input#undo').attr("disabled","disabled");
                
        // insert data
        editor.setCode(note.content);
        $('div#note input#tags').val(note.tags.join(" "));        
        if (note.systemtags.indexOf("pinned")>=0)
            $('div#note input#pinned').attr("checked","checked");
        else
            $('div#note input#pinned').removeAttr("checked");
        
        // info div
        $('div#note2 div#info').html(note2str(note));
        // show/hide elements
        
        $('div#note input#undo').show();
        localStorage.opentonotekey = note.key;
    }

    // needed for background save
    //$('div#note #contenteditor').attr('key',note.key);
   
    slideEditor(function () {        
        editor.focus();
    }, duration);

}

//  ---------------------------------------

function editorNoteChanged(key) {
    
    var noteData = {};
    if (editor.dirty)
        noteData.content = editor.getCode();
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
    return editor.dirty || //$('div#note #contenteditor').attr("dirty")=="true" ||
        $('div#note input#pinned').attr("dirty")=="true" ||
        $('div#note input#tags').attr("dirty")=="true";
}

function editorClearDirty() {
    log("editorClearDirty");
    //$('div#note #contenteditor').removeAttr('dirty');
    editor.dirty = false;
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

function getViewportOffset() {
    return {
        top:  window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
        left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft
    };
}

// amount of vertical viewport size to add for preloading
var preLoadFactor = 1/4;
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

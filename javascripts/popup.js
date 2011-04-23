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
                
        if ($('div#note #contenteditor').attr("dirty")=="true")
            note.content = getEditorContent();
        if ($('div#note input#pinned').attr("dirty")=="true")
            note.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[]; // todo: "read" systag       
        if ($('div#note input#tags').attr("dirty")=="true")
            note.tags = $('div#note input#tags').val().split(" ");
        
        note.key = $('div#note #contenteditor').attr('key');

        log("(unload): note:");
        log(note);
        
        background.saveNote = note;
        background.setTimeout("popupClosed()", 1);
    } else 
        log("(unload): no background save");
}, true);


chrome.extension.onRequest.addListener(function (event, sender, sendResponse) {
    if (event.event == "sync") {
        
        log("EventListener:sync:" + event.status + ", hadChanges=" + event.hadChanges );

        if (event.status == "started") {
            $("#sync").html("syncing..");
        } else if (event.status == "done") {
            if (event.hadChanges) {
                fillTags(true);
                $("#sync").html("sync done, had changes");
            } else {
                $("#sync").html("sync done");
            }            
        } else if (event.status == "error") {
            $("#sync").html("sync error");
        }

    } else if (event.event == "indexchanged") {
        log("EventListener:" + event.event);
        fillTags(true);

    } else if (event.event == "offline") {
        log("EventListener:offline:" + event.isOffline);
        if (event.isOffline)
            $("#offline").html("offline mode");
        else
            $("#offline").html("");

    } else if (event.event == "noteupdated") {
        log("EventListener:" + event.event);
        // request.note
    } else if (event.event == "notedeleted") {
        log("EventListener:" + event.event);
        // request.key
    } else {
        log("EventListener:" + event.event);
    }
});

//  ---------------------------------------
$(document).ready(function() {
    
    log("---------------- popup opened ---------------------");

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
                chrome.extension.sendRequest({action: "sync", fullsync:true});

                if (localStorage.opentonotekey && localStorage.opentonotekey != "" && localStorage.option_opentonote == "true") {
                    log("(ready):sending request for open to note");
                    chrome.extension.sendRequest({action:"note",key:localStorage.opentonotekey}, function(note) {
                        fillTags(true);
                        if (note)
                            editorShowNote(note,0);
                    });                    
                } else {
                    log("(ready):calling fillTags");
                    fillTags(true);
                }

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
                        log("typewatch:calling fillIndex");
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
                    seconds: "< 1 min",
                    minute: "1 min",
                    minutes: "%d min",
                    hour: "1h",
                    hours: "%dh",
                    day: "1d",
                    days: "%dd",
                    month: "1 month",
                    months: "%d months",
                    year: "1 year",
                    years: "%d years",
                    numbers: []
                }

                //if (!isDebug)
                //     $('div#note div#info').hide();
            }
            else {
                log("(ready): login error, message=" + result.message);
                if (!result.message)
                    result.message = "Login failed, please check your username and password on the " + optionsLink + "!";
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
    //$('#loader').hide();
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

//mode: delteAndPrepend, append
function indexAddNote(mode, note){
    
    var html =  "<div class='noterow' id='" + note.key  + "' >";
    var date, prefix;
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
    if (note.deleted == 0)
        html+=      "<div class='" + (note.systemtags.indexOf("pinned")>=0?"pinned":"unpinned") + "' id='" + note.key + "pin'>&nbsp;</div>";
    html+=          "<div contenteditable='false' class='noteheading' id='" + note.key + "heading'>";    
    html+=          "</div>";
    html+=          "<div contenteditable='false' class='abstract' id='" + note.key + "abstract'>&nbsp;<br>&nbsp;</div>";
    
    html+=      "</div>";        
    
    if (mode=="delteAndPrepend") {
        $('div.noterow#' + note.key).remove();
        $('#notes').prepend(html);                
    } else if (mode=="append") {
        $('#notes').append(html);        
    }

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
        else
            $noterow.click(function() {
                chrome.extension.sendRequest({
                    action : "update",
                    key : note.key,
                    deleted : 0
                    });
            });
        
        //$noterow.hover(maximize,minimize);
        
        // save full note
        //$noterow.data('fulltext',noteData.content);
        
        // check new inview, might have changed due to reflow
        $noterow.data('loaded',true);        
        checkInView();    
}

function makeAbstract(lines) {
    var abstracttext = lines.map(function(element) { 
        var shorttext = element.substr(0, 45); 
        return shorttext.length + 3 < element.length ? shorttext + "..." : element;
    });
    return htmlEncode(abstracttext).join("<br />");
}

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

//function html2entities(sometext){
// var re=/[(<>"'&]/g
// return sometext.replace(re, function(m){return replacechar(m)})
//}
//
//function replacechar(match){
// if (match=="<")
//  return "&lt;"
// else if (match==">")
//  return "&gt;"
// else if (match=="\"")
//  return "&quot;"
// else if (match=="'")
//  return "&#039;"
// else if (match=="&")
//  return "&amp;"
//}


function htmlUnsafe(s) {
    return s.replace(/&gt;/gi, ">").replace(/&lt;/gi, "<").replace(/&amp;/gi,"&");
}

function htmlDecode(s) {
    return htmlUnsafe(s.replace(/<br>/gi,"\n").replace(/&nbsp;/gi," "));
}

function getEditorContent() {
    return elem2txt($('div#note #contenteditor')[0]);
}

function elem2txt(e) {
    var s = [];
    var line = "";
    var childs;
    for (var i=0;i<e.children.length;i++) {
        childs = e.children[i].children;
        if (childs.length > 0 && !(childs.length == 1 && childs[0].outerHTML == "<br>")) { // pasted
            var x = e.children[i].children[0];            
            line = elem2txt(e.children[i]);
        } else {
            line = htmlDecode(e.children[i].innerHTML);
        }
        if (line=="\n")
            s.push("");
        else
            s.push(line);
    }
    //log(s.join("\n"));
    return s.join("\n");
}

function setEditorContent(s) {
    var $editor = $('div#note #contenteditor');    
    var html = "";
    var lines = s.split("\n");
    for (var i=0; i<lines.length; i++) {
        log("line " + i);
        log(lines[i]);
        if (lines[i].length == 0)
            html += "<div><br></div>";
        else
            html += "<div>" + htmlSafe(lines[i]).replace(/\s/gi,"&nbsp;") + "</div>";
    }
    $editor.html(html);
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

//function getTimeDeltaString(s) {
//    var now = new Date(Date.now());
//    var mod = convertDate(s);
//
//    var diff = (now - mod);
//
//    var timeadd;
//
//    if (diff < 24) {
//        timeadd = pad(mod.getHours()) + ":" + pad(mod.getMinutes());
//    }
//    else {
//        timeadd = mod.getDate() + "." + (mod.getMonth()+1) + ".";
//    }
//
//    return timeadd;
//}

//  ---------------------------------------

function pad(n){
    return n<10 ? '0'+n : n
}

//  ---------------------------------------

function slideNote(callback, duration) {
    if (duration == undefined)
        duration = 500;
    $('div#index').animate({left:"-=400"}, {duration: duration, complete: callback});
    $('div#note').animate({left:"-=400"}, duration);
    //$('body').animate({height : "550px"},250);
}

function slideIndex(callback) {
    localStorage.opentonotekey = "";
    $('div#index').animate({left:"+=400"}, {duration: 500, complete: callback});
    $('div#note').animate({left:"+=400"}, 500);
    //$('body').animate({height : "500px"},250);
}

function editorShowNote(note, duration) {
    log("showNote");      
    
    $('div#note #contenteditor').removeAttr('dirty');
    $('div#note input#pinned').removeAttr("dirty");
    $('div#note input#tags').removeAttr('dirty');
    
    // new note dummy data
    if (note==undefined)
        note = {content:"",tags:[],systemtags:[], key:""};
    
    // add note content change (dirty) event listeners
    $('div#note #contenteditor').unbind();
    $('div#note #contenteditor').bind('change keyup paste cut', note, function(event) {
        var note=event.data;        
        
        if (note.content != getEditorContent()) {
            if ($('div#note #contenteditor').attr('dirty') != "true")
                log("content dirty now (" + event.type + ")");
            $('div#note #contenteditor').attr('dirty', 'true');
        } else {
            log("content not dirty now (" + event.type + ")");
            $('div#note #contenteditor').removeAttr('dirty');
        }
        if (editorIsNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","disabled");
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
            editorNoteChanged(event.data.key,slideIndex);
        } else {
            log("back clicked, note not dirty.");
            slideIndex();
        }
    });

    // bind editor tab->spaces
    $('div#note #contenteditor').keydown(function(event) {
        // tab: keyCode: 9        
        if (event.keyCode == 9 && !event.shiftKey) {
            $('div#note #contenteditor').insertAtCaret("   ");
            event.preventDefault();
        }
    });

    // bind word wrap           
    $("div#note input#wordwrap").unbind();
    $("div#note input#wordwrap").bind('change', function(event) {
        localStorage.wordwrap = $("#wordwrap").attr("checked");
        if ($("div#note input#wordwrap").attr("checked"))
            $('div#note #contenteditor').css("white-space","normal");
        else
            $('div#note #contenteditor').css("white-space","nowrap");
    });

    if (localStorage.wordwrap != undefined && localStorage.wordwrap == "true") {
        $("div#note input#wordwrap").attr("checked","true");        
    } else {
        $("div#note input#wordwrap").attr("checked","");        
    }
    $("div#note input#wordwrap").change();

    if (localStorage.option_editorfont )
        $("div#note #contenteditor").css("font-family",localStorage.option_editorfont );
    if (localStorage.option_editorfontsize )
        $("div#note #contenteditor").css("font-size",localStorage.option_editorfontsize + "px" );
    if (localStorage.option_editorfontshadow && localStorage.option_editorfontshadow == "true")
        $("div#note #contenteditor").css("text-shadow","2px 2px 2px #aaa" );
    
    // get note contents
    if (note.key == "") { // new note
        
        // delete button now cancel button
        $('div#note div#toolbar input#destroy').val("Cancel");
        $('div#note div#toolbar input#destroy').attr("title","Dont save note, return to notes");
        $('div#note input#destroy').unbind();
        $('div#note input#destroy').click(function() {
            slideIndex();
        });
    
        // insert data
        $('div#note #contenteditor').html("");
        //$('div#note div#info').html("");

        // show/hide elements        
        $("div#note input#pinned").attr("checked","");        
        $('div#note input#tags').val("");
        $('div#note input#undo').hide();                

    } else { // existing note
        
        // bind TRASH button
        $('div#note div#toolbar input#destroy').val("Trash");
        $('div#note div#toolbar input#destroy').attr("title","Send note to trash");
        $('div#note input#destroy').unbind();
        $('div#note input#destroy').click(note,function(event) {
            editorTrashNote(event.data.key);
        });

        // bind UNDO button
        $('div#note input#undo').unbind();
        $('div#note input#undo').click(note,function(event) {
            setEditorContent(note.content);
            $('div#note input#tags').val(note.tags.join(" "));
            if (note.systemtags.indexOf("pinned")>=0)
                $('div#note input#pinned').attr("checked","checked");
            else
                $('div#note input#pinned').removeAttr("checked");

            $('div#note input#undo').attr("disabled","disabled");
        });
        $('div#note input#undo').attr("disabled","disabled");
                
        // insert data
        setEditorContent(note.content);
        $('div#note input#tags').val(note.tags.join(" "));        
        if (note.systemtags.indexOf("pinned")>=0)
            $('div#note input#pinned').attr("checked","checked");
        else
            $('div#note input#pinned').removeAttr("checked");
        
        // info div
        //$('div#note div#info').html(note2str(note));
        // show/hide elements
        
        $('div#note input#undo').show();
        localStorage.opentonotekey = note.key;
    }


    //$('div#note input#pinned').html("&nbsp;&nbsp;&nbsp;&nbsp;pin");
    $('div#note input#wordwrap').html("&nbsp;&nbsp;&nbsp;&nbsp;Wordwrap")

    // needed for background save
    $('div#note #contenteditor').attr('key',note.key);

    slideNote(function () {
        $('div#note #contenteditor').focus();
    }, duration);

}

//  ---------------------------------------

function editorNoteChanged(key,callback) {
        
    var noteData = {};
    if ($('div#note #contenteditor').attr("dirty")=="true")
        noteData.content = getEditorContent();
    if ($('div#note input#pinned').attr("dirty")=="true")
        noteData.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[]; // todo: "read" systag
    if ($('div#note input#tags').attr("dirty")=="true")
        noteData.tags = $('div#note input#tags').val().trim().split(" ");

    log("editorNoteChanged:noteData:");
    log(noteData);
    
    if (noteData.content == '' && key !='')     // existing note emptied -> trash
        editorTrashNote(key);
    else if (key != '' ) {                  // existing note, new data -> update
        noteData.key = key;
        noteData.action = "update";
    } else if (noteData.content != '')          // new note, new data -> create
        noteData.action = "create";
    else                                    // new note, no data -> back to index
        slideIndex();
    
        
    if (noteData.action) {
        log("editorNoteChanged:request:");
        log(noteData);
        // can do this here because notes are stored for sync anyways
        chrome.extension.sendRequest(noteData, function(note) {
            log("editorNoteChanged: request complete");
            if (callback)
                callback();
        });        
    }
    
}

//  ---------------------------------------

function editorIsNoteDirty() {
    return $('div#note #contenteditor').attr("dirty")=="true" ||
        $('div#note input#pinned').attr("dirty")=="true" ||
        $('div#note input#tags').attr("dirty")=="true";
}

//  ---------------------------------------

function editorTrashNote(key) {
    log("editorTrashNote");
    $('div#note div#toolbar input').attr('disabled', 'disabled');    
    slideIndex();
    chrome.extension.sendRequest({action : "update", key : key, deleted : 1},
            function() {
                $('div#note div#toolbar input').removeAttr('disabled');
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

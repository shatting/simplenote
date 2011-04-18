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
    log("unload listener");
    background.isBackgroundSyncEnabled = false;
    if (isNoteDirty()) {
        var note = {};
        log("unload listener: requesting background save");
                
        if ($('div#note textarea').attr("dirty")=="true")
            note.content = $('div#note textarea').val();        
        if ($('div#note input#pinned').attr("dirty")=="true")
            note.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[]; // todo: "read" systag       
        if ($('div#note input#tags').attr("dirty")=="true")
            note.tags = $('div#note input#tags').val().split(" ");
        
        note.key = $('div#note textarea').attr('key');

        log("unload listener: note:");
        log(note);
        
        background.saveNote = note;
        background.setTimeout("popupClosed()", 1);
    } else 
        log("unload listener: no background save");
}, true);


chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
    log("got event: " + request.event);
    log(request);
    if (request.event == "sync") {
        log("syncListener:status=" + request.status + ", hadChanges=" + request.hadChanges );

        if (request.status == "started") {
            $("#sync").html("sync started");            
        } else if (request.status == "done") {
            if (request.hadChanges) {
                showIndex();
                $("#sync").html("sync done, had changes");
            } else {
                $("#sync").html("sync done.");
            }            
        } else if (request.status == "error") {
            $("#sync").html("sync error");
        }
    } else if (request.event == "offline") {
        if (request.isOffline)
            $("#offline").html("offline");
        else
            $("#offline").html("online");
    } else if (request.event == "noteupdated") {
        // request.note
    } else if (request.event == "notedeleted") {
        // request.key
    }
});

//  ---------------------------------------
$(document).ready(function() {
    background.console.log("------- popup opened");
    var signUpLink =  "<a href='https://simple-note.appspot.com/create/'>signup</a>";
    var optionsLink = "<a href='options.html'>options page</a>";
    
    if ( !localStorage.option_email || !localStorage.option_password) {
        var message = "Please " + signUpLink + " for a Simplenote account and enter your credentials on the " + optionsLink + ".";
        displayStatusMessage(message);
    }
    else {        
        log("ready listener: requesting login");
        chrome.extension.sendRequest({action : "login"}, function(result) {
            if (result.success) {
                log("ready listener: login success");                                

                log("ready listener: requesting sync");
                chrome.extension.sendRequest({action: "sync", fullsync:true});
                

                if (localStorage.opentonotekey && localStorage.opentonotekey != "" && localStorage.option_opentonote == "true")
                    showNote(localStorage.opentonotekey);
                else {
                    log("ready listener:calling showIndex");
                    showIndex();
                }

                $('div#index div#toolbar div#add').click(function() {
                    showNote();
                });

                $("#sync").click( function() {
                    chrome.extension.sendRequest({action: "sync", fullsync:true});
                })
    
                var options = {
                    callback : function() {
                        log("typewatch:calling showIndex");
                        showIndex();
                    },
                    wait : 250,
                    highlight : false,
                    captureLength : -1 // needed for empty string ('') capture
                };
                $('div#index div#toolbar input#q').typeWatch(options);                                                
                
                if (!isDebug)
                     $('div#note div#info').hide();
            }
            else {
                log("ready listener: login error, message=" + result.message);
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
    $('#loader').hide();
    $('#toolbar').hide();
    $('#status').html(message);
    links = $('a');
    links.attr('target', '_blank');
    links.click(function() {window.close();});
}

//  ---------------------------------------
function fillTags(allowedToShowIndex) {
    chrome.extension.sendRequest({action:"tags"}, function(taginfos) {
        // fill dropdown
        $("#notetags").unbind();
        var stillhavetag = false;
        var val = $("#notetags").val();
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

            if (val == taginfo.tag)
                stillhavetag = true;
        });

        if (!stillhavetag) {
            val = "";            
        }
        // add handler
        
        $("#notetags").val(val);
        $("#notetags").change(function(event) {
            log("notetags changed:calling showIndex");
            showIndex();
        });
        if (!stillhavetag && allowedToShowIndex) {
            log("fillTags:calling showIndex");
            showIndex();
        }
    });
}

//  ---------------------------------------
function showIndex() {
    log("showIndex: setting listeners");    

    var req =               {action : "getnotes", deleted : 0};
    req     = mergeobj(req, {tag : $("#notetags").val()});
    req     = mergeobj(req, {contentquery : $('#q').val()});
    req     = mergeobj(req, {sort:localStorage.option_sortby, sortdirection:localStorage.option_sortbydirection});

    log("showIndex:");
    log(req);
  
    $('div#index').show("fast");
    $('div#index div#notes').empty();    

    fillTags(false);

    chrome.extension.sendRequest(req, function(notes) {
            
        $('#loader').hide();

        if (notes.length > 0) {
            for(var i = 0; i < notes.length; i ++ ) {
                indexAddNote("append",notes[i]);
                if (i<15 && note.content != undefined)
                    indexFillNote(notes[i]);
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

    html+=          "<span class='notetime' id='" + note.key + "time'>" + (localStorage.option_showdate == "true"?gettimeadd(note.modifydate):"");
    if (note.deleted == 0)
        html+=          "<div class='" + (note.systemtags.indexOf("pinned")>=0?"pinned":"unpinned") + "' id='" + note.key + "pin'>&nbsp;</div>";
    html+=          "</span>";
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
        $noteheading.append(htmlEncode(lines[0]));
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
            $noterow.click(function() {
                showNote(this.id)
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
    return s.replace(/&(?!\w+([;\s]|$))/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
function gettimeadd(s) {
    var now = new Date(Date.now());
    var mod = convertDate(s);
  
    var diff = (now - mod) / 1000 / 60 / 60;
    var timeadd;

    if (diff < 24) {
        timeadd = pad(mod.getHours()) + ":" + pad(mod.getMinutes());
    }
    else {
        timeadd = mod.getDate() + "." + (mod.getMonth()+1) + ".";
    }

    return timeadd;
}

//  ---------------------------------------

function pad(i) {
    if (i < 10) return "0" + i;
    else return "" + i;
}

//  ---------------------------------------

function showNote(key) {
    log("showNote");
  
    $('div#index').hide("fast");  
    $('#loader').show();  
    $('div#note').show("fast");

    $('div#note div#toolbar input').removeAttr('disabled');    
    $("div#note input").removeAttr("dirty");
    // dont work:
    //$('div#note textarea#editor').scrollTop(0);
    //$('div#note textarea#editor').scrollLeft(0);
    //
    // add note content change (dirty) event listeners
    $('div#note textarea').unbind();
    $('div#note textarea').bind('change keyup paste', function(event) {
        var note = $(this).data("note");
        if (note.content != $(this).val()) {
            log("note content is dirty (" + event.type + ")");
            $('div#note textarea').attr('dirty', 'true');
        } else {
            log("note content not dirty (" + event.type + ")");
            $('div#note textarea').removeAttr('dirty');
        }
        if (isNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","true");
    });
    
    // add note tags change (dirty) event listeners
    $('div#note input#tags').unbind();
    $('div#note input#tags').bind('change keyup paste', function(event) {
        var note = $('div#note textarea').data("note");
        if (note.tags.join(" ") != $(this).val().trim()) {
            log("tags dirty (" + event.type + ")");
            $('div#note input#tags').attr('dirty', 'true');
        } else {
            log("tags not dirty (" + event.type + ")");
            $('div#note input#tags').removeAttr('dirty');
        }
        if (isNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","true");
    });
    
    // add note pinned (dirty) event listeners
    $('div#note input#pinned').unbind();
    $('div#note input#pinned').bind('change', function(event) {
        var note = $('div#note textarea').data("note");
        var waspinned = note.systemtags.indexOf("pinned")>=0;
        
        if (waspinned != $("div#note input#pinned").attr("checked")) {
            log("pinned dirty (" + event.type + ")");
            $('div#note input#pinned').attr('dirty', 'true');
        } else {
            log("pinned not dirty (" + event.type + ")");
            $('div#note input#pinned').removeAttr('dirty');
        }
        if (isNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","true");
    });

    // bind back button
    $('div#note input#backtoindex').unbind();
    $('div#note input#backtoindex').click(function() {
        log("back clicked");
        if (isNoteDirty()) 
            updateNote(backToIndex);
        else
            backToIndex();   
    });

    // bind editor    
    $('div#note textarea#editor').keydown(function(event) {
        // tab: keyCode: 9
        if (event.keyCode == 9) {
            $('div#note textarea#editor').insertAtCaret("   ");            
            event.preventDefault();
        }
    });
    

    if (localStorage.option_editorfont )
        $("div#note textarea#editor").css("font-family",localStorage.option_editorfont );
    if (localStorage.option_editorfontsize )
        $("div#note textarea#editor").css("font-size",localStorage.option_editorfontsize + "px" );
    if (localStorage.option_editorfontshadow && localStorage.option_editorfontshadow == "true")
        $("div#note textarea#editor").css("text-shadow","2px 2px 2px #aaa" );
    
    // get note contents
    if (key === undefined) { // new note
        
        // delete button now cancel button
        $('div#note div#toolbar input#destroy').val("Cancel");
        $('div#note input#destroy').unbind();
        $('div#note input#destroy').click(function() {
            backToIndex();
        });
    
        // insert data
        $('div#note textarea').val("");
        $('div#note textarea').attr('key', '');
        $('div#note div#info').html("");
        // dummy note data
        var note = {content:"",tags:[],systemtags:[]};
        $('div#note textarea').data("note",note);

        // show/hide elements
        $('#loader').hide();
        $("div#note input#pinned").attr("checked","");        
        $('div#note input#tags').val("");
        $('div#note input#undo').hide();
        $('div#note textarea').show();
        $('div#note textarea').focus();    
    }
    else { // existing note, request from server
        
        // bind delete button
        $('div#note div#toolbar input#destroy').val("Delete");
        $('div#note input#destroy').unbind();
        $('div#note input#destroy').click(function() {
            trashNote();
        });

        // bind undo button
        $('div#note input#undo').unbind();
        $('div#note input#undo').click(key,function(event) {            
            showNote(event.data);
        });
        $('div#note input#undo').attr("disabled","true");
        $('div#note input#undo').show();
        
        // request note
        chrome.extension.sendRequest({
            action : "note", 
            key : key
        }, function(note) {
            log("showNote: note request complete");
            // insert data
            $('div#note textarea').val(note.content);
            $('div#note input#tags').val(note.tags.join(" "));
            $('div#note textarea').attr('key', key); 
            $('div#note textarea').data("note",note);
            if (note.systemtags.indexOf("pinned")>=0)
                $('div#note input#pinned').attr("checked","checked");
            else
                $('div#note input#pinned').removeAttr("checked");
            
            // info div
            $('div#note div#info').html(note2str(note));
            // show/hide elements
            $('#loader').hide();  
            $('div#note input#pinned').show();
            $('div#note input#pinned').html("&nbsp;&nbsp;&nbsp;&nbsp;pin");
            $('div#note input#tags').show();
            $('div#note textarea#editor').show();
            $('div#note textarea#editor').focus();

            localStorage.opentonotekey = note.key;
        });
    }  

}

//  ---------------------------------------

function updateNote(callback) {
    
    var key = $('div#note textarea').attr('key');
    
    note = {};
    if ($('div#note textarea').attr("dirty")=="true")
        note.content = $('div#note textarea').val();
    if ($('div#note input#pinned').attr("dirty")=="true")
        note.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[]; // todo: "read" systag
    if ($('div#note input#tags').attr("dirty")=="true")
        note.tags = $('div#note input#tags').val().trim().split(" ");

    log("updateNote:note:");
    log(note);
    
    if (note.content == '' && key !='')     // existing note emptied -> trash
        trashNote();
    else if (key != '' ) {                  // existing note, new data -> update
        note.key = key;
        note.action = "update";
    } else if (note.content != '')          // new note, new data -> create
        note.action = "create";
    else                                    // new note, no data -> back to index
        backToIndex();
    
        
    if (note.action) {
        log("updateNote:request:");
        log(note);
        // can do this here because notes are stored for sync anyways
        $('div#note textarea').removeAttr('dirty');
        $('div#note input#pinned').removeAttr("dirty");
        $('div#note input#tags').removeAttr('dirty');
        chrome.extension.sendRequest(note, function(note) {
            log("updateNote: request complete");                    
            if (callback)
                callback();
        });        
    }
    
}

//  ---------------------------------------

function isNoteDirty() {
    return $('div#note textarea').attr("dirty")=="true" ||
        $('div#note input#pinned').attr("dirty")=="true" ||
        $('div#note input#tags').attr("dirty")=="true";
}

//  ---------------------------------------

function backToIndex() {
    log("backToIndex");
    $('div#note div#toolbar input').attr('disabled', 'disabled');
    $('div#note textarea').hide();
    $('div#note').hide();
    localStorage.opentonotekey = "";
    
    showIndex();
}

//  ---------------------------------------

function trashNote() {
    log("trashNote");
    $('div#note div#toolbar input').attr('disabled', 'disabled');
    
    chrome.extension.sendRequest({
        action : "update", 
        key : $('div#note textarea').attr('key'),
        deleted : 1
        }, function() {
        backToIndex();
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

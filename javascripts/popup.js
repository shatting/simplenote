var extData = extData || {};

$.extend(extData,{
    background: undefined,
    
    popup : this,
    
    times : {
        popup: (new Date())-start
    },
    
    preLoadFactor : 1/2, // amount of vertical viewport size to add for preloading notes in index
    
    currentView: "index",
    
    slideEasing: "swing", // swing or linear
    
    slideDuration: 200,
    
    isTab : false,
    
    editorSaveTime: 3000,
    
    dimensions : {
        def:  {
            index_left: 2,
            index_right: 2,
            note_left: 400,
            body_width: 400,
            body_height: 550
        },
        selected: {
            index_left: 2,
            index_right: 2,
            note_left: 400,
            body_width: 800,
            body_height: 550
        },
        focus: {
            index_left: -400,
            index_right: -2,
            note_left: 2,
            body_width: 800,
            body_height: 550
        }
    },
    
    fontUrls : {        
        "Walter Turncoat"   : '<link href="http://fonts.googleapis.com/css?family=Walter+Turncoat:regular" rel="stylesheet" type="text/css" >',
        "Inconsolata"       : '<link href="http://fonts.googleapis.com/css?family=Inconsolata:regular" rel="stylesheet" type="text/css" >',
        "Lekton"            : '<link href="http://fonts.googleapis.com/css?family=Lekton" rel="stylesheet" type="text/css">',
        "Yanone Kaffeesatz" : '<link href="http://fonts.googleapis.com/css?family=Yanone+Kaffeesatz:300" rel="stylesheet" type="text/css" >',
        "Vollkorn"          : '<link href="http://fonts.googleapis.com/css?family=Vollkorn:regular" rel="stylesheet" type="text/css" >'
    }
});

//  ---------------------------------------

var snEditor;

//  ---------------------------------------
function log(s) {
    if (extData.debugFlags.popup)
        logGeneral(s,"popup.js",console);
    if (extData.debugFlags.popup2BG)
        logGeneral(s,"popup.js",extData.background.console);
}

//  ---------------------------------------
// event listener for popup close
// defer save to background
addEventListener("unload", unloadListener, true);
function unloadListener() {
    try {
        if (snEditor && snEditor.isNoteDirty()) {
            var note = {};
            log("(unload): requesting background save");

            if (snEditor.dirty.content)
                note.content = snEditor.codeMirror.getCode();
            if (snEditor.dirty.pinned) {
                snEditor.needCMRefresh("pinned");
                note.systemtags = snEditor.note.systemtags;
                if (!snEditor.isPintoggle()) {
                    note.systemtags.splice(note.systemtags.indexOf("pinned"),1);
                } else {
                    note.systemtags.push("pinned");
                }
            }
            if (snEditor.dirty.tags)
                note.tags = snEditor.getTags();
    //        if ($('div#note input#encrypted').attr("dirty")=="true")
    //            note.encrypted = $('div#note input#encrypted')?1:0;

            note.key = snEditor.note.key;

            log("(unload): note:");
            log(note);

            extData.background.SimplenoteBG.saveNote = note;
        } else
            log("(unload): no background save");

        if (snEditor)
            snEditor.saveCaretScroll();

        if (extData.isTab)
            extData.background.SimplenoteBG.setOpenPopup(true);

        extData.background.setTimeout("SimplenoteBG.popupClosed()", 10);
    } catch(e) {
        exceptionCaught(e);
    }
}

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
    try {
        var eventName = eventData.name;
    //    if (syncInProgress && (eventName == "noteadded" || eventName == "noteupdated" || eventName == "notedeleted"))
    //            return;
        
        if (eventName == "sync") {

            log("EventListener:sync:" + eventData.status + ", hadChanges=" + eventData.changes.hadchanges );

            if (eventData.status == "started") {
                $("#sync").html(chrome.i18n.getMessage("sync_in_progress"));
            } else if (eventData.status == "done") {
                if (eventData.changes.hadchanges) {
                    fillTags(true);
                    $("#sync").html(chrome.i18n.getMessage("sync_done_had_changes"));
                } else {
                    $("#sync").html(chrome.i18n.getMessage("sync_done"));
                }
            } else if (eventData.status == "error") {
                $("#sync").html(chrome.i18n.getMessage("sync_error")+ ": " + eventData.errorstr);
            }

        } else if (eventName == "noteadded") {
            log("EventListener:" + eventName);
            fillTags(true);
    //        if (!eventData.note.key.match(/created/))
    //             SNEditor.setNote(eventData.note);
        } else if (eventName == "noteupdated") {
            log("EventListener:noteupdated, source=" + eventData.source + ", changed=[" + eventData.changes.changed.join(",") + "], syncNote=" + (eventData.newnote._syncNote?"true":"false"));
            var pinnedNowOn = eventData.changes.changed.indexOf("systemtags")>=0 && eventData.oldnote.systemtags.indexOf("pinned")<0 && eventData.newnote.systemtags.indexOf("pinned")>=0;
            var pinnedNowOff = eventData.changes.changed.indexOf("systemtags")>=0 && eventData.oldnote.systemtags.indexOf("pinned")>=0 && eventData.newnote.systemtags.indexOf("pinned")<0;
            var modifyChanged = eventData.changes.changed.indexOf("modifydate")>=0;
            var deleted = eventData.changes.changed.indexOf("deleted")>=0 && eventData.oldnote.deleted == 0 && eventData.newnote.deleted == 1;
            var undeleted = eventData.changes.changed.indexOf("deleted")>=0 && eventData.oldnote.deleted == 1 && eventData.newnote.deleted == 0;
//            console.log(eventData.oldnote)
//            console.log(eventData.newnote)
            if (deleted) {
                log("EventListener:noteupdated: deleted");
                if (noteRowInIndex(eventData.newnote.key)) {
                    $('div.noterow#' + eventData.newnote.key).attr("deleteanimation","true");
                    $('div.noterow#' + eventData.newnote.key).hide("slow", function() {$(this).remove();});
                }
                if (localStorage.lastopennote_key == eventData.newnote.key) {
                    delete localStorage.lastopennote_key
                    snEditor.needCMRefresh("lastopen");
                }
                if (eventData.newnote.systemtags.indexOf("pinned")>=0)
                    snEditor.needCMRefresh("pinned");

                fillTags(false);
                snEditor.hideIfNotInIndex(eventData.newnote.key);
            } else if (undeleted) {
                log("EventListener:noteupdated: undeleted");
                if (noteRowInIndex(eventData.newnote.key)) {
                    $('div.noterow#' + eventData.newnote.key).attr("deleteanimation","true");
                    $('div.noterow#' + eventData.newnote.key).hide("slow", function() {$(this).remove();});
                }
                if (eventData.newnote.systemtags.indexOf("pinned")>=0)
                    snEditor.needCMRefresh("pinned");

                fillTags(false);
                snEditor.hideIfNotInIndex(eventData.newnote.key);
            } else if (eventData.changes.changed.indexOf("tags")>=0) {
                log("EventListener:noteupdated:tags");
                fillTags(true);
            } else if (modifyChanged || pinnedNowOn || pinnedNowOff) {
                if (modifyChanged)
                    log("EventListener:noteupdated:modifychanged");
                else if (pinnedNowOn)
                    log("EventListener:noteupdated:pinnednowon");
                else if (pinnedNowOff)
                    log("EventListener:noteupdated:pinnednowoff");
                         
                if (($("#" + eventData.newnote.key).index()>0 || pinnedNowOff) && localStorage.option_sortby != "createdate") {
                    fillTags(true);
                } else {
                    indexAddNote("replace", eventData.newnote);
                    if (eventData.newnote.content)
                        indexFillNote(eventData.newnote);
                }
            }

            if (pinnedNowOn) {
                $('div.noterow #' + eventData.newnote.key + "pin").removeClass("unpinned");
                $('div.noterow #' + eventData.newnote.key + "pin").addClass("pinned");
                snEditor.needCMRefresh("pinned");
            } else if (pinnedNowOff) {
                $('div.noterow #' + eventData.newnote.key + "pin").removeClass("pinned");
                $('div.noterow #' + eventData.newnote.key + "pin").addClass("unpinned");
                snEditor.needCMRefresh("pinned");
            }

            if (extData.isTab) {
                if ((pinnedNowOn || pinnedNowOff) && snEditor && snEditor.note && snEditor.note.key == eventData.newnote.key)
                    snEditor.setPintoggle(eventData.newnote.systemtags.indexOf("pinned")>=0);
            }
            if (eventData.source != "local" && snEditor && snEditor.note && snEditor.note.key == eventData.newnote.key) {
                    var contentChanged = eventData.changes.added.indexOf("content")>=0;
                    var tagsChanged = eventData.changes.changed.indexOf("tags")>=0;
                    if ( pinnedNowOn || pinnedNowOff || contentChanged || tagsChanged )
                        snEditor.setNote(eventData.newnote);
            }
        } else if (eventName == "offlinechanged") {
            log("EventListener:offline:" + eventData.status);
            if (eventData.status)
                $("#offline").html("offline mode");
            else
                $("#offline").html("");
        } else if (eventName == "synclistchanged") {
            if (eventData.added) {
                $('div#' + eventData.added + "syncicon").show();
                log("EventListener:synclistchanged, added=" + eventData.added);
            }
            if (eventData.removed) {
                $('div#' + eventData.removed + "syncicon").hide();
                log("EventListener:synclistchanged, removed=" + eventData.removed);
            }
            //log("length=" + $('div#' + eventData.removed + "heading").length)
        } else if (eventName == "notedeleted") {
            log("EventListener:notedeleted:" + eventData.key);
            $('div.noterow#' + eventData.key).remove();
            fillTags(false);
            snEditor.hideIfNotInIndex(eventData.key);
        } else {
            log("EventListener:");
            log(eventData);
        }        
    } catch (e) {
        exceptionCaught(e);
    }
}

function noteRowInIndex(key) {
    return $('div.noterow#' + key).length > 0;
}

// shortcuts
$(document).keydown(shorcuts);
function shorcuts(event) {   

    if ($("#q").is(":focus")) {
        switch(event.keyCode) {
            case 27: // esc
                log("esc")
                $("#q_clear").mousedown();
                event.preventDefault();
                return;
            break
        }
    }

    if (event.altKey && !event.ctrlKey && !event.shiftKey)
        switch(event.keyCode) {
            case 88: //alt-x
                window.close();
            break
        }

    if (extData.isTab) {

        if (!event.altKey && event.ctrlKey && !event.shiftKey)
            switch(event.keyCode) {
                case 83: //ctrl-s
                    snEditor.saveNote();
                    event.preventDefault();
                break
            }
    }

    if (extData.currentView=="index" || extData.isTab) {
    // - index:
        var notesheight = $("div#notes").get(0).scrollHeight;

        if (event.altKey && !event.ctrlKey && !event.shiftKey)
            switch(event.keyCode) {
                case 38: //alt-up
                    $("div#notes").scrollTop($("div#notes").scrollTop()-notesheight/20)
                break;
                case 40: //alt-down
                    $("div#notes").scrollTop($("div#notes").scrollTop()+notesheight/20)
                break;
                case 39: //alt-right
                break;
                case 65: //alt-a
                    event.preventDefault();
                    $("div#index #add").click();
                    break;
                case 78: //alt-n
                    event.preventDefault();
                    $("div#index #notetags").focus();
                    break;
                case 81: //alt-q
                    event.preventDefault();
                    $("div#index input#q").focus();
                    break;

            }
    }
    
    if (extData.currentView=="editor" || extData.isTab) {
        // - editor: 
        if (event.altKey && !event.shiftKey && !event.ctrlKey)
            switch(event.keyCode) {
                case 83: //alt-s
                    snEditor.searchForSelection();break;
                case 86: //alt-v
                    if (!extData.isTab) snEditor.insertUrl();break;
                case 66: //alt-b
                    $('div#note #backtoindex').click();break;
                case 82: //alt-r
                    if (!extData.isTab) $('div#note #revert').click();break;
                case 79: //alt-o
                    if (!extData.isTab) $('div#note #popout').click();break;
                case 80: //alt-p
                    $('div#note #pintoggle').click();
                    break;
                case 87: //alt-w                    
                    $("div#note #wraptoggle").click();
                    break;
                case 84: //alt-t
                    event.preventDefault();
                    $("#tagsauto").focus();                    
                    break;
                case 69: //alt-e
                    event.preventDefault();
                    snEditor.focus();
                    break;
            }
        if (event.altKey && !event.shiftKey && event.ctrlKey)
            switch(event.keyCode) {                                                    
                case 68: //crtl-alt-d                    
                    $('#trash').click();break;
            }
    }
}

//  ---------------------------------------
$(document).ready(readyListener);
function readyListener() {
    
    extData.times.ready = (new Date())-start;

    try {
        
        extData.background = chrome.extension.getBackgroundPage();
        chrome.browserAction.setBadgeText({
            text:""
        }); // reset badge

        if (!extData.background) {
            console.log("deferring listener a bit");
            _gaq.push(['_trackEvent', 'popup', 'ready', 'deferred_a_bit']);
            setTimeout("readyListener()",1000);
            return;
        }
        var m = location.href.match(/\?.*tab\=(true|false).*/);        
        extData.isTab = m != undefined && m[1] == "true";

        if (extData.isTab) {
            log("---------------- tab opened ---------------------");
            chrome.tabs.getCurrent(function (tab) {
                extData.background.SimplenoteBG.setOpenTab(tab);
            })
        } else {
            log("---------------- popup opened ---------------------");
        }

        var signUpLink =  "<a href='https://simple-note.appspot.com/create/'>" + chrome.i18n.getMessage("signup") + "</a>";
        var optionsLink = "<a href='options.html'>" + chrome.i18n.getMessage("options_page") + "</a>";

        if ( !SimplenoteSM.haveLogin() ) {

            _gaq.push(['_trackEvent', 'popup', 'ready', 'no_email_or_password']);

            log("(ready): no email or password");
            displayStatusMessage(chrome.i18n.getMessage("welcometext", [signUpLink, optionsLink]));

        } else if ( !SimplenoteSM.credentialsValid() ) {

            _gaq.push(['_trackEvent', 'popup', 'ready', 'credentails_not_valid']);

            log("(ready): credentials not valid");
            displayStatusMessage("Login for email '" + SimplenoteSM.email() + "' failed, please check your Simplenote email address and password on the " + optionsLink + "!");

        } else {
                extData.times.startsetup = (new Date())-start;

                _gaq.push(['_trackEvent', 'popup', 'ready']);

                var directlyShowNote = localStorage.lastopennote_key != undefined && localStorage.lastopennote_key != "" && localStorage.lastopennote_open == "true" && localStorage.option_opentonote == "true";

                $("body").show();

                if (!extData.isTab) {
                    $("#print").hide();

                    if (!directlyShowNote) {
                        $("body").css("width", extData.dimensions.def.body_width + "px");
                        $("body").css("height", extData.dimensions.def.body_height + "px");
                    } else {                        
                        $("body").css("width", extData.dimensions.focus.body_width + "px");
                        $("body").css("height", extData.dimensions.focus.body_height + "px");
                                                
                        $("#revert").hide();
                        $("#trash").show();        
                        $('#popout').show();
                        
                        $("#note").css("left", extData.dimensions.focus.note_left + "px");
                        
                        $("#note").show();
                                              
                    }
                } else {
                    $("#note").show();
                }

                popupi18n();

                snEditor = new SNEditor();

                if (directlyShowNote) {
                    log("(ready): sending request for open to note");
                    chrome.extension.sendRequest({action:"note", key:localStorage.lastopennote_key},
                        function(note) {
                            try {
                                if (note)
                                    snEditor.setNote(note,{
                                        duration:0,
                                        focus: true
                                    });
                            } catch (e) {
                                exceptionCaught(e);
                            }
                        });
                }

                fillTags(true);
                // bind ADD button
                $('div#index div#toolbar div#add').click(function(event) {
                    
                    if (event.shiftKey) {
                        _gaq.push(['_trackEvent', 'popup', 'addwebnoteclicked']);
                        
                        if (extData.isTab) {                        
                            return;
                        }
                        chrome.extension.sendRequest({
                            action: "webnotes",
                            request: {
                                action: "new"
                            }
                        }, function(ok) {
                            if (ok)
                                extData.popup.close();
                        });
                    } else {
                        _gaq.push(['_trackEvent', 'popup', 'addclicked']);
                        snEditor.setNote();
                    }

                });

                // bind ADD WEBNOTE button
                $('div#index div#toolbar div#add_webnote').click(function(event) {
                    
                    if (extData.isTab)
                        return;
                    
                    _gaq.push(['_trackEvent', 'popup', 'addwebnoteclicked']);
                    
                    chrome.extension.sendRequest({
                        action: "webnotes",
                        request: {
                            action: "new"
                        }
                    }, function(ok) {
                        if (ok)
                            extData.popup.close();
                    });
                });

                // bind SYNC div
                $("#sync").click( function() {
                    _gaq.push(['_trackEvent', 'popup', 'syncclicked']);
                    chrome.extension.sendRequest({
                        action: "sync",
                        fullsync:true
                    });
                })
                $("#snlink").click( function(event) {
                    _gaq.push(['_trackEvent', 'popup', 'snlinkclicked']);
                    openURLinTab("https://simple-note.appspot.com/",event.ctrlKey || event.altKey);
                })

                // bind SEARCH field
                $('#q').bind("keyup", function(event) {
                    if (event.which == 13) {
                        snEditor.setNote({
                            content:$(this).val() + "\n",
                            tags:[],
                            systemtags:[],
                            key:""
                        },{
                            isnewnote: true,
                            focus: true
                        });
                    } else if (event.which == 27) {                        
                        //event.stopPropagation();
                    } else
                        fillIndex();

                }).focus(function() {
                    log("focus")
                    $("#toolbar").children().not(this).not("#q_clear").hide();
                    $(this).animate({width:"350px"},{duration: 200, complete: function() {$("#q_clear").show();}});
                }).blur(function(event) {
//                            if (clearclicked) {
//                                clearclicked = false;
//                                return
//                            }
                    log("blur")
                    $(this).animate({width:"197px"},{duration: 200, complete: function() {
                            $("#toolbar").children().not(this).not("#q_clear").show();
                            if ($("#q").val().trim() == "")
                                $("#q_clear").hide();
                        }});
                });
//                        var clearclicked = false;
                $("#q_clear").bind("mousedown",function(event) {
//                            clearclicked = true;
                    log("mousedown")
                    $('#q').val("");
                    $("#q_clear").hide();
                    $("#q").blur()
                    event.stopPropagation();
                    $("body").focus();
                    fillIndex();
                    
                });

                $.timeago.settings.strings= {
                    prefixAgo: null,
                    prefixFromNow: null,
                    suffixAgo: "",
                    suffixFromNow: "from now",
                    seconds:    chrome.i18n.getMessage("seconds"),
                    minute:     chrome.i18n.getMessage("minute"),
                    minutes:    chrome.i18n.getMessage("minutes"),
                    hour:       chrome.i18n.getMessage("hour"),
                    hours:      chrome.i18n.getMessage("hours"),
                    day:        chrome.i18n.getMessage("day"),
                    days:       chrome.i18n.getMessage("days"),
                    month:      chrome.i18n.getMessage("month"),
                    months:     chrome.i18n.getMessage("months"),
                    year:       chrome.i18n.getMessage("year"),
                    years:      chrome.i18n.getMessage("years"),
                    numbers: []
                }

                if (localStorage.option_color_index)
                    $("body").css("background-color",localStorage.option_color_index);

                //$("div#note").resizable();
                if (extData.isTab) {
                    //$("div#note").css("left","421px");
                    //$("#container").splitter();

//                    $("div#slider").show();
//                    $("div#note").css("left","421px");
//
//                    $("div#note").resizable({handles: {"w": $("div#slider").get(0)},
//                            resize: function(event, ui)
//                            {
//                                var left = ui.position.left;
//                                $('div#index').css("width", (left-24)+"px");
//                                $('div#slider').css("left", (left-22)+"px");
//                            },
//                            stop: function(event, ui)
//                            {
//                                var left = ui.position.left;
//                                $('div#index').css("width", (left-24)+"px");
//                                $('div#slider').css("left", (left-22)+"px");
//                            }
//                    });
//                    console.log(cssprop("div#note","left"))
//                    console.log($("div#index").css("right"))
                    $("div#index").css("width",cssprop("div#note","left")-4)
                }

            setTimeout(function() {
                log("(ready, delayed): requesting full sync.");
                chrome.extension.onRequest.addListener(uiEventListener);

                chrome.extension.sendRequest({
                    action: "sync",
                    fullsync:true
                }, function() {
                    log("(ready, delayed + async): sync request complete");
                });
            },1000);

            extData.times.endsetup = (new Date())-start;

        }
   
        scheduleGA();
    
    } catch (e) {
        exceptionCaught(e);
    }
}

function popupi18n() {
    $("#q").attr("placeholder",chrome.i18n.getMessage("search_placeholder"));
    $("#q").attr("title",chrome.i18n.getMessage("search_tooltip","alt-q"));
    $("#notetags").attr("title",chrome.i18n.getMessage("tagselect_tooltip","alt-n"));
    $("#add").attr("title",chrome.i18n.getMessage("add_tooltip","alt-a"));
    $("#add_webnote").attr("title",chrome.i18n.getMessage("add_webnote_tooltip"));
    $("#snlink").attr("title",chrome.i18n.getMessage("snlink_tooltip"));
    $("#sync").attr("title",chrome.i18n.getMessage("sync_tooltip"));    
    $("#pintoggle").attr("title",chrome.i18n.getMessage("pin_tooltip","alt-p"));   
    $("#popout").attr("title",chrome.i18n.getMessage("popout_tooltip","alt-o"));
    $("#trash").attr("title",chrome.i18n.getMessage("trash_tooltip"," (ctrl-alt-d)"));
    $("#wraptoggle").attr("title",chrome.i18n.getMessage("wordwrap_tooltip","alt-w"));
    $("#revert").attr("title",chrome.i18n.getMessage("revert_tooltip","alt-r"));    
    $("#print").attr("title",chrome.i18n.getMessage("print_tooltip"));    

    if (extData.isTab)
        $('#backtoindex').attr("title",chrome.i18n.getMessage("close_tab_tooltip",["alt-b","alt-x"]));
    else
        $("#backtoindex").attr("title",chrome.i18n.getMessage("backtoindex_tooltip",["alt-b","alt-x"]));    
}

/*
 * Displays a status message.
 * @param message The HTML content of the status message to display. All links
 *     in the message are be adjusted to open in a new window and close the
 *     popup.
 */
function displayStatusMessage(message) {
    $('#toolbar').hide();
    $('#statusbar').hide();
    $('#note').hide();
    $("body").show();
    $("#index").show();
    
    $('#notes').html(message);
    $('body').css("background","#fff");
    $("body").css("width", "400px");
    $("body").css("height", "150px");    

    $('a').attr('target', '_blank').click(function() {window.close();});
}

/*
 * Fills the Tags dropdown with all tags from the DB.
 *
 * @param callFillIndex boolean, call fillIndex() after tags are filled or not
 */
function fillTags(callFillIndex) {
    log("fillTags");

    chrome.extension.sendRequest({action:"tags"}, function(taginfos) {
        try {
            // fill dropdown
            $("#notetags").unbind();
            var stillhavetag = false;
            var oldval = $("#notetags").val();
            $("#notetags").html("");
            var style;

            $.each(taginfos,function(i,taginfo) {
                style = taginfo.count > 0?"":'style="color:#aaa"';
                if (taginfo.tag == "#all#")
                    $("#notetags").append('<option value="" ' + style +  '>' + chrome.i18n.getMessage("tags_all") + ' [' + taginfo.count + ']</option>');
                else if (taginfo.tag == "#notag#")
                    $("#notetags").append('<option value="#notag#" ' + style +  '>' + chrome.i18n.getMessage("tags_untagged") + ' [' + taginfo.count + ']</option>');
                else if (taginfo.tag == "#trash#")
                    $("#notetags").append('<option value="#trash#" ' + style +  '>' + chrome.i18n.getMessage("tags_deleted") + ' [' + taginfo.count + ']</option>');
                else if (taginfo.tag == "#published#")
                    $("#notetags").append('<option value="#published#" ' + style +  '>' + chrome.i18n.getMessage("tags_published") + ' [' + taginfo.count + ']</option>');
                else if (taginfo.tag == "#shared#")
                    $("#notetags").append('<option value="#shared#" ' + style +  '>' + chrome.i18n.getMessage("tags_shared") + ' [' + taginfo.count + ']</option>');
                else if (taginfo.tag == "#webnote#")
                    $("#notetags").append('<option value="#webnote#" ' + style +  '>' + chrome.i18n.getMessage("tags_webnote") + ' [' + taginfo.count + ']</option>');
                else if (taginfo.tag != "webnote" && taginfo.tag != "Webnotes") {
                    $("#notetags").append('<option value="' + taginfo.tag + '" ' + style +  '>' + taginfo.tag + " [" + taginfo.count + "] </option>");
                }
                if (oldval == taginfo.tag)
                    stillhavetag = true;                
            });
            if (!stillhavetag) {
                oldval = "#all#";
            }
            log("fillTags done");
           // add handler
            $("#notetags").val(oldval);
            $("#notetags").change(function(event) {
                log("#notetags:changed: calling fillIndex");
                fillIndex();
            });

            if (callFillIndex)
                fillIndex();
        } catch (e) {
            exceptionCaught(e);
        }
    });
}
/*
 * Fills the index pane with noterows.
 */
function fillIndex() {
    try {
        var req =               {action : "getnotes", deleted : 0};
        req     = mergeobj(req, {tag : $("#notetags").val()});
        req     = mergeobj(req, {contentquery : $('#q').val()});
        req     = mergeobj(req, {sort:localStorage.option_sortby, sortdirection:localStorage.option_sortbydirection});
        if ((localStorage.option_hidewebnotes == undefined || localStorage.option_hidewebnotes == "true") && (req.tag == "" || req.tag == "#all#"))
            req     = mergeobj(req, {notregex: extData.webnoteregstr});

        log("fillIndex: " + JSON.stringify(req));

//        if ($("#q").val() != "") {
//            $("#q_clear").show();
//        } else
//            $("#q_clear").hide();

        $("#index").show();

        var maxFill = $('#q').val()==""?15:1000;

        chrome.extension.sendRequest(req, function(notes) {
            try {
                log("fillIndex(async):request complete, building index");
                var note;

                $('div#index div#notes').empty();
                $('div#notes').unbind("scroll");

                if (notes.length > 0) {
                    for(var i = 0; i < notes.length; i ++ ) {
                        note = notes[i];
                        indexAddNote("append",note);
                        if (i<maxFill && note.content != undefined)
                            indexFillNote(note);
                    }                    
                    $("div.noterow").contextMenu(noteRowCMfn, {
                                                                  theme:'gloss',
                                                                  offsetX: 0,
                                                                  offsetY: 0,
                                                                  direction:'down',
                                                                  showSpeed: 10,
                                                                  onBeforeShow:function() {
                                                                      $(this.target).addClass("selectednote");
                                                                  },
                                                                  hideSpeed:10,
                                                                  onBeforeHide:function() {
                                                                      if (extData.isTab && snEditor && snEditor.note)
                                                                            $(this.target).not("#" + snEditor.note.key).removeClass("selectednote");
                                                                      else
                                                                            $(this.target).removeClass("selectednote");
                                                                  },
                                                                  otherBodies: extData.isTab && snEditor?snEditor.$CMbody():null,
                                                                  scrollRemove: "div#notes"
                                                          });

                    snHelpers.checkInView();
                } else
                    $('div#index div#notes').html("<div id='nonotes'>" + chrome.i18n.getMessage("no_notes_to_show") + "</div>");

                $('div#notes').scrollTop(0);
                $('div#notes').scroll(snHelpers.checkInView);

                snEditor.hideIfNotInIndex();

                extData.times.endfillindex= (new Date())-start;

                snHelpers.printTimes();

                log("fillIndex(async):done");
            } catch (e) {
                exceptionCaught(e);
            }

        });
    } catch (e) {
        exceptionCaught(e);
    }    
}

function noteRowCMfn(contextmenu) {
            
    var notename = $("#" + $(contextmenu.target).attr("id") + "heading").text();
    var istrash = $(contextmenu.target).hasClass("noterowdeleted");    
    
    var i = {};
    if (!istrash) {
        i[chrome.i18n.getMessage("trash_tooltip","")] = {
            onclick: function() {
                _gaq.push(['_trackEvent', 'popup', 'cm', 'trash']);                
                noteOps.trashNote($(this).attr("id"));
            },
            icon: "/images/trash.png"
        };
        var j = {};
        j[chrome.i18n.getMessage("finally_delete")] = {
            onclick: function() {
                _gaq.push(['_trackEvent', 'popup', 'cm', 'finally_delete']);
                if (confirm("Permanently delete note '" + notename + "'?"))
                    chrome.extension.sendRequest({action : "update", key : $(this).attr("id"), deleted: 1},
                        function(note) {
                            chrome.extension.sendRequest({action : "delete", key : note.key},
                                function() {
                                    snEditor.hideIfNotInIndex(key);
                                    snHelpers.checkInView();
                                });
                        });
            },
            icon: "/images/delete.gif"
        };
        return [i,j];
    } else {
        i[chrome.i18n.getMessage("recover_from_trash")] = {
            onclick: function() {
                _gaq.push(['_trackEvent', 'popup', 'cm', 'recover_trash']);
                noteOps.untrashNote($(this).attr("id"));
            },
            icon: "/images/untrash.png"
        };
        var j = {};
        j[chrome.i18n.getMessage("finally_delete")] = {
            onclick: function() {
                _gaq.push(['_trackEvent', 'popup', 'cm', 'finally_delete']);
                if (confirm("Permanently delete note '" + notename + "'?"))
                    chrome.extension.sendRequest({action : "delete", key : $(this).attr("id")},
                        function() {
                            snEditor.hideIfNotInIndex(key);
                            snHelpers.checkInView();
                        });
            },
            icon: "/images/delete.gif"
        };
        var k = {};
        k[chrome.i18n.getMessage("empty_trash")] = {
            onclick: function() {
                _gaq.push(['_trackEvent', 'popup', 'cm', 'empty_trash']);
                if (confirm("Empty trash?"))
                    chrome.extension.sendRequest({action : "emptytrash"},
                        function() {
                            fillTags(true);
                        });
            }
        };
        return [i,j,$.contextMenu.separator,k];
    }
            
}

var noteOps = {

    trashNote: function(key) {
        chrome.extension.sendRequest({action : "update", key : key, deleted: 1},
            function() {
                snEditor.hideIfNotInIndex();
                snHelpers.checkInView();
            });
    },

    untrashNote: function(key) {
        chrome.extension.sendRequest({action : "update", key : key, deleted : 0},
            function() {
                snEditor.hideIfNotInIndex();
                snHelpers.checkInView();
            });
    }
}
/*
 * Appends/prepends/replaces a noterow div in the index pane.
 *
 * @param mode "delteAndPrepend", "append", "replace"
 * @param note must at least be a note from and index api call
 */
function indexAddNote(mode, note){
    try {
        var date, prefix, shareds = [], html =  "";

        // assemble noterow html string
        if (mode!= "replace")
            html = "<div class='noterow' id='" + note.key  + "' >";
        // #syncicon
        html+=          "<div id='" + note.key + "syncicon' class='syncicon statusicon' title='" + chrome.i18n.getMessage("syncnote_tooltip") + "' " + (note._syncNote?"":"style='display:none;'") + ">&nbsp;</div>";
        // #time abbr
        if (localStorage.option_showdate == "true") {
            if (localStorage.option_sortby == "createdate") {
                date = convertDate(note.createdate);
                prefix = chrome.i18n.getMessage("created");
            } else {
                date = convertDate(note.modifydate);
                prefix = chrome.i18n.getMessage("modified");;
            }

            html+=          "<abbr id='" + note.key + "time' class='notetime' title='" + ISODateString(date) + "'>" + prefix + localeDateString(date) + "</abbr>";
        }
            // #pin
            html+=          "<div id='" + note.key + "pin' class='" + (note.systemtags.indexOf("pinned")>=0?"pinned":"unpinned") + " statusicon-clickable'>&nbsp;</div>";
            // #published
            if (note.publishkey != undefined)
                html+=      "<div id='" + note.key + "published' title='" + chrome.i18n.getMessage("published_tooltip") + "' class='published statusicon-clickable'>&nbsp;</div>";
            // #shared
            if (note.systemtags.indexOf("shared") >= 0) {

                $.each(note.tags, function (i,tag) {
                    if (validateEmail(tag)) {
                        shareds.push(tag);
                    }
                });
                if (shareds.length > 0)
                    html+=  "<div id='" + note.key + "shared' class='shared statusicon-clickable' title='" + chrome.i18n.getMessage("sharer_tooltip") + " " + shareds.join(", ") + "'>&nbsp;</div>";
                else
                    html+=  "<div id='" + note.key + "shared' class='shared statusicon-clickable' title='" + chrome.i18n.getMessage("sharee_tooltip") + "'>&nbsp;</div>";
            }



        // #heading
        html+=              "<div id='" + note.key + "heading' class='noteheading'></div>";
        // #abstract
        html+=              "<div id='" + note.key + "abstract' class='abstract'>&nbsp;<br>&nbsp;</div>";

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

        // get ui elements into variables
        var $noterow = $('div.noterow#' + note.key);
    //    var $noteheading = $('div.noteheading#' + note.key + "heading");
        var $notetime = $("abbr.notetime#" + note.key + "time");
        var $notepin = $("div#" + note.key + "pin");
    //    var $notesync = $("div#" + note.key + "syncicon");

        if (localStorage.option_sortby == "createdate") {
            $noterow.attr("sortkey",note.createdate);
        } else if (localStorage.option_sortby == "modifydate") {
            $noterow.attr("sortkey",note.modifydate);
        } else
            $noterow.attr("sortkey",note.content?note.content.trim().substring(0,30).toLowerCase():"");

        $noterow.attr("pinned",note.systemtags.indexOf("pinned")>=0?"true":"false");
        $noterow.attr("shared",note.systemtags.indexOf("shared")>=0?"true":"false");
     
        // bind timeago for time abbr
        $notetime.unbind();
        if (localStorage.option_showdate == "true")
            $notetime.timeago();

        $noterow.attr('filledcontent',"false");

        // deleted note
        if (note.deleted == 1) {
            $noterow.attr("title", chrome.i18n.getMessage("click_to_undelete"));
            return;
        }

        $notepin.attr("title",chrome.i18n.getMessage("click_to_pinunpin"));

        // bind pinned klick
        $("#"+note.key+"pin").unbind();
        $("#"+note.key+"pin").bind("click",{key: note.key, systemtags: note.systemtags},function(event) {
                var key = event.data.key;
                var systemtags = event.data.systemtags;

                event.stopPropagation();

                if ($(this).hasClass("pinned")) {
                    note.systemtags.splice(systemtags.indexOf("pinned"),1);
                } else {
                    note.systemtags.push("pinned");
                }
                chrome.extension.sendRequest({action:"update", key:key, systemtags:systemtags});
            });
        //$("#"+note.key+"pin").tipTip({defaultPosition:"top"});

        // bind published click
        if (note.publishkey) {
            $("#"+note.key+"published").unbind();
            $("#"+note.key+"published").bind("click","https://simple-note.appspot.com/publish/"+note.publishkey,snHelpers.genericUrlOpenHandler);
            //$("#"+note.key+"published").tipTip({defaultPosition:"top"});
        }
        // bind published click
        if (note.systemtags.indexOf("shared") >= 0) {
            $("#"+note.key+"shared").unbind();
            $("#"+note.key+"shared").bind("click","https://simple-note.appspot.com/#note="+note.key,snHelpers.genericUrlOpenHandler);
            //$("#"+note.key+"shared").tipTip({defaultPosition:"top"});
        }

        // unread
        if (note.systemtags.indexOf("unread")>0)
             $noterow.addClass("unread");

        // tab selected
        if (extData.isTab && snEditor.note && snEditor.note.key == note.key) {
            $noterow.addClass("selectednote");
        }
    } catch (e) {
        exceptionCaught(e);
    }
    // tooltips
    //$("#" + note.key + "time").tipTip({defaultPosition:"top"});
}

/*
 *  Fills a noterow div from the note.content. Callback from checkInView.
 *
 *  @param elementOrNote jquery object div.noterow#key or note object with .content
 */
function indexFillNote(elementOrNote) {

    if (elementOrNote.content != undefined) {//note
        indexFillNoteReqComplete(elementOrNote);
    } else {
        var key = elementOrNote.attr("id");

        // reflowing triggers scrolls
        if (elementOrNote.attr("requested") == "true")
            return;

        $('#' + key + "heading").append('<img id="' +key + 'loader" src="images/loader_small.gif"/>');
        $('#' + key + "heading").attr("align","center");

        chrome.extension.sendRequest({action : "note", key :key}, indexFillNoteReqComplete);

        elementOrNote.attr("requested","true");
    }
}
/*
 */
function indexFillNoteReqComplete(note) {
        try {
            var $noterow = $('#' + note.key);
            // check new inview, might have changed due to reflow
            $noterow.attr('filledcontent',"true");

            var $noteheading = $('#' + note.key + "heading");
            var $noteabstract = $('#' + note.key + "abstract");

            var lines = note.content.split("\n").filter(function(line) {
                return ( line.trim().length > 0 && !line.match(extData.webnotereg))
                });

            // heading
            $('#' + note.key + 'loader').remove();
            $noteheading.removeAttr("align"); // from loader
            // set actual heading
            var headingtext = lines[0] != undefined?lines[0].trim():" ";
            var heading = htmlEncode(headingtext,100);
            if (note.score != undefined) {
                //html = note.score + " - " + html;
                if (note.score >= 1)
                    $noterow.addClass("fullhit")
            }
            $noteheading.html(heading); // dont need more than 100 chars
            if (headingtext.length > 25)
                $noteheading.attr("title",headingtext);
            
            // deleted note css style
            if (note.deleted == 1) {
                $noterow.addClass("noterowdeleted"); // for undelete image on hover
            }

            // abstract
            var abstractlines;
            if (localStorage.option_abstractlines>=0)
                abstractlines = lines.slice(1,Math.min(lines.length,localStorage.option_abstractlines*1+1));
            else // -1 ~ all
                abstractlines = lines;
            // set actual abstract
            $noteabstract.html(htmlEncode(abstractlines,100).join("<br/>"));

            $noterow.unbind("click");

            // add click binding
            if (note.deleted == 0) {

                $noterow.bind("click",note, function(event) {
                    if (extData.isTab && snEditor.note)
                        snEditor.saveCaretScroll();

                    snEditor.setNote(event.data);
                });

            } else {
                $noterow.attr("title", chrome.i18n.getMessage("click_to_undelete"));
                $noterow.bind("click",note.key,function(event) {
                    noteOps.untrashNote(event.data);
                });
            }

            // webnote icon
            var wnm = note.content.match(extData.webnotereg);
            if (wnm && $("#" + note.key + "webnoteicon").length == 0) {
                var url = wnm[1];
                $("<div id='" + note.key + "webnoteicon' class='webnoteicon statusicon-clickable'>&nbsp;</div>").insertBefore($noteheading);
                $noteabstract.prepend("[" + url + "]<br>");
                if (note.deleted == 0) {
                    $("#" + note.key + "webnoteicon").attr("title",chrome.i18n.getMessage("webnote_icon",url));
                    $("#" + note.key + "webnoteicon").bind("click",url,snHelpers.genericUrlOpenHandler);
                }
            }

            snHelpers.checkInView();
            if ($noterow.index()<=$(".selectednote").index())
                snHelpers.scrollSelectedIntoView();
        } catch (e) {
            exceptionCaught(e);
        }
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
    log("slideEditor, duration " + duration);
    
    if (duration == undefined)
        duration = extData.slideDuration;

    snEditor.show();

    if (!extData.isTab) {
        $('div#index').animate({left: extData.dimensions.focus.index_left + "px", right: extData.dimensions.focus.index_right + "px"}, {duration: duration, easing: extData.slideEasing});
        $('div#note').animate({left: extData.dimensions.focus.note_left + "px"}, {duration: duration, easing: extData.slideEasing});
        $('body').animate({width : extData.dimensions.focus.body_width + "px"}, {duration: duration, easing: extData.slideEasing,
           complete: function() {
                if (callback) callback();
            }
        });
        
    } else
        if (callback) callback();
    
    extData.currentView = "editor";

}
//  ---------------------------------------
function slideIndex(callback, duration) {
    log("slideIndex");

    if (duration == undefined)
        duration = extData.slideDuration;
    
    localStorage.lastopennote_open = "false";
    snEditor.clearDirty();
    snEditor.saveCaretScroll();

    $("#index").show();
    if (!extData.isTab) {
        $('div#note').animate({left: extData.dimensions.def.note_left + "px"}, {duration:duration, easing: extData.slideEasing});
        $('div#index').animate({left: extData.dimensions.def.index_left + "px", right: extData.dimensions.def.index_right + "px"}, {duration: duration, easing: extData.slideEasing});

        $('body').animate({width : extData.dimensions.def.body_width + "px"}, {duration: duration, easing: extData.slideEasing,
            complete: function() {
                if (callback) callback();
            }
        });
    } else
         if (callback) callback();
    
    extData.currentView = "index";

    delete snEditor.note;
}

//  ---------------------------------------
//  SNEditor
//  ---------------------------------------

function SNEditor() {
    log("SNEditor:create");
    this.codeMirror = new CodeMirror(document.getElementById("note"),{
                    parserfile: "/javascripts/simplenoteParser.js",
                    path: "/javascripts/lib/codemirror1/",
                    iframeClass: "cm-iframe",
                    content: "",
                    stylesheet: "/stylesheets/editor.css",
                    tabMode: "shift",
                    indentUnit: 4,
                    enterMode: "keep",
                    electricChars : false
                });

    // set ids for important nodes
    $(".cm-iframe").attr("id","cmiframe");
    $(".CodeMirror-wrapping").attr("id","cmwrapper");

    $("#cmwrapper").css("position","");
    $("#cmwrapper").css("height","");    
    $("#cmiframe").attr("tabindex","2");

    this.dirty={content: false, tags: false, pinned: false};    
}

SNEditor.prototype.$CMbody = function () {    
    return $(this.codeMirror.editor.container);
}

SNEditor.prototype.$CMhead = function () {
    return $(this.codeMirror.editor.container.ownerDocument.head);
}

//  ---------------------------------------
SNEditor.prototype.setFont = function() {
    log("SNEditor.setFont")    
    var $head = this.$CMhead();
    var $editbox = this.$CMbody();
    // get fontinfo if there
    var fontinfo;
    if (localStorage.editorfontinfo)
        fontinfo = JSON.parse(localStorage.editorfontinfo);

    // inject font url
    // keeping this so we can easily delete already loaded fonts
    // otherwise could add a fontinfo field for url
    var fontname = localStorage.option_editorfont?localStorage.option_editorfont:fontinfo.family;
    for(var name in extData.fontUrls) {
        if (fontname == name) {
            $head.append(extData.fontUrls[name]);
            delete extData.fontUrls[name];
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
    if (localStorage.option_editorfontshadow && localStorage.option_editorfontshadow != "false") {
       if (localStorage.option_editorfontshadow == "true")
           $editbox.css("text-shadow","0px 0px 1px #ccc" );
       else 
           $editbox.css("text-shadow", localStorage.option_editorfontshadow);
    }
    // 
    // set colors
    if (localStorage.option_color_editor)
        $editbox.css("background-color",localStorage.option_color_editor);
    if (localStorage.option_color_editor_font)
        $editbox.css("color",localStorage.option_color_editor_font);
}
//  ---------------------------------------
SNEditor.prototype.getTags = function() {
    log("SNEditor.getTags")
        
    var vals = $("#as-selections-tagsauto .as-selection-item").get().map(function(e) {return e.textContent.substr(1)});
    var tags = vals.map(function(e) {return e.trim();}).filter(function(e) {return e != ""});

    return tags;
}

//  ---------------------------------------
SNEditor.prototype.initialize = function() {
       
    if (this.initialized)
        return;

    log("SNEditor.intitalize");

    try {

        var $editbox = this.$CMbody();
        var that = this;
        var line;

        // add note content change (dirty) event listeners

        $editbox.unbind();
        $editbox.bind('change keyup paste cut', function(event) {
            that.setDirty("content", that.note.content != that.codeMirror.getCode(), event);
        });

        // fix for home not scrolling all to the left
        $editbox.keydown(shorcuts);
        $editbox.bind("keydown keyup",function(event) {
            //alert(event.keyCode)
            switch(event.keyCode) {
                case 36: //home key
                    $editbox.scrollLeft(Math.max(0,$editbox.scrollLeft()-300));
                    if (event.ctrlKey)
                        $editbox.scrollTop(Math.max(0,$editbox.scrollTop()-30));
                    break;
                case 35: //end key
                    if (event.ctrlKey) {
                        $editbox.scrollTop($editbox.scrollTop() + 20);
                        $editbox.scrollLeft(Math.max(0,$editbox.scrollLeft()-300));
                    }
                    break;
                case 37: //left key
                    pos = that.codeMirror.cursorPosition(true);
                    if (pos.character == 0)
                        $editbox.scrollLeft(0);
                    break;
                case 38: //up key
                    line = that.codeMirror.lineNumber(that.codeMirror.cursorLine());
                    if (line == 1)
                        $editbox.scrollTop(0);
                    break;
                case 40: //down key
                    if (that.codeMirror.lastLine() == that.codeMirror.cursorLine())
                        $editbox.scrollTop($editbox.scrollTop() + 20);
                    break;
                case 191: // #-key
                    //alert(JSON.stringify(that.codeMirror.cursorCoords(true)))
                    //dropdown(that.codeMirror,["asd","dfg","asdkj"]);
                    break;
            }
        });

        // add note pinned (dirty) event listener
        $('div#note #pintoggle').unbind();
        $('div#note #pintoggle').bind('click', function(event) {

            _gaq.push(['_trackEvent', 'popup', 'pintoggled']);

            snEditor.setPintoggle(!snEditor.isPintoggle());

            var changed = that.setDirty("pinned", (that.note.systemtags.indexOf("pinned")>=0) != snEditor.isPintoggle() , event);

            if (changed && extData.isTab)
                that.saveNote();

            that.focus();
        });

        // bind back button
        $('div#note #backtoindex').unbind();
        $('div#note #backtoindex').click(function(event) {
            if (that.isNoteDirty())
                that.saveNote();

            slideIndex();
        });

        // bind word wrap
        $("div#note #wraptoggle").unbind();
        $("div#note #wraptoggle").bind('click', function(event) {

            _gaq.push(['_trackEvent', 'popup', 'wordwraptoggled']);

            snEditor.setWraptoggle(!snEditor.isWraptoggle());

            localStorage.wordwrap = snEditor.isWraptoggle();
            that.codeMirror.setTextWrapping(snEditor.isWraptoggle());
            that.focus();
        });
        this.setWraptoggle(localStorage.wordwrap != undefined && localStorage.wordwrap == "true");
        this.codeMirror.setTextWrapping(snEditor.isWraptoggle());


        // bind UNDO button
        $('div#note #revert').unbind();
        $('div#note #revert').click(function(event) {
            // reset content
            log("SNEditor.initialize:undo clicked");

            _gaq.push(['_trackEvent', 'popup', 'undoclicked']);

            var note = that.note;
            if (that.dirty.content) {
                //that.saveCaretScroll();
                that.codeMirror.setCode(note.content);
                that.restoreCaretScroll();
            }
            // reset tags
            if (that.dirty.tags)
                that.setupTags();

            // reset pinned
            if (that.dirty.pinned) {
                snEditor.setPintoggle(note.systemtags.indexOf("pinned")>=0);
            }

            snEditor.hideRevert();

            snEditor.clearDirty(); // should not dont need this here b/c of callbacks
            that.focus();
        });

        // bind DELETE/CANCEL
        $('div#note #trash').unbind();
        $('div#note #trash').click(function() {
            _gaq.push(['_trackEvent', 'popup', 'trashclicked']);
            that.trashNote();
            slideIndex();
        });

        // bind PRINT
        if (extData.isTab) {
            $('div#note #print').unbind();
            $('div#note #print').click(function() {
                _gaq.push(['_trackEvent', 'popup', 'printclicked']);
                that.print();
            });
            $('div#note #print').show();
        }

        // bind link clicks
        $(".sn-link",$editbox).die();
        $(".sn-link",$editbox).live("click",function(event) {
           if (event.ctrlKey) {
               _gaq.push(['_trackEvent', 'popup', 'linkclicked_unhot']);
               return;
           }
           _gaq.push(['_trackEvent', 'popup', 'linkclicked']);
           var url = this.textContent.trim();
           openURLinTab(url,event.shiftKey || event.altKey);
        });
    
//        $(".sn-link-note",$editbox).die();
//        $(".sn-link-note",$editbox).live("click",function(event) {
//           if (event.ctrlKey) {
//               _gaq.push(['_trackEvent', 'popup', 'linkclicked_unhot']);
//               return;
//           }
//           var title = this.textContent.trim().substr(1);           
//            snHelpers.getHeadings(true,function(headings) {              
//                var titles = headings.filter(function(h) {return h.title == title;});
//                if (titles.length == 1) {
//                    if (extData.isTab && snEditor.note)
//                            snEditor.saveCaretScroll();
//
//                    snEditor.setNote(titles[0]);                
//                }            
//            });
//        });
        
        // bind ctrl link disable
        $editbox.bind('keydown', function(event) {
            if (event.keyCode == 17) // ctrl
                $("[class^=sn-link]",$editbox).addClass("sn-link-unhot");
        });
        // bind ctrl link disable disable
        $editbox.bind('keyup', function(event) {
            if (event.keyCode == 17) // ctrl
                $("[class^=sn-link]",$editbox).removeClass("sn-link-unhot");
        });

        if (!extData.isTab)
            $('div#note #popout').click(function(event) {
                _gaq.push(['_trackEvent', 'popup', 'popoutclicked']);
                chrome.tabs.create({url:chrome.extension.getURL("/popup.html?tab=true"), pinned:localStorage.option_pinnedtab == undefined || localStorage.option_pinnedtab == "true"}, function(tab) {
                    extData.background.SimplenoteBG.setOpenTab(tab);
                });
            });
        else {
            $('div#note #popout').hide();
            $('div#note #backtoindex').unbind();
            $('div#note #backtoindex').click(function(event) {
                window.close();
            });
        }
        // add context menu
        this.makeContextMenu();

        this.initialized = true;
    } catch (e) {
        exceptionCaught(e);
    }
}

//  ---------------------------------------
SNEditor.prototype.saveCaretScroll = function() {
    log("SNEditor.saveCaretScroll");
    if (!this.note)
        return;

    var caretScroll = this.codeMirror.cursorPosition();
    caretScroll.line = this.codeMirror.lineNumber(caretScroll.line);
    caretScroll.scrollTop = this.$CMbody().scrollTop();
    caretScroll.scrollLeft = this.$CMbody().scrollLeft();
    localStorage[this.note.key + "_caret"] = JSON.stringify(caretScroll);
    cs2str("saved",caretScroll);
}

//  ---------------------------------------
SNEditor.prototype.restoreCaretScroll = function (caretScroll) {
    log("SNEditor.restoreCaretScroll")
    if (!this.note)
        return;
    
    if (!caretScroll && localStorage[this.note.key + "_caret"] && (localStorage.option_remembercaret == undefined || localStorage.option_remembercaret == "true"))
        caretScroll = JSON.parse(localStorage[this.note.key + "_caret"]);

    if ( caretScroll != undefined ) {

        var lineH;
        if (caretScroll.line == "lastline")
            lineH = this.codeMirror.lastLine();
        else {
            lineH = this.codeMirror.nthLine(caretScroll.line);
            if (!lineH)
                lineH = this.codeMirror.lastLine();
        }
        var character = Math.min(this.codeMirror.lineContent(lineH).length,caretScroll.character);
        
//        cs2str("target     ",caretScroll);

//        this.logCaretScroll("before curso");
        this.codeMirror.selectLines(lineH, character);

        if (caretScroll.scrollTop != undefined)
            this.$CMbody().scrollTop(caretScroll.scrollTop);
        if (caretScroll.scrollLeft != undefined)
            this.$CMbody().scrollLeft(caretScroll.scrollLeft);

//        this.logCaretScroll("after ");
    }
}

SNEditor.prototype.logCaretScroll = function(msg) {
    var pos = snEditor.codeMirror.cursorPosition();
    pos.line = snEditor.codeMirror.lineNumber(pos.line);
    cs2str(msg,pos,this.$CMbody());
}

function cs2str(msg,p,$elm) {
    if ($elm) {
        p.scrollTop = $elm.scrollTop();
        p.scrollLeft = $elm.scrollLeft();
    }
    log(msg + ": line " + p.line + ", char " + p.character + ", sTop " + p.scrollTop + ", sLeft " + p.scrollLeft);
}

//  ---------------------------------------
SNEditor.prototype.insertUrl = function() {
    log("SNEditor.insertUrl")
    _gaq.push(['_trackEvent', 'popup', 'insertUrl']);

    var that = this;
    chrome.tabs.getSelected(undefined,function(tab) {
        that.codeMirror.replaceSelection(tab.url);
        that.saveTimerRearm();
    });
}

//  ---------------------------------------
SNEditor.prototype.searchForSelection = function () {
    log("SNEditor.searchForSelection")    
    if (this.codeMirror.selection().trim() != "") {
        _gaq.push(['_trackEvent', 'popup', 'searchForSelection']);
        openURLinTab("http://google.com/search?q=" + encodeURIComponent(this.codeMirror.selection().trim()));
    }
}

//  ---------------------------------------
SNEditor.prototype.hideIfNotInIndex = function (key) {
    if (!extData.isTab)
        return;

    log("SNEditor.hideIfNotInIndex")

    var keys = $("div#index div.noterow").map(function(i,e) {
        if ($(this).attr("deleteanimation") == "true")
            return "";
        else
            return this.id;
    }).filter(function(e) {return e.id != "";}).get();
    
    if (!this.note || (this.note.key != "" && keys.indexOf(this.note.key)<0)) {
        if (keys.length > 0) {
            key = key?key:keys[0];
            chrome.extension.sendRequest({action:"note", key:key}, function(note) {
                if (note.deleted != 1) {
                    
                    //that.setNote(note,{focus:false});
                } else
                    $("div#note").hide();
                });
        } else
            $("div#note").hide();
    } else if (this.note)
        this.show();

    if ($('#q').val() == "")
        snHelpers.scrollSelectedIntoView();
}

//  ---------------------------------------
SNEditor.prototype.show = function() {
    $("div#note").show();
}

SNEditor.prototype.focus = function() {
    this.$CMbody().focus();
}

//  ---------------------------------------
SNEditor.prototype.makeContextMenu = function() {

    log("SNEditor.makeContextMenu")
    
    var that = this;
    this.$CMbody().contextMenu(
        function() {
            var i = {};
            i[chrome.i18n.getMessage("editorcm_insert_url","alt-v")] = {
                onclick: function() {that.insertUrl();},
                disabled: extData.isTab
            };
            var s = {};
            s[chrome.i18n.getMessage("editorcm_search_selection","alt-s")] = {
                onclick: function() {that.searchForSelection();},
                disabled: that.codeMirror.selection().trim() == "",
                icon: "/images/searchfield.png"
            };
            return [i,s];
        },
        {
            theme:'gloss',
            offsetX: extData.isTab?406:6,
            offsetY: 38,
            direction:'down',
            otherBodies: $(extData.popup),
            scrollRemove: "#cmiframe"
        }        
    );
}

//  ---------------------------------------
SNEditor.prototype.setNote = function(note, options) {

    // new note dummy data    
    if (note==undefined)
        note = {content:"",tags:[],systemtags:[], key:""};

    if (!options)
        options = {};

    if (options.focus === undefined)
        options.focus = true;
    if (options.isnewnote === undefined)
        options.isnewnote = false;

    log("SNEditor.setNote: " + note.key);

    var that = this;
    if (this.isNoteDirty()) {
        this.saveNote();
        this.clearDirty();
        this.setNote(note, options);
        return;
    }

    var inputcontent = note.content;

    this.note = note;
    if (options.isnewnote)
        this.note.content = "";
    
    this.setFont();
    this.initialize();

    // get note contents
    if (note.key == "") { // new note

        $("#trash").hide();
        $('div#note #popout').hide();

    } else { // existing note
        
        $("#trash").show();

        if (!extData.isTab) {            
            $('div#note #popout').show();
        }

        localStorage.lastopennote_key = note.key;
        localStorage.lastopennote_open = "true";
        this.needCMRefresh("lastopen");
    }

    // set content    
    //snHelpers.getHeadings(false,function(headings) {
    //    that.codeMirror.setParser("SimpleParser", {headings: headings});
        //console.log(headings(notes))
        that.codeMirror.setCode(inputcontent);
    //})
    
    // set pinned
    this.setPintoggle(this.note.systemtags.indexOf("pinned")>=0);

    this.clearDirty();

    if (options.isnewnote) {
        this.setDirty("content", true, null);
    } else
        this.hideRevert();

    // looks better
    $("#as-selections-tagsauto").remove();
    $("#as-results-tagsauto").remove();

    slideEditor(function () {        

        that.setupTags();
        
        if (note.systemtags.indexOf("unread")>0) {

            note.systemtags.splice(note.systemtags.indexOf("unread"),1);
            chrome.extension.sendRequest({action:"update", key:note.key, systemtags:note.systemtags}, function(note) {
                that.note = note;
                $("#" + note.key).removeClass("unread");
            });
        }       

        that.$CMbody().one("focus", function() {
            if (!that.note)
                return;
            
            if (that.note.key)
                that.restoreCaretScroll();
            else if (options.isnewnote)
                that.restoreCaretScroll( {line : "lastline", character: 10000});
        });

        if (options.focus)
            that.focus();        

        that.saveTimerInit();
        
    }, options.duration);

    if (extData.isTab) {
        $("div.noterow").removeClass("selectednote");
        if (note.key && note.key != "") {
            $("div.noterow#"+ note.key).addClass("selectednote");
            chrome.extension.sendRequest({action:"cm_updatelastopen"});
            snHelpers.scrollSelectedIntoView();
        }        
    }
}

//  ---------------------------------------
SNEditor.prototype.saveNote = function(callback) {
    
    this.saveTimerClear();

    if(!this.isNoteDirty())
        return;

    log("SNEditor.saveNote");

    var key = this.note.key;

    var noteData = {};
    if (this.dirty.content)
        noteData.content = this.codeMirror.getCode();
    if (this.dirty.pinned) {
        snEditor.needCMRefresh("pinned");
        noteData.systemtags = this.note.systemtags;
        if (!this.isPintoggle()) {
            noteData.systemtags.splice(noteData.systemtags.indexOf("pinned"),1);
        } else {
            noteData.systemtags.push("pinned");
        }
    }
    if (this.dirty.tags)
        noteData.tags = this.getTags();
//    if ($('div#note input#encrypted').attr("dirty")=="true")
//        noteData.encrypted = $('div#note input#encrypted')?1:0;

    if (noteData.content == '' && key !='')     // existing note emptied -> trash
        this.trashNote();
    else if (key != '' ) {                  // existing note, new data -> update
        noteData.key = key;
        noteData.action = "update";
    } else if (noteData.content && noteData.content != '')          // new note, new data -> create
        noteData.action = "create";

    var that = this;

    if (noteData.action) {
        chrome.extension.sendRequest(noteData, function(note) {
            if (that.note && (that.note.key == note.key || that.note.key == "")) {
                that.note = note;
                that.clearDirty();
            }
            log("CodeMirror.saveNote: request complete");
            if (callback && typeof callback == "function")
                callback();
        });        
    }

}
//  ---------------------------------------
SNEditor.prototype.isNoteDirty = function() {
    return this.dirty.content || this.dirty.pinned || this.dirty.tags;// || $('div#note input#encrypted').attr("dirty")=="true";
}
//  ---------------------------------------
SNEditor.prototype.clearDirty = function() {
    log("SNEditor.clearDirty");
    this.setDirty("content",false);
    this.setDirty("pinned",false);
    this.setDirty("tags",false);    
    //$('div#note input#encrypted').removeAttr('dirty');
}
//  ---------------------------------------
SNEditor.prototype.setDirty = function(what, how, event) {
    if (!what)
        throw new Error("what is dirty?");

    if (how == undefined)
        throw new Error("how dirty is it?");

    if (event == undefined)
        event = {type : "unknown"};

    var oldDirty = this.dirty[what];

    if (oldDirty == how)
        return false;

    this.dirty[what] = how;

    if (how)
        log(what + " dirty now (" + event.type + ")");
    else
        log(what + " not dirty now (" + event.type + ")");

    if (this.isNoteDirty())
        this.showRevert();
    else
        this.hideRevert();

    return true;
}

SNEditor.prototype.needCMRefresh = function(type) {
    switch(type) {
        case "pinned":
            extData.background.SimplenoteBG.needCMRefresh = true;
            break;
        case "lastopen":
            extData.background.SimplenoteBG.needLastOpenRefresh = true;
            break;
        default:
            throw new Error("unknown type " + type);
    }

    if (extData.isTab)
        extData.background.SimplenoteBG.checkRefreshs();
}
SNEditor.prototype.setupTags = function() {
    var that = this;
    log("SNEditor.setupTags:sending request")    

    $("#as-selections-tagsauto").remove();
    $("#as-results-tagsauto").remove();
    $("#tags").remove();    
    $('div#note').prepend('<input type="text" id="tags" spellcheck="false" tabindex="0"/>');
    $('div#note input#tags').autoSuggest(function(callback) {
                chrome.extension.sendRequest({action:"tags",options: {sort:"frequency",predef:false}}, function(taginfos) {
                        taginfos = taginfos.map(function(e) {return {value: e.tag};}).filter(function(e) {return e.value != "webnote" && e.value != "Webnotes"});
                        log("SNEditor.setupTags:request complete, numtags=" + taginfos.length);
                        callback(taginfos);
                });
            }, {
            asHtmlID: "tagsauto",
            startText: chrome.i18n.getMessage("tag_placeholder"),
            preFill: that.note.tags.join(","),
            //selectionClick: function(elem){ elem.fadeTo("slow", 0.33); },
            selectionAdded: function(elem) {
                if (that.getTags())
                    that.setDirty("tags", !arrayEqual(that.note.tags,that.getTags()));                                        
            },
            selectionRemoved: function(elem) {
                elem.remove();
                if (that.getTags())
                    that.setDirty("tags", !arrayEqual(that.note.tags,that.getTags()));

            },
            onChange: function() {
                $("#cmwrapper").css("top", Math.max($(".as-selections").height() + 4,32) + "px");
                that.saveTimerRearm();
            },
            onSetupDone: function() {                
                //console.log($(".as-selections").height())
                $("#cmwrapper").css("top", Math.max($(".as-selections").height() + 4,32) + "px");
                //$("#as-selections-tagsauto").tipTip({defaultPosition:"top", content: chrome.i18n.getMessage("tag_tooltip_html",["alt-t", "alt-e"]), delay: 800, maxWidth: "400px"});
                $("#as-selections-tagsauto").attr("title",chrome.i18n.getMessage("tag_tooltip",["alt-t", "alt-e"]));
            },
            keyDelay: 10,
            onTabOut: function() {
                snEditor.focus();
            }
        });    
}
//  ---------------------------------------
SNEditor.prototype.trashNote = function() {
    if (!this.note || this.note.key == "")
        return;
    log("SNEditor.trashNote");

    noteOps.trashNote(this.note.key);
}

SNEditor.prototype.saveTimerInit = function() {
    if (!extData.isTab)
        return;       
    var that = this;

    // Allocate timer element
    this.savetimer = {
            timer : null,
            text : that.codeMirror.getCode(),            
            wait : extData.editorSaveTime
    };

    this.$CMbody().keydown(function() {that.saveTimerRearm()});

}
SNEditor.prototype.saveTimerClear = function() {
    if (!extData.isTab)
        return;
    
    if (this.savetimer)
        clearTimeout(this.savetimer.timer);
}
SNEditor.prototype.saveTimerRearm = function() {
    if (!extData.isTab)
        return;
    var that = this;
    
    clearTimeout(this.savetimer.timer);
    this.savetimer.timer = setTimeout(function() {that._saveTimerExecute();}, this.savetimer.wait);
}

SNEditor.prototype._saveTimerExecute = function() {
    if (!extData.isTab)
        return;
    
    var elTxt = this.codeMirror.getCode();

    // Fire if text > options.captureLength AND text != saved txt OR if override AND text > options.captureLength
    //if ( elTxt != that.timer.text )  {
            this.savetimer.text = elTxt;
            this.saveNote();
    //}
}

SNEditor.prototype.setPintoggle = function(to) {
    if (to) {
        $('div#note #pintoggle').addClass("pinned");
        $('div#note #pintoggle').removeClass("unpinned");
    } else {
        $('div#note #pintoggle').addClass("unpinned");
        $('div#note #pintoggle').removeClass("pinned");
    }
}

SNEditor.prototype.isPintoggle = function() {
    return $('div#note #pintoggle').hasClass("pinned");
}

SNEditor.prototype.setWraptoggle = function(to) {
    if (to) {
        $('div#note #wraptoggle').addClass("wrap_on");
        $('div#note #wraptoggle').removeClass("wrap_off");
    } else {
        $('div#note #wraptoggle').addClass("wrap_off");
        $('div#note #wraptoggle').removeClass("wrap_on");
    }
}

SNEditor.prototype.isWraptoggle = function() {
    return $('div#note #wraptoggle').hasClass("wrap_on");
}

SNEditor.prototype.print = function() {
    this.codeMirror.win.print();
}

SNEditor.prototype.showRevert = function() {
    if (!extData.isTab)
        $('div#note #revert').show();
    //alert($('div#note #pintoggle').css("left"))
    //$('div#note #tags').animate({right:"+=28"});
}

SNEditor.prototype.hideRevert = function() {
    $('div#note #revert').hide();
    //$('div#note #tags').animate({right:"-=28"});
}


var snHelpers = {
    
    //  ---------------------------------------
    // from inview.js
    getViewportSize : function () {
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
    },
    //  ---------------------------------------
    // from inview.js
    getViewportOffset: function() {
        return {
            top:  window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
            left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft
        };
    },

    //  ---------------------------------------
    // from inview.js
    checkInView: function() {
        var elements = $('div.noterow').get(), elementsLength, i = 0, viewportSize, viewportOffset;
        elements = elements.filter(function (e) {
            return $(e).attr('filledcontent') != "true";
        });
        elementsLength = elements.length;

        if (elementsLength) {
            viewportSize   = snHelpers.getViewportSize();
            viewportOffset = snHelpers.getViewportOffset();

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
                loaded        = $element.attr('filledcontent') == "true",
                inview        = false;

                //log("checkInView:elementSize=[" + elementSize.height + "," + elementSize.width + "], elementOffset=[" + elementOffset.left + "," + elementOffset.top + "]");

                inview = elementOffset.top <= viewportOffset.top + viewportSize.height*(1 + extData.preLoadFactor) &&
                    elementOffset.left + elementSize.width >= viewportOffset.left &&
                    elementOffset.left <= viewportOffset.left + viewportSize.width;

    //            console.log(i + ": loaded " + loaded + ", inview=" + inview);
    //            console.log(elementOffset);
    //            console.log(elementOffset);

                if (!loaded && inview) {
                    indexFillNote($element);
                }
            }
        }
    },

    scrollSelectedIntoView: function() {
        var $noterow = $(".selectednote");
        if ($noterow.length == 1 && noteRowInIndex($noterow.attr("id"))) {
            var $notes = $("#notes");

            var relativeOffset = $noterow.offset().top - $notes.offset().top + $notes.scrollTop();
            var viewportHeight = $notes.innerHeight() - cssprop($notes,"margin-bottom");

            //log("scrollSelectedIntoView:[" + $notes.scrollTop() + " < "+ relativeOffset + " < " + (relativeOffset + $noterow.height()) + " < " + ($notes.scrollTop() + viewportHeight) + "]");

            var isAbove = relativeOffset < $notes.scrollTop();
            var isBelow = relativeOffset + $noterow.height() > $notes.scrollTop() + viewportHeight;

            if (isAbove || isBelow) {
                var scrollTo = relativeOffset - 0.5*$notes.height() + 0.5*$noterow.height();
                //log("scrollSelectedIntoView:" + scrollTo )
                $("#notes").scrollTop(scrollTo);
            }
        }

    },
    
    genericUrlOpenHandler: function(event) {
        event.stopPropagation();
        openURLinTab(event.data, event.ctrlKey || event.altKey );
    },
    
    printTimes: function() {
        for(var i in extData.times)
            log(i + ": " + extData.times[i]);
    },
    
    getHeadings: function(full, callback) {
        chrome.extension.sendRequest({action:"getnotes", deleted: 0}, function(notes) {
            callback(headings(notes,full));
        });        
    }
}


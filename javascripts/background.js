var isDebug = true;
function log(s) {
    if (isDebug)
        logGeneral(s,"background.js");
}

function backgroundSync(fullSync, callbackComplete, callbackPartial) {
    if (localStorage.option_email == undefined || localStorage.option_password == undefined) {
        log("backgroundSync: no credentials, exiting..");
        return;
    }

    if (SimplenoteDB.getSyncInProgress()) {
        log("backgroundSync: sync already in progress");
        if (callbackComplete)
            callbackComplete();
        return;
    }        

    if (!fullSync && !SimplenoteDB.hadSync())
        fullSync = true;

    log("backgroundSync: starting..");
    log("backgroundSync: offlinemode: " + SimplenoteDB.isOffline());
    log("backgroundSync: fullsync: " + fullSync);    

    handleRequest({action:"login"}, {}, function(successObj) {        
        if (successObj.success) {
            log("backgroundSync: login request completed, requesting sync. fullSync=" + fullSync);
            SimplenoteDB.sync(fullSync, function(successObj) {
                //log("backgroundSync: complete, setting timer for partial sync..");
                if (callbackComplete)
                    callbackComplete(successObj);
                //window.setTimeout("backgroundSync(false);", 2000);
            }, callbackPartial);
        } else {
            log("backgroundSync: login request failed.");
        }               
    });
}
// sync on browser start
$(document).ready(function() {
    
    setcontextmenus(true);

    backgroundSync(true);
});

//        Selection ###############################
//        INFO:-------
//        {
//            "editable":false,
//            "linkUrl":"http://derstandard.at/1303950559403/Sonntag-Workingmans-Death",
//            "mediaType":"image",
//            "menuItemId":2,
//            "pageUrl":"http://derstandard.at/1303950558961/Sonntag-Erik-der-Wikinger",
//            "selectionText":"23.30 bis 1.30 | ORF 2 | DOKUMENTARFILM | Ö",
//            "srcUrl":"http://images.derstandard.at/t/1/2011/04/29/1303957348544.jpg"
//        }
//        TAB:--------
//        {
//            "favIconUrl":"http://derstandard.at/favicon.ico",
//            "id":2,
//            "incognito":false,
//            "index":0,
//            "pinned":false,
//            "selected":true,
//            "status":"complete",
//            "title":"Erik, der Wikinger - Switchlist - derStandard.at › Etat",
//            "url":"http://derstandard.at/1303950558961/Sonntag-Erik-der-Wikinger",
//            "windowId":1
//        }
//
//        IMG SRC ###############################
//        INFO:-------
//        {
//            "editable":false,
//            "linkUrl":"http://derstandard.at/1303950558961/Sonntag-Erik-der-Wikinger",
//            "mediaType":"image",
//            "menuItemId":4,
//            "pageUrl":"http://derstandard.at/r2140/Switchlist",
//            "srcUrl":"http://images.derstandard.at/t/108/2011/04/29/1303957331786.jpg"
//        }
//        TAB:--------
//        {
//            "favIconUrl":"http://derstandard.at/favicon.ico",
//            "id":2,
//            "incognito":false,
//            "index":0,
//            "pinned":false,
//            "selected":true,
//            "status":"complete",
//            "title":"Switchlist - derStandard.at › Etat › Medien › TV",
//            "url":"http://derstandard.at/r2140/Switchlist",
//            "windowId":1
//        }
//
//        Link Url: ###############################
//        INFO:-------
//        { 
//            "editable":false,
//            "linkUrl":"http://derstandard.at/1303950558961/Sonntag-Erik-der-Wikinger",
//            "mediaType":"image",
//            "menuItemId":7,
//            "pageUrl":"http://derstandard.at/r2140/Switchlist",
//            "srcUrl":"http://images.derstandard.at/t/108/2011/04/29/1303957331786.jpg"
//        }
//        TAB:--------
//        {
//            "favIconUrl":"http://derstandard.at/favicon.ico",
//            "id":2,
//            "incognito":false,
//            "index":0,
//            "pinned":false,
//            "selected":true,
//            "status":"complete",
//            "title":"Switchlist - derStandard.at › Etat › Medien › TV",
//            "url":"http://derstandard.at/r2140/Switchlist",
//            "windowId":1
//        }
//
//        Page Url:###############################
//        INFO:-------
//        {
//            "editable":false,
//            "menuItemId":1,
//            "pageUrl":"http://derstandard.at/r2140/Switchlist"
//        }
//
//        TAB:--------
//        {
//            "favIconUrl":"http://derstandard.at/favicon.ico",
//            "id":2,
//            "incognito":false,
//            "index":0,
//            "pinned":false,
//            "selected":true,
//            "status":"complete",
//            "title":"Switchlist - derStandard.at › Etat › Medien › TV",
//            "url":"http://derstandard.at/r2140/Switchlist",
//            "windowId":1
//        }


var contextmenus = {};
function setcontextmenus(on) {
    // add context menus
    // contexts : Legal values are: 'all', 'page', 'selection', 'link', 'editable', 'image', 'video', and 'audio'. Defaults to ['page'].
    chrome.contextMenus.removeAll();
    if (localStorage.option_contextmenu != undefined && localStorage.option_contextmenu == "false")
        return;
    
    if (on) {                               
        addCreateMenus();
        if (localStorage.lastopennote_key) {
            addAppendMenus();            
            updateAppendMenus();
        } else
            removeAppendMenus();
            
    } else {
        contextmenus = {};
    }
}

function addAppendMenus() {
    contextmenus.append_pageurl = chrome.contextMenus.create({type:"normal",title:"Append to last open (Page Url)",        contexts:['page'],
                onclick: function(info, tab){
                    //appendToLastOpenNoteFromBG("Append Page:\n\nINFO:-------\n" + JSON.stringify(info) + "\n\nTAB:--------\n" + JSON.stringify(tab));
                    _gaq.push(['_trackEvent', 'ContextMenu', 'append_url']);
                    appendToLastOpenNoteFromBG(info.pageUrl);
                }});
    contextmenus.append_selection = chrome.contextMenus.create({type:"normal",title:"Append to last open (Selection)",  contexts:['selection'],
            onclick: function(info, tab){
                //appendToLastOpenNoteFromBG("Append Selection:\n\nINFO:-------\n" + JSON.stringify(info) + "\n\nTAB:--------\n" + JSON.stringify(tab));
                _gaq.push(['_trackEvent', 'ContextMenu', 'append_selection']);
                appendToLastOpenNoteFromBG(info.selectionText + "\n" + "[Source: " + tab.url + "]");
            }});
    contextmenus.append_linkurl = chrome.contextMenus.create({type:"normal",title:"Append to last open (Link Url)",       contexts:['link'],
            onclick: function(info, tab){
                //appendToLastOpenNoteFromBG("Append Link Url:\n\nINFO:-------\n" + JSON.stringify(info) + "\n\nTAB:--------\n" + JSON.stringify(tab));
                _gaq.push(['_trackEvent', 'ContextMenu', 'append_link_url']);
                appendToLastOpenNoteFromBG(info.linkUrl);
            }});
    contextmenus.append_imageurl = chrome.contextMenus.create({type:"normal",title:"Append to last open (Image Url)",    contexts:['image'],
            onclick: function(info, tab){
                _gaq.push(['_trackEvent', 'ContextMenu', 'append_image_url']);
                appendToLastOpenNoteFromBG(info.srcUrl);
            }});
}
function removeAppendMenus() {
    if (contextmenus.append_pageurl) { chrome.contextMenus.remove(contextmenus.append_pageurl);delete contextmenus.append_pageurl; }
    if (contextmenus.append_selection) { chrome.contextMenus.remove(contextmenus.append_selection);delete contextmenus.append_selection; }
    if (contextmenus.append_linkurl) { chrome.contextMenus.remove(contextmenus.append_linkurl);delete contextmenus.append_linkurl; }
    if (contextmenus.append_imageurl) { chrome.contextMenus.remove(contextmenus.append_imageurl);delete contextmenus.append_imageurl; }
}
function updateAppendMenus() {
    var titlelength = 25;
    var note = SimplenoteLS.getNote(localStorage.lastopennote_key);
    var nonemptylines = note.content.split("\n").filter(function(line) {return line.trim().length > 0;});
    var title = "last open"
    if (nonemptylines.length > 0 && nonemptylines[0].length <= titlelength)
        title= '"' + nonemptylines[0].trim() + '"';
    else if (nonemptylines.length > 0)
        title = '"' + nonemptylines[0].trim().substring(0, titlelength-3) + '.."';

    chrome.contextMenus.update(contextmenus.append_pageurl,   {title:"Append to " + title + " (Page Url)"});
    chrome.contextMenus.update(contextmenus.append_selection, {title:"Append to " + title + " (Selection)"});
    chrome.contextMenus.update(contextmenus.append_linkurl,   {title:"Append to " + title + " (Link Url)"});
    chrome.contextMenus.update(contextmenus.append_imageurl,  {title:"Append to " + title + " (Image Url)"});
}

function addCreateMenus() {
    contextmenus.create_pageurl = chrome.contextMenus.create({type:"normal",title:"Create a Simplenote (Page Url)",        contexts:['page'],
                onclick: function(info, tab){
                    //createNoteFromBG({content:"Page Url:\n\nINFO:-------\n" + JSON.stringify(info) + "\n\nTAB:--------\n" + JSON.stringify(tab)});
                    _gaq.push(['_trackEvent', 'ContextMenu', 'create_url']);
                    createNoteFromBG({content:info.pageUrl});
                }});
    contextmenus.create_selection = chrome.contextMenus.create({type:"normal",title:"Create a Simplenote (Selection)",  contexts:['selection'],
            onclick: function(info, tab){
                //createNoteFromBG({content:"Selection:\n\nINFO:-------\n" + JSON.stringify(info) + "\n\nTAB:--------\n" + JSON.stringify(tab)});
                _gaq.push(['_trackEvent', 'ContextMenu', 'create_selection']);
                createNoteFromBG({content:info.selectionText + "\n" + "[Source: " + tab.url + "]"});
            }});
    contextmenus.create_linkurl = chrome.contextMenus.create({type:"normal",title:"Create a Simplenote (Link Url)",       contexts:['link'],
            onclick: function(info, tab){
                //createNoteFromBG({content:"Link URL:\n\nINFO:-------\n" + JSON.stringify(info) + "\n\nTAB:--------\n" + JSON.stringify(tab)});
                _gaq.push(['_trackEvent', 'ContextMenu', 'create_link_url']);
                createNoteFromBG({content:info.linkUrl});
            }});
    contextmenus.create_imageurl = chrome.contextMenus.create({type:"normal",title:"Create a Simplenote (Image Url)",    contexts:['image'],
            onclick: function(info, tab){
                _gaq.push(['_trackEvent', 'ContextMenu', 'create_image_url']);
                createNoteFromBG({content:info.srcUrl});
            }});
}

function appendToLastOpenNoteFromBG(string) {

    if (!localStorage.lastopennote_key) { // shouldnt happen
        signalError();
        return;
    }    

    signalProcessing();
    SimplenoteDB.getNote(localStorage.lastopennote_key,function(oldnote) {
        oldnote.content += "\n" + string;
        SimplenoteDB.updateNote(oldnote, function(note) {
            if (note) {                
                localStorage.lastopennote_open = "true";
                var lines = note.content.split("\n");
                var caretScroll = {line:"lastline", character: lines[lines.length-1].length};
                localStorage[note.key+"_caret"] = JSON.stringify(caretScroll);                
                signalSuccess();
            } else 
                signalError()
            
        });
    });
}

function createNoteFromBG(note) {
    signalProcessing();
    SimplenoteDB.createNote(note, function(note) {
        if (note) {
            localStorage.lastopennote_key = note.key;
            localStorage.lastopennote_open = "true";
            handleRequest({action:"lastopen_keychanged"});
            signalSuccess();
        } else
            signalError();
    });
}

function signalProcessing() {
    chrome.browserAction.setBadgeText({text:"..."});
    chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,128]});
}

function signalSuccess() {    
    chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,128]});
    chrome.browserAction.setBadgeText({text:"ok"});
    setTimeout('chrome.browserAction.setBadgeText({text:""});', 2000);
}

function signalError() {
    chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,128]});
    chrome.browserAction.setBadgeText({text:"err"});
    setTimeout('chrome.browserAction.setBadgeText({text:""});', 20000);
}

// selection:
// {"editable":false,"menuItemId":1,"pageUrl":"http://derstandard.at/r2140/Switchlist","selectionText":"Kalender Girls\n20.15 bis 22.25 | Super RTL | SOZIALKOMÖDIE | Calendar Girls, GB/USA 2003, Nigel Cole"}
// {"favIconUrl":"http://derstandard.at/favicon.ico","id":16,"incognito":false,"index":4,"pinned":false,"selected":true,"status":"complete","title":"Switchlist - derStandard.at › Etat › Medien › TV","url":"http://derstandard.at/r2140/Switchlist","windowId":1}

// page:
//{"editable":false,"menuItemId":1,"pageUrl":"http://derstandard.at/r2140/Switchlist"}
//{"favIconUrl":"http://derstandard.at/favicon.ico","id":16,"incognito":false,"index":4,"pinned":false,"selected":true,"status":"complete","title":"Switchlist - derStandard.at › Etat › Medien › TV","url":"http://derstandard.at/r2140/Switchlist","windowId":1}

// link:
//{"editable":false,"linkUrl":"http://derstandard.at/1302515898810/Dienstag-Kalender-Girls","menuItemId":1,"pageUrl":"http://derstandard.at/r2140/Switchlist"}
//{"favIconUrl":"http://derstandard.at/favicon.ico","id":16,"incognito":false,"index":4,"pinned":false,"selected":true,"status":"complete","title":"Switchlist - derStandard.at › Etat › Medien › TV","url":"http://derstandard.at/r2140/Switchlist","windowId":1}

// image:
// {"editable":false,"linkUrl":"http://derstandard.at/1302515898341/Dienstag-American-Psycho","mediaType":"image","menuItemId":1,"pageUrl":"http://derstandard.at/r2140/Switchlist","srcUrl":"http://images.derstandard.at/t/107/2011/04/11/1302517599597.jpg"}
//{"favIconUrl":"http://derstandard.at/favicon.ico","id":16,"incognito":false,"index":3,"pinned":false,"selected":true,"status":"complete","title":"Switchlist - derStandard.at › Etat › Medien › TV","url":"http://derstandard.at/r2140/Switchlist","windowId":1}

// handle omnibox
//chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
//    var notes = SimplenoteLS.getNotes({query:text,deleted:0});
//    for (var i=0; i<notes.length; i++) {
//        notes[i].description = notes[i].content.substr(0, Math.min(notes[i].content.length,40));
//        notes[i].content = notes[i].key;
//    }
//    suggest(notes);
//});


chrome.extension.onRequest.addListener(handleRequest);
function handleRequest(request, sender, sendResponse) {    

    log("request: " + request.action);
    log(request);
    var callbacks;
    if (request.action == "userchanged") {
        _gaq.push(['_trackEvent', 'background', 'request','userchanged']);
        SimplenoteLS._reset();
        SimplenoteDB._reset();        
        backgroundSync(true, function(successObj) {
            log("handleRequest:userchanged sync done.");
            if (sendResponse)
                sendResponse(successObj);
        });
    } else if (request.action === "login") {

        callbacks = {
            success:   function(credentials) { 
                     
                if (credentials) // callback cause of token returns no credentials
                    SimplenoteDB.offline(false);                
                                    
                if (credentials) {
                    localStorage.token = credentials.token;
                    localStorage.tokenTime = credentials.tokenTime;
                }
                sendResponse({success:true, reason:credentials?"success":"token"});
            },
            loginInvalid:     function() {
                SimplenoteDB.offline(false);
                sendResponse({success:false, reason:"logininvalid"});
            },
            timeout: function() { 
                                        
                SimplenoteDB.offline(true);
                                        
                if (localStorage.token) // offline mode despite token older than 24hrs
                    sendResponse({success:true})
                else
                    sendResponse({
                        success:false,
                        message:"Network timeout, please try again later or check your internet connection.",
                        reason:"timeout"
                    });
            }
        };
        
        var credentials = {
            email: localStorage.option_email,
            password: localStorage.option_password
            };
        if (localStorage.token) {
            credentials.token = localStorage.token;
            credentials.tokenTime = new Date(localStorage.tokenTime);
        }

        SimplenoteAPI2.login(credentials, callbacks);
    } else if (request.action === "sync") {        
        backgroundSync(request.fullsync, sendResponse);
    } else if (request.action === "note") {
        SimplenoteDB.getNote(request.key,sendResponse);    
    } else if (request.action === "getnotes") {                
        sendResponse(SimplenoteLS.getNotes(request));
    } else if (request.action === "delete") {
        SimplenoteDB.deleteNote(request, sendResponse);
    } else if (request.action === "update") {               
        SimplenoteDB.updateNote(request, sendResponse);
    } else if (request.action === "create") {
        SimplenoteDB.createNote(request, sendResponse);
    } else if (request.action === "tags") {
        sendResponse(SimplenoteLS.getTags());
    } else if (request.action === "isoffline") {
        sendResponse(SimplenoteDB.isOffline());
    } else if (request.action == "setcontextmenu") {
        setcontextmenus(request.on);
    } else if (request.action == "lastopen_keychanged") {
        if (request.on == undefined || request.on == true) {
            setcontextmenus(true);
        } else {
            removeAppendMenus();
        }
    }
}

// function for popup close saving from background
var saveNote;
function popupClosed() {
    if (!saveNote)
        return;
    
    if (saveNote.key && saveNote.key != "")
        SimplenoteDB.updateNote(saveNote, function(note) {
            localStorage.lastopennote_key = note.key;
            localStorage.lastopennote_open = "true";
            handleRequest({action:"lastopen_keychanged"});
            saveNote = undefined;
            log("popupClosed: update success.");
        });
    else
        SimplenoteDB.createNote(saveNote, function(note) {
            localStorage.lastopennote_key = note.key;
            localStorage.lastopennote_open = "true";
            handleRequest({action:"lastopen_keychanged"});
            saveNote = undefined;
            log("popupClosed: create success.");
        });
}

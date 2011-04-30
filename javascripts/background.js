var isDebug = true;
function log(s) {
    if (isDebug)
        logGeneral(s,"background.js");
}

function backgroundSync(fullSync, callbackComplete, callbackPartial) {
    if (localStorage.option_email == undefined || localStorage.option_password == undefined) {
        log("backgroundSync: no credentials, exiting..")
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
            SimplenoteDB.sync(fullSync, function() {
                //log("backgroundSync: complete, setting timer for partial sync..");
                if (callbackComplete)
                    callbackComplete();
                //window.setTimeout("backgroundSync(false);", 2000);
            }, callbackPartial);
        } else {
            log("backgroundSync: login request failed.");
        }               
    });
}
// sync on browser start
$(document).ready(function() {
    backgroundSync(true);    
});

// add context menus
// contexts : Legal values are: 'all', 'page', 'selection', 'link', 'editable', 'image', 'video', and 'audio'. Defaults to ['page'].
chrome.contextMenus.create({type:"normal",title:"Create a Simplenote (URL)",contexts:['page'],onclick:handleContextMenu})
chrome.contextMenus.create({type:"normal",title:"Create a Simplenote (Selection)",contexts:['selection'],onclick:handleContextMenu})
chrome.contextMenus.create({type:"normal",title:"Create a Simplenote (Link)",contexts:['link','image'],onclick:handleContextMenu})

//chrome.contextMenus.create({type:"normal",title:"Insert a Simplenote",contexts:['editable'],onclick:handleContextMenu})

function handleContextMenu(info, tab) {
    var content = "";
    var gotSelection = info.selectionText != undefined;
//    console.log(info)
//    console.log(tab)
    if (info.linkUrl) {
        if (gotSelection)
            content += info.selectionText + ": ";
        content += info.linkUrl;        
    } else {
        if (gotSelection) {
            content += info.selectionText + "\n";
            content += "(Source: " + tab.title + "\n" + info.pageUrl + ")";
        } else
            content += tab.title + " (" + info.pageUrl + ")";
    } 
    
    var note = {content:content};
    chrome.browserAction.setBadgeText({text:"..."});
    chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,128]});
    SimplenoteDB.createNote(note, function(note) {
        chrome.browserAction.setBadgeText({text:"ok"});
        chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,128]});
        localStorage.opentonotekey = note.key;
        //setTimeout('chrome.browserAction.setBadgeText({text:""});window.open("popup.html");', 2000);
        setTimeout('chrome.browserAction.setBadgeText({text:""});', 2000);
    });
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
chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
    var notes = SimplenoteLS.getNotes({query:text,deleted:0});
    for (var i=0; i<notes.length; i++) {
        notes[i].description = notes[i].content.substr(0, Math.min(notes[i].content.length,40));
        notes[i].content = notes[i].key;
    }
    suggest(notes);
});


chrome.extension.onRequest.addListener(handleRequest);
function handleRequest(request, sender, sendResponse) {    

    log("request: " + request.action);
    log(request);
    var callbacks;
    if (request.action == "userchanged") {
        SimplenoteLS._reset();
        SimplenoteDB._reset();        
        backgroundSync(true, function() {
            log("handleRequest:userchanged sync done.");            
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
                sendResponse({ success:false, reason:"logininvalid" });
            },
            timeout: function() { 
                                        
                SimplenoteDB.offline(true);
                                        
                if (localStorage.token) // offline mode despite token older than 24hrs
                    sendResponse({ success:true })
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
    }
}

// function for popup close saving from background
var saveNote;
function popupClosed() {
    if (!saveNote)
        return;
    
    if (saveNote.key && saveNote.key != "")
        SimplenoteDB.updateNote(saveNote, function(note) {
            localStorage.opentonotekey = note.key;
            saveNote = undefined;
            log("popupClosed: update success.");
        });
    else
        SimplenoteDB.createNote(saveNote, function(note) {
            localStorage.opentonotekey = note.key;
            saveNote = undefined;
            log("popupClosed: create success.");
        });
}

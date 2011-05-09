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
    
    SimplenoteCM.populate();

    backgroundSync(true);
});

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
    } else if (request.action == "cm_populate") {
        SimplenoteCM.populate(request.on == undefined || request.on);
    } else if (request.action == "cm_updatelastopen") {
        SimplenoteCM.updateLastOpen();
    }
}

// function for popup close saving from background
var saveNote;
var needLastOpenRefresh = false;
var needCMRefresh = false;
function popupClosed() {
    if (saveNote) {
        
        if (saveNote.key && saveNote.key != "")
            SimplenoteDB.updateNote(saveNote, function(note) {
                localStorage.lastopennote_key = note.key;
                localStorage.lastopennote_open = "true";
                handleRequest({action:"lastopen_keychanged"});
                saveNote = undefined;
                checkRefreshs();
                log("popupClosed: update success.");
            });
        else
            SimplenoteDB.createNote(saveNote, function(note) {
                localStorage.lastopennote_key = note.key;
                localStorage.lastopennote_open = "true";
                handleRequest({action:"lastopen_keychanged"});
                saveNote = undefined;
                checkRefreshs();
                log("popupClosed: create success.");
            });
    } else
        checkRefreshs();
}

function checkRefreshs() {
    if (needCMRefresh)
        handleRequest({action:"cm_populate"});
    else if (needLastOpenRefresh)
        handleRequest({action:"cm_updatelastopen"});

    needLastOpenRefresh = false;
    needCMRefresh = false;
}

var SimplenoteBG = {

    webnotesID : undefined,

    log : function(s) {
        if (debugFlags.BG)
            logGeneral(s,"background.js");
    },

    backgroundSync: function(fullSync, callbackComplete, callbackPartial) {
        if (localStorage.option_email == undefined || localStorage.option_password == undefined) {
            this.log("backgroundSync: no credentials, exiting..");
            return;
        }

        if (SimplenoteDB.getSyncInProgress()) {
            this.log("backgroundSync: sync already in progress");
            if (callbackComplete)
                callbackComplete();
            return;
        }

        if (!fullSync && !SimplenoteDB.hadSync())
            fullSync = true;

        this.log("backgroundSync: starting..");
        this.log("backgroundSync: offlinemode: " + SimplenoteDB.isOffline());
        this.log("backgroundSync: fullsync: " + fullSync);

        this.handleRequest({action:"login"}, {}, function(successObj) {
            if (successObj.success) {
                SimplenoteBG.log("backgroundSync: login request completed, requesting sync. fullSync=" + fullSync);
                SimplenoteDB.sync(fullSync, function(successObj) {                    
                    if (callbackComplete)
                        callbackComplete(successObj);                    
                }, callbackPartial);
            } else {
                SimplenoteBG.log("backgroundSync: login request failed.");
            }
        });
    },

    handleRequest: function(request, sender, sendResponse) {    

        // need to use SimplenoteBG. here because its not called in object context
        SimplenoteBG.log("request: " + request.action);        
        var callbacks;
        
        if (request.action == "webnotes") {
            if (SimplenoteBG.webnotesID != undefined) {
                chrome.extension.sendRequest(SimplenoteBG.webnotesID,request.request);
                if (sendResponse)
                    sendResponse(true);
            } else {
                var q=confirm("The Webnotes plugin is not installed. Go to download page now?");
                if (q)
                    openURLinTab("https://chrome.google.com/webstore/detail/ajfdaicinlekajkfjoomjmoikoeghimd");
                if (sendResponse)
                    sendResponse(false);
            }
        } else if (request.action == "userchanged") {
            _gaq.push(['_trackEvent', 'background', 'request','userchanged']);
            SimplenoteLS._reset();
            SimplenoteDB._reset();
            this.backgroundSync(true, function(successObj) {
                SimplenoteBG.log("handleRequest:userchanged sync done.");
                SimplenoteBG.handleRequest({action:"cm_populate"});
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
            SimplenoteBG.backgroundSync(request.fullsync, sendResponse);
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
            SimplenoteCM.populate();
        } else if (request.action == "cm_updatelastopen") {
            SimplenoteCM.updateLastOpen();
        } 
    },
    
    saveNote : undefined,

    popupClosed: function() {
        
        this.log("popupClosed()");

        if (this.saveNote) {

            if (this.saveNote.key && this.saveNote.key != "")
                SimplenoteDB.updateNote(this.saveNote, function(note) {
                    localStorage.lastopennote_key = note.key;
                    localStorage.lastopennote_open = "true";
                    SimplenoteBG.handleRequest({action:"cm_updatelastopen"});
                    SimplenoteBG.saveNote = undefined;
                    SimplenoteBG.checkRefreshs();
                    SimplenoteBG.log("popupClosed: update success.");
                });
            else
                SimplenoteDB.createNote(this.saveNote, function(note) {
                    localStorage.lastopennote_key = note.key;
                    localStorage.lastopennote_open = "true";
                    SimplenoteBG.handleRequest({action:"cm_updatelastopen"});
                    SimplenoteBG.saveNote = undefined;
                    SimplenoteBG.checkRefreshs();
                    SimplenoteBG.log("popupClosed: create success.");
                });
        } else
            this.checkRefreshs();
    },
    
    needLastOpenRefresh : false,

    needCMRefresh : false,

    checkRefreshs : function() {

        if (this.needCMRefresh)
            this.handleRequest({action:"cm_populate"});
        else if (this.needLastOpenRefresh)
            this.handleRequest({action:"cm_updatelastopen"});

        this.needLastOpenRefresh = false;
        this.needCMRefresh = false;
    }
}

// sync on browser start
$(document).ready(function() {
    SimplenoteCM.populate();
    SimplenoteBG.backgroundSync(true);
});

chrome.extension.onRequest.addListener(SimplenoteBG.handleRequest);

// plugin listener
var allowIDs = ["mapleegchccgpbebdikelnklgcgokmom","ajfdaicinlekajkfjoomjmoikoeghimd"];
chrome.extension.onRequestExternal.addListener(
    function(request, sender, response) {
        if (allowIDs.indexOf(sender.id)<0) {
            SimplenoteBG.log("unauthorized external request from " + sender.id);            
        } else {
            SimplenoteBG.log("external request " + request.action + " from " + sender.id);
            if (request.action == "register_plugin") {
                if (request.name == "webnotes") {
                    SimplenoteBG.webnotesID = sender.id;
                    SimplenoteBG.log("webnotes registered");
                    get_manifest(function(manifest) {
                        manifest.syncpad_id = request.syncpad_id;
                        response(manifest);
                    })
                } else {                    
                    SimplenoteBG.log("unknown plugin " + request.name);
                    response(false);
                }
            } else if (request.action == "have_credentials") {
                if (localStorage.option_email == undefined || localStorage.option_password == undefined) {
                    var q=confirm("Not logged in to Simplenote.\n\nGo to options page?");
                    if (q)
                        chrome.tabs.create({url:"options.html"});
                    response(false);
                } else
                    response(true);
            } else {                
                SimplenoteBG.handleRequest(request, sender, response);
            }
        }
    }
);

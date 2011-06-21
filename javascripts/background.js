var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-22573090-2']);
_gaq.push(['_trackPageview']);

var SM = new SimplenoteSM();

var SimplenoteBG = {

    webnotesID : undefined,
    webnotesVersion : undefined,

    log : function(s) {
        if (debugFlags.BG)
            logGeneral(s,"background.js");
    },

    backgroundSync: function(fullSync, callbackComplete, callbackPartial) {
        if (!SM.haveLogin() || !SM.credentialsValid) {
            this.log("backgroundSync: no credentials or or invalid ones, exiting..");
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

        this.log("backgroundSync: starting [offline=" + SimplenoteDB.isOffline() + ", full=" + fullSync + "]");
        
        this.handleRequest({action:"login"}, {}, function(successObj) {
            try {
                if (successObj.reason == "offlinemode") {
                    SimplenoteBG.log("backgroundSync: sync aborted, offlinemode.");
                    uiEvent("offlinechanged", {status:true});
                } else if (successObj.success) {
                    SimplenoteBG.log("backgroundSync: login request completed [reason=" + successObj.reason + "], requesting sync.");
                    SimplenoteDB.sync(fullSync, function(successObj) {
                        if (callbackComplete)
                            callbackComplete(successObj);
                    }, callbackPartial);
                } else {
                    SimplenoteBG.log("backgroundSync: login request failed.");
                }
            } catch (e) {
                exceptionCaught(e);
            }
        });
    },

    handleRequest: function(request, sender, sendResponse) {    

        try {
            // need to use SimplenoteBG. here because its not called in object context
            SimplenoteBG.log("request: " + request.action);
            var callbacks;

            if (request.action == "webnotes") {
                if (SimplenoteBG.webnotesID != undefined) {
                    chrome.extension.sendRequest(SimplenoteBG.webnotesID,request.request);
                    if (sendResponse)
                        sendResponse(true);
                } else {
                    if (confirm("The Webnotes plugin is not installed or disabled.\n\nGo to download page now?"))
                        openURLinTab("https://chrome.google.com/webstore/detail/ajfdaicinlekajkfjoomjmoikoeghimd");
                    if (sendResponse)
                        sendResponse(false);
                }
            } else if (request.action == "userchanged") {
                _gaq.push(['_trackEvent', 'background', 'request','userchanged']);
                SimplenoteLS._reset();
                SimplenoteDB._reset();
                SimplenoteBG.backgroundSync(true, function(successObj) {
                    SimplenoteBG.log("handleRequest:userchanged sync done.");
                    SimplenoteBG.handleRequest({action:"cm_populate"});

                    if (sendResponse)
                        sendResponse(successObj);
                });
            } else if (request.action == "fillcontents") {
                SimplenoteDB.fillContents(sendResponse);
            } else if (request.action === "login") {

                callbacks = {
                    success:   function(credentials) {

                        if (credentials) { // callback cause of token returns no credentials
                            SimplenoteDB.offline(false);
                            SM.tokenAcquired(credentials);
                        }
                        sendResponse({success:true, reason:credentials?"success":"token"});
                    },
                    loginInvalid:     function() {
                        SimplenoteDB.offline(false);

                        SM.credentialsValid = "false";

                        sendResponse({success:false, reason:"logininvalid"});
                    },
                    timeout: function() {

                        SimplenoteDB.offline(true);

                        if (SM.credentialsValid) // offline mode despite token older than 24hrs
                            sendResponse({success:true, reason:"offlinemode"})
                        else
                            sendResponse({
                                success:false,
                                message:"Network timeout, please try again later or check your internet connection.",
                                reason:"timeout"
                            });
                    }
                };

                SimplenoteAPI2.login(SM.getCredentials(), callbacks);
            } else if (request.action === "sync") {
                SimplenoteBG.backgroundSync(request.fullsync, sendResponse);
            } else if (request.action === "note") {
                SimplenoteDB.getNote(request.key,sendResponse);
            } else if (request.action === "getnotes") {
                sendResponse(SimplenoteLS.getNotes(request));
            } else if (request.action === "delete") {
                if (SimplenoteDB.isOffline()) {
                    alert("Offline note delete not supported. Please try again when online!");
                    sendResponse(false);
                } else
                    SimplenoteDB.deleteNote(request.key, sendResponse);
            } else if (request.action === "update") {
                SimplenoteDB.updateNote(request, sendResponse);
            } else if (request.action === "create") {
                SimplenoteDB.createNote(request, sendResponse);
            } else if (request.action === "tags") {
                sendResponse(SimplenoteLS.getTags(request.options));
            } else if (request.action === "isoffline") {
                sendResponse(SimplenoteDB.isOffline());
            } else if (request.action === "emptytrash") {
                if (SimplenoteDB.isOffline()) {
                    alert("Offline trash empty not supported. Please try again when online!");
                    sendResponse(false);
                } else
                    SimplenoteDB.emptyTrash(sendResponse);
            } else if (request.action == "cm_populate") {
                SimplenoteCM.populate();
            } else if (request.action == "cm_updatelastopen") {
                SimplenoteCM.updateLastOpen();
            }
        } catch (e) {
            exceptionCaught(e);
        }
    },
    
    saveNote : undefined,

    popupClosed: function() {

        try {
            this.log("popupClosed()");

            if (this.saveNote) {

                if (this.saveNote.key && this.saveNote.key != "")
                    SimplenoteDB.updateNote(this.saveNote, function(note) {
                        localStorage.lastopennote_key = note.key;
                        localStorage.lastopennote_open = "true";
                        SimplenoteBG.needCMRefresh = true;
                        SimplenoteBG.saveNote = undefined;
                        SimplenoteBG.checkRefreshs();
                        SimplenoteBG.log("popupClosed: update success.");
                    });
                else
                    SimplenoteDB.createNote(this.saveNote, function(note) {
                        localStorage.lastopennote_key = note.key;
                        localStorage.lastopennote_open = "true";
                        SimplenoteBG.needCMRefresh = true;
                        SimplenoteBG.saveNote = undefined;
                        SimplenoteBG.checkRefreshs();
                        SimplenoteBG.log("popupClosed: create success.");
                    });
            } else
                this.checkRefreshs();
        } catch (e) {
            exceptionCaught(e);
        }
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
    try {
        SimplenoteCM.populate();
        SimplenoteBG.backgroundSync(true);        
    } catch (e) {
        exceptionCaught(e)
    }

    SimplenoteBG.log("(ready) setting up ga");
    // some info about settings
    _gaq.push(['_trackEvent', 'settings', 'editorfont', localStorage.option_editorfont]);
    _gaq.push(['_trackEvent', 'settings', 'editorfontsize', localStorage.option_editorfontsize]);
    _gaq.push(['_trackEvent', 'settings', 'sortby', localStorage.option_sortby]);
    _gaq.push(['_trackEvent', 'settings', 'alwaystab', localStorage.option_alwaystab]);

    setTimeout(function() {
        var ga = document.createElement('script');ga.type = 'text/javascript';ga.async = true;
        if (debugFlags.GA)
            ga.src = 'https://ssl.google-analytics.com/u/ga_debug.js';
        else
            ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];s.parentNode.insertBefore(ga, s);
    },10);

    SimplenoteBG.log("(ready) done");

});

chrome.extension.onRequest.addListener(SimplenoteBG.handleRequest);

// plugin listener
var allowIDs = ["mapleegchccgpbebdikelnklgcgokmom","ajfdaicinlekajkfjoomjmoikoeghimd","hkjlilomjkhhefjbjnaghbfonmeklpje"];
chrome.extension.onRequestExternal.addListener(
    function(request, sender, response) {
        if (allowIDs.indexOf(sender.id)<0) {
            SimplenoteBG.log("unauthorized external request from " + sender.id);            
        } else {
            SimplenoteBG.log("external request " + request.action + " from " + sender.id);
            if (request.action == "register_plugin") {
                if (request.name == "webnotes") {
                    SimplenoteBG.log("webnotes " + sender.id + " registered, version " + request.version);
                    if (!SimplenoteBG.webnotesVersion || request.version > SimplenoteBG.webnotesVersion) {
                        SimplenoteBG.webnotesID = sender.id;
                        SimplenoteBG.webnotesVersion = request.version;
                        SimplenoteBG.log("using this");
                    } else
                        SimplenoteBG.log("not using this");
                    
                    get_manifest(function(manifest) {
                        manifest.syncpad_id = request.syncpad_id;
                        response(manifest);
                    });
                    
                } else {                    
                    SimplenoteBG.log("unknown plugin " + request.name);
                    response(false);
                }
            } else if (request.action == "have_credentials") {
                if (!SM.haveLogin() || !SM.credentialsValid) {
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
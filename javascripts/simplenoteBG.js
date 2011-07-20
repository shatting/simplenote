loaded = false;

var SimplenoteBG = {
    
    extData : extData,
    
    tab : undefined,
    
    log : function(s) {
        if (this.extData && this.extData.debugFlags.BG)
            logGeneral(s,"SimplenoteBG");
    },
    
    plugins : {
        webnotes : {         
            ids: ["ajfdaicinlekajkfjoomjmoikoeghimd", "omfdmgheagmclnflgdogflmogmogcmio"],
            selected: undefined,
            selectedVersion: undefined
        }
    },

    backgroundSync: function(fullSync, callbackComplete, callbackPartial) {
        if (!SimplenoteSM.haveLogin() || !SimplenoteSM.credentialsValid()) {
            this.log("backgroundSync: no credentials or invalid ones, exiting..");
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
                if (SimplenoteBG.plugins.webnotes.selected != undefined) {
                    chrome.extension.sendRequest(SimplenoteBG.plugins.webnotes.selected,request.request);
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
                SimplenoteAPI2.resetCredentials();
                SimplenoteBG.backgroundSync(true, function(successObj) {
                    SimplenoteBG.log("handleRequest:userchanged sync done.");
                    SimplenoteBG.handleRequest({action:"cm_populate"});

                    if (sendResponse)
                        sendResponse(successObj);
                });
            } else if (request.action == "fillcontents") {
                SimplenoteDB.fillContents(sendResponse, request.options);
            } else if (request.action === "login") {

                callbacks = {
                    success:   function(credentials) {

                        if (credentials) { // callback cause of token returns no credentials
                            SimplenoteDB.offline(false);
                            SimplenoteSM.tokenAcquired(credentials);
                        }
                        sendResponse({success:true, reason:credentials?"success":"token"});
                    },
                    loginInvalid:     function() {
                        SimplenoteDB.offline(false);

                        SimplenoteSM.credentialsValid("false");

                        sendResponse({success:false, reason:"logininvalid"});
                    },
                    timeout: function() {

                        SimplenoteDB.offline(true);

                        if (SimplenoteSM.credentialsValid()) // offline mode despite token older than 24hrs
                            sendResponse({success:true, reason:"offlinemode"})
                        else
                            sendResponse({
                                success:false,
                                message:"Network timeout, please try again later or check your internet connection.",
                                reason:"timeout"
                            });
                    }
                };

                SimplenoteAPI2.login(SimplenoteSM.getCredentials(), callbacks);
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
                        lastOpen.openTo(note.key);
                        SimplenoteBG.needCMRefresh = true;
                        SimplenoteBG.saveNote = undefined;
                        SimplenoteBG.checkRefreshs();
                        SimplenoteBG.log("popupClosed: update success.");
                    });
                else
                    SimplenoteDB.createNote(this.saveNote, function(note) {
                        lastOpen.openTo(note.key);
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
    },

    setOpenTab: function(tab) {
        if (tab != undefined)
            this.tab = tab;
        
        if (chrome.browserAction == undefined) {
            //setTimeout("SimplenoteBG.setOpenTab();",1000);
            _gaq.push(['_trackEvent', 'background', 'setOpenTab deferred']);
            return;
        }
            
        if (this.tab)
            chrome.browserAction.setTitle({title:chrome.i18n.getMessage("ba_go_to_syncpad_tab")});
        else
            chrome.browserAction.setTitle({title:chrome.i18n.getMessage("ba_open_syncpad_tab")});
        
        chrome.browserAction.setPopup({popup:""});
    },
    
    setOpenPopup : function(deleteTab) {
        if (deleteTab)
            delete this.tab;

        if (localStorage.option_alwaystab == "true" || this.tab) {
            this.setOpenTab();
        } else {
            if (chrome.browserAction == undefined) {
                //setTimeout("SimplenoteBG.setOpenPopup();",1000);
                _gaq.push(['_trackEvent', 'background', 'setOpenPopup deferred']);
            } else {
                chrome.browserAction.setPopup({popup:"/popup.html"});
                chrome.browserAction.setTitle({title:chrome.i18n.getMessage("ba_open_syncpad")});            
            }
        }
    },
    
    browserActionListener : function(tab) {
        var pinned = localStorage.option_pinnedtab == undefined || localStorage.option_pinnedtab == "true";

        if (SimplenoteBG.tab) {
            SimplenoteBG.log("--> deferring to tab");

            chrome.tabs.update(SimplenoteBG.tab.id, {
                selected:true,
                pinned: pinned
            }, function() {
                return;
            });
        } else {
            SimplenoteBG.log("--> no tab -> creating tab");

            chrome.tabs.create({
                url:chrome.extension.getURL("/popup.html?tab=true"),
                pinned: pinned
            }, function(tab) {
                SimplenoteBG.tab = tab;
            });
        }
    },
    
    pluginListener : function(request, sender, response) {
        
        if (SimplenoteBG.plugins.webnotes.ids.indexOf(sender.id)<0) {
            SimplenoteBG.log("unauthorized external request from " + sender.id);            
        } else {
            SimplenoteBG.log("external request " + request.action + " from " + sender.id);
            if (request.action == "register_plugin") {
                if (request.name == "webnotes") {
                    SimplenoteBG.log("webnotes " + sender.id + " registered, version " + request.version);
                    if (!SimplenoteBG.plugins.webnotes.selectedVersion || request.version >= SimplenoteBG.plugins.webnotes.selectedVersion) {
                        SimplenoteBG.plugins.webnotes.selected = sender.id;
                        SimplenoteBG.plugins.webnotes.selectedVersion = request.version;
                        SimplenoteBG.log("using this");
                    } else
                        SimplenoteBG.log("not using this");
                                        
                    response(extData.syncpadManifest);                    
                    
                } else {                    
                    SimplenoteBG.log("unknown plugin " + request.name);
                    response(false);
                }
            } else if (request.action == "have_credentials") {
                if (!SimplenoteSM.haveLogin() || !SimplenoteSM.credentialsValid()) {
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
    },
    
    findPlugins: function() {
        var pluginInfo;
        for (var plugin in this.plugins) {
            pluginInfo = this.plugins[plugin];            
            
            if (!extData.debugFlags.general)
                chrome.extension.sendRequest(pluginInfo.ids[0],{action:"ping"}, function(manifest) {
                    if (manifest) {
                        SimplenoteBG.plugins[plugin].selected = pluginInfo.ids[0];
                        SimplenoteBG.plugins[plugin].selectedVersion = manifest.version;
                        SimplenoteBG.log("webstore " + plugin + " with id " + pluginInfo.ids[0] + " found, using it.");                
                    } else
                        SimplenoteBG.log("webstore " + plugin + " with id " + pluginInfo.ids[0] + " not found.");                
                });
            else
                chrome.extension.sendRequest(pluginInfo.ids[1],{action:"ping"}, function(manifest) {
                    if (manifest) {
                        SimplenoteBG.plugins[plugin].selected = pluginInfo.ids[1];
                        SimplenoteBG.plugins[plugin].selectedVersion = manifest.version;
                        SimplenoteBG.log("development " + plugin + " with id " + pluginInfo.ids[1] + " found, using it.");                
                    } else
                        SimplenoteBG.log("development " + plugin + " with id " + pluginInfo.ids[1] + " not found.");                
                });                                   
        }
    },
    
    startup: function() {
        this.log("startup..");

        try {
            chrome.extension.onRequest.addListener(SimplenoteBG.handleRequest);            
        } catch (e) {
            exceptionCaught(e);
        }
        
        try {
            chrome.extension.onRequestExternal.addListener(SimplenoteBG.pluginListener);
        } catch (e) {
            exceptionCaught(e);
        }
        
        try {
            chrome.browserAction.onClicked.addListener(SimplenoteBG.browserActionListener);
        } catch (e) {
            exceptionCaught(e);
        }
        
        
        try {        

            this.findPlugins();
            
            SimplenoteBG.setOpenPopup();           
            
        } catch (e) {
            exceptionCaught(e)
        }

        this.log("startup done.");
    }
}

$(document).ready(function() {
    
    SimplenoteBG.log("(ready)");
    
    SimplenoteBG.startup();
    
    loaded = true;
    
    setTimeout(function() {
        SimplenoteLS._maintain();        
        SimplenoteBG.backgroundSync(true, function() {
            SimplenoteCM.populate();
        } );
        
    }, 1000);

    
    scheduleGA(2000);

});
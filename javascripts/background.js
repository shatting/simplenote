var isDebug = true;
function log(s) {
    if (isDebug)
        logGeneral(s,"background.js");
}

$(document).ready(function(event) {    
    log("onload:starting sync","background");    
    log("onload:offlinemode:" + SimplenoteDB.isOffline(),"background");    
    
    handleRequest({action:"login"}, {}, function(successObj) {
        log("onload:login request completed","background");
        if (successObj.success) {
            log("onload:login request completed","background");
            handleRequest({action:"index"});
        }        
    });
});

chrome.contextMenus.create({type:"normal",title:"Create a Simplenote from this",contexts:['all'],onclick:handleContextMenu})

function handleContextMenu(info, tab) {
    //console.log(JSON.stringify(info));
    //console.log(JSON.stringify(tab));
    var content = "";
    if (info.selectionText)
        content = info.selectionText + "\n";

    if (info.linkUrl)
        content += info.linkUrl;

    if (content=="")
        content = info.pageUrl;
    else
        content += "(" + info.pageUrl + ")";
    
    var note = {content:content};
    chrome.browserAction.setBadgeText({text:"..."});
    chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,128]});
    SimplenoteDB.createNote(note, function() {
        chrome.browserAction.setBadgeText({text:"ok"});
        chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,128]});
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

chrome.extension.onRequest.addListener(handleRequest);

function handleRequest(request, sender, sendResponse) {    
  
    log("request:" + request.action);  
    var callbacks;
  
    if (request.action === "login") {
        callbacks = {
            success:   function(credentials) { 
                     
                if (credentials) // callback cause of token returns no credentials
                    SimplenoteDB.offline(false);                
                                    
                if (credentials) {
                    localStorage.token = credentials.token;
                    localStorage.tokenTime = credentials.tokenTime;
                }
                sendResponse({
                    success:true
                });  
            },
            loginInvalid:     function() {
                SimplenoteDB.offline(false);
                sendResponse({
                    success:false
                }); 
            },
            timeout: function() { 
                                        
                SimplenoteDB.offline(true);
                                        
                if (localStorage.token) // offline mode despite token older than 24hrs
                    sendResponse({
                        success:true
                    })
                else
                    sendResponse({
                        success:false,
                        message:"Network timeout, please try again later or check your internet connection."
                    });
            }
        };
                
        var credentials = {
            email: localStorage.email, 
            password: localStorage.password
            };
        if (localStorage.token) {
            credentials.token = localStorage.token;
            credentials.tokenTime = new Date(localStorage.tokenTime);        
        }
        SimplenoteAPI2.login(credentials, callbacks);
    } else if (request.action === "index") {
        SimplenoteDB.getIndex(sendResponse, {}, request);
    } else if (request.action === "note") {
        SimplenoteDB.getNote(request.key,sendResponse);    
    } else if (request.action === "search") {
        callbacks = {
            success :       function(data)  {
                sendResponse(data)
            }, 
            loginInvalid:   function()      {
                alert('background::search::loginInvalid');
            }, 
            repeat:         function()      {
                alert('background::search::repeat');
            }
        }; 
        Simplenote.search(request.query, callbacks );
    } else if (request.action === "delete") {
        SimplenoteDB.deleteNote(request, sendResponse);
    } else if (request.action === "update") {               
        SimplenoteDB.updateNote(request, sendResponse);
    } else if (request.action === "create") {
        SimplenoteDB.createNote(request, sendResponse);
    }
}

// function for popup close saving from background
var saveNote;
function popupClosed() {
    if (!saveNote)
        return;
    
    if (saveNote.key)
        SimplenoteDB.updateNote(saveNote, function() {
            log("popupClosed update success");
        });
    else
        SimplenoteDB.createNote(saveNote, function() {
            log("popupClosed create success");
        });
}

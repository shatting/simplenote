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

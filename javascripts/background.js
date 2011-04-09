var isDebug = false;
function log(s) {
    if (isDebug)
        console.log(s);
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  
  log("background::request:" + request.action);
  var callbacks;
  
  if (request.action === "login") {
    callbacks = {   success:   function(credentials) { 
                                    if (credentials) {
                                        localStorage.token = credentials.token;
                                        localStorage.tokenTime = credentials.tokenTime;
                                    }
                                    sendResponse(true);  
                                    },
                    error:     function() { sendResponse(false); }
                };
                
    var credentials = {email: localStorage.email, password: localStorage.password};
    if (localStorage.token) {
        credentials.token = localStorage.token;
        credentials.tokenTime = new Date(localStorage.tokenTime);        
    }
    SimplenoteAPI2.login(credentials, callbacks);
  } else if (request.action === "index") {
    SimplenoteDB.getIndex(sendResponse);
  } else if (request.action === "note") {
    SimplenoteDB.getNote(request.key,sendResponse);    
  } else if (request.action === "search") {
    callbacks = {   success :       function(data)  { sendResponse(data) }, 
                    loginInvalid:   function()      {  alert('background::search::loginInvalid');   }, 
                    repeat:         function()      {  alert('background::search::repeat'); }
                }; 
    Simplenote.search(request.query, callbacks );    
  } else if (request.action === "destroy") {
    callbacks = {   success :       function() { sendResponse() }, 
                    loginInvalid:   function() {    alert('background::destroy::loginInvalid');    }, 
                    repeat:         function() {    alert('background::destroy::repeat');          },
                    noteNotExists:  function() {    alert('background::destroy::noteNotExists');   }                    
            };    
    SimplenoteAPI2.update({key: request.key, deleted:1}, callbacks);
  } else if (request.action === "update") {               
    SimplenoteDB.updateNote({key:request.key, content:request.data}, sendResponse);
  } else if (request.action === "create") {
    callbacks = {   success :       function(data) { sendResponse(data) }, 
                    loginInvalid:   function() {    alert('background::create::loginInvalid');    }, 
                    repeat:         function() {    alert('background::create::repeat');          },
                    noteNotExists:  function() {    alert('background::create::noteNotExists');   }                    
        };
    SimplenoteAPI2.create({content : request.data}, callbacks);   
  }
});


// function for popup close saving from background
var savekey;
var savedata;
function popupClosed() {
    if (!savedata || savedata=="")
        return;
    
    if (savekey)
        SimplenoteDB.updateNote({key:savekey, content:savedata}, function() { log("background::popupClosed update success");});
    else
        Simplenote.create(savedata, function() {log("background::popupClosed create success");});
}

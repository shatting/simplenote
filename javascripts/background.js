var isDebug = false;
function log(s) {
    if (isDebug)
        console.log(s);
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  
  log("background::request:" + request.action);
  var callbacks;
  if (request.action === "login") {
    callbacks = {   success:   function() { sendResponse(true); },
                    error:     function() { sendResponse(false); }
                };
    if(localStorage.email && localStorage.password) {
      Simplenote.login(localStorage.email, localStorage.password, callbacks);
    }
  } else if (request.action === "index") {
    callbacks = {   success :       function(data) { sendResponse(data) }, 
                    loginInvalid:   function() {  alert('background::index::loginInvalid');   }, 
                    repeat:         function() {    alert('background::index::repeat');    }
                };
    Simplenote.index(callbacks);
  } else if (request.action === "note") {
    callbacks = {   success :       function(data) { sendResponse(data) }, 
                    loginInvalid:   function() {    alert('background::note::loginInvalid');    }, 
                    repeat:         function() {    alert('background::note::repeat');          },
                    noteNotExists:  function() {    alert('background::note::noteNotExists');   }                    
                };
    Simplenote.note(request.key, callbacks);
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
    Simplenote.destroy(request.key, callbacks);
  } else if (request.action === "update") {
    callbacks = {   success :       function(data) { sendResponse(data) }, 
                    loginInvalid:   function() {    alert('background::update::loginInvalid');    }, 
                    repeat:         function() {    alert('background::update::repeat');          },
                    noteNotExists:  function() {    alert('background::update::noteNotExists');   }                    
            };
    Simplenote.update(request.key, request.data, callbacks);
  } else if (request.action === "create") {
    callbacks = {   success :       function(data) { sendResponse(data) }, 
                    loginInvalid:   function() {    alert('background::create::loginInvalid');    }, 
                    repeat:         function() {    alert('background::create::repeat');          },
                    noteNotExists:  function() {    alert('background::create::noteNotExists');   }                    
        };
    Simplenote.create(request.data, callbacks);   
  }
});


// function for popup close saving from background
var savekey;
var savedata;
function popupClosed() {
    if (!savedata || savedata=="")
        return;
    
    if (savekey)
        Simplenote.update(savekey, savedata, function() { log("background::popupClosed update success");});
    else
        Simplenote.create(savedata, function() {log("background::popupClosed create success");});
}


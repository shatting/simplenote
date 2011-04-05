var isDebug = true;
function log(s) {
    if (isDebug)
        console.log(s);
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  
  log("background::request:" + request.action);
  
  if (request.action === "login") {
    Simplenote.onLogin = function() {
      sendResponse(true);
    };
    Simplenote.onLoginError = function() {
      sendResponse(false);
    };
    if(localStorage.email && localStorage.password) {
      Simplenote.login(localStorage.email, localStorage.password);
    }
  } else if (request.action === "index") {
    Simplenote.index(function(data) { sendResponse(data) });
  } else if (request.action === "search") {
    Simplenote.search(request.query, function(data) { sendResponse(data) });
  } else if (request.action === "note") {
    Simplenote.note(request.key, function(data) { sendResponse({key: request.key, text: data}) });
  } else if (request.action === "destroy") {
    Simplenote.destroy(request.key, sendResponse);
  } else if (request.action === "update") {
    Simplenote.update(request.key, request.data, sendResponse);
  } else if (request.action === "create") {
    Simplenote.create(request.data, sendResponse);    
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


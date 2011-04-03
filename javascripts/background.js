chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.action === "login") {
    Simplenote.onLogin = function() {
      sendResponse(true);
    };
    Simplenote.onLoginError = function() {
      sendResponse(false);
    }
    if(localStorage.email && localStorage.password) {
      Simplenote.login(localStorage.email, localStorage.password);
    }
  } else if (request.action === "index") {
    Simplenote.index(function(data) { sendResponse(data) });
  } else if (request.action === "search") {
    Simplenote.search(request.query, function(data) { sendResponse(data) });
  } else if (request.action === "note") {
    if (request.key === undefined) {
      sendResponse({text:""});
    } else {
      Simplenote.note(request.key, function(data) { sendResponse({key: request.key, text: data}) });
    }
  } else if (request.action === "destroy") {
    Simplenote.destroy(request.key, sendResponse);
  } else if (request.action === "update") {
    Simplenote.update(request.key, request.data, sendResponse);
  } else if (request.action === "create") {
    Simplenote.create(request.data, sendResponse);    
  }
});

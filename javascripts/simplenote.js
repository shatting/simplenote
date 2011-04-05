var isDebug = true;
function log(s) {
    if (isDebug)
        console.log(s);
}

var Simplenote = {
  root: "https://simple-note.appspot.com/api/",
  isLoggedIn: false,
  login: function(email, password) {    
    if (email == Simplenote.email && Simplenote.isLoggedIn) {
        if (typeof Simplenote.onLogin === "function")
            Simplenote.onLogin();
        return;
    }
    
    Simplenote.email = email;        
    jQuery.ajax({
      type: "POST",
      url: Simplenote.root + "login",
      data: Base64.encode("email=" + email + "&password=" + password),
      dataType: "text",
      success: function (response) {
        log("Simplenote::login success");
        Simplenote.isLoggedIn = true;
        if (typeof Simplenote.onLogin === "function") {
          Simplenote.onLogin();
        }
      },
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        if (typeof Simplenote.onLoginError === "function") {
          Simplenote.onLoginError(textStatus);
        }
      }
    });
  },
  index: function(callback) {
    jQuery.ajax({
      url: Simplenote.root + "index",
      dataType: "json",
      success: function(data) {
        log("Simplenote::index success");
        //log(data);
        callback(data);
      }
    });
  },
  search: function(query, callback) {
    jQuery.ajax({
      url: Simplenote.root + "search?query=" + escape(query),
      dataType: "json",
      success: function(data) {
        log("Simplenote::search " + query + " success");
        //log(data);
        callback(data['Response']['Results']);
      }
    });
  },
  note: function(key, callback) {
    jQuery.ajax({
      url: Simplenote.root + "note?key=" + key,
      dataType: "text",
      success: function(data) {
        //log(key+"::fetched");
        //log(data);
        callback(data);
      },
      complete: function(jqXHR, textStatus) {
        //log("::note complete");
        //log(jqXHR);
        //log(jqXHR.getAllResponseHeaders());
        //log(textStatus);
      }
    });
  },
  destroy: function(key, callback) {
    jQuery.ajax({
      url: Simplenote.root + "delete?key=" + key,
      success: function () {
        log("Simplenote::destroy success");   
        callback();
      }
    });
  },
  update: function(key, data, callback) {
    var url = Simplenote.root + "note";
    if (key) { url += "?key=" + key; }
    jQuery.ajax({
      type: "POST",
      url: url,
      data: Base64.encode(data),
      success: function(newkey) {
        log("Simplenote::update success");     
        callback(newkey);
      }
    });
  },
  create: function(data, callback) {
    var url = Simplenote.root + "note";
    jQuery.ajax({
      type: "POST",
      url: url,
      data: Base64.encode(data),
      success: function(newkey) {
        log("Simplenote::create success"); 
        callback(newkey);
      }
    });
  }
};

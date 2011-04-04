var isDebug = true;
var Simplenote = {
  root: "https://simple-note.appspot.com/api/",
  isLoggedIn: false,
  login: function(email, password) {
    Simplenote.email = email;
    jQuery.ajax({
      type: "POST",
      url: Simplenote.root + "login",
      data: Base64.encode("email=" + email + "&password=" + password),
      dataType: "text",
      success: function (response) {
        debug("::logged in");
        SimpleNote.isLoggedIn = true;
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
        debug("::index fetched");
        //debug(data);
        callback(data);
      }
    });
  },
  search: function(query, callback) {
    jQuery.ajax({
      url: Simplenote.root + "search?query=" + escape(query),
      dataType: "json",
      success: function(data) {
        debug(query+"::searched");
        //debug(data);
        callback(data['Response']['Results']);
      }
    });
  },
  note: function(key, callback) {
    jQuery.ajax({
      url: Simplenote.root + "note?key=" + key,
      dataType: "text",
      success: function(data) {
        //debug(key+"::fetched");
        //debug(data);
        callback(data);
      },
      complete: function(jqXHR, textStatus) {
        //debug("::note complete");
        //debug(jqXHR);
        //debug(jqXHR.getAllResponseHeaders());
        //debug(textStatus);
      }
    });
  },
  destroy: function(key, callback) {
    jQuery.ajax({
      url: Simplenote.root + "delete?key=" + key,
      success: function () {
        debug(key+"::deleted");      
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
        debug(newkey+"::updated");      
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
        debug(newkey+"::created");
        callback(newkey);
      }
    });
  }
};

function debug(s) {
    if (isDebug)
        console.log(s);
}

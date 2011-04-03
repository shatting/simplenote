var Simplenote = {
  root: "https://simple-note.appspot.com/api/",
  login: function(email, password) {
    Simplenote.email = email;
    jQuery.ajax({
      type: "POST",
      url: Simplenote.root + "login",
      data: Base64.encode("email=" + email + "&password=" + password),
      dataType: "text",
      success: function (response) {
        //console.log("login response:\n" + response);
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
        //console.log("::index retrieved");
        //console.log(data);
        callback(data);
      }
    });
  },
  search: function(query, callback) {
    jQuery.ajax({
      url: Simplenote.root + "search?query=" + escape(query),
      dataType: "json",
      success: function(data) {
        //console.log("::search retrieved");
        //console.log(data);
        callback(data['Response']['Results']);
      }
    });
  },
  note: function(key, callback) {
    jQuery.ajax({
      url: Simplenote.root + "note?key=" + key,
      dataType: "text",
      success: function(data) {
        //console.log(key+"::note retrieved");
        //console.log(data);
        callback(data);
      },
      complete: function(jqXHR, textStatus) {
        //console.log("::note complete");
        //console.log(jqXHR);
        //console.log(jqXHR.getAllResponseHeaders());
        //console.log(textStatus);
      }
    });
  },
  destroy: function(key, callback) {
    jQuery.ajax({
      url: Simplenote.root + "delete?key=" + key,
      success: function () {
        //console.log(key+"::note destroyed");
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
        //console.log(key+"::note updated");
        //console.log(newkey);
        //if (newkey!=key)
        //    console.error("new and old keys dont match!");
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
        //console.log(newkey+"::note created");
        callback(newkey);
      }
    });
  }
};

var isDebug = true;
function log(s) {
    if (isDebug)
        console.log(s);
}

var Simplenote = {
  
    root: "https://simple-note.appspot.com/api/",
    
    isLoggedIn: function(email) {
        if (email != Simplenote.email)
            return false;
            
        var now = new Date();
        var diff = (now-Simplenote.tokenAquiredTime)/(1000*60*60);
        
        if (Simplenote.token && diff<24)
            return diff;
        else
            return false;
    },
    
    authURLadd : function() {
        return "?email=" + escape(Simplenote.email) + "&auth=" + Simplenote.token;
    },
  
    //https://simple+note.appspot.com/api/login
    //The body of the request should contain:
    //email=[email4address]&password=[password]
    //The entire request body should be encoded in base64
    login: function(email, password, callbacks) {    
        var loggedIn = Simplenote.isLoggedIn(email);
        
        if (loggedIn) {
            log("Simplenote::already logged in " + Math.round(loggedIn*60)+ " mins ago, calling success()");
            if (callbacks.success)
                callbacks.success();
            return;
        }
        
        Simplenote.email = email;
            
        jQuery.ajax({
          type: "POST",
          url: Simplenote.root + "login",
          data: Base64.encode("email=" + email + "&password=" + password),
          dataType: "text",
          success: function (response) {
            log("Simplenote::login success, token:" + response);
            
            Simplenote.token = response;
            Simplenote.tokenAquiredTime = new Date();
            
            if (callbacks.success)
                callbacks.success();
          },
          error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (callbacks.error)
                callbacks.error();
          }
        });
    },
    // https://simple+note.appspot.com/api/index?auth=[auth_token]&email=[email]      
    //    401 - User invalid, either authorization key expired or user incorrect, retry login
    //    Any other error, retry
    index: function(callbacks) {
        jQuery.ajax({
          url: Simplenote.root + "index" + Simplenote.authURLadd(),
          dataType: "json",
          complete: function(jqXHR, textStatus) {
             log("Simplenote::index=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:
                    // data[] : deleted: bool
                    //          key: string
                    //          modify: "2011-04-05 21:45:13.205000"
                    if (callbacks.success)
                        callbacks.success(jQuery.parseJSON(jqXHR.responseText));
                    break;
                 case 401:
                    if (callbacks.loginInvalid)
                        callbacks.loginInvalid();
                    break;
                 default:
                    if (callbacks.repeat)
                        callbacks.repeat(callbacks);
             }  
          }      
        });
    },
    // https://simple+note.appspot.com/api/note?key=[note_id]&auth=[auth_token]&email=[email]&encode=base64
    //    401 - User invalid, either authorization key expired or user incorrect, retry login
    //    404 - Note does not exist, do not retry
    //    Any other error, retry
    // response headers
    //  date: Wed, 06 Apr 2011 10:57:56 GMT
    //  content-encoding: gzip
    //  note-createdate: 2011-04-03 15:28:28.552358
    //  status: 200 OK
    //  note-key: agtzaW1wbGUtbm90ZXINCxIETm90ZRi1xMEHDA
    //  cache-control: no-cache
    //  content-length: 67
    //  expires: Fri, 01 Jan 1990 00:00:00 GMT
    //  note-modifydate: 2011-04-03 23:28:37.234516
    //  server: Google Frontend
    //  content-type: text/html; charset=utf-8
    //  note-screatedate: 1301844508.552358
    //  note-deleted: False
    //  note-smodifydate: 1301873317.234516
    //  version: HTTP/1.1
    note: function(key, callbacks) {
        jQuery.ajax({
          url: Simplenote.root + "note" + Simplenote.authURLadd() + "&encode=base64&key=" + key,
          dataType: "text",
          complete: function(jqXHR, textStatus) {
             log("Simplenote::note=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:                 
                    var note = {
                            key:        jqXHR.getResponseHeader("note-key"),
                            text:       Base64.decode(jqXHR.responseText),
                            create:     jqXHR.getResponseHeader("note-createdate"),                            
                            modify:     jqXHR.getResponseHeader("note-modifydate"),
                            deleted:    (/^true$/i).test(jqXHR.getResponseHeader("deleted"))
                        }
                    
                    if (callbacks.success)
                        callbacks.success(note);
                    break;
                 case 401:
                    if (callbacks.loginInvalid)
                        callbacks.loginInvalid();
                    break;
                 case 404:
                    if (callbacks.noteNotExist)
                        callbacks.noteNotExist();
                    break;                    
                 default:
                    if (callbacks.repeat)
                        callbacks.repeat(key,callbacks);
             }  
           }
        });
    },
    // https://simple+note.appspot.com/api/search?query=[search_term]&results=[max_results]&offset=[offset_index]&auth=[auth_token]&email=[email]
    search: function(query, callbacks, options) {
        var optionsStr = "";
        if (options && options.results)
            add += "&results="+options.results;
        if (options && options.offset)
            add += "&offset="+options.results;
        
        jQuery.ajax({
          url: Simplenote.root + "search" + Simplenote.authURLadd() + "&query=" + escape(query) + optionsStr,
          dataType: "json",
          complete: function(jqXHR, textStatus) {
                 log("Simplenote::search=" + textStatus);
                 switch (jqXHR.status)
                 {
                     case 200:
                        var data = jQuery.parseJSON(jqXHR.responseText);
                        if (callbacks.success)
                            callbacks.success(data['Response']['Results']);
                        break;
                     case 401:
                        if (callbacks.loginInvalid)
                            callbacks.loginInvalid();
                        break;                     
                     default:
                        if (callbacks.repeat)
                            callbacks.repeat(query,callbacks);
                 }  
              }        
        });
    },    
    //https://simple-note.appspot.com/api/delete?key=[note_id]&auth=[auth_token]&email=[email]&dead=1
    //401 - User invalid, either authorization key expired or user incorrect, retry login
    //404 - Note does not exist, do not retry
    //Any other error, retry
    destroy: function(key, callbacks, permanently) {
        jQuery.ajax({
          url: Simplenote.root + "delete" + Simplenote.authURLadd() + "&key=" + key + (permanently?"&dead=1":""),
          complete: function(jqXHR, textStatus) {
             log("Simplenote::destroy=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:                    
                    if (callbacks.success)
                        callbacks.success(jqXHR.responseText); // key
                    break;
                 case 401:
                    if (callbacks.loginInvalid)
                        callbacks.loginInvalid();
                    break;
                 case 404:
                    if (callbacks.noteNotExist)
                        callbacks.noteNotExist();                      
                 default:
                    if (callbacks.repeat)
                        callbacks.repeat(callbacks, permanently);
             }  
          }  
        });
    },
    // https://simple-note.appspot.com/api/note?key=[note_id]&auth=[auth_token]&email=[email]&modify=[modified_date]
    // 
    update: function(key, data, callbacks) {        
        jQuery.ajax({
          type: "POST",
          url: Simplenote.root + "note" + Simplenote.authURLadd() + "&key=" + key,
          data: Base64.encode(data),
          complete: function(jqXHR, textStatus) {
             log("Simplenote::update=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:                    
                    if (callbacks.success)
                        callbacks.success(jqXHR.responseText); // key
                    break;
                 case 401:
                    if (callbacks.loginInvalid)
                        callbacks.loginInvalid();
                    break;
                 case 404:
                    if (callbacks.noteNotExist)
                        callbacks.noteNotExist();                      
                 default:
                    if (callbacks.repeat)
                        callbacks.repeat(key, data, callbacks);
             }  
          }  
        });
    },
    // https://simple-note.appspot.com/api/note?auth=[auth_token]&email=[email]&create=[create_date]
    create: function(data, callbacks) {
        jQuery.ajax({
          type: "POST",
          url: Simplenote.root + "note" + Simplenote.authURLadd(),
          data: Base64.encode(data),
          complete: function(jqXHR, textStatus) {
             log("Simplenote::create=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:                    
                    if (callbacks.success)
                        callbacks.success(jqXHR.responseText); // key
                    break;
                 case 401:
                    if (callbacks.loginInvalid)
                        callbacks.loginInvalid();
                    break;
                 case 404:
                    if (callbacks.noteNotExist)
                        callbacks.noteNotExist();                      
                 default:
                    if (callbacks.repeat)
                        callbacks.repeat(data, callbacks);
             }  
          } 
        });
    }
};

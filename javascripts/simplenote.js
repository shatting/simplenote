// ------------------------------------------------------------------------------------------------
// API2
// ------------------------------------------------------------------------------------------------
function isTokenValid(credentials) {
    if (!credentials.token)
        return false;
        
    var now = new Date();
    var diff = (now-credentials.tokenTime)/(1000*60*60);
    
    if (diff<24)
        return diff;
    else
        return false;    
}

var SimplenoteAPI2 = {
    
    isDebug : true,
    
    log : function(s) {
        if (!this.isDebug) return;
        
        if (typeof s == "string")
            console.log("SimplenoteAPI2::" + s);
        else
            console.log(s);
    },
    
    // kept for login
    root: "https://simple-note.appspot.com/api/",
    
    root2: "https://simple-note.appspot.com/api2/",    
    
    authURLadd : function() {
        return "?email=" + escape(this.credentials.email) + "&auth=" + this.credentials.token;
    },
    
    //https://simple+note.appspot.com/api/login
    login: function(credentials, callbacks) {
        if (!callbacks) callbacks = {};        
        
        // A. this has no credentials
        //      A1. no argument credentials supplied
        //          --> cannot login
        //      A2. argument credentials supplied        
        //          A21. arg cred have valid token
        //              --> use arg cred token, save to this
        //          A22. arg cred have no/invalid token
        //              --> get new token
        // B. this has credentials
        //      B0. no arg cred
        //          --> check this.cred or get new ones
        //      B1. emails match
        //          B11. arg has no token
        //              --> use this.cred
        //          B12. arg has token
        //              --> use most recent valid creds
        //      B2. emails dont match
        //          --> get new token 
        var haveToken;        
        // precond: this.credentials either full set (email+pass+token) or undefined        
        if (!this.credentials) { //A
            if (!credentials) //A1
                throw "email and (password or token) required for login";
                        
            haveToken = isTokenValid(credentials);
            this.credentials = credentials; //A21&A22(save email+password to this, rest is overwritten)
        } else { //B
            if (!credentials) //B0
                haveToken = isTokenValid(this.credentials);
            else if (this.credentials.email == credentials.email) { //B1
                if (!credentials.token) //B11
                    haveToken = isTokenValid(this.credentials);
                else { //B12
                    var argHaveToken = isTokenValid(credentials);
                    var thisHaveToken = isTokenValid(this.credentials);
                    if (argHaveToken && thisHaveToken)
                        if (argHaveToken<thisHaveToken) {
                            haveToken = argHaveToken;
                            this.credentials = credentials;
                        } else
                            haveToken = thisHaveToken;
                    else if (argHaveToken)
                        haveToken = argHaveToken;
                    else
                        haveToken = thisHaveToken;                        
                }              
            } else {//B2
                this.credentials = credentials; // save email+password
            }
        }
        // postcond: this.credentials have (email,password) and (valid token iff haveToken)
                   
        if (haveToken) {
            this.log("already logged in " + Math.round(haveToken*60)+ " mins ago, calling success()");
            if (callbacks.success)
                callbacks.success();
            return;
        }        
            
        jQuery.ajax({
          type: "POST",
          url: this.root + "login",
          data: Base64.encode("email=" + this.credentials.email + "&password=" + this.credentials.password),
          dataType: "text",
          success: function (response) {
            SimplenoteAPI2.log("login success, token:" + response);
            
            SimplenoteAPI2.credentials.token = response;
            SimplenoteAPI2.credentials.tokenTime = new Date();
            // this.credentials full valid set
            
            if (callbacks.success)
                callbacks.success(SimplenoteAPI2.credentials);
          },
          error: function (XMLHttpRequest, textStatus, errorThrown) {
            SimplenoteAPI2.credentials = undefined;
            if (callbacks.error)
                callbacks.error();
          }
        });
    },
    // https://simple+note.appspot.com/api2/index?length=[number_of_notes]&mark=[bookmark_key]&since=[time_value]&auth=[auth_token]&email=[email]
    //    401 - User invalid, either authorization key expired or user incorrect, retry login
    //    Any other error, retry
    // API2
    //    data: Array[1]
    //      0: Object
    //          createdate: "1301873065.024653"
    //          deleted: 0
    //          key: "agtzaW1wbGUtbm90ZXINCxIETm90ZRjWtbQHDA"
    //          minversion: 52
    //          modifydate: "1302141103.242000"
    //          syncnum: 66
    //          systemtags: Array[1]
    //          0: "pinned"
    //          length: 1
    //          tags: Array[1]
    //              0: "ideen"
    //              length: 1
    //          version: 62
    //    mark: "agtzaW1wbGUtbm90ZXINCxIETm90ZRjQpNQHDA"
    //    time: "1302185274.056466"
    // API2
    index: function(options,callbacks) {
        if (!callbacks) callbacks = {};
        if (!options) options = {};
        var url = this.root2 + "index" + this.authURLadd();
        
        if (options.length) url+="&length=" + options.length;
        if (options.mark) url+="&mark=" + options.mark;
        if (options.since) url+="&since=" + options.since;
        
        jQuery.ajax({
          url: url,
          dataType: "json",
          complete: function(jqXHR, textStatus) {
             SimplenoteAPI2.log("index=" + textStatus);
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
    //https://simple-note.appspot.com/api2/data/[note_key]?auth=[auth_token]&email=[email]
    //    401 - User invalid, either authorization key expired or user incorrect, retry login
    //    404 - Note does not exist, do not retry
    //    Any other error, retry
    // API2 
    retrieve: function(key, callbacks) {
        if (!callbacks) callbacks = {};
        if (!key) 
            throw "SimplenoteAPI2::retrieve:key missing.";
        
        jQuery.ajax({
          url: this.root2 + "data/" + key + this.authURLadd(),
          dataType: "json",
          complete: function(jqXHR, textStatus) {
             SimplenoteAPI2.log("retrieve=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:                                     
                    if (callbacks.success)
                        callbacks.success(jQuery.parseJSON(jqXHR.responseText));
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
    // API1
    search: function(query, callbacks, options) {
        if (!callbacks) callbacks = {};
        var optionsStr = "";
        if (options && options.results)
            add += "&results="+options.results;
        if (options && options.offset)
            add += "&offset="+options.results;
        
        jQuery.ajax({
          url: this.root + "search" + this.authURLadd() + "&query=" + escape(query) + optionsStr,
          dataType: "json",
          complete: function(jqXHR, textStatus) {
                 SimplenoteAPI2.log("search=" + textStatus);
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
    // https://simple+note.appspot.com/api2/data/[note4key]?auth=[auth4token]&email=[email
    // 401 - User invalid, either authorization key expired or user incorrect, retry login
    // 404 - Note does not exist, do not retry
    // Any other error, retry
    // API2
    delete: function(note, callbacks) {
        if (!callbacks) callbacks = {};
        if (!note || !note.key) 
            throw "SimplenoteAPI2::delete:note or note.key missing.";
            
        jQuery.ajax({
          type: "DELETE",
          url: this.root2 + "data/" + key + this.authURLadd(),
          complete: function(jqXHR, textStatus) {
             SimplenoteAPI2.log("delete=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:                    
                    if (callbacks.success)
                        callbacks.success(jqXHR.responseText);
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
                        callbacks.repeat(callbacks, permanently);
             }  
          }  
        });
    },    
    //
    //  https://simple+note.appspot.com/api2/data/[note4key]?auth=[auth4token]&email=[email]
    // API2
    update: function(note, callbacks) {        
        if (!callbacks) callbacks = {};
        if (!note || !(note.content || note.deleted==1) || !note.key) 
            throw "SimplenoteAPI2::update:(note.content or note.deleted) or note.key missing.";
            
        jQuery.ajax({
          type: "POST",
          url: this.root2 + "data/" + note.key + this.authURLadd(),
          data: encodeURIComponent(JSON.stringify(note)),
          complete: function(jqXHR, textStatus) {
             SimplenoteAPI2.log("update=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:                    
                    if (callbacks.success)
                        callbacks.success(JSON.parse(jqXHR.responseText));
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
                        callbacks.repeat(note, callbacks);
             }  
          }  
        });
    },
    // https://simple+note.appspot.com/api2/data?auth=[auth_token]&email=[email]
    // API2
    create: function(note, callbacks) {
        if (!callbacks) callbacks = {};
        
        if (!note || !note.content) 
            throw "SimplenoteAPI2::create:note.content missing.";
        
        jQuery.ajax({
          type: "POST",
          
          url: this.root2 + "data" + this.authURLadd(),
          
          data: encodeURIComponent(JSON.stringify(note)),
          
          complete: function(jqXHR, textStatus) {
             SimplenoteAPI2.log("create=" + textStatus);
             switch (jqXHR.status)
             {
                 case 200:                    
                    if (callbacks.success)
                        callbacks.success(JSON.parse(jqXHR.responseText));
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
                        callbacks.repeat(note, callbacks);
             }
          }
        });
    }
};

//var indexdata, notedata;
//function test(text) {
//    SimplenoteAPI2.create({content:text},function(note) {
//        note.content = text+text;
//        testUpdate(note, function(note) {
//            testIndex(function(index) {
//                if (index.data[0].key != note.key)
//                    throw "pinned notes or error, keys dont match";            
//                note.deleted = 1;
//                testUpdate(note, function (note) {
//                    testDelete(note,function() {
//                        testIndex(function(index) {
//                            if (index.data[0].key == note.key)
//                                throw "error, note note deleted";                                        
//                        });
//                    });
//                });
//            });
//        });
//    });
//}

//function testIndex(next) {
//    SimplenoteAPI2.login(localStorage.email,localStorage.password, { success: function() {
//        SimplenoteAPI2.index({length:1},{success : function(data) {
//            indexdata = data;
//            console.log(data);
//            if (next) next(data);
//        }});
//    }});
//}

//function testCreate(text, next) {
//    SimplenoteAPI2.login(localStorage.email,localStorage.password, { success: function() {
//        SimplenoteAPI2.create({content:text}, {success: function(data) {
//            notedata=data;
//            console.log(data);
//            if (next) next(data);            
//        }});            
//    }});
//}

//function testUpdate(key,text, next) {
//     SimplenoteAPI2.login(localStorage.email,localStorage.password, { success: function() {
//        SimplenoteAPI2.update({key:key, content:text}, {success: function(data) {
//            notedata=data;
//            console.log(data);
//            if (next) next(data);            
//        }});
//    }});
//}

//function testDelete(key,text, next) {
//     SimplenoteAPI2.login(localStorage.email,localStorage.password, { success: function() {
//        SimplenoteAPI2.delete({key:key}, {success: function(data) {
//            notedata=data;
//            console.log(data);
//            if (next) next(data);            
//        }});
//    }});
//}

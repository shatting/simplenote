// ------------------------------------------------------------------------------------------------
// Simplenote API2 js implementation.
// ------------------------------------------------------------------------------------------------
var emulateOffline = false;
//var emulateSloppy = false; // sloppy connection

/*
 * returns true iff there is a credentials.token and credentials.tokenTime not older than 24hrs
 */
function isTokenValid(credentials) {
    if (!credentials.token)
        return false;

    var diff = ((new Date())-credentials.tokenTime)/(1000*60*60);

    if (diff<12)
        return diff;
    else
        return false;
}

$.ajaxSetup({
  timeout: emulateOffline?1:5000
});

var SimplenoteAPI2 = {

    log : function(s) {
        if (extData.debugFlags.API)
            logGeneral(s,"SimplenoteAPI2");
    },

    /*
     *  API1 root, needed for login
     **/
    root: "https://simple-note.appspot.com/api/",

    /*
     *  API2 root
     **/
    root2: "https://simple-note.appspot.com/api2/",

    /*
     *  returns the authentification part of all request urls:
     *      ?email=[email]&token=[token]
     *  @throws exception if not logged in or token expired
     */
    authURLadd : function() {      
        return "";
        if (!this.isLoggedIn()) {
            throw new Error("not logged in or token expired");            
        }
        return "?email=" + escape(this.credentials.email) + "&auth=" + this.credentials.token;
    },
    /*
     *  log the SimplenoteAPI2 object in with the server<br>
     *
     *   A. this has no credentials
     *         A1. no argument credentials supplied
     *             --> cannot login
     *         A2. argument credentials supplied
     *             A21. arg cred have valid token
     *                 --> use arg cred token, save to this
     *             A22. arg cred have no/invalid token
     *                 --> get new token
     *    B. this has credentials
     *         B0. no arg cred
     *             --> check this.cred or get new ones
     *         B1. emails match
     *             B11. arg has no token
     *                 --> use this.cred
     *             B12. arg has token
     *                 --> use most recent valid creds
     *         B2. emails dont match
     *             B21. arg has no token
     *                 --> get new token with arg email
     *             B22. arg has token
     *                 --> use it
     *
     * @param credentials either {.email,.password} or {.email,.password,.token,tokenTime}
     * @param callbacks.success(credentials) (optional) called after successful login
     * @param callbacks.timeout (optional) timeout logging in
     * @param callbacks.loginInvalid (optional)
     */
    login: function(credentials, callbacks) {
        if (!callbacks) callbacks = {};

        var haveToken;
        
        if (credentials == "webapp") {
            this.log("using webapp login, trying index()");
            this.index({length:10},{
                success : function() {
                    if (callbacks.success)
                        callbacks.success();
                },                  
                loginInvalid: function() {
                    if (callbacks.loginInvalid)
                        callbacks.loginInvalid();
                },
                timeout : function() {
                    if (callbacks.timeout)
                        callbacks.timeout();
                },
                repeat : function() {
                    if (callbacks.timeout)
                        callbacks.timeout();
                }                    
            });
            
            return;
        }
            
        
        // precond: this.credentials either full set (email+pass+token) or undefined
        if (!this.credentials) { //A
            if (!credentials) //A1
                throw new Error("email and (password or token) required for login");
            haveToken = isTokenValid(credentials);
            this.credentials = credentials; //A21&A22(save email+password to this, rest is overwritten)
        } else { //B
            if (!credentials) //B0
                haveToken = isTokenValid(this.credentials);
            else if (this.credentials.email == credentials.email && this.credentials.password == credentials.password) { //B1
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
                    else if (argHaveToken) {
                        haveToken = argHaveToken;
                        this.credentials = credentials;
                    } else
                        haveToken = thisHaveToken;
                }
            } else {//B2
                haveToken = isTokenValid(credentials);
                this.credentials = credentials; // save email+password, poss token too
            }
        }
        // postcond: this.credentials have (email,password) and (valid token iff haveToken)

        if (haveToken) {
            this.log("already logged in " + Math.round(haveToken*60)+ " mins ago, calling success()");
            if (callbacks.success)
                callbacks.success();
            return;
        }

        var that = this;

        jQuery.ajax({
            type: "POST",
            url: this.root + "login",
            data: Base64.encode("email=" + this.credentials.email + "&password=" + this.credentials.password),
            dataType: "text",
            success: function (response) {
                that.log("login success, new token:" + response);

                that.credentials.token = response;
                that.credentials.tokenTime = new Date();
                // this.credentials full valid set now
                 
                // set the browser user
                that.setUser(credentials.email,credentials.password, callbacks.success);
                                
            },
            error: function (jqXHR, textStatus, errorThrown) {
                that.log("index::status=" + textStatus + "(" + jqXHR.status + ")");
                that.credentials = undefined;
                switch(jqXHR.status) {
                    case 0:
                        if (callbacks.timeout)
                            callbacks.timeout();
                        break;
                    default:
                        if (callbacks.loginInvalid)
                            callbacks.loginInvalid();
                }
            }
        });
    },

    /*
     *  checks for valid token and whether optional supplied email matches
     *  @param email (optional)
     *  @return true iff token valid and optional email matches
     */
    isLoggedIn : function(email) {
        if (!this.credentials || !isTokenValid(this.credentials))
            return false;

        if (email && (this.credentials.email != email))
            return false;

        return true;
    },

    resetCredentials : function() {
        delete this.credentials;
    },
    /**
     * gets note index from server
     *
     * @param options.length    (optional) maximum number of notes to return (<=100 serverside)<br>
     * @param options.mark     (optional) marked message key<br>
     * @param options.since     (optional) get only new/changed since (in seconds from epoch) <br>
     * @param callbacks.success(data) (optional) callback on success, where
     *  <code>
     *  data: Array[1]
     *      0: Object
     *          createdate: "1301873065.024653"
     *          deleted: 0
     *          key: "..."
     *          minversion: 52
     *          modifydate: "1302141103.242000"
     *          syncnum: 66
     *          systemtags: Array[1]
     *              0: "pinned"
     *              length: 1
     *          tags: Array[1]
     *              0: "tag"
     *              length: 1
     *          version: 62
     * mark: "agtzaW1wbGUtbm90ZXINCxIETm90ZRjQpNQHDA"
     * time: "1302185274.056466"
     * </code><br>
     * @param callbacks.timeout(options) called after timeout
     * @param callbacks.loginInvalid() (optional) User invalid, either authorization key expired or user incorrect, retry login<br>
     * @param callbacks.repeat(options,callbacks) (optional) Any other error, retry<br>
     *
     */
    index: function(options,callbacks) {
        if (!callbacks) callbacks = {};
        if (!options) options = {};
        var url = this.root2 + "index" + this.authURLadd();
        var urloptions = this.authURLadd()?this.authURLadd():"?";
        if (options.length) urloptions+="&length=" + options.length;
        if (options.mark) urloptions+="&mark=" + options.mark;
        if (options.since) urloptions+="&since=" + options.since;
        this.log("index::options: " + urloptions);
        jQuery.ajax({
            url: url + urloptions,
            dataType: "json",
            //timeout: 3000,
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("index::status=" + textStatus + "(" + jqXHR.status + ")");
                switch (jqXHR.status) {
                    case 200:
                        if (callbacks.success)
                            callbacks.success(jQuery.parseJSON(jqXHR.responseText));
                        break;
                    case 401:
                        if (callbacks.loginInvalid)
                            callbacks.loginInvalid();
                        break;
                    case 0:
                        if (callbacks.timeout)
                            callbacks.timeout();
                        break;
                    default:
                        if (callbacks.repeat)
                            callbacks.repeat(options,callbacks);
                }
            }
        });
    },
    /**
     * retrieves a note object from the server
     *
     * @param key the key string of the note to be retrieved
     * @param callbacks.success(noteObj) (optional) call after note successfully retrieved
     * @param callbacks.loginInvalid() (optional) User invalid, either authorization key expired or user incorrect, retry login
     * @param callbacks.noteNotExist() (optional) Note does not exist, do not retry
     * @param callbacks.repeat(key,callbacks) (optional) Any other error, retry
     */
    retrieve: function(key, callbacks) {
        if (!callbacks) callbacks = {};
        if (!key)
            throw new Error("key missing");
        jQuery.ajax({
            url: this.root2 + "data/" + key + this.authURLadd(),
            dataType: "json",
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("retrieve::status=" + textStatus);
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
                            callbacks.noteNotExist(key);
                        break;
                    case 0:
                        if (callbacks.timeout)
                            callbacks.timeout(key);
                        break;
                    default:
                        if (callbacks.repeat)
                            callbacks.repeat(key,callbacks);
                }
            }
        });
    },
    /**
     * API1 version of note search
     *
     * @param query the string to be found
     * @param callbacks.success(resultsArray) (optional) called after successful search
     * @param callbacks.loginInvalid() (optional) User invalid, either authorization key expired or user incorrect, retry login
     * @param callbacks.repeat(query,callbacks,options) (optional) Any other error, retry
     * @param options.results (optional) max results to be returned
     * @param options.offset (optional) offset index (use in combination with max results for pagination)
     */
//    search: function(query, callbacks, options) {
//        if (!callbacks) callbacks = {};
//        var optionsStr = "";
//        if (options && options.results)
//            optionsStr += "&results="+options.results;
//        if (options && options.offset)
//            optionsStr += "&offset="+options.results;
//
//        jQuery.ajax({
//            url: this.root + "search" + this.authURLadd() + "&query=" + escape(query) + optionsStr,
//            dataType: "json",
//            complete: function(jqXHR, textStatus) {
//                SimplenoteAPI2.log("search status=" + textStatus);
//                switch (jqXHR.status)
//                {
//                    case 200:
//                        var data = jQuery.parseJSON(jqXHR.responseText);
//                        if (callbacks.success)
//                            callbacks.success(data['Response']['Results']);
//                        break;
//                    case 401:
//                        if (callbacks.loginInvalid)
//                            callbacks.loginInvalid();
//                        break;
//                    case 0:
//                        if (callbacks.timeout)
//                            callbacks.timeout(options);
//                        break;
//                    default:
//                        if (callbacks.repeat)
//                            callbacks.repeat(query,callbacks,options);
//                }
//            }
//        });
//    },
    /**
     * permanently deletes a note from the server. note.deleted must be set to 1 for this to succeed.
     *
     * @param key the key string of the note to be deleted
     * @param callbacks.success(noteObj) (optional) call after note successfully retrieved
     * @param callbacks.loginInvalid() (optional) User invalid, either authorization key expired or user incorrect, retry login
     * @param callbacks.noteNotExist() (optional) Note does not exist, do not retry
     * @param callbacks.repeat(key,callbacks) (optional) Any other error, retry
     */
    destroy: function(key, callbacks) {
        if (!callbacks)
            callbacks = {};
        if (!key)
            throw new Error("key missing");

        jQuery.ajax({
            type: "DELETE",
            url: this.root2 + "data/" + key + this.authURLadd(),
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("destroy status=" + textStatus);
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
                    case 0:
                        if (callbacks.timeout)
                            callbacks.timeout(key);
                        break;
                    default:
                        if (callbacks.repeat)
                            callbacks.repeat(callbacks);
                }
            }
        });
    },
    /**
     * updates a note on the server.
     *
     * @param note note object to be updated
     * @param callbacks.success(noteObj) (optional) called after note successfully opdated. updated note is passed back.
     * @param callbacks.loginInvalid() (optional) User invalid, either authorization key expired or user incorrect, retry login
     * @param callbacks.noteNotExist() (optional) Note does not exist, do not retry
     * @param callbacks.repeat(key,callbacks) (optional) Any other error, retry
     */
    update: function(note, callbacks) {
        if (!callbacks) callbacks = {};
        if (!note || !note.key) {
            console.log(note);
            throw new Error("note or note.key missing");
        }
        jQuery.ajax({
            type: "POST",
            url: this.root2 + "data/" + note.key + this.authURLadd(),
            data: encodeURIComponent(JSON.stringify(note)),
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("update status=" + textStatus);
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
                    case 0:
                        if (callbacks.timeout)
                            callbacks.timeout(note);
                        break;
                    default:
                        if (callbacks.repeat)
                            callbacks.repeat(note, callbacks);
                }
            }
        });
    },
    /**
     * creates a note on the server.
     *
     * @param note note object to be created
     * @param callbacks.success(noteObj) (optional) called after note successfully created. created note is passed back.
     * @param callbacks.loginInvalid() (optional) User invalid, either authorization key expired or user incorrect, retry login
     * @param callbacks.repeat(note,callbacks) (optional) Any other error, retry
     */
    create: function(note, callbacks) {
        if (!callbacks) callbacks = {};

        if (!note || !note.content)
            throw new Error("note or note.content missing");

        jQuery.ajax({
            type: "POST",

            url: this.root2 + "data" + this.authURLadd(),

            data: encodeURIComponent(JSON.stringify(note)),

            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("create status=" + textStatus);
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
                    case 0:
                        if (callbacks.timeout)
                            callbacks.timeout(note);
                        break;
                    default:
                        if (callbacks.repeat)
                            callbacks.repeat(note, callbacks);
                }
            }
        });
    },

    tagCreate: function(tag, callbacks) {
        if (!callbacks) callbacks = {};

        if (!tag || !tag.name)
            throw new Error("tag or tag.name missing");

        if (!tag.index)
            tag.index = -1;
        if (!tag.version)
            tag.version = 0;

        (function(thistag) {
            jQuery.ajax({
                type: "POST",

                url: SimplenoteAPI2.root2 + "tags" + SimplenoteAPI2.authURLadd(),

                data: encodeURIComponent(JSON.stringify(thistag)),

                complete: function(jqXHR, textStatus) {
                    SimplenoteAPI2.log("tagCreate status=" + textStatus);
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
                        case 0:
                            if (callbacks.timeout)
                                callbacks.timeout(thistag.name);
                            break;
                        default:
                            if (callbacks.repeat)
                                callbacks.repeat(thistag.name, callbacks);
                    }
                }
            });
        })(tag);
    },

    tagUpdate: function(tag, callbacks) {
        if (!callbacks) callbacks = {};

        if (!tag || !tag.name)
            throw new Error("tag or tag.name missing");

        (function(thistag) {
            jQuery.ajax({
                type: "POST",

                url: SimplenoteAPI2.root2 + "tags" + SimplenoteAPI2.authURLadd(),

                data: encodeURIComponent(JSON.stringify(thistag)),

                complete: function(jqXHR, textStatus) {
                    SimplenoteAPI2.log("tagUpdate status=" + textStatus);
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
                        case 0:
                            if (callbacks.timeout)
                                callbacks.timeout(thistag);
                            break;
                        default:
                            if (callbacks.repeat)
                                callbacks.repeat(thistag, callbacks);
                    }
                }
            });
        })(tag);
    },

    tagDelete: function(name, callbacks) {
        if (!callbacks)
            callbacks = {};
        if (!name)
            throw new Error("name missing");

        (function(thisname) {
            jQuery.ajax({
                type: "DELETE",
                url: SimplenoteAPI2.root2 + "tags/" + encodeURIComponent(thisname) + SimplenoteAPI2.authURLadd(),
                complete: function(jqXHR, textStatus) {
                    SimplenoteAPI2.log("deleteTag status=" + textStatus);
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
                        case 0:
                            if (callbacks.timeout)
                                callbacks.timeout(thisname);
                            break;
                        default:
                            if (callbacks.repeat)
                                callbacks.repeat(callbacks);
                    }
                }
            });
        })(name);
    },

    tagIndex: function(options,callbacks) {
        if (!callbacks) callbacks = {};
        if (!options) options = {};
        var url = this.root2 + "tags" + this.authURLadd();
        var urloptions = "";
        if (options.length) urloptions+="&length=" + options.length;
        this.log("tagIndex::options: " + urloptions);
        
        jQuery.ajax({
            url: url + urloptions,
            dataType: "json",
            beforeSend: function(jqXHR, settings) {
                console.log(jqXHR)
                console.log(settings)
            },
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("tagIndex::status=" + textStatus + "(" + jqXHR.status + ")");
                switch (jqXHR.status) {
                    case 200:
                        console.log(document.cookie);
                        if (callbacks.success)
                            callbacks.success(jQuery.parseJSON(jqXHR.responseText));
                        break;
                    case 401:
                        if (callbacks.loginInvalid)
                            callbacks.loginInvalid();
                        break;
                    case 0:
                        if (callbacks.timeout)
                            callbacks.timeout();
                        break;
                    default:
                        if (callbacks.repeat)
                            callbacks.repeat(options,callbacks);
                }
            }
        });
    },

    setUser : function(email,password,callback) {
        jQuery.ajax({
            url: "https://simple-note.appspot.com/user",            
            type: "POST",            
            data:  "email=" + email + "&password=" + password + "&remember=1",
            dataType: "text",
            complete: function(jqXHR, textStatus) {
                if (callback)
                    callback(SimplenoteAPI2.credentials);
            }
        });
    }
}


/**
 * Cookie plugin
 *
 * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

/**
 * Create a cookie with the given name and value and other optional parameters.
 *
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Set the value of a cookie.
 * @example $.cookie('the_cookie', 'the_value', { expires: 7, path: '/', domain: 'jquery.com', secure: true });
 * @desc Create a cookie with all available options.
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Create a session cookie.
 * @example $.cookie('the_cookie', null);
 * @desc Delete a cookie by passing null as value. Keep in mind that you have to use the same path and domain
 *       used when the cookie was set.
 *
 * @param String name The name of the cookie.
 * @param String value The value of the cookie.
 * @param Object options An object literal containing key/value pairs to provide optional cookie attributes.
 * @option Number|Date expires Either an integer specifying the expiration date from now on in days or a Date object.
 *                             If a negative value is specified (e.g. a date in the past), the cookie will be deleted.
 *                             If set to null or omitted, the cookie will be a session cookie and will not be retained
 *                             when the the browser exits.
 * @option String path The value of the path atribute of the cookie (default: path of page that created the cookie).
 * @option String domain The value of the domain attribute of the cookie (default: domain of page that created the cookie).
 * @option Boolean secure If true, the secure attribute of the cookie will be set and the cookie transmission will
 *                        require a secure protocol (like HTTPS).
 * @type undefined
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */

/**
 * Get the value of a cookie with the given name.
 *
 * @example $.cookie('the_cookie');
 * @desc Get the value of a cookie.
 *
 * @param String name The name of the cookie.
 * @return The value of the cookie.
 * @type String
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */
//jQuery.cookie = function(name, value, options) {
//    if (typeof value != 'undefined') { // name and value given, set cookie
//        options = options || {};
//        if (value === null) {
//            value = '';
//            options.expires = -1;
//        }
//        var expires = '';
//        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
//            var date;
//            if (typeof options.expires == 'number') {
//                date = new Date();
//                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
//            } else {
//                date = options.expires;
//            }
//            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
//        }
//        // CAUTION: Needed to parenthesize options.path and options.domain
//        // in the following expressions, otherwise they evaluate to undefined
//        // in the packed version for some reason...
//        var path = options.path ? '; path=' + (options.path) : '';
//        var domain = options.domain ? '; domain=' + (options.domain) : '';
//        var secure = options.secure ? '; secure' : '';
//        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
//    } else { // only name given, get cookie
//        var cookieValue = null;
//        if (document.cookie && document.cookie != '') {
//            var cookies = document.cookie.split(';');
//            for (var i = 0; i < cookies.length; i++) {
//                var cookie = jQuery.trim(cookies[i]);
//                // Does this cookie string begin with the name we want?
//                if (cookie.substring(0, name.length + 1) == (name + '=')) {
//                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//                    break;
//                }
//            }
//        }
//        return cookieValue;
//    }
//};
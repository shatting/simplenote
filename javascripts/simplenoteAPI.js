// ------------------------------------------------------------------------------------------------
// Simplenote API2 js implementation.
// ------------------------------------------------------------------------------------------------
var emulateOffline = false;

/*
 * returns true iff there is a credentials.token and credentials.tokenTime not older than 24hrs
 */
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

$.ajaxSetup({
  timeout: emulateOffline?1:5000
});

var SimplenoteAPI2 = {

    log : function(s) {
        if (debugFlags.API)
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
        if (!this.isLoggedIn())
            throw "not logged in or token expired"
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

                if (callbacks.success)
                    callbacks.success(SimplenoteAPI2.credentials);
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
        var urloptions = "";
        if (options.length) urloptions+="&length=" + options.length;
        if (options.mark) urloptions+="&mark=" + options.mark;
        if (options.since) urloptions+="&since=" + options.since;
        var that = this;
        this.log("index::options: " + urloptions);
        jQuery.ajax({
            url: url + urloptions,
            dataType: "json",
            //timeout: 3000,
            complete: function(jqXHR, textStatus) {
                that.log("index::status=" + textStatus + "(" + jqXHR.status + ")");
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
            throw "SimplenoteAPI2::retrieve:key missing.";
        jQuery.ajax({
            url: this.root2 + "data/" + key + this.authURLadd(),
            dataType: "json",
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("::retrieve:status=" + textStatus);
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
    search: function(query, callbacks, options) {
        if (!callbacks) callbacks = {};
        var optionsStr = "";
        if (options && options.results)
            optionsStr += "&results="+options.results;
        if (options && options.offset)
            optionsStr += "&offset="+options.results;

        jQuery.ajax({
            url: this.root + "search" + this.authURLadd() + "&query=" + escape(query) + optionsStr,
            dataType: "json",
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log(";;search status=" + textStatus);
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
                    case 0:
                        if (callbacks.timeout)
                            callbacks.timeout(options);
                        break;
                    default:
                        if (callbacks.repeat)
                            callbacks.repeat(query,callbacks,options);
                }
            }
        });
    },
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
            throw "SimplenoteAPI2::destroy:note key missing.";

        jQuery.ajax({
            type: "DELETE",
            url: this.root2 + "data/" + key + this.authURLadd(),
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("::destroy status=" + textStatus);
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
            throw "SimplenoteAPI2::update:note or note.content empty, or note.deleted or note.key missing.";
        }
        jQuery.ajax({
            type: "POST",
            url: this.root2 + "data/" + note.key + this.authURLadd(),
            data: encodeURIComponent(JSON.stringify(note)),
            complete: function(jqXHR, textStatus) {
                SimplenoteAPI2.log("::update status=" + textStatus);
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
     * @param callbacks.repeat(key,callbacks) (optional) Any other error, retry
     */
    create: function(note, callbacks) {
        if (!callbacks) callbacks = {};

        if (!note || !note.content)
            throw "SimplenoteAPI2::create:note or note.content missing.";

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
    }
}
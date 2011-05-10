// ------------------------------------------------------------------------------------------------
// Simplenote Database interface.
// ------------------------------------------------------------------------------------------------

var SimplenoteDB = {    
    offlineKey : "_offline",

    //cypherReg : /^\-\-SYNCPADAES\-\-\n(.*)\n\-\-SYNCPADAES\-\-$/m,

    isDebug : true,
   
    log : function(s) {
        if (this.isDebug)       
            logGeneral(s,"SimplenoteDB");
    },

    isOffline : function() {        
        return $.storage.get(this.offlineKey) == "true";
    },
        
    offline : function(isOffline) {
        
        if(isOffline==undefined)
            throw("SimplenoteDB.offline: please query via .isOffline()");
        
        var oldIsOffline = this.isOffline();
        
        if (isOffline != oldIsOffline) {
            this.log("offline:mode change to offline=" + isOffline);
            uiEvent("offlinechanged", {status:isOffline});
            $.storage.set(this.offlineKey,isOffline==true);
        }              
    },
    _setSyncInProgress: function(val) {
        this.log("_setSyncInProgress:" + val);
        this.isSyncInProgress = val;
    },
    getSyncInProgress: function() {
        return this.isSyncInProgress;
    },
    _reset : function() {
        this.log("_reset");
        this._setSyncInProgress(false);
        this.syncCallbackChunk = undefined;
        this.syncCallbackFinished = undefined;
        this._indexKeysTemp = [];
        this._indexKeysChanged = {hadchanges: false, added:[],changed:[],deleted:[]};
    },
    // jsut to detect whether we actually had a sync
    hadSync : function() {
        return localStorage[SimplenoteLS.indexTimeKey] != undefined;
    },
   
    sync : function(fullSync, callbackFinished, callbackChunk) {
        if (this.getSyncInProgress()) {
            log("sync: sync already in progress, returning");            
            return;
        }
        
        this._reset();
        this._setSyncInProgress(true);        

        var syncKeys = SimplenoteLS.getSyncKeys();
        var note;
        
        this.log("sync: fullSync = " + fullSync);

        this.syncCallbackChunk = callbackChunk;
        this.syncCallbackFinished = callbackFinished;

        // push local changes
        $.each(syncKeys, function(i,key) {
            note = SimplenoteLS.getNote(key);
            if (note != undefined) {
                if (note.key.match(/creatednote(\d+)/))
                    SimplenoteDB.createNote(note, undefined, true);
                else
                    SimplenoteDB.updateNote(note, undefined, true);
            }
        });

        // get index
        var apioptions = {};
        if (!fullSync) {
            var indexTime = SimplenoteLS.indexTime();
            if (indexTime) {
                this.log("sync:using lastIndexTime from storage: " + dateAgo(indexTime));
                apioptions.since = indexTime;
            }
        }
        apioptions.length = 100;        

        uiEvent("sync", {status: "started", changes : this._indexKeysChanged});
        
        this.getIndex(apioptions, fullSync);

    },
    //  count: 20
    //  data: Array[20]
    //  mark: "agtzaW1wbGUtbm90ZXINCxIETm90ZRiElc0HDB"
    //  time: "1302261452.277224"
    _gotIndexChunk : function(indexData, havemore, fullSync) {
        
        if (!indexData) {
            if (this.syncCallbackFinished)
                this.syncCallbackFinished({success:false, fullSync:fullSync});
            this.log("_gotIndexChunk: error getting index from server.");
            this.offline(true);
            this._setSyncInProgress(false);
            uiEvent("sync", {status: "error", changes : this._indexKeysChanged});
        } else {
            var thisHadChanges = false, note;
            
            for (var i=0; i<indexData.data.length; i++) {
                note = indexData.data[i];
                
                if (fullSync)
                    this._indexKeysTemp.push(note.key);
                
                if (!SimplenoteLS.haveNote(note.key)) {                                                            
                    SimplenoteLS.addNote(note);
                    this._indexKeysChanged.hadchanges = true;
                    this._indexKeysChanged.added.push(note.key);
                } else {
                    thisHadChanges = SimplenoteLS.updateNote(note,"index");
                    if (thisHadChanges.hadChanges) {
                        this._indexKeysChanged.hadchanges = true;
                        this._indexKeysChanged.changed.push(note.key);                        
                    }
                }
            }

            if (this.syncCallbackChunk)
                this.syncCallbackChunk(indexData);

            if (!havemore) {
                var successObj = {success:true, fullSync:fullSync};
                
                if (indexData.data.length > 0) // check for indextime sync, most often we get 0 back
                    SimplenoteLS.indexTime(indexData.time);
                                
                if (fullSync) {                    
                    // check for deletions
                    var lskeys = SimplenoteLS.getKeys(), key;
                    this.log("_gotIndexChunk: checking for remote deletions (got " + SimplenoteDB._indexKeysTemp.length + " notes, have " + SimplenoteLS.getKeys().length + ")");
                    for (i=0; i<lskeys.length;i++) {
                        key = lskeys[i];
                        if (this._indexKeysTemp.indexOf(key)<0) {
                            SimplenoteLS.delNote(key);
                            this._indexKeysChanged.hadchanges = true;
                            this._indexKeysChanged.deleted.push(key);
                        }
                    }
                    if (this._indexKeysChanged.deleted.length > 0)
                        this.log("_gotIndexChunk: had remote deletions.");
                    else
                        this.log("_gotIndexChunk: no remote deletions.");

                    successObj.numKeys = SimplenoteDB._indexKeysTemp.length;
                }

                this._setSyncInProgress(false);
                
                if (this.syncCallbackFinished)
                    this.syncCallbackFinished(successObj);
                
                uiEvent("sync", {status: "done", changes : this._indexKeysChanged});
            } 
        }

        if (!havemore) {
            if (this._indexKeysChanged.added.length > 0)
                this.log("_gotIndexChunk: added " + this._indexKeysChanged.added.length);
            if (this._indexKeysChanged.changed.length > 0)
                this.log("_gotIndexChunk: changed " + this._indexKeysChanged.changed.length);
            if (this._indexKeysChanged.deleted.length > 0)
                this.log("_gotIndexChunk: deleted " + this._indexKeysChanged.deleted.length);

            delete this._indexKeysChanged;
        }
    },

    // callback : function(noteData), called after every index chunk
    // mark : (optional) marked note for more
    getIndex : function(apioptions, fullSync) {
            
        var callbacks = {

            //  count: 20
            //  data: Array[20]
            //  mark: "agtzaW1wbGUtbm90ZXINCxIETm90ZRiElc0HDB"
            //  time: "1302261452.277224"
            success :       function(indexData) {    
                SimplenoteDB.offline(false);
                
                SimplenoteDB.log("getIndex:success:got " + indexData.count + " keys from server.");

                if (indexData.mark != undefined) {
                    SimplenoteDB.log("getIndex:success:have mark, getting more.");
                    apioptions.mark = indexData.mark;
                    SimplenoteDB._gotIndexChunk(indexData, true, fullSync);

                    SimplenoteDB.getIndex(apioptions, fullSync);
                    
                } else {                    
                    SimplenoteDB.log("getIndex:success:no mark, done.");
                    SimplenoteDB._gotIndexChunk(indexData, false, fullSync);
                }
            }, 
            loginInvalid:   function() {
                SimplenoteDB.log("getIndex:loginInvalid");
                _gaq.push(['_trackEvent', 'DB', 'getIndex','loginInvalid']);
                //alert("SimplenoteDB::getIndex:loginInvalid");
                SimplenoteAPI2.resetCredentials();
                delete localStorage.token;
                delete localStorage.tokentime;
                SimplenoteDB._gotIndexChunk(undefined, false);                
            }, 
            repeat:         function() {
                SimplenoteDB.log("getIndex:repeat");
                //alert("SimplenoteDB::getIndex:repeat");
                _gaq.push(['_trackEvent', 'DB', 'getIndex','repeat']);
                SimplenoteDB._gotIndexChunk(undefined, false);                
            },
            timeout:        function() {                
                SimplenoteDB.log("getIndex:timeout");
                SimplenoteDB.offline(true);
                _gaq.push(['_trackEvent', 'DB', 'getIndex','timeout']);
                //alert("SimplenoteDB::getIndex:timeout");
                SimplenoteDB._gotIndexChunk(undefined, false);
            }
        };

        // set defaults
        if (!apioptions) apioptions = {};
        if (!apioptions.length) apioptions.length = 100;        
                
        SimplenoteAPI2.index(apioptions,callbacks);
    },
    
    getNote : function(key,callback) {
        var note = SimplenoteLS.getNote(key);
        if (note && note.content) {         
            this.log("getNote:returning note from storage:" + key);
            if (callback)
                callback(note);
        } else {
            this.log("getNote:getting note from server:" + key);
            var callbacks = {
                success :       function(note) {                                
                    SimplenoteDB.offline(false);
                    //SimplenoteLS.updateNote(SimplenoteDB._decryptNote(note),"getnote");
                    SimplenoteLS.updateNote(note,"getnote");
                    if (callback)
                        callback(note);
                }, 
                loginInvalid:   function() {
                    SimplenoteDB.offline(false);
                    SimplenoteDB.log('getNote::loginInvalid');
                    _gaq.push(['_trackEvent', 'DB', 'getNote', 'loginInvalid']);
                    alert('SimplenoteDB::getNote::loginInvalid');
                    if (callback)
                        callback();
                }, 
                repeat:         function() {
                    SimplenoteDB.offline(false);
                    SimplenoteDB.log('getNote::repeat');
                    _gaq.push(['_trackEvent', 'DB', 'getNote','repeat']);
                    //alert('SimplenoteDB::getNote::repeat');
                    if (callback)
                        callback();                    
                },
                noteNotExist:  function(key) {
                    SimplenoteDB.offline(false);
                    SimplenoteDB.log('getNote::noteNotExists');
                    SimplenoteLS.removeFromSyncList(key);
                    SimplenoteLS.delNote(key);
                    _gaq.push(['_trackEvent', 'DB', 'getNote','noteNoteExist']);
                    //alert('SimplenoteDB::getNote::noteNoteExist');
                    if (callback)
                        callback();                    
                },
                timeout: function(options) {
                    SimplenoteDB.offline(true);
                    SimplenoteDB.log('getNote::timeout');
                    _gaq.push(['_trackEvent', 'DB', 'getNote','timeout']);
                    //alert('SimplenoteDB::getNote::timeout');
                    if (callback)
                        callback();
                }                    
            };        
            SimplenoteAPI2.retrieve(key, callbacks);
        }
    },
    
    updateNote : function(data,callback,syncmode) {
        this.log("updateNote, syncMode = " + syncmode + " update data:");
        this.log(data);
        
        if (!syncmode) {
            // get local note version
            var note = SimplenoteLS.getNote(data.key);
            if (!note)
                throw "unknown or missing note, cannot update";

            delete data.action;

            // client updateable properties:
            if (data.content != undefined)      note.content = data.content;
            if (data.deleted != undefined)      note.deleted = data.deleted;
            if (data.tags != undefined)         note.tags = data.tags;
            if (data.systemtags != undefined)   note.systemtags = data.systemtags;
            //if (data.encrypted != undefined)    note.encrypted = data.encrypted;

            if (data.content) {
                note.modifydate = (new Date())/1000;
                data.modifydate = note.modifydate;
                // needed for merging
                //if (!data.encrypted || data.encrypted==0) // dont want merge on cyphertext
                    data.version = note.version;
            }
            var source = "local";
            if (data.source) {
                source = data.source;
                delete data.source;
            }

            SimplenoteLS.updateNote(note,source);
            SimplenoteLS.addToSyncList(note.key);
        }
        
        var callbacks = {
            success :       function(note) {
                SimplenoteDB.offline(false);
                // TODO: should not have to decrypt, since merging cant happen with cyphertext                                    
                //SimplenoteLS.updateNote(SimplenoteDB._decryptNote(note),"updateresponse");
                SimplenoteLS.updateNote(note,"updateresponse");
                SimplenoteLS.removeFromSyncList(note.key);
                if (callback)
                    callback(note);
            }, 
            loginInvalid:   function() {
                SimplenoteDB.offline(false);
                SimplenoteDB.log('updateNote::loginInvalid');
                _gaq.push(['_trackEvent', 'DB', 'updateNote','loginInvalid']);
                alert('SimplenoteDB::updateNote::loginInvalid');
            }, 
            repeat:         function() {
                SimplenoteDB.offline(false);
                SimplenoteDB.log('updateNote::repeat');
                _gaq.push(['_trackEvent', 'DB', 'updateNote','repeat']);
                //alert('SimplenoteDB::updateNote::repeat');
            },
            noteNotExists:  function() {
                SimplenoteDB.offline(false);
                SimplenoteDB.log('updateNote::noteNoteExists');
                _gaq.push(['_trackEvent', 'DB', 'updateNote','noteNoteExits']);
                alert('SimplenoteDB::updateNote::noteNoteExists');
            },
            timeout: function(note) {                                 
                SimplenoteDB.offline(true);
                SimplenoteDB.log('updateNote::timeout');
                _gaq.push(['_trackEvent', 'DB', 'updateNote','timeout']);
                //alert('SimplenoteDB::updateNote::timeout');
                if (callback)
                    callback(note);
            }                    
        };

//        data = this._encryptNote(data);
//        delete data.encrypted;

        SimplenoteAPI2.update(data, callbacks);
        
    },
    
    createNote : function(note,callback,syncmode) {
        this.log("createNote, note data below, syncmode = " +  syncmode);
        this.log(note2str(note,true));
        delete note.action;
        var tempkey;
        if (!syncmode) {
            note.createdate = (new Date())/1000;
            note.modifydate = note.createdate;
            // set things needed for operation
            tempkey = SimplenoteLS.getCreatedNoteTempKey();
            note.key = tempkey;
            note.deleted = 0;
            if (!note.tags)
                note.tags = [];
            if (!note.systemtags)
                note.systemtags = [];

            SimplenoteLS.addNote(note);            
            SimplenoteLS.addToSyncList(note.key);
        } else {
            tempkey = note.key;
        }
//        var tempencrypted = note.encrypted;

        var callbacks = {
            success :       function(newnote) {
                SimplenoteDB.offline(false);
                newnote.content = note.content;
//                newnote.content = cleartextcontent; // we never get content back on create
//                if (tempencrypted)
//                    newnote.encrypted = tempencrypted;
                SimplenoteLS.addNote(newnote);

                SimplenoteLS.delNote(tempkey);
                SimplenoteLS.removeFromSyncList(tempkey);

                if (callback)
                    callback(newnote);
            }, 
            loginInvalid:   function() {
                SimplenoteDB.offline(false);
                SimplenoteDB.log("createNote::loginInvalid");
                _gaq.push(['_trackEvent', 'DB', 'createNote','loginInvalid']);
                alert('SimplenoteDB::createNote::loginInvalid');                
            }, 
            repeat:         function() {
                SimplenoteDB.offline(false);
                SimplenoteDB.log("createNote::repeat");
                _gaq.push(['_trackEvent', 'DB', 'createNote','repeat']);
                //alert('SimplenoteDB::createNote::repeat');
            },
            timeout: function(note) {             
                SimplenoteDB.offline(true);
                SimplenoteDB.log("createNote::timeout");
                _gaq.push(['_trackEvent', 'DB', 'createNote','timeout']);
                //alert('SimplenoteDB::createNote::timeout');
                if (callback)
                    callback();
            }                    
        };
        delete note.key; // remove temp key
//        var cleartextcontent = note.content;
//        if (note.encrypted) {
//            note = this._encryptNote(note);
//            delete note.encrypted;
//        }

        SimplenoteAPI2.create(note, callbacks);
    },
    
//    deleteNote : function(key, callback) {
//        var callbacks = {
//            success :       function(data) {
//                SimplenoteDB.offline(false);
//                SimplenoteLS.delNote(key);
//                if (callback)
//                    callback(true);
//            },
//            loginInvalid:   function() {
//                SimplenoteDB.offline(false);
//                SimplenoteDB.log("deleteNote::loginInvalid")
//                alert('SimplenoteDB::deleteNote::loginInvalid');
//            },
//            repeat:         function() {
//                SimplenoteDB.offline(false);
//                SimplenoteDB.log("deleteNote::repeat")
//                //alert('SimplenoteDB::deleteNote::repeat');
//            },
//            noteNotExists:  function() {
//                SimplenoteDB.offline(false);
//                SimplenoteDB.log("deleteNote::noteNotExists")
//                alert('SimplenoteDB::deleteNote::noteNotExists');
//            },
//            timeout: function(key) {
//                SimplenoteDB.offline(true);
//                SimplenoteDB.log("deleteNote::timeout")
//                alert('SimplenoteDB::deleteNote::timeout');
//                if (callback)
//                    callback(false);
//            }
//        };
//        SimplenoteAPI2.destroy(key, callbacks);
//    },

    _deleteAllRemote : function() {
        var note;
        $.each(SimplenoteLS.getKeys(), function(i,key) {
            note = SimplenoteLS.getNote(key);
            note.deleted = 1;
            SimplenoteDB.updateNote(note, function(note) {SimplenoteDB.deleteNote(note.key);}, true);
        });
//    },
//    _decryptNote: function(note) {
//        if (!note.content)
//            return note;
//
//        var cypher = note.content.match(SimplenoteDB.cypherReg);
//        if (cypher) {
//            note.content = Aes.Ctr.decrypt(cypher[1], localStorage.option_aes_key, 256);
//            note.encrypted = 1;
//        }
//        return note;
//    },
//    _encryptNote: function(note) {
//        if (note.encrypted == 1 && note.content && localStorage.option_aes_enable) {
//            var cypherText = Aes.Ctr.encrypt(note.content, localStorage.option_aes_key, 256);
//            note.content = "--SYNCPADAES--\n" + cypherText + "\n--SYNCPADAES--";
//        }
//
//        return note;
    }
}

SimplenoteDB._reset();
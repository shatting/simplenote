// ------------------------------------------------------------------------------------------------
// Simplenote Database interface.
// ------------------------------------------------------------------------------------------------

var SimplenoteDB = {    
    offlineKey : "_offline",
   
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
        }
        
        $.storage.set(this.offlineKey,isOffline==true);
        chrome.extension.sendRequest({event:"offline", isOffline:isOffline});
    },
    // jsut to detect whether we actually had a sync
    hadSync : function() {
        return localStorage[SimplenoteLS.indexTimeKey] != undefined;
    },
   
    sync : function(fullSync, callbackFinished, callbackChunk) {
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

        if (fullSync)
            this._indexKeysTemp = [];
        
        chrome.extension.sendRequest({event:"sync", status: "started", hadChanges : false});
        
        this.getIndex(apioptions, fullSync);

    },
    //  count: 20
    //  data: Array[20]
    //  mark: "agtzaW1wbGUtbm90ZXINCxIETm90ZRiElc0HDB"
    //  time: "1302261452.277224"
    _gotIndexChunk : function(indexData, havemore, fullSync) {
                
        if (!indexData) {
            if (this.syncCallbackFinished)
                this.syncCallbackFinished(false);
            this.log("gotIndexChunk:error getting index from server.");
            this.offline(true);
            chrome.extension.sendRequest({event:"sync", status: "error", hadChanges : false});
        } else {
            var hadChanges;
            $.each(indexData.data, function(i,note) {
                if (fullSync)
                    SimplenoteDB._indexKeysTemp.push(note.key);
                
                if (!SimplenoteLS.haveNote(note.key)) {
                    SimplenoteDB.log("gotIndexChunk:found new note in index, saving to storage");
                    hadChanges = true;
                    SimplenoteLS.addNote(note);
                } else {
                    SimplenoteDB.log("gotIndexChunk:found known note in index, updating in storage");
                    SimplenoteLS.updateNote(note);
                }
            });

            if (this.syncCallbackChunk)
                this.syncCallbackChunk(indexData);

            if (!havemore) {                
                if (indexData.data.length > 0)
                    SimplenoteLS.indexTime(indexData.time);
                
                if (fullSync) {                    
                    // check for deletions
                    SimplenoteDB.log("gotIndexChunk:checking for remote deletions.");
                    $.each(SimplenoteLS.getKeys(), function (i,key){
                        if (SimplenoteDB._indexKeysTemp.indexOf(key)<0)
                            SimplenoteLS.delNote(key);
                    })
                    delete SimplenoteDB._indexKeysTemp;
                }
                if (this.syncCallbackFinished)
                    this.syncCallbackFinished(true);
                chrome.extension.sendRequest({event:"sync", status: "done", hadChanges : hadChanges});
            } 
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

                if (indexData.mark) {
                    SimplenoteDB.log("getIndex:success:have mark, getting more.");
                    apioptions.mark = indexData.mark;
                    SimplenoteDB._gotIndexChunk(indexData, true, fullSync);

                    SimplenoteDB.getIndex(apioptions, fullSync);
                    
                } else {                    
                    SimplenoteDB.log("getIndex:success:no mark, done.");
                    SimplenoteDB._gotIndexChunk(indexData, false, fullSync);
                }
            }, 
            loginInvalid:   function()          {
                SimplenoteDB._gotIndexChunk(undefined, false);                
            }, 
            repeat:         function()      
            {
                SimplenoteDB._gotIndexChunk(undefined, false);                
            },
            timeout: function() {
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
                    SimplenoteLS.updateNote(note,true);
                    callback(note);
                }, 
                loginInvalid:   function() {
                    SimplenoteDB.offline(false);
                    alert('background::note::loginInvalid');
                }, 
                repeat:         function() {
                    SimplenoteDB.offline(false);
                    alert('background::note::repeat');
                },
                noteNotExists:  function() {
                    SimplenoteDB.offline(false);
                    alert('background::note::noteNotExists');
                },
                timeout: function(options) {
                    SimplenoteDB.offline(true);
                    callback();
                //todo                    
                }                    
            };        
            SimplenoteAPI2.retrieve(key, callbacks);
        }
    },
    
    updateNote : function(data,callback,syncmode) {
        this.log("updateNote, update data:");
        this.log(data);        
        // get local note version
        if (!syncmode) {

            var note = SimplenoteLS.getNote(data.key);
            if (!note)
                throw "unknown or missing note, cannot update";

            delete data.action;

            // client updateable properties:
            if (data.content) note.content = data.content;
            if (data.deleted) note.deleted = data.deleted;
            if (data.tags) note.tags = data.tags;
            if (data.systemtags) note.systemtags = data.systemtags;

            if (data.content) {
                note.modifydate = (new Date())/1000;
                data.modifydate = note.modifydate;
                // needed for merging
                data.version = note.version;
            }

            SimplenoteLS.updateNote(note, true);
            SimplenoteLS.addToSyncList(note.key);
        }
        
        var callbacks = {
            success :       function(note) {
                SimplenoteDB.offline(false);
                SimplenoteLS.updateNote(note);
                SimplenoteLS.removeFromSyncList(note.key);
                if (callback)
                    callback(note);
            }, 
            loginInvalid:   function() {
                SimplenoteDB.offline(false);
                alert('background::note::loginInvalid');
            }, 
            repeat:         function() {
                SimplenoteDB.offline(false);
                alert('background::note::repeat');
            },
            noteNotExists:  function() {
                SimplenoteDB.offline(false);
                alert('background::note::noteNotExists');
            },
            timeout: function(note) { 
                SimplenoteDB.log("timeout");                
                SimplenoteDB.offline(true);    
                if (callback)
                    callback(note);
            }                    
        };        
        SimplenoteAPI2.update(data, callbacks);
        
    },
    
    createNote : function(note,callback,syncmode) {
        this.log("createNote, note data below, syncmode = " +  syncmode);
        this.log(note2str(note,true));
        delete note.action;
        var tempkey;
        if (!syncmode) {
            note.createdate = (new Date())/1000;

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
        }
        
        var callbacks = {
            success :       function(newnote) {
                SimplenoteDB.offline(false);
                
                newnote.content = note.content;                
                SimplenoteLS.addNote(newnote);

                SimplenoteLS.delNote(tempkey);
                SimplenoteLS.removeFromSyncList(tempkey);

                if (callback)
                    callback(newnote);
            }, 
            loginInvalid:   function() {
                SimplenoteDB.offline(false);
                alert('background::note::loginInvalid');
            }, 
            repeat:         function() {
                SimplenoteDB.offline(false);
                alert('background::note::repeat');
            },
            noteNotExists:  function() {
                SimplenoteDB.offline(false);
                alert('background::note::noteNotExists');
            },
            timeout: function(note) { 
                SimplenoteDB.log("timeout, adding note to sync list");                
                SimplenoteDB.offline(true);
                if (callback)
                    callback();
            }                    
        };
        delete note.key; // remove temp key        
        SimplenoteAPI2.create(note, callbacks);
    },
    
    deleteAllRemote : function() {
        var note;
        $.each(SimplenoteLS.getKeys(), function(i,key) {
            note = SimplenoteLS.getNote(key);
            note.deleted = 1;
            SimplenoteDB.updateNote(note, function(note) {SimplenoteDB.deleteNote(note.key);}, true);
        });
    },

    deleteNote : function(key, callback) {
        var callbacks = {
            success :       function(data) {
                SimplenoteDB.offline(false);                
                SimplenoteLS.delNote(key);
                if (callback)
                    callback(true);
            }, 
            loginInvalid:   function() {
                SimplenoteDB.offline(false);
                alert('background::note::loginInvalid');
            }, 
            repeat:         function() {
                SimplenoteDB.offline(false);
                alert('background::note::repeat');
            },
            noteNotExists:  function() {
                SimplenoteDB.offline(false);
                alert('background::note::noteNotExists');
            },
            timeout: function(key) { 
                SimplenoteDB.offline(true);
                SimplenoteLS.delNote(key);
                if (callback)
                    callback(false);
            }                    
        };        
        SimplenoteAPI2.destroy(key, callbacks);
    }
}

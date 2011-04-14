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
        
        var oldIsOffline = $.storage.get(this.offlineKey) == "true";
        
        if (isOffline != oldIsOffline) {
            this.log("offline:mode change to offline=" + isOffline);
        }
        
        $.storage.set(this.offlineKey,isOffline==true);
    },
    
    getIndex : function(callback,apioptions,options) {    
            
        var callbacks = {
            success :       function(indexData) {    
                SimplenoteDB.offline(false);
                SimplenoteDB.processIndex(indexData,callback,apioptions,options);
            }, 
            loginInvalid:   function()          {
                SimplenoteDB.offline(false);
                alert('background::index::loginInvalid');
            }, 
            repeat:         function()      
            {
                SimplenoteDB.offline(false);
                alert('background::index::repeat');
            },
            timeout: function(apioptions) {
                SimplenoteDB.log("timeout, sending cached data");
                SimplenoteDB.offline(true);
                if (callback)
                    callback(SimplenoteLS.getNotes());
            }
        };
        
        
        if (!apioptions) apioptions={};        
        if (!apioptions.length) apioptions.length = 100;
        
        var indexTime = SimplenoteLS.indexTime();
        
        if (indexTime && apioptions.since === undefined) {
            this.log("using lastIndexTime from storage: " + dateAgo(indexTime));
            apioptions.since = indexTime;
        } else {
            if (apioptions.since)
                this.log("using lastIndexTime from options: " + dateAgo(apioptions.since));
        }
                
        if (SimplenoteDB.isOffline()) {
            this.log("getIndex:offline mode active, instant return");
            callbacks.succes({data:this.getNotes(), count:this.getNotes().length});
        } 
           
        SimplenoteAPI2.index(apioptions,callbacks);
    },
    
    //  count: 20
    //  data: Array[20]
    //  mark: "agtzaW1wbGUtbm90ZXINCxIETm90ZRiElc0HDA"
    //  time: "1302261452.277224"
    processIndex : function(indexData,callback,apioptions,options) {
        //console.log(indexData.data);
        if (!options) options ={};
        var keys = SimplenoteLS.getKeys();
            
        this.log("processIndex:have " + keys.length + " keys in storage");
        this.log("processIndex:got " + indexData.count + " keys from server");
        
        $.each(indexData.data, function(i,note) {
            if (!SimplenoteLS.haveNote(note.key)) {
                SimplenoteDB.log("processIndex:found new note in index, saving to storage");
                SimplenoteLS.addNote(note);
            } else {
                SimplenoteDB.log("processIndex:found known note in index, updating in storage");
                SimplenoteLS.updateNote(note);
            }
        });                        
        
        if (indexData.mark) {
            this.log("processIndex:have mark, getting more");
            apioptions.mark = indexData.mark;
            this.getIndex(callback,apioptions);
        } else {
            this.log("processIndex:no mark, calling callback.");
            SimplenoteLS.indexTime(indexData.time);
            if (callback) {
                
                options.systemtag = "pinned";
                var pinned = SimplenoteLS.getNotes(options);
                var pinnedKeys = pinned.map(function(e) {return e.key;});
                
                options.systemtag = undefined;
                var unpinned = SimplenoteLS.getNotes(options).filter(function (e) {
                    return pinnedKeys.indexOf(e.key) < 0;
                });              
                
                callback(pinned.concat(unpinned));            
                
            }
        }
        
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
    
    updateNote : function(data,callback) {
        this.log("updateNote, update data:");
        this.log(data);        
        // get local note version
        var note = SimplenoteLS.getNote(data.key);
        if (!note)            
            throw "unknown or missing note, cannot update";        
        
        // client updateable properties:
        if (data.content) note.content = data.content;
        if (data.deleted) note.deleted = data.deleted;
        if (data.tags) note.tags = data.tags;
        if (data.systemtags) note.systemtags = data.systemtags;

        if (data.content)
            note.modifydate = (new Date())/1000;
        
        SimplenoteLS.updateNote(note);
        SimplenoteLS.addToSyncList(note.key);
        
        var callbacks = {
            success :       function(note) {
                SimplenoteDB.offline(false);   
                SimplenoteLS.updateNote(note);
                SimplenoteLS.removeFromSyncList(note.key);
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
                SimplenoteDB.log("timeout, adding note to sync list");                
                SimplenoteDB.offline(true);                                
                callback(note);
            }                    
        };
        delete data.action;
        SimplenoteAPI2.update(data, callbacks);
        
    },
    
    createNote : function(note,callback) {
        this.log("createNote, note data:");
        this.log(note);         
        
        note.createdate = (new Date())/1000;
        
        var tempkey = SimplenoteLS.addToSyncList(note);
        //SimplenoteLS.addNote(note);
        // TODO: 
        //SimplenoteLS.addToSyncList(note.key);
        
        var callbacks = {
            success :       function(note) {
                SimplenoteDB.offline(false);                
                SimplenoteLS.addNote(note);
                SimplenoteLS.removeFromSyncList(tempkey);
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
                SimplenoteDB.log("timeout, adding note to sync list");                
                SimplenoteDB.offline(true);                
                callback();
            }                    
        };        
        SimplenoteAPI2.create(note, callbacks);        
    },
    
    deleteNote : function(key, callback) {
        var callbacks = {
            success :       function(data) {
                SimplenoteDB.offline(false);                
                SimplenoteLS.delNote(key);
                callback();
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
                callback();
            }                    
        };        
        SimplenoteAPI2.destroy(key, callbacks);
    }
}

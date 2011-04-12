
$.storage = new $.store("localStorage",{
    "json":$.store.serializers.json
});

var SimplenoteLS = {
    keysKey         : "_keys",
    syncKeysKey     : "_syncKeys",
    indexTimeKey    : "_indexTime",
    
    // toggle debug output
    isDebug : true,
    
    log : function(s) {
        if (this.isDebug) 
            logGeneral(s,"SimplenoteLS");
    },
    
    indexTime : function(newIndexTime) {
        if (newIndexTime)
            localStorage[this.indexTimeKey] = newIndexTime;
        else
            return localStorage[this.indexTimeKey];
    },
    
    haveNote : function(key) {
        var keys = this.getKeys();
        return keys.indexOf(key)>=0;
    },
    
    addNote : function(note,top) {
        
        if (!note || !note.key) {
            console.log(note);
            throw "cannot add empty note or note without key"               
        }
        if (this.haveNote(note.key)) {
            console.log(note);
            throw "cannot add note, note already in LS"
            //this.updateNote(note)     
        } else {
            var keys = this.getKeys();
            keys.push(note.key);        

            $.storage.set(this.keysKey,keys);            
            $.storage.set(note.key,note);     
        }
    },
    
    updateNote : function(note, force) {
        
        if (!note || !note.key) {
            console.log(note);
            throw "cannot update with empty note or note without key"               
        }
        var storedNote = this.getNote(note.key);
        if (!storedNote) {
            console.log(note);
            throw "cannot update note, note not in LS"
        }
        this.log("updateNote:stored:");
        this.log(note2str(storedNote, true));
        this.log("updateNote:input:");
        this.log(note2str(note, true));
        
        if (storedNote.syncnum < note.syncnum || storedNote.modifydate < note.modifydate || force) {
            if (storedNote.syncnum < note.syncnum )
                this.log("updateNote:new note sync version, saving to storage");                    
            else
                this.log("updateNote:newer note modify version, saving to storage");                    
            
            for (var field in note) {
                if (storedNote[field] === undefined ) {
                    this.log("updateNote: new field " + field);                   
                } else if ((storedNote[field] instanceof Array) && storedNote[field].join(" ") != note[field].join(" ")) {
                    this.log("updateNote: changed array field " + field);
                } else if (!(storedNote[field] instanceof Array) && storedNote[field] != note[field]) {                    
                    this.log("updateNote: changed field " + field);                    
                }
            }
                                        
            if (note.content == undefined && storedNote.content != undefined) {
                note.content = storedNote.content;                
            }                      
                
            this.log("updateNote:saving:");
            this.log(note2str(note, true));
            
            $.storage.set(note.key,note);
        } else if (storedNote.syncnum > note.syncnum) { // push changes should make sync function for this
            this.log("updateNote:pushing note changes to server.");
            SimplenoteDB.update(storedNote);                    
        } else {
            this.log("updateNote:not updating note, no new sync or modifydate");
        }
    },

    getNote : function(key) {
        return $.storage.get(key);
    },

    getNotes: function(options) {
        var keys = this.getKeys();
        
        var notes = [];
        var add;
        var note;
        $.each(keys,function(i,key) {                            
            add = true;
            note = $.storage.get(key);
            if (options) {
                if (options.deleted != undefined && note.deleted != options.deleted)
                    add = false
            
                if (options.tag != undefined && note.tags.indexOf(options.tag)<0)
                    add = false
            
                if (options.systemtag != undefined && note.systemtags.indexOf(options.systemtag)<0)
                    add = false

                if (options.query != undefined) {
                    if (options.query.type == "content")
                        add = note.content && note.content.indexOf(options.query.query)>=0;
                    else if (options.query.type == "tags") {
                        if (options.query.query == "#notag#")
                            add = note.tags.length == 0;
                        else
                            add = note.tags && note.tags.indexOf(options.query.query)>=0;
                    }
                }
            }
            if (add)
                notes.push(note);
        });
        
        notes.sort(function(note1,note2) {            
            return note2.modifydate-note1.modifydate; 
        });
        
        return notes;
    },    
    
    delNote : function(key) {
        var keys = this.getKeys();
        
        if (keys.indexOf(key)>=0) {
            keys.splice(keys.indexOf(key),1);
            $.storage.set(this.keysKey,keys);
            $.storage.del(key);            
        }        
    },
    
    getKeys : function() {
        var keys = $.storage.get(this.keysKey);
        if (!keys)
            keys = [];  
        return keys;
    },
    
    getSyncKeys : function() {
        var keys = $.storage.get(this.syncKeysKey);
        if (!keys)
            keys = [];  
        return keys;
    },
    getTags : function() {
        var keys = this.getKeys();

        var tags = [];
        var thistags;
        $.each(keys,function(i,key) {            
            thistags = $.storage.get(key).tags;
            $.each(thistags, function(i,tag) {
                if (tags.indexOf(tag) < 0)
                    tags.push(tag);
            });            
        });
        tags.sort();
        return tags;
    },
    clear : function () {
        $.each(this.getKeys(), function (i,e) {
            $.storage.del(e);              
        });
        $.storage.del(this.keysKey);
        $.storage.del(this.syncKeysKey);
        $.storage.del(this.indexTimeKey);        
    },
    
    addToSyncList : function(key) {
        
        if (key instanceof Object) { // create
            return "dummy";
        }
        
        var keys = this.getSyncKeys();
        if (keys.indexOf(key)<0) {
            this.log("addToSyncList:"+key);
            keys.push(key);
            $.storage.set(this.syncKeysKey,keys);
        }
    },
    
    removeFromSyncList : function(key) {
               
        var keys = this.getSyncKeys();
        if (keys.indexOf(key)>=0) {
            this.log("removeFromSyncList:"+key);
            keys.splice(keys.indexOf(key),1);
            if (keys.length == 0)
                $.storage.del(this.syncKeysKey)
            else
                $.storage.set(this.syncKeysKey,keys);
        }
    },
    
    populate : function(password) {
        var credentials = {
            email: localStorage.email, 
            password: localStorage.password
        };
        if (localStorage.token) {
            credentials.token = localStorage.token;
            credentials.tokenTime = new Date(localStorage.tokenTime);        
        }
        SimplenoteAPI2.login(credentials);
        this.getIndex(undefined,{
            since:0
        });
    },
    maintain: function () {
        var keys = this.getKeys();        
        keys = keys.filter(function(e) { 
            var keep = e!=null;
            if (!keep)
                SimplenoteLS.log("maintain:removed invalid key:" + e);
            return keep;
        });
        $.storage.set(this.keysKey,keys);
        
    },
    info : function() {
        var keys = this.getKeys();       
        this.log("last index received " + dateAgo(this.indexTime()));
        this.log("LS keys array has " + keys.length + " keys.");
        var notes = this.getNotes();
        this.log("LS notes " + notes.length + ".");
        var synckeys = this.getSyncKeys();
        this.log("LS has " + synckeys.length + " notes to sync.");
        var item, key;
        for (var i = 0; i < localStorage.length; i++){
            key = localStorage.key(i);
            try {
                item = $.storage.get(key);
                if (keys.indexOf(key)<0 && item.deleted !== undefined && item.deleted != 0) {
                    this.log("Notes not in Keys: key=" + key);
                    logNote(item);
                }
            } catch (e) {
                //this.log("threw error: key=" + key); 
            }
            
        }
        for (var i = 0; i < keys.length; i++){
            key = keys[i];
            try {
                item = $.storage.get(key);
                if (!item || !item.key) {
                    this.log("Key without note: key=" + key);                    
                }
            } catch (e) {
                this.log("threw error: key=" + key); 
            }
            
        }
        
    }
    
}

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
            throw("SimplenoteDB.offline please query via .isOffline()");
        
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
    },

    searchNotes : function(request, callback) {
        callback(SimplenoteLS.getNotes(request));
    }
}


$.storage = new $.store("localStorage",{"json":$.store.serializers.json});

var SimplenoteDB = {    
    
    getIndexLS: function() {
        var keys = this.getKeysLS();
        
        var notes = [];
        $.each(keys,function(i,e) {
            notes.push($.storage.get(e));
        });
        return notes;
    },    
    delNoteLS : function(key) {
        var keys = this.getKeysLS();
        
        if (keys.indexOf(key)>=0) {
            keys.pop(key);
            $.storage.del(key);
            $.storage.set("keys",keys);
        }        
    },
    getKeysLS : function() {
        var keys = $.storage.get("keys");
        if (!keys)
            keys = [];  
        return keys;
    },
    
    clearLS : function () {
        $.each(this.getKeysLS(), function (i,e) {
            $.storage.del(e);              
        });
        $.storage.del("keys");
        $.storage.del("lastIndexTime");
    },
    
    populateLS : function(password) {
        var credentials = {email: localStorage.email, password: localStorage.password};
        if (localStorage.token) {
            credentials.token = localStorage.token;
            credentials.tokenTime = new Date(localStorage.tokenTime);        
        }
        SimplenoteAPI2.login(credentials);
        this.getIndex(undefined,{since:0});
    },
    
    getIndex : function(callback,options) {        
        var callbacks = {   success :       function(indexData) {    
                                                                //callback(SimplenoteDB.getIndexLS());
                                                                SimplenoteDB.processIndex(indexData,callback,options); }, 
                            loginInvalid:   function()          {    alert('background::index::loginInvalid');      }, 
                            repeat:         function()          {    alert('background::index::repeat');            }
                        };
        
        if (!options) options={};        
        if (!options.length) options.length = 100;
        
        if (localStorage.lastIndexTime && options.since === undefined) {
            console.log("using lastIndexTime from storage: " + (new Date(localStorage.lastIndexTime)));
            options.since = localStorage.lastIndexTime;
        } else {
            console.log("using lastIndexTime from options: " + (new Date(options.since)));
        }
           
        SimplenoteAPI2.index(options,callbacks);
    },
    
    //  count: 20
    //  data: Array[20]
    //  mark: "agtzaW1wbGUtbm90ZXINCxIETm90ZRiElc0HDA"
    //  time: "1302261452.277224"
    processIndex : function(indexData,callback,options) {
        //console.log(indexData.data);
        
        var keys = this.getKeysLS();
            
        //console.log("have %i keys in storage",keys.length);
        
        $.each(indexData.data, function(i,e) {
            if (keys.indexOf(e.key) == -1) {
                console.log("found new note, saving to storage");
                keys.push(e.key);
                $.storage.set(e.key,e);
            } else {
                var storedNote = $.storage.get(e.key);
                if (storedNote.syncnum < e.syncnum) {
                    console.log("new note sync, saving to storage");                    
                    keys.pop(e.key); // move to top
                    keys.push(e.key);
                    $.storage.set(e.key,e);
                } else { // push changes
                }
            }
        });
                        
        $.storage.set("keys",keys);
        
        if (indexData.mark) {
            console.log("have mark, getting more");
            options.mark=indexData.mark;
            SimplenoteDB.getIndex(callback,options);
        } else {
            console.log("got all:" + keys.length);
            localStorage.lastIndexTime = indexData.time;
            if (callback)
                callback(this.getIndexLS());            
        }
        
    },
    
    getNote : function(key,callback) {
        var note = $.storage.get(key);
        if (note && note.content) {         
            if (callback)
                callback(note);
        } else {
            callbacks = {   success :       function(data) { SimplenoteDB.processNote(data, callback);  }, 
                            loginInvalid:   function() {    alert('background::note::loginInvalid');    }, 
                            repeat:         function() {    alert('background::note::repeat');          },
                            noteNotExists:  function() {    alert('background::note::noteNotExists');   }                    
                    };        
            SimplenoteAPI2.retrieve(key, callbacks);
        }
    },
    
    processNote: function(noteData,callback) {
        // we might not know of this note
        var keys = this.getKeysLS();
        
        if (keys.indexOf(noteData.key)<0) {
            keys.push(noteData.key);
            $.storage.set("keys",keys);
        }
                    
        $.storage.set(noteData.key,noteData);                    
        
        callback(noteData);
    }
}

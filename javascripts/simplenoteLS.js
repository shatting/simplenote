// ------------------------------------------------------------------------------------------------
// Simplenote localStorage Database.
// ------------------------------------------------------------------------------------------------

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
                        add = add && note.content && note.content.indexOf(options.query.query)>=0;
                    else if (options.query.type == "tags") {
                        if (options.query.query == "#notag#")
                            add = add && note.tags.length == 0;
                        else if (options.query.query == "#trash#")
                            add = note.deleted == 1;
                        else
                            add = add && note.tags && note.tags.indexOf(options.query.query)>=0;
                    }
                }
            }
            if (add)
                notes.push(note);
        });

        if (options.sortdirection == undefined)
            options.sortdirection = 1;

        if (options.sort == undefined || options.sort == "modifydate")
            notes.sort(function(note1,note2) {
                return options.sortdirection*(note2.modifydate-note1.modifydate);
            });
        else if (options.sort == "createdate")
            notes.sort(function(note1,note2) {
                return options.sortdirection*(note2.createdate-note1.createdate);
            });
        else if (options.sort == "alpha")
            notes.sort(function(note1,note2) {
                var c1 = note1.content.toLowerCase();
                var c2 = note2.content.toLowerCase();

                if (c1 < c2)
                    return -options.sortdirection;
                if (c1 > c2)
                    return options.sortdirection;
                return 0
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
        var thisnote;
        var thistags;
        $.each(keys,function(i,key) {
            thisnote = $.storage.get(key);
            if (thisnote.deleted != 1) {
                thistags = thisnote.tags;
                $.each(thistags, function(i,tag) {
                    if (tags.indexOf(tag) < 0)
                        tags.push(tag);
                });
            }
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
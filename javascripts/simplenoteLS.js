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
        if (newIndexTime) {
            log("indexTime:setting new indexTime:" + convertDate(newIndexTime) );
            localStorage[this.indexTimeKey] = newIndexTime;
        } else
            return localStorage[this.indexTimeKey];
    },

    haveNote : function(key) {
        var keys = this.getKeys();
        return keys.indexOf(key)>=0;
    },

    addNote : function(note) {

        if (!note || !note.key) {
            console.log(note);
            throw "cannot add empty note or note without key"
        }
        if (this.haveNote(note.key)) {
            console.log(note);
            throw "cannot add note, note already in LS"            
        }
        this.log("addNote, note: ");
        this.log(note);
        
        var keys = this.getKeys();
        keys.push(note.key);

        $.storage.set(this.keysKey,keys);
        $.storage.set(note.key,note);

        uiEvent("noteadded", {note:note});
    },

    // source: local, getnote, updateresponse, index
    updateNote : function(inputNote, source) {

        if (!inputNote || !inputNote.key) {
            console.log(inputNote);
            throw "cannot update with undefined note or note without key"
        }
        
        var storedNote = this.getNote(inputNote.key);

        if (!storedNote) {
            console.log(inputNote);
            throw "cannot update note, note not in LS"
        }

        // simplenote api bug: publishing does not increase syncnum        
        var changed = {hadChanges: false, added:[],changed:[], deleted:[]};
        var inputFields = [];

        // look at inputNote, compare fields to storedNote
        for (var inputField in inputNote) {
            inputFields.push(inputField);

            if (storedNote[inputField] === undefined ) {
                changed.added.push(inputField);                
            } else if ((storedNote[inputField] instanceof Array) && storedNote[inputField].join(" ") != inputNote[inputField].join(" ")) {
                changed.changed.push(inputField);                
            } else if (!(storedNote[inputField] instanceof Array) && storedNote[inputField] != inputNote[inputField]) {
                changed.changed.push(inputField);                
            }
        }
        // see whether all fields are still there
        for (var storedField in storedNote) {
            if (inputFields.indexOf(storedField)<0 && storedField != "content") {
                changed.deleted.push(storedField);                
            }
        }
        changed.hadChanges = changed.added.length > 0 || changed.changed.length > 0 || changed.deleted.length > 0;

        var haveStored = false, onlyLocalContent;
        if (source == "local" || source == "getnote") {            
            haveStored = true;
            $.storage.set(inputNote.key,inputNote);
        } else if (source == "updateresponse" || source == "index") {
            onlyLocalContent = inputNote.content == undefined && storedNote.content != undefined;
            if (changed.hadChanges) {
                // we will always have onlyLocalcontent in index source -> only take local if versions agree
                // we might have new content in updateresponse source (merge) -> only take local if we dont have new content
                if ((source=="updateresponse" && onlyLocalContent) || (source=="index" && inputNote.version==storedNote.version)) {
                    this.log("updateNote: taking .content from stored note");
                    inputNote.content = storedNote.content;
                }
                haveStored = true;
                $.storage.set(inputNote.key,inputNote);
            }
        }

        if (haveStored) {
            this.log("updateNote: stored from source=" + source);
        }
        if (changed.added.length > 0)
            this.log("updateNote: added: " + changed.added.join(", "));
        if (changed.changed.length > 0)
            this.log("updateNote: changed: " + changed.changed.join(", "));
        if (changed.deleted.length > 0)
            this.log("updateNote: deleted: " + changed.deleted.join(", "));
        
        if (haveStored)
            uiEvent("noteupdated", {newnote:inputNote, oldnote: storedNote, changes:changed});

        return changed;
    },

    getNote : function(key) {
        return $.storage.get(key);
    },
    /*
     *     options:
     *          deleted : 0/1 (default: 0)
     *          tag : string (default: ""=all)
     *          systemtag : string (default: ""=all)
     *          contentquery : string (default: "" = all)
     *          sort : "modifydate" | "createdate" | "alphabetical" (default: modifydate)
     *          sortdirection: +1/-1 (default: 1)
     */
    getNotes: function(options) {
        var keys = this.getKeys();
        var syncKeys = this.getSyncKeys();
        var notes = [];
        var add;
        var note;
        var regQuery;
        
        if (options && options.contentquery && options.contentquery != "")
            regQuery = options.contentquery;//new RegExp(options.contentquery,"im");

        // filter with options
        for (var i = 0; i<keys.length;i++) {
            add = true;
            note = $.storage.get(keys[i]);
            if (!options) {
                notes.push(note);
                continue;
            }
            
            add &= options.deleted == undefined || note.deleted == options.deleted || options.tag != undefined && options.tag == "#trash#";
            if (!add) continue;

            if (options.tag != undefined && options.tag != "") {
                switch (options.tag) {
                    case "#notag#":
                        add &= note.tags.length == 0;
                        break;
                    case "#trash#":
                        add &= note.deleted == 1;
                        break;
                    case "#all#":
                        add &= note.deleted == 0;
                        break;
                    default:
                        add &= note.tags && note.tags.indexOf(options.tag)>=0;
                }
            }                   
            if (!add) continue;

            add &= regQuery == undefined || note.content.indexOf(regQuery)>=0;
            if (!add) continue;
            
            add &= options.systemtag == undefined || note.systemtags.indexOf(options.systemtag)>=0;

            if (add) {
                if (syncKeys.indexOf(note.key) >= 0)
                    note._syncNote = true;
                notes.push(note);
            }
        }

        // sort with options
        if (!options)
            options={};

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

        // get pinned on top
        //   since chromes array sort isnt stable, we have to stabilize it
        for (i=0; i<notes.length; i++)
            notes[i].index = i;
        notes.sort(function(n1,n2) {            
            var d = (n2.systemtags.indexOf("pinned")>=0?1:0) - (n1.systemtags.indexOf("pinned")>=0?1:0);
            if (d==0) // stabilize
                return n1.index - n2.index;
            else
                return d;
        });
        for (i=0; i<notes.length; i++)
            delete notes[i].index;


        return notes;
    },

    delNote : function(key) {
        var keys = this.getKeys();
        
        if (keys.indexOf(key)>=0) {
            keys.splice(keys.indexOf(key),1);
            $.storage.set(this.keysKey,keys);
            $.storage.del(key);

            uiEvent("notedeleted", {key: key});
            log("delNote:deleting " + key);
        } else
            log("delNote:cannot delete unknown note " + key);
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

        var predeftags = [{tag:"#all#",count:0},{tag:"#notag#",count:0},{tag:"#trash#",count:0}];
        var tags = [];
        var thisnote;
        var thistags;
        var thistagfound;
        $.each(keys,function(keyindex,key) {
            thisnote = $.storage.get(key);
            if (thisnote.deleted != 1) {
                predeftags[0].count++;
                thistags = thisnote.tags;
                if (thistags==undefined || thistags.length == 0) // undefined for syncCreated notes
                    predeftags[1].count++;
                else {
                    $.each(thistags, function(thistagindex,thistag) {
                        thistagfound = false
                        for (var i = 0; i<tags.length; i++) {
                            if (tags[i].tag == thistag) {
                                tags[i].count++;
                                thistagfound = true;
                                break;
                            }
                        }
                        if (!thistagfound)
                            tags.push({tag:thistag,count:1});
                    });
                }
            } else {
                predeftags[2].count++;
            }
        });
        
        tags.sort(function(t1,t2) {var diff = - t1.count + t2.count;return diff!=0?diff:t2.tag<t1.tag;});
        
        return predeftags.concat(tags);
    },
    
    getCreatedNoteTempKey : function() {
        var maxnum = 0;
        var matches;   
        var syncKeys = this.getSyncKeys();
        for (var i = 0; i<syncKeys.length; i++ ) {
            matches = syncKeys[i].match(/creatednote(\d+)/);                        
            if (matches && matches[1] >= maxnum)
                maxnum = matches[1]*1+1;
        }

        return "creatednote" + maxnum;
    },

    addToSyncList : function(key) {
        if (key == undefined || key instanceof Object)
            throw "cannot add undefined key or entire note to synclist"

        var keys = this.getSyncKeys();
        if (keys.indexOf(key)<0) {
            this.log("addToSyncList:"+key);
            keys.push(key);
            $.storage.set(this.syncKeysKey,keys);
            uiEvent("synclistchanged", {added:key});
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
            uiEvent("synclistchanged", {removed:key});
        }
    },

    _reset : function () {
        $.each(this.getKeys(), function (i,e) {
            $.storage.del(e);
        });
        $.each(this.getSyncKeys(), function (i,e) {
            $.storage.del(e);
        });
        $.storage.del(this.keysKey);
        $.storage.del(this.syncKeysKey);
        $.storage.del(this.indexTimeKey);
    },

    _maintain: function () {
        var keys = this.getKeys();
        keys = keys.filter(function(e) {
            var keep = e!=null;
            if (!keep)
                SimplenoteLS.log("maintain:removed invalid key:" + e);
            return keep;
        });
        $.storage.set(this.keysKey,keys);

    },
    
    _info : function() {
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
                this.log("threw error: key=" + key);
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
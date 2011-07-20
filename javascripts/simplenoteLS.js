// ------------------------------------------------------------------------------------------------
// Simplenote localStorage Database.
// ------------------------------------------------------------------------------------------------

//$.storage = new $.store("localStorage",{
//    "json":$.store.serializers.json
//});

var SimplenoteLS = {
    keysKey         : "_keys",
    syncKeysKey     : "_syncKeys",
    indexTimeKey    : "_indexTime",
    storage         : localStorage,
    extData         : extData,
    chrome          : chrome,

    log : function(s) {
        if (this.extData.debugFlags.LS)
            logGeneral(s,"SimplenoteLS");
    },

    addCustomFields: function(note) {
        if (!note)
            return null;
        
        if (!note.key)
            return note;
        
        note._syncNote = this.getSyncKeys().indexOf(note.key) >= 0;             
        
        return note;
    },

    indexTime : function(newIndexTime) {
        if (newIndexTime) {
            this.log("indexTime:setting new indexTime:" + convertDate(newIndexTime) );
            this._setVal(this.indexTimeKey,newIndexTime);
        } else
            return this._getVal(this.indexTimeKey);
    },

    haveNote : function(key) {
        var keys = this.getKeys();
        return keys.indexOf(key)>=0;
    },

    addNote : function(note) {

        if (!note || !note.key) {
            console.log(note);
            throw new Error("cannot add empty note or note without key");
        }
        if ( note.key == "") {
            console.log(note);
            throw new Error("cannot add note with empty key");
        }
        if (this.haveNote(note.key)) {
            console.log(note);
            throw new Error("cannot add note, note already in LS");
        }
        this.log("addNote, note: ");
        this.log(note);

        var keys = this.getKeys();
        keys.push(note.key);

        this._setVal(this.keysKey,keys);
        this._setVal(note.key,note);
            
        uiEvent("noteadded", {note:this.addCustomFields(note)});
    },

    // source: local, getnote, updateresponse, index, cm
    updateNote : function(inputNote, source) {

        if (!inputNote || !inputNote.key) {
            console.log(inputNote);
            throw new Error("cannot update with empty note or note without key");
        }
        
        if (inputNote.key == "") {
            console.log(inputNote);
            throw new Error("cannot update note with empty key");
        }

        var storedNote = this.getNote(inputNote.key);

        if (!storedNote) {
            console.log(inputNote);
            throw new Error("cannot update note, note not in LS");
        }

        // simplenote api bug: publishing does not increase syncnum
        var changed = {hadChanges: false, added:[],changed:[], deleted:[]};
        var inputFields = [];

        // look at inputNote, compare fields to storedNote
        for (var inputField in inputNote) {
            inputFields.push(inputField);

            if (storedNote[inputField] === undefined ) {
                changed.added.push(inputField);
            } else if ((storedNote[inputField] instanceof Array) && !arrayEqual(storedNote[inputField],inputNote[inputField])) {
                changed.changed.push(inputField);
            } else if (!(storedNote[inputField] instanceof Array) && storedNote[inputField] != inputNote[inputField]) {
                changed.changed.push(inputField);
            }
        }
        // see whether all fields are still there
        for (var storedField in storedNote) {
            if (inputFields.indexOf(storedField)<0 && storedField != "content" && storedField != "encrypted") {
                changed.deleted.push(storedField);
            }
        }
        changed.hadChanges = changed.added.length > 0 || changed.changed.length > 0 || changed.deleted.length > 0;

//        if (storedNote.encrypted != undefined)
//            inputNote.encrypted = storedNote.encrypted;

        var haveStored = false, onlyLocalContent;
        if (source == "local" || source == "getnote" || source=="cm") {
            haveStored = true;
            if (source=="local")
                inputNote.systemtags.sort();
            this._setVal(inputNote.key,inputNote);
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
                this._setVal(inputNote.key,inputNote);
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
            uiEvent("noteupdated", {newnote:this.addCustomFields(inputNote), oldnote: storedNote, changes:changed, source:source});

        return changed;
    },

    getNote : function(key) {
        return this.addCustomFields(this._getVal(key));
    },
    /*
     *     options:
     *          deleted : 0/1 (default: 0)
     *          tag : string (default: ""=all)
     *          systemtag : string (default: ""=all)
     *          contentquery : string (default: "" = all)
     *          sort : "modifydate" | "createdate" | "alphabetical" (default: modifydate)
     *          sortdirection: +1/-1 (default: 1)
     *          regex: only include by content regex (default: undefined = all)
     *          notregex: exclude by content regex (default: undefined = none)
     */
    getNotes: function(options) {
        var keys = this.getKeys();
        var notes = [];
        var add;
        var note;
        var words;
        var wordexps;
        var regex, notregex;
        var getall = false;

        if (!options) {
            options={};
            getall = true;
        }

        if (options.contentquery && options.contentquery != "") {
            words = options.contentquery.split(" ").filter(function(w) {return w != ""});
            wordexps = words.map(function(word) {return new RegExp(RegExp.escape(word),'gi');});
        }
        if (typeof options.regex == "string")
            regex = new RegExp(options.regex,"m");

        if (typeof options.notregex == "string")
            notregex = new RegExp(options.notregex,"m");

        // filter with options
        for (var i = 0; i<keys.length;i++) {
            add = true;
            note = this._getVal(keys[i]);
            if (!note)
                continue;
            
            if (getall) {
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
                    case "#published#":
                        add &= note.systemtags.indexOf("published") >= 0;
                        break;
                    case "#shared#":
                        add &= note.systemtags.indexOf("shared") >= 0;
                        break;
                    case "#webnote#":
                        add &= note.content != undefined && note.content.match(this.extData.webnotereg) != undefined;
                        break;
                    case "#markdown#":
                        add &= note.systemtags.indexOf("markdown") >= 0;
                        break;
                    default:
                        add &= note.tags != undefined && note.tags.indexOf(options.tag)>=0;
                }
            }
            if (!add) continue;

//            if (wordexps)
//                for (var j=0; j<wordexps.length; j++)
//                    add &= note.content.match(wordexps[j]) != undefined;
//
            if (options.contentquery && options.contentquery !="") {
                if (note.content == undefined)
                    add = false;
                else {
                    note._score = 0;
                    for (var j=0; j<words.length; j++)
                        note._score += note.content.score(words[j]);
                    for (var j=0; j<wordexps.length; j++)
                        note._score += note.content.match(wordexps[j]) != undefined ? 1:0;
                    add &= note._score > 0;
                }
            }

            if (!add) continue;

            if (regex != undefined)
                add &= note.content != undefined && note.content.match(regex) != undefined;

            if (notregex != undefined)
                add &= note.content == undefined || note.content.match(notregex) == undefined || note.systemtags.indexOf("pinned") >= 0; // workaround, notregex only used for webnotes by now

            if (!add) continue;

            add &= options.systemtag == undefined || note.systemtags.indexOf(options.systemtag)>=0;

            if (add) {                
                notes.push(this.addCustomFields(note));
            }
        }

        // sort with options
        if (options.sortdirection == undefined)
            options.sortdirection = 1;

        if (options.contentquery && options.contentquery !="") {
            notes.sort(function(note1,note2) {
                return note2._score - note1._score;
            });
            //notes = notes.map(function(note) { delete note._score; return note;});
        } else if (options.sort == undefined || options.sort == "modifydate")
            notes.sort(function(note1,note2) {
                return options.sortdirection*(note2.modifydate-note1.modifydate);
            });
        else if (options.sort == "createdate")
            notes.sort(function(note1,note2) {
                return options.sortdirection*(note2.createdate-note1.createdate);
            });
        else if (options.sort == "alpha")
            notes.sort(function(note1,note2) {
                if (!note1.content && !note2.content)
                    return 0;
                else if (!note1.content)
                    return options.sortdirection;
                else if (!note2.content)
                    return -options.sortdirection;
                
                var c1 = note1.content.trim().toLowerCase();
                var c2 = note2.content.trim().toLowerCase();

                if (c1 < c2)
                    return -options.sortdirection;
                if (c1 > c2)
                    return options.sortdirection;
                return 0
            });

        // get pinned on top
        //   since chromes array sort isnt stable, we have to stabilize it
        if (options.contentquery == undefined || options.contentquery =="") {
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
        }

        return notes;
    },

    delNote : function(key) {
        var keys = this.getKeys();

        if (keys.indexOf(key)>=0) {
            keys.splice(keys.indexOf(key),1);
            this._setVal(this.keysKey,keys);
            this._delVal(key);

            uiEvent("notedeleted", {key: key});
            this.log("delNote:deleting " + key);
        } else
            this.log("delNote:cannot delete unknown note " + key);
    },

    getKeys : function() {
        var keys = this._getVal(this.keysKey);
        if (!keys)
            keys = [];
        return keys;
    },

    getSyncKeys : function() {
        var keys = this._getVal(this.syncKeysKey);
        if (!keys)
            keys = [];
        return keys;
    },
    getTags : function(options) {
        if (!options)
            options = {};
        if (options.sort === undefined)
            options.sort = "frequency";
        if (options.predef === undefined)
            options.predef = true;
        
        var keys = this.getKeys();

        var predeftags = [{tag:"#all#",count:0},{tag:"#notag#",count:0},{tag:"#trash#",count:0},{tag:"#published#",count:0},{tag:"#shared#",count:0},{tag:"#webnote#",count:0},{tag:"#markdown#",count:0}];
        var tags = [];
        var thisnote;
        var thistags;
        var thissystemtags;
        var thistagfound, key, thistag;
        for (var k=0; k<keys.length;k++) {
            key = keys[k];
            thisnote = SimplenoteLS._getVal(key);
            if (thisnote.deleted != 1) {
                predeftags[0].count++;
                thistags = thisnote.tags;
                thissystemtags = thisnote.systemtags;
                if (thistags==undefined || thistags.length == 0) // undefined for syncCreated notes
                    predeftags[1].count++;
                else {
                    for (var j=0; j<thistags.length; j++) {
                        thistag = thistags[j];
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
                    }
                }
                if (thissystemtags != undefined && thissystemtags.indexOf("shared") >= 0)
                    predeftags[4].count++;
                if (thissystemtags != undefined && thissystemtags.indexOf("published") >= 0)
                    predeftags[3].count++;
                if (thissystemtags != undefined && thissystemtags.indexOf("markdown") >= 0)
                    predeftags[6].count++;
                if (thisnote.content != undefined && thisnote.content.match(this.extData.webnotereg)) {
                    predeftags[5].count++;
                    predeftags[0].count--;
                }
            } else {
                predeftags[2].count++;
            }
        }

        if (options.sort == "frequency")
            tags.sort(function(t1,t2) {var diff = - t1.count + t2.count;return diff!=0?diff:(t2.tag<t1.tag?1:-1);});
        else if (options.sort == "alpha")
            tags.sort(function(t1,t2) {return t2.tag<t1.tag?1:-1});

        if (options.predef)
            return predeftags.concat(tags);
        else
            return tags;
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
            throw new Error("cannot add undefined key or entire note to synclist");

        var keys = this.getSyncKeys();
        if (keys.indexOf(key)<0) {
            this.log("addToSyncList:"+key);
            keys.push(key);
            this._setVal(this.syncKeysKey,keys);
            uiEvent("synclistchanged", {added:key});            
        }
        if (keys.length > 0)
            this.chrome.browserAction.setIcon({path: "/images/icon_24_sync.png"});
    },

    removeFromSyncList : function(key) {

        var keys = this.getSyncKeys();
        if (keys.indexOf(key)>=0) {
            this.log("removeFromSyncList:"+key);
            keys.splice(keys.indexOf(key),1);
            if (keys.length == 0)
                this._delVal(this.syncKeysKey);
            else
                this._setVal(this.syncKeysKey,keys);
            uiEvent("synclistchanged", {removed:key});            
        }
        if (keys.length == 0)
            this.chrome.browserAction.setIcon({path: "/images/icon_24.png"});        
    },

//    sanitizeSyncList : function() {
//        var syncKeys = this.getSyncKeys();
//        var keys = this.getKeys();
//        for (var i = 0; i<syncKeys.length; i++)
//            if (keys.indexOf(syncKeys[i]) < 0)
//                this.removeFromSyncList(syncKeys[i]);
//    },

    _reset : function () {
        $.each(this.getKeys(), function (i,e) {
            SimplenoteLS._delVal(e);
        });
        $.each(this.getSyncKeys(), function (i,e) {
            SimplenoteLS._delVal(e);
        });
        this._delVal(this.keysKey);
        this._delVal(this.syncKeysKey);
        this._delVal(this.indexTimeKey);
    },

    _maintain: function () {
        var keys = this.getKeys();
        keys = keys.filter(function(e) {
            var keep = e!=null && e!="" && e!=undefined && SimplenoteLS.getNote(e) != undefined;
            if (!keep) {
                SimplenoteLS.log("maintain:removed invalid key:" + e);
                _gaq.push(["_trackEvent","simplenoteLS","key removed"])
            }
            return keep;
        });
        this._setVal(this.keysKey,keys);

//    },
//
//    _info : function() {
//        var keys = this.getKeys();
//        this.log("last index received " + dateAgo(this.indexTime()));
//        this.log("LS keys array has " + keys.length + " keys.");
//        var notes = this.getNotes();
//        this.log("LS notes " + notes.length + ".");
//        var synckeys = this.getSyncKeys();
//        this.log("LS has " + synckeys.length + " notes to sync.");
//        var item, key;
//        for (var i = 0; i < localStorage.length; i++){
//            key = localStorage.key(i);
//            try {
//                item = $.storage.get(key);
//                if (keys.indexOf(key)<0 && item.deleted !== undefined && item.deleted != 0) {
//                    this.log("Notes not in Keys: key=" + key);
//                    logNote(item);
//                }
//            } catch (e) {
//                this.log("threw error: key=" + key);
//            }
//
//        }
//        for (var i = 0; i < keys.length; i++){
//            key = keys[i];
//            try {
//                item = $.storage.get(key);
//                if (!item || !item.key) {
//                    this.log("Key without note: key=" + key);
//                }
//            } catch (e) {
//                this.log("threw error: key=" + key);
//            }
//
//        }

    },

    _getVal: function(key) {
        var raw = this.storage[key];
        if (raw != undefined)
            return JSON.parse(raw);
        else
            return undefined;
    },

    _setVal: function(key,val) {
        this.storage[key] = JSON.stringify(val);
    },

    _delVal: function(key) {
        delete this.storage[key];
    }

}
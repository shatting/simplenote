/*
 * Simplenote Context Menu Onject
 *
 */
// selection:
// {"editable":false,"menuItemId":1,"pageUrl":"http://derstandard.at/r2140/Switchlist","selectionText":"Kalender Girls\n20.15 bis 22.25 | Super RTL | SOZIALKOMÖDIE | Calendar Girls, GB/USA 2003, Nigel Cole"}
// {"favIconUrl":"http://derstandard.at/favicon.ico","id":16,"incognito":false,"index":4,"pinned":false,"selected":true,"status":"complete","title":"Switchlist - derStandard.at › Etat › Medien › TV","url":"http://derstandard.at/r2140/Switchlist","windowId":1}

// page:
//{"editable":false,"menuItemId":1,"pageUrl":"http://derstandard.at/r2140/Switchlist"}
//{"favIconUrl":"http://derstandard.at/favicon.ico","id":16,"incognito":false,"index":4,"pinned":false,"selected":true,"status":"complete","title":"Switchlist - derStandard.at › Etat › Medien › TV","url":"http://derstandard.at/r2140/Switchlist","windowId":1}

// link:
//{"editable":false,"linkUrl":"http://derstandard.at/1302515898810/Dienstag-Kalender-Girls","menuItemId":1,"pageUrl":"http://derstandard.at/r2140/Switchlist"}
//{"favIconUrl":"http://derstandard.at/favicon.ico","id":16,"incognito":false,"index":4,"pinned":false,"selected":true,"status":"complete","title":"Switchlist - derStandard.at › Etat › Medien › TV","url":"http://derstandard.at/r2140/Switchlist","windowId":1}

// image:
// {"editable":false,"linkUrl":"http://derstandard.at/1302515898341/Dienstag-American-Psycho","mediaType":"image","menuItemId":1,"pageUrl":"http://derstandard.at/r2140/Switchlist","srcUrl":"http://images.derstandard.at/t/107/2011/04/11/1302517599597.jpg"}
//{"favIconUrl":"http://derstandard.at/favicon.ico","id":16,"incognito":false,"index":3,"pinned":false,"selected":true,"status":"complete","title":"Switchlist - derStandard.at › Etat › Medien › TV","url":"http://derstandard.at/r2140/Switchlist","windowId":1}

// handle omnibox
//chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
//    var notes = SimplenoteLS.getNotes({query:text,deleted:0});
//    for (var i=0; i<notes.length; i++) {
//        notes[i].description = notes[i].content.substr(0, Math.min(notes[i].content.length,40));
//        notes[i].content = notes[i].key;
//    }
//    suggest(notes);
//});
//
//        Selection ###############################
//        INFO:-------
//        {
//            "editable":false,
//            "linkUrl":"http://derstandard.at/1303950559403/Sonntag-Workingmans-Death",
//            "mediaType":"image",
//            "menuItemId":2,
//            "pageUrl":"http://derstandard.at/1303950558961/Sonntag-Erik-der-Wikinger",
//            "selectionText":"23.30 bis 1.30 | ORF 2 | DOKUMENTARFILM | Ö",
//            "srcUrl":"http://images.derstandard.at/t/1/2011/04/29/1303957348544.jpg"
//        }
//        TAB:--------
//        {
//            "favIconUrl":"http://derstandard.at/favicon.ico",
//            "id":2,
//            "incognito":false,
//            "index":0,
//            "pinned":false,
//            "selected":true,
//            "status":"complete",
//            "title":"Erik, der Wikinger - Switchlist - derStandard.at › Etat",
//            "url":"http://derstandard.at/1303950558961/Sonntag-Erik-der-Wikinger",
//            "windowId":1
//        }
//
//        IMG SRC ###############################
//        INFO:-------
//        {
//            "editable":false,
//            "linkUrl":"http://derstandard.at/1303950558961/Sonntag-Erik-der-Wikinger",
//            "mediaType":"image",
//            "menuItemId":4,
//            "pageUrl":"http://derstandard.at/r2140/Switchlist",
//            "srcUrl":"http://images.derstandard.at/t/108/2011/04/29/1303957331786.jpg"
//        }
//        TAB:--------
//        {
//            "favIconUrl":"http://derstandard.at/favicon.ico",
//            "id":2,
//            "incognito":false,
//            "index":0,
//            "pinned":false,
//            "selected":true,
//            "status":"complete",
//            "title":"Switchlist - derStandard.at › Etat › Medien › TV",
//            "url":"http://derstandard.at/r2140/Switchlist",
//            "windowId":1
//        }
//
//        Link Url: ###############################
//        INFO:-------
//        {
//            "editable":false,
//            "linkUrl":"http://derstandard.at/1303950558961/Sonntag-Erik-der-Wikinger",
//            "mediaType":"image",
//            "menuItemId":7,
//            "pageUrl":"http://derstandard.at/r2140/Switchlist",
//            "srcUrl":"http://images.derstandard.at/t/108/2011/04/29/1303957331786.jpg"
//        }
//        TAB:--------
//        {
//            "favIconUrl":"http://derstandard.at/favicon.ico",
//            "id":2,
//            "incognito":false,
//            "index":0,
//            "pinned":false,
//            "selected":true,
//            "status":"complete",
//            "title":"Switchlist - derStandard.at › Etat › Medien › TV",
//            "url":"http://derstandard.at/r2140/Switchlist",
//            "windowId":1
//        }
//
//        Page Url:###############################
//        INFO:-------
//        {
//            "editable":false,
//            "menuItemId":1,
//            "pageUrl":"http://derstandard.at/r2140/Switchlist"
//        }
//
//        TAB:--------
//        {
//            "favIconUrl":"http://derstandard.at/favicon.ico",
//            "id":2,
//            "incognito":false,
//            "index":0,
//            "pinned":false,
//            "selected":true,
//            "status":"complete",
//            "title":"Switchlist - derStandard.at › Etat › Medien › TV",
//            "url":"http://derstandard.at/r2140/Switchlist",
//            "windowId":1
//        }

function CMitem(options, parentCMitem) {

    if (parentCMitem) {
        this.parentCMitem = parentCMitem;
        this.options = mergeobj(options,{parentId:parentCMitem.id});
        this.parentCMitem._addChild(this);
    } else
        this.options = options;

    this.childs = [];
    this.id = chrome.contextMenus.create(this.options);
}

CMitem.prototype.update = function(options) {
    chrome.contextMenus.update(this.id, options, function() {
        this.options = mergeobj(this.options,options);
    })
}

CMitem.prototype.remove = function() {
    chrome.contextMenus.remove(this.id);
    if (this.parentCMitem)
        this.parentCMitem._removeChild(this.id);
}

CMitem.prototype._addChild = function(childCMitem) {
    if (!this.options.contexts)
        this.options.contexts = [];

    this.childs.push(childCMitem);

//    var needUpdate = false;
//    var context;
//    for(var i in childCMitem.options.contexts) {
//        context = childCMitem.options.contexts[i];
//        if (this.options.contexts.indexOf(context)<0) {
//            this.options.contexts.push(context);
//            needUpdate = true;
//        }
//    }
//
//
//    if (needUpdate && this.options.contexts.length > 0)
//        this.update({contexts:this.options.contexts})
}

CMitem.prototype._removeChild = function(childId) {
    if (this.childs.indexOf(childId) < 0)
        return;

    //var childToRemove = this.childs[this.childs.indexOf(childId)];
    this.childs.splice(this.childs.indexOf(childId),1);

//    var needUpdate = false;
//    var context;
//    for (var i in childToRemove.contexts) {
//        context = childToRemove.contexts[i];
//        var canremovecontext = true;
//        for(var child in this.childs) {
//            if (child.contexts.indexOf(context)>0) {
//                canremovecontext = false;
//                break;
//            }
//        }
//        if (canremovecontext) {
//            this.options.contexts.splice(this.options.contexts.indexOf(context),1);
//            needUpdate = true;
//        }
//    }
//
//    if (needUpdate)
//        this.update({contexts:this.options.contexts})
}

function getNoteHeading(key,maxlength) {
    if (!key)
        return "last open";

    var note = SimplenoteLS.getNote(key);

    if(note.content == "")
        return "(empty note)";

    var nonemptylines = note.content.split("\n").filter(function(line) {return line.trim().length > 0;});
    var title = "last open"
    if (nonemptylines.length > 0 && nonemptylines[0].length <= maxlength)
        title= '"' + nonemptylines[0].trim() + '"';
    else if (nonemptylines.length > 0)
        title = '"' + nonemptylines[0].trim().substring(0, maxlength-3) + '.."';
    return title;
}

var SimplenoteCM = {

    contextmenu_ids : {},

    create_root: null,
    append_root: null,
    append_pinned_root: null,

    populate: function(on) {

        chrome.contextMenus.removeAll();
        
        if (!localStorage.option_email)
            return;
        
        if ((on != undefined && !on) || (localStorage.option_contextmenu != undefined && localStorage.option_contextmenu == "false"))
            return;

        var title;
        // create
        this.create_root = new CMitem({title:"Create a note", contexts:["selection","page","image","link"]});
        new CMitem({title:"..from selection", contexts:["selection"],onclick: function(info, tab){
                        _gaq.push(['_trackEvent', 'ContextMenu', 'create_selection']);
                        SimplenoteCM.createNoteFromBG({content:info.selectionText + "\n" + "[Source: " + tab.url + "]"});
                    }}, this.create_root);
        new CMitem({title:"..from page url", contexts:["page"], onclick: function(info, tab){
                        _gaq.push(['_trackEvent', 'ContextMenu', 'create_url']);
                        SimplenoteCM.createNoteFromBG({content:info.pageUrl});
                    }}, this.create_root);
        new CMitem({title:"..from link url", contexts:["link"], onclick: function(info, tab){
                    _gaq.push(['_trackEvent', 'ContextMenu', 'create_link_url']);
                    SimplenoteCM.createNoteFromBG({content:info.linkUrl});
                }}, this.create_root);
        new CMitem({title:"..from image url", contexts:["image"], onclick: function(info, tab){
                    _gaq.push(['_trackEvent', 'ContextMenu', 'create_image_url']);
                    SimplenoteCM.createNoteFromBG({content:info.srcUrl});
                }}, this.create_root);

        // append last open
        if (localStorage.lastopennote_key && SimplenoteLS.getNote(localStorage.lastopennote_key)) {
            title = getNoteHeading(localStorage.lastopennote_key,25);
            this.append_root = new CMitem({title:"Append to " + title + "", contexts:["selection","page","image","link"]});

            new CMitem({title:"..from selection", contexts:["selection"], onclick: function(info, tab){
                    _gaq.push(['_trackEvent', 'ContextMenu', 'append_selection']);
                    SimplenoteCM.appendToNoteFromBG(info.selectionText + "\n" + "[Source: " + tab.url + "]", localStorage.lastopennote_key);
                }}, this.append_root);
            new CMitem({title:"..from page url", contexts:["page"], onclick: function(info, tab){
                    _gaq.push(['_trackEvent', 'ContextMenu', 'append_url']);
                    SimplenoteCM.appendToNoteFromBG(info.pageUrl, localStorage.lastopennote_key);
                }}, this.append_root);
            new CMitem({title:"..from link url", contexts:["link"],  onclick: function(info, tab){
                    _gaq.push(['_trackEvent', 'ContextMenu', 'append_link_url']);
                    SimplenoteCM.appendToNoteFromBG(info.linkUr, localStorage.lastopennote_key);
                }}, this.append_root);
            new CMitem({title:"..from image url", contexts:["image"], onclick: function(info, tab){
                    _gaq.push(['_trackEvent', 'ContextMenu', 'append_image_url']);
                    SimplenoteCM.appendToNoteFromBG(info.srcUrl, localStorage.lastopennote_key);
                }}, this.append_root);
        }


        var pinned = SimplenoteLS.getNotes({deleted:0,sort:"alpha",systemtag:"pinned"});
        if (pinned.length>0) {
            this.append_pinned_root = new CMitem({title:"Append to pinned", contexts:["selection","page","image","link"]});
            for (var i in pinned) {
                SimplenoteDB.getNote(pinned[i].key, function(note) {
                    title = getNoteHeading(note.key,25);
                    var pinnedCM = new CMitem({title:title, contexts:["all"]}, SimplenoteCM.append_pinned_root);

                    new CMitem({title:"..from selection", contexts:["selection"], onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'append_selection']);
                            SimplenoteCM.appendToNoteFromBG(info.selectionText + "\n" + "[Source: " + tab.url + "]", note.key, true);
                        }}, pinnedCM);
                    new CMitem({title:"..from page url", contexts:["page"], onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'append_url']);
                            SimplenoteCM.appendToNoteFromBG(info.pageUrl, note.key, true);
                        }}, pinnedCM);
                    new CMitem({title:"..from link url", contexts:["link"],  onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'append_link_url']);
                            SimplenoteCM.appendToNoteFromBG(info.linkUr, note.key, true);
                        }}, pinnedCM);
                    new CMitem({title:"..from image url", contexts:["image"], onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'append_image_url']);
                            SimplenoteCM.appendToNoteFromBG(info.srcUrl, note.key, true);
                        }}, pinnedCM);
                });

            }
        }

    },

    updateLastOpen: function() {
        var title = getNoteHeading(localStorage.lastopennote_key,25);
        if (!title)
            return;
        
        if (!this.append_root)
            this.populate();
        
        if (this.append_root)
            this.append_root.update({title:"Append to " + title + ""});
    },

    appendToNoteFromBG: function(string, key, setLastOpen) {
        SimplenoteCM.signalProcessing();

        SimplenoteDB.getNote(key,function(oldnote) {
            oldnote.content += "\n" + string;
            oldnote.source = "cm";
            SimplenoteDB.updateNote(oldnote, function(note) {
                if (note) {
                    localStorage.lastopennote_open = "true";

                    var lines = note.content.split("\n");
                    var caretScroll = {line:"lastline", character: lines[lines.length-1].length};
                    localStorage[note.key+"_caret"] = JSON.stringify(caretScroll);
                    if (setLastOpen) {
                        localStorage.lastopennote_key = note.key;
                        SimplenoteCM.updateLastOpen();
                    }
                    SimplenoteCM.signalSuccess();
                } else
                    SimplenoteCM.signalError()

            });
        });
    },

    createNoteFromBG: function(note) {
        SimplenoteCM.signalProcessing();
        SimplenoteDB.createNote(note, function(note) {
            if (note) {
                localStorage.lastopennote_key = note.key;
                localStorage.lastopennote_open = "true";
                SimplenoteCM.updateLastOpen();
                SimplenoteCM.signalSuccess();
            } else
                SimplenoteCM.signalError();
        });
    },

    signalProcessing: function() {
        chrome.browserAction.setBadgeText({text:"..."});
        chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,128]});
    },

    signalSuccess: function() {
        chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,128]});
        chrome.browserAction.setBadgeText({text:"ok"});
        setTimeout('chrome.browserAction.setBadgeText({text:""});', 2000);
    },

    signalError: function() {
        chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,128]});
        chrome.browserAction.setBadgeText({text:"err"});
        setTimeout('chrome.browserAction.setBadgeText({text:""});', 4000);
    }
}


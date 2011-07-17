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
    
    if (!note)
        return "(unknown note)";

    if(note.content == undefined)
        return "(unloaded note)";

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

    create_root: null,
    append_root: null,
    append_pinned_root: null,

    cascading: true,

    log : function(s) {
        if (extData.debugFlags.CM)
            logGeneral(s,"SimplenoteCM");
    },

    populate: function() {

        try {
            this.log("populate()");

            chrome.contextMenus.removeAll();

            this.append_root = null;
            this.create_root = null;
            this.append_pinned_root = null;

            if (!SimplenoteSM.haveLogin() || !SimplenoteSM.credentialsValid() || (localStorage.option_contextmenu != undefined && localStorage.option_contextmenu == "false"))
                return;

            this.cascading = localStorage.option_contextmenu_cascading == "true";
            this.cascading_pinned = localStorage.option_contextmenu_cascading_pinned == "true";

            var title, lastopen_key = localStorage.lastopennote_key;

            new CMitem({title:chrome.i18n.getMessage("cm_new_webnote"), contexts:["all"], onclick: function(info, tab) {
                SimplenoteBG.handleRequest({action: "webnotes", request: {action: "new"}});
            }});

            new CMitem({type:"separator", contexts:["all"]});

            // create
            if (this.cascading)
                this.create_root = new CMitem({title:chrome.i18n.getMessage("cm_create_note"), contexts:["selection","page","image","link"]});

            new CMitem({title:this.getCMtitle("cm_create_note","cm_using_selection"), contexts:["selection"],onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'create_selection']);
                            SimplenoteCM.createNoteFromBG({content:info.selectionText + "\n" + "[Source: " + tab.url + "]\n"});
                        }}, this.create_root);
            new CMitem({title:this.getCMtitle("cm_create_note","cm_using_page_url"), contexts:["page"], onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'create_url']);
                            SimplenoteCM.createNoteFromBG({content:info.pageUrl});
                        }}, this.create_root);
            new CMitem({title:this.getCMtitle("cm_create_note","cm_using_link_url"), contexts:["link"], onclick: function(info, tab){
                        _gaq.push(['_trackEvent', 'ContextMenu', 'create_link_url']);
                        SimplenoteCM.createNoteFromBG({content:info.linkUrl});
                    }}, this.create_root);
            new CMitem({title:this.getCMtitle("cm_create_note","cm_using_image_url"), contexts:["image"], onclick: function(info, tab){
                        _gaq.push(['_trackEvent', 'ContextMenu', 'create_image_url']);
                        SimplenoteCM.createNoteFromBG({content:info.srcUrl});
                    }}, this.create_root);

            // append last open
            if (lastopen_key) {
                var lastopen = SimplenoteLS.getNote(lastopen_key);
                if (lastopen && lastopen.deleted != 1) {
                    if (!this.cascading)
                        new CMitem({type:"separator", contexts:["all"]});

                    title = getNoteHeading(lastopen_key,25);

                    if (this.cascading)
                        this.append_root = new CMitem({title:chrome.i18n.getMessage("cm_append_to",title), contexts:["selection","page","image","link"]});

                    new CMitem({title:this.getCMtitle("cm_append_to","cm_using_selection", title), contexts:["selection"], onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'append_selection']);
                            SimplenoteCM.appendToNoteFromBG(info.selectionText + "\n" + "[Source: " + tab.url + "]", lastopen_key);
                        }}, this.append_root);
                    new CMitem({title:this.getCMtitle("cm_append_to","cm_using_page_url", title), contexts:["page"], onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'append_url']);
                            SimplenoteCM.appendToNoteFromBG(info.pageUrl, lastopen_key);
                        }}, this.append_root);
                    new CMitem({title:this.getCMtitle("cm_append_to","cm_using_link_url", title), contexts:["link"],  onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'append_link_url']);
                            SimplenoteCM.appendToNoteFromBG(info.linkUrl, lastopen_key);
                        }}, this.append_root);
                    new CMitem({title:this.getCMtitle("cm_append_to","cm_using_image_url", title), contexts:["image"], onclick: function(info, tab){
                            _gaq.push(['_trackEvent', 'ContextMenu', 'append_image_url']);
                            SimplenoteCM.appendToNoteFromBG(info.srcUrl, lastopen_key);
                        }}, this.append_root);
                }
            }

            var pinned = SimplenoteLS.getNotes({deleted:0,sort:"alpha",systemtag:"pinned"});
            if (pinned.length>0) {

                if (!this.cascading && (pinned.length > 1 || lastopen_key != pinned[0].key) )
                    new CMitem({type:"separator", contexts:["all"]});

                if (this.cascading_pinned)
                    this.append_pinned_root = new CMitem({title:chrome.i18n.getMessage("cm_append_to_pinned"), contexts:["selection","page","image","link"]});

                for (var i = 0; i < pinned.length;i++) {
                    if (pinned[i] == undefined || pinned[i].key == undefined)
                        continue;
                    if (lastopen_key == pinned[i].key)
                        continue;

                    SimplenoteDB.getNote(pinned[i].key, function(note) {
                        
                        if (!note)
                            return;
                        
                        title = getNoteHeading(note.key,25);

                        if (SimplenoteCM.cascading_pinned)
                            var pinnedCM = new CMitem({title:title, contexts:["all"]}, SimplenoteCM.append_pinned_root);

                        new CMitem({title:SimplenoteCM.getCMtitle("cm_append_to","cm_using_selection", title, true), contexts:["selection"], onclick: function(info, tab){
                                _gaq.push(['_trackEvent', 'ContextMenu', 'append_selection']);
                                SimplenoteCM.appendToNoteFromBG(info.selectionText + "\n" + "[Source: " + tab.url + "]", note.key, true);
                            }}, pinnedCM);
                        new CMitem({title:SimplenoteCM.getCMtitle("cm_append_to","cm_using_page_url", title, true), contexts:["page"], onclick: function(info, tab){
                                _gaq.push(['_trackEvent', 'ContextMenu', 'append_url']);
                                SimplenoteCM.appendToNoteFromBG(info.pageUrl, note.key, true);
                            }}, pinnedCM);
                        new CMitem({title:SimplenoteCM.getCMtitle("cm_append_to","cm_using_link_url", title, true), contexts:["link"],  onclick: function(info, tab){
                                _gaq.push(['_trackEvent', 'ContextMenu', 'append_link_url']);
                                SimplenoteCM.appendToNoteFromBG(info.linkUrl, note.key, true);
                            }}, pinnedCM);
                        new CMitem({title:SimplenoteCM.getCMtitle("cm_append_to","cm_using_image_url", title, true), contexts:["image"], onclick: function(info, tab){
                                _gaq.push(['_trackEvent', 'ContextMenu', 'append_image_url']);
                                SimplenoteCM.appendToNoteFromBG(info.srcUrl, note.key, true);
                            }}, pinnedCM);
                    });

                }
            }
        } catch (e) {
            exceptionCaught(e);
        }

    },

    updateLastOpen: function() {

        try {
            this.log("updateLastOpen()");

            if (!localStorage.lastopennote_key) {
                if (this.append_root)
                    this.append_root.remove();
                else
                    this.populate();

                this.append_root = null;
                return;
            }

            var title = getNoteHeading(localStorage.lastopennote_key,25);
            if (!title)
                return;

            if (!this.append_root) {
                this.populate();
                return;
            }

            var needPop = false;
            try {
                if (this.append_root)
                    this.append_root.update({title:chrome.i18n.getMessage("cm_append_to",title)});
            } catch (e) {
                needPop = true;
            }
            if (needPop)
                this.populate();
        } catch (e) {
            exceptionCaught(e);
        }
    },

    getCMtitle: function(mainId, subId, title, pinned) {
        if ((this.cascading && !(pinned && !this.cascading_pinned)) || (pinned && this.cascading_pinned))
            return ".." + chrome.i18n.getMessage(subId)
        else
            return chrome.i18n.getMessage(mainId, title) + " (" + chrome.i18n.getMessage(subId) + ")";
    },

    appendToNoteFromBG: function(string, key, setLastOpen) {
        SimplenoteCM.signalProcessing();

        SimplenoteDB.getNote(key,function(oldnote) {
            if (oldnote.content) {
                if (oldnote.systemtags.indexOf("markdown") > -1) {
                    oldnote.content += "  \n" + string + "\n";
                } else
                    oldnote.content += "\n" + string + "\n";
                oldnote.source = "cm";
                SimplenoteDB.updateNote(oldnote, function(note) {
                    try {
                        if (note) {
                            localStorage.lastopennote_open = "true";

                            if (note.content) {
                                var lines = note.content.split("\n");
                                var caretScroll = {line:"lastline", character: lines[lines.length-1].length};
                                localStorage[note.key+"_caret"] = JSON.stringify(caretScroll);
                            } else {
                                localStorage[note.key+"_caret"] = JSON.stringify({line:"lastline", character:1});
                            }
                            if (setLastOpen) {
                                localStorage.lastopennote_key = note.key;
                                SimplenoteCM.updateLastOpen();
                            }
                            SimplenoteCM.signalSuccess();
                        } else
                            SimplenoteCM.signalError()
                    } catch(e) {
                        exceptionCaught(e);
                    }

                });
            } else {
                SimplenoteBG.signalError();
            }
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
        try {
            chrome.browserAction.setBadgeText({text:"..."});
            chrome.browserAction.setBadgeBackgroundColor({color:[0,255,255,128]});
        } catch (e) {
            exceptionCaught(e);
        }
    },

    signalSuccess: function() {
        try {
            chrome.browserAction.setBadgeBackgroundColor({color:[0,255,0,128]});
            chrome.browserAction.setBadgeText({text:"ok"});
            setTimeout('chrome.browserAction.setBadgeText({text:""});', 2000);
        } catch (e) {
            exceptionCaught(e)
        }
    },

    signalError: function() {
        try {
            chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,128]});
            chrome.browserAction.setBadgeText({text:"err"});
            setTimeout('chrome.browserAction.setBadgeText({text:""});', 4000);
        } catch (e) {
            exceptionCaught(e)
        }
    }
}

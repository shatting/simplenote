/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

// global debug switch
var commonDebug = true;

function logGeneral(s,prefix,target) {
    if (!commonDebug)
        return;
    
    if (!target)
        target=console;
    if (!prefix)
        prefix="";
    
    if (typeof s == "string")
        target.log( prefix + '::' + s);
    else
        target.log(s);
}

function convertDate(serverDate) {    
    return new Date(serverDate*1000);
}

function dateAgo(d) {
    var diffms = ((new Date()) - (new Date(d*1000)));
    var hrs = Math.floor(diffms/(1000*60*60));
    var mins = Math.floor((diffms % (1000*60*60))/(1000*60));
    var secs = Math.floor((diffms % (1000*60))/(1000));
    if (hrs==0)
        return (mins>0?mins + "m":"") + (secs + "s ") + "ago";
    else
        return (hrs>0?hrs + "h":"")+ (mins + "m ") + "ago";
}

function logNote(note) {
    console.log("NOTE s: " + note.syncnum + "v:" + note.version);
    console.log("created " + dateAgo(note.createdate) + ", modified " + dateAgo(note.modifydate));
    console.log("note is " + (note.deleted==1?"DELETED":"not deleted"));
    console.log(note);
}

function note2str(note, content) {
    var s = "";
/*
 *content: "asdfgghhhh↵↵fgghgg"
  createdate: "1302427972.910837"
deleted: 0
key: "agtzaW1wbGUtbm90ZXINCxIETm90ZRi-89kHDA"
minversion: 1
modifydate: "1302427972.910837"
syncnum: 6
systemtags: Array[0]
tags: Array[0]
version: 6
__proto__: Object*/
    s += "d:"+note.deleted;
    s += " s:"+note.syncnum;
    s += " v:"+note.version;
    s += " t:";
    $.each(note.tags,function(i,e) {s+=e + " ";});
    s += " st:";
    $.each(note.systemtags,function(i,e) {s+=e + " ";});
    s += " m:" + dateAgo(note.modifydate);
    s += " c:" + dateAgo(note.createdate);
    if (content) {
        if (note.content)
            s += "\n" + note.content;
        else
            s += "\n[note has no content]";
    }
    return s;
}
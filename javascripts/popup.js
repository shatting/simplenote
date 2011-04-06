var background = chrome.extension.getBackgroundPage();

var isDebug = true;
var isDebugToBg = isDebug && true;
function log(s) {
    if (isDebug)
        console.log(s);
    if (isDebugToBg)
        background.console.log(s);
}

function logBg(s) {
    background.console.log(s);
}

//  ---------------------------------------
// event listener for popup close
// defer save to background
addEventListener("unload", function (event) {
    log("->unload listener");
    if (isDebug)
        alert("unload");
    if (isNoteDirty()) {
        log("->unload listener requesting background save");
        background.savedata = $('div#note textarea').val();
        background.savekey = $('div#note textarea').attr('key');
        background.setTimeout("popupClosed()", 1);
    } else 
       log("->unload listener no background save");
}, true);


//  ---------------------------------------
// Log in on page load
$(document).ready(function() {
  var signUpLink =
  "<a href='https://simple-note.appspot.com/create/'>signup</a>";
  var optionsLink =
  "<a href='options.html'>options page</a>";

  if ( !localStorage.email || !localStorage.password) {
    var message = "Please " + signUpLink + " for a Simplenote account and enter your credentials on the " + optionsLink + ".";
    displayStatusMessage(message);
  }
  else {
    log("->ready listener requesting login");
    chrome.extension.sendRequest({action : "login"}, 
    function(success) {
      if (success) {
        log("->ready listener login success");
        
        showIndex();
        
        $('div#index div#toolbar input#new').click(function() {
          showNote();
        });

        var options = {
          callback : function() { showIndex($('#q').val()); },
          wait : 750,
          highlight : false,
          captureLength : -1 // needed for empty string ('') capture
        }
        $('div#index div#toolbar input#q').typeWatch(options);

        $('div#index div#toolbar input#search').click(function() {
          showIndex($('#q').val());
        });
        $('input#q').focus();
      }
      else {
        log("->ready listener login error");
        var message = "Please correct your username and password on the " + optionsLink + "!";
        displayStatusMessage(message);
      }
    });
  }
});


//  ---------------------------------------
/*
 * Displays a status message.
 * @param message The HTML content of the status message to display. All links
 *     in the message are be adjusted to open in a new window and close the
 * ß    popup.
 */
function displayStatusMessage(message) {
  $('#loader').hide();
  $('#toolbar').hide();
  $('#status').html(message);
  links = $('a');
  links.attr('target', '_blank');
  links.click(function() {
    window.close();
  }
  );
}

//  ---------------------------------------

function showIndex(query) {    
  var req;
  if(query !== undefined) { 
    
    if ($('div#notes').data("allLoaded")) {                    
        if (query != '') {
            $('div.noterow').hide();
            $('div.noterow:contains(' + query + ')').show();
        } else
            $('div.noterow').show();    
        return;        
    } else {
        req = { action : "search", query : query};
        $('div.noterow').hide(); // hide all notes
    }
  } else {
    req = { action : "index" };
    $('div.noterow').show(); // show all notes, incase we searched before
  }
  
  log("->showIndex" + (query?"->search for " + query:""));
  
  $('#loader').show();  
  $('div#notes').unbind("scroll");
  $('div#notes').scroll(checkInView);
           
  chrome.extension.sendRequest(req, function(indexData) {
    // indexData[] for index
    //      .deleted:   bool
    //      .key:       string
    //      .modify:    "2011-04-05 14:51:50.570114"      
    // indexData[] for search
    //      .content:   string
    //      .key:       string
    
    var now = new Date(Date.now());
    var lastUpdate = $('div#index').data("updated");
    if (!lastUpdate) lastUpdate = new Date(0); 
    var modify;
    var indexDataNoDeleted, indexDataNoDeletedOld, indexDataNoDeletedNew;  
    
    if (!query) {
        indexDataNoDeleted = indexData.filter(function (e) { return !e.deleted;});             
        indexDataNoDeletedOld = indexDataNoDeleted.filter(function (e) { return serverDateStrToLocalDate(e.modify) < lastUpdate;});
        indexDataNoDeletedNew = indexDataNoDeleted.filter(function (e) { return serverDateStrToLocalDate(e.modify) >= lastUpdate;});
        // check for removals
        var keyNoDeleted = indexDataNoDeleted.map(function(e) { return e.key; });    
        var keyRows = $("div.noterow").get().map(function(e) { return e.id; });  
        keyRows.map(function(rowKey) {if (keyNoDeleted.indexOf(rowKey)<0) $('div.noterow#' + rowKey).remove(); });
    } else {
        indexDataNoDeletedOld = indexData;
        indexDataNoDeletedNew = new Array();
    }
        
    log("->showIndex request complete, " + indexDataNoDeletedOld.length + " old, " + indexDataNoDeletedNew.length + " new notes");
    
    // check old ones
    for(var i = 0; i < indexDataNoDeletedOld.length; i ++ ) {
        if (indexDataNoDeletedOld[i].modify) { //index
            //modify = $('div.noterow#' + indexDataNoDeletedOld[i].key).data("modify");
            //if (modify != serverDateStrToLocalDate(indexDataNoDeletedOld[i].modify))
            //    log("modify date different from saved date! (" + indexDataNoDeletedOld[i].key + ")");
            //log(modify);
            //log(typeof(serverDateStrToLocalDate(indexDataNoDeletedOld[i].modify)));
        } else { // search
            var notediv = $('#' + indexDataNoDeletedOld[i].key);
            if (!notediv) // TODO: there might be more problems, i.e. ordering
                indexDataNoDeletedNew.push(indexDataNoDeletedOld[i]);
            else {
                $('#' + indexDataNoDeletedOld[i].key).show();
            }
        }        
    }
    
    if (!$('div#index').data("updated")) // first run
        for(var i = 0; i < indexDataNoDeletedNew.length; i ++ )
            indexAddNote("append",indexDataNoDeletedNew[i].key, indexDataNoDeletedNew[i].modify);
    else
        for(var i = indexDataNoDeletedNew.length-1; i >= 0; i-- )
            indexAddNote("delteAndPrepend",indexDataNoDeletedNew[i].key, indexDataNoDeletedNew[i].modify);

        
    $('div#index').show();
    $('#loader').hide();
    $('div#index').data("updated",now);  
  
    checkInView();
  });
  
}

//mode: delteAndPrepend, append
function indexAddNote(mode, key, modify){
            
    var html =  "<div class='noterow' id='" + key  + "' >";    
    html+=          "<span class='notetime' id='" + key + "time'>" + gettimeadd(modify) + "</span>";
    html+=          "<div contenteditable='false' class='noteheading' id='" + key + "heading'>";
    html+=          "</div>";
    html+=          "<div contenteditable='false' class='abstract' id='" + key + "abstract'>&nbsp;<br>&nbsp;</div>";
    html+=      "</div>";        
    
    if (mode=="delteAndPrepend") {
        $('div.noterow#' + key).remove();
        $('#notes').prepend(html);                
    } else if (mode=="append") {
        $('#notes').append(html);        
    }
    
    $('div.noterow#' + key).data("modify",modify);
}


// element: jquery div.noterow#key
function indexFillNote(element) {        
    
    var key = element.attr("id");

    // reflowing triggers scrolls
    if (element.data("requested"))
        return;

    $('#' + key + "heading").append('<img id="' +key + 'loader" src="images/loader_small.gif"/>');
    $('#' + key + "heading").attr("align","center");

    chrome.extension.sendRequest({action : "note", key :key}, function(noteData) {
        // fields: noteData.key, noteData.text
        
        var $noterow = $('#' + noteData.key);
        var $noteheading = $('#' + noteData.key + "heading");     
        var $abstract = $('#' + noteData.key + "abstract");    
            
        var lines = noteData.text.split("\n").filter(function(line) {return ( line.trim().length > 0 )});

        // first line
        $('#' + key + 'loader').remove();    // remove loader
        $noteheading.removeAttr("align");
        $noteheading.append(htmlEncode(lines[0]));
        
        // abstract
        $abstract.html(htmlEncode(lines.slice(1,lines.length)).join("<br />"));
                
        // add dblclick binding
        $noterow.css("height",$noterow.height());
        $noterow.data('origheight',$noterow.height());
        $noterow.dblclick(maximize);
                
        // add click binding
        $noterow.unbind();        
        $noterow.click(function() { showNote(this.id) });        
        
        //$noterow.hover(maximize,minimize);
        
        // save full note
        $noterow.data('fulltext',noteData.text);
        
        // check new inview, might have changed due to reflow
        $noterow.data('loaded',true);        
        checkInView();
    });

    element.data("requested",true);    
}

function makeAbstract(lines) {
    var abstract = lines.map(function(element) { 
                         var short = element.substr(0, 45); 
                         return short.length + 3 < element.length ? short + "..." : element;
                                         });
    return htmlEncode(abstract).join("<br />");
}

// encode string or string array into html equivalent
function htmlEncode(s)
{
    if (!s)
        return "";
    if (s instanceof Array)
        return s.map(function(s) {return htmlSafe(s).replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;");});
    else
        return htmlSafe(s).replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;");
}

// make string html safe
function htmlSafe(s) {
    return s.replace(/&(?!\w+([;\s]|$))/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function maximize(event) {
    var key = this.id;
    var $this = $(this);
    var lines = $this.data("fulltext").split("\n");
    
    // insert full text into abstract div
    //$('#' + key + 'abstract').html(htmlEncode(lines.slice(1,lines.length-1)));
    
    //$('div.noterow').not($(this)).trigger('mouseleave');
    //$('div.noterow').not($(this)).stop( true, false );
    
    // animate 
    var $clone = $this.clone().css({ height: 'auto', position: 'absolute', 
            zIndex: '-9999', left: '-9999px', width: $this.width() })
            .appendTo($this);    
    $this.animate({ height: $clone.height() }, 100);    
    $clone.detach();
    
    $this.unbind('dblclick');
    $this.dblclick(minimize);
    //$('#' + key).animate( {height:'+=' + (lines*10), duration:500 }, function(){
        //$('#' + key).removeAttr('style');
    //});
   // $('#' + key).slideDown();

    //$('html,body').animate({scrollTop: $(this).offset().top}, 100);
}

function minimize(event) {
    var key = this.id;
    var $this = $(this);
    var lines = $(this).data("fulltext").split("\n",10).filter(function(line) {return ( line.length > 1 )});
    
    //$('#' + key + "abstract").html(makeAbstract(lines.slice(1, 3)));
        
    $this.animate({ height: $this.data('origheight') }, 50);

    $this.unbind('dblclick');
    $this.dblclick(maximize);    
}

//  ---------------------------------------
function gettimeadd(s) {
  var now = new Date(Date.now());
  var mod = serverDateStrToLocalDate(s);
  
  var diff = (now - mod) / 1000 / 60 / 60;
  var timeadd;

  if (diff < 24) {
    timeadd = pad(mod.getHours()) + ":" + pad(mod.getMinutes());
  }
  else {
    timeadd = mod.getDate() + "." + (mod.getMonth()+1) + ".";
  }

  return timeadd;
}

// assumung input dates are utc
// format of s from .modify: "2011-04-05 14:51:50.570114"
function serverDateStrToLocalDate(s) {
    var now = new Date(Date.now());
    return new Date(Date.parse(s) - now.getTimezoneOffset()*60000);
}

//  ---------------------------------------

function pad(i) {
  if (i < 10) return "0" + i;
  else return "" + i;
}

//  ---------------------------------------

function showNote(key) {
  log("->showNote");
  
  $('div#index').hide();  
  $('#loader').show();  
  $('div#note').show();

  $('div#note div#toolbar input').removeAttr('disabled');
  $('div#note textarea').attr('dirty', 'false');
  
  // add note change (dirty) event listeners
  $('div#note textarea').unbind();
  $('div#note textarea').bind('change keydown keyup paste', function(event) {
    log("note is dirty (" + event.type + ")");
    $('div#note textarea').attr('dirty', 'true');
  });

  // bind back button
  $('div#note input#backtoindex').unbind();
  $('div#note input#backtoindex').click(function() {
     log("->back clicked");
     if (isNoteDirty()) 
        updateNote(backToIndex);
     else
        backToIndex();   
  });
  
  // get note contents
  if (key === undefined) { // new note
    log("->showNote new note");
    
    // delete button now cancel button
    $('div#note div#toolbar input#destroy').val("Cancel");
    $('div#note input#destroy').unbind();
    $('div#note input#destroy').click(function() {
        backToIndex();
    });
    
    // insert data
    $('div#note textarea').val("");
    $('div#note textarea').attr('key', '');
    
    // show/hide elements
    $('#loader').hide();  
    $('div#note textarea').show();
    $('div#note textarea').focus();    
  }
  else { // existing note, request from server
    log("->showNote existing note");
    
    // bind delete button
    $('div#note div#toolbar input#destroy').val("Delete");
    $('div#note input#destroy').unbind();
    $('div#note input#destroy').click(function() {
        destroyNote();
    });
    
    // request note
    chrome.extension.sendRequest({action : "note", key : key}, function(data) {
      log("->showNote existing note request complete");
      // insert data
      $('div#note textarea').val(data.text);
      $('div#note textarea').attr('key', key);      
      
      // show/hide elements
      $('#loader').hide();  
      $('div#note textarea').show();      
      $('div#note textarea').focus();      
    });
  }  

}

//  ---------------------------------------

function updateNote(callback) {
    var data = $('div#note textarea').val();
    var key = $('div#note textarea').attr('key');
    var request;
        
    log("->updateNote key:" + key + "\n--->" + data + "<---\ncallback:" + callback);
    
    if (data == '' && key !='')     // existing note emptied -> delete
        destroyNote();
    else if (key != '' )            // existing note, new data -> update
        request = {action : "update", key : key, data : data};
    else if (data != '')            // new note, new data -> create
        request = {action : "create", data : data};
    else                            // new note, no data -> back to index
        backToIndex();
    
        
    if (request) {
      log("->updateNote request:");
      log(request);
      chrome.extension.sendRequest(request, function(newkey) {
        $('div#note textarea').attr('key',newkey);
        $('div#note textarea').attr('dirty', 'false');              
        log("->updateNote request complete");   
        if (callback)
            callback();
      });
    }
    
}

//  ---------------------------------------

function isNoteDirty() {
    return $('div#note textarea').attr("dirty")=="true";
}

//  ---------------------------------------

function backToIndex() {
    log("->backToIndex");
    $('div#note div#toolbar input').attr('disabled', 'disabled');
    $('div#note textarea').hide();
    $('div#note').hide();
    
    showIndex();
}

//  ---------------------------------------

function destroyNote() {
    log("->destroyNote");
    $('div#note div#toolbar input').attr('disabled', 'disabled');
    
    chrome.extension.sendRequest({action : "destroy", key : $('div#note textarea').attr('key')}, function() {
        log("->destroyNote->sendRequest success");
        backToIndex();
    });
}

//  ---------------------------------------
// from inview.js
function getViewportSize() {
    var mode, domObject, size = { height: window.innerHeight, width: window.innerWidth };

    // if this is correct then return it. iPad has compat Mode, so will
    // go into check clientHeight/clientWidth (which has the wrong value).
    if (!size.height) {
        mode = document.compatMode;
        if (mode || !$.support.boxModel) { // IE, Gecko
            domObject = mode === 'CSS1Compat' ?
                document.documentElement : // Standards
                document.body; // Quirks
            size = {
                height: domObject.clientHeight,
                width:  domObject.clientWidth
            };
        }
    }

    return size;
}

function getViewportOffset() {
    return {
        top:  window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
        left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft
    };
}

// amount of vertical viewport size to add for preloading
var preLoadFactor = 1/4;
function checkInView() {
    var elements = $('div.noterow').get(), elementsLength, i = 0, viewportSize, viewportOffset;
    var allLoaded = true;
    
    elements = elements.filter(function (e) { return !$(e).data('loaded'); });
    
    elementsLength = elements.length;

    if (elementsLength) {
        viewportSize   = getViewportSize();
        viewportOffset = getViewportOffset();

        
        for (; i<elementsLength; i++) {

            var $element      = $(elements[i]),
                elementSize   = { height: $element.height(), width: $element.width() },
                elementOffset = $element.offset(),
                loaded        = $element.data('loaded'),
                inview        = false;

            inview = elementOffset.top < viewportOffset.top + viewportSize.height*(1 + preLoadFactor) &&
                     elementOffset.left + elementSize.width > viewportOffset.left &&
                     elementOffset.left < viewportOffset.left + viewportSize.width;
                         
//            console.log(i + ": loaded " + loaded + ", inview=" + inview);                                                    
//            console.log(elementOffset);
//            console.log(elementOffset);
//            console.log(viewportSize);    
//            console.log(viewportOffset);                
            allLoaded = allLoaded && loaded;
            if (!loaded && inview) {
                indexFillNote($element);                
            }
        }
    }
        
    $("div#notes").data('allLoaded',allLoaded);    
}

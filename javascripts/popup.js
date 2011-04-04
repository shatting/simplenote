var background = chrome.extension.getBackgroundPage();
function logBg(s) {
    background.console.log(s);
}

//  ---------------------------------------
// event listener for popup close
// defer save to background
addEventListener("unload", function (event) {
    if (noteDirty()) {
        background.savedata = $('div#note textarea').val();
        background.savekey = $('div#note textarea').attr('key');
        background.setTimeout("popupClosed()", 1);
    }
}, true);


//  ---------------------------------------
// Log in on page load
$(document).ready(function() {
  var signUpLink =
  "<a href='https://simple-note.appspot.com/create/'>signup</a>";
  var optionsLink =
  "<a href='options.html'>options page</a>";

  if ( ! localStorage.email || ! localStorage.password) {
    var message = "Please " + signUpLink + " for a Simplenote account and enter your credentials on the " + optionsLink + ".";
    displayStatusMessage(message);
  }
  else {
    chrome.extension.sendRequest({action : "login"}, 
    function(success) {
      if (success) {
        showIndex();
        $('div#index div#toolbar input#new').click(function() {
          showNote();
        });

        var options = {
          callback : function() { showIndex($('#q').val()); },
          wait : 750,
          highlight : false,
          captureLength : 1
        }
        $('div#index div#toolbar input#q').typeWatch(options);

        $('div#index div#toolbar input#search').click(function() {
          showIndex($('#q').val());
        });
        $('input#q').focus();
      }
      else {
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

function showIndex(query, startidx) {
 
  var req;
  if(query) { 
    req = { action : "search", query : query};
  } else {
    req = { action : "index" };
  }

  if (startidx===undefined) {
    if ($('#notes').attr("startidx"))
        startidx=$('#notes').attr("startidx");
    else
        startidx=0;
  }
  
  //logBg("showindex: query=" + query + ", startidx=" + startidx);
  $('#loader').show();
  $('#notes').empty();
  $("#count").hide();
  $('#notes').attr("startidx",startidx);
       
  chrome.extension.sendRequest(req, function(indexData) {
    var startidx = parseInt($('#notes').attr("startidx"));
           
    var indexDataNoDeleted = indexData.filter(function (e) { return !e.deleted;});

    if (startidx==0)
        $('div#nav input#prev').attr("disabled","disabled");
    else
        $('div#nav input#prev').removeAttr("disabled");     
           
    $('div#nav input#prev').unbind();
    $('div#nav input#prev').click(function (event) {
        showIndex(query,Math.max(startidx-10,0));
    });
    
    if (startidx>=indexDataNoDeleted.length-10)
        $('div#nav input#next').attr("disabled","disabled");
    else
        $('div#nav input#next').removeAttr("disabled");        
        
    $('div#nav input#next').unbind();
    $('div#nav input#next').click(function (event) {        
        showIndex(query,Math.min(startidx+10,indexDataNoDeleted.length-1));
    });
    
    var count = 0;
    for(var i = startidx; i < indexDataNoDeleted.length; i ++ ) {
        
        $('#notes').append("<tr id='" + indexDataNoDeleted[i].key + "1'><td class='time' id='" + indexDataNoDeleted[i].key + "time'></td><td class='heading' id='" + indexDataNoDeleted[i].key + "heading'></td></tr>");
        $('#notes').append("<tr class='abstract' id='" + indexDataNoDeleted[i].key + "2'><td></td><td id='" + indexDataNoDeleted[i].key + "abstract'></td></tr>");
                           
        if (indexDataNoDeleted[i].modify) {
          $('#' + indexDataNoDeleted[i].key + "time").html(gettimeadd(indexDataNoDeleted[i].modify) + " ");
        }        
        
        chrome.extension.sendRequest({action : "note", key : indexDataNoDeleted[i].key}, function(noteData) {
          
          var lines = noteData.text.split("\n", 10).filter(function(line) {return ( line.length > 1 )});
    
          $('#' + noteData.key + "heading").html(lines[0]);
          $('#' + noteData.key + "abstract").html(lines.slice(1, 3).map(function(element) { 
            var short = element.substr(0, 55); return (short.length + 3 < element.length ? short + "..." : element )
          }).join("<br />"));
    
          $('#' + noteData.key + "1").unbind();
          $('#' + noteData.key + "2").unbind();
          $('#' + noteData.key + "1").click(function() {
            showNote(this.id.substr(0,this.id.length-1));
          });
          $('#' + noteData.key + "2").click(function() {
            showNote(this.id.substr(0,this.id.length-1));
          });          
        });
    
        count += 1;
        if (count == 10)
        break;      
    }
    
    $("#count").html("" + (startidx+1) + " to " + (Math.min(startidx+10,indexDataNoDeleted.length)) + " of " + indexDataNoDeleted.length);
    $("#count").show();
  }
  );
  $('div#index').show();
  $('#loader').hide();
}

//  ---------------------------------------
// assumung input dates are utc
function gettimeadd(s) {
  var now = new Date(Date.now());
  var mod = new Date(Date.parse(s) - now.getTimezoneOffset()*60000);
  
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

//  ---------------------------------------

function pad(i) {
  if (i < 10) return "0" + i;
  else return "" + i;
}

//  ---------------------------------------

function showNote(key) {
 
  $('div#index').hide();  
  $('#loader').show();  
  $('div#note').show();

  $('div#note div#toolbar input').removeAttr('disabled');
  $('div#note textarea').attr('dirty', 'false');
  
  // add note change (dirty) event listeners
  $('div#note textarea').unbind();
  $('div#note textarea').bind('change keydown keyup paste', function(event) {
    $('div#note textarea').attr('dirty', 'true');
  });

  // bind back button
  $('div#note input#save').unbind();
  $('div#note input#save').click(function() {
     if (noteDirty()) 
        updateNote(backToIndex);
     else
        backToIndex();   
  });
  
  // get note contents
  if (key === undefined) { // new note
    
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
  
    // bind delete button
    $('div#note div#toolbar input#destroy').val("Delete");
    $('div#note input#destroy').unbind();
    $('div#note input#destroy').click(function() {
        destroyNote();
    });
    
    // request note
    chrome.extension.sendRequest({action : "note", key : key}, function(data) {
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
    
    if (data == '' && key !='') // existing note emptied -> delete
        destroyNote();
    else if (key != '' )        // existing note, new data -> update
        request = {action : "update", key : key, data : data};
    else if (data != '')        // new note, new data -> create
        request = {action : "create", data : data};
    else                        // new note, no data -> back to index
        backToIndex();
        
    if (request)
      chrome.extension.sendRequest(request, function(newkey) {
        $('div#note textarea').attr('key',newkey);
        $('div#note textarea').attr('dirty', 'false');              
           
        if (callback)
            callback();
      });
            
}

//  ---------------------------------------

function noteDirty() {
    return $('div#note textarea').attr("dirty")=="true";
}

//  ---------------------------------------

function backToIndex() {
    $('div#note div#toolbar input').attr('disabled', 'disabled');
    $('div#note textarea').hide();
    $('div#note').hide();
    
    showIndex();
}

//  ---------------------------------------

function destroyNote() {
    $('div#note div#toolbar input').attr('disabled', 'disabled');
    
    chrome.extension.sendRequest({action : "destroy", key : $('div#note textarea').attr('key')}, function() {
        backToIndex();
    });
}

$(document).ready(function() {
  
  $("#email").val(localStorage.option_email);
  $("#password").val(localStorage.option_password);    
  if (localStorage.option_abstractlines == undefined)
    $("#abstractlines").val("3");
  else
    $("#abstractlines").val(localStorage.option_abstractlines);

  if (localStorage.option_opentonote == undefined || localStorage.option_opentonote == "true")
    $("#opentonote").attr("checked","true");

  if (localStorage.option_showdate== undefined || localStorage.option_showdate == "true")
    $("#showdate").attr("checked","true");

  if (localStorage.option_sortby != undefined)
      $("#sort").val(localStorage.option_sortby);

  if (localStorage.option_sortbydirection != undefined)
      $("#sortdirection").attr("checked",localStorage.option_sortbydirection==-1?"true":"");

  if (localStorage.option_editorfont != undefined) {
      $("#editorfont").val(localStorage.option_editorfont);
  }
  if (localStorage.option_editorfontsize != undefined) {
      $("#editorfontsize").val(localStorage.option_editorfontsize);
  }

  if (localStorage.option_editorfontshadow != undefined && localStorage.option_editorfontshadow == "true")
    $("#editorfontshadow").attr("checked","true");

//  if (localStorage.option_aes_enable!= undefined && localStorage.option_aes_enable == "true")
//      $("#aes_enable").attr("checked","true");
//  if (localStorage.option_aes_enable!= undefined && localStorage.option_aes_enable == "true") {
//      $("#aes_key").val(localStorage.option_aes_key);
//  } else {
//      $("#aes_key").hide();
//      $("#aes_key_label").hide();
//  }

  if (!localStorage.option_color_index)
      localStorage.option_color_index = "#4F4F59";
  if (!localStorage.option_color_editor)
      localStorage.option_color_editor = "#ffffff";
  if (!localStorage.option_color_editor_font)
      localStorage.option_color_editor_font = "#010101";
  
  $('#color_index').attr("value",localStorage.option_color_index);
  $('#color_editor').attr("value",localStorage.option_color_editor);
  $('#color_editor_font').attr("value",localStorage.option_color_editor_font);
  
  $('input.color').mColorPicker({
      swatches:[
          "#4F4F59",
          "#ffffff",
          "#dddddd",
          "#cccccc",
          "#aaaaaa",
          "#888888",
          "#666666",
          "#444444",
          "#222222",
          "#000000"]
  });

  $("input, select").change(function(event) {      
      save_options();
  });

//  $("#aes_key").keyup(save_options);
  $("#save").click(save_clicked);
  $("#reset").click(reset_clicked);
  $("#donate").click(function () { _gaq.push(['_trackEvent', 'Options', 'donate_clicked']); });
  
});

/*
 * Saves options to localStorage.
 * @param ms Milliseconds to fade in the status message.
 */
function save_options() {  
  
  localStorage.option_abstractlines = $("#abstractlines").val();  
  if ((localStorage.option_opentonote=="true") != $('#opentonote').attr("checked"))
    delete localStorage.opentonotekey;
  localStorage.option_opentonote  = $('#opentonote').attr("checked");
  localStorage.option_showdate  = $('#showdate').attr("checked");
  localStorage.option_sortby = $("#sort").val();
  localStorage.option_sortbydirection = $("#sortdirection").attr("checked")?-1:1;  
  localStorage.option_editorfont = $("#editorfont").val();
  localStorage.option_editorfontsize = $("#editorfontsize").val();
  // font stuff
  var fontinfo = { size: localStorage.option_editorfontsize + "px", letter_spacing: "0em", word_spacing: "0em", line_height: "1.5"};  
  switch (localStorage.option_editorfont) {
      case "Droid Sans Mono":
        fontinfo.family = "Droid Sans Mono";        
        fontinfo.letter_spacing = "0.05em";
        fontinfo.word_spacing = "0.01em";        
        break;
      case "Simplenote":
        fontinfo.family = '"Helvetica Neue", Arial, Helvetica, Arimo, FreeSans, "Nimbus Sans", "Phetsarath OT", Malayalam, "Gargi_1.7", sans-serif';
        break;
      case '"Helvetica Neue", Arial, Helvetica, Arimo, FreeSans, "Nimbus Sans", "Phetsarath OT", Malayalam, "Gargi_1.7", sans-serif': // hack for existing users
        fontinfo.family = '"Helvetica Neue", Arial, Helvetica, Arimo, FreeSans, "Nimbus Sans", "Phetsarath OT", Malayalam, "Gargi_1.7", sans-serif';
      default:
          delete localStorage.editorfontinfo;
  }
  if (fontinfo.family) { // this is only set if we had a case above
      localStorage.editorfontinfo = JSON.stringify(fontinfo);      
  }

  // font shadow
  localStorage.option_editorfontshadow  = $('#editorfontshadow').attr("checked");

  localStorage.option_color_index = $('#color_index').val();
  localStorage.option_color_editor = $('#color_editor').val();
  localStorage.option_color_editor_font = $('#color_editor_font').val();

//  localStorage.option_aes_enable = $("#aes_enable").attr("checked");
//  localStorage.option_aes_key = $("#aes_key").val();
//
//  if (localStorage.option_aes_enable!= undefined && localStorage.option_aes_enable == "true") {
//      $("#aes_key").show();
//      $("#aes_key_label").show();
//  } else {
//      $("#aes_key").hide();
//      $("#aes_key_label").hide();
//  }
}

function save_clicked() {
    
    var email = $("#email").val();
    var password = $("#password").val();

    $("#save").attr("disabled","disabled");

    if (email == localStorage.option_email && password == localStorage.option_password || email=="" || password=="") {
        $("#loginmessage").html("");
        $("#loginmessage").css("color","black");
        $("#save").removeAttr("disabled");
        return;
    }
    
    _gaq.push(['_trackEvent', 'Options', 'save_clicked']);

    if (email != localStorage.option_email && (localStorage._syncKeys)) {
      if (!confirm("You are about to switch your Simplenote login!\n\nThere are notes stored locally that have not been synchronized to the server.\n\nIf you switch accounts now, those changes will be lost.\n\nContinue?")) {            
            $("#loginmessage").html("Changes not saved");
            $("#loginmessage").css("color","black");
            $("#email").val(localStorage.option_email);
            $("#password").val(localStorage.option_password);
            $("#save").removeAttr("disabled");
            _gaq.push(['_trackEvent', 'Options', 'save_clicked','synckeyspresent_reverted']);
            return;
      } else
        _gaq.push(['_trackEvent', 'Options', 'save_clicked','synckeyspresent_overridden']);
    }
    delete localStorage.token;
    delete localStorage.tokenTime;
    localStorage.option_email = email;
    localStorage.option_password = password;
    
    $("#loginmessage").html("Logging in..");
    $("#loginmessage").css("color","black");
    chrome.extension.sendRequest({action:"login"}, function(successObj) {
        if (successObj.success) {

            _gaq.push(['_trackEvent', 'Options', 'save_clicked','login_success']);

            $("#loginmessage").html("<center>Logged in, getting notes index from server..</center>");
            $("#loginmessage").css("color","#ff66ff");
            delete localStorage.opentonotekey;
            chrome.extension.sendRequest({action:"userchanged"}, function(successObj) {
                if (successObj && successObj.success) {
                    _gaq.push(['_trackEvent', 'Options', 'save_clicked','sync_success',successObj.numKeys]);
                    $("#loginmessage").html("<center>Account info saved, initial sync done.<br>Happy Syncpad-ing!</center>");
                    $("#loginmessage").css("color","green");
                } else {
                    _gaq.push(['_trackEvent', 'Options', 'save_clicked','sync_error']);
                    $("#loginmessage").html("<center>Logged in, but initial sync had problems.<br>Might still work!</center>");
                    $("#loginmessage").css("color","red");
                }
            });
        } else {            

            if (successObj.reason=="timeout") {
                _gaq.push(['_trackEvent', 'Options', 'save_clicked','login_timeout']);
                $("#loginmessage").html("Could not log in: network timeout, please try again later.");
            } else if (successObj.reason=="logininvalid") {
                _gaq.push(['_trackEvent', 'Options', 'save_clicked','login_invalid']);
                $("#loginmessage").html("Could not log in: email or password incorrect.");
            } else {
                _gaq.push(['_trackEvent', 'Options', 'save_clicked','login_error']);
                $("#loginmessage").html("Could not log in: unknown error.");
            }
            $("#loginmessage").css("color","red");
        }
        $("#save").removeAttr("disabled");
    });

}

function reset_clicked() {
    _gaq.push(['_trackEvent', 'Options', 'reset_clicked']);
    chrome.extension.sendRequest({action:"userchanged"});
}
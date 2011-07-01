$(document).ready(function() {

  $("#email").val(SimplenoteSM.email() != undefined?SimplenoteSM.email():"");
  $("#password").val(SimplenoteSM.password() != undefined?SimplenoteSM.password():"");
  
  $("#abstractlines").val(localStorage.option_abstractlines == undefined?"3":localStorage.option_abstractlines);

  setCBval("#opentonote", localStorage.option_opentonote == undefined || localStorage.option_opentonote == "true");    
  setCBval("#remembercaret", localStorage.option_remembercaret == undefined || localStorage.option_remembercaret == "true");
  setCBval("#contextmenu", localStorage.option_contextmenu == undefined || localStorage.option_contextmenu == "true");
  setCBval("#contextmenu_cascading", localStorage.option_contextmenu_cascading != undefined && localStorage.option_contextmenu_cascading == "true");
  setCBval("#contextmenu_cascading_pinned", localStorage.option_contextmenu_cascading_pinned != undefined && localStorage.option_contextmenu_cascading_pinned == "true");
  if (localStorage.option_contextmenu != undefined && localStorage.option_contextmenu != "true") {
      $('#contextmenu_cascading').attr('disabled', 'disabled');
      $('#contextmenu_cascading_pinned').attr('disabled', 'disabled');
      $('#contextmenu_cascading_lbl').css('color', '#ccc');
      $('#contextmenu_cascading_pinned_lbl').css('color', '#ccc');
  }

  setCBval("#hidewebnotes", localStorage.option_hidewebnotes == undefined || localStorage.option_hidewebnotes == "true");
  setCBval("#alwaystab", localStorage.option_alwaystab != undefined && localStorage.option_alwaystab == "true");
  setCBval("#pinnedtab", localStorage.option_pinnedtab == undefined || localStorage.option_pinnedtab == "true");
  setCBval("#showdate", localStorage.option_showdate == undefined || localStorage.option_showdate == "true");
    
  if (localStorage.option_sortby != undefined)
      $("#sort").val(localStorage.option_sortby);

  setCBval("#sortdirection", localStorage.option_sortbydirection != undefined && localStorage.option_sortbydirection==-1);

  if (localStorage.option_editorfont != undefined) {
      $("#editorfont").val(localStorage.option_editorfont);
  }
  if (localStorage.option_editorfontsize != undefined) {
      $("#editorfontsize").val(localStorage.option_editorfontsize);
  }

  if (localStorage.option_editorfontshadow != undefined) {
      $("#editorfontshadow").val(localStorage.option_editorfontshadow);
  }

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
  $("#clear").click(clear_clicked);
  $("#reset").click(reset_clicked);
  $("#donate").click(function () {_gaq.push(['_trackEvent', 'Options', 'donate_clicked']);});

  get_manifest(function (mf) {
      $("#version").html(mf.version);
  });

  scheduleGA();

});

/*
 * Saves options to localStorage.
 */
function save_options() {
  console.log("options saved")
  // abstract lines
  localStorage.option_abstractlines = $("#abstractlines").val();

  // open to note
  // clear key
  if ((localStorage.option_opentonote == "true") != getCBval('#opentonote'))
    localStorage.lastopennote_open = "false";
  localStorage.option_opentonote = getCBval('#opentonote');

  // editor caret
  // clear carets
  if ((localStorage.option_remembercaret=="true") != getCBval('#remembercaret')) {
      for (var key in localStorage)
          if (key.match(/_caret$/))
              delete localStorage[key];
  }
  localStorage.option_remembercaret = getCBval('#remembercaret');

  // context menu
  var need_cm_refresh = (localStorage.option_contextmenu=="true") != getCBval('#contextmenu') || 
      (localStorage.option_contextmenu_cascading=="true") != getCBval('#contextmenu_cascading') ||
      (localStorage.option_contextmenu_cascading_pinned=="true") != getCBval('#contextmenu_cascading_pinned');

  localStorage.option_contextmenu = getCBval('#contextmenu');
  localStorage.option_contextmenu_cascading = getCBval('#contextmenu_cascading');
  localStorage.option_contextmenu_cascading_pinned = getCBval('#contextmenu_cascading_pinned');
  if (need_cm_refresh) {
      chrome.extension.sendRequest({action:"cm_populate"});
  }  
  
  if (localStorage.option_contextmenu != "true") {
      $('#contextmenu_cascading').attr('disabled', 'disabled');
      $('#contextmenu_cascading_pinned').attr('disabled', 'disabled');
      $('#contextmenu_cascading_lbl').css('color', '#ccc');
      $('#contextmenu_cascading_pinned_lbl').css('color', '#ccc');
  } else {
      $('#contextmenu_cascading').removeAttr('disabled');
      $('#contextmenu_cascading_pinned').removeAttr('disabled');
      $('#contextmenu_cascading_lbl').css('color', '');
      $('#contextmenu_cascading_pinned_lbl').css('color', '');
  }
  var bg = chrome.extension.getBackgroundPage();
  if (localStorage.option_alwaystab == "true" != getCBval('#alwaystab')) {
      localStorage.option_alwaystab = getCBval('#alwaystab');
      if (bg)
          bg.SimplenoteBG.setOpenPopup();
  }

  if ((localStorage.option_pinnedtab == "true") != getCBval('#pinnedtab')) {
      if (bg && bg.SimplenoteBG.tab) {
        chrome.tabs.update(bg.SimplenoteBG.tab.id, {pinned:getCBval('#pinnedtab')});
      }
  }
  localStorage.option_pinnedtab = getCBval('#pinnedtab');

  localStorage.option_hidewebnotes = getCBval('#hidewebnotes');

  localStorage.option_showdate  = getCBval('#showdate');
  localStorage.option_sortby = $("#sort").val();
  localStorage.option_sortbydirection = getCBval("#sortdirection")?-1:1;
  localStorage.option_editorfont = $("#editorfont").val();
  localStorage.option_editorfontsize = $("#editorfontsize").val();
  // font stuff
  var fontinfo = {size: localStorage.option_editorfontsize + "px", letter_spacing: "0em", word_spacing: "0em", line_height: "1.5"};
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
  localStorage.option_editorfontshadow  = $('#editorfontshadow').val();

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
    
    var email = $("#email").val().trim();
    var password = $("#password").val();

    $("#save").attr("disabled","disabled");

    if (email == SimplenoteSM.email() && password == SimplenoteSM.password() && SimplenoteSM.credentialsValid()) {
        $("#loginmessage").html("");
        $("#loginmessage").css("color","black");
        $("#save").removeAttr("disabled");
        return;
    }
    
    if (email=="") {
        $("#loginmessage").html("Please enter your Simplenote email address");
        $("#loginmessage").css("color","red");
        $("#save").removeAttr("disabled");
        $("#email").focus();
        return;
    }

    if (password=="") {
        $("#loginmessage").html("Please enter your Simplenote password");
        $("#loginmessage").css("color","red");
        $("#save").removeAttr("disabled");
        $("#password").focus();
        return;
    }

    _gaq.push(['_trackEvent', 'Options', 'save_clicked']);

    if (email != SimplenoteSM.email() && (localStorage._syncKeys)) {
      if (!confirm("You are about to switch your Simplenote login!\n\nThere are notes stored locally that have not been synchronized to the server.\n\nIf you switch accounts now, those changes will be lost.\n\nContinue?")) {
            $("#loginmessage").html("Changes not saved");
            $("#loginmessage").css("color","black");
            $("#email").val(SimplenoteSM.email());
            $("#password").val(SimplenoteSM.password());
            $("#save").removeAttr("disabled");
            _gaq.push(['_trackEvent', 'Options', 'save_clicked','synckeyspresent_reverted']);
            return;
      } else
        _gaq.push(['_trackEvent', 'Options', 'save_clicked','synckeyspresent_overridden']);
    }

    SimplenoteSM.setLogin(email,password);

    $("#loginmessage").html("Logging in..");
    $("#loginmessage").css("color","black");
    closeTabAnd(function() {
        chrome.extension.sendRequest({action:"login"}, function(successObj) {
            if (successObj.success) {

                _gaq.push(['_trackEvent', 'Options', 'save_clicked','login_success']);

                $("#loginmessage").html("<center>Logged in, getting notes index from server..</center>");
                $("#loginmessage").css("color","#ff66ff");
                delete localStorage.lastopennote_key;
                localStorage.lastopennote_open = "false";

                save_options();

                chrome.extension.sendRequest({action:"userchanged"}, function(successObj) {                    
                    if (successObj && successObj.success) {
                        _gaq.push(['_trackEvent', 'Options', 'save_clicked','sync_success',successObj.numKeys]);
                        $("#loginmessage").html("Account info saved, initial sync done.<br>Getting notes..");

                        chrome.extension.sendRequest({action:"fillcontents"}, function(successObj) {
                            $("#loginmessage").html("Account info saved, initial sync done.<br>Getting notes..");
                            if (successObj.success) {
                                $("#loginmessage").html("All done. Happy Syncpad-ing!");
                                $("#loginmessage").css("color","green");
                            } else {
                                $("#loginmessage").html("There were problems getting notes, but might still work!<br>Happy Syncpad-ing!");
                            }
                            
                        });
                        
                    } else {
                        _gaq.push(['_trackEvent', 'Options', 'save_clicked','sync_error']);
                        $("#loginmessage").html("Logged in, but initial sync had problems.<br>Might still work!");
                        $("#loginmessage").css("color","red");
                    }
                });
            } else {
                SimplenoteSM.clear();

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
    });
}

function clear_clicked() {
    _gaq.push(['_trackEvent', 'Options', 'reset_clicked']);
    closeTabAnd(function() {
        delete localStorage.lastopennote_key;
        localStorage.lastopennote_open = "false";
        chrome.extension.sendRequest({action:"userchanged"});
    });
}

function reset_clicked() {
    _gaq.push(['_trackEvent', 'Options', 'reset_everything_clicked']);
    
    closeTabAnd(function() {
        localStorage.clear();
        chrome.extension.getBackgroundPage().location.reload();
        window.location.reload();
    });
}

function closeTabAnd(after) {
    var bg = chrome.extension.getBackgroundPage();
    if (bg && bg.SimplenoteBG.tab) {
        chrome.tabs.remove(bg.SimplenoteBG.tab.id, after);
    } else {
        after();
    }
}
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

  $("input, select").change(function(event) {      
      save_options();
  });

  $("#save").click(save_clicked);
  $("#reset").click(reset_clicked);

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

    if (email != localStorage.option_email && (localStorage._syncKeys)) {
      if (!confirm("You are about to switch your Simplenote login!\n\nThere are notes stored locally that have not been synchronized to the server.\n\nIf you switch accounts now, those changes will be lost.\n\nContinue?")) {            
            $("#loginmessage").html("Changes not saved");
            $("#loginmessage").css("color","black");
            $("#email").val(localStorage.option_email);
            $("#password").val(localStorage.option_password);
            $("#save").removeAttr("disabled");
            return;
      }
    }
    delete localStorage.token;
    delete localStorage.tokenTime;
    localStorage.option_email = email;
    localStorage.option_password = password;

    $("#loginmessage").html("Logging in..");
    $("#loginmessage").css("color","black");
    chrome.extension.sendRequest({action:"login"}, function(successObj) {
        if (successObj.success) {
            $("#loginmessage").html("Email and password saved.");
            $("#loginmessage").css("color","green");
            delete localStorage.opentonotekey;
            chrome.extension.sendRequest({action:"userchanged"});
        } else {
            if (successObj.reason=="timeout")
                $("#loginmessage").html("Network timeout, please try again later.");
            else if (successObj.reason=="logininvalid")
                $("#loginmessage").html("Email or password incorrect.");
            else
                $("#loginmessage").html("Unknown error.");

            $("#loginmessage").css("color","red");
        }
        $("#save").removeAttr("disabled");
    });

}

function reset_clicked() {
    chrome.extension.sendRequest({action:"userchanged"});
}
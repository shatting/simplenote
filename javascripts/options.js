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

  if (localStorage.option_editorfontshadow == undefined || localStorage.option_editorfontshadow == "true")
    $("#editorfontshadow").attr("checked","true");

});

/*
 * Saves options to localStorage.
 * @param ms Milliseconds to fade in the status message.
 */
function save_options(ms) {
  var status = $("#status");
  var email = $("#email").val();
  
  if (email != localStorage.option_email && (localStorage._syncKeys)) {
          if (!confirm("You are about to switch your Simplenote login!\n\nThere are notes stored locally that have not been synchronized to the server.\n\nIf you switch accounts now, those changes will be lost.\n\nContinue?")) {              
                status.html("Not saved. Please connect to the internet to synchronize local changes to the server.");
                status.css("opacity", 1);
                $("#email").val(localStorage.option_email);
                return;
          }
  }
  if (email != localStorage.option_email)
    localStorage.clear();
            
  localStorage.option_email = email;
  localStorage.option_password = $("#password").val();	
  localStorage.option_abstractlines = $("#abstractlines").val();
  localStorage.option_opentonote  = $('#opentonote').attr("checked");
  localStorage.option_showdate  = $('#showdate').attr("checked");
  localStorage.option_sortby = $("#sort").val();
  localStorage.option_sortbydirection = $("#sortdirection").attr("checked")?-1:1;
  localStorage.option_editorfont = $("#editorfont").val();
  localStorage.option_editorfontsize = $("#editorfontsize").val();
  localStorage.option_editorfontshadow  = $('#editorfontshadow').attr("checked");
  
  if (localStorage.option_email && localStorage.option_password) {
    status.html("Options saved");
  } else {
    status.html("Save failed.");
  }

  status.css("opacity", 1);
  setTimeout(function() {
    status.css("opacity", 0);
  }, ms);
}

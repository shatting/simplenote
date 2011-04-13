$(document).ready(function() {
  
  $("#email").val(localStorage.email);
  $("#password").val(localStorage.password);    
  if (localStorage.abstractlines == undefined)
    $("#abstractlines").val("3");
  else
    $("#abstractlines").val(localStorage.abstractlines);

  if (localStorage.opentonote == undefined || localStorage.opentonote == "true")
    $("#opentonote").attr("checked","true");

  if (localStorage.showdate== undefined || localStorage.showdate == "true")
    $("#showdate").attr("checked","true");
});

/*
 * Saves options to localStorage.
 * @param ms Milliseconds to fade in the status message.
 */
function save_options(ms) {
  var status = $("#status");
  var email = $("#email").val();
  
  if (email != localStorage.email && (localStorage._syncKeys)) {
          if (!confirm("You are about to switch your Simplenote login!\n\nThere are notes stored locally that have not been synchronized to the server.\n\nIf you switch accounts now, those changes will be lost.\n\nContinue?")) {              
                status.html("Not saved. Please connect to the internet to synchronize local changes to the server.");
                status.css("opacity", 1);
                $("#email").val(localStorage.email);
                return;
          }
  }
  if (email != localStorage.email)
    localStorage.clear();
            
  localStorage.email = email;
  localStorage.password = $("#password").val();	
  localStorage.abstractlines = $("#abstractlines").val();
  localStorage.opentonote  = $('#opentonote').attr("checked");
  localStorage.showdate  = $('#showdate').attr("checked");

  
  if (localStorage && localStorage.email && localStorage.password && localStorage.abstractlines) {
    status.html("Options saved");
  } else {
    status.html("Save failed");
  }

  status.css("opacity", 1);
  setTimeout(function() {
    status.css("opacity", 0);
  }, ms);
}

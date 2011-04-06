$(document).ready(function() {
  if (localStorage) {
    $("#email").val(localStorage.email);
    $("#password").val(localStorage.password);    
    localStorage.abstractlines && $("#abstractlines").val(localStorage.abstractlines);
  }
});

/*
 * Saves options to localStorage.
 * @param ms Milliseconds to fade in the status message.
 */
function save_options(ms) {
  if (localStorage) {
      localStorage.email = $("#email").val();
      localStorage.password = $("#password").val();	
      localStorage.abstractlines = $("#abstractlines").val();	
  }

  var status = $("#status");
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

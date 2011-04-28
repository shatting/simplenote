CodeMirror.defineMode("simplenote", function() {
  return {
    token: function(stream) {
      var url; 
      var urlRe = /^https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w/_\.]*(\?\S+)?)?)?/;
      var urlRe = /^https?:\/\/[^:\/\s]+\.[^\s\(\)\[\]]*/;
      var urlRe = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?[^\s\(\)\[\]\.]/;
      //var urlRe = new RegExp();
      //urlRe.compile("^[A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+");
      //var urlRe = /^(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]/;

      if (stream.peek() == "h") {
        url = stream.match(urlRe, true);

        if (url)
          return "sn-link";
        else
          stream.next();
      }
    
      if (!stream.skipTo("h"))
          stream.skipToEnd();
      else
          return;

    }
  };
});

CodeMirror.defineMIME("text/simplenote", "simplenote");
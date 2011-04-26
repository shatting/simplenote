CodeMirror.defineMode("simplenote", function() {
  return {
    token: function(stream) {
      var url;      
      var urlRe = /^https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w/_\.]*(\?\S+)?)?)?/;
      //var urlRe = /^https?:\/\/[^:\/\s]+\.[^\s\(\)\[\]]*/;

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
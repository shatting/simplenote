var SimpleParser = Editor.Parser = (function() {
//  function tokenizeDummy(source) {
//    while (!source.endOfLine()) source.next();
//    return "text";
//  }
  var tokenizeSimple = (function() {

    var urlRe = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?[^\s\(\)\[\]\.]/;

    function normal(source, setState) {
      var ch = source.peek();
      var url;
      if (ch != "h") {
        source.nextWhileMatches(/[^h\n]/);
        return "text";
      } else {
        url = source.lookAheadRegex(urlRe, true);
        if (url)
            return "sn-link";
        else {
            var s = source.next();
            return "text";
        }
      }
    }

    return function(source, startState) {
      return tokenizer(source, startState || normal);
    };
  })();
  
  function parseSimple(source) {
    function indentTo(n) {return function() {return n;}}
    source = tokenizeSimple(source);
    var space = 0;

    var iter = {
      next: function() {
        var tok = source.next();
        if (tok.type == "whitespace") {
          if (tok.value == "\n") tok.indentation = indentTo(space);
          else space = tok.value.length;
        }
        return tok;
      },
      copy: function() {
        var _space = space;
        return function(_source) {
          space = _space;
          source = tokenizeSimple(_source);
          return iter;
        };
      }
    };
    return iter;
  }
  return {make: parseSimple};
})();

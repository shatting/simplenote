var SimpleParser = Editor.Parser = (function() {
//  function tokenizeDummy(source) {
//    while (!source.endOfLine()) source.next();
//    return "text";
//  }
  var config;
  
  var tokenizeSimple = (function() {

    var urlRe = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)\.(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?[^\s\(\)\[\]\."'{}]/;
    var urlRe = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?((?:[a-z0-9]?(?:[a-z0-9\-]{0,61}[a-z0-9])+\.)+[a-z]{2,6}|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(:[0-9]{1,4})?(\/[\w#!~:.?+=&%@!\-\/]*)?/i;
    //                                 (user:passwrd@)?((?:no "-"     (?:                              )+ .)+[tld no "-" ])(:port      )?(/ | /(path               ))?
    //var urlRe = /^(\()((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\))|(\[)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\])|(\{)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\})|(<|&(?:lt|#60|#x3c);)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(>|&(?:gt|#62|#x3e);)|((?:^|[^=\s'"\]])\s*['"]?|[^=\s]\s+)(\b(?:ht|f)tps?:\/\/[a-z0-9\-._~!$'()*+,;=:\/?#[\]@%]+(?:(?!&(?:gt|#0*62|#x0*3e);|&(?:amp|apos|quot|#0*3[49]|#x0*2[27]);[.!&',:?;]?(?:[^a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]|$))&[a-z0-9\-._~!$'()*+,;=:\/?#[\]@%]*)*[a-z0-9\-_~$()*+=\/#[\]@%])/i;
    // from http://jmrware.com/articles/2010/linkifyurl/linkify.html
    function urlInfo(urlMatch) {
        var urlinfo = {
            full: urlMatch[0],
            protocol: urlMatch[1],
            userpass: urlMatch[2],
            domain: urlMatch[3],
            port: urlMatch[4],
            path: urlMatch[5]            
        };
        return urlinfo;
    }
    function normal(source, setState) {
      var ch = source.peek();
      var url;
      if (source.endOfLine()) {
          source.next();
          return "whitespace";
      }
      url = source.lookAheadRegex(urlRe, true)
      if (url) {
          //console.log("found a link:");
          //console.log(urlInfo(url));
          return "sn-link";
      }
      
      for (var i = 0; i<config.headings.length; i++) {
          var title = config.headings[i].title;
          var notelink = source.lookAheadRegex(new RegExp("^" + RegExp.escape(title),"i"),true);
          if (notelink) {              
              return "sn-notelink";
          }
      }
      
      while(!url && !source.endOfLine()) {
        source.nextWhileMatches(/[^h\n\s]/);
        if (!source.endOfLine()) {
            url = source.lookAheadRegex(urlRe, false);
            if (url)
                return "text";
            else {
                source.next();                
            }
        } else
            return "text";
      }      
      return "text";
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
  
  function configure(inconfig) {
    config = inconfig;
  }
  return {make: parseSimple, configure:configure};
})();

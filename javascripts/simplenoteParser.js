var SimpleParser = Editor.Parser = (function() {
//  function tokenizeDummy(source) {
//    while (!source.endOfLine()) source.next();
//    return "text";
//  }
  var config;
  
  var tokenizeSimple = (function() {

    //var urlRe = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)\.(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?[^\s\(\)\[\]\."'{}]/;
    var urlRe = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?((?:[a-z0-9]?(?:[a-z0-9\-]{0,61}[a-z0-9])+\.)+[a-z]{2,6}|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(:[0-9]{1,4})?(\/[\w#!~:.?+=&%@!\-\/]*)?/i;
    //                                 (user:passwrd@)?((?:no "-"     (?:                              )+ .)+[tld no "-" ])(:port      )?(/ | /(path               ))?
    
    //var urlRe = /^(\()((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\))|(\[)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\])|(\{)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\})|(<|&(?:lt|#60|#x3c);)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(>|&(?:gt|#62|#x3e);)|((?:^|[^=\s'"\]])\s*['"]?|[^=\s]\s+)(\b(?:ht|f)tps?:\/\/[a-z0-9\-._~!$'()*+,;=:\/?#[\]@%]+(?:(?!&(?:gt|#0*62|#x0*3e);|&(?:amp|apos|quot|#0*3[49]|#x0*2[27]);[.!&',:?;]?(?:[^a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]|$))&[a-z0-9\-._~!$'()*+,;=:\/?#[\]@%]*)*[a-z0-9\-_~$()*+=\/#[\]@%])/i;
    // from http://jmrware.com/articles/2010/linkifyurl/linkify.html
//    function urlInfo(urlMatch) {
//        var urlinfo = {
//            full: urlMatch[0],
//            protocol: urlMatch[1],
//            userpass: urlMatch[2],
//            domain: urlMatch[3],
//            port: urlMatch[4],
//            path: urlMatch[5]            
//        };
//        return urlinfo;
//    }
    
    function noteLinkLookAhead(source,consume) {
      if (!config.headings)
          return null;
      
      var link = source.lookAheadRegex(/^#([^\s]+)/,false);
//      console.log("possible wikilink: " + link[1]);
      if (!link)
          return false;
      
      var title = link[1].replace(/_/g," ");
//      console.log("searching for title: " + title);
//      
      var matches = config.headings.filter(function(h) {          
         return h.title.length == title.length && h.title == title; 
      });
      
//      console.log("%i matches found", matches.length);
//      for (var i= 0; i<matches.length; i++) {
//          console.log(matches[i]);
//      }
      
      if (consume) {
          if (matches.length > 0) {
              source.lookAheadRegex(/^#([^\s]+)/,true);              
              return true;
          }
      } else
          return matches.length > 0;
          
      
//      for (var i = 0; i<config.headings.length; i++) {
//          var title = config.headings[i].title;
//          var match = source.lookAheadRegex(new RegExp("^#" + RegExp.escape(title.trim().replace(/ /g,"_")),"i"),consume);
//          console.log("testing " + title)
//          if (match) {
//              console.log(" <-matched")
//              return match;
//          }
//      }      
    }

    function endOfLine(source,setState) {
        console.log(source.peek())
        setState(normal)
        return "whitespace";
    }

    var checked = false;
    function checklist(source, setState) {
        if (source.endOfLine()) {
          source.next();          
          return "whitespace";
        }
              
        line = source.lookAheadRegex(/^.*/, true);
      
//        if (source.peek() != config.checklist[0] && source.peek() != config.checklist[1])
//          setState(checklist)
//        else
//          setState(normal);
        
        setState(endOfLine);
        
        return checked?"text-checked":"text"
    }
    
    function normal(source, setState) {
      var url, notelink;
      if (source.endOfLine()) {
          source.next();
          return "whitespace";
      }
            
      if (config.wikilinks && source.equals("#")) {
          notelink = noteLinkLookAhead(source,true);
          if (notelink) {              
                return "sn-link-note";
          }
      }
      
      url = source.lookAheadRegex(urlRe, true)
      if (url) {
          //console.log("found a link:");
          //console.log(urlInfo(url));
          return "sn-link";
      }      
      
      if (config.checklist) {
          if (source.lookAheadRegex(new RegExp("^\\" + config.checklist[0] + " "),true)) {
              setState(checklist);
              checked = false;
              return "checkbox";
          }
          if (source.lookAheadRegex(new RegExp("^\\" + config.checklist[1] + " "),true)) {
              setState(checklist);
              checked = true;
              return "checkbox-checked";
          }
      }

      
      while(!url && !source.endOfLine()) {
        source.nextWhileMatches(/[^h\n\s\#]/);
        if (!source.endOfLine()) {
            if (source.equals("h"))
                url = source.lookAheadRegex(urlRe, false);
            else
                url = false;
            
            if (config.wikilinks && source.equals("#"))
                notelink = noteLinkLookAhead(source, false);            
            else
                notelink = false;
            
            if (url || notelink)
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
//    try {
//        while (x = iter.next())            
//            console.log(JSON.stringify(x.value) + " - " + x.type)
//    } catch(e) {}
    
    return iter;
  }
  
  function configure(inconfig) {
    config = inconfig;
  }
  return {make: parseSimple, configure:configure};
})();

RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
//
//function mergeobj(obj1,obj2){
//    var obj3 = {};
//    for (attrname in obj1) {obj3[attrname] = obj1[attrname];}
//    for (attrname in obj2) {obj3[attrname] = obj2[attrname];}
//    return obj3;
//}
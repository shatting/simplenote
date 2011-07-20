
function dropdown(codeMirror,contents) {
    var results_holder = $('<div class="as-results" id="title_dropdown"></div>');
    var results_ul =  $('<ul class="as-list"></ul>');

    results_holder.append(results_ul);

    for (var i=0;i<contents.length; i++) {
        var formatted = $('<li class="as-result-item" id="as-result-item-'+i+'"></li>').bind("mousedown",function(){                                    
            accept(this);
        }).mouseover(function(){
            $("li", results_ul).removeClass("active");
            $(this).addClass("active");
        });

        formatted = formatted.html(contents[i]);

        results_ul.append(formatted);
    }
    
    codeMirror.grabKeys(function(event) {
        switch(event.which) {
            case 38: // up
                moveSuggestionsSelection("up");                            
                break;
            case 40: // down
                moveSuggestionsSelection("down");                            
                break;
            case 13:
                accept($("li.active:first", results_holder));
                break;
        }
        
    }, function() {return true;})
    
    var coords = codeMirror.cursorCoords(true);

    results_holder.css("position","absolute")
    results_holder.css("left",coords.x + "px");
    results_holder.css("top",coords.y + "px");
    
    $("body").append(results_holder);
    
    function accept(li) {
        codeMirror.ungrabKeys();
        codeMirror.replaceSelection($(li).html());
        results_holder.remove(); 
    }
    
    function moveSuggestionsSelection(direction){
        var lis = $("li", results_holder);

        if(direction == "down"){
            var start = lis.eq(0);
        } else {
            var start = lis.filter(":last");
        }

        var active = $("li.active:first", results_holder);
        if(active.length > 0){
            if(direction == "down"){
                start = active.next();
            } else {
                start = active.prev();
            }
        }

        lis.removeClass("active");
        start.addClass("active");

        if (start.length != 0) {
            // scroll
            var ul = $(".as-list");
            var ul_st = ul.scrollTop();
            var ul_height = ul.height();
            var ul_top = ul.offset().top;

            var top = start.offset();
            var elm_top = top.top-ul_top + ul_st;
            var elm_height = start.outerHeight();

//                          console.log("windowheight=%s, scrollheight=%s, ul_top=%s, ul_height=%s",$(window).height(),ul.get(0).scrollHeight,ul_top,ul_height)
//                          console.log("elm_top=%s, ul_st=%s",elm_top,ul_st)
            if (elm_top + elm_height < ul_st || elm_top > ul_st + ul_height) // not in sight
                ul.scrollTop(elm_top-0.5*ul_height)
            else if (elm_top < ul_st + 1/4*ul_height)
                ul.scrollTop(ul_st - elm_height)
            else if (ul_st + 3/4*ul_height < elm_top + elm_height)
                ul.scrollTop(ul_st + elm_height)
        }

    }
    
}

/*
 * AutoSuggest
 * Copyright 2009-2010 Drew Wilson
 * www.drewwilson.com
 * code.drewwilson.com/entry/autosuggest-jquery-plugin
 *
 * Version 1.4   -   Updated: Mar. 23, 2010
 *
 * This Plug-In will auto-complete or auto-suggest completed search queries
 * for you as you type. You can add multiple selections and remove them on
 * the fly. It supports keybord navigation (UP + DOWN + RETURN), as well
 * as multiple AutoSuggest fields on the same page.
 *
 * Inspied by the Autocomplete plugin by: J�rn Zaefferer
 * and the Facelist plugin by: Ian Tearle (iantearle.com)
 *
 * This AutoSuggest jQuery plug-in is dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

(function($){
    $.fn.autoSuggest = function(data, options) {
        var defaults = {
            asHtmlID: false,
            startText: "Enter Name Here",
            emptyText: "No Results Found",
            preFill: {},
            limitText: "No More Selections Are Allowed",
            selectedItemProp: "value", //name of object property
            selectedValuesProp: "value", //name of object property
            searchObjProps: "value", //comma separated list of object property names
            queryParam: "q",
            retrieveLimit: false, //number for 'limit' param on ajax request
            extraParams: "",
            matchCase: false,
            minChars: 1,
            keyDelay: 400,
            resultsHighlight: true,
            neverSubmit: false,
            selectionLimit: false,
            showResultList: true,
            start: function(){},
            selectionClick: function(elem){},
            selectionAdded: function(elem){},
            selectionRemoved: function(elem){
                elem.remove();
            },
            formatList: false, //callback function
            beforeRetrieve: function(string){
                return string;
            },
            retrieveComplete: function(data){
                return data;
            },
            resultClick: function(data){},
            resultsComplete: function(){},
            onChange: function() {},
            onSetupDone: function() {},
            onTabOut: function() {}
        };
        var opts = $.extend(defaults, options);

        var d_type = "object";
        var data_itemcount = 0;
        if(typeof data == "string") {
            d_type = "string";
            var req_string = data;            
        } else if (typeof data == "function") {
            d_type = "function";
            var data_function = data;
        } else {
            var org_data = data;
            for (k in data) if (data.hasOwnProperty(k)) data_itemcount++;
        }
        if((d_type == "object" && data_itemcount >= 0) || d_type == "string" || d_type == "function"){
            return this.each(function(x){
                if(!opts.asHtmlID){
                    x = x+""+Math.floor(Math.random()*100); //this ensures there will be unique IDs on the page if autoSuggest() is called multiple times
                    var x_id = "as-input-"+x;
                } else {
                    x = opts.asHtmlID;
                    var x_id = x;
                }

                opts.start.call(this);

                var input = $(this);
                input.attr("autocomplete","off").addClass("as-input").attr("id",x_id);

                var input_focus = false;
                var values_array = [];
                var lastKeyPressCode;

                // Setup basic elements and render them to the DOM
                input.wrap('<ul class="as-selections" id="as-selections-'+x+'"></ul>').wrap('<li class="as-original" id="as-original-'+x+'"></li>');

                var item_holder = $("#as-selections-"+x);
                var org_li = $("#as-original-"+x);
                var results_holder = $('<div class="as-results" id="as-results-'+x+'"></div>').hide();
                var results_ul =  $('<ul class="as-list"></ul>');

                if(typeof opts.preFill == "string"){
                    var vals = opts.preFill.split(",");
                    for(var i=0; i < vals.length; i++){
                        var v_data = {};
                        v_data[opts.selectedValuesProp] = vals[i];
                        if(vals[i] != ""){
                            addListItem(v_data, "000"+i, true);
                        }
                    }
                } else {
                    var prefill_count = 0;
                    for (k in opts.preFill) if (opts.preFill.hasOwnProperty(k)) prefill_count++;
                    if(prefill_count > 0){
                        for(var i=0; i < prefill_count; i++){
                            var new_v = opts.preFill[i][opts.selectedValuesProp];
                            if(new_v == undefined){
                                new_v = "";
                            }
                            if(new_v != ""){
                                addListItem(opts.preFill[i], "000"+i,true);
                            }
                        }
                    }
                }
                if(values_array.length > 0){
                    input.val("");
                    $("li.as-selection-item", item_holder).addClass("blur").removeClass("selected");
                } else
                    input.val(opts.startText);

                item_holder.click(function(){
                    input_focus = true;
                    input.focus();
                }).mousedown(function(){
                    input_focus = false;
                }).after(results_holder);

                adjustInputWidth();

                opts.onSetupDone.call(this);

                var timeout = null;
                var prev_query = "";
                var tab_press = false;

                // Handle input field events
                input.focus(function(){
                    if($(this).val() == opts.startText){
                        $(this).val("");
                        adjustInputWidth();

                    } else if(input_focus){
                        $("li.as-selection-item", item_holder).removeClass("blur");
                        if($(this).val() != ""){
                            //console.log("focus:input_focus")
                            //results_holder.show();
                        }
                    }
                    input_focus = true;
                    return true;
                }).blur(function(){
                    //$(".as-selection-item",item_holder).css("border-color","")
                    $("li.as-selection-item", item_holder).addClass("blur").removeClass("selected");
                    results_holder.hide();

                    if($(this).val() == "" && values_array.length == 0){

                        $(this).val(opts.startText);
                        adjustInputWidth();

                    } else if(input_focus){

                        var i_input = getInputValue();

                        if(i_input != "" && values_array.indexOf(i_input) < 0 && i_input.length >= opts.minChars){

                            var n_data = {};
                            n_data[opts.selectedItemProp] = i_input;
                            n_data[opts.selectedValuesProp] = i_input;

                            var lis = $("li", item_holder).length;

                            addListItem(n_data, "00"+(lis+1));

                        }
                        input.val("");
                    }
                }).keydown(function(e) {
                    // track last key pressed
                    lastKeyPressCode = e.keyCode;

                    $(".as-selection-item",item_holder).css("border-color","")
                    if (e.keyCode != 8)
                        item_holder.children().removeClass("selected");

                    switch(e.keyCode) {
                        case 38: // up
                            e.preventDefault();
                            moveSuggestionsSelection("up");                            
                            break;
                        case 40: // down
                            e.preventDefault();
                            moveSuggestionsSelection("down");                            
                            break;
                        case 8:  // delete
                            if(input.val() == ""){ // select or delete previous

                                item_holder.children().not(org_li.prev()).removeClass("selected");

                                if(org_li.prev().hasClass("selected")){ // delete

                                    removeListItem();

                                } else if (org_li.prev().length > 0) { // select
                                    opts.selectionClick.call(this, org_li.prev());
                                    org_li.prev().addClass("selected");
                                }

                            } else
                                opts.onChange.call(this,"edited");

                            if(input.val().length <= 1){ // emptied input with this delete press
                                results_holder.hide();
                                prev_query = "";
                            }
                            adjustInputWidth();

                            //if($(":visible",results_holder).length > 0){
                            if (timeout){
                                clearTimeout(timeout);
                            }
                            timeout = setTimeout(function(){
                                showSuggestions();
                            }, opts.keyDelay);
                            //}
                            break;
                        case 9: case 32: // tab or space

                            e.preventDefault();
                            tab_press = true;
                            var i_input = getInputValue();

                            if(i_input != "" && values_array.indexOf(i_input) < 0 && i_input.length >= opts.minChars){

                                var n_data = {};
                                n_data[opts.selectedItemProp] = i_input;
                                n_data[opts.selectedValuesProp] = i_input;

                                var lis = $("li", item_holder).length;

                                addListItem(n_data, "00"+(lis+1));

                                input.val("");
                            } else if (i_input != "" && values_array.indexOf(i_input) >= 0) {
                                $($(".as-selection-item",item_holder).get(values_array.indexOf(i_input))).css("border-color","red")
                            } else if (i_input == "") {
                                if (e.keyCode == 9)
                                    opts.onTabOut.call(this);
                                else
                                    showSuggestions(true);
                            }
                            break;
                        case 13: // return

                            tab_press = false;
                            var active = $("li.active:first", results_holder);
                            if(active.length > 0){
                                active.mousedown();
                                results_holder.hide();
                            }
                            if(opts.neverSubmit || active.length > 0){
                                e.preventDefault();
                            }
                            break;
                        case 27: // esc
                            var i_input = getInputValue();
                            var suggestions_open = $(":visible",results_holder).length > 0;

                            if (suggestions_open) {
                                results_holder.hide();
                                e.preventDefault();
                            } else if (i_input != "") {
                                e.preventDefault();                            
                                input.val("");
                            }
                            break;
                        default:
                            if(opts.showResultList){
                                if(opts.selectionLimit && $("li.as-selection-item", item_holder).length >= opts.selectionLimit){
                                    results_ul.html('<li class="as-message">'+opts.limitText+'</li>');
                                    results_holder.show();
                                } else {
                                    if (timeout){
                                        clearTimeout(timeout);
                                    }
                                    timeout = setTimeout(function(){
                                        showSuggestions();
                                    }, opts.keyDelay);
                                }
                            }
                            opts.onChange.call(this,"edited");
                            break;
                    }

                    adjustInputWidth();

                }).bind("cut paste",function() {
                    // autosize input
                    $(".as-selection-item",item_holder).css("border-color","")

                    adjustInputWidth();
                    opts.onChange.call(this,"edited");

                }).bind("keyup", function() {
                    adjustInputWidth();
                });

                function getInputValue() {
                    return input.val().replace(" ","").trim();
                }

                function getNextItemID() {

                }

                function showSuggestions(forceshow) {
                    // ignore if the following keys are pressed: [del] [shift] [capslock]
                    if( lastKeyPressCode == 46 || (lastKeyPressCode > 8 && lastKeyPressCode < 32) ){
                        results_holder.hide();
                        return;
                    }

                    var query = input.val().trim();

                    if (query == prev_query && !forceshow) return;

                    prev_query = query;

                    if (query.length >= opts.minChars || forceshow) {

                        item_holder.addClass("loading");

                        if(d_type == "string"){ //AJAX
                            var limit = "";
                            if(opts.retrieveLimit){
                                limit = "&limit="+encodeURIComponent(opts.retrieveLimit);
                            }
                            if(opts.beforeRetrieve){
                                query = opts.beforeRetrieve.call(this, query);
                            }
                            $.getJSON(req_string+"?"+opts.queryParam+"="+encodeURIComponent(query)+limit+opts.extraParams, function(data){
                                data_itemcount = 0;
                                var new_data = opts.retrieveComplete.call(this, data);

                                for (var k in new_data) if (new_data.hasOwnProperty(k)) data_itemcount++;

                                processSuggestionData(new_data, query);
                            });
                        } else if (d_type == "function") {                            
                            data_function.call(this,function(new_data) {
                                new_data = opts.retrieveComplete.call(this, new_data);
                                data_itemcount = 0;
                                for (var k in new_data) if (new_data.hasOwnProperty(k)) data_itemcount++;
                                d_type = "object";
                                org_data = new_data;
                                processSuggestionData(new_data, query);
                            });
                        } else { //static data
                            if(opts.beforeRetrieve){
                                query = opts.beforeRetrieve.call(this, query);
                            }
                            processSuggestionData(org_data, query);
                        }
                    } else {
                        item_holder.removeClass("loading");
                        results_holder.hide();
                    }
                }

                var num_count = 0;

                function processSuggestionData(data, query){

                    if (!opts.matchCase){
                        query = query.toLowerCase();
                    }

                    query=query.trim();

                    var matchCount = 0;

                    results_holder.html(results_ul.html("")).hide();

                    for(var i=0;i<data_itemcount;i++){
                        var num = i;
                        num_count++;

                        var data_string = "";

                        if(opts.searchObjProps == "value") {
                            data_string = data[num].value;
                        } else {
                            var names = opts.searchObjProps.split(",");
                            for(var y=0;y<names.length;y++){
                                var name = $.trim(names[y]);
                                data_string = data_string+data[num][name]+" ";
                            }
                        }

                        if (!opts.matchCase)
                            data_string = data_string.toLowerCase();

                        if((query == "" || data_string.indexOf(query) >= 0) && values_array.indexOf(data[num][opts.selectedValuesProp]) == -1) {

                            var formatted = $('<li class="as-result-item" id="as-result-item-'+num+'"></li>').mousedown(function(){
                                var raw_data = $(this).data("data");
                                var number = raw_data.num;
                                if($("#as-selection-"+number, item_holder).length <= 0 && !tab_press){
                                    var data = raw_data.attributes;
                                    input.val("").focus();
                                    prev_query = "";
                                    addListItem(data, number);
                                    opts.resultClick.call(this, raw_data);
                                    results_holder.hide();
                                }
                                tab_press = false;
                                input_focus = false;
                            }).mouseover(function(event){
                                $("li", results_ul).removeClass("active");
                                $(this).addClass("active");
                                event.stopPropagation();
                                event.preventDefault();
                                event.preventBubble();
                                event.preventCapture();
                            }).data("data",{
                                attributes: data[num],
                                num: num_count
                            });
                            
                            var this_data = $.extend({},data[num]);
                            var regx = new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + RegExp.escape(query) + ")(?![^<>]*>)(?![^&;]+;)", "g" + (opts.matchCase?"":"i"));

                            if(opts.resultsHighlight){
                                this_data[opts.selectedItemProp] = this_data[opts.selectedItemProp].replace(regx,"<em>$1</em>");
                            }
                            if(!opts.formatList){
                                formatted = formatted.html(this_data[opts.selectedItemProp]);
                            } else {
                                formatted = opts.formatList.call(this, this_data, formatted);
                            }
                            results_ul.append(formatted);
                            delete this_data;
                            matchCount++;
                            if(opts.retrieveLimit && opts.retrieveLimit == matchCount ){
                                break;
                            }

                        }
                    }

                    item_holder.removeClass("loading");

                    if(matchCount == 0){
                        results_ul.html('<li class="as-message">'+opts.emptyText+'</li>');
                    } else {
                        results_holder.css("position","absolute")
                        results_holder.css("left",($(input).get(0).offsetLeft - 30) + "px");
                        results_holder.css("top",($(input).get(0).offsetTop) + "px");
                        results_holder.show();
                        var offset = $("#as-results-tagsauto .as-list").offset();
                        var height = $("#as-results-tagsauto .as-list").height();
                        var win_height = $(window).height();
                        //                                            log(offset.top)
                        //                                            log(height)
                        //                                            log(win_height)
                        var MARGIN_BOTTOM = 25;
                        $("#as-results-tagsauto .as-list").css("max-height",(win_height - offset.top - MARGIN_BOTTOM) + "px");
                        if (height > win_height - offset.top - MARGIN_BOTTOM) // adjust width for scrollbar
                            $("#as-results-tagsauto .as-list").css("width",($("#as-results-tagsauto .as-list").width() + 15) + "px");

                    }

                    opts.resultsComplete.call(this);
                }

                function addListItem(data, num, initial_value){

                    values_array.push(data[opts.selectedValuesProp]);

                    var item = $('<li class="as-selection-item" id="as-selection-'+num+'"></li>').click(function(){
                        opts.selectionClick.call(this, $(this));
                        input_focus = true;
                        input.blur();
                        close.click();
                        input.val(data[opts.selectedValuesProp]);
                        adjustInputWidth();
                        input.focus();
                        //item_holder.children().removeClass("selected");
                        //$(this).addClass("selected");
                    }).mousedown(function(){
                        input_focus = false;
                    });

                    var close = $('<a class="as-close">&times;</a>').click(function(){

                        removeListItem(item,data[opts.selectedValuesProp]);
                        
                        input_focus = true;
                        input.focus();
                        return false;
                    }).hide();

                    org_li.before(item.html(data[opts.selectedItemProp]).prepend(close));

                    if (!initial_value) {
                        opts.selectionAdded.call(item, item);
                        opts.onChange.call(input,"added");
                    }

                    org_li.prev().hover(function(elem) {
                        $(".as-close",this).show("fast");
                    } ,function(elem) {
                        $(".as-close",this).hide("fast");
                    });

                    results_holder.hide();
                }

                function removeListItem(item,value) {
                    if (!value && !item) {
                        item = org_li.prev();
                        values_array.splice(values_array.length-1,1);
                    } else
                        values_array.splice(values_array.indexOf(value),1);

                    opts.selectionRemoved.call(item, item);
                    opts.onChange.call(input,"removed");

                }

                function adjustInputWidth() {
                    input.get(0).style.width = ((input.val().length + 6)/1.8)+'em';
                }

                function moveSuggestionsSelection(direction){
                    if($(":visible",results_holder).length > 0){
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
                            var ul = $("#as-results-tagsauto .as-list");
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

                    } else if (direction == "down")
                        showSuggestions(true); // show all on down

                }

            });
        }
    }
})(jQuery);
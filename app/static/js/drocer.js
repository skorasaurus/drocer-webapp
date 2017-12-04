function drocerApp() {

    // Private variables

    const _drocerState = {
        match_box_text: '',
        page_number: null,
        match_number: null,
        document_name: '',
        match_count: null
    };

    const search_input_element_id = 'search-input';
    const search_results_element_id = 'search-results';
    const search_result_control_element_id = 'search-results-control';
    const page_image_container_id = 'page-image-container';
    const page_image_element_id = 'page-image';
    const page_overlay_element_id = 'page-image-overlay';
    const search_button_id = 'search-button';
    const match_previous_button_id = "match-previous-button";
    const match_next_button_id = "match-next-button";
    const page_previous_button_id = "page-previous-button";
    const page_next_button_id = "page-next-button";
    const spinner_html = '<div class="preloader-wrapper big active"><div class="spinner-layer spinner-green-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>';;
    const no_results_text = 'No results.';

    const search_button = $('#' + search_button_id);
    const match_previous_button = $('#' + match_previous_button_id);
    const match_next_button = $('#' + match_next_button_id);
    const page_previous_button = $('#' + page_previous_button_id);
    const page_next_button = $('#' + page_next_button_id);

    // Set up button click handlers

    search_button.click(search);

    match_previous_button.click(match_previous);
    match_next_button.click(match_next);

    page_previous_button.click(page_previous);
    page_next_button.click(page_next);

    // Functions

    function search() {
        var results_container = document.getElementById(search_results_element_id);
        $(results_container).html(spinner_html);
        $.post(
            './search', { q: $('#' + search_input_element_id).val() },
            searchCallback,
            'json'
        );
    };

    function searchCallback(response) {
        window.DEBUG_SEARCH = response; //debug
        if (response.matches.length > 0) {
            render_search_results(response.matches);
            result_controls_show();
        } else {
            $(document.getElementById(search_results_element_id)).text(no_results_text);
            result_controls_hide();
        }
    }

    function page_previous() {
        page_change(-1);
    }

    function page_next() {
        page_change(1);
    }

    function page_change(direction) {

        var current_page = parseInt(_drocerState.page_number);
        if (current_page == 1 && direction < 0) {
            return;
        }

        _drocerState.page_number = current_page + direction;
        var page_image_url = './page_images/' + _drocerState.document_name + '-' + _drocerState.page_number + '.png';
        var page_image = new Image();
        page_image.src = page_image_url;
        page_image.id = page_image_element_id;
        page_image.style.zIndex = 900;
        var page_image_container = document.getElementById(page_image_container_id);
        $(page_image_container).html(page_image);

        // hide overlay
        var ov = document.getElementById(page_overlay_element_id);
        ov.style.height = '0px';
        ov.style.width = '0px';

        // reset scroll
        scroll_to(0, 0);
    }

    function match_previous() {
        match_change(-1);
    }

    function match_next() {
        match_change(1);
    }

    function match_change(direction) {
        if (!_drocerState.match_number) {
            return;
        }

        var match_number = parseInt(_drocerState.match_number);
        match_number += direction;
        var selector = '[data-drocer-match-number=' + match_number + ']';
        if ($(selector).length) {
            $(selector).click();
            _drocerState.match_number = match_number;
        }

    }

    function overlay_click() {
        var ov = document.getElementById(page_overlay_element_id);
        ov.style.background = 'rgba(255, 255, 165, 1)';
        var box_text_html = _drocerState.match_box_text.replace('\n', '<br>');
        $(ov).html(box_text_html);
        $(ov).unbind('click');
        ov.title = '';
    }

    function render_search_results(results) {
        var results_container = document.getElementById(search_results_element_id);
        var ul = document.createElement('ul');
        ul.className = 'collection';
        var match_number = 1;
        for (var r in results) {
            var result = results[r];
            // create collection item
            var li = document.createElement('li');
            li.className = 'collection-item';
            ul.appendChild(li);
            // create collection item title
            var span = document.createElement('span');
            span.className = 'title';
            span.style = 'font-weight: bold;'
            var txt = document.createTextNode(result.title);
            span.appendChild(txt);
            li.appendChild(span);
            // create collection item lines
            for (var b in result.boxes) {

                var box = result.boxes[b];

                if (!box.page_number) {
                    continue;
                }

                var p = document.createElement('p');
                var txt = document.createTextNode('Page ' + box.page_number);
                var a = document.createElement('a');

                a.href = '#';
                a.title = box.text;
                a.setAttribute('data-drocer-box', JSON.stringify(box));
                a.setAttribute('data-drocer-document-name', JSON.stringify(result.document_name));
                a.setAttribute('data-drocer-match-number', match_number);
                a.onclick = function() {
                    var document_name = JSON.parse(this.getAttribute('data-drocer-document-name'));
                    var box = JSON.parse(this.getAttribute('data-drocer-box'));
                    // update application state
                    _drocerState.document_name = document_name;
                    _drocerState.page_number = box.page_number;
                    _drocerState.match_number = this.getAttribute('data-drocer-match-number');
                    _drocerState.match_box_text = box.text;
                    $('[data-drocer-match-number]').css('background-color', '');
                    $(this).css('background-color', '#a5d6a7');
                    // load page image
                    var page_image_url = './page_images/' + document_name + '-' + box.page_number + '.png';
                    var page_image = new Image();
                    page_image.onload = function() {
                        // position overlay on match box
                        var ov = document.getElementById(page_overlay_element_id);
                        ov.title = 'Click to select text.';
                        ov.style.background = 'rgba(255, 255, 0, 0.35)';
                        $(ov).html('');
                        $(ov).bind('click', overlay_click);

                        page_box = box_to_page(box);

                        ov.style.height = page_box.height + 'px';
                        ov.style.width = page_box.width + 'px';
                        ov.style.top = page_box.top + 'px';
                        ov.style.left = page_box.left + 'px';
                        window.DEBUG_PAGE_BOX = page_box; //debug
                        var scroll_x = page_box.left - 325; // aesthetic offset(25) + menu width offset(300)
                        var scroll_y = page_box.top - 175; // aesthetic offset(25) + control height offset (175)
                        //console.log('scrolling: window.scrollTo('+scroll_x+','+scroll_y+')');//debug

                        scroll_to(scroll_x, scroll_y);
                    }
                    page_image.src = page_image_url;
                    page_image.id = page_image_element_id;
                    page_image.style.zIndex = 900;
                    var page_image_container = document.getElementById(page_image_container_id);
                    $(page_image_container).html(page_image);
                    window.DEBUG_BOX = box; //debug
                };
                p.appendChild(txt);

                p.appendChild(micro_page(box));

                a.appendChild(p);
                li.appendChild(a);
                match_number++;

            }
        }
        _drocerState.match_count = match_number;
        $(results_container).html(ul);
    }

    /**
     * Convert PDF BBox coordinates to page image coordinates.
     * @param box DrocerBox with x0,y0,x1,y1 in points (lower-left origin).
     * @returns Object with top, left, height, and width in px (top-left origin).
     * 
     */
    function box_to_page(box) {
        scroll_to(0, 0); // reset page offset; simplifies location calculation
        // note: images converted at 175 dpi are 1466px x 1903px
        var img_rect = document.getElementById('page-image').getBoundingClientRect();
        var x_scale = 175 / 72; // convert dpi / source dpi
        var y_scale = 175 / 72; // convert dpi / source dpi
        function page_x(x) {
            return img_rect.left + x * x_scale;
        }

        function page_y(y) {
            return img_rect.top + img_rect.height - y * y_scale;
        }
        return {
            top: page_y(box.y1),
            left: page_x(box.x0),
            height: page_y(box.y0) - page_y(box.y1),
            width: page_x(box.x1) - page_x(box.x0)
        }
    }

    function scroll_to(x, y) {
        window.scrollTo(x, y);
    }

    function result_controls_show() {
        $(document.getElementById(search_result_control_element_id)).show();
    }

    function result_controls_hide() {
        $(document.getElementById(search_result_control_element_id)).hide();
    }

    /**
     * Create a tiny div showing the location of a box in a page.
     *
     */
    function micro_page(box) {
        var mp_height = 38;
        var mp_width = 28;
        var mp_scale_y = (175 / 72) * (mp_height / 1903);
        var mp_scale_x = (175 / 72) * (mp_width / 1466);
        var mp_div = document.createElement('div');
        mp_div.style = "border: 1px solid black; z-index:950; margin-top: 5px; min-height: 38px; min-width: 28px; float:right; clear: none;";
        mp_div.height = mp_height;
        mp_div.width = mp_width;
        mp_box = {
            top: mp_height - box.y1 * mp_scale_y,
            left: box.x0 * mp_scale_x,
            height: Math.max(1, (mp_height - box.y0 * mp_scale_y) - (mp_height - box.y1 * mp_scale_y)),
            width: Math.max(1, box.x1 * mp_scale_x - box.x0 * mp_scale_x)
        }
        mp_box_div = document.createElement('div');
        var styles = [
            ['border', 'none'],
            ['background-color', 'red'],
            ['position', 'relative'],
            ['top', mp_box.top + 'px'],
            ['left', mp_box.left + ['px']],
            ['height', mp_box.height + 'px'],
            ['width', mp_box.width + 'px'],
            ['min-height', mp_box.height + 'px'],
            ['min-width', mp_box.width + 'px'],
        ];
        var style_array = [];
        for (var s in styles) {
            style_array.push(styles[s].join(':') + ';');
        }
        //console.log(style_array.join(' ')); // debug
        mp_box_div.style = style_array.join(' ');
        mp_box_div.height = mp_box.height;
        mp_box_div.width = mp_box.width;
        mp_div.appendChild(mp_box_div);
        window.DEBUG_MP_BOX_DIV = mp_box_div;
        return mp_div;
    }
}

$(function() {
    var drocer = new drocerApp();
});
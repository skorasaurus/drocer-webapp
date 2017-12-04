function drocerApp() {

    // Private variables

    const ENTER_KEYCODE = 13;
    const PIXEL_SUFFIX = "px";

    const search_input_element_id = 'search-input';
    const search_results_element_id = 'search-results';
    const search_result_control_element_id = 'search-results-control';
    const page_image_container_id = 'page-image-container';
    const page_image_element_id = 'page-image';
    const page_overlay_element_id = 'page-image-overlay';
    const search_button_id = 'search-button';
    const match_previous_button_id = 'match-previous-button';
    const match_next_button_id = 'match-next-button';
    const page_previous_button_id = 'page-previous-button';
    const page_next_button_id = 'page-next-button';
    const loading_spinner_id = 'loading-spinner';
    const spinner_html = '';
    const no_results_text = 'No results.';
    const overlay_hover_text = 'Click to select text.';

    const data_box_attribute = 'data-drocer-box';
    const data_document_name_attribute = 'data-drocer-document-name';
    const data_match_number_attribute = 'data-drocer-match-number';

    const selected_result_class = 'selected-result';
    const overlay_clicked_class = 'overlay-clicked';
    const overlay_initial_class = 'overlay-initial';
    const result_title_class = 'result-title';

    const search_input = $('#' + search_input_element_id);
    const search_results_element = $('#' + search_results_element_id);
    const search_result_control_element = $('#' + search_result_control_element_id);
    const page_image_container = $('#' + page_image_container_id);
    const page_overlay_element = $('#' + page_overlay_element_id);
    const search_button = $('#' + search_button_id);
    const match_previous_button = $('#' + match_previous_button_id);
    const match_next_button = $('#' + match_next_button_id);
    const page_previous_button = $('#' + page_previous_button_id);
    const page_next_button = $('#' + page_next_button_id);
    const loading_spinner = $('#' + loading_spinner_id);

    var currently_selected_document_name = null;
    var currently_selected_match = NaN;
    var currently_selected_match_box_text = '';
    var currently_selected_page = NaN;

    // Set up button click and keyboard handlers

    search_input.keypress(on_search_input_keypress);
    search_input.focus();
    search_button.click(search);

    match_previous_button.click(match_previous);
    match_next_button.click(match_next);

    page_previous_button.click(page_previous);
    page_next_button.click(page_next);

    // Functions

    function on_search_input_keypress(event) {
        if (event.which === ENTER_KEYCODE) {
            event.preventDefault();
            search();
        }
    }

    function search() {

        loading_spinner.show();

        // Reset state for new search
        search_results_element.html('');
        page_image_container.html('');
        currently_selected_match = NaN;
        currently_selected_page = NaN;

        $.post(
            './search', { q: search_input.val() }, searchCallback, 'json'
        );
    };

    function searchCallback(response) {
        window.DEBUG_SEARCH = response; //debug

        loading_spinner.hide();

        if (response.matches.length > 0) {
            render_search_results(response.matches);
            result_controls_show();
        } else {
            search_results_element.text(no_results_text);
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

        if (isNaN(currently_selected_page)) {
            return;
        }

        if (currently_selected_page == 1 && direction < 0) {
            return;
        }

        currently_selected_page += direction;
        var page_image_url = './page_images/' + currently_selected_document_name + '-' + currently_selected_page + '.png';
        var page_image = new Image();
        page_image.src = page_image_url;
        page_image.id = page_image_element_id;

        page_image_container.html(page_image);

        // hide overlay
        page_overlay_element.height(0);
        page_overlay_element.width(0);

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

        if (isNaN(currently_selected_match)) {
            return;
        }

        var newly_selected_match = currently_selected_match + direction;

        var selector = '[' + data_match_number_attribute + '=' + newly_selected_match + ']';
        if ($(selector).length) {
            // If this result exists, click it
            $(selector).click();
            // Persist this selection globally
            currently_selected_match = newly_selected_match
        }

    }

    /**
     * Click handler for the page_overlay_element
     */
    function overlay_click() {
        update_overlay_element(currently_selected_match_box_text, '', null, overlay_clicked_class, overlay_initial_class);
    }

    /**
     * Class that updates the page_overlay_element state
     * @param {string} text The text that will be added to the overlay
     * @param {string} title Hovertext of the element
     * @param {Function} clickFunction Function to bind to click events, pass null to unbind all click events
     * @param {string} addClasses Space separated classes to add
     * @param {string} removeClasses Space separated classes to remove
     */
    function update_overlay_element(text, title, clickFunction, addClasses, removeClasses) {
        page_overlay_element
            .text(text)
            .attr('title', title)
            .addClass(addClasses)
            .removeClass(removeClasses);

        if (clickFunction) {
            page_overlay_element.click(clickFunction);
        } else {
            page_overlay_element.unbind('click');
        }
    }

    function render_search_results(results) {
        var ul = document.createElement('ul');
        ul.className = 'collection';
        var matches = 1;
        for (var r in results) {

            var result = results[r];

            // create collection item
            var li = document.createElement('li');
            li.className = 'collection-item';

            // create collection item title
            var span = document.createElement('span');
            span.className = result_title_class;

            var txt = document.createTextNode(result.title);

            span.appendChild(txt);
            li.appendChild(span);

            // create collection item lines
            for (var b in result.boxes) {

                var box = result.boxes[b];

                if (!box.page_number) {
                    continue;
                }

                var current_match_number = matches;
                var p = document.createElement('p');
                var txt = document.createTextNode('Page ' + box.page_number);
                var a = document.createElement('a');

                a.href = '#';
                a.title = box.text;
                a.setAttribute(data_box_attribute, JSON.stringify(box));
                a.setAttribute(data_document_name_attribute, JSON.stringify(result.document_name));
                a.setAttribute(data_match_number_attribute, current_match_number);
                a.onclick = function() {
                    result_box_click(this);
                };

                p.appendChild(txt);

                p.appendChild(micro_page(box));

                a.appendChild(p);
                li.appendChild(a);
                matches++;

            }

            ul.appendChild(li);
        }

        search_results_element.html(ul);
    }

    /**
     * Updates application state, creates page url and binds onload functionality for page image, adds image to page_image_container
     * @param {HTMLAnchorElement} result 
     */
    function result_box_click(result) {
        var document_name_attribute = JSON.parse(result.getAttribute(data_document_name_attribute));
        var box = JSON.parse(result.getAttribute(data_box_attribute));

        // update application state
        currently_selected_document_name = document_name_attribute;
        currently_selected_page = parseInt(box.page_number);
        currently_selected_match = parseInt(result.getAttribute(data_match_number_attribute));
        currently_selected_match_box_text = box.text;

        // Turn off all other result selections
        $('[data-drocer-match-number]').removeClass(selected_result_class);
        // Select this result
        $(result).addClass(selected_result_class);

        // load page image
        var page_image_url = './page_images/' + currently_selected_document_name + '-' + currently_selected_page + '.png';
        var page_image = new Image();
        page_image.onload = function() {
            page_image_load(box);
        }
        page_image.src = page_image_url;
        page_image.id = page_image_element_id;

        page_image_container.html(page_image);

        window.DEBUG_BOX = box; //debug
    }

    /**
     * Handles updating the overlay and scrolling the window when a page is loaded
     * @param {Object} box DrocerBox with x0,y0,x1,y1 in points (lower-left origin).
     */
    function page_image_load(box) {
        update_overlay_element('', overlay_hover_text, overlay_click, overlay_initial_class, overlay_clicked_class);

        page_box = box_to_page(box);

        page_overlay_element.height(page_box.height);
        page_overlay_element.width(page_box.width);
        page_overlay_element.css('top', page_box.top + PIXEL_SUFFIX);
        page_overlay_element.css('left', page_box.left + PIXEL_SUFFIX);

        window.DEBUG_PAGE_BOX = page_box; //debug
        var scroll_x = page_box.left - 325; // aesthetic offset(25) + menu width offset(300)
        var scroll_y = page_box.top - 175; // aesthetic offset(25) + control height offset (175)
        //console.log('scrolling: window.scrollTo('+scroll_x+','+scroll_y+')');//debug

        scroll_to(scroll_x, scroll_y);
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
        search_result_control_element.show();
    }

    function result_controls_hide() {
        search_result_control_element.hide();
    }

    /**
     * Create a tiny div showing the location of a box in a page.
     * @param {Object} box DrocerBox with x0,y0,x1,y1 in points (lower-left origin).
     * @returns {HTMLDivElement} Tiny div showing the location of a box in a page.
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
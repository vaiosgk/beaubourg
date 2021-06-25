(function($) {

	console.log("Load UP / Unu Parallax");

	var objets_concernes = [];
	objets_concernes.push({container:'div.home_parallax div.node-parallax-item.node-full', target:'div.field-name-field-rebond-image div.img_image_item'});
	objets_concernes.push({container:'div.home_parallax div.node-parallax-item.node-full', target:'div.field-name-field-rebond-image-mobile div.img_image_item'});

	UnuParallax = function() {}

	//UnuParallax.ratio = 1.6;


	/*
	** Init function
	** Prepare items on the page to be parallaxed. Uses objets_concernes array to locate elements
	*/
	UnuParallax.prepareItems = function(perimeter) {
		items = [];

		$.each(objets_concernes, function(index, group) {

			$(perimeter).find(group.container).each(function() {

				container = $(this);
				target = container.find(group.target);

				if(container.length && target.length) {
					items.push({
						container: container,
						target: target,
						st_start: 0,
						st_end: 0,
					});
				}
			})
		});

		return items;
	}


	/*
	** AF call. 
	** Calls updating function
	*/
	UnuParallax.parallax_af = function(vh, vw, sc_val, st, sc_incr) {
		UnuParallax.update_targets_positions(vh, sc_val);
	}


	/*
	** Resize call. 
	** Calls updating functions
	*/
	UnuParallax.parallax_af_resize = function(vh, vw, sc_val, st, sc_incr) {

		UnuParallax.update_items_positions();
		UnuParallax.update_targets_positions(vh, sc_val);
	}


	/*
	** AF function. 
	** Sets the position of the parallaxed div in its parent
	*/
	UnuParallax.update_targets_positions = function(vh, sc_val) {
		$.each(UnuParallax.items, function(index, item) {

			if(sc_val > item.st_start && sc_val < item.st_end) {

				var ratio = -(sc_val - item.st_start) / (item.st_start - item.st_end);
				item.target[0].style.top = -item.parallax_height*ratio+'px';
			}
		});
	}


	/*
	** Update items call. 
	** Update every parallaxed item's position in their parents and updates their st_start and st_end values
	*/
	UnuParallax.update_items_positions = function() {
		$.each(UnuParallax.items, function(index, item) {
			UnuParallax.update_item_position(item);
		});
	}


	/*
	** Update single item call. 
	** Update a single parallaxed item position in its parent and updates its st_start and st_end
	*/
	UnuParallax.update_item_position = function(item) {

		var st_start = item.container.offset().top - $(window).innerHeight();
		var st_end = st_start + $(window).innerHeight() + item.container.innerHeight();

		var parallax_height =item.target.innerHeight() -  item.container.innerHeight();

		item.parallax_height = parallax_height;
		item.st_start = st_start;
		item.st_end = st_end;
	}


	/*
	** General call
	** Prepare items, update their position and register AF
	*/
	$('html').once('unu_parralax', function () {

		$(window).on("mqsync.ev_unuparralax_global", function(event, mqs_data) {

			if (mqs_data.base_event == 'ready'
			 || mqs_data.base_event == 'ajax_links_api_ready')
			{

    		UnuScroll.unregisterAF('unuparallax_global');
				UnuParallax.items = UnuParallax.prepareItems('body');

				if(UnuParallax.items.length > 0) {

					UnuParallax.update_items_positions();
					UnuScroll.registerAF('unuparallax_global', UnuParallax.parallax_af, UnuParallax.parallax_af_resize);
				}
			}
		});
	})
})(jQuery);
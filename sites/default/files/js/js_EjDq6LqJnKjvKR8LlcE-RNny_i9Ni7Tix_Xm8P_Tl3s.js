/*
* js page rebond
*/

(function ($) {

	Drupal.behaviors.node_page_rebond = {
		detach: function (context) {

			if(context == Drupal.settings.ajax_links_api.selector) {
				$("body").off('.ev_node_page_rebond');
				$("body *").off('.ev_node_page_rebond');
				$('html').off('.ev_node_page_rebond');
				$(window).off('.ev_node_page_rebond');

        UnuScroll.unregisterAF('page_rebond');

				delete Drupal.behaviors.node_page_rebond;
			}
		},

		attach: function(context) {

		  $('div.node-page-rebond').once('node_page_rebond', function () {

				var $rebond_mask = $('div.node-page-rebond .opacity_mask');
				var $rebond_image = $('div.node-page-rebond .img_image_item');
				var content_height = $('div.scroll_scroller div.scroll_content').innerHeight();

				function update_rebond_state(vh, sc_val) {

					if(content_height-sc_val < vh) {
						var ratio = (content_height-sc_val) / vh;

						$rebond_mask[0].style.opacity = ratio;
						$rebond_image[0].style.width = 110-10*(1-ratio)+'%';
						$rebond_image[0].style.height = 110-10*(1-ratio)+'%';
					}
				}

				function page_rebond_af(vh, vw, sc_val, st, sc_incr) {
				  update_rebond_state(vh, sc_val);
				}

				function page_rebond_af_resize(vh, vw, sc_val, st, sc_incr) {
					content_height = $('div.scroll_scroller div.scroll_content').innerHeight();
				  update_rebond_state();
				}

				//*************
				// Ready
				$(window).on( "mqsync.ev_node_page_rebond", function( event, mqs_data ) {

					if(mqs_data.base_event == 'ready' || mqs_data.base_event == 'ajax_links_api_ready') {

						update_rebond_state();
						UnuScroll.registerAF('page_rebond', page_rebond_af, page_rebond_af_resize);

					}
				})
		  })
		}
	}
})(jQuery);
;
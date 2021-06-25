/*
* Unu Hover
* 2017 02 - GLG
* 2017 08 - review & ajout event content_update
*
* What we do
* credits : http://www.macfreek.nl/memory/Touch_and_mouse_with_hover_effects_in_a_web_browser
* gestion en js des hover au lieu du css :hover pour bon fonctionnement différencié sur devices tactiles et autres
*
* Note 201708 : la partie unu_touch n'est pas vraiment utilisable en tant que telle mais utile quand même en info d'état dans les events
*/

(function ($) {

  console.log('Load UH / Unu Hover');

  // objets
  var objets_concernes = [];
      objets_concernes.push({selector:'div.bbrgmenu_menu_right>div', parentSelector:'div.bbrgmenu_menu_right'});
      objets_concernes.push({selector:'div.bbrgmenu_menu_right>bbrg-menu-item', parentSelector:''});
      objets_concernes.push({selector:'.gen_hover_arrow', parentSelector:''});
      objets_concernes.push({selector:'.gen_hover_underline', parentSelector:''});
      objets_concernes.push({selector:'div.lang_switcher li a', parentSelector:''});
      objets_concernes.push({selector:'div.field-name-field-teaser-image-desk', parentSelector:''});

      objets_concernes.push({selector:'div.node-project.node-teaser', parentSelector:'div.field-items'});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});
      //objets_concernes.push({selector:'', parentSelector:''});


  /*
  * Base
  */
  UnuHover = function() {}

  /*
  * Activation sur les elements
  */
  UnuHover.prepareItems = function(perimeter) {
    $.each(objets_concernes, function(idx,group) {
      $(perimeter).find(group.selector).not('.unuhover-item-activated').each(function() {
        var item = $(this).addClass('unuhover-item-activated');
        var parent = item.closest(group.parentSelector).addClass('unuhover-parent-activated');

        $(this).on('touchstart', function(e) {
          item.addClass('unuhover_touch');
          parent.addClass('unuhover_touch_parent');
          //console.log('UH touchstart');
        })
        .on('touchmove', function(e) {
          item.removeClass('unuhover_touch');
          parent.removeClass('unuhover_touch_parent');
          //console.log('UH touchmove');
        })
        .on('mouseenter', function(e) {
          item.not('.unuhover_touch').addClass('unuhover_mouse').trigger('unuhover_mouse_on');
          parent.not('.unuhover_touch_parent').addClass('unuhover_mouse_parent');
          //console.log('UH mouseenter');
        })
        .on('mouseleave', function(e) {
          item.removeClass('unuhover_mouse').trigger('unuhover_mouse_off');
          parent.removeClass('unuhover_mouse_parent');
          //console.log('UH mouseleave');
        })
        //.on('click', function(e) {
          // item.removeClass('unuhover_touch');
          // item.removeClass('unuhover_mouse'); // if we want to remove on clic (not for all projects)
          // parent.removeClass('unuhover_mouse_parent')
          // parent.removeClass('unuhover_touch_parent'); // if we want to remove on clic (not for all projects)
          //console.log('UH click');
        //});
      });
    });
  }

  /*
  * Activation sur tous les elements concernes
  */
  UnuHover.prepareAll = function() {
    UnuHover.prepareItems('body');
  }

  /*
  * Set Image ratio on img load events load
  * Also adds a loaded class : for lazy loaded anim (hey not a real lazy load!)
  */
  $(window).on( "mqsync.ev_unuhover_global", function( event, mqs_data ) {
    if (mqs_data.base_event == 'load'
     || mqs_data.base_event == 'ajax_links_api_load'
     || mqs_data.base_event == 'ajaxcomplete')
    {
      // delai à cause des contenus générés (type custom select) TODO better
      setTimeout(function() {
            UnuHover.prepareAll();
      },300);
    }
    else if (mqs_data.base_event == 'content_update')
    {
      // delai à cause des contenus générés (type custom select) TODO better
      setTimeout(function() {
        UnuHover.prepareItems(mqs_data.base_event_data.target);
      },300);
    }
  });

})(jQuery);
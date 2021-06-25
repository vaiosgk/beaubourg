/*
* js spécifique module bbrgmenu
* 201801 - GLG
*/

/*
* string shuffle function
*/
String.prototype.shuffle = function() {
  var a = this.split(""),
      n = a.length;

  for(var i = n - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
  }
  return a.join("");
};


/*
* Behaviors
*/
(function ($) {

  Drupal.behaviors.bbrgmenu = {

    detach: function (context, settings, trigger) {
      // NTD
    },

    attach: function (context, settings) {
      $('html').once('bbrgmenu_init', function() {

        console.log('BBRGM Attach Once / Init bbrgmenu');

        // global cached vars
        var $win = $(window);
        var $body = $('body');

        // menu cached objs
        var $bbrgmenupanes = $('div.bbrg-menu-panes');
        var $bbrgmenu = $('div.bbrg-menu-wrapper');

        // desk menu roll
        var desk_roll_active = false;
        var timer_desk_roll = 0;
        var $bbrg_menu_right_items = $bbrgmenu.find(" div.bbrgmenu_menu_right div.bbrg-menu-item:not(.name-burger)");
        var desk_roll_count = 0;
        var desk_roll_steps = 20;
        var desk_roll_base_interval = 30;
        var desk_roll_interval = 0;

        // state vars
        var st_mob_menu_opened = false;
        var st_pane_opened = false;
        var st_canhide = false;
        //var st_transparent_top_zone = false;
        var st_filled = false;

        // state vars
        //var st_mob_menu_opened = false;
        var st_pane_opened = false;
        //var st_canhide = false;

        // parse panes objects
        var panes = [];
        function parse_panes() {
          $bbrgmenupanes.find('div.bbrg-menu-pane').each(function() {
            if (typeof $(this).attr('data-pane-id') != 'undefined') {
              var pane_id = $(this).attr('data-pane-id');
              var pane = {
                obj:$(this),
                pane_id:pane_id,
              }
              panes[pane_id] = pane;
            }
          });
          //console.log(panes);
        }

        // Panes show/hide
        function panes_all_close() {
          $bbrgmenupanes.find('div.pane_opened').removeClass('pane_opened');
          $bbrgmenupanes.removeClass('pane_opened');
          UnuUtils.enableBodyScroll(0);
          console.log('BBRGM close all panes');
          // nettoyage après un délai du menu pane works
          setTimeout(function() {
            $bbrgmenupanes.find('div.project_clicked').removeClass('project_clicked');
            $workspane_part1_nodes.removeClass('active')
          },600);
        }
        // function panes_close(pane_id) {
        //   $bbrgmenupanes.find('div.pane_opened').removeClass('pane_opened');
        //   $bbrgmenupanes.removeClass('pane_opened');
        //   UnuUtils.enableBodyScroll(0);
        //   console.log('BBRGM close '+pane_id);
        // }
        function pane_show(pane_id) {
          $bbrgmenupanes.addClass('pane_opened');
          $bbrgmenupanes.find('div.pane_opened').removeClass('pane_opened');
          panes[pane_id].obj.addClass('pane_opened');
          UnuUtils.disableBodyScroll(300);
          console.log('BBRGM opened '+pane_id);
        }

        // WORKS Pane
        var $workspane = $('div.bbrg-menu-pane.name-worksmenu');
        var $workspane_part1_nodes = $('#fixed_stuff div.bbrg-menu-pane.name-worksmenu div.node-project.node-teaser_works_roll');

        //mobile menu utils
        function mobile_menu_open() {
          $bbrgmenu.addClass('mob_menu_opened');
          st_mob_menu_opened = true;
          UnuUtils.disableBodyScroll(500);
        }
        function mobile_menu_close() {
          $bbrgmenu.removeClass('mob_menu_opened');
          st_mob_menu_opened = false;
          UnuUtils.enableBodyScroll(0);
        }

        // Visibilité du header
        var last_scroll = 0; // last scroll position
        var last_scroll_shh = 0; // last scroll position where we toggle menu visibility

        // function to be called on scroll (and resize ?)
        function update_content_header_visiblity(sc_val) {

          // Autohide Header Bar
          if (sc_val>300 && sc_val>last_scroll && sc_val > (last_scroll_shh+50)
              && !st_mob_menu_opened && !st_pane_opened)
          {
            if (!st_canhide) {
              $bbrgmenu.addClass('canhide');
              st_canhide = true;
              mobile_menu_close();
              panes_all_close();
            }
            last_scroll_shh = last_scroll;
          }
          else if (sc_val < (last_scroll_shh-100) )
          {
            if (st_canhide) {
              $bbrgmenu.removeClass('canhide');
              st_canhide = false;
            }
            last_scroll_shh = last_scroll;
          }

          // seuil de transparence
          if(sc_val > 300 && !st_canhide) {
            if (!st_filled) {
              $bbrgmenu.addClass('filled');
              st_filled = true;
              console.log('BBRGM set filled');
            }
          }
          else if (st_filled) {
            $bbrgmenu.removeClass('filled');
            st_filled = false;
            console.log('BBRGM unset filled');
          }

          // keep track of scroll pos
          last_scroll = sc_val;
        }

        // mise à jour de l'item de menu actif
        function set_active_menu_item() {
          if (typeof Drupal.settings.bbrgmenu.active_menu_item != 'undefined') {
            $bbrgmenu.find('div.current_active_item').removeClass('current_active_item');
            $bbrgmenu.find('div.name-'+Drupal.settings.bbrgmenu.active_menu_item).addClass('current_active_item');
            console.log('BBRGM current active is '+ Drupal.settings.bbrgmenu.active_menu_item);
          }
        }

        // Handle color classes
        function update_menu_color() {
          if (typeof Drupal.settings.bbrgmenu.menu_color != 'undefined') {
            $bbrgmenu.removeClass('menu_black').removeClass('menu_white');
            $bbrgmenu.addClass(Drupal.settings.bbrgmenu.menu_color);
            console.log('BBRGM has menu class '+ Drupal.settings.bbrgmenu.menu_color);
          }
        }

        // AF functions handled by UnuScroll
        function bbrgmenu_af_resize(vh, vw, sc_val, st, sc_incr) {
          // NTD
        }
        function bbrgmenu_af(vh, vw, sc_val, st, sc_incr) {
          update_content_header_visiblity(sc_val);
        }

        /*
        *  mqsync events
        */
        $(window).on( "mqsync.ev_bbrgmenu", function( event, mqs_data ) {

          //*************
          // Ready
          if ( mqs_data.base_event == 'ready') {

            // Prepare panes
            parse_panes();

            // register AF functions
            UnuScroll.registerAF('bbrgmenu', bbrgmenu_af, bbrgmenu_af_resize);

            // Set current active menu item
            set_active_menu_item();
            update_menu_color();

            // Pane open events
            $body.on('click.ev_bbrgmenu','div.bbrg-menu-item-opener',function() {
              if (typeof $(this).attr('data-pane-target') != 'undefined') {
                pane_show($(this).attr('data-pane-target'));
              }
            });

            // Panes close events
            $body.on('mouseleave.ev_bbrgmenu',function() {
              //panes_all_close();
            });
            $bbrgmenupanes.on('click.ev_bbrgmenu','div.bbrg-menu-overlay',function() {
              panes_all_close();
            });
          }

          //*************
          // ALA ready
          else if ( mqs_data.base_event == 'ajax_links_api_ready') {

            panes_all_close();

            set_active_menu_item();
            update_menu_color();
          }

          //*************
          // Init ou passage au Desktop
          else if ( (mqs_data.group_range == 'desktop' || mqs_data.group_range == 'tablet')
          && ( mqs_data.base_event == 'direct_page_content_load'
            || mqs_data.group_type == 'newrange' && mqs_data.group_range_previous == 'mobile' ) )
          {

            // Nettoyage
            if ( mqs_data.group_range_previous == 'mobile')
            {
              // unbind mobile events
              $( "body" ).off('.ev_bbrgmenu_mobile');
              $( "body *" ).off('.ev_bbrgmenu_mobile');
              $( window ).off('.ev_bbrgmenu_mobile');

              panes_all_close();
            }

            // Works Pane

            // Implement part1 works_roll display on works_teaser hover
            $workspane.on('mouseenter.ev_bbrgmenu_desktop', 'div.node-project.node-teaser_works_item.active_project', function(event) {

              if(!$workspane.hasClass('project_clicked')) {
                //console.log('mouseleave enters works');
                $workspane_part1_nodes.removeClass('active');
                var nodeId = $(event.target).parents('.node-project')[0].id;
                $('.bbrg-menu-pane .part1 #'+nodeId).addClass('active');
              }
            });

            // Remove part1 works_roll display on works_teaser mouseleave
            $workspane.on('mouseleave.ev_bbrgmenu_desktop', 'div.node-project.node-teaser_works_item.active_project', function() {

              if(!$workspane.hasClass('project_clicked')) {
                //console.log('mouseleave works');
                $workspane_part1_nodes.removeClass('active');
              }
            });

            $workspane.on('mouseleave.ev_bbrgmenu_desktop', 'div.part2', function() {
              if(!$workspane.hasClass('project_clicked')) {
                //console.log('mouseleave works');
                //panes_all_close();
              }
            });

            $workspane.on('click.ev_bbrgmenu_desktop', 'div.node-project.node-teaser_works_item.active_project', function() {
              $workspane.addClass('project_clicked');
            });


            // Roll Desk Menu right

            function menu_desk_roll() {
              desk_roll_count++;
              desk_roll_interval+=8;
              if (desk_roll_count < desk_roll_steps) {
                // shuffle title
                $bbrg_menu_right_items.each(function() {
                  if (!$(this).hasClass("unuhover_mouse")) {
                    var txt = $(this).attr('data-original-title');
                    var nb_fx = Math.floor(txt.length * desk_roll_count / desk_roll_steps);
                    var $title = $(this).find('div.title');
                    var txt_fx = $title.html().replace("&nbsp;"," ").substring(0,nb_fx);
                    var txt_sh = $title.html().replace("&nbsp;"," ").substring(nb_fx,txt.length);
                    $title.html(txt_fx + txt_sh.shuffle().replace(" ","&nbsp;"));
                  }
                });
                if (desk_roll_active)
                  timer_desk_roll = setTimeout(menu_desk_roll, desk_roll_interval);
                else
                  menu_desk_roll_reset();
              }
            }

            function menu_desk_roll_reset() {
              // restore title and free size
              $bbrg_menu_right_items.each(function() {
                $(this).find('div.title')
                  .html($(this).attr('data-original-title'))
                  .css('width','')
                  .css('white-space','');
              });
            }

            $bbrgmenu.on('unuhover_mouse_on.ev_bbrgmenu_desktop', function() {
              desk_roll_active = true;
              clearTimeout(timer_desk_roll);
              // backup title if necessary
              // and set fixed size
              $bbrg_menu_right_items.each(function() {
                var $title = $(this).find('div.title');
                if (typeof $(this).attr('data-original-title') == 'undefined') {
                  $(this).attr('data-original-title',$title.html());
                }
                $title.css('width',$title.width()+'px').css('white-space','nowrap');
              });
              // shuffle !
              desk_roll_count = 0;
              desk_roll_interval = desk_roll_base_interval;
              timer_desk_roll = setTimeout(menu_desk_roll, desk_roll_interval);
            });

            $bbrgmenu.on('unuhover_mouse_off.ev_bbrgmenu_desktop', function() {
              desk_roll_active = false;
              clearTimeout(timer_desk_roll);
              menu_desk_roll_reset();
            });

          }

          // Init ou passage au Mobile / Tablet
          else if ( (mqs_data.group_range == 'mobile')
          && ( mqs_data.base_event == 'direct_page_content_load'
            || mqs_data.group_type == 'newrange' && (mqs_data.group_range_previous == 'desktop' || mqs_data.group_range_previous == 'tablet') ) )
          {

            // Nettoyage
            if ( mqs_data.group_range_previous == 'desktop' || mqs_data.group_range_previous == 'tablet')
            {
              // unbind desktop events
              $( "body" ).off('.ev_bbrgmenu_desktop');
              $( "body *" ).off('.ev_bbrgmenu_desktop');
              $( window ).off('.ev_bbrgmenu_desktop');

              panes_all_close();
            }

            //
            //$workspane.on('click.ev_bbrgmenu_mobile', 'div.node-project.node-teaser_works_item', function() {
              //panes_all_close();
            //});
            $body.on('click.ev_bbrgmenu_mobile','div.bbrg-menu-item-normal',function() {
              panes_all_close();
            });
            $body.on('click.ev_bbrgmenu_mobile', 'div.bbrg-menu-closer', function() {
              panes_all_close();
            })

            $workspane.on('click.ev_bbrgmenu_mobile', 'div.node-project.node-teaser_works_item.active_project', function() {
              panes_all_close();
            });            

          }

        }); // End Mqsync

      });
    }

  }
})(jQuery);
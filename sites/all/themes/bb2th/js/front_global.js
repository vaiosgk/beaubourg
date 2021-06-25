/*
* js global
* GLG - 2017 12
*/

(function ($) {
  console.log('Load/Init front_global');

  /*
  * Base.
  */

  // unloading class pour anim de disparition dans les cas où on ne gère pas de transitions (forms etc.)
  $(window).on('beforeunload',function(ev) {
    console.log('Unloading...');
    // we do unload transition but not on mailto as we would be stuck on white page...
    if (typeof ev.originalEvent.srcElement.activeElement.href == 'undefined' || ev.originalEvent.srcElement.activeElement.href.substr(0,7)!='mailto:' ) {
      $('body').addClass('unloading');
    }
  });

  /*
  *  Mqsync events
  */

  $(window).on( "mqsync.ev_front_global", function( event, mqs_data ) {

    //*********************************
    // Global ready
    if (mqs_data.base_event == 'ready') {

      // Loader init
      // if ( typeof UnuLoader !== 'undefined' ) {
      //   UnuLoader.init('loader2',{assets:0});
      // }

      // Click links to anchors
      $('body').on('click.ev_front_global', 'a', function(ev) {
        if (UnuScroll.scrollToId($(this).attr('href'), -100, 0)) {
          // Si le scroll a réussi
          ev.preventDefault();
        }
      });
    }

    //*********************************
    // Range change cleaning
    if (mqs_data.group_type == 'newrange') {
      var previous_range_events_class = '';
      if ( mqs_data.group_range_previous == 'mobile' )
      {
        previous_range_events_class = '.ev_front_global_mobile';
      }
      else if ( mqs_data.group_range_previous == 'tablet' )
      {
        previous_range_events_class = '.ev_front_global_tablet';
      }
      else if ( mqs_data.group_range_previous == 'desktop' )
      {
        previous_range_events_class = '.ev_front_global_desktop';
      }
      // unbind events
      if (previous_range_events_class != '') {
        $( "body" ).off(previous_range_events_class);
        $( "body *" ).off(previous_range_events_class);
        $( window ).off(previous_range_events_class);
      }
    }

    //*********************************
    // Init ou passage au Desktop
    if ( mqs_data.group_range == 'desktop' && mqs_data.base_event == 'ready'
      || mqs_data.group_range == 'desktop' && mqs_data.group_type == 'newrange'
      || mqs_data.group_range == 'desktop' && mqs_data.base_event == 'ajax_links_api_ready' )
    {
      UnuScroll.setRangeParams(7);

      // CheckLoad
      if (mqs_data.base_event == 'ready') {
        UnuCheckload.check('body','direct_page_content_load',[],999,999);
      } else if (mqs_data.base_event == 'ajax_links_api_ready') {
        UnuCheckload.check('body','ajax_links_api_load',[],999,999);
      }
    }
    //*********************************
    // Init ou passage au Tablet
    else if ( mqs_data.group_range == 'tablet' && mqs_data.base_event == 'ready'
           || mqs_data.group_range == 'tablet' && mqs_data.group_type == 'newrange'
           || mqs_data.group_range == 'tablet' && mqs_data.base_event == 'ajax_links_api_ready' )
    {
      UnuScroll.setRangeParams(5);

      // CheckLoad
      if (mqs_data.base_event == 'ready') {
        UnuCheckload.check('body','direct_page_content_load',[],999,999);
      } else if (mqs_data.base_event == 'ajax_links_api_ready') {
        UnuCheckload.check('body','ajax_links_api_load',[],999,999);
      }
    }
    //*********************************
    // Init ou passage au Mobile
    else if ( mqs_data.group_range == 'mobile' && mqs_data.base_event == 'ready'
           || mqs_data.group_range == 'mobile' && mqs_data.group_type == 'newrange'
           || mqs_data.group_range == 'mobile' && mqs_data.base_event == 'ajax_links_api_ready' )
    {
      UnuScroll.setRangeParams(3);

      // CheckLoad
      if (mqs_data.base_event == 'ready') {
        UnuCheckload.check('body','direct_page_content_load',[],999,999);
      } else if (mqs_data.base_event == 'ajax_links_api_ready') {
        UnuCheckload.check('body','ajax_links_api_load',[],999,999);
      }
    }

    //*********************************
    // Page Load (via checkload)
    else if (mqs_data.base_event == 'direct_page_content_load'
          || mqs_data.base_event == 'ajax_links_api_load')
    {
      UnuScroll.start();

      // Preparation anim apparition éléments
      //UnuAppa.prepareAll('#page_content', $(window).scrollTop()); // $(window).height() +

      // Check if anchor is requested and scroll to it
      // if (typeof window.location.hash != undefined && window.location.hash != "") {
      //   targetBloc = $(window.location.hash);
      //   if (targetBloc.length>0) {
      //     targetBlocOffset = targetBloc.offset().top - 50;
      //     if (targetBlocOffset > 0) {
      //       console.log('Scroll to anchor '+window.location.hash+' at '+targetBlocOffset);
      //       document.documentElement.scrollTop = document.body.scrollTop = targetBlocOffset;
      //     }
      //   }
      // }



      // ingoing transitions
      // attente avant show_content (la durée sur laquelle on reste sur la transition si quelque chose à y voir)
      var transDelay = 300;
      switch(AjaxLinksApi.transition) {
        case 'projects_works':
          transDelay = 0;
          break;
        case 'video':
          transDelay = 1500;
          break;
      }
      // attente avant show_content_done (la durée de la transition d'ouverture)
      var afterTransDelay = 300;
      switch(AjaxLinksApi.transition) {
        case 'intro' :
          afterTransDelay = 1700;
          break;

        case 'projects_works':
          afterTransDelay = 500;
          break;
      }

      setTimeout(function() {
        // first init de la page normale
        // ou demande de page normale
        
        switch(AjaxLinksApi.transition) {
          case 'intro' :
            if(mqs_data.group_range == 'mobile') {
              $('#page_transition video.mobile_video')[0].currentTime = 0;
              $('#page_transition #normal_overlay video.mobile_video')[0].play();
            }
            else {
              $('#page_transition video.desktop_video')[0].currentTime = 0;
              $('#page_transition #normal_overlay video.desktop_video')[0].play();
            }
            break;

          case 'video':
            $('#page_transition video')[0].pause();
            $('#page_transition video')[0].currentTime = 0;
            break;
        }

        $('#page').addClass('show_content');
        setTimeout(function() {
          if (mqs_data.base_event == 'direct_page_content_load') {
            // first direct page show
            $('#page').addClass('first_show_content_done');
          }

          $('#page').addClass('show_content_done'); // UnuAppa wait the class to unhide elements
        },afterTransDelay);
      },transDelay);
    }

  }); // end mqsync event

})(jQuery);
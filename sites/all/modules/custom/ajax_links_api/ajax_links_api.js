/**
 * @file
 * Handles ajax functionalities for Ajax Links API module.
 *
 * GLG 2016 02 : Modifications massives + spécial LG
 * GLG 2016 07 : version quad, gestion du scroll pos + transition 3 états + cleaning
 * GLG 2016 08 : reformatage pour objet statique et exposition fonction AjaxLinksApi.goURL(url)
 * GLG 2017 09 : version LGv2
 * GLG 2017 12 : version bbrg bb2
 * GLG 2018 01 : sur Vm1 : simplification, suppression update menu (on n'utilise plus les menus drupal), suppression des reliquats de la version equancy multipanes
 * GLG 2018 01 : Prise en charge UnuScroll sur la position du scroll au changement de page
 * GLG 2018 02 : reinteg evol sur lgv2 function pushne
 */
(function ($) {

  console.log('Load ALA / Ajax Links Api');

  /*
  * Base & attributes
  */
  AjaxLinksApi = {};

  AjaxLinksApi.debug = function(obj) {
    console.log(obj);
  }

  // flag to prevent multiple ajax loads at the same time
  AjaxLinksApi.loading = false;

  // Sequence pour détection ordre des pages
  AjaxLinksApi.ajaxSeq = 1;

  // types de transition
  AjaxLinksApi.transition = 'intro'; // la première transition, qui doit être en accord avec les classes dans page.tpl.php
  AjaxLinksApi.transition_next = 'normal';

  // videoIds for transitions
  prevId = 0;

  /******************************
  * Preparation des liens
  */
  AjaxLinksApi.prepare_links = function(trigger, negativeTrigger, selector) {
    var $elements = $(trigger);
    if (negativeTrigger) {
      $elements = $elements.not(negativeTrigger);
    }
    $elements = $elements.not('.ajaxLinksApi');
    $elements.addClass('ajaxLinksApi');
    $elements.attr('data-alaselector',selector);
    AjaxLinksApi.debug('ALA has prepared links to '+selector+' ('+$elements.length+' new links)');

    // Remove ?ajax_apilink=1 on form actions
    // Moved here from initially in ajaxAfter() function
    // needed even on normal page load (form will get ?ajax_apilink=1 on action after first submit if they where initially loaded with this module)
    // GLG : process form one by on (la version intiale mélangeait les actions si plusieurs form)
    // removed context : pour que ça fonctionne sur les fragments qui ne sont pas dans le selector
    $("form").each(function() {
      var formAction = $(this).attr('action');
      if (formAction.indexOf('?ajax_apilink=1')>-1) {
        if (formAction.substr(formAction.length-15,15)=='?ajax_apilink=1')
          formAction = formAction.replace('?ajax_apilink=1', '');
        else
          formAction = formAction.replace('ajax_apilink=1', '');
      }
      else if (formAction.indexOf('&ajax_apilink=1')>-1) {
        formAction = formAction.replace('&ajax_apilink=1', '');
      }
      $(this).attr('action', formAction);
      AjaxLinksApi.debug('ALA Removed ajax_apilink=1 from form action : '+formAction);
    });

    // Views Pager.
    $(".view .pager a").each(function(){
      var href = $(this).attr('href');
      if (href.indexOf('?ajax_apilink=1')>-1) {
        if (href.substr(href.length-15,15)=='?ajax_apilink=1')
          href = href.replace('?ajax_apilink=1', '');
        else
          href = href.replace('ajax_apilink=1', '');
      }
      else if (href.indexOf('&ajax_apilink=1')>-1) {
        href = href.replace('&ajax_apilink=1', '');
      }
      $(this).attr('href', href);
      AjaxLinksApi.debug('ALA Removed ajax_apilink=1 from view pager : '+href);
    });
  }

  /******************************
  * Go URL
  */
  AjaxLinksApi.goURL = function(url, selector) {
    if(!AjaxLinksApi.loading) {
      AjaxLinksApi.debug('ALA Going to '+url)
      AjaxLinksApi.ajaxBefore(url, selector, true, false, 0);
    } else {
      AjaxLinksApi.debug('ALA Cannot Go : Another page is loading.')
    }
  }

  /******************************
  * Before AJAX
  */
  AjaxLinksApi.ajaxBefore = function(url, selector, needPushHistory, isBackDirection, scrollTop) {

    AjaxLinksApi.loading = true;

    if ( typeof UnuLoader !== 'undefined' ) {
      UnuLoader.init('loader2', {prepare:0, page:0, assets:0});
    }

    // reset previous transition classes
    // hide_content n'est jamais retiré et se retrouve donc actif à ce stade
    $('#page')
      .removeClass('show_content')
      .removeClass('show_content_done')
      .removeClass('hide_content_done')
      .removeClass('isBackDirection')

    if (isBackDirection)
      $('#page').addClass('isBackDirection');

    // Arbitrage Transitions
    AjaxLinksApi.transition = AjaxLinksApi.transition_next; // next transition par defaut ou eventuellement positionnée par un autre script ou par ALA via le lien

    // Randomize transition video vs normal
    random = Math.floor(Math.random() * 3) + 1;

    if(random == 1) {
      AjaxLinksApi.transition_next = 'video'; // 1 in 3 that next transition is video
    }
    else {
      AjaxLinksApi.transition_next = 'normal'; // reset next defaut trans
    }

    //Switch video URL to random video
    if(AjaxLinksApi.transition == 'video') {

      var current_range = $('body').attr('data-mqsync-group-range');

      max = 3;
      do {
        videoId = Math.floor(Math.random() * (max)) + 1;
      } while(videoId == prevId)

      prevId = videoId;

      if(current_range == 'mobile') {
        src = $('#page_transition #normal_overlay video.mobile_video')[0].src;
        src_updated = src.replace(/(\b(transition)+_+[0-9]{2})/, 'transition_0'+videoId);

        $('#page_transition #normal_overlay video.mobile_video')[0].src = src_updated;
        $('#page_transition #normal_overlay video.mobile_video')[0].play();
      }
      else {
        //TODO detect mobile / desktop to switch video_src
        src = $('#page_transition #normal_overlay video.desktop_video')[0].src;

        src_updated = src.replace(/(\b(transition)+_+[0-9]{2})/, 'transition_0'+videoId);
        $('#page_transition #normal_overlay video.desktop_video')[0].src = src_updated;

        $('#page_transition #normal_overlay video.desktop_video')[0].play();
      }
      
    }



    // Apply transition classes
    $('#page')
      .removeClass('trans_first')
      .removeClass('trans_normal')
      .removeClass('trans_intro')
      .removeClass('trans_projects_works')
      .removeClass('trans_video')
      .addClass('trans_'+AjaxLinksApi.transition);

    // Detaching behaviors
    AjaxLinksApi.debug('ALA : detach behaviors on '+selector);
    Drupal.detachBehaviors(selector);

    // GDoing a backup of the pagestate, keeping trace of js/css in the header
    // - to merge after load and avoid Drupal sending js in standard ajax calls that are already there
    // - TODO : to send it to ajaxapilink and avoid it to send it again too
    if ( !Drupal.settingsInitHead) {
      Drupal.settingsInitHead = jQuery.extend({}, Drupal.settings);
    }

    // GLG : Clearing Drupal Ajax
    // Note / Warning : Drupal a besoin d'un id unique sur les edit-submit, mais si certaines forms préexistes et ne sont pas toutes chargées à chaque fois on a des id qui se retrouvent les mêmes sur des forms différentes
    // Pour éviter ce problème, renommer le submit sur les forms : $form['submit-someuniquename'] = $form['submit'];  unset($form['submit']);
    delete Drupal.settings.ajax;
    if (Drupal.ajax) {
      $.each(Drupal.ajax, function(key, value) {
        if (key.substring(0, 5) == "edit-") {
          AjaxLinksApi.debug("ALA Removed Drupal.ajax."+key);
          delete Drupal.ajax[key];
        }
      });
    }

    if ( typeof UnuLoader !== 'undefined' ) {
      UnuLoader.update('prepare', 1);
    }

    // Proceed to ajax link load
    AjaxLinksApi.ajaxLink(url, selector, needPushHistory, scrollTop);
  }

  /******************************
  * Ajax Call
  */
  AjaxLinksApi.ajaxLink = function(url, selector, needPushHistory, scrollTop) {

    // update current history
    var lastScrollPos = document.documentElement.scrollTop || document.body.scrollTop;
    window.history.replaceState({
        'ajaxSeq':AjaxLinksApi.ajaxSeq,
        'scrollTop':lastScrollPos,
        'selector':selector,
      },
      '',
      window.location.href
    );

    // en test, force use of cache on jsloaded by jquery when inserted in dom...
    // c'est le chargement des js incorporés qui est fait en async par jquery...
    $.ajaxSetup({ cache: true }); // a valider semble erratique, les js ne sont pas toujours bien chargés ?

    // Ajax query
    // TODO : improve js scripts load... (fige les anims car fait par jquery en ajax sync (via parsing des <script>)
    $.ajax({
      xhr: function() {
        var xhr = new window.XMLHttpRequest();
        //Download progress event
        xhr.addEventListener("progress", function(evt) {
            if (evt.lengthComputable) {
              if ( typeof UnuLoader !== 'undefined' ) {
                UnuLoader.update('page',evt.loaded / evt.total);
              }
            }
        }, false);
        return xhr;
      },
      url: url,
      type: "GET",
      data: "ajax_apilink=1",
      success: function (data, textStatus, request) {
        AjaxLinksApi.debug('ALA ajax success -> '+url+' -> '+selector);
        if (needPushHistory) {
          AjaxLinksApi.ajaxSeq++;
          window.history.pushState({
              'ajaxSeq':AjaxLinksApi.ajaxSeq,
              'scrollTop':0,
              'selector':selector
            },
            '',
            url
          );
        }
        if (data == 'ajax_links_api__direct_needed') {
          // le module a reperé que la page doit être chargée entièrement
          window.location.href = url;
        }
        else {
          // traitement normal de la réponse ajax
          AjaxLinksApi.ajaxAfter(url, selector, data, scrollTop);
        }
      },
      error: function (xhr) {
        AjaxLinksApi.debug('ALA ajax error !');
        var data = '<div style="padding:150px 50px;">Sorry, something went wrong...<br />' + xhr.responseText.replace("?ajax_apilink=1", "") + '<br />Please do not move, we\'ll try to fix that...</div>';
        setTimeout(function() {
          // GO to the page the old way
          window.location = url.replace("?ajax_apilink=1", "");
        }, 2000);
        AjaxLinksApi.ajaxAfter(url, selector, data, 0);
      }
    });
  }

  /******************************
  * After Ajax Call
  */
  AjaxLinksApi.ajaxAfter = function(url, selector, data, scrollTop) {

    // Durée d'attente pour être sûr que le contenu précédent est bien masqué. (On peut le baisser en prod car on a un temps de chargement de page...)
    switch(AjaxLinksApi.transition) {
      case 'projects_works':
        outGoingTimer = 0;
        break;
      default: // normal
        outGoingTimer = 300; // trans = 400, on est avancé de 100ms
        break;
    }

    setTimeout(function() {

      // transition done class
      $('#page').addClass('hide_content_done');
      AjaxLinksApi.debug('ALA outgoing transition done');

      // Reset the height of the container.
      //$(selector).css('height', '');

      // Replace the contents of the target container with the data.
      $(selector).html(data).promise().done(function(){

        if ( typeof UnuLoader !== 'undefined' ) {
          UnuLoader.update('page',1);
        }

        var current_range = $('body').attr('data-mqsync-range');
        var current_group_range = $('body').attr('data-mqsync-range');

        // Update body classes
        $('body').removeClass();
        $(Drupal.settings.ajax_links_api_body_classes).each(function(key, value) {
          $('body').addClass( value );
        });

        // set scroll pos
        AjaxLinksApi.debug('ALA set scroll : '+scrollTop);
        if (typeof UnuScroll != "undefined") {
          // Demande a US de fixer la position sans anim
          UnuScroll.setScrollPosNoAnim(scrollTop);
        }
        else {
          // par défaut
          document.documentElement.scrollTop = document.body.scrollTop = scrollTop;
        }

        // injection des js/css déjà présents dans le head pour éviter qu'ils soient renvoyés lors des requêtes ajax
        // Merge page state js
        $.extend( Drupal.settings.ajaxPageState.js, Drupal.settingsInitHead.ajaxPageState.js );
        // Merge page state css
        $.extend( Drupal.settings.ajaxPageState.css, Drupal.settingsInitHead.ajaxPageState.css );

        // Fragments : injection et suppression
        // Lang Switch
        //$('#block-lgmenu-lgmenu-block-menu #block-locale-language').html( $('#ajax-fragments #block-locale-language').html() );
        // Zone Switch Form
        //$('#block-lgmenu-lgmenu-block-menu #block-czones-czones-switcher').html( $('#ajax-fragments #block-czones-czones-switcher').html() );
        // Delete fragments wrapper
        //$('#ajax-fragments').remove();

        // Change Url for html5 compatible browsers.
        if(window.history.replaceState) {
          // get title of loaded content.
          var matches = data.match("<title>(.*?)</title>");
          if (matches) {
            // Decode any HTML entities.
            var title = $('<div/>').html(matches[1]).text();
            // Since title is not changing with window.history.pushState(),
            // manually change title. Possible bug with browsers.
            document.title = title;
          }
        }

        // Google Analytics Trigger
        // Not needed on webistes using module gaec (ex LGV2)
  	    if (typeof ga === "function") {
  	      ga('set', { page: url, title: document.title });
  	      ga('send', 'pageview');
  	    }

        // Attach behaviors
        AjaxLinksApi.debug('ALA : attach behaviors on '+selector);
        Drupal.attachBehaviors(selector);

        // Content ready event
        $(window).trigger( "ajax_links_api_ready", [ url ] );

        // Checkload dans js front principal, will trigger ajax_links_api_load
        // TODO A améliorer : UnuCheckload contient le reset du flag AjaxLinksApi.loading...

      });

    }, outGoingTimer);
  }


  /*
  * Push new state (201802 from lgv2, non testé dans cette version de ALA..)
  * Permet de set un nouvel état hors navig ALA par exemple modification de critères de tris dans le finder
  */
  // AjaxLinksApi.pushnewstate = function(new_url) {
  //   AjaxLinksApi.debug('ALA pushing new state : '+new_url);
  //   var lastScrollPos = document.documentElement.scrollTop || document.body.scrollTop;
  //   window.history.replaceState({
  //       'ajaxSeq':AjaxLinksApi.ajaxSeq,
  //       'scrollTop':lastScrollPos,
  //       'selector':Drupal.settings.ajax_links_api.selector,
  //     },
  //     '',
  //     window.location.href
  //   );
  //   AjaxLinksApi.ajaxSeq++;
  //   window.history.pushState({
  //       'ajaxSeq':AjaxLinksApi.ajaxSeq,
  //       'scrollTop':0,
  //       'selector':Drupal.settings.ajax_links_api.selector,
  //     },
  //     '',
  //     new_url
  //   );
  // }


  /**
  * INIT STUFF
  */

  // prevent scroll to top on popstate event
  if ('scrollRestoration' in history) {
    window.history.scrollRestoration = 'manual';
  }

  // Behavior
  Drupal.behaviors.ajaxLinksApi = {
    attach: function (context, settings) {
      $('html').once('ajaxLinksApi', function() {

        /*
        * MqSync Events
        */
        $(window).on( "mqsync.ev_ajax_links_api", function( event, mqs_data ) {

          if (mqs_data.base_event == 'ready'
           || mqs_data.base_event == 'ajax_links_api_ready'
           || mqs_data.base_event == 'content_update'
           || mqs_data.base_event == 'ajaxcomplete')
          {
            // prepare links
            AjaxLinksApi.prepare_links(
              Drupal.settings.ajax_links_api.trigger,
              Drupal.settings.ajax_links_api.negative_triggers,
              Drupal.settings.ajax_links_api.selector
            );
          }

        });

        // Evenement de gestion des liens ALA
        // Event on links as a delegate (to allow new <a> to work with only the class)
        $('body').on('click','a.ajaxLinksApi',function(ev) {
          ev.preventDefault();
          // Gestion transition en fonction du lien
          if ( typeof $(this).attr('data-alatrans') !== 'undefined' ) {
            AjaxLinksApi.transition_next = $(this).attr('data-alatrans');
            // Exceptions par range
            // if ($('body').attr('data-mqsync-group-range')=='mobile') {
            // ...
            // }
            AjaxLinksApi.debug('ALA Link requested transition : '+AjaxLinksApi.transition_next);
            // Divers spécifique préparation transitions
            // switch(AjaxLinksApi.transition_next) {
            //   default:
            //     // NTDO
            //     break;
            // }
          }
          // Le selecteur cible a été stocké lors de l'init des liens
          AjaxLinksApi.goURL( $(this).attr("href"), $(this).attr('data-alaselector') );
        });

        // initial history state
        window.history.replaceState({
            'ajaxSeq':AjaxLinksApi.ajaxSeq,
            'scrollTop':0,
            'selector':Drupal.settings.ajax_links_api.selector
          },
          '',
          window.location.href
        );

      });
    }
  };

  // Gestion navigation back/forward
  $(window).on('popstate', function(e) {
    if (e.originalEvent.state != null) {
      // detection sens
      var isBackDirection = ( e.originalEvent.state.ajaxSeq < AjaxLinksApi.ajaxSeq);
      AjaxLinksApi.ajaxSeq = e.originalEvent.state.ajaxSeq;
      var scrollTop = e.originalEvent.state.scrollTop;
      var selector = e.originalEvent.state.selector;
      // proceed to page load via ajax api links
      AjaxLinksApi.ajaxBefore(location.href, selector, false, isBackDirection, scrollTop); // note : location.pathname ne comprend pas les parametres d'url
    }
  });

})(jQuery);
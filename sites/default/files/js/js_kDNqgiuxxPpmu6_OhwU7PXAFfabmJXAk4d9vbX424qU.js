/*
* Unu Utils
* Divers utilitaires statiques
* - Gestion de la désactivation du scoll du body
*
* 201803 using in fug1 + ajout timer sur enable
*/

(function ($) {

  console.log('Load UU / Unu utils');

  UnuUtils = function() {}

  // scroll disabling

  UnuUtils.disableBodyScrollTimer;

  UnuUtils.disableBodyScroll = function(delay) {
    clearTimeout(UnuUtils.disableBodyScrollTimer);
    UnuUtils.disableBodyScrollTimer = setTimeout(function() {
      $('body').css('overflow','hidden');
    },delay);
  }

  UnuUtils.enableBodyScroll = function(delay) {
    clearTimeout(UnuUtils.disableBodyScrollTimer);
    UnuUtils.disableBodyScrollTimer = setTimeout(function() {
      $('body').css('overflow','');
    },delay);
  }

})(jQuery);
;
/*
* Unu Images
* 2016 04 - GLG init tool
* 2016 08 - GLG version sur attributs distinct du checkload et ajout group-range
* 2017 02 - refonte plus efficace via tableau de data et optimisations
* 2017 03 - gestion activation retardée si présence temp image
* 2017 04 - detection images dans un fonction pour appel ulterieur (ex clones Slick)
* 2017 08 - rework for persistent images et gestion event content_update
* 2017 09 - chargement des images qui ont un pendant temporaire retardé sur la base des events, en plus d'un timer léger
* 2018 03 29 - ajout unuimage-initial-loaded (from any)
* 2018 03 29 - prise en charge activation retardée des images en UCL bypass mais pas forcément avec temp image
* 2018 04 25 - ajout de la fonction cleanElement pour prise en charge du nettoyage de classe lors de la copie d'elements dans la DOM 
*
* What we do
* Fait pour fonctionner avec le image formatter du module img_image
* en fonction des attributs
*   data-unuimages-range
*   data-unuimages-group-range
* conversion :
*   data-unuimages-style -> style
*   data-unuimages-src -> src
* Attention attribut cible écrasé
*
*/

(function ($) {

  console.log('Load UI / Unu Images');

  var canBrowserObjectFit = false;
  if ('objectFit' in document.documentElement.style)
    canBrowserObjectFit = true;

  /*
  * Base
  */
  UnuImages = function() {}

  UnuImages.objs = [];

  UnuImages.debug = function(obj) {
    console.log(obj);
  }

  /*
  * Detection des images à gérer
  */
  UnuImages.detect_images = function($perimeter) {
    // cleaning objects list : removing objects no longer in DOM (we cannot empty the list as objects can persist (ex menu, footer, etc.))
    UnuImages.objs = jQuery.grep(UnuImages.objs, function(obj,idx) {
      return (obj.obj.closest('body').length == 1); // TODO hyper couteux, essayer de trouve mieux...
    });
    // collecting images
    $perimeter.find('img.unuimage').not('.unuimage-init').each(function() {
      $(this).addClass('unuimage-init');
      var attr_src = $(this).attr('data-unuimages-src');
      var active = false;
      if (typeof attr_src == 'undefined') {
        // image à priori déjà activée (ex seo image / image mobile)
        active = true;
      }
      var obj = {
        obj:$(this),
        parentobj:$(this).parent(),
        active:active, // image avec attr src présent ou ajouté dynamiquement
        load_check:false, // check de chargement fait avec ajout de listener éventuel (ou check prévu via un timer)
        loaded:false, // Image chargée
        has_temp_image:$(this).hasClass('has_temp_image'), // l'image a un équivalent temporaire
        bypass_checkload:$(this).attr('data-checkload-bypass'), // attribut data-checkload-bypass = "bypass" si activé
        cover:$(this).hasClass('unuimage-cover'), // active le mode cover tout en gardant des <img>
        coverAllowObjectFit:$(this).hasClass('unuimage-cover-allowfit'), // autorisation d'utilisation object-fit
        coverWithObjectFit:false, // mode object-fit activé (selon browser)
        coverClass:'', // la class de cover si object-fit non utilisé
        ratioImg:$(this).attr('data-ratio'),
        attr_src:$(this).attr('data-unuimages-src'),
        load_range:$(this).attr('data-unuimages-range'),
        load_group_range:$(this).attr('data-unuimages-group-range'),
      }
      UnuImages.objs.push(obj);
    });
    UnuImages.debug('UI images handled : '+UnuImages.objs.length);
  }

  /*
  * Activation des images dans le périmètre <selector> en fonction du range ou group_range
  * param : activate_if_has_temp_image_or_ucl_bypass : determine si on active les images qui ont un pendant temporaire ou sont en ucl bypass
  */
  UnuImages.activer_images = function(activate_if_has_temp_image_or_ucl_bypass) {
    var current_range = $('body').attr('data-mqsync-range');
    var current_group_range = $('body').attr('data-mqsync-group-range');
    UnuImages.debug('UI Activating images for group_range:'+current_group_range+' or range:'+current_range+'. Activate id has temp : '+activate_if_has_temp_image_or_ucl_bypass);
    // activation attr style
    // should be useless (full img for seo, no more background images...!)
    /* $(selector).find('[data-unuimages-style]').each(function() {
      var load_range = $(this).attr('data-unuimages-range');
      var load_group_range = $(this).attr('data-unuimages-group-range');
      if (load_group_range==current_group_range || load_range==current_range) {
        var attr_style = $(this).attr('data-unuimages-style');
        UnuImages.debug('UI Activating style : '+attr_style);
        $(this).attr('style',attr_style);
        $(this).addClass('unuimages-style-activated');
        $(this).removeAttr('data-unuimages-style');
      }
    }); */
    // activation attr src (marche pas bien sur certains browsers, � am�liorer ? 20170225 : � confirmer)
    $.each(UnuImages.objs, function(idx,obj) {
      // si déjà activé on passe
      if (obj.active == false) {
        if (obj.load_group_range==current_group_range || obj.load_range==current_range) {
          // activation retardée si présence temp image (même si on retarde aussi via les events, pour que dans tous les cas les temp soient activées avant)
          // activation aussi retardée si data-checkload-bypass="bypass" (TODO suffirait à englober le cas has temp image ?)
          // l'activation sans delay ne doit pas être un timer de 0 sinon elle n'est pas faite tout de suite, d'où la repetition du code au lieu d'un parametre sur le setTimeout
          if ((obj.has_temp_image || obj.bypass_checkload=="bypass") && activate_if_has_temp_image_or_ucl_bypass) {
            UnuImages.objs[idx].load_check = true; // marquage à l'avance pour éviter que ce soit fait ailleurs/avant qu'après ce délai
            setTimeout(function() {
              // activation
              UnuImages.debug('UI Activating src (Delayed hastemp): '+obj.attr_src);
              obj.obj.attr('src',obj.attr_src);
              obj.obj.addClass('unuimages-src-activated');
              obj.obj.removeAttr('data-unuimages-src');
              UnuImages.objs[idx].active = true;
              // check load
              UnuImages.load_check(idx);
            },100); // initialement 500
          }
          else if (!obj.has_temp_image && obj.bypass_checkload!="bypass") {
            // activation
            UnuImages.debug('UI Activating src : '+obj.attr_src);
            obj.obj.attr('src',obj.attr_src);
            obj.obj.addClass('unuimages-src-activated');
            obj.obj.removeAttr('data-unuimages-src');
            UnuImages.objs[idx].active = true;
            // check load
            UnuImages.load_check(idx);
          }
        }
      }
    });
  }

  /*
  * Gestion des ratios sur les img en mode cover
  * ou activation mode object-fit si browser compatible
  */
  UnuImages.set_unuimages_cover_ratios = function() {
    $.each(UnuImages.objs, function(idx,obj) {
      if (obj.cover && obj.active == true && obj.loaded == true) {
        UnuImages.set_unuimages_cover_ratio(idx);
      }
    });
  }
  UnuImages.set_unuimages_cover_ratio = function(idx) {
    var obj = UnuImages.objs[idx];
    if (!obj.coverWithObjectFit) {
      if (canBrowserObjectFit && obj.coverAllowObjectFit) {
        obj.coverWithObjectFit = true;
        obj.obj.addClass('unuimage-objfit-cover');
      }
      else if (obj.cover && obj.active == true && obj.loaded == true) {
        var p_h = obj.parentobj.height();
        var p_w = obj.parentobj.width();
        //UnuImages.debug('UI '+p_w+' '+p_h);
        //UnuImages.debug('UI '+obj.ratioImg);
        if (p_h>0) {
          if ( p_w/p_h <= obj.ratioImg) {
            if (obj.coverClass != 'unuimage-w') {
              UnuImages.objs[idx].coverClass = 'unuimage-w';
              obj.obj.addClass('unuimage-w').removeClass('unuimage-h');
            }
          } else {
            if (obj.coverClass != 'unuimage-h') {
              UnuImages.objs[idx].coverClass = 'unuimage-h';
              obj.obj.addClass('unuimage-h').removeClass('unuimage-w');
            }
          }
        }
      }
    }
  }


  // HELPER : marque un objet comme chargé (dans UnuImages.objs + css class)
  // + marquage css de sa version temporaire le cas échéant
  UnuImages.set_loaded = function(idx) {
    UnuImages.objs[idx].loaded = true;
    UnuImages.objs[idx].obj.addClass('unuimage-loaded');
    // marquage de l'image temporaire associée le cas échéant
    if (UnuImages.objs[idx].has_temp_image) {
      UnuImages.objs[idx].obj.prev().addClass('temp_image_canhide');
    }
    // loaded class on parent img_image_item si bon range
    // permet une anim au load mais pas au changement de range...
    if (UnuImages.objs[idx].load_group_range==Drupal.mqsync.activeMQgroup || UnuImages.objs[idx].load_range==Drupal.mqsync.activeMQ) {
      UnuImages.objs[idx].obj.closest('div.img_image_item').addClass('unuimage-initial-loaded');
    }
  }

  // HELPER do load check
  UnuImages.load_check = function(idx) {
    //UnuImages.debug('UI doing load check '+idx);
    UnuImages.objs[idx].load_check = true;
    if (UnuImages.objs[idx].obj[0].complete ) {
      UnuImages.set_loaded(idx);
      UnuImages.set_unuimages_cover_ratio(idx);
    }
    else {
      UnuImages.objs[idx].obj.on('load.unuimage_global',function() {
        UnuImages.set_loaded(idx);
        UnuImages.set_unuimages_cover_ratio(idx);
      });
    }
  }

  // Nettoyage des classes dans le cas d'une copie d'elements du DOM
  // permet la prise en compte des images copiées via un event content_update par exemple
  UnuImages.cleanElement = function($obj) {
    $obj.find('img.unuimage').each(function() {
      if (!$(this).attr('src')) {
        UnuImages.debug('UI Cleaning an image');
        $(this).removeClass('unuimage-init');
      }
    });
  }

  /*
  * MqSync Events
  */
  $(window).on( "mqsync.ev_unuimage_global", function( event, mqs_data ) {

    if (mqs_data.base_event == 'ready'
     || mqs_data.base_event == 'ajax_links_api_ready')
    {
      // Preparation de la liste de tous les objets à prendre en charge et non déjà référencés
      UnuImages.detect_images($('body'));

      // activation des src (ou style pour BG)
      UnuImages.activer_images(false);

      // Gestion load (pour images autres que celles éventuellement activées par UI)
      // Cas des images dont l'attribut src/style existe déjà et qui ne seront pas traitées par UnuImages.activer_images()
      $.each(UnuImages.objs, function(idx,obj) {
        if (obj.active == true && obj.load_check == false) {
          UnuImages.load_check(idx);
        }
      });
    }

    // au load ou new range on active aussi les images qui avaient un pendant temporaire
    if (mqs_data.base_event == 'ajax_links_api_load'
     || mqs_data.base_event == 'direct_page_content_load'
     || mqs_data.group_type == 'newrange')
    {
      // activation des src (ou style pour BG)
      UnuImages.activer_images(true);
    }

    // au resize, gestion du mode cover
    if (mqs_data.base_event == 'resize')
    {
      // set unu images cover class on img
      UnuImages.set_unuimages_cover_ratios();
    }

    // content update, detection et activation complete
    if (mqs_data.base_event == 'content_update')
    {
      UnuImages.detect_images($(mqs_data.base_event_data.target)); // TODO vérifier qu'on adresse bien l'objet source et pas tous les objets de la même classe par exemple
      UnuImages.activer_images(true);
    }
  });

})(jQuery);
;
/*
* Unu Checkload
* 2016 09 - GLG
* 2017 09 - check LGv2
* 2018 03 30 - fichiers additionnels et improvment fichiers déjà check
*
* What we do :
* Trigger d'un event donne en parametre apres avoir verifie le chargement d'un certain nombre d'images
*
*/

(function ($) {

  console.log('Load UCL / Unu Check Load');

  /*
  * Base
  */
  UnuCheckload = function() {}

  /*
  * Debug console fonction
  */
  UnuCheckload.debug = function(obj) {
    console.log(obj);
  }

  /*
  * Objets déjà chargés
  * - On garde la trace de ce qu'on a déjà rencontré et confirmé comme chargé pour éviter de vérifier à nouveau (cache navigateur considéré comme actif...)
  */
  UnuCheckload.alreadyLoaded = []
  UnuCheckload.storeLoaded = function(url) {
    UnuCheckload.alreadyLoaded.push(url);
  }
  UnuCheckload.hasAlreadyLoaded = function(url) {
    if (UnuCheckload.alreadyLoaded.indexOf(url)!=-1) {
      return true;
    }
    return false;
  }

  /*
  * Check content load
  * selector : perimetre des objets
  * event_name : nom de l'event une fois les elements loaded
  * event_infos : event data
  *
  *
  */
  UnuCheckload.check = function(selector, event_name, event_infos, max_load_img, max_load_bg_img) {

    _ = this;
    if (typeof UnuLoader !== 'undefined')
      UnuLoader.update('assets',0);

    // Content fully loaded detection
    var to_load_collection = $();
    var count_img = 0;
    var count_bg_img = 0;
    var additional_files_to_check = [];

    // Collects Div background images
    $(selector).find('div').filter(function() {
      return ( $(this).css('background-image') !== 'none' // skip if none
        && $(this).css('background-image').substr(0,4) == 'url(' ); // avoid to track gradient and and other non file background
    }).each(function() {
      var img_url = $(this).css('background-image').slice(4, -1).replace(/"/g, "");
      var checkload_bypass = $(this).attr('data-checkload-bypass');
      if (checkload_bypass == 'bypass') {
        UnuCheckload.debug('UCL Bypass Check Load BG image : '+img_url);
      }
      else if (UnuCheckload.hasAlreadyLoaded(img_url)) {
        UnuCheckload.debug('UCL BG image stored as already loaded : '+img_url);
      }
      else if (count_bg_img >= max_load_bg_img) {
        UnuCheckload.debug('UCL Max Preload Items count reached for BG image : '+img_url);
      }
      else {
        UnuCheckload.debug('UCL Found Check Load BG image :'+img_url);
        to_load_collection.push( $('<img src="'+img_url+'" />') );
        count_bg_img++;
      }
    });

    // Collects Images
    $(selector).find('img').each(function() {
      var checkload_bypass = $(this).attr('data-checkload-bypass');
      if (typeof $(this)[0].src !== 'undefined' && $(this)[0].src!='') {
        var img_url = $(this)[0].src;
        if (checkload_bypass == 'bypass') {
          UnuCheckload.debug('UCL Bypass Check Load NORMAL image : '+img_url);
        }
        else if (UnuCheckload.hasAlreadyLoaded(img_url)) {
          UnuCheckload.debug('UCL NORMAL image stored as already loaded : '+img_url);
        }
        else if (count_img >= max_load_img) {
          UnuCheckload.debug('UCL Max Preload Items count reached for NORMAL image : '+img_url);
        }
        else {
          UnuCheckload.debug('UCL Found Check Load NORMAL image :'+img_url);
          to_load_collection.push( $('<img src="'+img_url+'" />') );
          count_img++;
        }
      }
    });

    // Fichiers additionels (Config in bbrg_front_client.module)
    if (typeof Drupal.settings.unu_checkload !== 'undefined' && typeof Drupal.settings.unu_checkload.additional_files !== 'undefined') {
      $.each(Drupal.settings.unu_checkload.additional_files, function(idx,url) {
         if (!UnuCheckload.hasAlreadyLoaded(url)) {
           additional_files_to_check.push(url);
           UnuCheckload.debug('UCL Will check additional file :'+url);
         }
      });
    }

    // Check load !

    var nb_to_load = to_load_collection.length + additional_files_to_check.length;

    UnuCheckload.debug('UCL Objects to wait to load : '+nb_to_load);
    var nb_loaded = 0;

    function checkDone() {
      UnuCheckload.debug('UCL : '+nb_loaded+' / '+nb_to_load);
      if (nb_to_load>0 && nb_loaded < nb_to_load) {
        if (typeof UnuLoader !== 'undefined')
          UnuLoader.update('assets', nb_loaded/nb_to_load);
      }
      else if ( nb_loaded == nb_to_load ) {
        if (typeof UnuLoader !== 'undefined')
          UnuLoader.update('assets',1);
        // reset flag that will allow new ajax api load
        if (typeof AjaxLinksApi !== 'undefined')
          AjaxLinksApi.loading = false;
        // Event to inform about the end of load
        UnuCheckload.debug('UCL done ! trigger event : '+event_name);
        $(window).trigger( event_name, event_infos );
      }
    }

    to_load_collection.each(function() {
      if (this.complete) {
          nb_loaded++;
          UnuCheckload.storeLoaded(this.src);
      } else {
        $(this)
        .on('load.ucl_event',function(){
          nb_loaded++;
          checkDone();
          UnuCheckload.storeLoaded(this.src);
        })
        .on('error.ucl_event',function(){
          UnuCheckload.debug('UCL Error when checking load of an image');
          console.error('UCL Error when checking load of an image');
          //console.error($(this));
          nb_loaded++;
          checkDone();
        });
      }
    });

    $.each(additional_files_to_check, function(idx,url) {
      $.get(url)
        .done(function( data ) {
          nb_loaded++;
          checkDone();
          UnuCheckload.storeLoaded(url);
        });
    });

    checkDone();
  }

})(jQuery);
;
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
;
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
;
/*
* Unu Scroll
* 2017 05 - GLG
* 2017 12 - GLG Version simplifiée pour TC, un seul container
* 2017 12 - GLG version VM1
* 2018 01 - GLG Refonte du système des register AF/REsize + unregister
* 2018 01 - GLG ajout d'une fonction pour positionnement du scroll sans anim (setScrollPosNoAnim), ex sur un changement de page ALA
* 2018 01 - GLG improve scrollToId + ajout fonction debug
* 2018 03 - GLG gestion scroll sans coeff dans le haut de page pour éviter une différence pane / fixed stuff lors du bounce
*
* What we do ?
* gestion du scroll du contenu piloté par scroll du body
*
*/

(function ($) {

  console.log('Load US / Unu Scroll');

  var scroll_AFid;
  var scroll_AFid_paused = false;

  // Determination de la methode de positionnement des objets scrollables (sinon on utilise toujours du fixed)
  // using absolute on IOS : fixed repaint bug
  // using fixed elsewhere : absolute refresh bug (frame is repainted after scroll repaint on IE/edge)
  var isIOS = false;
  var animPositionMethod = 'fixed';
  var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (iOS) {
    animPositionMethod = 'absolute';
    isIOS = true;
  }

  var $wind = $(window);
  var page = null;
  var st = 0;
  var vh = $wind.height();
  var vw = $wind.width();

  var scrollCoeffDefault = 1; // coeff scroll default

  var topZonePixels = 300; // (0 to disable) zone en haut de scroll sur laquelle on fait tendre le coeff vers 1 (ex si 200 : a 200 le coeff est tel que configuré et à 0 il vaudra 1);


  // objet
  var scrollPane = {
    selector:'div.scroll_scroller',
    obj:null,
    h:0,
    positionMethod:'',
    sc_val: 0,
    sc_incr: 0,
    sc_target: 0,
    sc_coeff: scrollCoeffDefault,
    sc_coeff_effectif: scrollCoeffDefault,
    sc_rule: function() {
      return -st;
    },
    st_backup: 0,
  };

  // function d'animation annexes
  var registeredAFs = [];
  var registeredResizes = [];


  /*
  * Base
  */
  UnuScroll = function() {}

  UnuScroll.debug = function(obj) {
    console.log(obj);
  }

  UnuScroll.setRangeParams = function(_coeff) {
    if (!isIOS) {
      scrollPane.sc_coeff = _coeff;
    }
  }

  /*
  * Animation Frame
  */
  UnuScroll.animationFrame = function() {
    // update st current value
    st = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
    scrollPane.sc_incr = 0;
    scrollPane.sc_target = scrollPane.sc_rule();
    if (scrollPane.sc_target != scrollPane.sc_val) {
      scrollPane.sc_coeff_effectif = scrollPane.sc_coeff;
      // Cas ou on fait tendre le coeff vers 1 à l'approche du haut de page pour éviter une différence visuelle entre les objets en fixed et le pane qui scroll
      if (topZonePixels != 0 && scrollPane.sc_target>-topZonePixels) {
        scrollPane.sc_coeff_effectif = 1 - (scrollPane.sc_coeff-1)*scrollPane.sc_target/topZonePixels;
      }
      //console.log(scrollPane.sc_target+' '+scrollPane.sc_val+' '+scrollPane.sc_coeff_effectif);
      scrollPane.sc_incr = (scrollPane.sc_target-scrollPane.sc_val)/scrollPane.sc_coeff_effectif;
      if ( Math.abs(scrollPane.sc_incr) <= 0.1) {
        scrollPane.sc_incr = scrollPane.sc_target-scrollPane.sc_val;
        scrollPane.sc_val = scrollPane.sc_target;
      }
      else {
        scrollPane.sc_val = Math.round((scrollPane.sc_val+scrollPane.sc_incr)*100)/100;
      }
    }
    switch(scrollPane.positionMethod) {
      case 'fixed':
        scrollPane.obj[0].style.top = (scrollPane.sc_val)+'px';
        break;
      case 'absolute':
      default:
        scrollPane.obj[0].style.top = (st + scrollPane.sc_val)+'px';
    }

    // Execute registered AF
    UnuScroll.executeRegisteredAFs();

    // Next AF
    if (!scroll_AFid_paused)
      scroll_AFid = requestAnimationFrame(UnuScroll.animationFrame);
  }

  // TODO : fonction peut etre à virer et gérer dans les events...
  UnuScroll.start = function() {

    page.css('height','100000px');

    //UnuScroll.debug('US : set scroll : '+scrollPane.st_backup);
    //document.documentElement.scrollTop = document.body.scrollTop = scrollPane.st_backup;

    scrollPane.positionMethod = animPositionMethod;
    scrollPane.obj.css({
      'position': animPositionMethod,
      'top': st + scrollPane.sc_val,
    });

    UnuScroll.resize();

    // resize & co apres un delai pour prise en compte des nouvelles classes
    setTimeout(function() {
      // Execute registered resizes
      UnuScroll.executeRegisteredResizes();
      // Execute registered anims
      UnuScroll.executeRegisteredAFs();
    },1);

    scrollPane.obj.addClass('us-active-pane');
  }

  // pause / restart pour economie de ressource quand une popin est ouverte par exemple
  UnuScroll.pause = function() {
    scroll_AFid_paused = true;
  }
  UnuScroll.restart = function() {
    if (scroll_AFid_paused) {
      scroll_AFid_paused = false;
      scroll_AFid = requestAnimationFrame(UnuScroll.animationFrame);
    }
  }

  /*
  * Gestion resize
  */
  UnuScroll.resize = function() {
    vh = $wind.height();
    vw = $wind.width();
    scrollPane.h = scrollPane.obj.outerHeight(); // TODO : on a parfois encore null ici, à voir pour mieux initialiser scrollPane.obj et comprendre pourquoi la fonction resize est appelée avant...
    UnuScroll.debug('US : resize based on '+scrollPane.selector);
    page.css('height',scrollPane.h+'px');
  }


  /*
  * Registered Animation Functions & Resize Functions
  */
  UnuScroll.registerAF = function(namespace, funcAF, funcResize) {

    registeredAFs.push({namespace:namespace, func:funcAF});
    UnuScroll.debug('US registered '+namespace+' / Total '+registeredAFs.length+' registered AFs');
    UnuScroll.debug(registeredAFs);

    registeredResizes.push({namespace:namespace, func:funcResize});
    UnuScroll.debug('US registered '+namespace+' / Total '+registeredResizes.length+' registered Resizes');
    UnuScroll.debug(registeredResizes);
  }

  UnuScroll.executeRegisteredResizes = function() {
    $.each(registeredResizes, function(idx,entry) {
      entry.func.call(this, vh, vw, -1 * scrollPane.sc_val, st, scrollPane.sc_incr);
    });
  }

  UnuScroll.executeRegisteredAFs = function() {
    $.each(registeredAFs, function(idx,entry) {
      entry.func.call(this, vh, vw, -1 * scrollPane.sc_val, st, scrollPane.sc_incr);
    });
  }

  UnuScroll.unregisterAF = function(namespace) {
    UnuScroll.debug('US unregister : '+namespace);
    $.each(registeredAFs, function(idx,entry) {
      if (typeof entry !== 'undefined' && entry.namespace == namespace) {
        registeredAFs.splice(idx,1);
      }
    });
    UnuScroll.debug('US '+registeredAFs.length+' registered AFs remaining');
    $.each(registeredResizes, function(idx,entry) {
      if (typeof entry !== 'undefined' && entry.namespace == namespace) {
        registeredResizes.splice(idx,1);
      }
    });
    UnuScroll.debug('US '+registeredResizes.length+' registered Resizes remaining');
  }


  /*
  * scroll to an ID
  * href : id de l'element avec #, ex #node1
  * offset : valeur supplémentaire de scroll
  * minst : valeur minimale de position
  */
  UnuScroll.scrollToId = function(href, offset, minst) {
    if (typeof href != "undefined" && href.substr(0,1)=='#') {
      targetBloc = $(href);
      // We have a, existing  target block
      if (targetBloc.length>0) {
        var target_st = targetBloc.offset().top;
        target_st += scrollPane.sc_target - scrollPane.sc_val; // correctif scroll en cours
        target_st += offset; // offset pour qu'on ne soit pas calé juste en heut du vp par exemple (valeur négative dans ce cas)
        target_st = Math.max(minst,target_st);
        // if coeff != 1, animate normally else animate with simple jQuery
        if(scrollPane.sc_coeff != 1){
          document.documentElement.scrollTop = document.body.scrollTop = target_st;
          UnuScroll.debug('US Scroll to anchor '+href+' at '+target_st);
        }
        else {
          // Nécessaire ? à voir selon le comportement sur IOS, notamment au niveau des anchors du sticking menu
          UnuScroll.debug('US Scroll to anchor '+href+' at '+ 0);
          $('html, body').animate({scrollTop:target_st}, 800, 'easeOutCubic');
        }
        return true;
      }
      // The target is #, scroll to 0
      else if(href == '#') {
        // if coeff != 1, animate normally else animate with simple jQuery
        if(scrollPane.sc_coeff != 1) {
          UnuScroll.debug('US Scroll to anchor '+href+' at '+ 0);
          document.documentElement.scrollTop = document.body.scrollTop = 0;
        }
        else {
          UnuScroll.debug('US Animate Scroll to anchor '+href+' at '+ 0);
          $('html, body').animate({scrollTop:0}, 800, 'easeOutCubic');
        }
      }
    }
    return false;
  }


  /*
  * Set scroll position without anim
  */
  UnuScroll.setScrollPosNoAnim = function(top) {
    document.documentElement.scrollTop = document.body.scrollTop = top;
    scrollPane.sc_val = top;
  }

  /*
  * Init
  */
  $wind.on( "mqsync.ev_unuscroll_global", function( event, mqs_data ) {

    if (mqs_data.base_event == 'ready') {

      // init objects
      page = $('#page');
      scrollPane.obj = $(scrollPane.selector);

      // Start AF
      scroll_AFid = requestAnimationFrame(UnuScroll.animationFrame);

    }
    else if (mqs_data.base_event == 'ajax_links_api_ready') {

      // update obj (may be renewed if insite ALA perimeter)
      scrollPane.obj = $(scrollPane.selector);

    }
    else if (mqs_data.base_event == 'direct_page_content_load')
    {

      // timer pour fix d'un pb sur ie11 qui n'a pas les bonnes tailles tout de suite...
      setTimeout(function() {
        // Execute registered resizes
        UnuScroll.executeRegisteredResizes();
        // Execute registered anims
        UnuScroll.executeRegisteredAFs();
      }, 100);

    }
    else if (mqs_data.base_event == 'ajax_links_api_load')
    {

      // Execute registered resizes
      UnuScroll.executeRegisteredResizes();
      // Execute registered anims
      UnuScroll.executeRegisteredAFs();

    }
    else if (mqs_data.base_event == 'resize') {

      UnuScroll.resize();

      // Execute registered resizes
      UnuScroll.executeRegisteredResizes();
      // Execute registered anims
      UnuScroll.executeRegisteredAFs();

    }

  });

})(jQuery);
;


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
;
/*
* Unu Player
* 2017 10 - Init on lgv2
* 2017 11 - improvements pour cover home lgv2
* 2018 01 - ajout positionnement des commands selon le ratio de la cover
*
* TODO : gestion inline video on IOS (usual fix needed?)
*
*
* What we do
* Simple video player with desk/mob videos, cover, and a few commands
*/

(function ($) {

  console.log('Load UP / Unu Player');

  UnuPlayer = function() {
    UnuPlayer.debug('UP Create');

    var up = this;

    // init options
    var options = arguments[1];
    options = options || {};
    // start as muted
    if (typeof options.mute == 'undefined')
      options.mute = false;
    // auto loop video
    if (typeof options.loop == 'undefined')
      options.loop = false;
    // show commands
    if (typeof options.commands == 'undefined')
      options.commands = true;
    // commands position selon cover ratio
    if (typeof options.commands_position_ratio == 'undefined')
      options.commands_position_ratio = false;

    // id unique de l'instance
    this.id = UnuPlayer.countInstances++;

    // collecte des objets $
    up.$ = {};
    up.$.unu_player = $(arguments[0]);
    up.$.desk_video = this.$.unu_player.find('video.video_desk');
    up.$.mob_video = this.$.unu_player.find('video.video_mob');
    up.$.both_video = this.$.unu_player.find('video');
    up.$.buttons = this.$.unu_player.find('div.buttons');
    up.$.commands = this.$.unu_player.find('div.commands');

    // states
    this.disabled = false; // commandes desactivées

    // cover ratio / commands position
    if (options.commands_position_ratio) {
      this.cover_ratio = this.$.unu_player.find('div.cover div.img_image_item').attr('data-ratio');
      if (this.cover_ratio >= 1)
        up.$.commands.css('top',(100/this.cover_ratio/2+50)+'%');
      else
        up.$.commands.css('top','100%');
    }

    // options handling
    if (options.mute) {
      up.mute();
    }
    if (options.loop) {
      up.$.unu_player.addClass('loop');
      up.$.desk_video.prop('loop', true);
      up.$.mob_video.prop('loop', true);
    }
    if (!options.commands) {
      up.$.commands.css('display','none');
    }

    if (options.commands) {
      // mute / unmute commands
      var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (iOS) {
        // removing mute control on IOS as it is not possible
        up.$.commands.find('div.mute').remove();
        up.$.commands.find('div.unmute').remove();
      }
      else {
        // mute/unmute buttons events
        up.$.commands.find('div.mute').on('click',function() {
          up.mute();
        });
        up.$.commands.find('div.unmute').on('click',function() {
          up.unmute();
        });
      }

      // fullscreen command
      up.$.commands.find('div.full').on('click',function() {
        up.fullscreen();
      });

      // restart
      up.$.commands.find('div.restart').on('click',function() {
        up.restart();
      });
    }

    // do preload on current range video
    //up.$.desk_video.prop('preload', 'metadata');

    // play/pause
    up.$.buttons.on('click',function() {
      if (!up.disabled) {
        up.toggle();
      }
    });

    // ended
    up.$.both_video.on('ended',function() {
      console.log('ended video');
      up.$.unu_player.removeClass('playing');
    });

    // mark as initialized
    this.$.unu_player.addClass('unu_player_initialized');
  }

  // Static stuff to track instances
  // Global carou ids counter
  UnuPlayer.countInstances = 0;

  UnuPlayer.debug = function(obj) {
    //console.log(obj);
  }

  // toggle play/pause
  UnuPlayer.prototype.toggle = function() {
    var up = this;
    $.each(up.getvideos(UnuPlayer.getCurrentperimeter()), function(idx, video) {
      if (video.paused) {
        UnuPlayer.debug('UP play video');
        video.play();
        video.currentTime = 0;
        up.$.unu_player.addClass('playing');
      } else {
        UnuPlayer.debug('UP pause video');
        video.pause();
        video.currentTime = 0;
        up.$.unu_player.removeClass('playing');
      }
    });
  }

  // play
  UnuPlayer.prototype.play = function() {
    var up = this;
    $.each(up.getvideos(UnuPlayer.getCurrentperimeter()), function(idx, video) {
      if (video.paused) {
        UnuPlayer.debug('UP play video');
        video.play();
        video.currentTime = 0;
        up.$.unu_player.addClass('playing');
      }
    });
  }

  // restart
  UnuPlayer.prototype.restart = function() {
    var up = this;
    $.each(up.getvideos(UnuPlayer.getCurrentperimeter()), function(idx, video) {
      if (!video.paused) {
        UnuPlayer.debug('UP restart video');
        video.currentTime = 0;
      }
    });
  }

  // pause
  UnuPlayer.prototype.pause = function() {
    var up = this;
    // dans le cas du pause on pause toutes les videos car cela peut servir au changement de range
    $.each(up.getvideos('all'), function(idx, video) {
      if (!video.paused) {
        UnuPlayer.debug('UP pause video');
        video.pause();
        video.currentTime = 0;
        up.$.unu_player.removeClass('playing');
      }
    });
  }

  // fullscreen
  UnuPlayer.prototype.fullscreen = function() {
    var up = this;
    $.each(up.getvideos(UnuPlayer.getCurrentperimeter()), function(idx, video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    });
  }

  // mute
  UnuPlayer.prototype.mute = function() {
    var up = this;
    up.$.unu_player.addClass('muted');
    up.$.desk_video.prop('muted', true);
    up.$.mob_video.prop('muted', true);
  }

  // unmute
  UnuPlayer.prototype.unmute = function() {
    var up = this;
    up.$.unu_player.removeClass('muted');
    up.$.desk_video.prop('muted', false);
    up.$.mob_video.prop('muted', false);
  }

  // obtention des elements videos en fonction d'un perimetre demandé
  UnuPlayer.prototype.getvideos = function(perimeter) {
    var up = this;
    var videos = [];
    switch(perimeter) {
      case 'desk':
        videos = [this.$.desk_video[0]];
        break;
      case 'mob':
        videos = [this.$.mob_video[0]];
        break;
      default:
        videos = [this.$.desk_video[0], this.$.mob_video[0]];
        break;
    }
    return videos;
  }

  // disable/enable commands
  UnuPlayer.prototype.disable = function() {
    this.disabled = true;
  }
  UnuPlayer.prototype.enable = function() {
    this.disabled = false;
  }

  // obtention du perimetre actuel
  UnuPlayer.getCurrentperimeter = function() {
    if ( $('body').attr('data-mqsync-group-range') == 'mobile' )
      return 'mob';
    else
      return 'desk';
  }

  // Extends jQuery
  $.fn.unu_player = function() {
      var _ = this,
          opt = arguments[0],
          args = Array.prototype.slice.call(arguments, 1),
          l = _.length,
          i,
          ret;
          
      // iteration sur les elements jquery
      for (i = 0; i < l; i++) {
        if (typeof opt == 'object' || typeof opt == 'undefined') {
          if (typeof _[i].unu_player == 'undefined')
            _[i].unu_player = new UnuPlayer(_[i], opt);
          else {
            console.warn('UP The UnuPlayer was already initialized');
          }
        }
        else {
          // applying a unuplayer function
          ret = _[i].unu_player[opt].apply(_[i].unu_player, args);
        }
        // cas des fonctions qui retournent une valeur, on la retourne dès le premier element
        if (typeof ret != 'undefined')
          return ret;
      }
      return _;
  };

})(jQuery);
;
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
;
/*
* Unutsi
* MQ Sync / Responsive Base Stuff
* 2016 02 - GLG
* 2016 07 - ajout group range et infos dans objet
* 2018 03 29 - ajout msqync current values on Drupal var (from any)
*/

// base from http://brettjankord.com/2012/11/15/syncing-javascript-with-your-active-media-query/

(function ($) {

  // Ensure we init mqsync once
  $('html').once('unu_mqsync', function () {

    console.log('Load MQS / Media Query Sync');

    // Add Events Cross-browser
    /*var event = {
      add: function(elem, type, fn) {
        if (elem.attachEvent) {
          elem['e'+type+fn] = fn;
          elem[type+fn] = function() {elem['e'+type+fn](window.event);}
          elem.attachEvent('on'+type, elem[type+fn]);
        } else
        elem.addEventListener(type, fn, false);
      }
    };*/

    // range groups
	  // Attention, on a ici tous les codes de ranges courants,
	  // pas forcément tous utilisés sur ce site
    var range_groups = {
  	  S: 'mobile',
      S1: 'mobile',
      S2: 'mobile',
      T: 'tablet',
      T1: 'tablet',
      T2: 'tablet',
      D: 'desktop',
      D1: 'desktop',
      D2: 'desktop',
      D3: 'desktop',
      D4: 'desktop',
      D5: 'desktop',
      MAX: 'desktop',
    }

    // Set default
    var currentMQ = "unknown";
    var currentMQgroup = "unknown";

    // Checks CSS value in active media query and syncs Javascript functionality
    var mqSync = function(base_event, base_event_data){

      // Debug MqSync
      console.log('MQS Base event : ***'+base_event+'***')

      // Get active MQ
      // Fix for Opera issue when using font-family to store value
      if (window.opera){
        var activeMQ = window.getComputedStyle(document.body,':after').getPropertyValue('content');
      }
      // For all other modern browsers
      else if (window.getComputedStyle)
      {
        var activeMQ = window.getComputedStyle(document.head,null).getPropertyValue('font-family');
      }
      // For oldIE
      else {
        // Use .getCompStyle instead of .getComputedStyle so above check for window.getComputedStyle never fires true for old browsers
        window.getCompStyle = function(el, pseudo) {
          this.el = el;
          this.getPropertyValue = function(prop) {
            var re = /(\-([a-z]){1})/g;
            if (prop == 'float') prop = 'styleFloat';
            if (re.test(prop)) {
              prop = prop.replace(re, function () {
                return arguments[2].toUpperCase();
              });
            }
            return el.currentStyle[prop] ? el.currentStyle[prop] : null;
          }
          return this;
        }
        var compStyle = window.getCompStyle(document.getElementsByTagName('head')[0], "");
        var activeMQ = compStyle.getPropertyValue("font-family");
      }
      activeMQ = activeMQ.replace(/"/g, "");
      activeMQ = activeMQ.replace(/'/g, "");

      // Get active MQ Group
      activeMQgroup = range_groups[activeMQ];

      // Detect MQS issue
      if (typeof activeMQgroup === 'undefined')
        console.log('MQS Error : active range/group not found !');

      // Event data init
      var mqs_data = {
        base_event : base_event,
        type : 'NA',
        range : activeMQ,
        range_previous : currentMQ,
        group_type : 'NA',
        group_range : activeMQgroup,
        group_range_previous : currentMQgroup,
        base_event_data: base_event_data,
      };

      // prepare event data
      if (activeMQ != currentMQ) {
        if (currentMQ == 'unknown')
        {
          // This is the first init
          mqs_data.type = "init";
          mqs_data.group_type = "init";
        }
        else
        {
          // A resize with range change
          mqs_data.type = "newrange";
          if (activeMQgroup != currentMQgroup) {
            // A resize with range group change
            mqs_data.group_type = "newrange";
          }
          else {
            // same group range
            mqs_data.group_type = "samerange";
          }
        }
        currentMQ = activeMQ;
        currentMQgroup = activeMQgroup;
        $('body').attr('data-mqsync-range',activeMQ);
        $('body').attr('data-mqsync-group-range',activeMQgroup);
        Drupal.mqsync = { activeMQ:activeMQ, activeMQgroup:activeMQgroup };
      }
      else {
        // Simple resize without range change
        mqs_data.type = "samerange";
        mqs_data.group_type = "samerange";
      }

      // Trigger event
      $(window).trigger( "mqsync", [ mqs_data ] );

    }; // End mqSync


    /*
    * Catchs events to then trigger a new event on the window object but with mqsync infos
    */

    // Run on doc Ready -> will trigger a mqsync event on window
    $( document ).ready(function() {
      mqSync('ready', null);
    });
    // Run on new page content load (the event is trigger manually after content load check (usually beetween ready and load))
    $( window ).on('direct_page_content_load', function(url) {
      mqSync('direct_page_content_load', null);
    });
    // Run on Load -> will trigger a mqsync event on window
    $(window).load(function() {
      mqSync('load', null);
    });

    // Run on Resize -> will trigger a mqsync event on window
    /*event.add(window, "resize", mqSync);*/
    $( window ).resize(function() {
      mqSync('resize', null);
    });

    // Run on ajax start
    $( document ).ajaxStart(function() {
      mqSync('ajaxstart', null);
    });
    // Run on ajax send
    $( document ).ajaxSend(function( event, jqxhr, settings ) {
      mqSync('ajaxsend', settings);
    });
    // Run on ajax complete
    $( document ).ajaxComplete(function() {
      mqSync('ajaxcomplete', null);
    });

    // Run on ajax links api new page ready
    $( window ).on('ajax_links_api_ready', function(url) {
      mqSync('ajax_links_api_ready', null);
    });
    // Run on ajax links api content loaded (the event is trigger manually after content load check)
    $( window ).on('ajax_links_api_load', function(url) {
      mqSync('ajax_links_api_load', null);
    });

    // Content update
    // To be manually triggered when updating content (except for ajax links API (dedicated events for ALA))
    $( window ).on('content_update', function(event) {
      mqSync('content_update',event);
    });

    // Special : relay of flag module events
    $(document).bind('flagGlobalAfterLinkUpdate', function(event, data) {
      mqSync('flagGlobalAfterLinkUpdate', data);
    });

  });

})(jQuery);
;
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
;
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
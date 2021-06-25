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
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
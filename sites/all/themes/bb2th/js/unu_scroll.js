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
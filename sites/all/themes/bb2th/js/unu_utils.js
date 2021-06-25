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
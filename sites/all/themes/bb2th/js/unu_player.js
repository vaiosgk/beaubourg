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
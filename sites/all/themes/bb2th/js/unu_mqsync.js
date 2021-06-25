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
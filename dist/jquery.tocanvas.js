/*
 *  jquery-tocanvas - v0.1.0
 *  A jquery plugin to overlay any img with a canvas to add effects to it
 *  http://seedoubleyou.nl
 *
 *  Made by Cees-Willem Hofstede
 *  Under MIT License
 */
// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

    "use strict";

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window and document are passed through as local variable rather than global
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = "toCanvas",
        defaults = {
            opacity: 0.8,
            zIndex: 10
        }
    ;

    // The actual plugin constructor
    function Plugin ( element, options ) {
        this.element = $(element);
        this.canvas = $('<canvas>');
        this.context;
        this.wrapper = $('<div>');
        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.settings = $.extend( {}, defaults, options );
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }

    // Avoid Plugin.prototype conflicts
    $.extend(Plugin.prototype, {
        init: function () {
            var tc = this
                tc.w = tc.element.width()
                tc.h = tc.element.height()
            ;
            tc.wrapper
                .addClass('tc_wrapper')
                .css({
                    position: 'relative',
                    width: tc.w,
                    height: tc.h
                })
            ;
            tc.canvas
                .addClass('tc_canvas')
                .css({
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: tc.settings.zIndex,
                    opacity: tc.settings.opacity
                })
                .attr({
                    // width and height need to be set as attributes
                    // so that the coordinate system is set correctly
                    width: tc.w, 
                    height: tc.h
                });
            ;
            tc.element
                .addClass('tc_image')   
                .wrap(tc.wrapper)
                .before(tc.canvas)
            ;

            //     TEMP
            // \/\/\/\/\/\/
            
            tc.context = this.canvas.get(0).getContext('2d');
            var imageObj = new Image();
            imageObj.onload = function() {
                tc.context.drawImage(imageObj, 0, 0, tc.w, tc.h);
                grayscale();
            };
            imageObj.src = this.element.attr('src');

            // for now, lets do some grayscaling
            function grayscale() { 
                var imgd = tc.context.getImageData(0, 0, tc.w, tc.h);
                var pix = imgd.data;
                for (var i = 0, n = pix.length; i < n; i += 4) {
                    var grayscale = pix[i  ] * .3 + pix[i+1] * .59 + pix[i+2] * .11;
                    pix[i  ] = grayscale;   // red
                    pix[i+1] = grayscale;   // green
                    pix[i+2] = grayscale;   // blue
                // alpha
                }
                tc.context.putImageData(imgd, 0, 0);
            }
        },
    });

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[ pluginName ] = function ( options ) {
        return this.each(function() {
            if ( !$.data( this, "plugin_" + pluginName ) ) {
                $.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
            }
        });
    };

})( jQuery, window, document );

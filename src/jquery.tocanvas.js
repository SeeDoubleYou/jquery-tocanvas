/*
 *  jquery-tocanvas - v0.1.0
 *  A jquery plugin to overlay any img with a canvas to add effects to it
 *  http://seedoubleyou.nl
 *
 *  Made by Cees-Willem Hofstede
 *  Under MIT License
 */
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
            framerate: 0,
            hoverOpacity: 1,
            opacity: 1,
            process: {},
            zIndex: 10
        }
    ;

    // The actual plugin constructor
    function Plugin ( element, options ) {
        this.element = element;
        this.$element = $(this.element);
        this.canvas = $("<canvas>");
        this.$canvas = $(this.canvas);
        this.context;
        this.wrapper = $("<div>");
        this.$wrapper = $(this.wrapper);
        this.imageObj;
        this.imgData;
        this.pixels;
        this.renderCount = 0;

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
            var tc = this;
            tc.w = tc.$element.width();
            tc.h = tc.$element.height();

            tc.$wrapper
                .addClass("tc_wrapper")
                .css({
                    display: "inline-block",
                    height: tc.h,
                    position: "relative",
                    width: tc.w
                })
            ;

            tc.$canvas
                .addClass("tc_canvas")
                .css({
                    left: 0,
                    opacity: tc.settings.opacity,
                    position: "absolute",
                    top: 0,
                    zIndex: tc.settings.zIndex
                })
                .hover(function() {
                    $(this).css({
                        opacity: tc.settings.hoverOpacity
                    });
                }, function() {
                    $(this).css({
                        opacity: tc.settings.opacity
                    });
                })
                .attr({
                    // width and height need to be set as attributes
                    // so that the coordinate system is set correctly
                    height: tc.h,
                    width: tc.w
                })
            ;

            tc.$element
                .addClass("tc_image")
                .wrap(tc.$wrapper)
                .before(tc.$canvas)
            ;

            tc.context = this.canvas.get(0).getContext("2d");
            if(tc.$element.is("img")) {
                tc.imageObj = new Image();
                tc.imageObj.onload = function() {
                    tc.render();
                };
                tc.imageObj.src = this.$element.attr("src");
            }
            else if(tc.$element.is("video")) {
                tc.imageObj = tc.element;
                tc.$element.on("play", function() {
                    tc.render();
                });
                tc.$element.trigger("play");
            }
            else {
                return; //incorrect source
            }
        },

        render: function() {
            var tc = this;
            tc.context.drawImage(tc.imageObj, 0, 0, tc.w, tc.h);
            tc.imgd     = tc.context.getImageData(0, 0, tc.w, tc.h);
            tc.pixels   = tc.imgd.data;
            tc.nrPixels = tc.pixels.length;

            tc.context.putImageData(tc.imgd, 0, 0);
            $.each(tc.settings.process, function(index, modifierObj) {
                var modifier = Object.keys(modifierObj)[0];
                var options = modifierObj[modifier];
                tc[modifier](options);
            });

            tc.context.putImageData(tc.imgd, 0, 0);

            tc.renderCount++;
            
            if(tc.settings.framerate > 0) {
                window.setTimeout(function() {
                    tc.render();
                }, 1000/tc.settings.framerate);
            }
        },

        /**
         * Process a callback for each pixel.
         * We loop over all pixels and call the callback for each
         * 
         * 
         * @param  {Function} callback The callback must return an array [r, g, b, a]
         * @return {obj}      this
         */
        process: function(callback) {
            for (var x = 0; x < this.w; x++) {
                for (var y = 0; y < this.h; y++) {
                    var i = 4*(y*this.w + x);
                    var r = this.pixels[i],
                        g = this.pixels[i+1],
                        b = this.pixels[i+2],
                        a = this.pixels[i+3]
                    ;
                    var processed  = callback(r, g, b, a, x, y);
                    this.pixels[i]   = processed[0];
                    this.pixels[i+1] = processed[1];
                    this.pixels[i+2] = processed[2];
                    this.pixels[i+3] = processed[3]; 
                }    
            }
            return this;
        },

        /**
         * --------------------------------------------------------------------------------
         *            EFFECTS
         * -------------------------------------------------------------------------------- 
         */

        /**
         * Convert pixels to a pure gray value
         * @return {array} r, g, b, a
         */
        grayscale: function() {
            return this.process(function(r, g, b, a) {
                var grayscale = r * 0.3 + g * 0.59 + b * 0.11;
                return [
                    grayscale, 
                    grayscale, 
                    grayscale, 
                    a
                ];
            });
        },

        /**
         * Convert pixeld to sepia color
         * @return {array} r, g, b, a
         */
        sepia: function() {
            return this.process(function(r, g, b, a) {
                return [
                    (r * 0.393)+(g * 0.769)+(b * 0.189), 
                    (r * 0.349)+(g * 0.686)+(b * 0.168), 
                    (r * 0.272)+(g * 0.534)+(b * 0.131), 
                    a
                ];
            });
        },

        /**
         * Invert r, g and by by subtracting original values from 255
         * @return {array} r, g, b, a
         */
        invert: function() {
             return this.process(function(r, g, b, a) {
                return [
                    255 - r,
                    255 - g,
                    255 - b,
                    a
                ];
            });
        },

        vignette: function(options) {
            options = $.extend( {}, {
                size: 0.5,
                opacity: 1
            }, options );

            var outerRadius = Math.sqrt( Math.pow(this.w / 2, 2) + Math.pow(this.h / 2, 2) );
            var gradient = this.context.createRadialGradient(this.w/2, this.h/2, 0, this.w/2, this.h/2, outerRadius);
            
            // write current data to image so we can overlay the vignette
            this.context.putImageData(this.imgd, 0, 0);
            this.context.globalCompositeOperation = "source-over";
            gradient.addColorStop(0, "rgba(0,0,0,0)");
            gradient.addColorStop(options.size, "rgba(0,0,0,0)");
            gradient.addColorStop(1, "rgba(0,0,0,"+ options.opacity +")");
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, this.w, this.h);

            // make sure other effect get the updated data
            this.imgd   = this.context.getImageData(0, 0, this.w, this.h);
            this.pixels = this.imgd.data;
        },


        /**
         * --------------------------------------------------------------------------------
         *            ADJUSTMENTS
         * -------------------------------------------------------------------------------- 
         */
        threshold: function(threshold) {
            threshold = threshold || 127;
            return this.process(function(r, g, b, a) {
                var v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255 : 0;
                return [
                    v,
                    v,
                    v,
                    a
                ];
            });
        },

        brightness: function(brightness) {
            if (brightness === undefined) {
                $.error("brightness adjustment not set");
            }

            return this.process(function(r, g, b, a) {
                return [
                    r + brightness,
                    g + brightness,
                    b + brightness,
                    a
                ];
            });
        },

        saturation: function(saturation) {
            if (saturation === undefined) {
                $.error("saturation adjustment not set");
            }

            var tc = this;
            return this.process(function(r, g, b, a) {
                var hsl = tc.rgb2hsl(r, g, b);

                hsl.s = Math.min(Math.max(saturation/100, 0), 1);
                var rgb = tc.hsl2rgb(hsl.h, hsl.s, hsl.l);
                return [
                    rgb.r,
                    rgb.g,
                    rgb.b,
                    a
                ];
            });
        },

        contrast: function(contrast) {
            if (contrast === undefined) {
                $.error("contrast adjustment not set");
            }

            var tc = this;
            var level = Math.pow((contrast + 100) / 100, 2);
            return this.process(function(r, g, b, a) {
                return [
                    ((r / 255 - 0.5) * level + 0.5) * 255, 
                    ((g / 255 - 0.5) * level + 0.5) * 255, 
                    ((b / 255 - 0.5) * level + 0.5) * 255, 
                    a
                ];
            });
        },

        gamma: function(gamma) {
            if (gamma === undefined) {
                $.error("gamma adjustment not set");
            }

            return this.process(function(r, g, b, a) {
                return [
                    r * gamma, 
                    g * gamma, 
                    b * gamma, 
                    a
                ];
            });
        },


        /**
         * --------------------------------------------------------------------------------
         *            HELPERS
         * -------------------------------------------------------------------------------- 
         */
        
        rgb2hsl: function(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;
            var max = Math.max(r, g, b);
            var min = Math.min(r, g, b);
            var h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0;
            } else {
                var d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;

                    case g:
                        h = (b - r) / d + 2;
                        break;

                    case b:
                        h = (r - g) / d + 4;
                        break;
                }
            }
            h /= 6;
            return {
                h: h,
                s: s,
                l: l
            };
        },

        hsl2rgb: function(h, s, l) {
            var r, g, b;
            if (s === 0) {
                r = g = b = l; //gray value
            } else {
                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = this.hue2rgb(p, q, h + 1 / 3);
                g = this.hue2rgb(p, q, h);
                b = this.hue2rgb(p, q, h - 1 / 3);
            }
            return {
                r: r * 255,
                g: g * 255,
                b: b * 255
            };
        },

        hue2rgb: function(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
    });

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[ pluginName ] = function ( options ) {
        var canvas2DSupported = !!window.CanvasRenderingContext2D;
        if(!canvas2DSupported) {
            return;
        }

        return this.each(function() {
            if ( !$.data( this, "plugin_" + pluginName ) ) {
                $.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
            }
        });
    };

})( jQuery, window, document );

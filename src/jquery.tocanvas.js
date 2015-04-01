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
            overlay: true,
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
        this.wrapper = $("<div>");
        this.$wrapper = $(this.wrapper);
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
            if(tc.$element.is("img")) {
                tc.imageObj = new Image();
                tc.imageObj.onload = function() {
                    tc.setup();
                    tc.render();
                };
                tc.imageObj.src = this.$element.attr("src");
            }
            else if(tc.$element.is("video")) {
                tc.imageObj = tc.element;
                tc.$element.on("play", function() {
                    tc.setup();
                    tc.render();
                });
                tc.$element.trigger("play");
            }
            else {
                return; //incorrect source
            }
        },

        setup: function() {
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

            var canvasCSS = tc.settings.overlay ? {
                left: 0,
                opacity: tc.settings.opacity,
                position: "absolute",
                top: 0,
                zIndex: tc.settings.zIndex
            } : {
                opacity: tc.settings.opacity,
            };
            tc.$canvas
                .addClass("tc_canvas")
                .css(canvasCSS)
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
            
            tc.$element.addClass("tc_image");

            if(tc.settings.overlay) {
                tc.$element.wrap(tc.$wrapper);
                tc.$element.before(tc.$canvas);
            } else {
                tc.$element.after(tc.$canvas);
            }

            tc.context = this.canvas.get(0).getContext("2d");
        },

        /**
         * Render all effects, overlays, filters, etc.
         * @return {[type]} [description]
         */
        render: function() {
            var tc = this;
            
            if(tc.imageObj.paused || tc.imageObj.ended) {
                return false;
            }

            tc.context.drawImage(tc.imageObj, 0, 0, tc.w, tc.h); // draw image to canvas
            tc.imgdIn   = tc.context.getImageData(0, 0, tc.w, tc.h); // get data from 2D context  
            tc.pixelsIn = tc.imgdIn.data;
            tc.nrPixels = tc.pixelsIn.length;  

            $.each(tc.settings.process, function(index, modifierObj) {
                // we make a copy so that effects use 'in' during calculation
                // and 'out' when writing data
                
                tc.imgdOut   = tc.context.getImageData(0, 0, tc.w, tc.h); // get data from 2D context  
                tc.pixelsOut = tc.imgdOut.data;

                var modifier = Object.keys(modifierObj)[0];
                var options = modifierObj[modifier];
                tc[modifier](options);

                tc.putImageData();
            });

           

            tc.renderCount++;
            
            if(tc.settings.framerate > 0) {
                window.setTimeout(function() {
                    tc.render();
                }, 1000/tc.settings.framerate);
            }
        },

        putImageData: function() {
            this.context.putImageData(this.imgdOut, 0, 0);
            this.imgdIn   = this.imgdOut;
            this.imgdIn   = this.context.getImageData(0, 0, this.w, this.h); // get data from 2D context
            this.pixelsIn = this.imgdIn.data;
            this.nrPixels = this.pixelsIn.length;
        },

        /**
         * Process a callback for each pixel.
         * We loop over all pixels and call the callback for each
         * 
         * @param  {Function} callback The callback must return an array [r, g, b, a]
         * @return {obj}      this
         */
        process: function(callback) {
            for (var x = 0; x < this.w; x++) {
                for (var y = 0; y < this.h; y++) {
                    var i = 4*(y*this.w + x);
                    var r = this.pixelsIn[i],
                        g = this.pixelsIn[i+1],
                        b = this.pixelsIn[i+2],
                        a = this.pixelsIn[i+3]
                    ;
                    var processed = callback(r, g, b, a, x, y, i);
                    this.pixelsOut[i]   = processed[0];
                    this.pixelsOut[i+1] = processed[1];
                    this.pixelsOut[i+2] = processed[2];
                    this.pixelsOut[i+3] = processed[3]; 
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

        edges: function() {
            var tc = this;
            var rowShift = tc.w*4;
            return tc.process(function(r, g, b, a, x, y, i) {
                r = 127 + 2*r - tc.pixels[i + 4] - tc.pixels[i   + rowShift];
                g = 127 + 2*g - tc.pixels[i + 5] - tc.pixels[i+1 + rowShift];
                b = 127 + 2*b - tc.pixels[i + 6] - tc.pixels[i+2 + rowShift];
           
                return [r, g, b, a];
            });
        },

        noise: function(amount) {
            amount = amount || 10;
            return this.process(function(r, g, b, a) {
                return [
                    r + (0.5 - Math.random()) * amount, 
                    g + (0.5 - Math.random()) * amount, 
                    b + (0.5 - Math.random()) * amount, 
                    a
                ];
            });
        },

        /**
        * --------------------------------------------------------------------------------
        *           CONVULUTION FILTERS
        * -------------------------------------------------------------------------------- 
        */
        
        blur: function(options) {
            return this.convolutionFilter([
                [0.1, 0.1, 0.1],
                [0.1, 0.2, 0.1],
                [0.1, 0.1, 0.1]
            ], options);
        },

        boxBlur: function(options) {
            var options = $.extend({}, {
                radius: 3
            }, options);

            radius = options.radius;
            var tc = this;
            var len = radius * radius;
            var val = 1 / len;
            var filter = [];

            for(var r = 0; r < radius; r++) {
                var row = [];
                for(var c = 0; c < radius; c++) {
                    row.push(val);
                }
                filter.push(row);   
            }

            return this.convolutionFilter(filter, options);
        },

        sharpen: function(options) {
            return this.convolutionFilter([
                [ 0, -1,  0],
                [-1,  5, -1],
                [ 0, -1,  0]
            ], options);
        },

        emboss: function(options) {
            var options = $.extend({}, {
                offset: 127
            }, options);

            return this.convolutionFilter([
                [2,  0,  0],
                [0, -1,  0],
                [0,  0, -1]
            ], options);
        },

        laplace: function(options) {
            return this.convolutionFilter([
                [0,  1, 0],
                [1, -4, 1],
                [0,  1, 0]
            ], options);
        },

        sobel: function(options) {
            this.sobelVertical(options);
            this.putImageData();
            return this.sobelHorizontal(options);
        },

        sobelVertical: function(options) {
            return this.convolutionFilter([
                [-1, 0, 1],
                [-2, 0, 2],
                [-1, 0, 1]
            ], options);
        },

        sobelHorizontal: function(options) {
            return this.convolutionFilter([
                [-1, -2, -1],
                [ 0,  0,  0],
                [ 1,  2,  1]
            ], options);
        },

        /**
        * --------------------------------------------------------------------------------
        *            OVERLAYS
        * -------------------------------------------------------------------------------- 
        */

        vignette: function(options) {
            options = $.extend( {}, {
                size: 0.5,
                opacity: 1
            }, options );

            var outerRadius = Math.sqrt( Math.pow(this.w / 2, 2) + Math.pow(this.h / 2, 2) );
            var gradient = this.context.createRadialGradient(this.w/2, this.h/2, 0, this.w/2, this.h/2, outerRadius);
            
            // write current data to image so we can overlay the vignette
            this.context.putImageData(this.imgdOut, 0, 0);
            this.context.globalCompositeOperation = "source-over";
            gradient.addColorStop(0, "rgba(0,0,0,0)");
            gradient.addColorStop(options.size, "rgba(0,0,0,0)");
            gradient.addColorStop(1, "rgba(0,0,0,"+ options.opacity +")");
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, this.w, this.h);

            // make sure other effect get the updated data
            this.imgdOut   = this.context.getImageData(0, 0, this.w, this.h);
            this.pixelsOut = this.imgdOut.data;
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

        hue: function(options) {
            this.hslUpdate('h', options);
        },

        saturation: function(options) {
            this.hslUpdate('s', options);
        },

        brightness: function(options) {
            this.lightness(options);
        },

        lightness: function(options) {
            this.hslUpdate('l', options);
        },

        hslUpdate: function(axis, options) {
            var tc = this;
            options = $.extend( {}, {
                value: 0,
                colorize: false
            }, options );

            if (options.value === 0 && options.colorize !== true) {
                return false;
            }

            var max = axis == "h" ? 360 : 100;

            return this.process(function(r, g, b, a) {
                var hsl = tc.rgb2hsl(r, g, b);

                if(options.colorize) {
                    // colorize means, set the value to exaclty the value
                    hsl[axis] = Math.min(Math.max(options.value/max, 0), 1);
                } else {
                    // add the value to the current value
                    if(axis == "h") {
                        hsl[axis] = (hsl[axis]*360 + options.value) % max;
                        if(hsl[axis] < 0) {
                            hsl[axis] = max - hsl[axis];
                        }
                        hsl[axis] /= max;
                    } else {
                        hsl[axis] = Math.min(Math.max(hsl[axis] + options.value/max, 0), 1);
                    }
                }

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
            if (t < 0) { t += 1; }
            if (t > 1) { t -= 1; }
            if (t < 1 / 6) { return p + (q - p) * 6 * t; }
            if (t < 1 / 2) { return q; }
            if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
            return p;
        },

        convolutionFilter: function(filter, options) {
            if (filter === undefined) {
                $.error("filter not set");
            }
            var options = $.extend({}, {
                updateR: true,
                updateG: true,
                updateB: true,
                offset: 0,
            }, options);

            var tc = this;

            var rows = filter.length;    // odd
            var cols = filter[0].length; // odd

            var rm = Math.floor(rows/2); // center of row (current pixel)
            var cm = Math.floor(cols/2); // center of column (current pixel)

            var rowShift = tc.w*4;

            return tc.process(function(r, g, b, a, x, y, i) {
                
                var nR = options.updateR ? 0 : tc.pixelsIn[i  ],
                    nG = options.updateG ? 0 : tc.pixelsIn[i+1],
                    nB = options.updateB ? 0 : tc.pixelsIn[i+2]
                ;

                for(var row = 0; row < rows; row++) {
                    var rd = Math.abs(row-rm);
                    var ri = (row < rm ? -rd : (row > rm ? +rd : 0));

                    var nY = Math.max(Math.min(y+ri, tc.h-1), 0);
                    
                    for(var col = 0; col < cols; col++) {
                        var cd = Math.abs(col-cm);
                        var ci = (col < cm ? -cd : (col > cm ? +cd : 0));

                        var nX = Math.max(Math.min(x+ci, tc.w-1), 0);
                        var nI = 4*(nY * tc.w + nX);

                        if(options.updateR) { nR += (filter[row][col] * tc.pixelsIn[nI  ]); }
                        if(options.updateG) { nG += (filter[row][col] * tc.pixelsIn[nI+1]); }
                        if(options.updateB) { nB += (filter[row][col] * tc.pixelsIn[nI+2]); }
                    }     
                }
                return [options.offset + nR, options.offset + nG, options.offset + nB, a];
            });
        },

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

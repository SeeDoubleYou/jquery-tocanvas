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
            continuous: false,
            framerate: 0,
            hoverOpacity: 1,
            opacity: 1,
            overlay: true,
            process: {},
            sharedOptions: {},
            zIndex: 10
        }
    ;

    // The actual plugin constructor
    function Plugin ( element, options ) {
        this.element = element;
        this.$element = $(this.element);
        this.$canvas = $("<canvas>");
        this.canvas = this.$canvas.get(0);
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
        return this._init();
    }

    // Avoid Plugin.prototype conflicts
    $.extend(Plugin.prototype, {

        /**
         * Called when plugin is created. Initial setup.
         *
         * @return {obj}    this
         */
        _init: function () {
            var tc = this; // tc stands for ToCanvas and is used as a context var throughout the plugins methods

            // if the element is an image, create an image object with the same source.
            // Wait for the image object to load so that we know its dimensions
            // then perform setup and render the canvas
            if(tc.$element.is("img")) {
                tc.imageObj = new Image();
                tc.imageObj.onload = function() {
                    tc._setup();
                    tc.render();
                };
                tc.imageObj.src = this.$element.attr("src");
            }

            // Not an image? Video then (html5)? If so, awesome, let's use the video element as the image object
            // Then run the setup, and make sure the canvas is render when the video starts to play
            else if(tc.$element.is("video")) {
                tc.imageObj = tc.element;
                tc._setup();
                tc.$element.on("play", function() {
                    tc.render();
                });
                //tc.$element.trigger("play");
            }

            // Not an image and not an video? Out of luck you are!
            else {
                return false; //incorrect source
            }

            // return this to allow chaining
            return tc;
        },

        /**
         * Called when the object (img or video) is loaded. Do setup based on
         * object properties
         *
         * @return {obj}    this
         */
        _setup: function() {
            var tc = this;
            tc.w = tc.$element.width();
            tc.h = tc.$element.height();

            // add a wrapper so we can position the canvas on top of the image (when set as overlay)
            tc.$wrapper
                .addClass("tc_wrapper")
                .css({
                    display: "inline-block",
                    height: tc.h,
                    position: "relative",
                    width: tc.w
                })
            ;

            // create an abject for the canvas css based on the overlay setting
            var canvasCSS = tc.settings.overlay ? {
                left: 0,
                opacity: tc.settings.opacity,
                position: "absolute",
                top: 0,
                zIndex: tc.settings.zIndex
            } : {
                opacity: tc.settings.opacity,
            };

            // create the canvas itself
            tc.$canvas
                .addClass("tc_canvas") // @todo: maybe nice to have this as a setting?
                .css(canvasCSS)

                // update opacity on hover
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

            if(tc.settings.overlay) {
                tc.$element.wrap(tc.$wrapper);
                tc.$element.before(tc.$canvas);
            } else {
                tc.$element.after(tc.$canvas);
            }

            tc.context = this.canvas.getContext("2d");

            return tc;
        },

        /**
         * Render all effects, overlays, filters, etc.
         * Called automatically by the plugin, but you can use this for custom functionality
         *
         * @return {obj}    this
         */
        render: function() {
            var tc = this;

            if(tc.imageObj.paused || tc.imageObj.ended) {
                return false;
            }

            tc.draw();

            $.each(tc.settings.process, function(index, modifierObj) {
                var modifier = Object.keys(modifierObj)[0];
                var options = modifierObj[modifier];
                tc[modifier](options);
            });

            tc.renderCount++;

            if(tc.settings.framerate > 0) {
                window.setTimeout(function() {
                    tc.render();
                }, 1000/tc.settings.framerate);
            }

            return tc;
        },

        /**
         * Draw the contents of this.element to canvas en reset internal pixel data
         * Called by the {@link plugin#render} method, but you can use this for custom functionality
         *
         * @return {obj}    this
         */
        draw: function() {
            this.context.drawImage(this.imageObj, 0, 0, this.w, this.h); // draw image to canvas
            this.imgdIn   = this.context.getImageData(0, 0, this.w, this.h); // get data from 2D context
            this.pixelsIn = this.imgdIn.data;
            this.nrPixels = this.pixelsIn.length;

            // we make a copy so that effects use 'in' during calculation
            // and 'out' when writing data
            this.imgdOut   = this.context.getImageData(0, 0, this.w, this.h); // get data from 2D context
            this.pixelsOut = this.imgdOut.data;
            return this;
        },

        /**
         * draw the current pixel-data to the canvas and read the new pixel information from result
         * Called by the {@link process#processcallback} method, but you can use this for custom functionality
         *
         * @return {obj}    this
         */
        putImageData: function() {
            this.context.putImageData(this.imgdOut, 0, 0);
            this.imgdIn   = this.context.getImageData(0, 0, this.w, this.h); // get data from 2D context
            this.pixelsIn = this.imgdIn.data;
            this.nrPixels = this.pixelsIn.length;
            this.imgdOut   = this.context.getImageData(0, 0, this.w, this.h); // get data from 2D context
            this.pixelsOut = this.imgdOut.data;

            return this;
        },

        /**
         * Process a callback for each pixel.
         * We loop over all pixels and call the callback for each.
         * This function is used by all processed effects
         *
         * @param  {function} callback The callback must return an array [r, g, b, a]
         * @return {obj}      this
         */
        process: function(callback, options) {
            options = $.extend({}, {
                opacity: 1,
                xPctStart: 0,
                xPctEnd: 100,
                yPctStart: 0,
                yPctEnd: 100,
            }, this.settings.sharedOptions, options);

            // calculate begin and end pixels from percentage settings
            var xStart = Math.round(options.xPctStart * (this.w/100));
            var xEnd   = Math.round(options.xPctEnd   * (this.w/100));
            var yStart = Math.round(options.yPctStart * (this.h/100));
            var yEnd   = Math.round(options.yPctEnd   * (this.h/100));

            // loop over x-axis from start to end
            for (var x = xStart; x < xEnd; x++) {
                // loop over y-axis from start to end
                for (var y = yStart; y < yEnd; y++) {
                    var i = 4*(y*this.w + x);
                    var r = this.pixelsIn[i],
                        g = this.pixelsIn[i+1],
                        b = this.pixelsIn[i+2],
                        a = this.pixelsIn[i+3]
                    ;
                    // get processed pixel object from callback
                    var processed = callback(r, g, b, a, x, y, i);

                    // set pixel values from prosessed data
                    this.pixelsOut[i]   = processed[0];
                    this.pixelsOut[i+1] = processed[1];
                    this.pixelsOut[i+2] = processed[2];
                    this.pixelsOut[i+3] = options.opacity * processed[3];
                }
            }

            this.putImageData();

            return this;
        },

        /**
         * --------------------------------------------------------------------------------
         *            EFFECTS
         * --------------------------------------------------------------------------------
         */

        /**
         * Convert pixels to a pure gray value
         *
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        grayscale: function(options) {
            return this.process(function(r, g, b, a) {
                var grayscale = r * 0.3 + g * 0.59 + b * 0.11;
                return [
                    grayscale,
                    grayscale,
                    grayscale,
                    a
                ];
            }, options);
        },

        /**
         * Convert pixels to sepia color
         *
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        sepia: function(options) {
            return this.process(function(r, g, b, a) {
                return [
                    (r * 0.393)+(g * 0.769)+(b * 0.189),
                    (r * 0.349)+(g * 0.686)+(b * 0.168),
                    (r * 0.272)+(g * 0.534)+(b * 0.131),
                    a
                ];
            }, options);
        },

        /**
         * Invert r, g and by by subtracting original values from 255
         *
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        invert: function(options) {
             return this.process(function(r, g, b, a) {
                return [
                    255 - r,
                    255 - g,
                    255 - b,
                    a
                ];
            }, options);
        },

        /**
         * Find edges
         *
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        edges: function(options) {
            var tc = this;
            var rowShift = tc.w*4;
            return tc.process(function(r, g, b, a, x, y, i) {
                r = 127 + 2*r - tc.pixels[i + 4] - tc.pixels[i   + rowShift];
                g = 127 + 2*g - tc.pixels[i + 5] - tc.pixels[i+1 + rowShift];
                b = 127 + 2*b - tc.pixels[i + 6] - tc.pixels[i+2 + rowShift];

                return [r, g, b, a];
            }, options);
        },

        /**
         * Add randomized noise
         *
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        noise: function(options) {
            options = $.extend({}, {
                amount: 10,
            }, options);
            return this.process(function(r, g, b, a) {
                return [
                    r + (0.5 - Math.random()) * options.amount,
                    g + (0.5 - Math.random()) * options.amount,
                    b + (0.5 - Math.random()) * options.amount,
                    a
                ];
            }, options);
        },

        /**
         * [pixelate description]
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        pixelate: function(options) {
            var tc = this;

            options = $.extend({}, {
                blockSize: 100,
            }, options);

            blockSize = options.blockSize;
            blockSize = 1/blockSize;

            var w = tc.w * blockSize,
                h = tc.h * blockSize;

            tc.context.mozImageSmoothingEnabled = false;
            tc.context.webkitImageSmoothingEnabled = false;
            tc.context.imageSmoothingEnabled = false;

            tc.context.drawImage(tc.canvas, 0, 0, w, h);

            // TODO cannot draw from canvas?
            tc.context.drawImage(tc.canvas, 0, 0, w, h, 0, 0, this.w, this.h);

            tc.imgdIn   = tc.context.getImageData(0, 0, tc.w, tc.h); // get data from 2D context
            tc.pixelsIn = tc.imgdIn.data;
            tc.nrPixels = tc.pixelsIn.length;

            // make sure other effect get the updated data
            tc.imgdOut   = tc.context.getImageData(0, 0, tc.w, tc.h);
            tc.pixelsOut = tc.imgdOut.data;

            tc.putImageData();

            return tc;
        },

        /**
        * --------------------------------------------------------------------------------
        *           CONVULUTION FILTERS
        * --------------------------------------------------------------------------------
        */

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        blur: function(options) {
            return this.convolutionFilter([
                [0.1, 0.1, 0.1],
                [0.1, 0.2, 0.1],
                [0.1, 0.1, 0.1]
            ], options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        boxBlur: function(options) {
            options = $.extend({}, {
                radius: 3
            }, options);

            var radius = options.radius;
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

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        gaussianBlur: function(options) {
            options = $.extend({}, {
                radius: 3
            }, options);

            var radius = options.radius;
            var size = 2*radius+1;
            var sigma = radius/2;
            var sum = 0.0; // For accumulating the filter values
            var filter = [];
            for (var x = 0; x < size; ++x) {
                var row = [];
                for (var y = 0; y < size; ++y) {
                    var col = this.gaussian(x, radius, sigma) * this.gaussian(y, radius, sigma);
                    row.push(col);
                    sum += col;
                }
                filter.push(row);
            }

            // Normalize the filter
            for (var x2 = 0; x2 < size; ++x2) {
                for (var y2 = 0; y2 < size; ++y2) {
                    filter[x2][y2] /= sum;
                }
            }

            options = $.extend({}, {
                filter: filter
            }, options);

            return this.convolutionFilter(options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        sharpen: function(options) {
            return this.convolutionFilter($.extend({}, {
                filter: [
                    [ 0, -1,  0],
                    [-1,  5, -1],
                    [ 0, -1,  0]
                ]
            }, options));
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        emboss: function(options) {
            options = $.extend({}, {
                offset: 127
            }, options);

            return this.convolutionFilter($.extend({}, {
                filter: [
                    [2,  0,  0],
                    [0, -1,  0],
                    [0,  0, -1]
                ]
            }, options));
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        laplace: function(options) {
            return this.convolutionFilter($.extend({}, {
                filter: [
                    [0,  1, 0],
                    [1, -4, 1],
                    [0,  1, 0]
                ]
            }, options));
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        sobel: function(options) {
            this.sobelVertical(options);
            this.putImageData();
            return this.sobelHorizontal(options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        sobelVertical: function(options) {
            return this.convolutionFilter($.extend({}, {
                filter: [
                    [-1, 0, 1],
                    [-2, 0, 2],
                    [-1, 0, 1]
                ]
            }, options));
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        sobelHorizontal: function(options) {
            return this.convolutionFilter($.extend({}, {
                filter: [
                    [-1, -2, -1],
                    [ 0,  0,  0],
                    [ 1,  2,  1]
                ]
            }, options));
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        convolutionFilter: function(options) {
            options = $.extend({}, {
                updateR: true,
                updateG: true,
                updateB: true,
                offset: 0,
                filter: [1]
            }, options);

            var filter = options.filter;

            var tc = this;

            var rows = filter.length;    // odd
            var cols = filter[0].length; // odd

            var rm = Math.floor(rows/2); // center of row (current pixel)
            var cm = Math.floor(cols/2); // center of column (current pixel)

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
            }, options);
        },

        /**
        * --------------------------------------------------------------------------------
        *            OVERLAYS
        * --------------------------------------------------------------------------------
        */

        /**
         * Add a vignette
         *
         * @param  {obj}    options
         * @return {obj}    this
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

            return this;
        },


        /**
         * --------------------------------------------------------------------------------
         *            ADJUSTMENTS
         * --------------------------------------------------------------------------------
         */

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        threshold: function(options) {
            options = $.extend({}, {
                threshold: 127,
            }, options);

            return this.process(function(r, g, b, a) {
                var v = (0.2126*r + 0.7152*g + 0.0722*b >= options.threshold) ? 255 : 0;
                return [
                    v,
                    v,
                    v,
                    a
                ];
            }, options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        hue: function(options) {
            return this.hslUpdate("h", options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        saturation: function(options) {
            return this.hslUpdate("s", options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        brightness: function(options) {
            return this.lightness(options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        lightness: function(options) {
            return this.hslUpdate("l", options);
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

            var max = axis === "h" ? 360 : 100;

            return this.process(function(r, g, b, a) {
                var hsl = tc.rgb2hsl(r, g, b);

                if(options.colorize) {
                    // colorize means, set the value to exaclty the value
                    hsl[axis] = Math.min(Math.max(options.value/max, 0), 1);
                } else {
                    // add the value to the current value
                    if(axis === "h") {
                        hsl[axis] = (hsl[axis]*max + options.value) % max;
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
            }, options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        contrast: function(options) {
            options = $.extend({}, {
                value: 10,
            }, options);

            var level = Math.pow((options.value + 100) / 100, 2);
            return this.process(function(r, g, b, a) {
                return [
                    ((r / 255 - 0.5) * level + 0.5) * 255,
                    ((g / 255 - 0.5) * level + 0.5) * 255,
                    ((b / 255 - 0.5) * level + 0.5) * 255,
                    a
                ];
            }, options);
        },

        /**
         * @param  {obj}    options
         * @return {array} r, g, b, a
         */
        gamma: function(options) {
            options = $.extend({}, {
                value: 1.5,
            }, options);

            return this.process(function(r, g, b, a) {
                return [
                    r * options.value,
                    g * options.value,
                    b * options.value,
                    a
                ];
            }, options);
        },


        /**
         * --------------------------------------------------------------------------------
         *            HELPERS
         * --------------------------------------------------------------------------------
         */

        /**
         * Convert an RGB tuplet to HSL
         * @param  {int}  r  Red component   [0-255]
         * @param  {int}  g  Green component [0-255]
         * @param  {int}  b  Blue component  [0-255]
         * @return {obj}     HSL (object {h, s, l})
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

        /**
         * Convert an HSL tuplet to RGB
         * @param  {int}  h  Hue component          [0-1]
         * @param  {int}  s  Saturation component   [0-1]
         * @param  {int}  l  Lightness component    [0-1]
         * @return {obj}     RGB (object {r, g, b})
         */
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

        /**
         * Convert a hue to an RGB component
         * @param  {int}    p
         * @param  {int}    q
         * @param  {int}    t
         * @return {int}    p
         */
        hue2rgb: function(p, q, t) {
            if (t < 0) { t += 1; }
            if (t > 1) { t -= 1; }
            if (t < 1 / 6) { return p + (q - p) * 6 * t; }
            if (t < 1 / 2) { return q; }
            if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
            return p;
        },

        /**
         * 1D Gaussian function
         * @param  {float} x
         * @param  {float} mu
         * @param  {float} sigma
         * @return {float} gaussian
         */
        gaussian: function(x, mu, sigma) {
            return Math.exp( -(((x-mu)/(sigma))*((x-mu)/(sigma)))/2.0 );
        },
    });

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[ pluginName ] = function ( options ) {
        var plugin;
        var canvas2DSupported = !!window.CanvasRenderingContext2D;
        if(!canvas2DSupported) {
            return false;
        }

        this.each(function() {
            plugin = $.data(this, "plugin_" + pluginName);
            if (!plugin) {
                plugin = new Plugin(this, options);
                $.data(this, "plugin_" + pluginName, plugin);
            }
        });
        return plugin;
    };

})( jQuery, window, document );

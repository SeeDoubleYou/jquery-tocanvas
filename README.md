# jQuery toCanvas
This plugin allow you to add effects to images and html5 videotags easily. It supports different types of processed effects and overlay

[Check out a demo here](http://www.seedoubleyou.nl/demos/tocanvas)

> documentention is a work in progress

# Global





* * *

### render() 

Render all effects, overlays, filters, etc.Called automatically by the plugin, but you can use this for custom functionality

**Returns**: `obj`, this


### draw() 

Draw the contents of this.element to canvas en reset internal pixel dataCalled by the plugin#render method, but you can use this for custom functionality

**Returns**: `obj`, this


### putImageData() 

draw the current pixel-data to the canvas and read the new pixel information from resultCalled by the process#processcallback method, but you can use this for custom functionality

**Returns**: `obj`, this


### process(callback) 

Process a callback for each pixel.We loop over all pixels and call the callback for each.This function is used by all processed effects

**Parameters**

**callback**: `function`, The callback must return an array [r, g, b, a]

**Returns**: `obj`, this


### grayscale(options) 

Convert pixels to a pure gray value

**Parameters**

**options**: `obj`, Convert pixels to a pure gray value

**Returns**: `array`, r, g, b, a


### sepia(options) 

Convert pixels to sepia color

**Parameters**

**options**: `obj`, Convert pixels to sepia color

**Returns**: `array`, r, g, b, a


### invert(options) 

Invert r, g and by by subtracting original values from 255

**Parameters**

**options**: `obj`, Invert r, g and by by subtracting original values from 255

**Returns**: `array`, r, g, b, a


### edges(options) 

Find edges

**Parameters**

**options**: `obj`, Find edges

**Returns**: `array`, r, g, b, a


### noise(options) 

Add randomized noise

**Parameters**

**options**: `obj`, Add randomized noise

**Returns**: `array`, r, g, b, a


### pixelate(options) 

[pixelate description]

**Parameters**

**options**: `obj`, [pixelate description]

**Returns**: `array`, r, g, b, a


### blur(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### boxBlur(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### gaussianBlur(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### sharpen(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### emboss(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### laplace(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### sobel(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### sobelVertical(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### sobelHorizontal(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### convolutionFilter(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### vignette(options) 

Add a vignette

**Parameters**

**options**: `obj`, Add a vignette

**Returns**: `obj`, this


### threshold(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### hue(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### saturation(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### brightness(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### lightness(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### contrast(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### gamma(options) 

**Parameters**

**options**: `obj`

**Returns**: `array`, r, g, b, a


### rgb2hsl(r, g, b) 

Convert an RGB tuplet to HSL

**Parameters**

**r**: `int`, Red component   [0-255]

**g**: `int`, Green component [0-255]

**b**: `int`, Blue component  [0-255]

**Returns**: `obj`, HSL (object {h, s, l})


### hsl2rgb(h, s, l) 

Convert an HSL tuplet to RGB

**Parameters**

**h**: `int`, Hue component          [0-1]

**s**: `int`, Saturation component   [0-1]

**l**: `int`, Lightness component    [0-1]

**Returns**: `obj`, RGB (object {r, g, b})


### hue2rgb(p, q, t) 

Convert a hue to an RGB component

**Parameters**

**p**: `int`, Convert a hue to an RGB component

**q**: `int`, Convert a hue to an RGB component

**t**: `int`, Convert a hue to an RGB component

**Returns**: `int`, p


### gaussian(x, mu, sigma) 

1D Gaussian function

**Parameters**

**x**: `float`, 1D Gaussian function

**mu**: `float`, 1D Gaussian function

**sigma**: `float`, 1D Gaussian function

**Returns**: `float`, gaussian



* * *











/**
 * brickify v.0.0.1
 * jQuery plugin for applying a Lego® mosaic filter to an image.
 * 
 * Created by Joe Stanco (https://github.com/joestanco)
 * Project inspired by Harry Heaton's Lego® album covers (http://legoalbums.tumblr.com)
 * Lego® brick design inspired by Ronald Hagenstein (https://www.behance.net/gallery/Legolize-yourself-free-PSD/14068465)
 *
 * Library dependencies: jQuery, EaselJS, Pixastic, ImageProcesor
 *
 */

;(function ( $, window, document, undefined ) {

	var pluginName = "brickify",
		defaults = {
			originalBricksize: 73,
			ratio: 1/40,
			thresholds: [
				{
					maxImageWidth: 300,
					minBrickSize: 7,
					maxBrickSize: 15
				},
				{
					maxImageWidth: 1200,
					minBrickSize: 15,
					maxBrickSize: 26
				},
				{
					maxImageWidth: 1600,
					maxBrickSize: 36
				}
			]
		},

		/***************************************************************
		 * PRIVATE METHODS
		 ***************************************************************/

		/**
		 * Returns the size of bricks in the mosaic grid based on original image size
		 * and thresholds specified in the settings object
		 *
		 * @return {number}
		 */
		_getGridSize = function() {

			var threshold,
				self = this,
				hasThresholdMatch = false,
				imageWidth = self.element.width,
				thresholds = self.thresholds,
				gridSize = parseInt(imageWidth * self.ratio, 10);

			$(thresholds).each(function() {
				if (!hasThresholdMatch && imageWidth <= this.maxImageWidth) {
					hasThresholdMatch = true;
					threshold = this;
				}
			});

			if (!hasThresholdMatch) threshold = thresholds[thresholds.length-1];

			if (typeof threshold.maxBrickSize !== "undefined" && gridSize > threshold.maxBrickSize) {
				gridSize = threshold.maxBrickSize;
			} else if (typeof threshold.minBrickSize !== "undefined" && gridSize < threshold.minBrickSize) {
				gridSize = threshold.minBrickSize;
			}

			return gridSize;

		},

		/**
		 * Converts a shape to a data URL
		 *
		 * @param {object} shape - EaselJS shape object
		 * @return {string}
		 */
		_getShapeDataURL = function(shape) {
			var self = this,
				scratchCanvas = self.imgProc.scratchCanvas;
			scratchCanvas.removeAllChildren();
			scratchCanvas.addChild(shape);
			scratchCanvas.update();
			return scratchCanvas.toDataURL();
		},

		/**
		 * Scale a numeric value based on brick ratio
		 *
		 * @param {number} value - Integer to be scaled
		 * @return {number}
		 */
		_getScaledValue = function(value) {

			var self = this,
				newVal = value * self.brickRatio;

			// Round up if we are doing extreme scaling (for small images only)
			return (self.stageWidth <= self.thresholds[0].maxImageWidth) ? Math.round(newVal) : newVal;

		},

		/**
		 * Wrapper for beginLinearGradientFill() from EaselJS
		 *
		 * @param {object} shape - Shape to manipulate
		 * @param {array} colors - Gradient colors
		 * @param {array} ratios - Gradient positions corresponding to colors
		 * @param {array} positions - Gradient positions
		 */
		_beginLinearGradientFill = function(shape, colors, ratios, positions) {

			var self = this,
				newPositions = [];

			$(positions).each(function(i, pos) {
				newPositions.push(_getScaledValue.call(self, pos));
			});
			shape.graphics.beginLinearGradientFill(colors, ratios, newPositions[0], newPositions[1], newPositions[2], newPositions[3]);

		},

		/**
		 * Wrapper for moveTo() from EaselJS
		 *
		 * @param {object} shape - Shape to manipulate
		 * @param {number} x - Horizontal position
		 * @param {number} y - Vertical position
		 */
		_moveTo = function(shape, x, y) {
			shape.graphics.moveTo(_getScaledValue.call(this, x), _getScaledValue.call(this, y));
		},

		/**
		 * Wrapper for lineTo() from EaselJS
		 *
		 * @param {object} shape - Shape to manipulate
		 * @param {number} x - Horizontal position
		 * @param {number} y - Vertical position
		 */
		_lineTo = function(shape, x, y) {
			shape.graphics.lineTo(_getScaledValue.call(this, x),  _getScaledValue.call(this, y));
		},

		/**
		 * Wrapper for bezierCurveTo() from EaselJS
		 *
		 * @param {object} shape - Shape to manipulate
		 * @param {array} positions - Curve positions
		 */
		_bezierCurveTo = function(shape, positions) {

			var newPositions = [],
				self = this;

			$(positions).each(function(i, pos) {
				newPositions.push(_getScaledValue.call(self, pos));
			});

			shape.graphics.bezierCurveTo(newPositions[0], newPositions[1], newPositions[2], newPositions[3], newPositions[4], newPositions[5]);

		},

		/**
		 * Wrapper for arc() from EaselJS
		 *
		 * @param {object} shape - Shape to manipulate
		 * @param {number} x - Horizontal position
		 * @param {number} y - Vertical position
		 * @param {number} radius - Radius
		 * @param {number} startAngle - Measured in radians
		 * @param {number} endAngle - Measured in radians
		 */
		_arc = function(shape, x, y, radius, startAngle, endAngle) {

			var newX = _getScaledValue.call(this, x),
				newY = _getScaledValue.call(this, y),
				newRadius = _getScaledValue.call(this, radius);

			shape.graphics.arc(newX, newY, newRadius, startAngle, endAngle);

		},

		/**
		 * Returns the data URL for a shape designed to represent 
		 * the shaded areas of a Lego brick
		 *
		 * @return {string}
		 */
		_getShadowDataURL = function() {

			var self = this,
				shadow = self.imgProc.getShape();

			_beginLinearGradientFill.call(self, shadow, ["#b3b3b3", "#f3f3f3"], [0, 0.45314492984693877], [36, 64, 36, 6]);
			_moveTo.call(self, shadow, 65,35);
			_bezierCurveTo.call(self, shadow, [65,51,52,64,36,64]);
			_bezierCurveTo.call(self, shadow, [20,64,7,51,7,35]);
			_bezierCurveTo.call(self, shadow, [7,19,20,7,36,7]);
			_bezierCurveTo.call(self, shadow, [52,7,65,19,65,35]);

			_beginLinearGradientFill.call(self, shadow, ["#b3b3b3", "#f1f1f1"], [0, 0.45314492984693877], [34, 59, 34, 12]);
			_moveTo.call(self, shadow, 60,35);
			_bezierCurveTo.call(self, shadow, [60,48,48,59,34,59]);
			_bezierCurveTo.call(self, shadow, [19,59,7,48,7,35]);
			_bezierCurveTo.call(self, shadow, [7,22,19,12,34,12]);
			_bezierCurveTo.call(self, shadow, [48,12,60,22,60,35]);

			_beginLinearGradientFill.call(self, shadow, ["#b3b3b3", "#f1f1f1"], [0, 0.45314492984693877], [38, 59, 38, 12]);
			_moveTo.call(self, shadow, 65,35);
			_bezierCurveTo.call(self, shadow, [65,48,53,59,38,59]);
			_bezierCurveTo.call(self, shadow, [24,59,12,48,12,35]);
			_bezierCurveTo.call(self, shadow, [12,22,24,12,38,12]);
			_bezierCurveTo.call(self, shadow, [53,12,65,22,65,35]);

			shadow.graphics.beginFill("#ffffff");
			_arc.call(self, shadow, 36,33,25.5,0,2*Math.PI);
			
			_beginLinearGradientFill.call(self, shadow, ["#f8f8f8", "#afafaf"], [0, 1], [36, 57, 36, 11]);
			_moveTo.call(self, shadow, 59,33);
			_bezierCurveTo.call(self, shadow, [59,46,49,56,36,56]);
			_bezierCurveTo.call(self, shadow, [23,56,13,46,13,33]);
			_bezierCurveTo.call(self, shadow, [13,20,23,9,36,9]);
			_bezierCurveTo.call(self, shadow, [49,9,59,20,59,33]);
			
			_beginLinearGradientFill.call(self, shadow, ["#ffffff", "#f1f1f1"], [0, 1], [36, 57, 36, 11]);
			_moveTo.call(self, shadow, 59,34);
			_bezierCurveTo.call(self, shadow, [59,47,49,57,36,57]);
			_bezierCurveTo.call(self, shadow, [23,57,13,47,13,34]);
			_bezierCurveTo.call(self, shadow, [13,21,23,11,36,11]);
			_bezierCurveTo.call(self, shadow, [49,11,59,21,59,34]);

			shadow.compositeOperation = "source-over";
			return _getShapeDataURL.call(self, shadow);

		},

		/**
		 * Returns the data URL for a shape designed to represent 
		 * the highlighted areas of a Lego brick
		 *
		 * @return {string}
		 */
		_getHighlightDataURL = function() {

			var self = this,
				highlight = self.imgProc.getShape();

			_beginLinearGradientFill.call(self, highlight, ["#333333", "#242424"], [0, 1], [35,8,35,57]);
			_moveTo.call(self, highlight, 44,55);
			_bezierCurveTo.call(self, highlight, [42,56,39,56,36,56]);
			_bezierCurveTo.call(self, highlight, [33,56,30,56,28,55]);
			_bezierCurveTo.call(self, highlight, [20,53,14,47,12,40]);
			_bezierCurveTo.call(self, highlight, [15,50,24,58,36,58]);
			_bezierCurveTo.call(self, highlight, [46,58,55,52,59,43]);
			_bezierCurveTo.call(self, highlight, [56,49,50,53,44,55]);

			_beginLinearGradientFill.call(self, highlight, ["#525252", "#080808"], [0, .5], [36,8,36,56]);
			_moveTo.call(self, highlight, 28,55);
			_bezierCurveTo.call(self, highlight, [19,52,13,43,13,34]);
			_lineTo.call(self, highlight, 13,33);
			_lineTo.call(self, highlight, 13,33);
			_bezierCurveTo.call(self, highlight, [13,20,23,10,36,10]);
			_bezierCurveTo.call(self, highlight, [49,10,59,20,59,33]);
			_lineTo.call(self, highlight, 59,33);
			_lineTo.call(self, highlight, 59,34);
			_bezierCurveTo.call(self, highlight, [59,43,53,52,44,55]);
			_bezierCurveTo.call(self, highlight, [50,53,56,49,59,43]);
			_bezierCurveTo.call(self, highlight, [60,40,61,37,61,33]);
			_bezierCurveTo.call(self, highlight, [61,19,50,8,36,8]);
			_bezierCurveTo.call(self, highlight, [22,8,11,19,11,33]);
			_bezierCurveTo.call(self, highlight, [11,35,11,38,12,40]);
			_bezierCurveTo.call(self, highlight, [14,47,20,53,28,55]);

			_beginLinearGradientFill.call(self, highlight, ["#080808", "#000000"], [0, 0.3714524872449], [36,56,36,10]);
			_moveTo.call(self, highlight, 59,34);
			_bezierCurveTo.call(self, highlight, [59,46,49,56,36,56]);
			_bezierCurveTo.call(self, highlight, [23,56,13,46,13,34]);
			_bezierCurveTo.call(self, highlight, [13,21,23,11,36,11]);
			_bezierCurveTo.call(self, highlight, [49,11,59,21,59,34]);

			highlight.compositeOperation = "lighter";
			return _getShapeDataURL.call(self, highlight);

		},

		/**
		 * Reports the processing state of the plugin
		 *
		 * @return {boolean}
		 */
		_isProcessing = function() {
			return $("body").data("lego-yourself:processing");
		},

		/**
		 * Sets the processing state of the plugin
		 *
		 * @param {boolean} val - the processing state
		 */
		_setProcessing = function(val) {
			$("body").data("lego-yourself:processing", val);
		},

		/**
		 * Callback for mosaic effect. Draws a background image pattern
		 * in two passes - one for the brick shadow shape and another
		 * for the brock highlight shape. Also draws a grid on the image.
		 *
		 * @param {object} resultCanvas - canvas element to be drawn upon
		 */
		_paintBrickPattern = function(resultCanvas) {

			var self = this,
				operation = "multiply";

			mosaicBitmap = self.imgProc.getBitmap(resultCanvas);
			self.imgProc.stage.addChild(mosaicBitmap);
			self.imgProc.stage.update();

			self.imgProc.$scratchImageEl.on("load", function() {

				var fillPattern = self.imgProc.stageContext.createPattern(this, "repeat");
				self.imgProc.stageContext.globalCompositeOperation = operation;
				self.imgProc.stageContext.fillStyle = fillPattern;
				self.imgProc.stageContext.fillRect(0, 0, self.stageWidth, self.stageHeight);

				if (operation === "multiply") {

					self.imgProc.scratchContext.globalCompositeOperation = 'multiply';
					self.imgProc.scratchCanvas.addChild(new createjs.Bitmap(this));
					self.imgProc.buildGrid(self.imgProc.stage.canvas, self.gridSize, "#c0c0c0", 0.5);
					operation = "lighter";
					self.imgProc.$scratchImageEl.attr("src", _getHighlightDataURL.call(self));

				} else if (operation == "lighter") {

					self.imgProc.$scratchImageEl.off("load");
					self.imgProc.$scratchImageEl.attr("src", self.imgProc.stage.toDataURL());
					self.imgProc.moveOnscreen(self.imgProc.$scratchImageEl);
					self.imgProc.destroy();
					_setProcessing(false);
					self.$element.trigger("image:brickified");
				}

			});

			self.imgProc.$scratchImageEl.attr("src", _getShadowDataURL.call(self));

		},

		/**
		 * Set image element to broken image icon when there's an image error
		 */
		_onImageError = function() {
			this.element.width = 34;
			this.element.height = 34;
			this.element.src = "data:image/gif;base64,R0lGODlhIQAiAMT/AJkQZ/9rzYplzrqZ/3Zmm9vN/zplZgD9myWaZfT/zPHPmcCcZf///83Nzby8vKysrJqamomJiXh4eFRUVAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAIQAiAAAF/yAjjmRpnqakrmzrrigjxfSoonNNS01e5o6gcEgkznopURGyKg5zSBLwKUEgBhSK0+GLiqbByCxhkBi0Th/DC+YiFoqq4Zwucb9KoTzyOMzRRFmCgngMTwNmc2eARBOOjxSFQxAUBgh/FBMRWxGdnZEyeUJZi1kTEltCIqBtYYKPm6kOq5JFYrCyQQyatUtinS8SWiKOEZKoWxB3BcwCBQKZu50Px4xFEszPzwQjvDZKM9ZPzc8CxMVS4Ktb2M7m59PphjMBDOJczeea1D/qAfXifMDicwIIvQAA7OkqUYxgCVb+EALUB4ufCYjzGEiUuEuTpwcWLx5jAKAkCW80ZjvZO4ZwQkdYOlRidDBI2rSQJxbOdPBImg5DqlaGAqoSXQ0itIZ284jzp1A1xZo6FTook0MaVbNO3ToiBAA7";
		},

		/**
		 * Reset processing state when an effect error occurs
		 */
		_onEffectError = function() {
			_setProcessing(false);
		},

		/**
		 * Apply effects and then paint image patterns for the bricks
		 */
		_process = function() {
			var self = this;
			self.imgProc.applyEffect("removenoise", self.$element, function(resultCanvas) {
				setTimeout(function(){ self.imgProc.applyEffect("mosaic", resultCanvas, _paintBrickPattern.bind(self))}, 100 );
			});
		};

	function Plugin ( element, options ) {
		this.element = element;
		this.$element = $(element);
		this.settings = $.extend( {}, defaults, options );
		this._defaults = defaults;
		this._name = pluginName;
		this.init();
	}

	Plugin.prototype = {

		init: function () {

			var self = this;

			// Wait for current image to be processed before starting a new one
			if (_isProcessing()) {
				setTimeout(function() {
					self.init();
				}, 1000);
				return;
			}

			// Store settings
			_setProcessing(true);
			self.originalBricksize = self.settings.originalBricksize;
			self.ratio = self.settings.ratio;
			self.thresholds = self.settings.thresholds;
			self.gridSize = _getGridSize.call(this);
			self.brickRatio = self.gridSize/self.originalBricksize;
			self.stageWidth = self.element.width - (self.element.width % self.gridSize);
			self.stageHeight = self.element.height - (self.element.height % self.gridSize);

			// Instantiate the image processor plugin
			self.$element.imageProcessor({
				canvasAPI: self.settings.canvasAPI,
				effectsAPI: self.settings.effectsAPI,
				effects: {
					mosaic: {
						options: {
							blockSize: self.gridSize
						}
					},
					removenoise: {}
				},
				stageWidth: self.stageWidth,
				stageHeight: self.stageHeight,
				scratchCanvasWidth: self.gridSize,
				scratchCanvasHeight: self.gridSize,
				scratchImageWidth: self.gridSize,
				scratchImageHeight: self.gridSize,
				onLoad: _process.bind(self),
				onLoadError: _onImageError.bind(self),
				onEffectError: _onEffectError.bind(self)
			});

			// Assign an alias for the image processor plugin
			self.imgProc = self.$element.data("plugin_imageProcessor");

		}
	};

	$.fn[ pluginName ] = function ( options ) {
		this.each(function() {
			if ( !$.data( this, "plugin_" + pluginName ) ) {
				$.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
			}
		});
		return this;
	};

})( jQuery, window, document );
/*
 * WebAudioLoader
 * Visit http://createjs.com/ for documentation, updates and examples.
 *
 *
 * Copyright (c) 2012 gskinner.com, inc.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @module SoundJS
 */

// namespace:
this.createjs = this.createjs || {};

(function () {
	"use strict";

	function Loader(src) {
		var loaditem = createjs.LoadItem.create(src);
		this.XHRRequest_constructor(loaditem, true, createjs.DataTypes.SOUND);

		this._request.responseType = "arraybuffer";
	};
	var p = createjs.extend(Loader, createjs.XHRRequest);

	// web audio context required for decoding audio
	Loader.context = null;


// public methods
	p.toString = function () {
		return "[WebAudioLoader]";
	};


// private methods
	p._handleLoad = function (event) {
		// OJR we leave this wrapped in Loader because we need to reference src and the handler only receives a single argument, the decodedAudio
		Loader.context.decodeAudioData(this._request.response,
	         createjs.proxy(this._handleAudioDecoded, this),
	         createjs.proxy(this._handleError, this));
	};


	/**
	* The audio has been decoded.
	* #method handleAudioDecoded
	* @protected
	*/
	p._handleAudioDecoded = function (decodedAudio) {
		this._response = decodedAudio;
		this.XHRRequest__handleLoad();
	};

	createjs.WebAudioLoader = createjs.promote(Loader, "XHRRequest");
}());

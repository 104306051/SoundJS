/*
 * AbstractPlugin
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

// namespace:
this.createjs = this.createjs || {};

(function () {
	"use strict";


// constructor:
 	/**
	 * A default plugin class used as a base for all other plugins.
	 * @class AbstractPlugin
	 * @constructor
	 * @since 0.5.3
	 */

	var AbstractPlugin = function () {
	// private properties:
		/**
		 * The capabilities of the plugin.
		 * method and is used internally.
		 * @property _capabilities
		 * @type {Object}
		 * @default null
		 * @protected
		 * @static
		 */
		this._capabilities = null;

		/**
		 * Object hash indexed by the source URI of each file to indicate if an audio source has begun loading,
		 * is currently loading, or has completed loading.  Can be used to store non boolean data after loading
		 * is complete (for example arrayBuffers for web audio).
		 * @property _audioSources
		 * @type {Object}
		 * @protected
		 */
		this._audioSources = {};

		/**
		 * Object hash indexed by the source URI of all created SoundInstances, update the playbackResource if it loads after they are created,
		 * and properly destroy them if sources are removed
		 * @type {Object}
		 * @protected
		 */
		this._soundInstances = {};

		/**
		 * The internal master volume value of the plugin.
		 * @property _volume
		 * @type {Number}
		 * @default 1
		 * @protected
		 */
		this._volume = 1;

		/**
		 * A reference to a loader class used by a plugin that must be set.
		 * @type {Object}
		 * @protected
		 */
		this._loader;

		/**
		 * A reference to a SoundInstance class used by a plugin that must be set.
		 * @type {Object}
		 * @protected;
		 */
		this._soundInstance;
	};
	var p = AbstractPlugin.prototype;


// Static Properties:
// NOTE THESE PROPERTIES NEED TO BE ADDED TO EACH PLUGIN
	/**
	 * The capabilities of the plugin. This is generated via the {{#crossLink "WebAudioPlugin/_generateCapabilities:method"}}{{/crossLink}}
	 * method and is used internally.
	 * @property _capabilities
	 * @type {Object}
	 * @default null
	 * @protected
	 * @static
	 */
	AbstractPlugin._capabilities = null;

	/**
	 * Determine if the plugin can be used in the current browser/OS.
	 * @method isSupported
	 * @return {Boolean} If the plugin can be initialized.
	 * @static
	 */
	AbstractPlugin.isSupported = function () {
		return true;
	};


// public methods:
	/**
	 * Pre-register a sound for preloading and setup. This is called by {{#crossLink "Sound"}}{{/crossLink}}.
	 * Note all plugins provide a <code>Loader</code> instance, which <a href="http://preloadjs.com" target="_blank">PreloadJS</a>
	 * can use to assist with preloading.
	 * @method register
	 * @param {String} src The source of the audio
	 * @param {Number} instances The number of concurrently playing instances to allow for the channel at any time.
	 * Note that not every plugin will manage this value.
	 * @return {Object} A result object, containing a "tag" for preloading purposes.
	 */
	p.register = function (src, instances) {
		this._audioSources[src] = true;
		if (!this._loader) {return;}
		var loader = {tag: new this._loader(src, this)};
		return loader;
	};

	/**
	 * Checks if preloading has started for a specific source. If the source is found, we can assume it is loading,
	 * or has already finished loading.
	 * @method isPreloadStarted
	 * @param {String} src The sound URI to check.
	 * @return {Boolean}
	 */
	p.isPreloadStarted = function (src) {
		return (this._audioSources[src] != null);
	};

	/**
	 * Checks if preloading has finished for a specific source.
	 * @method isPreloadComplete
	 * @param {String} src The sound URI to load.
	 * @return {Boolean}
	 */
	p.isPreloadComplete = function (src) {
		return (!(this._audioSources[src] == null || this._audioSources[src] == true));
	};

	/**
	 * Remove a sound added using {{#crossLink "WebAudioPlugin/register"}}{{/crossLink}}. Note this does not cancel a preload.
	 * @method removeSound
	 * @param {String} src The sound URI to unload.
	 */
	p.removeSound = function (src) {
		delete(this._audioSources[src]);
		for (var i = this._soundInstances[src].length; i--; ) {
			var item = this._soundInstances[src][i];
			item.destroy();
		}
		delete(this._soundInstances[src]);
	};

	/**
	 * Remove all sounds added using {{#crossLink "WebAudioPlugin/register"}}{{/crossLink}}. Note this does not cancel a preload.
	 * @method removeAllSounds
	 * @param {String} src The sound URI to unload.
	 */
	p.removeAllSounds = function () {
		for(var key in this._audioSources) {
			this.removeSound(key);
		}
	};

	/**
	 * Internally preload a sound.
	 * @method preload
	 * @param {String} src The sound URI to load.
	 */
	p.preload = function (src) {
		this._audioSources[src] = true;
		this._soundInstances[src] = [];
		if (!this._loader) {return;}
		var loader = new this._loader(src, this);
		loader.onload = this._handlePreloadComplete;
		loader.load();
	};

	/**
	 * Create a sound instance. If the sound has not been preloaded, it is internally preloaded here.
	 * @method create
	 * @param {String} src The sound source to use.
	 * @param {Number} startTime Audio sprite property used to apply an offset, in milliseconds.
	 * @param {Number} duration Audio sprite property used to set the time the clip plays for, in milliseconds.
	 * @return {SoundInstance} A sound instance for playback and control.
	 */
	p.create = function (src, startTime, duration) {
		if (!this.isPreloadStarted(src)) {this.preload(src);}
		var si = new this._soundInstance(src, startTime, duration, this._audioSources[src]);
		this._soundInstances[src].push(si);
		return si;
	};

	// TODO Volume Getter / Setter
	/**
	 * Set the master volume of the plugin, which affects all SoundInstances.
	 * @method setVolume
	 * @param {Number} value The volume to set, between 0 and 1.
	 * @return {Boolean} If the plugin processes the setVolume call (true). The Sound class will affect all the
	 * instances manually otherwise.
	 */
	p.setVolume = function (value) {
		this._volume = value;
		this._updateVolume();
		return true;
	};

	/**
	 * Get the master volume of the plugin, which affects all SoundInstances.
	 * @method getVolume
	 * @return The volume level, between 0 and 1.
	 */
	p.getVolume = function () {
		return this._volume;
	};

	// TODO Mute Getter / Setter
	/**
	 * Mute all sounds via the plugin.
	 * @method setMute
	 * @param {Boolean} value If all sound should be muted or not. Note that plugin-level muting just looks up
	 * the mute value of Sound {{#crossLink "Sound/getMute"}}{{/crossLink}}, so this property is not used here.
	 * @return {Boolean} If the mute call succeeds.
	 */
	p.setMute = function (value) {
		this._updateVolume();
		return true;
	};

	p.toString = function () {
		return "[AbstractPlugin]";
	};


// private methods:
	/**
	 * Handles internal preload completion.
	 * @method _handlePreloadComplete
	 * @protected
	 */
	p._handlePreloadComplete = function (loader) {
		// plugin should override this method, set _audioSources, then call super method
		var scr = loader.src;
		createjs.Sound._sendFileLoadEvent(src);	// OJR is this worth changing to events?
		for (var i = 0, l = this._soundInstances[src].length; i < l; i++) {
			var item = this._soundInstances[src][i];
			item.setPlaybackResource(this._audioSources[src]);
		}
		loader.destroy();
	};

	/**
	 * Set the gain value for master audio. Should not be called externally.
	 * @method _updateVolume
	 * @protected
	 */
	p._updateVolume = function () {
		// Plugin Specific code
	};

	createjs.AbstractPlugin = AbstractPlugin;
}());

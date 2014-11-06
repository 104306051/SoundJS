/*
 * AbstractSoundInstance
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

/**
 * A SoundInstance is created when any calls to the Sound API method {{#crossLink "Sound/play"}}{{/crossLink}} or
 * {{#crossLink "Sound/createInstance"}}{{/crossLink}} are made. The SoundInstance is returned by the active plugin
 * for control by the user.
 *
 * <h4>Example</h4>
 *      var myInstance = createjs.Sound.play("myAssetPath/mySrcFile.mp3");
 *
 * A number of additional parameters provide a quick way to determine how a sound is played. Please see the Sound
 * API method {{#crossLink "Sound/play"}}{{/crossLink}} for a list of arguments.
 *
 * Once a SoundInstance is created, a reference can be stored that can be used to control the audio directly through
 * the SoundInstance. If the reference is not stored, the SoundInstance will play out its audio (and any loops), and
 * is then de-referenced from the {{#crossLink "Sound"}}{{/crossLink}} class so that it can be cleaned up. If audio
 * playback has completed, a simple call to the {{#crossLink "SoundInstance/play"}}{{/crossLink}} instance method
 * will rebuild the references the Sound class need to control it.
 *
 *      var myInstance = createjs.Sound.play("myAssetPath/mySrcFile.mp3", {loop:2});
 *      myInstance.addEventListener("loop", handleLoop);
 *      function handleLoop(event) {
 *          myInstance.volume = myInstance.volume * 0.5;
 *      }
 *
 * Events are dispatched from the instance to notify when the sound has completed, looped, or when playback fails
 *
 *      var myInstance = createjs.Sound.play("myAssetPath/mySrcFile.mp3");
 *      myInstance.addEventListener("complete", handleComplete);
 *      myInstance.addEventListener("loop", handleLoop);
 *      myInstance.addEventListener("failed", handleFailed);
 *
 *
 * @class SoundInstance
 * @param {String} src The path to and file name of the sound.
 * @param {Number} startTime Audio sprite property used to apply an offset, in milliseconds.
 * @param {Number} duration Audio sprite property used to set the time the clip plays for, in milliseconds.
 * @extends EventDispatcher
 * @constructor
 */

(function () {
	"use strict";


// Constructor:
	var AbstractSoundInstance = function (src, startTime, duration) {
		this.EventDispatcher_constructor();


	// public properties:
		/**
		 * The source of the sound.
		 * @property src
		 * @type {String}
		 * @default null
		 */
		this.src = src;

		/**
		 * The unique ID of the instance. This is set by {{#crossLink "Sound"}}{{/crossLink}}.
		 * @property uniqueId
		 * @type {String} | Number
		 * @default -1
		 */
		this.uniqueId = -1;

		/**
		 * The play state of the sound. Play states are defined as constants on {{#crossLink "Sound"}}{{/crossLink}}.
		 * @property playState
		 * @type {String}
		 * @default null
		 */
		this.playState = null;

		/**
		 * A Timeout created by {{#crossLink "Sound"}}{{/crossLink}} when this SoundInstance is played with a delay.
		 * This allows SoundInstance to remove the delay if stop, pause, or cleanup are called before playback begins.
		 * @property delayTimeoutId
		 * @type {timeoutVariable}
		 * @default null
		 * @protected
		 * @since 0.4.0
		 */
		this.delayTimeoutId = null;
		// TODO consider moving delay into SoundInstance so it can be handled by plugins


	// private properties
		/**
		 * Audio sprite property used to determine the starting offset.
		 * @type {Number}
		 * @default null
		 * @protected
		 */
		this._startTime = startTime || 0;


	// Getter / Setter Properties
		/**
		 * The volume of the sound, between 0 and 1.
		 * <br />Note this uses a getter setter, which is not supported by Firefox versions 3.6 or lower and Opera versions 11.50 or lower,
		 * and Internet Explorer 8 or lower.  Instead use {{#crossLink "SoundInstance/setVolume"}}{{/crossLink}} and {{#crossLink "SoundInstance/getVolume"}}{{/crossLink}}.
		 *
		 * The actual output volume of a sound can be calculated using:
		 * <code>myInstance.volume * createjs.Sound.getVolume();</code>
		 *
		 * @property volume
		 * @type {Number}
		 * @default 1
		 */
		this._volume =  1;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "volume", {
			get: function() {
				return this._volume;
			},
			set: function(value) {
				this._volume = Math.max(0, Math.min(1, value));
				if(this._mute) {return;}
				this._updateVolume();
			}
			});
		}

		/**
		 * The pan of the sound, between -1 (left) and 1 (right). Note that pan is not supported by HTML Audio.
		 *
		 * <br />Note this uses a getter setter, which is not supported by Firefox versions 3.6 or lower, Opera versions 11.50 or lower,
		 * and Internet Explorer 8 or lower.  Instead use {{#crossLink "SoundInstance/setPan"}}{{/crossLink}} and {{#crossLink "SoundInstance/getPan"}}{{/crossLink}}.
		 * <br />Note in WebAudioPlugin this only gives us the "x" value of what is actually 3D audio.
		 *
		 * @property pan
		 * @type {Number}
		 * @default 0
		 */
		this._pan =  0;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "pan", {
				get: function() {
					return this._pan;
				},
				set: function(value) {
					this._pan = Math.max(-1, Math.min(1, value));
					this._updatePan();
				}
			});
		}

		/**
		 * The length of the audio clip, in milliseconds.
		 *
		 * <br />Note this uses a getter setter, which is not supported by Firefox versions 3.6 or lower, Opera versions 11.50 or lower,
		 * and Internet Explorer 8 or lower.  Instead use {{#crossLink "SoundInstance/setDuration"}}{{/crossLink}} and {{#crossLink "SoundInstance/getDuration"}}{{/crossLink}}.
		 *
		 * @property duration
		 * @type {Number}
		 * @default 0
		 * @since 0.5.3
		 */
		this._duration = duration || 0;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "duration", {
				get: function() {
					return this._duration;
				},
				set: function(value) {
					this._duration = value || 0;
					this._updateDuration();
				}
			});
		}

		/**
		 * The position of the playhead in milliseconds. This can be set while a sound is playing, paused, or stopped.
		 *
		 * <br />Note this uses a getter setter, which is not supported by Firefox versions 3.6 or lower, Opera versions 11.50 or lower,
		 * and Internet Explorer 8 or lower.  Instead use {{#crossLink "SoundInstance/setPosition"}}{{/crossLink}} and {{#crossLink "SoundInstance/getPosition"}}{{/crossLink}}.
		 *
		 * @property position
		 * @type {Number}
		 * @default 0
		 * @since 0.5.3
		 */
		this._position = 0;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "position", {
				get: function() {
					if (!this._paused && this.playState == createjs.Sound.PLAY_SUCCEEDED) {
						this._calculateCurrentPosition();	// sets this._position
					}
					return this._position;
				},
				set: function(value) {
					this._position = value || 0;
					this._updatePosition();
				}
			});
		}

		/**
		 * The number of play loops remaining. Negative values will loop infinitely.
		 *
  		 * <br />Note this uses a getter setter, which is not supported by Firefox versions 3.6 or lower, Opera versions 11.50 or lower,
		 * and Internet Explorer 8 or lower.  Instead use {{#crossLink "SoundInstance/setLoop"}}{{/crossLink}} and {{#crossLink "SoundInstance/getLoop"}}{{/crossLink}}.
		 *
		 * @property loop
		 * @type {Number}
		 * @default 0
		 * @public
		 * @since 0.5.3
		 */
		this._loop = 0;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "loop", {
				get: function() {
					return this._loop;
				},
				set: function(value) {
					// remove looping
					if (this._loop != 0 && value == 0) {
						this._removeLooping(value);
					}
					// add looping
					if (this._loop == 0 && value != 0) {
						this._addLooping(value);
					}
					this._loop = value;
				}
			});
		}

		/**
		 * Determines if the audio is currently muted.
		 *
		 * <br />Note this uses a getter setter, which is not supported by Firefox versions 3.6 or lower, Opera versions 11.50 or lower,
		 * and Internet Explorer 8 or lower.  Instead use {{#crossLink "SoundInstance/setMute"}}{{/crossLink}} and {{#crossLink "SoundInstance/getMute"}}{{/crossLink}}.
		 *
		 * @property mute
		 * @type {Boolean}
		 * @default false
		 * @since 0.5.3
		 */
		this._muted = false;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "muted", {
				get: function() {
					return this._muted;
				},
				set: function(value) {
					if (value !== true || value !== false) {return;}
					this._muted = value;
					this._updateVolume();
				}
			});
		}

		/**
		 * Tells you if the audio is currently paused.
		 *
		 * <br />Note this uses a getter setter, which is not supported by Firefox versions 3.6 or lower, Opera versions 11.50 or lower,
		 * and Internet Explorer 8 or lower.
		 * Use {{#crossLink "SoundInstance/pause:method"}}{{/crossLink}} and {{#crossLink "SoundInstance/resume:method"}}{{/crossLink}} to set.
		 *
		 * @property pause
		 * @type {Boolean}
		 */
		this._paused = false;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "paused", {
				get: function() {
					return this._paused;
				},
				set: function(value) {
					if (value !== true || value !== false || this._paused == value) {return;}
					if (value == true && this.playState != createjs.Sound.PLAY_SUCCEEDED) {return;}
					this._updatePaused(value);
					this._paused = value;
					clearTimeout(this.delayTimeoutId);
				}
			});
		}


	// Events
		/**
		 * The event that is fired when playback has started successfully.
		 * @event succeeded
		 * @param {Object} target The object that dispatched the event.
		 * @param {String} type The event type.
		 * @since 0.4.0
		 */

		/**
		 * The event that is fired when playback is interrupted. This happens when another sound with the same
		 * src property is played using an interrupt value that causes this instance to stop playing.
		 * @event interrupted
		 * @param {Object} target The object that dispatched the event.
		 * @param {String} type The event type.
		 * @since 0.4.0
		 */

		/**
		 * The event that is fired when playback has failed. This happens when there are too many channels with the same
		 * src property already playing (and the interrupt value doesn't cause an interrupt of another instance), or
		 * the sound could not be played, perhaps due to a 404 error.
		 * @event failed
		 * @param {Object} target The object that dispatched the event.
		 * @param {String} type The event type.
		 * @since 0.4.0
		 */

		/**
		 * The event that is fired when a sound has completed playing but has loops remaining.
		 * @event loop
		 * @param {Object} target The object that dispatched the event.
		 * @param {String} type The event type.
		 * @since 0.4.0
		 */

		/**
		 * The event that is fired when playback completes. This means that the sound has finished playing in its
		 * entirety, including its loop iterations.
		 * @event complete
		 * @param {Object} target The object that dispatched the event.
		 * @param {String} type The event type.
		 * @since 0.4.0
		 */
	};

	var p = createjs.extend(AbstractSoundInstance, createjs.EventDispatcher);


// Public Methods:


	// Public API
	/**
	 * Play an instance. This method is intended to be called on SoundInstances that already exist (created
	 * with the Sound API {{#crossLink "Sound/createInstance"}}{{/crossLink}} or {{#crossLink "Sound/play"}}{{/crossLink}}).
	 *
	 * <h4>Example</h4>
	 *      var myInstance = createjs.Sound.createInstance(mySrc);
	 *      myInstance.play({offset:1, loop:2, pan:0.5});	// options as object properties
	 *      myInstance.play(createjs.Sound.INTERRUPT_ANY);	// options as parameters
	 *
	 * Note that if this sound is already playing, this call will do nothing.
	 *
	 * @method play
	 * @param {String | Object} [interrupt="none"|options] How to interrupt any currently playing instances of audio with the same source,
	 * if the maximum number of instances of the sound are already playing. Values are defined as <code>INTERRUPT_TYPE</code>
	 * constants on the Sound class, with the default defined by Sound {{#crossLink "Sound/defaultInterruptBehavior:property"}}{{/crossLink}}.
	 * <br /><strong>OR</strong><br />
	 * This parameter can be an object that contains any or all optional properties by name, including: interrupt,
	 * delay, offset, loop, volume, and pan (see the above code sample).
	 * @param {Number} [delay=0] The delay in milliseconds before the sound starts
	 * @param {Number} [offset=0] How far into the sound to begin playback, in milliseconds.
	 * @param {Number} [loop=0] The number of times to loop the audio. Use -1 for infinite loops.
	 * @param {Number} [volume=1] The volume of the sound, between 0 and 1.
	 * @param {Number} [pan=0] The pan of the sound between -1 (left) and 1 (right). Note that pan is not supported
	 * for HTML Audio.
	 * @return {SoundInstance} A reference to itself, intended for chaining calls.
	 */
	p.play = function (interrupt, delay, offset, loop, volume, pan) {
		if (this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			if (interrupt instanceof Object) {
				offset = interrupt.offset;
				loop = interrupt.loop;
				volume = interrupt.volume;
				pan = interrupt.pan;
			}
			if (offset != null) { this.setPosition(offset) }
			if (loop != null) { this.setLoop(loop); }
			if (volume != null) { this.setVolume(volume); }
			if (pan != null) { this.setPan(pan); }
			if (this._paused) {	this.resume(); }
			return;
		}
		this._cleanUp();
		createjs.Sound._playInstance(this, interrupt, delay, offset, loop, volume, pan);	// make this an event dispatch??
		return this;
	};

	/**
	 * Deprecated, please use {{#crossLink "SoundInstance/paused:property"}}{{/crossLink}} instead.
	 *
	 * @method pause
	 * @return {Boolean} If the pause call succeeds. This will return false if the sound isn't currently playing.
	 * @deprecated
	 */
	p.pause = function () {
		if (this._paused || this.playState != createjs.Sound.PLAY_SUCCEEDED) {return false;}
		this.setPaused(true);
		return true;
	};

	/**
	 * Deprecated, please use {{#crossLink "SoundInstance/paused:property"}}{{/crossLink}} instead.
	 *
	 * @method resume
	 * @return {Boolean} If the resume call succeeds. This will return false if called on a sound that is not paused.
	 * @deprecated
	 */
	p.resume = function () {
		if (!this._paused) {return false;}
		this.setPaused(false);
		return true;
	};

	/**
	 * NOTE that you can get paused directly as a property, and getPaused remains to allow support for IE8 with FlashPlugin.
	 *
	 * Returns true if the instance is currently paused.
	 *
	 * @method getPaused
	 * @returns {boolean} If the instance is currently paused
	 * @since 0.5.3
	 */
	p.getPaused = function() {
		return this._paused;
	};

	/**
	 * NOTE that you can set paused directly as a property, and setPaused remains to allow support for IE8 with FlashPlugin.
	 *
	 * Pause or resume the instance.  Note you can also resume playback with {{#crossLink "SoundInstance/play"}}{{/crossLink}}.
	 *
	 * @param {boolean} value
	 * @since 0.5.3
	 * @return {SoundInstance} A reference to itself, intended for chaining calls.
	 */
	p.setPaused = function (value) {
		if (value !== true || value !== false || this._paused == value) {return;}
		if (value == true && this.playState != createjs.Sound.PLAY_SUCCEEDED) {return;}
		this._updatePaused(value);
		this._paused = value;
		clearTimeout(this.delayTimeoutId);
		return this;
	};

	/**
	 * Stop playback of the instance. Stopped sounds will reset their position to 0, and calls to {{#crossLink "SoundInstance/resume"}}{{/crossLink}}
	 * will fail.  To start playback again, call {{#crossLink "SoundInstance/play"}}{{/crossLink}}.
	 *
	 * <h4>Example</h4>
	 *
	 *     myInstance.stop();
	 *
	 * @method stop
	 * @return {SoundInstance} A reference to itself, intended for chaining calls.
	 */
	p.stop = function () {
		this._position = 0;
		this._paused = false;
		this._handleStop();
		this._cleanUp();
		this.playState = createjs.Sound.PLAY_FINISHED;
		return this;
	};

	/**
	 * NOTE that you can set volume directly as a property, and setVolume remains to allow support for IE8 with FlashPlugin.
	 * Set the volume of the instance. You can retrieve the volume using {{#crossLink "SoundInstance/getVolume"}}{{/crossLink}}.
	 *
	 * <h4>Example</h4>
	 *      myInstance.setVolume(0.5);
	 *
	 * Note that the master volume set using the Sound API method {{#crossLink "Sound/setVolume"}}{{/crossLink}}
	 * will be applied to the instance volume.
	 *
	 * @method setVolume
	 * @param value The volume to set, between 0 and 1.
	 * @return {SoundInstance} A reference to itself, intended for chaining calls.
	 */
	p.setVolume = function (value) {
		this._volume = Math.max(0, Math.min(1, value));
		if (!this._muted) {
			this._updateVolume();
		}
		return this;
	};

	/**
	 * NOTE that you can access volume directly as a property, and getVolume remains to allow support for IE8 with FlashPlugin.
	 *
	 * Get the volume of the instance. The actual output volume of a sound can be calculated using:
	 * <code>myInstance.getVolume() * createjs.Sound.getVolume();</code>
	 *
	 * @method getVolume
	 * @return The current volume of the sound instance.
	 */
	p.getVolume = function () {
		return this._volume;
	};

	// TODO setMuted etc?
	/**
	 * Deprecated, please use {{#crossLink "SoundInstance/muted:property"}}{{/crossLink}} instead.
	 *
	 * @method setMute
	 * @param {Boolean} value If the sound should be muted.
	 * @return {Boolean} If the mute call succeeds.
	 * @deprecated
	 */
	p.setMute = function (value) {
		if (value == null) {return false;}

		this._muted = value;
		this._updateVolume();
		return true;
	};

	/**
	 * Deprecated, please use {{#crossLink "SoundInstance/muted:property"}}{{/crossLink}} instead.
	 *
	 * @method getMute
	 * @return {Boolean} If the sound is muted.
	 * @deprecated
	 */
	p.getMute = function () {
		return this._muted;
	};

	/**
	 * NOTE that you can set muted directly as a property, and setMuted exists to allow support for IE8 with FlashPlugin.
	 *
	 * Mute and unmute the sound. Muted sounds will still play at 0 volume. Note that an unmuted sound may still be
	 * silent depending on {{#crossLink "Sound"}}{{/crossLink}} volume, instance volume, and Sound muted.
	 *
	 * <h4>Example</h4>
	 *     myInstance.setMuted(true);
	 *
	 * @method setMute
	 * @param {Boolean} value If the sound should be muted.
	 * @return {SoundInstance} A reference to itself, intended for chaining calls.
	 * @since 0.5.3
	 */
	p.setMuted = function (value) {
		if (value !== true || value !== false) {return;}
		this._muted = value;
		this._updateVolume();
		return this;
	};

	/**
	 * NOTE that you can access muted directly as a property, and getMuted remains to allow support for IE8 with FlashPlugin.
	 *
	 * Get the mute value of the instance.
	 *
	 * <h4>Example</h4>
	 *      var isMuted = myInstance.getMuted();
	 *
	 * @method getMute
	 * @return {Boolean} If the sound is muted.
	 * @since 0.5.3
	 */
	p.getMuted = function () {
		return this._muted;
	};

	/**
	 * NOTE that you can set pan directly as a property, and getPan remains to allow support for IE8 with FlashPlugin.
	 *
	 * Set the left(-1)/right(+1) pan of the instance. Note that {{#crossLink "HTMLAudioPlugin"}}{{/crossLink}} does not
	 * support panning, and only simple left/right panning has been implemented for {{#crossLink "WebAudioPlugin"}}{{/crossLink}}.
	 * The default pan value is 0 (center).
	 *
	 * <h4>Example</h4>
	 *
	 *     myInstance.setPan(-1);  // to the left!
	 *
	 * @method setPan
	 * @param {Number} value The pan value, between -1 (left) and 1 (right).
	 * @return {SoundInstance} Returns reference to itself for chaining calls
	 */
	p.setPan = function (value) {
		this._pan = Math.max(-1, Math.min(1, value));
		this._updatePan();
		return this;
	};

	/**
	 * NOTE that you can access pan directly as a property, and getPan remains to allow support for IE8 with FlashPlugin.
	 *
	 * Get the left/right pan of the instance. Note in WebAudioPlugin this only gives us the "x" value of what is
	 * actually 3D audio.
	 *
	 * <h4>Example</h4>
	 *
	 *     var myPan = myInstance.getPan();
	 *
	 * @method getPan
	 * @return {Number} The value of the pan, between -1 (left) and 1 (right).
	 */
	p.getPan = function () {
		return this._pan;
	};

	/**
	 * NOTE that you can access position directly as a property, and getPosition remains to allow support for IE8 with FlashPlugin.
	 *
	 * Get the position of the playhead of the instance in milliseconds.
	 *
	 * <h4>Example</h4>
	 *     var currentOffset = myInstance.getPosition();
	 *
	 * @method getPosition
	 * @return {Number} The position of the playhead in the sound, in milliseconds.
	 */
	p.getPosition = function () {
		if (!this._paused && this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			this._calculateCurrentPosition();	// sets this._position
		}
		return this._position;
	};

	/**
	 * NOTE that you can access position directly as a property, and setPosition remains to allow support for IE8 with FlashPlugin.
	 *
	 * Set the position of the playhead in the instance. This can be set while a sound is playing, paused, or
	 * stopped.
	 *
	 * <h4>Example</h4>
	 *      myInstance.setPosition(myInstance.getDuration()/2); // set audio to its halfway point.
	 *
	 * @method setPosition
	 * @param {Number} value The position to place the playhead, in milliseconds.
	 * @return {SoundInstance} Returns reference to itself for chaining calls
	 */
	p.setPosition = function (value) {
		this._position = value || 0;
		this._updatePosition();
		return this;
	};

	/**
	 * NOTE that you can access duration directly as a property, and getDuration exists to allow support for IE8 with FlashPlugin.
	 *
	 * Get the duration of the instance, in milliseconds.
	 * Note a sound needs to be loaded before it will have duration, unless it was set manually to create an audio sprite.
	 *
	 * <h4>Example</h4>
	 *     var soundDur = myInstance.getDuration();
	 *
	 * @method getDuration
	 * @return {Number} The duration of the sound instance in milliseconds.
	 */
	p.getDuration = function () {
		return this._duration;
	};

	/**
	 * NOTE that you can set duration directly as a property, and setDuration exists to allow support for IE8 with FlashPlugin.
	 *
	 * Set the duration of the audio.  Generally this is not called, but it can be used to create an audio sprite out of an existing SoundInstance.
	 *
	 * @method setDuration
	 * @param {number} value The new duration time in milli seconds.
	 * @return {SoundInstance} Returns reference to itself for chaining calls
	 * @since 0.5.3
	 */
	p.setDuration = function (value) {
		this._duration = value || 0;
		this._updateDuration();
		return this;
	};

	/**
	 * NOTE that you can access loop directly as a property, and getLoop exists to allow support for IE8 with FlashPlugin.
	 *
	 * The number of play loops remaining. Negative values will loop infinitely.
	 *
	 * @method getLoop
	 * @return {number}
	 * @since 0.5.3
	 **/
	p.getLoop = function () {
		return this._loop;
	};

	/**
	 * NOTE that you can set loop directly as a property, and setLoop exists to allow support for IE8 with FlashPlugin.
	 *
	 * Set the number of play loops remaining.
	 *
	 * @param {number} value The number of times to loop after play.
	 * @since 0.5.3
	 */
	p.setLoop = function (value) {
		// remove looping
		if (this._loop != 0 && value == 0) {
			this._removeLooping(value);
		}
		// add looping
		if (this._loop == 0 && value != 0) {
			this._addLooping(value);
		}
		this._loop = value;
	}

	p.toString = function () {
		return "[AbstractSoundInstance]";
	};


// Private Methods:
	/**
	 * A helper method that dispatches all events for SoundInstance.
	 * @method _sendEvent
	 * @param {String} type The event type
	 * @protected
	 */
	p._sendEvent = function (type) {
		var event = new createjs.Event(type);
		this.dispatchEvent(event);
	};

	/**
	 * Clean up the instance. Remove references and clean up any additional properties such as timers.
	 * @method _cleanUp
	 * @protected
	 */
	p._cleanUp = function () {
		clearTimeout(this.delayTimeoutId); // clear timeout that plays delayed sound

		createjs.Sound._playFinished(this);	// TODO change to an event
	};

	/**
	 * The sound has been interrupted.
	 * @method _interrupt
	 * @protected
	 */
	p._interrupt = function () {
		this._cleanUp();
		this.playState = createjs.Sound.PLAY_INTERRUPTED;
		this._paused = false;
		this._sendEvent("interrupted");
	};

	/**
	 * Handles starting playback when the sound is ready for playing.
	 * @method _handleSoundReady
	 * @protected
 	 */
	p._handleSoundReady = function (event) {
		if ((this._position*1000) > this._duration) {
			this._playFailed();
			return;
		} else if (this._position < 0) {
			this._position = 0;
		}

		this.playState = createjs.Sound.PLAY_SUCCEEDED;
		this._paused = false;
	};

	/**
	 * Called by the Sound class when the audio is ready to play (delay has completed). Starts sound playing if the
	 * src is loaded, otherwise playback will fail.
	 * @method _beginPlaying
	 * @param {Number} offset How far into the sound to begin playback, in milliseconds.
	 * @param {Number} loop The number of times to loop the audio. Use -1 for infinite loops.
	 * @param {Number} volume The volume of the sound, between 0 and 1.
	 * @param {Number} pan The pan of the sound between -1 (left) and 1 (right). Note that pan does not work for HTML Audio.
	 * @protected
	 */
	p._beginPlaying = function (offset, loop, volume, pan) {
		this._position = offset;
		this._loop = loop;
		this.volume = volume;
		this.pan = pan;

		// TODO add a loaded check?  maybe a source object (array buffer, tag, flash reference)
		if (this._owner.isPreloadComplete(this.src)) {
			this._handleSoundReady(null);
			this._sendEvent("succeeded");
			return;
		} else {
			this._playFailed();
			return;
		}
	};

	// Play has failed, which can happen for a variety of reasons.
	p._playFailed = function () {
		this._cleanUp();
		this.playState = createjs.Sound.PLAY_FAILED;
		this._sendEvent("failed");
	};

	/**
	 * Audio has finished playing. Manually loop it if required.
	 * @method _handleSoundComplete
	 * @param event
	 * @protected
	 */
	 // called internally by _soundCompleteTimeout in WebAudioPlugin
	p._handleSoundComplete = function (event) {
		this._position = 0;  // have to set this as it can be set by pause during playback

		if (this._loop != 0) {
			this._loop--;  // NOTE this introduces a theoretical limit on loops = float max size x 2 - 1

			// plugin specific code
			// TODO loop method

			this._sendEvent("loop");
			return;
		}

		this._cleanUp();
		this.playState = createjs.Sound.PLAY_FINISHED;
		this._sendEvent("complete");
	};

	/**
	 * Internal function used to update the volume based on the instance volume, master volume, instance mute value,
	 * and master mute value.
	 * @method _updateVolume
	 * @protected
	 */
	p._updateVolume = function () {
		// plugin specific code
	};

	/**
	 * Internal function used to update the pan
	 * @method _updatePan
	 * @protected
	 * @since 0.5.3
	 */
	p._updatePan = function () {
		// plugin specific code
	};

	/**
	 * Internal function used to update the duration of the audio.
	 * @method _updateDuration
	 * @protected
	 * @since 0.5.3
	 */
	p._updateDuration = function () {
		// plugin specific code
	};

	/**
	 * Internal function that calculates the current position of the playhead and sets it on this._position
	 * @method _updatePosition
	 * @protected
	 * @since 0.5.3
	 */
	p._calculateCurrentPosition = function () {
		// plugin specific code that sets this.position
	};

	/**
	 * Internal function used to update the position of the playhead.
	 * @method _updatePosition
	 * @protected
	 * @since 0.5.3
	 */
	p._updatePosition = function () {
		// plugin specific code
	};

	/**
	 * Internal function called when looping is removed during playback.
	 * @method _removeLooping
	 * @protected
	 * @since 0.5.3
	 */
	p._removeLooping = function () {
		// plugin specific code
	};

	/**
	 * Internal function called when looping is added during playback.
	 * @method _addLooping
	 * @protected
	 * @since 0.5.3
	 */
	p._addLooping = function () {
		// plugin specific code
	};

	/**
	 * Internal function called when pausing or resuming playback
	 * @method _updatePaused
	 * @protected
	 * @since 0.5.3
	 */
	p._updatePaused = function (value) {
		// plugin specific code
	};

	/**
	 * Internal function called when stopping playback
	 * @method _handleStop
	 * @protected
	 * @since 0.5.3
	 */
	p._handleStop = function() {
		// plugin specific code
	};

	createjs.AbstractSoundInstance = createjs.promote(AbstractSoundInstance, "EventDispatcher");
	createjs.DefaultSoundInstance = createjs.AbstractSoundInstance;	// used when no plugin is supported
}());

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
		 * How far into the sound to begin playback in milliseconds. This is passed in when play is called and used by
		 * pause and setPosition to track where the sound should be at.
		 * @property _offset
		 * @type {Number}
		 * @default 0
		 * @protected
		 */
		this._offset = 0;

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
		this._mute = false;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "mute", {
				get: function() {
					return this._mute;
				},
				set: function(value) {
					if (value !== true || value !== false) {return;}
					this._mute = value;
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
		 * // TODO change pause / resume to single method?
		 *
		 * @property pause
		 * @type {Boolean}
		 */
		this._pause = false;
		if (createjs.definePropertySupported) {
			Object.defineProperty(this, "pause", {
				get: function() {
					return this._pause;
				},
				set: function(value) {
					if (value !== true || value !== false) {return;}
					this._updatePause(value);
					this._pause = value;
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
			if (loop != null) { this.loop = loop; }
			if (volume != null) { this.setVolume(volume); }
			if (pan != null) { this.setPan(pan); }
			if (this._pause) {	this.resume(); }
			return;
		}
		this._cleanUp();
		createjs.Sound._playInstance(this, interrupt, delay, offset, loop, volume, pan);	// make this an event dispatch??
	};

	/**
	 * Pause the instance. Paused audio will stop at the current time, and can be resumed using
	 * {{#crossLink "SoundInstance/resume"}}{{/crossLink}}.
	 *
	 * <h4>Example</h4>
	 *
	 *      myInstance.pause();
	 *
	 * @method pause
	 * @return {Boolean} If the pause call succeeds. This will return false if the sound isn't currently playing.
	 */
	p.pause = function () {
		if (this._pause || this.playState != createjs.Sound.PLAY_SUCCEEDED) {return false;}

		this._pause = true;

		this._offset = this._owner.context.currentTime - this._playbackStartTime;  // this allows us to restart the sound at the same point in playback

		clearTimeout(this.delayTimeoutId);
		return true;
	};

	/**
	 * Resume an instance that has been paused using {{#crossLink "SoundInstance/pause"}}{{/crossLink}}. Audio that
	 * has not been paused will not playback when this method is called.
	 *
	 * <h4>Example</h4>
	 *
	 *     myInstance.pause();
	 *     // do some stuff
	 *     myInstance.resume();
	 *
	 * @method resume
	 * @return {Boolean} If the resume call succeeds. This will return false if called on a sound that is not paused.
	 */
	p.resume = function () {
		if (!this._pause) {return false;}
		this._handleSoundReady();
		return true;
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
	 * @return {Boolean} If the stop call succeeds.
	 */
	p.stop = function () {
		this._pause = false;
		this._cleanUp();
		this.playState = createjs.Sound.PLAY_FINISHED;
		this._offset = 0;  // set audio to start at the beginning
		return true;
	};

	/**
	 * NOTE that you can set volume directly as a property, and setVolume remains to allow support for IE8 with FlashPlugin.
	 * Set the volume of the instance. You can retrieve the volume using {{#crossLink "SoundInstance/getVolume"}}{{/crossLink}}.
	 *
	 * <h4>Example</h4>
	 *
	 *      myInstance.setVolume(0.5);
	 *
	 * Note that the master volume set using the Sound API method {{#crossLink "Sound/setVolume"}}{{/crossLink}}
	 * will be applied to the instance volume.
	 *
	 * @method setVolume
	 * @param value The volume to set, between 0 and 1.
	 * @return {SoundInstance} Returns reference to itself for chaining calls
	 */
	p.setVolume = function (value) {
		this._volume = Math.max(0, Math.min(1, value));
		if (!this._mute) {
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

	/**
	 * NOTE that you can set mute directly as a property, and setMute remains to allow support for IE8 with FlashPlugin.
	 *
	 * Mute and unmute the sound. Muted sounds will still play at 0 volume. Note that an unmuted sound may still be
	 * silent depending on {{#crossLink "Sound"}}{{/crossLink}} volume, instance volume, and Sound mute.
	 *
	 * <h4>Example</h4>
	 *
	 *     myInstance.setMute(true);
	 *
	 * @method setMute
	 * @param {Boolean} value If the sound should be muted.
	 * @return {Boolean} If the mute call succeeds.
	 * @since 0.4.0
	 */
	p.setMute = function (value) {
		if (value == null) {return false;}

		this._mute = value;
		this._updateVolume();
		return true;
	};

	/**
	 * NOTE that you can access mute directly as a property, and getMute remains to allow support for IE8 with FlashPlugin.
	 *
	 * Get the mute value of the instance.
	 *
	 * <h4>Example</h4>
	 *
	 *      var isMuted = myInstance.getMute();
	 *
	 * @method getMute
	 * @return {Boolean} If the sound is muted.
	 * @since 0.4.0
	 */
	p.getMute = function () {
		return this._mute;
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
	 * Get the position of the playhead of the instance in milliseconds.
	 *
	 * <h4>Example</h4>
	 *
	 *     var currentOffset = myInstance.getPosition();
	 *
	 * @method getPosition
	 * @return {Number} The position of the playhead in the sound, in milliseconds.
	 */
	p.getPosition = function () {
		// plugin specific

		return 0;
	};

	/**
	 * Set the position of the playhead in the instance. This can be set while a sound is playing, paused, or
	 * stopped.
	 *
	 * <h4>Example</h4>
	 *
	 *      myInstance.setPosition(myInstance.getDuration()/2); // set audio to its halfway point.
	 *
	 * @method setPosition
	 * @param {Number} value The position to place the playhead, in milliseconds.
	 */
	p.setPosition = function (value) {
		this._offset = value * 0.001; // convert milliseconds to seconds

		if (this.sourceNode && this.playState == createjs.Sound.PLAY_SUCCEEDED) {
			// we need to stop this sound from continuing to play, as we need to recreate the sourceNode to change position
			this.sourceNode = this._cleanUpAudioNode(this.sourceNode);
			this._sourceNodeNext = this._cleanUpAudioNode(this._sourceNodeNext);
			clearTimeout(this._soundCompleteTimeout);  // clear timeout that triggers sound complete
		}  // NOTE we cannot just call cleanup because it also calls the Sound function _playFinished which releases this instance in SoundChannel

		if (!this._pause && this.playState == createjs.Sound.PLAY_SUCCEEDED) {this._handleSoundReady();}

		return true;
	};
	//TODO create a position property with getter / setter

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
	 * @return {SoundInstance}
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
		clearTimeout(this._soundCompleteTimeout);  // clear timeout that triggers sound complete

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
		this._pause = false;
		this._sendEvent("interrupted");
	};

	/**
	 * Handles starting playback when the sound is ready for playing.
	 * @method _handleSoundReady
	 * @protected
 	 */
	p._handleSoundReady = function (event) {
		if ((this._offset*1000) > this._duration) {
			this._playFailed();
			return;
		} else if (this._offset < 0) {
			this._offset = 0;
		}

		this.playState = createjs.Sound.PLAY_SUCCEEDED;
		this._pause = false;
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
		this._offset = offset;
		this._loop = loop;
		this.volume = volume;
		this.pan = pan;

		// TODO add a loaded check?  maybe a source object (array buffer, tag, flash reference)
		if (this._owner.isPreloadComplete(this.src)) {
			this._handleSoundReady(null);
			this._sendEvent("succeeded");
			return 1;
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
		this._offset = 0;  // have to set this as it can be set by pause during playback

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
	 */
	p._updatePan = function () {
		// plugin specific code
	};

	/**
	 * Internal function used to update the duration of the audio.
	 * @method _updateDuration
	 * @protected
	 */
	p._updateDuration = function () {
		// plugin specific code
	};

	/**
	 * Internal function called when looping is removed during playback.
	 * @method _removeLooping
	 * @protected
	 */
	p._removeLooping = function () {
		// plugin specific code
	};

	/**
	 * Internal function called when looping is added during playback.
	 * @method _addLooping
	 * @protected
	 */
	p._addLooping = function () {
		// plugin specific code
	};

	createjs.AbstractSoundInstance = createjs.promote(AbstractSoundInstance, "EventDispatcher");
	createjs.DefaultSoundInstance = createjs.AbstractSoundInstance;	// used when no plugin is supported
}());

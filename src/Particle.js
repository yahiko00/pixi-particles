var ParticleUtils = require("./ParticleUtils");
var PropertyList = require("./PropertyList");
var Sprite = PIXI.Sprite;

/**
 * An individual particle image. You shouldn't have to deal with these.
 * @memberof PIXI.particles
 * @class Particle
 * @extends PIXI.Sprite
 * @constructor
 * @param {PIXI.particles.Emitter} emitter The emitter that controls this particle.
 */
var Particle = function(emitter)
{
	//start off the sprite with a blank texture, since we are going to replace it
	//later when the particle is initialized.
	Sprite.call(this);

	/**
	 * The emitter that controls this particle.
	 * @property {Emitter} emitter
	 */
	this.emitter = emitter;
	//particles should be centered
	this.anchor.x = this.anchor.y = 0.5;
	/**
	 * The velocity of the particle. Speed may change, but the angle also
	 * contained in velocity is constant.
	 * @property {PIXI.Point} velocity
	 */
	this.velocity = new PIXI.Point();
	/**
	 * The maximum lifetime of this particle, in seconds.
	 * @property {Number} maxLife
	 */
	this.maxLife = 0;
	/**
	 * The current age of the particle, in seconds.
	 * @property {Number} age
	 */
	this.age = 0;
	/**
	 * A simple easing function to be applied to all properties that
	 * are being interpolated.
	 * @property {Function} ease
	 */
	this.ease = null;
	/**
	 * Extra data that the emitter passes along for custom particles.
	 * @property {Object} extraData
	 */
	this.extraData = null;
	/**
	 * The alpha of the particle throughout its life.
	 * @property {PIXI.particles.PropertyList} alphaList
	 */
	this.alphaList = new PropertyList();
	/**
	 * The speed of the particle throughout its life.
	 * @property {PIXI.particles.PropertyList} speedList
	 */
	this.speedList = new PropertyList();
	/**
	 * A multiplier from 0-1 applied to the speed of the particle at all times.
	 * @property {number} speedMultiplier
	 */
	this.speedMultiplier = 1;
	/**
	 * Acceleration to apply to the particle.
	 * @property {PIXI.Point} accleration
	 */
	this.acceleration = new PIXI.Point();
	/**
	 * The maximum speed allowed for accelerating particles. Negative values, values of 0 or NaN
	 * will disable the maximum speed.
	 * @property {Number} maxSpeed
	 * @default NaN
	 */
	this.maxSpeed = NaN;
	/**
	 * The scale of the particle throughout its life.
	 * @property {PIXI.particles.PropertyList} scaleList
	 */
	this.scaleList = new PropertyList();
	/**
	 * A multiplier from 0-1 applied to the scale of the particle at all times.
	 * @property {number} scaleMultiplier
	 */
	this.scaleMultiplier = 1;
	/**
	 * The tint of the particle throughout its life.
	 * @property {PIXI.particles.PropertyList} colorList
	 */
	this.colorList = new PropertyList(true);
	/**
	 * If alpha should be interpolated at all.
	 * @property {Boolean} _doAlpha
	 * @private
	 */
	this._doAlpha = false;
	/**
	 * If scale should be interpolated at all.
	 * @property {Boolean} _doScale
	 * @private
	 */
	this._doScale = false;
	/**
	 * If speed should be interpolated at all.
	 * @property {Boolean} _doSpeed
	 * @private
	 */
	this._doSpeed = false;
	/**
	 * If acceleration should be handled at all. _doSpeed is mutually exclusive with this,
	 * and _doSpeed gets priority.
	 * @property {Boolean} _doAcceleration
	 * @private
	 */
	this._doAcceleration = false;
	/**
	 * If color should be interpolated at all.
	 * @property {Boolean} _doColor
	 * @private
	 */
	this._doColor = false;
	/**
	 * If normal movement should be handled. Subclasses wishing to override movement
	 * can set this to false in init().
	 * @property {Boolean} _doNormalMovement
	 * @private
	 */
	this._doNormalMovement = false;
	/**
	 * One divided by the max life of the particle, saved for slightly faster math.
	 * @property {Number} _oneOverLife
	 * @private
	 */
	this._oneOverLife = 0;

	/**
	 * Reference to the next particle in the list.
	 * @property {Particle} next
	 * @private
	 */
	this.next = null;

	/**
	 * Reference to the previous particle in the list.
	 * @property {Particle} prev
	 * @private
	 */
	this.prev = null;

	//save often used functions on the instance instead of the prototype for better speed
	this.init = this.init;
	this.Particle_init = this.Particle_init;
	this.update = this.update;
	this.Particle_update = this.Particle_update;
	this.applyArt = this.applyArt;
	this.kill = this.kill;
};

// Reference to the prototype
var p = Particle.prototype = Object.create(Sprite.prototype);

/**
 * Initializes the particle for use, based on the properties that have to
 * have been set already on the particle.
 * @method PIXI.particles.Particle#init
 */
/**
 * A reference to init, so that subclasses can access it without the penalty of Function.call()
 * @method PIXI.particles.Particle#Particle_init
 * @protected
 */
p.init = p.Particle_init = function()
{
	//reset the age
	this.age = 0;
	//set up the velocity based on the start speed and rotation
	this.velocity.x = this.speedList.current.value * this.speedMultiplier;
	this.velocity.y = 0;
	ParticleUtils.rotatePoint(this.rotation, this.velocity);
	if (this.noRotation)
	{
		this.rotation = 0;
	}
	else
	{
		//convert rotation to Radians from Degrees
		this.rotation *= ParticleUtils.DEG_TO_RADS;
	}
	//convert rotation speed to Radians from Degrees
	this.rotationSpeed *= ParticleUtils.DEG_TO_RADS;
	//set alpha to inital alpha
	this.alpha = this.alphaList.current.value;
	//set scale to initial scale
	this.scale.x = this.scale.y = this.scaleList.current.value;
	//figure out what we need to interpolate
	this._doAlpha = !!this.alphaList.current.next;
	this._doSpeed = !!this.speedList.current.next;
	this._doScale = !!this.scaleList.current.next;
	this._doColor = !!this.colorList.current.next;
	this._doAcceleration = this.acceleration.x !== 0 || this.acceleration.y !== 0;
	//_doNormalMovement can be cancelled by subclasses
	this._doNormalMovement = this._doSpeed || this.startSpeed !== 0 || this._doAcceleration;
	//save our lerp helper
	this._oneOverLife = 1 / this.maxLife;
	//set the inital color
	var color = this.colorList.current.value;
	this.tint = ParticleUtils.combineRGBComponents(color.r, color.g, color.b);
	//ensure visibility
	this.visible = true;
};

/**
 * Sets the texture for the particle. This can be overridden to allow
 * for an animated particle.
 * @method PIXI.particles.Particle#applyArt
 * @param {PIXI.Texture} art The texture to set.
 */
p.applyArt = function(art)
{
	this.texture = art || ParticleUtils.EMPTY_TEXTURE;
};

/**
 * Updates the particle.
 * @method PIXI.particles.Particle#update
 * @param {Number} delta Time elapsed since the previous frame, in __seconds__.
 * @return {Number} The standard interpolation multiplier (0-1) used for all relevant particle
 *                   properties. A value of -1 means the particle died of old age instead.
 */
/**
 * A reference to update so that subclasses can access the original without the overhead
 * of Function.call().
 * @method PIXI.particles.Particle#Particle_update
 * @param {Number} delta Time elapsed since the previous frame, in __seconds__.
 * @return {Number} The standard interpolation multiplier (0-1) used for all relevant particle
 *                   properties. A value of -1 means the particle died of old age instead.
 * @protected
 */
p.update = p.Particle_update = function(delta)
{
	//increase age
	this.age += delta;
	//recycle particle if it is too old
	if(this.age >= this.maxLife)
	{
		this.kill();
		return -1;
	}

	//determine our interpolation value
	var lerp = this.age * this._oneOverLife;//lifetime / maxLife;
	if (this.ease)
	{
		if(this.ease.length == 4)
		{
			//the t, b, c, d parameters that some tween libraries use
			//(time, initial value, end value, duration)
			lerp = this.ease(lerp, 0, 1, 1);
		}
		else
		{
			//the simplified version that we like that takes
			//one parameter, time from 0-1. TweenJS eases provide this usage.
			lerp = this.ease(lerp);
		}
	}

	//interpolate alpha
	if (this._doAlpha)
		this.alpha = this.alphaList.interpolate(lerp);
	//interpolate scale
	if (this._doScale)
	{
		var scale = this.scaleList.interpolate(lerp) * this.scaleMultiplier;
		this.scale.x = this.scale.y = scale;
	}
	//handle movement
	if(this._doNormalMovement)
	{
		//interpolate speed
		if (this._doSpeed)
		{
			var speed = this.speedList.interpolate(lerp) * this.speedMultiplier;
			ParticleUtils.normalize(this.velocity);
			ParticleUtils.scaleBy(this.velocity, speed);
		}
		else if(this._doAcceleration)
		{
			this.velocity.x += this.acceleration.x * delta;
			this.velocity.y += this.acceleration.y * delta;
			if (this.maxSpeed)
			{
				var currentSpeed = ParticleUtils.length(this.velocity);
				//if we are going faster than we should, clamp at the max speed
				//DO NOT recalculate vector length
				if (currentSpeed > this.maxSpeed)
				{
					ParticleUtils.scaleBy(this.velocity, this.maxSpeed / currentSpeed);
				}
			}
		}
		//adjust position based on velocity
		this.position.x += this.velocity.x * delta;
		this.position.y += this.velocity.y * delta;
	}
	//interpolate color
	if (this._doColor)
	{
		this.tint = this.colorList.interpolate(lerp);
	}
	//update rotation
	if(this.rotationSpeed !== 0)
	{
		this.rotation += this.rotationSpeed * delta;
	}
	else if(this.acceleration && !this.noRotation)
	{
		this.rotation = Math.atan2(this.velocity.y, this.velocity.x);// + Math.PI / 2;
	}
	return lerp;
};

/**
 * Kills the particle, removing it from the display list
 * and telling the emitter to recycle it.
 * @method PIXI.particles.Particle#kill
 */
p.kill = function()
{
	this.emitter.recycle(this);
};

p.Sprite_Destroy = Sprite.prototype.destroy;
/**
 * Destroys the particle, removing references and preventing future use.
 * @method PIXI.particles.Particle#destroy
 */
p.destroy = function()
{
	if (this.parent)
		this.parent.removeChild(this);
	if (this.Sprite_Destroy)
		this.Sprite_Destroy();
	this.emitter = this.velocity = this.startColor = this.endColor = this.ease =
		this.next = this.prev = null;
};

/**
 * Checks over the art that was passed to the Emitter's init() function, to do any special
 * modifications to prepare it ahead of time.
 * @method PIXI.particles.Particle.parseArt
 * @static
 * @param  {Array} art The array of art data. For Particle, it should be an array of Textures.
 *                     Any strings in the array will be converted to Textures via
 *                     Texture.fromImage().
 * @return {Array} The art, after any needed modifications.
 */
Particle.parseArt = function(art)
{
	//convert any strings to Textures.
	var i;
	for(i = art.length; i >= 0; --i)
	{
		if(typeof art[i] == "string")
			art[i] = PIXI.Texture.fromImage(art[i]);
	}
	//particles from different base textures will be slower in WebGL than if they
	//were from one spritesheet
	if(ParticleUtils.verbose)
	{
		for(i = art.length - 1; i > 0; --i)
		{
			if(art[i].baseTexture != art[i - 1].baseTexture)
			{
				if (window.console)
					console.warn("PixiParticles: using particle textures from different images may hinder performance in WebGL");
				break;
			}
		}
	}

	return art;
};

/**
 * Parses extra emitter data to ensure it is set up for this particle class.
 * Particle does nothing to the extra data.
 * @method PIXI.particles.Particle.parseData
 * @static
 * @param  {Object} extraData The extra data from the particle config.
 * @return {Object} The parsed extra data.
 */
Particle.parseData = function(extraData)
{
	return extraData;
};

module.exports = Particle;
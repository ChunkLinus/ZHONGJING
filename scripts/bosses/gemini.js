import { Random, Matter, Easing } from 'sphere-runtime'
import { Entity } from "../core/entityFactory.js"
import { PausableTween } from "../core/fastTween.js"
import { Enemy } from "../enemies/enemy.js"
import { Damage } from '../effects/damage.js'
import { Impact } from '../effects/impact.js'
import { Debris } from '../effects/debris.js'
import { getKeyCode, getRandomChar } from '../data/cyrillicQwertyConversion.js'
import { QwertyToZhuyin } from '../data/zhuyin.js'

// Gemini constants.
const radius = 50
const distanceFromCenter = 500
const healRate = 30
const bobbingMotionYOffset = 20
const pupilRadius = 7
const eyeRadius = 14

// Tendril constants.
const tendrilRotationSpeed = .07
const tendrilMovementSpeed = 6
const tendrilStemThickness = 7
const tendrilBulbSize = 15
const tendrilFormedBulbSize = 25
const tendrilPressProgress = 13
const tendrilProgressBarRadius = 27
const tendrilHealPerTick = .5

export class Gemini extends Entity
{
	static getName() { return localize("boss_gemini") }
	static getDesc() { return localize("boss_gemini_desc") }
	static getBGM() { return bgm.fadeTo(bgm.getMusicInSet("boss_gemini")) }

	reset()
	{
		// Set and declare variables.
		boss = this
		this.split = false
		this.currentTendril = null
		this.spawnTendrilTimer = new PausableTween()

		// Character cooldowns after tendril (to avoid mistypes).
		this.tendrilCharCooldown = ""

		// Spawn the twins.
		this.leftGemini = factory.spawn(GeminiHalf, true, this)
		this.rightGemini = factory.spawn(GeminiHalf, false, this)
		this.leftGemini.other = this.rightGemini
		this.rightGemini.other = this.leftGemini

		// Start blinking timer.
		this.blinkPercent = 1
		this.blinkTween = new PausableTween(Easing.Linear)
		this.blinkTween.easeIn([], [], () => {}, 240)
			.then(() => {
				this.blink()
				this.spawnTendrils()
			})
	}

	blink()
	{
		this.blinkTween.easeIn([], [], () => {}, Random.discrete(120, 240))
			.then(() => this.blinkTween.easeIn([this.blinkPercent], [.01], t => this.blinkPercent = t[0], 10)
				.then(() => this.blinkTween.easeIn([this.blinkPercent], [1], t => this.blinkPercent = t[0], 10)
					.then(() => {
						if (!this.running) return
						this.blink()
					})))
	}

	spawnTendrils()
	{
		this.spawnTendrilTimer.easeIn([], [], () => {}, Random.discrete(420, 900))
			.then(() => {
				if (!this.running) return
				if (!this.currentTendril)
					this.currentTendril = factory.spawn(Tendrils, this)
				else
					this.spawnTendrils()
			})
	}

	progressTendrils(char)
	{
		// If tendril exists.
		if (this.currentTendril &&
			this.currentTendril.formed &&
			!this.currentTendril.keyHeld &&
			(
				(usingController && this.currentTendril.quicktime == char) ||
				(!usingController && this.currentTendril.letter == char)
			)
		)
		{
			if (!usingController) this.currentTendril.keyHeld = true
			if (this.currentTendril.currentProgress > tendrilPressProgress)
				this.currentTendril.currentProgress -= tendrilPressProgress
			else
			{
				this.currentTendril.destroy()
				this.tendrilCharCooldown = char
				Sphere.sleep(40).then(() => this.tendrilCharCooldown = "")
			}
			audioHandler.playAudioHook("gemini_typing")
			return false
		}

		// Else, if tendril character on cooldown, ignore mistypes.
		else if (this.tendrilCharCooldown == char)
			return false

		// Else, return character unrecognized.
		return true
	}

	halfDestroyed(isLeft)
	{
		let other
		if (isLeft)
		{
			this.leftGemini.other = null
			this.leftGemini = null
			other = this.rightGemini
		}
		else
		{
			this.rightGemini.other = null
			this.rightGemini = null
			other = this.leftGemini
		}
		if (!other)
		{
			if (this.currentTendril) this.currentTendril.destroy()
			boss = null
			bgm.resume()
			if (!("defeatedGemini" in save)) save["defeatedGemini"] = true
			missionComplete()
			this.suspend()
		}
		else other.other = null
	}
}

class GeminiHalf extends Enemy
{
	constructor()
	{
		// Superclass constructor.
		super(scalePix(radius))

		// Define consts.
		this.experience = 0
		this.healthBarThickness = scalePix(5)
		this.alwaysShowHealth = true
		this.targetPosition = null
		this.wordOffset = this.radius * 1.5
	}

	reset(isLeft, parent)
	{
		// Superclass reset.
		super.reset()
		
		// Declare vars.
		this.isLeft = isLeft
		this.parent = parent
		this.healingTimer = 0
		this.bobbingMotionX = 0
		this.setHealth(Math.max(5000, Math.ceil((totalDamage * 90000) / timeElapsed)))

		// Initial position.
		Matter.Body.setPosition(this.body, { x: screenCenter.x + (isLeft ? -this.radius : this.radius), y: -this.radius })

		// Downward movement.
		this.intro = true
		new PausableTween().easeOut(
			[this.body.position.y],
			[screenCenter.y],
			t => Matter.Body.setPosition(this.body, { x: this.body.position.x, y: t[0] }),
			240
		).then(() => this.intro = false)

		// Splitting movement.
		const splitTween = new PausableTween(Easing.Exponential)
		splitTween.easeIn([], [], () => {}, 120) // This is just a pausable sleep.
			.then(() => {
				audioHandler.playAudioHook("gemini_separate")
				splitTween.easeOut(
					[this.body.position.x],
					[screenCenter.x + scalePix(isLeft ? -distanceFromCenter : distanceFromCenter)],
					y => Matter.Body.setPosition(this.body, { x: y[0], y: this.body.position.y }),
					60
				)
				if (isLeft) { parent.split = true }
			})
	}

	update()
	{
		// If game paused, skip update.
		if (isPaused()) return

		// Bobbing motion.
		if (!this.intro)
		{
			this.bobbingMotionX += this.isLeft ? .02 : -.02
			Matter.Body.setPosition(
				this.body,
				{
					x: this.body.position.x,
					y: screenCenter.y + Math.sin(this.bobbingMotionX) * scalePix(bobbingMotionYOffset)
				}
			)
		}

		// Check if should heal.
		if (this.other && ++this.healingTimer >= healRate)
		{
			this.healingTimer = 0
			let healthDifference = this.other.currentHealth - this.currentHealth
			if (healthDifference > this.health * .01)
			{
				let rate =
					healthDifference > this.health * .25 ? this.health * .1 :
					healthDifference > this.health * .2 ? this.health * .05 :
					healthDifference > this.health * .15 ? this.health * .01 :
					this.health * .005
				rate = Math.round(Random.uniform(rate, 2))	// Add a bit of randomness.
				this.addHealth(rate)
				factory.spawn(Damage, this.body.position.x, this.body.position.y, `+${rate}`)
			}
		}
	}
	
	destroy()
	{
		audioHandler.playAudioHook("gemini_die", getPanFromX(this.body.position.x))
		super.destroy()
		this.parent.halfDestroyed(this.isLeft)
	}

	on_render()
	{
		// Before splitting animation, left side draws both sides.
		if (!this.parent.split)
		{
			if (this.isLeft)
			{
				// Draw body.
				PrimNative.drawFilledRoundedRectangle(
					Surface.Screen,
					screenCenter.x - this.radius * 2,
					this.body.position.y - this.radius,
					screenCenter.x + this.radius * 2,
					this.body.position.y + this.radius,
					scalePix(10), scalePix(10),
					secondColor
				)

				// Draw eyes.
				for (let offset = -this.radius * .5; offset <= this.radius * .5; offset += this.radius)
					this.drawEye({ x: screenCenter.x + offset, y: this.body.position.y }, Math.PI / 2)
			}
		}

		// After split, each side draws their own.
		else
		{
			// Draw body.
			PrimNative.drawFilledRoundedRectangle(
				Surface.Screen,
				this.body.position.x - this.radius,
				this.body.position.y - this.radius,
				this.body.position.x + this.radius,
				this.body.position.y + this.radius,
				scalePix(10), scalePix(10),
				secondColor
			)

			// Draw eye.
			let vecToCenter = Vector.sub(screenCenter, this.body.position)
			let angle = Math.atan2(vecToCenter.y, vecToCenter.x)
			this.drawEye(this.body.position, angle, this.parent.blinkPercent)

			// Render health and word.
			this.renderWordAndHealth(false, 3, true, this.other ? Math.max(this.other.currentHealth, this.currentHealth) : null)
		}
	}

	drawEye(pos, angle, blinkPercent = 1)
	{
		let pupilSize = scalePix(pupilRadius)
		let eyeSize = scalePix(eyeRadius)
		let pupilPos = Vector.add(Vector.rotate({ x: eyeSize - scalePix(1), y: 0 }, angle), pos)
		PrimNative.drawFilledEllipse(Surface.Screen, pos.x, pos.y, eyeSize + pupilSize, (eyeSize + pupilSize) * blinkPercent, paleYellow)
		PrimNative.drawFilledCircle(Surface.Screen, pupilPos.x, pupilPos.y, pupilSize, secondColor)
	}
}

class Tendrils extends Entity
{
	constructor()
	{
		super()
		this.damage = 100
		this.bulbSize = scalePix(tendrilBulbSize)
		this.formedBulbSize = scalePix(tendrilFormedBulbSize)
		this.progressBarRadius = scalePix(tendrilProgressBarRadius)
		this.velocity = { x: 0, y: scalePix(.5) }
	}

	reset(parent)
	{
		// Declare vars.
		this.parent = parent
		this.formed = false
		this.keyHeld = false
		this.bulbPosition = { x: screenCenter.x, y: Surface.Screen.height * .26 }

		// Letter/controller button.
		this.letter = getRandomChar()
		this.quicktime = genQuicktimeChar(buttonWeightGame)

		// Progress bar variables.
		this.maxProgress = 100
		this.currentProgress = 100

		// Create initial tendrils.
		this.tendrils = []
		if (parent.leftGemini)
			this.tendrils.push([
				Vector.clone(parent.leftGemini.body.position),
				Random.uniform(- Math.PI * .75, Math.PI * .25),
				true
			])
		if (parent.rightGemini)
			this.tendrils.push([
				Vector.clone(parent.rightGemini.body.position),
				Random.uniform(- Math.PI * .25, Math.PI * .25),
				false
			])
		
		// Play SFX.
		audioHandler.playAudioHook("gemini_hold")
	}

	on_update()
	{
		// Make sure key is not held down.
		if (this.keyHeld) this.keyHeld = Keyboard.Default.isPressed(getKeyCode(this.letter))

		// If game is paused, skip update.
		if (isPaused() || powerup_freeze) return

		// Before ButtonMash is formed.
		if (!this.formed)
		{
			// Move tendrils.
			for (let i = this.tendrils.length - 1; i >= 0; i--)
			{
				// Get reference to tendril.
				let tendril = this.tendrils[i]

				// Check if origin still exists.
				if (
					(tendril[2] && !this.parent.leftGemini) ||
					(!tendril[2] && !this.parent.rightGemini)
				)
				{
					this.tendrils.splice(i, 1)
					continue
				}

				// If tendril still too far from destination...
				if (distanceBetween(tendril[0], this.bulbPosition) > tendrilMovementSpeed)
				{
					// Get angle to nearest enemy.
					let direction = Vector.sub(this.bulbPosition, tendril[0])
					let angle = Math.atan2(direction.y, direction.x)

					// Rotate (pick whatever direction is closer).
					let difference = diff(tendril[1], angle)
					if (Math.abs(difference) > tendrilRotationSpeed)
						tendril[1] += Math.sign(difference) * tendrilRotationSpeed
					else
						tendril[1] = angle

					// Move tendril.
					tendril[0] = Vector.add (
						Vector.mult (
							{
								x: Math.cos(tendril[1]),
								y: Math.sin(tendril[1])
							},
							tendrilMovementSpeed
						),
						tendril[0]
					)
				}

				// ...else just snap into position.
				else tendril[0] = this.bulbPosition
			}

			// Check if both tendrils have arrived at destination.
			if (!this.formed && this.tendrils.every(tendril => tendril[0] == this.bulbPosition))
			{
				audioHandler.playAudioHook("gemni_form")
				this.formed = true
				this.tendrils = []
			}
		}
		
		// After ButtonMash is formed.
		else
		{
			// Move towards main weapon.
			let nextPosition = Vector.add(this.bulbPosition, this.velocity)
			if (currentTurret && distanceBetween(screenCenter, nextPosition) <= this.formedBulbSize + currentTurret.radius)
			{
				currentTurret.getHit(this.damage)
				factory.spawn(Impact, this.bulbPosition.x, this.bulbPosition.y)
				this.destroy()
			}
			this.bulbPosition = nextPosition

			// Heal progress.
			if (this.currentProgress < this.maxProgress)
			{
				if (this.maxProgress - this.currentProgress > tendrilHealPerTick)
					this.currentProgress += tendrilHealPerTick
				else
					this.currentProgress = this.maxProgress
			}
		}
	}

	destroy()
	{
		for (let i = 0; i < 10; i++)
			factory.spawn(Debris, this.bulbPosition.x, this.bulbPosition.y)
		this.parent.currentTendril = null
		this.parent.spawnTendrils()
		audioHandler.playAudioHook("gemini_tendrilDestroy")
		this.stop()
	}

	on_renderStart()
	{
		// Before tendrils joined.
		if (!this.formed)

			// For each side.
			for (const tendril of this.tendrils)
			{
				// Determine tendril origin.
				let origin =
					tendril[2] && this.parent.leftGemini ?
						this.parent.leftGemini.body.position :
						!tendril[2] && this.parent.rightGemini ? 
							this.parent.rightGemini.body.position : 
							null
				
				// Draw tendril stem.
				if (origin && distanceBetween(origin, tendril[0]) >= this.bulbSize + scalePix(radius))
					this.drawTendril(origin, tendril[0])

				// Draw tendril bulb.
				PrimNative.drawFilledCircle (
					Surface.Screen,
					tendril[0].x,
					tendril[0].y,
					scalePix(this.bulbSize),
					midGray
				)
			}

		// After tendrils joined.
		else
		{
			// Draw both tendril stems.
			if (this.parent.leftGemini)
				this.drawTendril(this.parent.leftGemini.body.position, this.bulbPosition)
			if (this.parent.rightGemini)
				this.drawTendril(this.parent.rightGemini.body.position, this.bulbPosition)

			// Draw bulb.
			PrimNative.drawFilledCircle (
				Surface.Screen,
				this.bulbPosition.x,
				this.bulbPosition.y,
				this.formedBulbSize,
				midGray
			)

			// Draw letter/quicktime.
			let font, text
			if (usingController)
			{
				font = quicktimeFont
				text = getQuickTimeString([this.quicktime])
			}
			else if (isGameKorean || isGameTraditionalChinese)
			{
				font = regularEastAsianLarge
				text = isGameKorean ? qwertyToKorean[this.letter] : QwertyToZhuyin[this.letter]
			}
			else
			{
				font = typingFontLarge
				text = this.letter
			}
			
			font.drawText (
				Surface.Screen,
				this.bulbPosition.x - font.widthOf(text) / 2,
				this.bulbPosition.y - font.height / 2,
				text,
				paleYellow
			)

			// Draw progressbar.
			PrimNative.drawArc (
				Surface.Screen,
				this.bulbPosition.x,
				this.bulbPosition.y,
				this.progressBarRadius,
				Math.PI * .5,
				this.currentProgress / this.maxProgress * 2 * Math.PI,
				scalePix(5),
				secondColor
			)
		}
	}

	drawTendril(start, end)
	{
		// Do some inital calculations.
		let geminiHalfSize = scalePix(radius)
		let direction = Vector.normalise(Vector.sub(end, start))
		let stemStart = Vector.add(start, Vector.mult(direction, geminiHalfSize))
		let stemEnd = Vector.add(end, Vector.mult(Vector.mult(direction, -1), this.bulbSize))
		let length = Vector.magnitude(Vector.sub(stemEnd, stemStart))
		let angle = Math.atan2(direction.y, direction.x)

		// Draw stem.
		geminiTendrilShape.transform.identity()
		geminiTendrilShape.transform.scale(length, scalePix(tendrilStemThickness))
		geminiTendrilShape.transform.rotate(angle / Math.PI * 180)
		geminiTendrilShape.transform.translate(stemStart.x, stemStart.y)
		geminiTendrilShape.draw(Surface.Screen)

		// Draw webbing at start.
		let pt1 = Vector.mult(direction, geminiHalfSize)
		let pt2 = Vector.add(Vector.rotate(pt1, Math.PI * .1), start)
		let pt3 = Vector.add(Vector.rotate(pt1, - Math.PI * .1), start)
		pt1 = Vector.add(Vector.add(pt1, Vector.mult(direction, length * .25)), start)
		PrimNative.drawFilledTriangle(
			Surface.Screen,
			pt1.x, pt1.y,
			pt2.x, pt2.y,
			pt3.x, pt3.y,
			secondColor
		)

		// Draw webbing at end.
		pt1 = Vector.mult(Vector.mult(direction, -1), this.bulbSize)
		pt2 = Vector.add(Vector.rotate(pt1, Math.PI * .25), end)
		pt3 = Vector.add(Vector.rotate(pt1, - Math.PI * .25), end)
		pt1 = Vector.add(Vector.add(pt1, Vector.mult(Vector.mult(direction, -1), length * .25)), end)
		PrimNative.drawFilledTriangle(
			Surface.Screen,
			pt1.x, pt1.y,
			pt2.x, pt2.y,
			pt3.x, pt3.y,
			midGray
		)
	}
}
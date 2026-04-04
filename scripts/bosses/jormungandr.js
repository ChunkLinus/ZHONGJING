import { Enemy, renderWord } from "../enemies/enemy.js"
import { Random, Matter, Easing } from 'sphere-runtime'
import { getScreenEdgeCoords } from "../turrets/heatray.js"
import { FastTween, PausableTween } from "../core/fastTween.js"
import { Entity } from "../core/entityFactory.js"
import { Debris } from "../effects/debris.js"
import { Impact } from "../effects/impact.js"
import { getRandomChar } from "../data/cyrillicQwertyConversion.js"
import { QwertyToZhuyin } from "../data/zhuyin.js"

const angularSpeed = .02
const distanceFromCenter = 375
const bodySegmentSize = 15
const bodySegmentCount = 12
const minAngularSpeedMultiplier = .4
const bodySegmentAngleDifference = Math.PI - Math.acos(bodySegmentSize / distanceFromCenter) * 2
const instaLetterCooldownMax = 600
const instaLetterCountMax = 5
const instaLettterSpawnSpacingMax = 12

const drawTriangle = function(position, apex)
{
	let pt2 = Vector.rotate(apex, -Math.PI * .8)
	let pt3 = Vector.rotate(pt2, -Math.PI * .4)
	apex = Vector.add(position, apex)
	pt2 = Vector.add(position, pt2)
	pt3 = Vector.add(position, pt3)
	PrimNative.drawFilledTriangle(Surface.Screen, apex.x, apex.y, pt2.x, pt2.y, pt3.x, pt3.y, secondColor)
}
const drawTriangleSpawn = function(size, position, direction) { drawTriangle(position, Vector.mult(direction, size)) }
const drawTriangleCircling = function(size, position) { drawTriangle(position, Vector.rotate(Vector.mult(Vector.normalise(Vector.sub(position, screenCenter)), size), Math.PI / 2)) }

export class Jormungandr extends Enemy
{
	static getName() { return localize("boss_jormungandr") }
	static getDesc() { return localize("boss_jormungandr_desc") }
	static getBGM() { return bgm.fadeTo(bgm.getMusicInSet("boss_jormangandr")) }

	constructor() {
		super(scalePix(20))
		this.alwaysShowHealth = true
		this.healthBarThickness = scalePix(5)
	}

	reset()
	{
		super.reset(0, false)
		boss = this
		this.setHealth(Math.max(5000, Math.ceil((totalDamage * 150000) / timeElapsed)))

		// Declare variables.
		this.recticles = []
		this.distanceVector = { x: scalePix(distanceFromCenter), y: 0 }

		// Nerf subsequent hits from splash weapons
		// on multiple body segments.
		this.lastHitWeapons = []

		// Set spawn point.
		this.circling = false
		this.currentAngle = Random.uniform(Math.PI, Math.PI)
		let tangentPoint = Vector.add(Vector.rotate(this.distanceVector, this.currentAngle), screenCenter)
		let tangentVector = Vector.normalise(Vector.rotate(Vector.sub(screenCenter, tangentPoint), Math.PI / 2))
		let tangentReferencePoint = Vector.add(tangentVector, tangentPoint)
		let spawnPoint = getScreenEdgeCoords(tangentReferencePoint.x, tangentReferencePoint.y, tangentPoint.x, tangentPoint.y)

		// Cooldown timer for InstaLetters.
		this.instaLetterCooldown = instaLetterCooldownMax
		this.instaLetterPendingCount = 0
		this.instaLetterSpawnSpacing = 0
		this.instaLetters = []

		// Create spawn behavior.
		this.speed = scalePix(distanceFromCenter * Math.sin(angularSpeed / 2) * 2)
		new PausableTween(Easing.Linear).easeIn (
			[spawnPoint.x, spawnPoint.y],
			[tangentPoint.x, tangentPoint.y],
			t => Matter.Body.setPosition (
				this.body,
				{ x: t[0], y: t[1] }
			),
			distanceBetween(spawnPoint, tangentPoint) / this.speed
		).then(() => {
			if (!spawner.running) return
			this.circling = true
			for (let i = 0; i < 2; i++)
				this.recticles.push(factory.spawn(JormReticle, Vector.add(Vector.rotate({ x: scalePix(distanceFromCenter), y: 0 }, Math.PI * i), screenCenter)))
		})
		
		// Spawn body segments.
		this.directionOfSpawn = Vector.mult(tangentVector, -1)
		let spacing = scalePix(bodySegmentSize * 2)
		for (let i = 1; i <= bodySegmentCount; i++)
			this.children.push(factory.spawn(BodySegment, this, i, Vector.add(Vector.mult(tangentVector, spacing * i), spawnPoint), tangentPoint))
	}

	popInstaLetter(char)
	{
		let result = this.instaLetters.findIndex(insta => usingController ? insta[1] == char : insta[0] === char)
		if (result >= 0) {
			let instaLetter = this.instaLetters[result][2]
			audioHandler.playAudioHook("jormangandr_shorten", getPanFromX(instaLetter.position.x))
			instaLetter.destroy()
			return false
		}
		return true
	}

	update()
	{
		if (!this.circling || isPaused()) return
		if (--this.instaLetterCooldown <= 0)
		{
			this.instaLetterCooldown = Random.uniform(instaLetterCooldownMax, 120)
			this.instaLetterPendingCount += instaLetterCountMax
		}
		if (this.instaLetterPendingCount > 0 && --this.instaLetterSpawnSpacing <= 0)
		{
			this.instaLetterSpawnSpacing = instaLettterSpawnSpacingMax
			--this.instaLetterPendingCount

			// Spawn InstaLetter.
			let attempts = 0
			let letter, quicktime
			do { letter = getRandomChar() }
			while ( this.instaLetters.find(insta => insta[0] == letter) && ++attempts < 1000 )

			do { quicktime = genQuicktimeChar(buttonWeightGame) }
				while ( this.instaLetters.find(insta => insta[1] == quicktime) && ++attempts < 1000 )

			this.instaLetters.push([
				letter,
				quicktime,
				factory.spawn(
					InstaLetters,
					letter,
					quicktime,
					{ x: this.body.position.x, y: this.body.position.y },
					this
				)
			])

			// SFX
			audioHandler.playAudioHook("jormangandr_release", getPanFromX(this.body.position.x))
		}
		let segmentFrac = this.children.length / bodySegmentCount
		let angularSpeedMult = minAngularSpeedMultiplier + (1 - minAngularSpeedMultiplier) * segmentFrac
		this.currentAngle += angularSpeed * angularSpeedMult
		Matter.Body.setPosition(this.body, Vector.add(Vector.rotate({ x: scalePix(distanceFromCenter), y: 0 }, this.currentAngle), screenCenter))
	}

	getHit(damage, weapon = null, col = null, forceDamageType = null)
	{
		// Process damage.
		let result = super.getHit(this.lastHitWeapons.includes(weapon) ? damage * .05 : damage, weapon, col, forceDamageType)

		// Nerf subsequent hits from the same weapon.
		if (!this.lastHitWeapons.includes(weapon))
		{
			this.lastHitWeapons.push(weapon)
			Sphere.sleep(10).then(() => this.lastHitWeapons.splice(this.lastHitWeapons.indexOf(weapon), 1))
		}

		// Destroy segments.
		if (Math.floor(this.currentHealth / (this.health / bodySegmentCount)) < this.children.length)
		{
			let sacrifice = this.children.pop()
			audioHandler.playAudioHook("jormangandr_shorten", getPanFromX(sacrifice.body.position.x))
			sacrifice.destroy()
		}
		return result
	}

	destroy()
	{
		super.destroy()
		bgm.resume()
		if (!("defeatedJormungandr" in save)) save["defeatedJormungandr"] = true
		this.killAllChildren()
		missionComplete()
	}

	suspend()
	{
		this.killAllChildren()
		super.suspend()
	}

	killAllChildren()
	{
		// Destroy all recticles.
		for (let i = this.recticles.length - 1; i >= 0; i--)
			this.recticles[i].stop()

		// Destroy all existing InstaLetters.
		for (let i = this.instaLetters.length - 1; i >= 0; i--)
			this.instaLetters[i][2].destroy()
	}

	on_render()
	{
		this.renderWordAndHealth(false, 3, false)
		this.circling ?
			drawTriangleCircling(this.radius, this.body.position) :
			drawTriangleSpawn(this.radius, this.body.position, this.directionOfSpawn)
	}
}

class BodySegment extends Enemy
{
	constructor() { super(scalePix(bodySegmentSize)) }

	reset(parent, index, position, tangentPoint)
	{
		super.reset(0, false)
		this.setHealth(Infinity)
		this.index = index
		this.parent = parent
		Matter.Body.setPosition(this.body, position)
		this.circling = false

		new PausableTween(Easing.Linear).easeIn (
			[position.x, position.y],
			[tangentPoint.x, tangentPoint.y],
			t => Matter.Body.setPosition (
				this.body,
				{ x: t[0], y: t[1] }
			),
			distanceBetween(position, tangentPoint) / this.parent.speed
		).then(() => {
			this.circling = true
		})
	}

	// Pass damage onto parent.
	getHit(damage, weapon = null, col = null, forceDamageType = null)
	{
		return this.parent.getHit(damage, weapon, col, forceDamageType)
	}

	update()
	{
		if (!this.circling || isPaused()) return
		Matter.Body.setPosition(
			this.body,
			Vector.add(
				Vector.rotate(
					{x: scalePix(distanceFromCenter), y: 0},
					this.parent.currentAngle - this.index * bodySegmentAngleDifference
				),
				screenCenter
			)
		)
	}

	on_render()
	{
		if (!Matter.Bounds.overlaps(this.body.bounds, screenBounds)) return
		this.circling ?
			drawTriangleCircling(this.radius, this.body.position) :
			drawTriangleSpawn(this.radius, this.body.position, this.parent.directionOfSpawn)
	}
}

class JormReticle extends Entity
{
	reset(position)
	{
		super.reset()
		this.active = true
		this.wordOffset = scalePix(40)
		this.cyphered = false
		this.position = position
		this.rotation = Random.uniform(180, 180)
		this.ready = false
		this.alpha = 0
		this.overlapOpacity = 1
		this.currentSize = scalePix(200)
		this.targetSize = scalePix(10)
		this.refreshWord()
		this.tween = new FastTween(Easing.Linear)
		new PausableTween()
			.easeIn([this.currentSize, 0], [this.targetSize, 1], t => { this.currentSize = t[0]; this.alpha = t[1] }, 40)
			.then(() => { this.ready = true })
	}
	
	getType()
	{
		return type.recticle
	}

	omenOpacity() { return 1 }

	refreshWord(regenerateWordDelay = false)
	{
		// Get new word + quicktime sequence.
		addWord(this)

		// If this is not the word enemy spawned with, do regeneration animation.
		if (regenerateWordDelay)
		{
			this.regeneratingWord = true
			this.wordRegenPercentage = 0

			if (enemyWordRegen)
				Sphere.sleep(10)
					.then(() => {
						this.tween.easeIn([0], [1], t => { if (this.regeneratingWord) { this.wordRegenPercentage = t[0] } }, 10)
							.then(() => this.regeneratingWord = false)
					})
		}
		else this.wordRegenPercentage = 1

		// Update display.
		this.updateWordDisplay(2)
	}

	// Count how many characters match in both word and quicktime sequence.
	updateWordDisplay(which, clearInactive = false)
	{
		let result = control.updateWordDisplay(this, which, clearInactive)
		return result
	}

	on_update()
	{
		if (isPaused()) return
		this.rotation += 5
	}

	getPosition()
	{
		return this.position
	}

	on_render()
	{
		for (let i = 0; i < 4; i++)
		{
			recticleTriangle.transform.identity()
			recticleTriangle.transform.scale(scalePix(20), scalePix(20))
			recticleTriangle.transform.translate(this.currentSize, 0)
			recticleTriangle.transform.rotate(i * 90 + this.rotation)
			recticleTriangle.transform.translate(this.position.x, this.position.y)
			recticleTriangle.draw(Surface.Screen)
		}
		if (!this.ready) return
		renderWord(this, false)
	}
}

class InstaLetters extends Entity
{
	constructor()
	{
		super()
		this.damage = 100
	}

	reset(letter, quicktime, position, parent)
	{
		this.position = position
		this.velocity = Vector.mult(Vector.normalise(Vector.sub(screenCenter, position)), scalePix(Random.uniform(.8, .2)))
		this.letter = letter
		this.quicktime = quicktime
		this.parent = parent
	}

	on_update()
	{
		if (isPaused() || powerup_freeze) return
		let nextPosition = Vector.add(this.position, this.velocity)
		let collisions = Matter.Query.ray(friendlyBodies, this.position, nextPosition)
		if (collisions.length > 0)
		{
			currentTurret.getHit(this.damage)
			factory.spawn(Impact, this.position.x, this.position.y)
			this.destroy()
		}
		this.position = nextPosition
	}

	destroy()
	{
		for (let i = 0; i < 10; i++)
			factory.spawn(Debris, this.position.x, this.position.y)
		this.parent.instaLetters.splice(this.parent.instaLetters.findIndex(insta => insta[0] == this.letter), 1)
		this.stop()
	}

	on_render()
	{
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

		PrimNative.drawFilledCircle(Surface.Screen, this.position.x, this.position.y, scalePix(25), secondColor)
		font.drawText(Surface.Screen, this.position.x - font.widthOf(text) / 2, this.position.y - font.height / 2, text, paleYellow)
	}
}
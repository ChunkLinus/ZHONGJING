import { Matter, Random, Easing, Prim } from 'sphere-runtime'
import { Entity } from '../core/entityFactory.js'
import { Debris } from '../effects/debris.js'
import { Damage } from '../effects/damage.js'
import { WarderProtection } from './warderProtection.js'
import { Scalers } from '../data/difficultyScalers.js'
import { FastTween } from '../core/fastTween.js'
import { GiveWeapon } from '../data/weaponsList.js'
import { triggerDoubleDamage } from '../pickups/doubleDamage.js'
import { resolveOverlaps } from '../libs/avoid-overlap.js'

// Status Effects
import { BleedEffect } from '../effects/bleed.js'
import { StaticEffect } from '../effects/static.js'
import { Snowflakes } from '../effects/snowflakes.js'
import { IgniteEffect } from '../effects/ignite.js'
import { BlightEffect } from '../effects/blight.js'
import { DirectedArc } from '../effects/directedArc.js'
import { QwertyToZhuyin } from '../data/zhuyin.js'

// Draw partially matched character.
const drawPartialMatch = function(obj, x, y, charIndex, font, perc, opacity)
{
	let startX = font.widthOf(obj.word.slice(0, charIndex))
	let partialCharWidth = font.widthOf(obj.word[charIndex])
	let partialMatchWidth = partialCharWidth * perc
	Prim.blitSection(Surface.Screen, x + startX, y, obj.wordSurface, startX, 0, partialMatchWidth, font.height, darkGray.fadeTo(opacity))
	Prim.blitSection(Surface.Screen, x + startX + partialMatchWidth, y, obj.wordSurface, startX + partialMatchWidth, 0, partialCharWidth - partialMatchWidth, font.height, midGray.fadeTo(.5 * opacity))
}

// Print word to screen.
const printToScreen = function(obj, string, matching, font, posX, posY, stalkerCoverWord = false)
{
	// Calculate final opacity mult.
	let opacity = obj.omenOpacity() * ui.inGameWordOpacity * obj.overlapOpacity

	// Get temp vars.
	let renderedCount = Math.floor(string.length * obj.wordRegenPercentage)
	let revealedLength = usingController || isEastAsianPrimaryDisplay ? 1 : 2

	// If matched text exists.
	if (matching > 0)
	{
		let partialMatch = matching % 1
		matching = partialMatch == 0 ? matching : Math.floor(matching)
		let matchedString = string.slice(0, Math.min(matching, renderedCount))
		let partialMatchedString = string.slice(matching, matching + (partialMatch > 0))
		let unmatchedString = string.slice(matching + (partialMatch > 0), renderedCount)

		// Draw matching text.
		font.drawText(Surface.Screen, posX, posY, matchedString, darkGray.fadeTo(opacity))

		// If Stalker.
		if (stalkerCoverWord && renderedCount > matching + revealedLength)
		{
			// Draw partially matched text (if any)
			if (partialMatchedString.length > 0 && obj.wordSurface)
				drawPartialMatch(obj, posX, posY, matching, font, partialMatch, opacity)

			// Draw unmatched text.
			let koreanPartialUnderHalf = isEastAsianPrimaryDisplay && partialMatch && partialMatch < .5
			let visibleUnmatched = koreanPartialUnderHalf ? "" : unmatchedString.slice(0, revealedLength)
			font.drawText(
				Surface.Screen,
				posX + font.widthOf(matchedString + partialMatchedString),
				posY,
				visibleUnmatched,
				midGray.fadeTo(0.5 * opacity)
			)

			// Draw Stalker rectangle.
			PrimNative.drawFilledRectangle(
				Surface.Screen,
				posX + font.widthOf(matchedString + partialMatchedString + visibleUnmatched),
				posY,
				posX + font.widthOf(string.slice(0, renderedCount)),
				posY + font.height,
				midGray.fadeTo(0.5 * opacity)
			)
		}

		// If regular enemy.
		else
		{
			// Draw partially matched text (if any)
			if (partialMatchedString.length > 0 && obj.wordSurface)
				drawPartialMatch(obj, posX, posY, matching, font, partialMatch, opacity)

			// Draw unmatched text.
			font.drawText(
				Surface.Screen,
				posX + font.widthOf(matchedString + partialMatchedString),
				posY,
				unmatchedString,
				midGray.fadeTo(0.5 * opacity)
			)
		}
	}
	
	// If no matches.
	else
	{
		if (stalkerCoverWord && renderedCount > revealedLength)
		{
			let visibleText = string.slice(0, revealedLength)
			font.drawText(Surface.Screen, posX, posY, visibleText, midGray.fadeTo(.5 * opacity))
			PrimNative.drawFilledRectangle(
				Surface.Screen,
				posX + font.widthOf(visibleText),
				posY,
				posX + font.widthOf(string.slice(0, renderedCount)),
				posY + font.height,
				midGray.fadeTo(.5 * opacity)
			)
		}
		else font.drawText(
			Surface.Screen,
			posX,
			posY,
			string.slice(0, renderedCount),
			midGray.fadeTo(0.5 * opacity)
		)
	}
}

export const renderWord = function(obj, stalkerCoverWord)
{
	// Grab object position and apply overlap offset for word rendering.
	let pos = obj.getPosition()
	if (obj.overlapOffset)
		pos = { x: pos.x + obj.overlapOffset.x, y: pos.y + obj.overlapOffset.y }

	// If grace period after enemy dies & no character matches, don't print anything to screen.
	if (!obj.active && obj.numMatchingLetters == 0 && obj.numMatchingQuicktimeSymbols == 0)
		return
	
	// Print quicktime sequence on screen.
	let word, font
	if (usingController)
	{
		let cypherQuicktimeString = obj.cyphered && obj.cypherGlitchEffectCountdown <= 0 ?
			getCypherQuicktime(obj.cypherQuicktimeString.length, null, false) :
			obj.cypherQuicktimeString
		word = getQuickTimeString(obj.cyphered ? cypherQuicktimeString : obj.quicktime)
		font = quicktimeFont
		/*伤寒论强制阻断拼音渲染*/
		/*printToScreen(
			obj,
			word,
			obj.numMatchingQuicktimeSymbols,
			font,
			pos.x - font.widthOf(word) / 2,
			pos.y - obj.wordOffset - quicktimeFont.height,
			stalkerCoverWord
		)
			*/
	}

	// Else, print word on screen.
	else
	{
		// Exception for Korean.
		let matchingLetters
		if (isGameKorean)
		{
			font = regularEastAsianLarge
			if (obj.cyphered)
			{
				word = obj.cypherGlitchEffectCountdown <= 0 ?
					[...Array(obj.variantString.length)].map(() => Random.sample(Object.keys(koreanToQwerty))).join("") :
					Array.from(obj.variantString).map(char => qwertyToKorean[char]).join("")
				matchingLetters = obj.variantMatches
			}
			else
			{
				word = obj.word
				matchingLetters = obj.numMatchingLetters
			}
		}

		// If East Asian primary display.
		else if (isEastAsianPrimaryDisplay && !obj.cyphered)
		{
			font = regularEastAsianLarge
			word = obj.word
			matchingLetters = obj.numMatchingLetters
		}

		// All other languages.
		else
		{
			font = typingFontLarge
			word = obj.cyphered && obj.cypherGlitchEffectCountdown <= 0 ? 
				[...Array(obj.variantString.length)].map(() => Random.sample(alphabets)).join("") :
				obj.variantString
			matchingLetters = obj.variantMatches
		}
		
		// Print pinyin on top of words if Simplified Chinese.
		let chinesePhoneticsDisplayHeight = 0
		if (!obj.cyphered && isGameSimplifiedChinese && obj.displayedPinyin && false)
			//条件加了&&flase永不触发
		{
			chinesePhoneticsDisplayHeight = typingFontMedium.height
			printToScreen(
				obj,
				obj.displayedPinyin,
				obj.variantMatches + Math.floor(obj.numMatchingLetters),
				typingFontMedium,
				pos.x - typingFontMedium.widthOf(obj.displayedPinyin) / 2,
				pos.y - obj.wordOffset - font.height - typingFontMedium.height,
				stalkerCoverWord
			)
		}

		// Print zhuyin on top of words if Tradiational Chinese.
		else if (!obj.cyphered && isGameTraditionalChinese && obj.displayedPinyin)
		{
			chinesePhoneticsDisplayHeight = regularEastAsianExtraSmall.height
			const zhuyin = obj.displayedPinyin
				.split("")
				.map(char => QwertyToZhuyin[char])
				.join("")
				
			printToScreen(
				obj,
				zhuyin,
				obj.variantMatches + Math.floor(obj.numMatchingLetters),
				regularEastAsianExtraSmall,
				pos.x - regularEastAsianExtraSmall.widthOf(zhuyin) / 2,
				pos.y - obj.wordOffset - font.height - regularEastAsianExtraSmall.height,
				stalkerCoverWord
			)
		}

		// Print secondary text on top if any.
		if (obj.secondaryText && !stalkerCoverWord && !obj.cyphered)
			secondaryTextFont.drawText(
				Surface.Screen,
				pos.x - secondaryTextFont.widthOf(obj.secondaryText) / 2,
				pos.y - obj.wordOffset - font.height - secondaryTextFont.height - (obj.doubleWord ? scalePix(5) : 0) - chinesePhoneticsDisplayHeight,
				obj.secondaryText,
				midGray.fadeTo(obj.omenOpacity() * .5 * ui.inGameWordOpacity * obj.wordRegenPercentage * obj.overlapOpacity)
			)


		// --- 【伤寒论核心干预：原生级视觉复刻与多行渲染】 ---
		if (obj.shanghanQuestion && !stalkerCoverWord && !obj.cyphered) {
			// 1. 窃取原版透明度与颜色算法 (原版未匹配的文字是 midGray 并非纯白)
			let opacity = obj.omenOpacity() * ui.inGameWordOpacity * obj.overlapOpacity;
			let nativeColor = midGray.fadeTo(0.5 * opacity); 

			// 2. 窃取原版“打字机浮现”动画逻辑
			// 这会让经文在怪物刚刷出来时，像原版汉字一样逐字浮现，而不是生硬地突然贴在屏幕上
			let renderedCount = Math.floor(obj.shanghanQuestion.length * obj.wordRegenPercentage);
			let visibleQuestion = obj.shanghanQuestion.slice(0, renderedCount);

			// 3. 动态双行宽屏排版
			let lines = [];
			// 设定阈值：如果当前显示的字数在 16 字以内，保持单行直出；超过则从中间切断，最多两行。
			if (visibleQuestion.length <= 16) {
				lines.push(visibleQuestion);
			} else {
				let splitPoint = Math.ceil(visibleQuestion.length / 2);
				lines.push(visibleQuestion.slice(0, splitPoint));
				lines.push(visibleQuestion.slice(splitPoint));
			}

			// 4. 坐标锚定：直接接管原本汉字所在的 Y 轴位置，向下展开
			let currentY = pos.y - obj.wordOffset - font.height;

			// 执行原生级绘制
			for (let l of lines) {
				font.drawText(
					Surface.Screen,
					pos.x - font.widthOf(l) / 2,
					currentY,
					l,
					nativeColor
				);
				currentY += font.height;
			}
		} else {
			// 原版逻辑兜底
			printToScreen(
				obj,
				word,
				matchingLetters,
				font,
				pos.x - font.widthOf(word) / 2,
				pos.y - obj.wordOffset - font.height,
				stalkerCoverWord
			)
		}
	} // <--- 确保保留这个闭合大括号！

	
	// Draw box and power of 2 if double word.
	if (obj.doubleWord)
	{
		PrimNative.drawRectangle(
			Surface.Screen,
			pos.x - font.widthOf(word) / 2 - scalePix(10),
			pos.y - obj.wordOffset - font.height - scalePix(5),
			pos.x + font.widthOf(word) / 2 + scalePix(10),
			pos.y - obj.wordOffset + scalePix(5),
			2,
			midGray.fadeTo(.5 * ui.inGameWordOpacity * obj.overlapOpacity)
		)
		typingFontLarge.drawText(
			Surface.Screen,
			pos.x + font.widthOf(word) / 2 + scalePix(15),
			pos.y - obj.wordOffset - font.height - scalePix(10),
			"²",
			midGray.fadeTo(.5 * ui.inGameWordOpacity * obj.overlapOpacity)
		)
	}
}

export class Enemy extends Entity
{
	static isElite() { return false }
	static isSpecial() { return false }
	
	getType() { return type.enemy }
	constructor(radius = 0)
	{
		// Superclass constructor.
		super()

		// Settings.
		this.isElite = false
		this.isSpecial = false
		this.isChild = false
		this.isSpawnLaneBlocker = false
		this.canSpawnPowerups = true
		this.alwaysShowHealth = false

		// Declare vars.
		this.children = []
		this.radius = radius
		this.experience = 0
		this.coins = 0
		this.protection = null

		// Health variables.
		this.health = 200
		this.currentHealth = 100

		// Shield variables.
		this.shield = 0
		this.currentShield = 0
		this.shieldDelay = 30
		this.currentShieldDelay = 0
		this.shieldRegen = 2

		// UI variables.
		this.wordOffset = scalePix(30)
		this.healthbarOffset = scalePix(20)
		this.healthBarThickness = scalePix(3)

		// Typing variables.
		this.cyphered = false
		this.wpmTimeStart = 0
		this.gracePeriod = false
		this.wordRegenPercentage = 0
		this.wordBounds = Matter.Bounds.create(Array(4).fill().map(u => ({ x: 0, y: 0 })))
		this.regeneratingWord = false

		// Status Effect collection.
		this.statusEffects = []

		// Heat Ray damage stack variables.
		this.heatRayCooldown = 0
		this.heatRayStacks = 0

		// Speed variables.
		this.minSpeed = 0
		this.maxSpeed = 1
		this.currentSpeed = 0

		// Cypher vars.
		this.cypherGlitchEffectCountdown = 0

		// Display vars for words.
		this.numMatchingLetters = 0
		this.numMatchingQuicktimeSymbols = 0

		// Physics body.
		this.body = radius > 0 ? circleCollider(radius, {category: hostile}) : null

		// Regenerate word delay.
		this.tween = new FastTween(Easing.Linear)

		// Overlapping words fading.
		this.overlapMinOpacity = .4
		this.overlapTweenDirection = 0
		this.overlapOpacityTween = new FastTween(Easing.Linear)
		this.overlapProcessed = false
		this.overlapOffset = { x: 0, y: 0 }
	}

	reset(threat = 0, genWord = true, assignLane = true)
	{
		this.cyphered = false
		this.weakened = false
		if (genWord) this.refreshWord()
		this.active = true
		this.threat = threat
		this.doubleWord = false
		this.overlapOpacity = 1
		
		if (this.body)
		{
			if (assignLane)
			{
				let results = spawner.getSpawnPositionAndSpeed(this)
				if (!results)
				{
					spawner.removeThreat(this)
					this.active = false
					this.cease()
					return
				}

				this.currentSpeed = results.speed
				Matter.Body.setPosition(this.body, results.position)
			}

			Matter.World.add(physics.world, this.body)
			addHostile(this)
		}
	}

	addStatusEffect(status)
	{
		let existingStatus = this.statusEffects.find(se => se[0] == status)
		switch(status)
		{
			case "explosiveStatus":
				break

			case "heatStatus":
				if (existingStatus)
					existingStatus[1] = getExistingWeapon("Ignite").mod.duration
				else
				{
					if (!getExistingWeapon("Ignite"))
						GiveWeapon("Ignite")
					this.statusEffects.push([
						status,
						getExistingWeapon("Ignite").mod.duration,
						factory.spawn(IgniteEffect, this, this.radius * (this.largeEnemy ? this.largeEnemy : 1))
					])
					
					// If Pyromancy augment.
					if ("augment_pyromancy" in activeAugments)
						getExistingWeapon("Ignite").applyPyromancyBonusDamage(this)
				}
				break
			
			case "coldStatus":
				let coldModifier = modifiers.allModifiers.global.perc.totalModifier.duration
					+ "cold" in modifiers.allModifiers ? modifiers.allModifiers.cold.perc.totalModifier.duration : 0
				if (existingStatus)
					existingStatus[1] = 300 * (1 + coldModifier)
				else
				{
					this.statusEffects.push([
						status,
						300 * (1 + coldModifier),
						factory.spawn(Snowflakes, this, false)
					])
				}
				break

			case "chemicalStatus":
				if (existingStatus)
					existingStatus[1] = getExistingWeapon("Blight").mod.duration
				else
				{
					if (!getExistingWeapon("Blight"))
						GiveWeapon("Blight")
					this.statusEffects.push([
						status,
						getExistingWeapon("Blight").mod.duration,
						factory.spawn(BlightEffect, this, this.radius * (this.largeEnemy ? this.largeEnemy : 1))
					])
				}
				break

			case "kineticStatus":
				if (existingStatus)
					existingStatus[1] = getExistingWeapon("Bleeding").mod.duration
				else
				{
					if (!getExistingWeapon("Bleeding"))
						GiveWeapon("Bleeding")
					this.statusEffects.push([
						status,
						getExistingWeapon("Bleeding").mod.duration,
						factory.spawn(BleedEffect, this, this.radius * (this.largeEnemy ? this.largeEnemy : 1))
					])
				}
				break

			case "electricStatus": 
				if (existingStatus)
					existingStatus[1] = getExistingWeapon("Static").mod.duration
				else
				{
					if (!getExistingWeapon("Static"))
						GiveWeapon("Static")
					this.statusEffects.push([
						status,
						getExistingWeapon("Static").mod.duration,
						factory.spawn(StaticEffect, this, this.radius * (this.largeEnemy ? this.largeEnemy : 1))
					])
				}
				break
			
			case "restrictedArea":
				if (existingStatus)
					existingStatus[1] = (3600 / getExistingWeapon("Tesla").mod.rateOfFire) + 1
				else
				{
					this.statusEffects.push([
						status,
						(3600 / getExistingWeapon("Tesla").mod.rateOfFire) + 1,
						null
					])
				}
		}
	}

	// Get absolute world bounds
	getAbsoluteBounds(entity) {
		return {
			min: Vector.add(entity.getPosition(), entity.wordBounds.min),
			max: Vector.add(entity.getPosition(), entity.wordBounds.max)
		}
	}

	// Handle opacity transitions
	transitionOpacity(target, direction) {
		if (this.overlapTweenDirection === direction) return
		this.overlapTweenDirection = direction
		const targetVal = direction === -1 ? this.overlapMinOpacity : 1
		
		this.overlapOpacityTween.easeIn([this.overlapOpacity], [targetVal], t => this.overlapOpacity = t[0], 10)
			.then(() => this.overlapTweenDirection = 0)
	}

	// Handle overlaps.
	handleOverlap()
	{
		const pos = this.getPosition()

		// If "Avoid Overlap" option disabled, fade on overlap.
		if (!avoidOverlap) {
			const bounds = this.getAbsoluteBounds(this)
			const myDist = distanceBetween(pos, screenCenter)

			const isOverlapped = hostilesArray.some(enemy => {
				if (enemy.getType() !== type.enemy || !enemy.word) return false
				return Matter.Bounds.overlaps(bounds, this.getAbsoluteBounds(enemy)) &&
					myDist > distanceBetween(enemy.getPosition(), screenCenter)
			})

			if (isOverlapped && this.overlapOpacity > this.overlapMinOpacity) {
				this.transitionOpacity(this.overlapMinOpacity, -1)
			} else if (!isOverlapped && this.overlapOpacity < 1) {
				this.transitionOpacity(1, 1)
			}
			return
		}

		// Else, avoid overlap.
		const lerpSpeed = 0.01
		const neighborDist = scalePix(260)

		const items = hostilesArray
			.filter(e => e.getType() === type.enemy && e.word && distanceBetween(pos, e.getPosition()) <= neighborDist)
			.map(e => ({
				bounds: this.getAbsoluteBounds(e),
				priority: -distanceBetween(e.getPosition(), screenCenter),
				entity: e
			}))

		if (items.length > 1) {
			const offsets = resolveOverlaps(items, { maxOffset: scalePix(100) })
			for (const [enemy, target] of offsets) {
				enemy.overlapOffset.x += (target.x - enemy.overlapOffset.x) * lerpSpeed
				enemy.overlapOffset.y += (target.y - enemy.overlapOffset.y) * lerpSpeed
			}
		} else {
			// Return to zero
			this.overlapOffset.x *= (1 - lerpSpeed)
			this.overlapOffset.y *= (1 - lerpSpeed)
		}
	}

	on_update()
	{
		if (this.active && !isPaused())
		{
			// --- 【伤寒论核心：个体动能劫持】 ---
			if (this.shanghanBaseSpeed === undefined) {
				this.shanghanBaseSpeed = this.currentSpeed || 0;
			}

			let isPunished = (global.shanghanTimeScale > 1);
			let isLocked = (this.numMatchingLetters > 0);

			if (isLocked && !isPunished) {
				// 专注锁定且未打错：死死钉在原地
				this.currentSpeed = 0;
				if (this.body) Matter.Body.setVelocity(this.body, {x:0, y:0}); 
			} else {
				// 未锁定，或触发了错字惩罚：适用全局倍率
				this.currentSpeed = this.shanghanBaseSpeed * (global.shanghanTimeScale !== undefined ? global.shanghanTimeScale : 1);
			}

			// Fire update function. (仅被钉住时跳过物理刷新，防止冲突)
			if (!(isLocked && !isPunished) && 
				!powerup_freeze &&
				!this.statusEffects.some(status => status[0] == "coldStatus") &&
				!(	this.isChild &&
					this.parent &&
					this.parent.statusEffects.some(status => status[0] == "coldStatus"))
			)
				this.update()
			// --- 【动能劫持结束】 ---

			// Heat Ray Cooldown.
			if (this.heatRayCooldown > 0) this.heatRayCooldown--
			else if (this.heatRayStacks > 0) this.heatRayStacks = 0

			// Progress status effects.
			let dealConduitDamage = false
			for (let i = 0; i < this.statusEffects.length; i++)
			{
				// If Overmind Null Field II and targeted.
				if (
					currentTurret &&
					currentTurret.constructor.name == "Overmind" &&
					currentTurret.nullField == 2 &&
					currentTurret.currentTargets.some(target => target == this) &&
					!this.statusEffects[i][0] == "electricStatus"
				)
					continue

				// Wildcard Conduit II and frozen.
				if (
					currentTurret &&
					currentTurret.constructor.name == "Wildcard" &&
					currentTurret.conduit == 2 &&
					this.statusEffects[i][0] == "coldStatus" &&
					currentTurret.amplifiers.includes(this)
				)
					dealConduitDamage = true

				// Else progress as normal.
				if (--this.statusEffects[i][1] <= 0)
				{
					// If enemy is frozen by Wildcard.
					if (
						currentTurret &&
						currentTurret.constructor.name == "Wildcard" &&
						this.statusEffects[i][0] == "coldStatus" &&
						currentTurret.amplifiers.includes(this)
					)
						currentTurret.amplifiers.splice(currentTurret.amplifiers.indexOf(this), 1)

					// Expire status effect.
					if (this.statusEffects[i][2]) this.statusEffects[i][2].terminate = true
					this.statusEffects[i] = this.statusEffects[this.statusEffects.length - 1]
					this.statusEffects.pop()
					i--
				}
			}

			// Deal damage after processing status effects as enemy could die and clear status effects
			if (dealConduitDamage)
				currentTurret.electricTurretDamage(this.getPosition(), currentTurret.conduit2Cooldown == 0)

			// Handle overlap.
			this.handleOverlap()

			// Check if within boss cypher range.
			if (this.cyphered)
			{
				if (--this.cypherGlitchEffectCountdown < -5)
					this.cypherGlitchEffectCountdown = Random.discrete(50, 90)

				if (!(boss && boss.constructor.name == "Cypher") || distanceBetween(this.getPosition(), boss.getPosition()) > boss.range)
				{
					this.cyphered = false
					if (this.word)
						this.updateWordDisplay(2)
				}
			}

			if (this.weakened)
			{
				let turretsInRange = [...allWeapons, currentTurret].filter(weap => {
					return weap.constructor.nonDamageTags().includes("tag_turret") &&
						weap.children.some(child => distanceBetween(child.position, this.getPosition()) <= weap.mod.range)
				})
				if (turretsInRange.length <= 0)
					this.weakened = false
			}
		}
	}
	update() {} 

	updateWordBounds()
	{
		let font, word
		if (usingController)
		{
			font = quicktimeFont
			word = getQuickTimeString(this.cyphered ? this.cypherQuicktimeString : this.quicktime)
		}
		else if (isGameKorean)
		{
			font = regularEastAsianLarge
			word = this.cyphered ? this.variantString : this.word
		}
		else if (isEastAsianPrimaryDisplay && !this.cyphered)
		{
			font = regularEastAsianLarge
			word = this.word
		}
		else
		{
			font = typingFontLarge
			word = this.variantString
		}
		if (!word) return
		const halfWidth = avoidOverlap ? font.widthOf(word) * .5 + scalePix(5) : font.widthOf(word) * .4
		this.wordBounds.min.x = -halfWidth
		this.wordBounds.min.y = -this.wordOffset - font.height * (avoidOverlap ? 1 : .7)
		this.wordBounds.max.x = halfWidth
		this.wordBounds.max.y = -this.wordOffset - (avoidOverlap ? 0 : font.height * .3)
	}

	setHealth(health)
	{
		const scaledHealth = health * Scalers.enemyHealth * (omenLevel >= 4 ? 2 : omenLevel >= 1 ? 1.5 : 1)
		this.currentHealth = scaledHealth
		this.health = scaledHealth
	}

	setShield(shield)
	{
		this.currentShield = shield
		this.shield = shield
	}

	setProtected(status)
	{
		if (status)
		{
			if (this.protection == null)
				this.protection = factory.spawn(WarderProtection, this)
		}
		else
		{
			if (this.protection != null)
			{
				this.protection.stop()
				this.protection = null
			}
		}
	}

	doubleWordComplete()
	{
		this.doubleWord = false
		audioHandler.playAudioHook("double_word_complete")
		// TODO: Trigger some anims.
	}

	refreshWord(regenerateWordDelay = false)
	{
		// Get new word + quicktime sequence.
		addWord(this)

		// If East Asian primary display & Stalker, make sure it's not a one character word.
		if (isEastAsianPrimaryDisplay && this.constructor.name.includes("Stalker"))
			while (this.word.length <= 1)
				addWord(this)

		// If this is not the word enemy spawned with, do regeneration animation.
		if (regenerateWordDelay)
		{
			this.regeneratingWord = true
			this.wordRegenPercentage = 0

			if (enemyWordRegen)
				Sphere.sleep(10)
					.then(() => {
						
						// Play special audio if Cypher regenerating.
						if (this.constructor.name == "Cypher")
							audioHandler.playAudioHook("cipher_shuffle", getPanFromX(this.body.position.x))

						// Regenerate word.
						this.tween.easeIn([0], [1], t => { if (this.regeneratingWord) { this.wordRegenPercentage = t[0] } }, 10)
							.then(() => this.regeneratingWord = false)
					})
		}
		else this.wordRegenPercentage = 1

		// Update display.
		this.updateWordDisplay(2)
	}

	calculateShield()
	{
		if (--this.currentShieldDelay <= 0)
			if (this.currentShield < this.shield)
				this.currentShield += this.shieldRegen
	}

	spawnDebris()
	{
		let position = this.getPosition()
		for (let i = 0; i < 10; i++)
			factory.spawn(Debris, position.x, position.y)
	}

	destroy()
	{
		spawner.removeThreat(this)
		this.spawnDebris()
		this.statusEffects.forEach(status => status[2] ? status[2].terminate = true : null)
		this.statusEffects = []
		this.active = false
		this.cease(false)

		// Remove from wildcard if applicable.
		if (currentTurret && currentTurret.constructor.name == "Wildcard" && currentTurret.amplifiers.includes(this))
			currentTurret.amplifiers.splice(currentTurret.amplifiers.indexOf(this), 1)
		
		// Give a grace period of .2 seconds after an enemy dies before disabling word.
		this.gracePeriod = true
		Sphere.sleep(15).then(() => {
			if (this.gracePeriod && this.numMatchingLetters == 0 && this.numMatchingQuicktimeSymbols == 0)
				this.stop()
		})
	}

	on_shutDown()
	{
		this.gracePeriod = false
		this.cease()
	}
	
	cease(clearWord = true)
	{
		this.children.forEach((child) => { child.stop() })
		this.children = []
		this.doubleWord = false
		if (clearWord)
			removeWord(this)
		if (this.protection != null)
		{
			this.protection.stop()
			this.protection = null
		}
		if (this.body && hostiles.has(this.body.id))
		{
			Matter.World.remove(physics.world, this.body)
			removeHostile(this)
		}
	}

	suspend()
	{
		if (this.running)
			this.stop()
	}

	getPosition()
	{
		return this.body ? this.body.position : this.position
	}

	renderWordAndHealth(stalkerCoverWord = false, splitHealth = 1, _renderWord = true, markerPos = null)
	{
		let pos = this.getPosition()
		if (
			this.active &&
			(
				this.alwaysShowHealth ||
				this.currentShield < this.shield ||
				this.currentHealth < this.health

			)
		)
		{
			// Print Shield (if any)
			let shieldOffset = 0
			let healthBarWidth = Math.max(this.radius * 2, scalePix(20))
			if (this.shield > 0)
			{
				shieldOffset += this.healthBarThickness * 1.5
				drawProgress(
					pos.x,
					pos.y + this.radius + this.healthbarOffset * (this.largeEnemy ? this.largeEnemy : 1),
					healthBarWidth,
					this.healthBarThickness,
					this.currentShield / this.shield
				)
			}

			// Print Health.
			if (this.health > 0)
			{
				let splitHealthOffset = 0
				let perBarMaxHealth = this.health / splitHealth
				for (let i = 0; i < splitHealth; i++)
				{
					let currentBar = Math.floor(this.currentHealth / perBarMaxHealth)
					if (i != currentBar)
						drawProgress (
							pos.x,
							pos.y + splitHealthOffset + this.radius + (this.healthbarOffset * (this.largeEnemy ? this.largeEnemy : 1)) + shieldOffset,
							healthBarWidth,
							this.healthBarThickness,
							i < currentBar ? 1 : 0
						)
					else
						drawProgress (
							pos.x,
							pos.y + splitHealthOffset + this.radius + (this.healthbarOffset * (this.largeEnemy ? this.largeEnemy : 1)) + shieldOffset,
							healthBarWidth,
							this.healthBarThickness,
							(this.currentHealth % perBarMaxHealth) / perBarMaxHealth
						)
					splitHealthOffset += this.healthBarThickness * 1.5
				}

				// Draw marker on health bar if required.
				if (markerPos && markerPos <= this.health)
				{
					let barNumber, markerPerc
					if (markerPos == this.health)
					{
						barNumber = splitHealth - 1
						markerPerc = 1
					}
					else
					{
						barNumber = Math.floor(markerPos / perBarMaxHealth)
						markerPerc = (markerPos % perBarMaxHealth) / perBarMaxHealth
					}
					let markerPosition = {
						x: pos.x - healthBarWidth / 2 + markerPerc * healthBarWidth,
						y: pos.y + this.radius + this.healthBarThickness * 1.5 * barNumber + this.healthbarOffset
					}
					PrimNative.drawLine(
						Surface.Screen,
						markerPosition.x,
						markerPosition.y - this.healthBarThickness * .66,
						markerPosition.x,
						markerPosition.y + this.healthBarThickness * .66,
						scalePix(2),
						darkGray
					)
				}
			}
		}

		if (_renderWord)
			renderWord(this, stalkerCoverWord)
	}

	omenOpacity()
	{
		let opacity = 1
		if (omenLevel >= 6)
		{
			let distance = distanceBetween(this.getPosition(), screenCenter)
			if (distance > scalePix(750))
				opacity = 0
			else if (distance > scalePix(650))
				opacity = 1 - ((distance - scalePix(650)) / scalePix(100))
		}
		return opacity
	}

	// Count how many characters match in both word and quicktime sequence.
	updateWordDisplay(which, clearInactive = false)
	{
		let result = control.updateWordDisplay(this, which, clearInactive)
		this.updateWordBounds()
		return result
	}

	isSlowed()
	{
		return (
			this.statusEffects.find(se => se[0] == "chemicalStatus")
			|| (
				currentTurret &&
				currentTurret.constructor.name == "SplatterShot" &&
				currentTurret.isPositionInSplatterZone(this.getPosition()) > 0
			)
			|| (
				currentTurret &&
				currentTurret.constructor.name == "Overmind" &&
				currentTurret.nullField > 0 &&
				currentTurret.currentTargets.some(target => target == this)
			)
		)
	}

	getHit(damage, weapon = null, col = null, forceDamageType = null)
	{
		// Weapon specific procs.
		let isCrit = false
		if (weapon)
		{
			// If Crit.
			let damageBonus = 1
			isCrit = weapon.isCrit(this)
			if (isCrit)
				damageBonus = weapon.mod.critMult

			// If Infused Ammo.
			if ("augment_infusedAmmo" in activeAugments && isCrit && weapon.allDamageTags.includes("tag_kinetic"))
			{
				if (Random.chance(0.4)) {
					const pool = ["heat", "cold", "chemical", "electric", "kinetic"];
					const randomType = Random.sample(pool);
					this.addStatusEffect(randomType + "Status");
				}
			}

			// If Weakened Augment.
			if (this.weakened && weapon != this.weakened)
				damageBonus += .3
			
			// If Double/Triple Damage Powerup.
			if (powerups.some(powerup => powerup.constructor.name == "DoubleDamage"))
				damageBonus += "item_tripleDamage" in serializedLoot ? 2 : 1
			
			// If Fracture Loot.
			if ("item_fracture" in serializedLoot && (powerup_freeze || this.statusEffects.some(status => status[0] == "coldStatus")))
				damageBonus += .5

			// If Blazing Glory Augment.
			if ("augment_blazingGlory" in activeAugments && weapon.allDamageTags.includes("tag_heat"))
				damageBonus += .25

			// If Far/Near damage mod.
			if (weapon.mod.farDamage != 0 || weapon.mod.nearDamage != 0)
			{
				// Check range.
				let range = distanceBetween(screenCenter, this.getPosition())

				// If Close Combat Augment, all Remote damage is considered close-range.
				let closeCombatAugment =
					"augment_closeCombat" in activeAugments
					&& weapon.constructor.nonDamageTags().includes("tag_remote")
				
				// Long-range damage bonus.
				if (range >= longRange && weapon.mod.farDamage != 0 && !closeCombatAugment)
					damageBonus += weapon.mod.farDamage

				// Close-range damage bonus.
				else if ((range < longRange || closeCombatAugment) && weapon.mod.nearDamage != 0)
					damageBonus += weapon.mod.nearDamage
			}

			// Determine damage types.
			// If forceDamageType is specified, override all damage types with it.
			// Otherwise, use weapon's damage types with modifiers applied.
			// forceDamageType can be a string or an array of strings.
			let damageTypes = forceDamageType == null ?
				modifiers.damageTypes :
				Array.isArray(forceDamageType) ?
					forceDamageType :
					[forceDamageType]

			// If Overmind Null Field.
			if (
				currentTurret &&
				currentTurret.constructor.name == "Overmind" &&
				currentTurret.nullField > 0 &&
				currentTurret != weapon &&
				currentTurret.currentTargets.some(target => target == this) &&
				!damageTypes.includes("electric")
			)
				damageBonus += .5

			// Apply damage bonus.
			damage *= damageBonus

			// Damage-type Status effects.
			for (const type of damageTypes)
			{
				// If base status chance is not zero for current damage type.
				let statusChance = weapon.mod[type + 'StatusChance']
				if (statusChance > 0)
				{
					// Add universal status chance modifier.
					statusChance += weapon.mod.statusChance

					// If Restricted Area Evolution.
					if (type == 'electric' && this.statusEffects.some(s => s[0] == "restrictedArea"))
						statusChance += .2

					// If Blazing Glory Augment.
					if ("augment_blazingGlory" in activeAugments && weapon.allDamageTags.includes("tag_heat"))
						statusChance += .12

					// If Aftershock Loot.
					if (isCrit && "item_aftershock" in serializedLoot)
						statusChance = 1

					// Roll for status effect.
					if (Random.chance(statusChance))
						(this.isChild && this.parent ? this.parent : this).addStatusEffect(type + 'Status')
				}
			}
		}

		// Get hit audio.
		audioHandler.playAudioHook("enemy_hit_" + this.constructor.name.toLowerCase(), getPanFromX(this.getPosition().x))

		// Spawn damage number effect.
		let pos = col ? col : this.getPosition()
		factory.spawn(Damage, Random.uniform(pos.x, 30), Random.uniform(pos.y, 15), damage, isCrit)

		// Process damage (or shield depletion)
		allWeapons.forEach(weap => weap.onEnemyHit(this, weapon, isCrit))
		if (this.shield > 0)
			this.currentShieldDelay = this.shieldDelay
		if (damage < this.currentShield)
			this.currentShield -= damage
		else
		{
			let resultantDamage = damage - this.currentShield
			this.currentShield = 0
			if (resultantDamage < this.currentHealth)
				this.currentHealth -= resultantDamage
			else if (this.active)
				this.destroyedByPlayer(weapon, isCrit, forceDamageType)
		}

		// Vampirism.
		if (isCrit && weapon.allDamageTags.includes("tag_kinetic") && "item_vampirism" in serializedLoot)
			currentTurret.addHealth(Math.ceil(.05 * damage))

		// Lamprey Augment.
		let range = distanceBetween(screenCenter, this.getPosition())
		if (range < longRange && weapon.constructor.nonDamageTags().includes("tag_damageOverTime") && "augment_lamprey" in activeAugments)
			currentTurret.addHealth(1)

		return { damage: damage, isCrit: isCrit }
	}
	
	addHealth(health)
	{
		if (this.currentHealth + health < this.health)
			this.currentHealth += health
		else
			this.currentHealth = this.health
	}

	destroyedByPlayer(weapon, isCrit, forceDamageType = null)
	{
		// Add rewards.
		addExperience(this.experience * (1 + weapon.mod.experience))

		// SFX.
		if (weapon.constructor.name == "HeatRay")
			audioHandler.playAudioHook("heatray_destroy_enemy", getPanFromX(this.getPosition().x))

		// Register kill
		const weapons = [...allWeapons, currentTurret]
		if (this.canSpawnPowerups && weapon.isWeapon)
		{
			// Enlightment Loot
			weapon.registerKill()
			if (isCrit && "item_enlightenment" in serializedLoot)
				weapons.forEach(weap => weap.evolutionAdd(1))
		}

		// Trigger on kill effects.
		weapons.forEach(weap => weap.onEnemyDestroyed(this, weapon, isCrit, forceDamageType))

		// Splattershot Infestation II Evolution.
		if (
			currentTurret.constructor.name == "SplatterShot" &&
			currentTurret.infestation == 2 &&
			weapon.constructor.nonDamageTags().includes("tag_status")
		)
		{
			let position = this.getPosition()
			for (let i = 0; i < 10; i++)
				currentTurret.spawnSplatterParticle({ x: position.x, y: position.y })
		}

		// Violent Discharge Augment
		if ("augment_violentDischarge" in activeAugments && weapon.constructor.name == "Static")
		{
			if (Random.chance(0.5))
			{
				const origin = this.getPosition()
		
				hostilesArray.forEach(enemyNearby => {
					const targetPos = enemyNearby.getPosition()
					if (
						enemyNearby.getType() == type.enemy &&
						enemyNearby !== this &&
						Matter.Bounds.overlaps(enemyNearby.body.bounds, screenBounds) &&
						distanceBetween(targetPos, origin) < weapon.mod.range &&
						!enemyNearby.statusEffects.some(status => status[0] === "electricStatus")
					)
					{
						enemyNearby.addStatusEffect("electricStatus")
						const arc = factory.spawn(DirectedArc)
						arc.reset(this.getPosition(), enemyNearby.getPosition())
					}
				})
			}
		}

		// Bloodbath I & II Evolution
		if (
			weapon.constructor.name == "Chopper" &&
			this.statusEffects.some(status => status[0] === "kineticStatus") &&
			weapon.bloodbath > 0
		) {
			if (Random.chance(
				weapon.bloodbath == 2 ? 0.25 : 0.1
			))
				triggerDoubleDamage()
		}
		
		// Spawn pickups.
		pickupController.spawnRandomPickup(this, weapon, isCrit)
		
		// Destroy.
		this.destroy()
	}
}
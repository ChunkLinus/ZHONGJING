import { Random, Matter } from 'sphere-runtime'
import { Weapon } from './weapon.js'
import { Entity } from '../core/entityFactory.js'
import { Impact } from '../effects/impact.js'
import { EffectsSurface } from '../effects/effectsSurface.js'
import { DrawLightning } from '../effects/drawLightning.js'

export class Orbiter extends Weapon
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("weapon_orbiter_title") }
	static getDesc() { return localize("weapon_orbiter_desc") }
	static damageTags() { return ["tag_chemical"] }
	static nonDamageTags() { return ["tag_remote"] }

	constructor()
	{
		super()
		this.extraLetters = 0
		this.dottedLineLength = scalePix(10)
		this.orbiterRenderer = factory.spawn(EffectsSurface)

		// Base stats.
		this.dmg.base.chemical = 70
		this.base.range = 50
		this.base.speed = 2
		this.base.critChance = .05
		this.base.critMult = 1.5
		this.base.duration = 600
		this.refreshModifiers()

		// Evolutions.
		this.stormRing = false
		this.doppelganger = false
		this.tether = false
		this.tether2 = false

		// Trigger Letters.
		this.glyphMatches = [shoulder_trigger_left, shoulder_trigger_right]
		this.wordMatches = getTriggerLetters('Orbiter')

		// Start task.
		this.start()
	}

	onWordComplete(word, quicktime, target)
	{
		if (
			(usingController && this.glyphMatches.some(v => quicktime[0] == v)) ||
			(!usingController && this.wordMatches.some(v => word[0] == v))
		)
		{
			audioHandler.playAudioHook("orbiter_spawn", getPanFromX(target.getPosition().x))
			factory.spawn(ProjOrbiter, target.getPosition().x, target.getPosition().y, this)
			if (this.doppelganger) factory.spawn(ProjOrbiter, target.getPosition().x, target.getPosition().y, this, true)
		}
	}

	getEvolution()
	{
		return [
			{
				name: this.wordMatches.length > 4 ? "evo_orbiter_continuum_2" : "evo_orbiter_continuum",
				desc: localize("evo_orbiter_continuum_desc"),
				triggerDesc: localize("starts_with_character"),
				triggerDescQuicktime: localize("starts_with_glyphs"),
				triggerValue: super.getNextExtraLetter(),
				triggerValueQuicktime: super.getNextExtraButton(),
				icon: "",
				weight: 10,
				requirementsMet: possibleExtraLetters.length > extraLetters.length,
				reference: this,
				effect: function(orbiter)
				{
					let extraLetter = possibleExtraLetters.find(letter => !extraLetters.includes(letter))
					let extraButton = possibleExtraButtons.find(button => !extraButtons.includes(button))
					orbiter.extraLetters += 1
					extraLetters.push(extraLetter)
					extraButtons.push(extraButton)
					orbiter.wordMatches = [...orbiter.wordMatches, ...extraLetter]
					orbiter.glyphMatches.push(extraButton)
				}
			},
			{
				name: "evo_orbiter_stormRing",
				desc: localize("evo_orbiter_stormRing_desc", "-70", "+70"),
				icon: "",
				weight: 10,
				requirementsMet: !this.stormRing,
				reference: this,
				effect: function(orbiter)
				{
					orbiter.stormRing = true
					modifiers.addAbsModifier(orbiter, "evo_orbiter_stormRing", { chemical: -70, electric: 70 })
					orbiter.refreshModifiers()
				}
			},
			{
				name: "evo_orbiter_stormRing_2",
				desc: localize("evo_orbiter_stormRing_2_desc", "+20", "+5%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					this.stormRing &&
					modifiers.getModifierCount(this, "evo_orbiter_stormRing_2") == 0
				),
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addAbsModifier(orbiter, "evo_orbiter_stormRing_2", { electric: 20 })
					modifiers.addPercModifier(orbiter, "evo_orbiter_stormRing_2", { electricStatusChance: .05 })
					orbiter.refreshModifiers()
				}
			},
			{
				name: "evo_orbiter_doppelganger",
				desc: localize("evo_orbiter_doppelganger_desc"),
				icon: "",
				weight: 10,
				requirementsMet: !this.doppelganger,
				reference: this,
				effect: function(orbiter)
				{
					orbiter.doppelganger = true
				}
			},
			{
				name: "evo_orbiter_tether",
				desc: localize("evo_orbiter_tether_desc", "30%"),
				icon: "",
				weight: 10,
				requirementsMet: !this.tether,
				reference: this,
				effect: function(orbiter)
				{
					orbiter.tether = true
				}
			},
			{
				name: "evo_orbiter_tether_2",
				desc: localize("evo_orbiter_tether_2_desc", "50%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					this.tether &&
					!this.tether2
				),
				reference: this,
				effect: function(orbiter)
				{
					orbiter.tether2 = true
				}
			},
		]
	}

	getUpgrades()
	{
		let currentOrbiterRangeBoost =
			modifiers.getModifierCount(this, "orbiter_upgrade_range_common") +
			modifiers.getModifierCount(this, "orbiter_upgrade_range_uncommon") * 2 +
			modifiers.getModifierCount(this, "orbiter_upgrade_range_rare") * 3
		let orbiterRangeWeightFactor = Math.max(1 - (currentOrbiterRangeBoost / 15), 0)

		let currentOrbiterDurationBoost =
			modifiers.getModifierCount(this, "orbiter_upgrade_duration_common") +
			modifiers.getModifierCount(this, "orbiter_upgrade_duration_uncommon") * 2 +
			modifiers.getModifierCount(this, "orbiter_upgrade_duration_rare") * 3
		let orbiterDurationWeightFactor = Math.max(1 - (currentOrbiterDurationBoost / 15), 0)

		return [
			...super.getEvolutionUpgrades(),
			{
				name: "orbiter_upgrade_damage_common",
				desc: localize("orbiter_upgrade_damage_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_orbiter_title",
				weight: 60,
				group: "orbiter_damage",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_damage_common", {damage: 0.1})
				}
			},
			{
				name: "orbiter_upgrade_damage_uncommon",
				desc: localize("orbiter_upgrade_damage_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_orbiter_title",
				weight: 20,
				group: "orbiter_damage",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_damage_uncommon", {damage: 0.2})
				}
			},
			{
				name: "orbiter_upgrade_damage_rare",
				desc: localize("orbiter_upgrade_damage_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_orbiter_title",
				weight: 7,
				group: "orbiter_damage",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_damage_rare", {damage: 0.3})
				}
			},
			{
				name: "orbiter_upgrade_range_common",
				desc: localize("orbiter_upgrade_range_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_orbiter_title",
				weight: 60 * orbiterRangeWeightFactor,
				group: "orbiter_range",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_range_common", {range: 0.1})
				}
			},
			{
				name: "orbiter_upgrade_range_uncommon",
				desc: localize("orbiter_upgrade_range_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_orbiter_title",
				weight: 20 * orbiterRangeWeightFactor,
				group: "orbiter_range",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_range_uncommon", {range: 0.2})
				}
			},
			{
				name: "orbiter_upgrade_range_rare",
				desc: localize("orbiter_upgrade_range_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_orbiter_title",
				weight: 7 * orbiterRangeWeightFactor,
				group: "orbiter_range",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_range_rare", {range: 0.3})
				}
			},
			{
				name: "orbiter_upgrade_duration_common",
				desc: localize("orbiter_upgrade_duration_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_orbiter_title",
				weight: 60 * orbiterDurationWeightFactor,
				group: "orbiter_duration",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_duration_common", {duration: 0.1})
				}
			},
			{
				name: "orbiter_upgrade_duration_uncommon",
				desc: localize("orbiter_upgrade_duration_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_orbiter_title",
				weight: 20 * orbiterDurationWeightFactor,
				group: "orbiter_duration",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_duration_uncommon", {duration: 0.2})
				}
			},
			{
				name: "orbiter_upgrade_duration_rare",
				desc: localize("orbiter_upgrade_duration_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_orbiter_title",
				weight: 7 * orbiterDurationWeightFactor,
				group: "orbiter_duration",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_duration_rare", {duration: 0.3})
				}
			},
			{
				name: "orbiter_upgrade_speed_common",
				desc: localize("orbiter_upgrade_speed_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_orbiter_title",
				weight: 60,
				group: "orbiter_speed",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_speed_common", {speed: 0.1})
				}
			},
			{
				name: "orbiter_upgrade_speed_uncommon",
				desc: localize("orbiter_upgrade_speed_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_orbiter_title",
				weight: 20,
				group: "orbiter_speed",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_speed_uncommon", {speed: 0.2})
				}
			},
			{
				name: "orbiter_upgrade_speed_rare",
				desc: localize("orbiter_upgrade_speed_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_orbiter_title",
				weight: 7,
				group: "orbiter_speed",
				requirementsMet: true,
				reference: this,
				effect: function(orbiter)
				{
					modifiers.addPercModifier(orbiter, "orbiter_upgrade_speed_rare", {speed: 0.3})
				}
			}
		]
	}
}

class ProjOrbiter extends Entity
{
	reset(x, y, parent, counterclockwise = false)
	{
		this.position = { x: x, y: y }
		this.direction = Vector.sub(this.position, screenCenter)
		this.parent = parent
		this.trail = []
		this.enemiesOnCooldown = []
		this.duration = 0
		this.counterclockwise = counterclockwise

		// Prepare Storm Ring VFX.
		this.stormRingEffects = [
			Math.PI * .25,
			Math.PI * .5,
			Math.PI * .75
		]
		
		// Prepare next position.
		this.calculateNextPosition()
	}

	calculateNextPosition()
	{
		// Determine next position.
		let angularSpeed = (this.parent.mod.speed / 180) * Math.PI * (this.counterclockwise ? -1 : 1)
		this.nextDirection = Vector.rotate(this.direction, angularSpeed)
		this.nextPosition = Vector.add(screenCenter, this.nextDirection)
	}

	on_update()
	{
		if (isPaused()) return

		// Parse cooldown list.
		for (let i = this.enemiesOnCooldown.length - 1; i >= 0; i--)
			if (--this.enemiesOnCooldown[i][1] <= 0)
				this.enemiesOnCooldown.splice(i, 1)

		// Check expiry.
		if (++this.duration > this.parent.mod.duration)
			this.suspend()

		// Process current trail.
		let i = this.trail.length
		while(i--)
			if (--this.trail[i][2] <= 0)
				this.trail.splice(i, 1)

		// Process storm ring effects.
		if (this.parent.stormRing)
		{
			for (let i = 2; i >= 0; i--)
			{
				this.stormRingEffects[i] += 0.07855
				if (this.stormRingEffects[i] >= Math.PI) this.stormRingEffects[i] -= Math.PI
			}
		}

		// Check collisions along path.
		let collisions = Matter.Query.ray(hostileBodies, this.position, this.nextPosition, scalePix(this.parent.mod.range))
		if (collisions.length > 0)
			collisions.map(col => hostiles.get(col.bodyA.id))
				.forEach(enemy => {

					// Check if on cooldown.
					if (!enemy || this.enemiesOnCooldown.some(e => e[0] == enemy)) return

					// Deal with armored enemies.
					let armor = armoredEnemies.includes(enemy.constructor.name) ?
						Matter.Query.ray(hostileBodies, this.position, enemy.getPosition())
							.find(col => {
								let hostile = hostiles.get(col.bodyA.id)
								return hostile && hostile.getType() == type.armor
							})
						: enemy.protection
					if (armor)
					{
						if ("bodyA" in armor) armor = hostiles.get(armor.bodyA.id)
						let colPtShield = collisionPoint(this.position, enemy.getPosition(), armor.body)
						audioHandler.playAudioHook("orbiter_hit" + (this.parent.stormRing ? "_electric" : ""), getPanFromX(colPtShield.x))
						armor.getHit(this.parent.dmg.mod.all, this.parent, colPtShield)
						this.enemiesOnCooldown.push([armor, 30])
						factory.spawn(Impact, colPtShield.x, colPtShield.y)
						return
					}

					// Handle damage.
					let damage = Random.uniform(this.parent.dmg.mod.all, 5)
					let result = enemy.getHit(damage, this.parent, null)
					this.parent.recordDamage(result.damage)
					this.enemiesOnCooldown.push([enemy, 30])

					// Hit effects.
					let randomPositionX = Random.uniform(enemy.getPosition().x, scalePix(5))
					let randomPositionY = Random.uniform(enemy.getPosition().y, scalePix(5))
					factory.spawn(Impact, randomPositionX, randomPositionY)
					audioHandler.playAudioHook((result.isCrit ? "orbiter_hit_crit" : "orbiter_hit") + (this.parent.stormRing ? "_electric" : ""), getPanFromX(randomPositionX))
				})
		
		// Check collisions for tether.
		if (this.parent.tether)
		{
			let range = Vector.magnitude(this.direction) - scalePix(this.parent.mod.range)
			let angleRange = this.parent.mod.speed / 360 * Math.PI
			collisions = hostilesArray.filter(enemy => {
				return enemy.getType() == type.enemy
					&& distanceBetween(screenCenter, enemy.getPosition()) <= range
					&& this.angleDifference(Vector.sub(enemy.getPosition(), screenCenter), this.direction) < angleRange
			})
			if (collisions.length > 0)
				collisions.forEach(enemy => {

					// Deal with armored enemies.
					let armor = armoredEnemies.includes(enemy.constructor.name) ?
						Matter.Query.ray(hostileBodies, screenCenter, enemy.getPosition())
							.find(col => {
								let hostile = hostiles.get(col.bodyA.id)
								return hostile && hostile.getType() == type.armor
							})
						: enemy.protection
					if (armor)
					{
						if ("bodyA" in armor) armor = hostiles.get(armor.bodyA.id)
						let colPtShield = collisionPoint(this.position, enemy.getPosition(), armor.body)
						audioHandler.playAudioHook("orbiter_chain_hit" + this.parent.stormRing ? "_electric" : "", getPanFromX(colPtShield.x))
						armor.getHit(this.parent.dmg.mod.all, this.parent, colPtShield)
						this.enemiesOnCooldown.push([armor, 30])
						factory.spawn(Impact, colPtShield.x, colPtShield.y)
						return
					}

					// Handle damage.
					let damage = Random.uniform(this.parent.dmg.mod.all, 5) * (this.parent.tether2 ? .5 : .3)
					let result = enemy.getHit(damage, this.parent, null)
					this.parent.recordDamage(result.damage)
					this.enemiesOnCooldown.push([enemy, 30])

					// Hit effects.
					let randomPositionX = Random.uniform(enemy.getPosition().x, scalePix(5))
					let randomPositionY = Random.uniform(enemy.getPosition().y, scalePix(5))
					factory.spawn(Impact, randomPositionX, randomPositionY)
					audioHandler.playAudioHook((result.isCrit ? "orbiter_chain_crit" : "orbiter_chain_hit") + (this.parent.stormRing ? "_electric" : ""), getPanFromX(randomPositionX))
				})
		}
		
		// Spawn trail.
		if (Random.chance(.5))
		{
			let pos = Vector.add (
				Vector.rotate (
					{
						x: scalePix(Random.discrete(0, this.parent.mod.range)),
						y: 0
					},
					Random.uniform(Math.PI, Math.PI)
				),
				this.position
			)
			this.trail.push([pos.x, pos.y, Random.uniform(30, 10)])
		}

		// Move projectile.
		this.direction = this.nextDirection
		this.position = this.nextPosition
		this.calculateNextPosition()
	}

	angleDifference(vecA, vecB)
	{
		return Math.abs(Math.acos(Vector.dot(vecA, vecB) / (Vector.magnitude(vecA) * Vector.magnitude(vecB))))
	}

	on_render()
	{
		// Draw Orbiter projectile.
		PrimNative.drawFilledCircle (
			this.parent.orbiterRenderer.surface,
			this.nextPosition.x,
			this.nextPosition.y,
			scalePix(this.parent.mod.range),
			midGray
		)

		if (this.parent.stormRing)
		{
			// Draw Storm Ring effects.
			this.stormRingEffects.forEach(eff => {
				let pt1 = Vector.add(Vector.rotate({ x: this.parent.mod.range * 1.1, y: 0 }, Math.PI / 4 + eff), this.nextPosition)
				let pt2 = Vector.add(Vector.rotate({ x: this.parent.mod.range * 1.1, y: 0 }, Math.PI / 4 - eff), this.nextPosition)
				DrawLightning(pt1, pt2)
			})

			// Draw lightning trail.
			let i = this.trail.length
			while (i--)
			{
				if (i == 0) break
				let pt1 = this.trail[i]
				let pt2 = this.trail[i - 1]
				DrawLightning({ x: pt1[0], y: pt1[1] }, { x: pt2[0], y: pt2[1] })
			}

			// Draw Lightning Tether.
			if (this.parent.tether)
			for (let i = 0; i < 2; i++)
				DrawLightning(screenCenter, this.position)
		}
		else
		{
			// Draw trail.
			this.trail.forEach(t => {
				PrimNative.drawFilledCircle (
					this.parent.orbiterRenderer.surface,
					t[0],
					t[1],
					scalePix(t[2] / 2),
					midGray
				)
			})

			// Draw Tether.
			if (this.parent.tether)
			{
				let i = Vector.magnitude(this.direction) - scalePix(this.parent.mod.range)
				if (i > 0)
				{
					let vec = Vector.normalise(this.direction)
					while (i - this.parent.dottedLineLength > 0)
					{
						let pt1 = Vector.add(Vector.mult(vec, i - this.parent.dottedLineLength * 2), screenCenter)
						let pt2 = Vector.add(Vector.mult(vec, i - this.parent.dottedLineLength), screenCenter)
						let pt3 = Vector.add(Vector.mult(vec, i), screenCenter)
						PrimNative.drawLine(Surface.Screen, pt1.x, pt1.y, pt2.x, pt2.y, scalePix(6), midGray.fadeTo(.2))
						PrimNative.drawLine(Surface.Screen, pt2.x, pt2.y, pt3.x, pt3.y, scalePix(3), midGray.fadeTo(.2))
						i -= this.parent.dottedLineLength * 2
					}
				}
			}
		}

		if (!this.parent.tether)
		{
			// Draw dotted line.
			let i = Vector.magnitude(this.direction) - scalePix(this.parent.mod.range)
			if (i > 0)
			{
				let vec = Vector.normalise(this.direction)
				while (i - this.parent.dottedLineLength > 0)
				{
					let pt1 = Vector.add(Vector.mult(vec, i - this.parent.dottedLineLength), screenCenter)
					let pt2 = Vector.add(Vector.mult(vec, i), screenCenter)
					PrimNative.drawLine(Surface.Screen, pt1.x, pt1.y, pt2.x, pt2.y, scalePix(3), midGray.fadeTo(.2))
					i -= this.parent.dottedLineLength * 2
				}
			}
		}
	}
}
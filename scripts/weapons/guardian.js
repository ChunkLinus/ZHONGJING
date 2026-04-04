import { PausableTween } from "../core/fastTween.js"
import { Powerup } from "../core/powerup.js"
import { Damage } from "../effects/damage.js"
import { Impact } from "../effects/impact.js"
import { Sparks } from "../effects/sparks.js"
import { Pickup } from "../pickups/pickup.js"
import { getRandomPickupSpawnPos } from "../pickups/pickupController.js"
import { FriendlyDrone, Weapon } from "./weapon.js"
import { Random, Matter } from 'sphere-runtime'

const GuardianPickupSpawnRate = 300
const GuardianRotationSpeed = .2
const GuardianFireballMinAngularSpeed = .075
const GuardianRangeFactor = .25
const GuardianGlobDecayMax = 20
const GuardianFireballPathSegmentLength = 10
const IgnoreEnemies = ["Jormungandr", "BodySegment"]

export class Guardian extends Weapon
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("weapon_guardian_title") }
	static getDesc() { return localize("weapon_guardian_desc") }
	static damageTags() { return ["tag_heat"] }
	static nonDamageTags() { return ["tag_drone"] }

	constructor()
	{
		// Superclass constructor.
		super()

		// Declare variables.
		this.cooldown = GuardianPickupSpawnRate
		this.cooldownPaused = false
		this.pickups = []
		this.toxicWard = false
		this.experimentalFuel = false
		this.experimentalFuelDuration = 480
		this.experimentalFuelBoost = 1
		
		// Define starting stats.
		this.dmg.base.heat = 20
		this.base.speed = 2
		this.base.rateOfFire = 600
		this.base.duration = 1200
		this.base.range = 250
		this.base.critChance = 0.01
		this.base.critMult = 2
		this.refreshModifiers()

		// Spawn guardians.
		this.guardians = [factory.spawn(GuardianDrone, this)]

		// Start task.
		this.start()
	}

	onTrialStart() { this.setSpawnTimer() }
	setSpawnTimer()
	{
		this.cooldownPaused = false
		this.cooldown = Random.uniform(GuardianPickupSpawnRate, 100)
	}

	spawnFuel()
	{
		let spawnPos = getRandomPickupSpawnPos()
		this.pickups.push(factory.spawn(FuelPickup, spawnPos.x, spawnPos.y, this))
	}

	getWanderTarget()
	{
		return Vector.add (
			Vector.rotate (
				{ x: Random.discrete(0, scalePix(this.mod.range)), y: 0 },
				Random.uniform(Math.PI, Math.PI)
			),
			screenCenter
		)
	}

	refreshModifiers()
	{
		super.refreshModifiers()
		let guardianRange = scalePix(this.mod.range) * GuardianRangeFactor
		this.fireballRadius = guardianRange * .25
		this.fireballOffset = guardianRange * .75
		this.guardianBodyRadius = guardianRange * .17
	}

	on_update()
	{
		if (isPaused()) return

		// Progress pickup timer and spawns.
		if (!this.cooldownPaused && --this.cooldown <= 0)
		{
			if (spawner.running) this.spawnFuel()
			this.cooldownPaused = true
		}

		// Find nearest enemies and pass to guardians.
		let nearestEnemies = null
		this.guardians.forEach((g, i) => {

			// If guardian does not currently have an enemy.
			if (!g.target)
			{
				// Calculate nearest enemies.
				if (nearestEnemies == null)
					nearestEnemies = hostilesArray
						.filter(
							v => v.getType() == type.enemy &&
							distanceBetween(screenCenter, v.getPosition()) < scalePix(this.mod.range) &&
							!this.guardians.some(guard => guard.target == v) &&
							!IgnoreEnemies.includes(v.constructor.name)
						)
						.sort((a, b) => distanceBetween(screenCenter, b.getPosition()) > distanceBetween(screenCenter, a.getPosition()) ? 1 : -1)
				
				// Give target to guardian
				g.target = nearestEnemies.pop()
			}
		})
	}

	on_render()
	{
		PrimNative.drawCircle(Surface.Screen, screenCenter.x, screenCenter.y, scalePix(this.mod.range), 2, midGray.fadeTo(0.3))
	}

	getEvolution()
	{
		return [
			{
				name: "evo_guardian_toxicWard",
				desc: localize("evo_guardian_toxicWard_desc", "-20", "+20"),
				icon: "",
				weight: 10,
				requirementsMet: !this.toxicWard,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addAbsModifier(guardian, "evo_guardian_toxicWard", { chemical: 20, heat: -20 })
					guardian.toxicWard = true
					guardian.refreshModifiers()
				}
			},
			{
				name: "evo_guardian_toxicWard_2",
				desc: localize("evo_guardian_toxicWard_2_desc", "+15"),
				icon: "",
				weight: 10,
				requirementsMet: this.toxicWard && modifiers.getModifierCount(this, "evo_guardian_toxicWard_2") == 0,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addAbsModifier(guardian, "evo_guardian_toxicWard_2", { chemical: 15 })
					guardian.refreshModifiers()
				}
			},
			{
				name: "evo_guardian_experimentalFuel",
				desc: localize("evo_guardian_experimentalFuel_desc"),
				icon: "",
				weight: 10,
				requirementsMet: !this.experimentalFuel,
				reference: this,
				effect: function(guardian)
				{
					guardian.experimentalFuel = true
					modifiers.addPercModifier(guardian, "evo_guardian_experimentalFuel_damage", { damage: 0 })
					modifiers.addPercModifier(guardian, "evo_guardian_experimentalFuel_speed", { speed: 0 })
					modifiers.addPercModifier(guardian, "evo_guardian_experimentalFuel_range", { range: 0 })
				}
			},
			{
				name: "evo_guardian_experimentalFuel_2",
				desc: localize("evo_guardian_experimentalFuel_2_desc", "+50%", "+50%"),
				icon: "",
				weight: 10,
				requirementsMet: this.experimentalFuel && this.experimentalFuelBoost == 1,
				reference: this,
				effect: function(guardian)
				{
					guardian.experimentalFuelBoost = 1.5
					guardian.experimentalFuelDuration = 720
				}
			},
			{
				name: "evo_guardian_guardianTeam",
				desc: localize("evo_guardian_guardianTeam_desc", "-25%", "+1"),
				icon: "",
				weight: 10,
				requirementsMet: this.guardians.length == 1,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "evo_guardian_guardianTeam", { damage: -.25 })
					guardian.guardians.push(factory.spawn(GuardianDrone, guardian))
					guardian.refreshModifiers()
				}
			},
			{
				name: "evo_guardian_guardianTeam_2",
				desc: localize("evo_guardian_guardianTeam_2_desc", "-25%", "+1"),
				icon: "",
				weight: 10,
				requirementsMet: this.guardians.length == 2,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "evo_guardian_guardianTeam_2", { damage: -.25 })
					guardian.guardians.push(factory.spawn(GuardianDrone, guardian))
					guardian.refreshModifiers()
				}
			}
		]
	}

	getUpgrades()
	{
		let currentGuardianRangeBoost =
			modifiers.getModifierCount(this, "guardian_upgrade_range_common") +
			modifiers.getModifierCount(this, "guardian_upgrade_range_uncommon") * 2 +
			modifiers.getModifierCount(this, "guardian_upgrade_range_rare") * 3
		let guardianRangeWeightFactor = Math.max(1 - (currentGuardianRangeBoost / 15), 0)
		
		return [
			...super.getEvolutionUpgrades(),
			{
				name: "guardian_upgrade_damage_common",
				desc: localize("guardian_upgrade_damage_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_guardian_title",
				weight: 60,
				group: "guardian_damage",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_damage_common", {damage: .1})
				}
			},
			{
				name: "guardian_upgrade_damage_uncommon",
				desc: localize("guardian_upgrade_damage_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_guardian_title",
				weight: 20,
				group: "guardian_damage",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_damage_uncommon", {damage: .2})
				}
			},
			{
				name: "guardian_upgrade_damage_rare",
				desc: localize("guardian_upgrade_damage_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_guardian_title",
				weight: 7,
				group: "guardian_damage",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_damage_rare", {damage: .3})
				}
			},
			{
				name: "guardian_upgrade_range_common",
				desc: localize("guardian_upgrade_range_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_guardian_title",
				weight: 60 * guardianRangeWeightFactor,
				group: "guardian_range",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_range_common", {range: .1})
				}
			},
			{
				name: "guardian_upgrade_range_uncommon",
				desc: localize("guardian_upgrade_range_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_guardian_title",
				weight: 20 * guardianRangeWeightFactor,
				group: "guardian_range",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_range_uncommon", {range: .2})
				}
			},
			{
				name: "guardian_upgrade_range_rare",
				desc: localize("guardian_upgrade_range_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_guardian_title",
				weight: 7 * guardianRangeWeightFactor,
				group: "guardian_range",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_range_rare", {range: .3})
				}
			},
			{
				name: "guardian_upgrade_duration_common",
				desc: localize("guardian_upgrade_duration_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_guardian_title",
				weight: 60,
				group: "guardian_duration",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_duration_common", {duration: .1})
				}
			},
			{
				name: "guardian_upgrade_duration_uncommon",
				desc: localize("guardian_upgrade_duration_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_guardian_title",
				weight: 20,
				group: "guardian_duration",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_duration_uncommon", {duration: .2})
				}
			},
			{
				name: "guardian_upgrade_duration_rare",
				desc: localize("guardian_upgrade_duration_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_guardian_title",
				weight: 7,
				group: "guardian_duration",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_duration_rare", {duration: .3})
				}
			},
			{
				name: "guardian_upgrade_speed_common",
				desc: localize("guardian_upgrade_speed_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_guardian_title",
				weight: 60,
				group: "guardian_speed",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_speed_common", {speed: .1})
				}
			},
			{
				name: "guardian_upgrade_speed_uncommon",
				desc: localize("guardian_upgrade_speed_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_guardian_title",
				weight: 20,
				group: "guardian_speed",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_speed_uncommon", {speed: .2})
				}
			},
			{
				name: "guardian_upgrade_speed_rare",
				desc: localize("guardian_upgrade_speed_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_guardian_title",
				weight: 7,
				group: "guardian_speed",
				requirementsMet: true,
				reference: this,
				effect: function(guardian)
				{
					modifiers.addPercModifier(guardian, "guardian_upgrade_speed_rare", {speed: .3})
				}
			}
		]
	}
}

class GuardianDrone extends FriendlyDrone
{
	reset(parent)
	{
		// Keep reference to parent weapon.
		this.parent = parent

		// Declare variables.
		this.position = { x: screenCenter.x, y: screenCenter.y }
		this.globs = []
		this.globSpawnCooldown = 0
		this.target = this.wanderTarget = null
		this.direction = Random.uniform(Math.PI, Math.PI)
		this.currentTimer = parent.mod.duration
		this.dottedLineRotation = 0
		this.fireballAudioLoop = null
		this.spawnSequence = true

		// Fireballs stuff.
		this.fireballsDirection = this.direction + Math.PI / 2
		this.fireballAngularSpeed = GuardianFireballMinAngularSpeed
		this.fireballPositions = this.calcFireBallPositions(
			this.fireballsDirection,
			this.parent.fireballOffset
		)

		// Spawn sequence.
		let spawnPosition = Vector.add(Vector.rotate({ x: scalePix(100), y: 0 }, this.direction), screenCenter)
		let spawnSFXPlayed = false;
		(new PausableTween()).easeIn(
			[screenCenter.x, screenCenter.y, 0],
			[spawnPosition.x, spawnPosition.y, 1],
			t => {
				if (!spawnSFXPlayed && t[2] > 0)
				{
					spawnSFXPlayed = true
					audioHandler.playAudioHook("guardian_spawn", getPanFromX(screenCenter.x))
				}
				this.position.x = t[0]
				this.position.y = t[1]
			},
			40
		).then(() => this.spawnSequence = false)
	}

	audioStart()
	{
		if (this.fireballAudioLoop == null)
		{
			audioHandler.playAudioHook("guardian_fireball_start", getPanFromX(this.position.x))
			this.fireballAudioLoop = audioHandler.playAudioHook("guardian_fireball_loop", getPanFromX(this.position.x), true)
		}
	}

	audioStop()
	{
		if (this.fireballAudioLoop != null)
		{
			this.fireballAudioLoop.stop()
			this.fireballAudioLoop = null
		}
	}

	on_shutDown()
	{
		this.audioStop()
	}

	scapegoat()
	{
		if (this.currentTimer - this.parent.mod.duration * .5 < 0)
			this.currentTimer = 0
		else
			this.currentTimer -= this.parent.mod.duration * .5
	}

	refuel(amt)
	{
		if (this.currentTimer + amt > this.parent.mod.duration)
			this.currentTimer = this.parent.mod.duration
		else
			this.currentTimer += amt
	}

	on_update()
	{
		if (isPaused() || this.spawnSequence) return

		// Decay existing globs of fire.
		for (let i = this.globs.length - 1; i >= 0; i--)
		{
			let glob = this.globs[i]
			if (--glob[1] <= 0)
				this.globs.splice(i, 1)
		}

		// Reduce fuel.
		if (this.currentTimer <= 0)
			return
		else
			--this.currentTimer

		// Check target.
		if (this.target)
		{
			if ( // If out of range...
				distanceBetween (
					this.target.getPosition(),
					screenCenter
				) > scalePix(this.parent.mod.range) ||

				// Or target is dead...
				!this.target.active
			)
			{
				// Clear target and start wandering.
				this.target = null
				this.wanderTarget = this.parent.getWanderTarget()
			}
		}

		// If no target and not wandering, start wandering.
		else if (!this.wanderTarget)
			this.wanderTarget = this.parent.getWanderTarget()

		// Find angle (in radians) towards target.
		let target = this.target ? this.target.getPosition() : this.wanderTarget
		let directionToTarget = Vector.sub(target, this.position)
		let angleToTarget = Math.atan2(directionToTarget.y, directionToTarget.x)

		// If they are not the same, start rotating.
		if (angleToTarget != this.direction)
		{
			// diff finds the nearest direction to turn.
			let difference = diff(this.direction, angleToTarget)
			this.direction = Math.abs(difference) > GuardianRotationSpeed ?
				this.direction + Math.sign(difference) * GuardianRotationSpeed :
				angleToTarget
		}

		// Move
		// Move towards target.
		let speed = scalePix(this.parent.mod.speed * (this.target ? 1 : .2))
		if (this.target)
		{
			// If target is too far, just move at max chase speed.
			if (distanceBetween(this.position, this.target.getPosition()) - this.parent.fireballOffset > speed)
				this.position = Vector.add (
					this.position,
					Vector.mult (
						Vector.normalise (
							Vector.sub (
								this.target.getPosition(),
								this.position
							)
						),
						speed
					)
				)

			// If target is close enough, move into range equivalent to center of fireballs.
			else
				this.position = Vector.add (
					this.target.getPosition(),
					Vector.mult (
						Vector.normalise (
							Vector.sub (
								this.position,
								this.target.getPosition()
							)
						),
						this.parent.fireballOffset
					)
				)
		}

		// Wander about when targetless.
		else
		{
			// If wander target too far, just move at max wander speed.
			if (distanceBetween(this.position, this.wanderTarget) > speed)
				this.position = Vector.add(this.position, Vector.mult(Vector.normalise(Vector.sub(this.wanderTarget, this.position)), speed))

			// If close enough, snap to wander target and get a new one.
			else
			{
				this.position = this.wanderTarget
				this.wanderTarget = this.parent.getWanderTarget()
			}
		}
		
		// If just wandering, slow down fireballs.
		if (!this.target)
		{
			if (this.fireballAngularSpeed > GuardianFireballMinAngularSpeed + .01)
				this.fireballAngularSpeed -= .01
			else
				this.fireballAngularSpeed = GuardianFireballMinAngularSpeed
			this.audioStop()
		}

		// If there's a target, speed up fireballs.
		else
		{
			let targetSpeed = Math.PI * 2 * (this.parent.mod.rateOfFire / 14400)
			if (this.fireballAngularSpeed < targetSpeed  - .01)
				this.fireballAngularSpeed += .01
			else
				this.fireballAngularSpeed = targetSpeed
			this.audioStart()
		}

		// Move fireballs.
		this.fireballsDirection += this.fireballAngularSpeed

		// Ray cast from old to new positions of fireball.
		let oldFireBallPositions = this.fireballPositions
		this.fireballPositions = this.calcFireBallPositions(this.fireballsDirection, this.parent.fireballOffset)
		let enemiesHit = [
			...Matter.Query.ray(hostileBodies, oldFireBallPositions[0], this.fireballPositions[0], this.parent.fireballRadius),
			...Matter.Query.ray(hostileBodies, oldFireBallPositions[1], this.fireballPositions[1], this.parent.fireballRadius)
		].filter(col => {
			let ent = hostiles.get(col.bodyA.id)
			return ent && (ent.getType() == type.armor || ent.getType() == type.enemy)
		})

		// Damage all enemies caught in path.
		for (const collision of enemiesHit)
		{
			let other = hostiles.get(collision.bodyA.id)
			if (other)
			{
				let colPt = Vector.add (
					this.position,
					Vector.mult (
						Vector.normalise (
							Vector.sub (
								other.getPosition(),
								this.position
							)
						),
						this.parent.fireballOffset
					)
				)
				let damage = Random.uniform(this.parent.dmg.mod.all, 5)
				let result = other.getHit(damage, this.parent, colPt)
				this.parent.recordDamage(result.damage)

				// VFX.
				factory.spawn(Impact, colPt.x, colPt.y)
				let angle = Math.atan2(colPt.y - this.position.y, colPt.x - this.position.x)
				for (let i = 0; i < 5; i++)
					factory.spawn(Sparks, colPt.x, colPt.y, Random.normal(angle, Math.PI / 6))

				// SFX.
				audioHandler.playAudioHook(`guardian_fireball_${result.crit ? "crit" : "hit"}`, getPanFromX(colPt.x))
			}
		}

		// Add new globs if attacking.
		if (this.target)
		{
			this.globs.push([this.fireballPositions[0], GuardianGlobDecayMax])
			this.globs.push([this.fireballPositions[1], GuardianGlobDecayMax])
		}

		// Update dotted line rotation.
		this.dottedLineRotation += .02
	}

	calcFireBallPositions(direction, radius)
	{
		let radiusVector = { x: radius, y: 0 }
		return [
			Vector.add(Vector.rotate(radiusVector, direction), this.position),
			Vector.add(Vector.rotate(radiusVector, direction + Math.PI), this.position)
		]
	}

	on_renderStart()
	{
		if (this.spawnSequence) return

		if (!this.target && this.currentTimer < this.parent.mod.duration)
			for (const fireballPos of this.fireballPositions)
				PrimNative.drawFilledCircle (
					Surface.Screen,
					fireballPos.x,
					fireballPos.y,
					this.parent.fireballRadius,
					midGray
				)
		
		for (const glob of this.globs)
			PrimNative.drawFilledCircle (
				Surface.Screen,
				glob[0].x,
				glob[0].y,
				(glob[1] / GuardianGlobDecayMax) * this.parent.fireballRadius,
				midGray
			)
	}

	on_render()
	{
		// Draw base circle.
		PrimNative.drawFilledCircle(Surface.Screen, this.position.x, this.position.y, scalePix(this.parent.guardianBodyRadius), midGray)

		// Draw "eye".
		let eyePosition = Vector.add(this.position, Vector.rotate({ x: scalePix(this.parent.guardianBodyRadius) * .4, y: 0 }, this.direction))
		if (this.currentTimer > 0)
		{
			let pts = []
			let apex = { x: scalePix(this.parent.guardianBodyRadius) * .4, y: 0 }
			for (let i = 0; i < 3; i++)
				pts.push(Vector.add(eyePosition, Vector.rotate(apex, this.direction + i * Math.PI * .667)))
			PrimNative.drawFilledTriangle(Surface.Screen, pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y, paleYellow)
		}
		else
		{
			let pts = []
			let apex = { x: scalePix(this.parent.guardianBodyRadius) * .4, y: 0 }
			for (let i = 0; i < 4; i++)
				pts.push(Vector.add(eyePosition, Vector.rotate(apex, this.direction + Math.PI * .25 + i * Math.PI * .5)))
			PrimNative.drawLine(Surface.Screen, pts[0].x, pts[0].y, pts[2].x, pts[2].y, scalePix(2), paleYellow)
			PrimNative.drawLine(Surface.Screen, pts[1].x, pts[1].y, pts[3].x, pts[3].y, scalePix(2), paleYellow)
		}

		if (this.spawnSequence) return

		// Draw dotted ring.
		let segments = (2 * Math.PI * this.parent.fireballOffset) / scalePix(GuardianFireballPathSegmentLength)
		segments = Math.floor(segments * .5) * 2
		let increment = (Math.PI * 2) / segments
		for (let i = 0; i < segments; i++)
		{
			if (i % 2 == 0) continue
			PrimNative.drawArc(
				Surface.Screen,
				this.position.x,
				this.position.y,
				this.parent.fireballOffset,
				i * increment + this.dottedLineRotation,
				increment,
				scalePix(2),
				midGray.fadeTo(.5)
			)
		}

		if (!this.target && this.currentTimer > 0)
			for (const fireballPos of this.fireballPositions)
				PrimNative.drawFilledCircle (
					Surface.Screen,
					fireballPos.x,
					fireballPos.y,
					this.parent.fireballRadius * .75,
					paleYellow
				)

		for (const glob of this.globs)
			PrimNative.drawFilledCircle (
				Surface.Screen,
				glob[0].x,
				glob[0].y,
				glob[1] / GuardianGlobDecayMax * this.parent.fireballRadius * .75,
				paleYellow
			)
		
		// Draw remaining fuel.
		drawProgress(
			this.position.x,
			this.position.y + scalePix(this.parent.guardianBodyRadius) * 2,
			scalePix(this.parent.guardianBodyRadius) * 2,
			scalePix(3),
			this.currentTimer / this.parent.mod.duration
		)
	}
}

const GuardianFuelPickupIconNormal = "="
const GuardianFuelPickupIconExperimental = [">", "@", "?"]

class FuelPickup extends Pickup
{
	constructor()
	{
		super()
		this.wordOffset = scalePix(40)
		this.iconYOffset = pickupIcons.heightOf(GuardianFuelPickupIconNormal) / 2
		this.iconXOffset = pickupIcons.widthOf(GuardianFuelPickupIconNormal) / 2
	}

	reset(x, y, parent)
	{
		super.reset(x, y, false)
		this.parent = parent
		this.setTimer(parent.mod.duration * .2)
		this.experimentalType = parent.experimentalFuel ? Random.discrete(0, 2) : null
		this.icon = this.experimentalType == null ?
			GuardianFuelPickupIconNormal :
			GuardianFuelPickupIconExperimental[this.experimentalType]
		
		// Play spawn SFX.
		audioHandler.playAudioHook("guardian_fuel_spawn", getPanFromX(x))
	}

	on_activate()
	{
		this.parent.pickups = []
		let amount = this.parent.mod.duration * .6
		let text = `+${(amount / 60).toFixed(1)} ${localize("seconds")}`
		for (const guardian of this.parent.guardians)
		{
			guardian.refuel(amount)
			factory.spawn(Damage, guardian.position.x, guardian.position.y, text, false)
			if (this.experimentalType != null)
			{
				let existingPowerup = powerups.find(powerup => powerup.constructor.name == GuardianExperimentalFuelPowerups[this.experimentalType].name)
				if (existingPowerup)
					existingPowerup.refresh()
				else
					factory.spawn(GuardianExperimentalFuelPowerups[this.experimentalType], this.parent)
			}
		}
		this.parent.setSpawnTimer()
		audioHandler.playAudioHook("guardian_fuel_pickup", getPanFromX(this.position.x))
		this.stop()
	}

	on_expire()
	{
		this.parent.setSpawnTimer()
	}

	on_render()
	{
		pickupIcons.drawText(
			Surface.Screen,
			this.position.x - this.iconXOffset,
			this.position.y - this.iconYOffset,
			this.icon,
			midGray
		)
		this.renderWordAndProgress()
	}
}

class ExperimentalFuel extends Powerup
{
	constructor(stat, baseIncrease, statLoc)
	{
		super(`evo_guardian_experimentalFuel_${stat}`)
		this.stat = stat
		this.baseIncrease = baseIncrease
		this.statLoc = statLoc
		this.statChange = {}
		this.statChange[stat] = 0
	}

	reset(parent)
	{
		this.parent = parent
		super.reset(parent.experimentalFuelDuration)

		this.statChange[this.stat] = this.baseIncrease * this.parent.experimentalFuelBoost
		modifiers.editPercModifier(this.parent, `evo_guardian_experimentalFuel_${this.stat}`, this.statChange)
		this.parent.refreshModifiers()

		this.node.setText(
			localize(`evo_guardian_experimentalFuel_${this.stat}`),
			`+${this.baseIncrease * 100 * this.parent.experimentalFuelBoost}% ${localize("weapon_guardian_title")} ${localize(this.statLoc)}`
		)
	}

	refresh()
	{
		this.node.currentProgress = this.node.maxProgress
	}

	on_expire()
	{
		this.statChange[this.stat] = 0
		modifiers.editPercModifier(this.parent, `evo_guardian_experimentalFuel_${this.stat}`, this.statChange)
		this.parent.refreshModifiers()
	}
}

class ExperimentalFuelDamage extends ExperimentalFuel { constructor() { super("damage", .5, "damage") } }
class ExperimentalFuelSpeed extends ExperimentalFuel { constructor() { super("speed", 1, "speed_text") } }
class ExperimentalFuelRange extends ExperimentalFuel { constructor() { super("range", .5, "range_text") } }

const GuardianExperimentalFuelPowerups = [
	ExperimentalFuelDamage,
	ExperimentalFuelSpeed,
	ExperimentalFuelRange
]
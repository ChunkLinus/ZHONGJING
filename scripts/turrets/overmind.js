import { Random, Matter, Easing } from 'sphere-runtime'
import { Turret } from './turret.js'
import { FriendlyDrone, FriendlyTurret } from '../weapons/weapon.js'
import { Impact } from '../effects/impact.js'
import { Sparks } from '../effects/sparks.js'
import { DrawLightning } from '../effects/drawLightning.js'
import { StaticEffect } from '../effects/static.js'
import { Powerup } from '../core/powerup.js'
import { Explosion } from '../effects/explosion.js'
import { Entity } from '../core/entityFactory.js'
import { FastTween } from '../core/fastTween.js'

const overmindVisualSegments = 20

export class Overmind extends Turret
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("weapon_overmind_title") }
	static getDesc() { return localize("weapon_overmind_desc") }
	static damageTags() { return ["tag_electric"] }
	static nonDamageTags() { return ["tag_drone", "tag_main"] }
	
	constructor()
	{
		super({radius: 20})
		this.droneCount = 12
		this.burningOnesDroneCount = 10
		this.rotation = 0
		this.droneConstructionTimer = null
		this.currentRecticles = []
		this.currentTargets = []
		this.targetCountForShockSpire = 0
		this.allDamageTypesExceptExplosive = function()
		{
			return this.allDamageTags
				.filter(type => type != 'tag_explosive')
				.map(type => type.replace('tag_', ''))
		}

		// Evolutions.
		this.syncronize = 0
		this.shockSpire = 0
		this.burningOnes = 0
		this.nullField = 0

		// Base stats.
		this.base.speed = 10
		this.base.critChance = 0.01
		this.base.critMult = 2
		this.dmg.base.electric = 5
		this.refreshModifiers()

		this.staticEffect = factory.spawn(StaticEffect, this, this.radius * .75)

		// Spawn initial drones.
		for (let i = 0; i < this.droneCount; i++)
			factory.spawn(OvermindDrone, this)

		// Start loop.
		this.start()
	}

	onTrialStart()
	{
		// Reset drone construction timer.
		this.droneConstructionTimer = null

		// If BurningOnes Evolution.
		if (this.burningOnes > 0)
			factory.spawn(BurningOnesChargeup, this)
	}

	suspend()
	{
		this.staticEffect.terminate = true
		super.suspend()
	}

	onWordComplete(word, _quicktime, _target)
	{
		// If BurningOnes Evolution and BurningOnes Chargeup powerup active, progress it.
		if (this.burningOnes > 0)
		{
			let burningOnesChargeupPowerup = powerups.find(powerup => powerup.constructor.name == "BurningOnesChargeup")
			if (burningOnesChargeupPowerup)
				burningOnesChargeupPowerup.update(word.length)
		}
	}

	fire(target)
	{
		super.fire(target)

		// If target not already in target list.
		if (!this.currentTargets.some(t => t == target))
		{
			// Add new target.
			this.currentTargets.push(target)
			this.currentRecticles.push(factory.spawn(OvermindReticle, target, this))

			// If Shock Spire Evolution.
			if (this.shockSpire > 0
				&& ++this.targetCountForShockSpire >= 3
				&& this.currentTargets.length >= 3
			)
			{
				this.targetCountForShockSpire = 0
				let centerPoint = Vector.div(this.currentTargets.slice(-3).reduce((t, c) => Vector.add(t, c.getPosition()), { x: 0, y: 0}), 3)
				factory.spawn(ShockSpire, centerPoint, this)
			}

			// If Null Field II Evolution, apply Static.
			if (this.nullField == 2)
			{
				if (target.getType() == type.enemy
					&& "statusEffects" in target
					&& !target.statusEffects.find(s => s[0] == "electricStatus")
				)
					target.addStatusEffect("electricStatus")
			}

			// Reprioritize drones.
			this.reprioritize()
		}

		// Else, if target already exists, refresh recticle.
		else
		{
			let existingRecticle = this.currentRecticles.find(recticle => recticle.target == target)
			if (existingRecticle)
				existingRecticle.timer = OvermindReticleTimer			
		}
	}

	targetExpired(target)
	{
		// Remove target from targets list.
		if (this.currentTargets.some(t => t == target))
		{
			this.children.forEach(drone => { if (drone.currentTarget == target) drone.currentTarget = null })
			this.currentTargets.splice(this.currentTargets.indexOf(target), 1)

			// Re-prioritize drones.
			this.reprioritize()
		}
	}

	getPosition()
	{
		return screenCenter
	}

	reprioritize()
	{
		// Grab list of drones.
		let drones = this.children.filter(child => child instanceof OvermindDrone)

		// If only one or no current targets.
		if (this.currentTargets.length <= 1)
		{
			drones.forEach(drone => 
				drone.currentTarget = this.currentTargets.length == 0 ?
					null :
					this.currentTargets[0]
			)
			return
		}

		// Create array of drone indices for assignment.
		const droneIndices = drones.map((_drone, i) => i)

		// Calculate amount of drones per enemy.
		const droneAmtPerEnemy = Array(this.currentTargets.length)
			.fill(Math.floor(drones.length / this.currentTargets.length))
		for (let i = 0, remainder = drones.length % this.currentTargets; i < remainder; i++)
			droneAmtPerEnemy[i]++

		// Ignore drones that are already assigned to the right targets.
		for (let i = 0; i < this.currentTargets.length; i++)
		{
			if (droneAmtPerEnemy[i] == 0) continue
			for (let k = droneIndices.length - 1; k >= 0; k--)
			{
				let drone = drones[droneIndices[k]]
				if (drone.currentTarget == this.currentTargets[i])
				{
					droneIndices.splice(k, 1)
					droneAmtPerEnemy[i]--
					if (droneAmtPerEnemy[i] == 0) break
				}
			}
		}

		// Assign the rest.
		for (let i = 0; i < this.currentTargets.length; i++)
		{
			if (droneAmtPerEnemy[i] == 0) continue
			droneIndices.sort((a, b) => {
				return distanceBetween(this.currentTargets[i].getPosition(), drones[a].position) <
					distanceBetween(this.currentTargets[i].getPosition(), drones[b].position) ?
						1 : -1
			})
			for (let k = 0; k < droneAmtPerEnemy[i]; k++)
				drones[droneIndices.pop()].currentTarget = this.currentTargets[i]
		}
	}

	registerKill()
	{
		super.registerKill()

		// If Syncronize Evolution.
		if (this.syncronize > 0 && Random.chance(this.syncronize == 1 ? 0.3 : 0.5))
		{
			let droneWeapons = allWeapons.filter(w => w.constructor.nonDamageTags().includes("tag_drone"))
			if (droneWeapons.length > 0)
			{
				audioHandler.playAudioHookUI("overmind_syncronize_trigger")
				Random.sample(droneWeapons).registerKill()
			}
		}
	}

	on_update()
	{
		// Pause.
		if (isPaused()) return

		// Rotate visuals.
		this.rotation += .01

		// Check for missing drones.
		if (!this.droneConstructionTimer && this.children.length < this.droneCount)
			this.droneConstructionTimer = factory.spawn(ConstructingDrone, 300, this)
	}

	on_render()
	{
		super.on_render()
		const apex = { x: this.radius, y: 0 }
		const increment = Math.PI * 2 / overmindVisualSegments
		for (let i = 0; i < 20; i += 2)
		{
			let from = Vector.add(Vector.rotate(apex, (i + 1) * increment + this.rotation), screenCenter)
			let to = Vector.add(Vector.rotate(apex, (i + 2) * increment + this.rotation), screenCenter)
			PrimNative.drawLine(Surface.Screen, from.x, from.y, to.x, to.y, scalePix(2), midGray.fadeTo(.5))
		}
	}

	refreshModifiers()
	{
		super.refreshModifiers()
		this.allDamageExceptExplosive = Object.entries(this.dmg.mod)
			.filter(pair => pair[0] != 'all' && pair[0] != 'explosive')
			.reduce((total, current) => total += current[1], 0)
	}

	getEvolution()
	{
		return [
			{
				name: "evo_overmind_syncronize",
				desc: localize("evo_overmind_syncronize_desc", "30%"),
				icon: "",
				weight: 10,
				requirementsMet: this.syncronize == 0,
				reference: this,
				effect: function(overmind)
				{
					overmind.syncronize = 1
				}
			},
			{
				name: "evo_overmind_syncronize_2",
				desc: localize("evo_overmind_syncronize_2_desc", "50%"),
				icon: "",
				weight: 10,
				requirementsMet: this.syncronize == 1,
				reference: this,
				effect: function(overmind)
				{
					overmind.syncronize = 2
				}
			},
			{
				name: "evo_overmind_shockSpire",
				desc: localize("evo_overmind_shockSpire_desc"),
				icon: "",
				weight: 10,
				requirementsMet: this.shockSpire == 0,
				reference: this,
				effect: function(overmind)
				{
					overmind.shockSpire = 1
					overmind.base.duration = 420
					overmind.base.rateOfFire = 50
				}
			},
			{
				name: "evo_overmind_shockSpire_2",
				desc: localize("evo_overmind_shockSpire_2_desc", "+30%", "+30%"),
				icon: "",
				weight: 10,
				requirementsMet: this.shockSpire == 1,
				reference: this,
				effect: function(overmind)
				{
					overmind.shockSpire = 2
					modifiers.addPercModifier(overmind, "evo_overmind_shockSpire_2", { duration: .3 })
				}
			},
			{
				name: "evo_overmind_burningOnes",
				desc: localize("evo_overmind_burningOnes_desc"),
				icon: "",
				weight: 10,
				requirementsMet: this.burningOnes == 0,
				reference: this,
				effect: function(overmind)
				{
					overmind.burningOnes = 1
					overmind.base.range = 250
					modifiers.addAbsModifier(overmind, "evo_overmind_burningOnes", { explosive: 50 })
					factory.spawn(BurningOnesChargeup, overmind)
				}
			},
			{
				name: "evo_overmind_burningOnes_2",
				desc: localize("evo_overmind_burningOnes_2_desc", "5", "+20", "+50%"),
				icon: "",
				weight: 10,
				requirementsMet: this.burningOnes == 1,
				reference: this,
				effect: function(overmind)
				{
					overmind.burningOnes = 2
					overmind.burningOnesDroneCount = 15
					modifiers.addAbsModifier(overmind, "evo_overmind_burningOnes", { explosive: 20 })
					modifiers.addPercModifier(overmind, "evo_overmind_burningOnes", { range: .5 })
				}
			},
			{
				name: "evo_overmind_null_field",
				desc: localize("evo_overmind_null_field_desc", "50%"),
				icon: "",
				weight: 10,
				requirementsMet: this.nullField == 0,
				reference: this,
				effect: function(overmind)
				{
					overmind.nullField = 1
				}
			},
			{
				name: "evo_overmind_null_field_2",
				desc: localize("evo_overmind_null_field_2_desc"),
				icon: "",
				weight: 10,
				requirementsMet: this.nullField == 1,
				reference: this,
				effect: function(overmind)
				{
					overmind.nullField = 2
				}
			}
		]
	}

	getUpgrades()
	{
		let currentOvermindRangeBoost =
			modifiers.getModifierCount(this, "overmind_upgrade_range_common") +
			modifiers.getModifierCount(this, "overmind_upgrade_range_uncommon") * 2 +
			modifiers.getModifierCount(this, "overmind_upgrade_range_rare") * 3
		let overmindRangeWeightFactor = Math.max(1 - (currentOvermindRangeBoost / 15), 0)
		
		return [
			{
				name: "overmind_upgrade_damage_common",
				desc: localize("overmind_upgrade_damage_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_overmind_title",
				weight: 60,
				group: "overmind_damage",
				requirementsMet: true,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_damage_common", {damage: .1})
				}
			},
			{
				name: "overmind_upgrade_damage_uncommon",
				desc: localize("overmind_upgrade_damage_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_overmind_title",
				weight: 20,
				group: "overmind_damage",
				requirementsMet: true,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_damage_uncommon", {damage: .2})
				}
			},
			{
				name: "overmind_upgrade_damage_rare",
				desc: localize("overmind_upgrade_damage_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_overmind_title",
				weight: 7,
				group: "overmind_damage",
				requirementsMet: true,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_damage_rare", {damage: .3})
				}
			},
			{
				name: "overmind_upgrade_speed_common",
				desc: localize("overmind_upgrade_speed_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_overmind_title",
				weight: 60,
				group: "overmind_speed",
				requirementsMet: true,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_speed_common", {speed: .1})
				}
			},
			{
				name: "overmind_upgrade_speed_uncommon",
				desc: localize("overmind_upgrade_speed_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_overmind_title",
				weight: 20,
				group: "overmind_speed",
				requirementsMet: true,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_speed_uncommon", {speed: .2})
				}
			},
			{
				name: "overmind_upgrade_speed_rare",
				desc: localize("overmind_upgrade_speed_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_overmind_title",
				weight: 7,
				group: "overmind_speed",
				requirementsMet: true,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_speed_rare", {speed: .3})
				}
			},
			{
				name: "overmind_upgrade_count_uncommon",
				desc: localize("overmind_upgrade_count_desc", "1"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_overmind_title",
				weight: 20 * ((20 - this.droneCount) / 10),
				group: "overmind_count",
				requirementsMet: this.droneCount < 20,
				reference: this,
				effect: function(overmind)
				{
					overmind.droneCount++
				}
			},
			{
				name: "overmind_upgrade_count_rare",
				desc: localize("overmind_upgrade_count_desc", "2"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_overmind_title",
				weight: 7 * ((20 - this.droneCount) / 10),
				group: "overmind_count",
				requirementsMet: this.droneCount < 19,
				reference: this,
				effect: function(overmind)
				{
					overmind.droneCount += 2
				}
			},
			{
				name: "overmind_upgrade_range_common",
				desc: localize("overmind_upgrade_range_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_overmind_title",
				weight: 60 * overmindRangeWeightFactor,
				group: "overmind_range",
				requirementsMet: this.burningOnes > 0,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_range_common", {range: .1})
				}
			},
			{
				name: "overmind_upgrade_range_uncommon",
				desc: localize("overmind_upgrade_range_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_overmind_title",
				weight: 20 * overmindRangeWeightFactor,
				group: "overmind_range",
				requirementsMet: this.burningOnes > 0,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_range_uncommon", {range: .2})
				}
			},
			{
				name: "overmind_upgrade_range_rare",
				desc: localize("overmind_upgrade_range_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_overmind_title",
				weight: 7 * overmindRangeWeightFactor,
				group: "overmind_range",
				requirementsMet: this.burningOnes > 0,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_range_rare", {range: .3})
				}
			},
			{
				name: "overmind_upgrade_rateOfFire_common",
				desc: localize("overmind_upgrade_rateOfFire_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_overmind_title",
				weight: 60,
				group: "overmind_rateOfFire",
				requirementsMet: this.shockSpire > 0,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_rateOfFire_common", {rateOfFire: .1})
				}
			},
			{
				name: "overmind_upgrade_rateOfFire_uncommon",
				desc: localize("overmind_upgrade_rateOfFire_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_overmind_title",
				weight: 20,
				group: "overmind_rateOfFire",
				requirementsMet: this.shockSpire > 0,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_rateOfFire_uncommon", {rateOfFire: .2})
				}
			},
			{
				name: "overmind_upgrade_rateOfFire_rare",
				desc: localize("overmind_upgrade_rateOfFire_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_overmind_title",
				weight: 7,
				group: "overmind_rateOfFire",
				requirementsMet: this.shockSpire > 0,
				reference: this,
				effect: function(overmind)
				{
					modifiers.addPercModifier(overmind, "overmind_upgrade_rateOfFire_rare", {rateOfFire: .3})
				}
			}
		]
	}
}

const droneRotationSpeed = .2
const droneCooldown = 5
const droneSkipFrames = 7

class OvermindDrone extends FriendlyDrone
{
	constructor()
	{
		super()
		this.lastCoords = Array(2)
	}

	reset(parent)
	{
		// Determine idle position.
		this.idlePosition = Vector.add(
			Vector.rotate (
				{ x: scalePix(Random.uniform(parent.radius * .1, parent.radius * .1)), y: 0 },
				Random.uniform(Math.PI, Math.PI)
			),
			screenCenter
		)

		// Init variables.
		super.reset(parent)
		this.position = this.idlePosition
		this.rotation = Random.uniform(Math.PI, Math.PI)
		this.currentTarget = null
		this.currentCooldown = 0
		this.idle = true

		// Record last coords for trail.
		this.lastCoords.fill(this.position)
		this.skipFrames = droneSkipFrames
	}

	suspend()
	{
		if (this.parent.droneConstructionTimer)
			this.parent.droneConstructionTimer.updateQueue()
		super.suspend()
	}

	on_update()
	{
		// Skip update if paused.
		if (isPaused()) return

		// Check if target is still alive.
		if (this.currentTarget && !this.currentTarget.active)
			this.currentTarget = null

		// Determine if idle.
		if (!this.currentTarget && !this.idle && distanceBetween(this.position, screenCenter) < this.parent.radius)
			this.idle = true
		else if (this.currentTarget && this.idle)
			this.idle = false

		// Get angle to target.
		let target = this.currentTarget ? this.currentTarget.getPosition() : this.idlePosition
		let direction = Vector.sub(target, this.position)
		let angle = Math.atan2(direction.y, direction.x)

		// Rotate (pick whatever direction is closer).
		let difference = diff(this.rotation, angle)
		if (Math.abs(difference) > droneRotationSpeed)
			this.rotation += Math.sign(difference) * droneRotationSpeed
		else
			this.rotation = angle

		// Determine velocity.
		this.velocity = Vector.mult(
			Vector.create(
				Math.cos(this.rotation),
				Math.sin(this.rotation)
			),
			this.idle ? scalePix(1.3) : scalePix(this.parent.mod.speed)
		)

		// Detect collisions.
		if (this.currentCooldown == 0)
		{
			let nextPosition = Vector.add(this.position, this.velocity)
			let collisions = Matter.Query.ray(hostileBodies, this.position, nextPosition)
			if (collisions.length > 0)
			{
				let collision = collisions[0]
				let other = hostiles.get(collision.bodyA.id)
				if (other)
				{
					if (other.getType() == type.armor)
					{
						this.currentCooldown = 60
						let colPt = collisionPoint(this.position, nextPosition, collision.bodyA)
						other.getHit(this.parent.dmg.mod.all, this.parent, colPt)
					}
					else if (other.getType() == type.enemy && other.protection == null)
					{
						this.currentCooldown = droneCooldown
						let colPt = collisionPoint(this.position, nextPosition, collision.bodyA)

						// Handle damage.
						let damage = Random.uniform(this.parent.allDamageExceptExplosive, 1) * (this.superSpectre ? 2 : 1)
						let result = other.getHit(damage, this.parent, colPt, this.parent.allDamageTypesExceptExplosive())
						this.parent.recordDamage(result.damage)

						// Play hit effect.
						let randomPositionX = Random.uniform(colPt.x, 3)
						let randomPositionY = Random.uniform(colPt.y, 3)
						factory.spawn(Impact, randomPositionX, randomPositionY)
						audioHandler.playAudioHook(result.isCrit ? "overmind_drone_crit" : "overmind_drone_hit", getPanFromX(colPt.x))
						for (let i = 0; i < 7; i++)
							factory.spawn(Sparks, randomPositionX, randomPositionY, Random.normal(this.rotation, Math.PI / 6))
					}
				}
			}
		}
		else
			this.currentCooldown -= 1

		// Record previous position to draw trail.
		if (--this.skipFrames == 0)
		{
			this.skipFrames = droneSkipFrames
			this.lastCoords.push(this.position)
			this.lastCoords.shift()
		}

		// Move.
		this.position = Vector.add(this.position, this.velocity)
	}

	on_render()
	{
		PrimNative.drawFilledCircle(Surface.Screen, this.position.x, this.position.y, scalePix(3), midGray)
		if (!this.idle)
			for (let i = 0; i < this.lastCoords.length; i++)
			{
				let thisCoord = this.lastCoords[i]
				let nextCoord = i == this.lastCoords.length - 1 ? this.position : this.lastCoords[i + 1]
				DrawLightning(thisCoord, nextCoord, .2)
			}
	}
}

class ConstructingDrone extends Powerup
{
	constructor() { super("overmind_constructing_drone") }
	reset(duration, parent)
	{
		this.parent = parent
		super.reset(duration, true)
		this.updateQueue()
	}
	updateQueue()
	{
		let queueLength = this.parent.droneCount - this.parent.children.length - 1
		this.node.setText(
			localize("overmind_constructing_drone"),
			queueLength > 0 ? localize("overmind_constructing_drone_desc", queueLength) : ""
		)
	}
	on_init()
	{
		audioHandler.playAudioHook("overmind_constructing_drone_start")
	}
	on_expire(forced)
	{
		if (!forced)
		{
			audioHandler.playAudioHook("overmind_constructing_drone_stop")
			factory.spawn(OvermindDrone, this.parent)
			this.parent.droneConstructionTimer = null
			this.parent.reprioritize()
		}
	}
}

const BurningOnesDroneTrailMaxCooldown = 2
const BurningOnesDroneTurnSpeed = .05
const BurningOnesIgnoreEnemies = ["Jormungandr", "BodySegment"]
class BurningOnesDrone extends Entity
{
	constructor()
	{
		super()
		this.speed = scalePix(5)
		this.smokeMaxSize = scalePix(35)
	}

	reset(parent, target, direction)
	{
		this.parent = parent
		this.position = screenCenter
		this.direction = direction
		this.target = target
		this.trail = []
		this.trailCooldown = 0
		this.currentSpeed = this.speed * 2
	}

	on_update()
	{
		// Skip update if paused.
		if (isPaused()) return

		// Drop speed if not at minimum speed.
		if (this.currentSpeed > this.speed)
			this.currentSpeed = Math.max(this.currentSpeed - .1, this.speed)

		// Progress trail.
		let currentAngle = Math.atan2(this.direction.y, this.direction.x)
		if (--this.trailCooldown <= 0)
		{
			this.trailCooldown = BurningOnesDroneTrailMaxCooldown
			let position = 
				Vector.add (
					Vector.rotate (
						{ x: Random.discrete(0, scalePix(15)), y: 0 },
						Random.uniform(currentAngle, Math.PI / 4)
					),
					this.position
				)
			this.trail.push({
				position: position,
				size: scalePix(10)
			})
		}
		for (let i = this.trail.length - 1; i >= 0; i--)
		{
			let trailPoint = this.trail[i]
			trailPoint.size += scalePix(.5)
			if (trailPoint.size > this.smokeMaxSize)
				this.trail.splice(i, 1)
		}

		// Process target.
		if (this.target && this.target.active)
		{
			// Explode if reached target.
			if (distanceBetween(this.position, this.target.getPosition()) <= this.speed)
			{
				factory.spawn(BurningOnesExplosion, this.position, this.parent)
				this.suspend()
				return
			}

			// Get angle to nearest enemy.
			let directionToTarget = Vector.sub(this.target.getPosition(), this.position)
			let targetAngle = Math.atan2(directionToTarget.y, directionToTarget.x)

			// Rotate (pick whatever direction is closer).
			let difference = diff(currentAngle, targetAngle)
			if (Math.abs(difference) > BurningOnesDroneTurnSpeed)
				this.direction = Vector.rotate(this.direction, Math.sign(difference) * BurningOnesDroneTurnSpeed)
		}

		// Change target if needed.
		else
		{
			let hostilesCopy = hostilesArray.filter(enemy =>
				enemy.getType() == type.enemy
				&& Matter.Bounds.overlaps(enemy.body.bounds, screenBounds)
				&& !BurningOnesIgnoreEnemies.includes(enemy.constructor.name)
			)
			this.target = hostilesCopy.length > 0 ? Random.sample(hostilesCopy) : null
		}

		// Move forward.
		this.position = Vector.add(this.position, Vector.mult(this.direction, this.currentSpeed))

		// Destroy if out of bounds.
		if (!Matter.Bounds.contains(screenBounds, this.position)
			&& this.trail.every(trailPoint => !Matter.Bounds.contains(screenBounds, trailPoint.position))
		)
			this.suspend()
	}

	on_render()
	{
		// Render trail.
		this.trail.forEach(trailPoint => {
			PrimNative.drawFilledCircle(
				Surface.Screen,
				trailPoint.position.x,
				trailPoint.position.y,
				trailPoint.size,
				midGray.fadeTo((1 - trailPoint.size / this.smokeMaxSize) * .5))
		})

		// Render drone.
		PrimNative.drawFilledCircle(Surface.Screen, this.position.x, this.position.y, scalePix(5), paleYellow)
	}
}

const BurningOnesChargeupKeyCount = 50
class BurningOnesChargeup extends Powerup
{
	constructor()
	{
		super("augment_gambler")
		this.node.setText(localize("evo_overmind_burningOnes_charge"), localize("evo_overmind_burningOnes_charge_desc", "0"))
	}

	reset(parent)
	{
		super.reset(BurningOnesChargeupKeyCount, true, false)
		this.parent = parent
	}

	update(amount)
	{
		this.node.currentProgress += amount
		if (this.node.currentProgress >= this.node.maxProgress)
			this.expire()
		else
			this.node.setText(
				localize("evo_overmind_burningOnes_charge"),
				localize(
					"evo_overmind_burningOnes_charge_desc",
					Math.round(this.node.currentProgress / this.node.maxProgress * 100)
				)
			)
	}

	on_expire(forced)
	{
		// Don't spawn drones if forced.
		if (forced) return

		// Play audio.
		audioHandler.playAudioHookUI("overmind_burningOnes_spawn")
		
		// Get list of enemies on screen.
		let hostilesOnScreen = hostilesArray.filter(enemy =>
			enemy.getType() == type.enemy
			&& Matter.Bounds.overlaps(enemy.body.bounds, screenBounds)
			&& !BurningOnesIgnoreEnemies.includes(enemy.constructor.name)
		)

		// If non-zero, assign drones to targets.
		if (hostilesOnScreen.length > 0)
		{
			let droneCount = this.parent.burningOnesDroneCount
			while (droneCount > 0)
			{
				let hostilesCopy = hostilesOnScreen.slice()
				let hostilesLen = hostilesCopy.length

				// Shuffle copy of hostiles list.
				while (--hostilesLen > 0)
				{
					let randIndex = Random.discrete(0, hostilesLen)
					let temp = hostilesCopy[hostilesLen]
					hostilesCopy[hostilesLen] = hostilesCopy[randIndex]
					hostilesCopy[randIndex] = temp
				}

				// Assign drones to targets, repeat until all drones assigned.
				while (hostilesCopy.length > 0 && droneCount > 0)
				{
					let target = hostilesCopy.pop()
					factory.spawn(
						BurningOnesDrone,
						this.parent,
						target,
						Vector.rotate(
							{ x: 1, y: 0 },
							(Math.PI * 2 / this.parent.burningOnesDroneCount) * (this.parent.burningOnesDroneCount - droneCount)
						)
					)
					droneCount--
				}
			}
		}

		// Else, spawn drones without targets.
		else for (let i = 0; i < this.parent.burningOnesDroneCount; i++)
			factory.spawn(
				BurningOnesDrone,
				this.parent,
				null,
				Vector.rotate(
					{ x: 1, y: 0 },
					Math.PI * 2 / this.parent.burningOnesDroneCount * i
				)
			)

		// Reset timer.
		factory.spawn(BurningOnesChargeup, this.parent)
	}
}

const overmindBurningOnesExplosionCount = 7
class BurningOnesExplosion extends Entity
{
	reset(position, parent)
	{
		this.explosions = []
		for (let i = 0; i < overmindBurningOnesExplosionCount; i++)
		{
			let randomAngle = Random.uniform(Math.PI, Math.PI)
			let explosionSize = Random.uniform(parent.mod.range / 3, parent.mod.range / 10)
			let explosionDistance = Random.discrete(0, parent.mod.range - explosionSize)
			let explosionPosition = Vector.add(Vector.rotate({x: explosionDistance, y: 0}, randomAngle), position)
			
			let delay = explosionDistance / 10
			this.explosions.push({
				delay,
				payload: () => {
					audioHandler.playAudioHook("overmind_burningOnes_explode", getPanFromX(explosionPosition.x))
					factory.spawn(
						Explosion,
						explosionPosition.x,
						explosionPosition.y,
						parent,
						explosionSize,
						true,
						{ 
							damage: parent.dmg.mod.explosive,
							type: 'explosive'
						}
					)
				}
			})
		}
	}

	on_update()
	{
		if (!isPaused())
		{
			for (let i = 0; i < this.explosions.length; i++) {
				let explosion = this.explosions[i]
				explosion.delay -= 1
				if (explosion.delay <= 0) {
					explosion.payload()
					this.explosions[i] = this.explosions[this.explosions.length - 1]
					this.explosions.pop()
				}
			}
			if (this.explosions.length == 0)
				this.suspend()
		}
	}
}

const OvermindReticleTimer = 420
class OvermindReticle extends Entity
{
	constructor()
	{
		super()
		this.tween = new FastTween()
	}

	reset(target, parent)
	{
		// Keep references.
		this.target = target
		this.parent = parent

		// Reset timer.
		this.timer = OvermindReticleTimer

		// Determine recticle size.
		let largeEnemy = target.largeEnemy || 1
		this.recticleSpikeDist = Math.max(target.radius * 2 * largeEnemy || scalePix(20), scalePix(20))
		this.recticleSpikeSpawnDist = this.recticleSpikeDist + scalePix(150)
		this.distance = this.recticleSpikeSpawnDist

		// Play sound.
		audioHandler.playAudioHook("overmind_target_acquire", getPanFromX(this.target.getPosition().x))

		// Start intro animation.
		this.renderArcs = false
		this.tween.easeIn([this.distance], [this.recticleSpikeDist], t => this.distance = t[0], 20)
			.then(() => this.renderArcs = true)
	}

	on_update()
	{
		// Pause.
		if (isPaused()) return

		// Progress Timer and check status of target.
		if (--this.timer == 0 || !(this.target && this.target.active))
		{
			if (this.parent)
				this.parent.targetExpired(this.target)
			this.suspend()

			// If Null Field II, remove Static.
			if (this.parent.nullField == 2
				&& this.target
				&& this.target.active
				&& this.target.getType() == type.enemy
				&& "statusEffects" in this.target
			)
			{
				let existingStatic = this.target.statusEffects.find(s => s[0] == "electricStatus")
				if (existingStatic)
					existingStatic[1] = 0
			}
		}
	}

	on_render()
	{
		if (!this.target || !this.target.active) return
		let pos = this.target.getPosition();
		[-1, 1].forEach(side => {
			const startAngle = -(Math.PI / 2) + side * Math.PI * .3;

			// Render Timer.
			if (this.renderArcs)
			{
				let percTimer = (this.timer / OvermindReticleTimer) * (Math.PI * .4) * side
				PrimNative.drawArc(Surface.Screen, pos.x, pos.y, this.recticleSpikeDist - scalePix(2), startAngle, Math.PI * .4 * side, scalePix(4), midGray.fadeTo(.3))
				PrimNative.drawArc(Surface.Screen, pos.x, pos.y, this.recticleSpikeDist - scalePix(2), startAngle, percTimer, scalePix(4), midGray)
			}

			// Render Spikes.
			else {
				[ startAngle, startAngle + side * Math.PI * .4 ].forEach(angle => {
					let near = Vector.add(Vector.rotate({ x: this.distance, y: 0 }, angle), pos)
					let far = Vector.add(Vector.rotate({ x: this.distance + scalePix(10), y: 0 }, angle), pos)
					let alpha = (this.recticleSpikeSpawnDist - this.distance) / this.recticleSpikeSpawnDist
					PrimNative.drawLine(Surface.Screen, near.x, near.y, far.x, far.y, scalePix(3), midGray.fadeTo(alpha))
				})
			}
		})
	}

	suspend()
	{
		this.parent.currentRecticles.splice(this.parent.currentRecticles.indexOf(this), 1)
		super.suspend()
	}
}

class ShockSpire extends FriendlyTurret
{
	reset(position, parent)
	{
		super.reset(position.x, position.y, parent)
		this.position = position
		this.parent = parent
		this.cooldown = 0
		this.expiry = 0
		this.rotation = Random.uniform(Math.PI, Math.PI)

		// Play sound.
		audioHandler.playAudioHook("overmind_shockSpire_deploy", getPanFromX(this.position.x))
	}

	update()
	{
		// Pause.
		if (isPaused()) return

		// Progress rotation.
		this.rotation += .01
		
		// Progress expiry.
		if (++this.expiry >= this.parent.mod.duration)
			this.suspend()

		// Emit electric pulse
		if (++this.cooldown >= 3600 / this.parent.mod.rateOfFire)
		{
			this.cooldown = 0
			factory.spawn(ShockSpireShockwave, this.position, this.parent)
			audioHandler.playAudioHook("overmind_shockSpire_fire", getPanFromX(this.position.x))
		}
	}

	on_render()
	{
		for (let i = 0; i < 6; i += 2)
		{
			const from = Vector.add(Vector.rotate({ x: scalePix(20), y: 0 }, i * Math.PI * .334 + this.rotation), this.position)
			const to = Vector.add(Vector.rotate({ x: scalePix(20), y: 0 }, (i + 1) * Math.PI * .334 + this.rotation), this.position)
			PrimNative.drawLine(Surface.Screen, from.x, from.y, to.x, to.y, scalePix(3), midGray)
		}
		PrimNative.drawFilledCircle(Surface.Screen, this.position.x, this.position.y, scalePix(7), midGray)
	}
}

class ShockSpireShockwave extends Entity
{
	reset(position, parent)
	{
		this.position = position
		this.parent = parent
		this.furthestEdge = Math.max (
			distanceBetween(this.position, { x: 0, y: 0 }),
			distanceBetween(this.position, { x: 0, y: Surface.Screen.height }),
			distanceBetween(this.position, { x: Surface.Screen.width, y: 0 }),
			distanceBetween(this.position, { x: Surface.Screen.width, y: Surface.Screen.height }),
		)
		this.radius = 0
		this.enemiesHit = []
	}

	on_update()
	{
		// Pause.
		if (isPaused()) return

		// Expand shockwave and damage enemies.
		this.radius += 10
		hostilesArray.forEach(enemy => {
			if (!this.enemiesHit.some(e => e == enemy)
				&& enemy.getType() == type.enemy
				&& Matter.Bounds.overlaps(enemy.body.bounds, screenBounds)
				&& distanceBetween(enemy.getPosition(), this.position) < this.radius)
			{
				let damage = this.parent.allDamageExceptExplosive
				damage *= this.parent.shockSpire == 2 ? 1.3 : 1
				damage = Random.uniform(damage, 1)
				if (enemy.protection)
				{
					enemy.protection.getHit(
						damage,
						this.parent,
						null,
						this.parent.allDamageTypesExceptExplosive()
					)
					this.enemiesHit.push(enemy)
					return
				}
				let result = enemy.getHit(damage, this.parent, null)
				this.parent.recordDamage(result.damage)
				this.enemiesHit.push(enemy)
				audioHandler.playAudioHook(result.isCrit ? "overmind_shockSpire_crit" : "overmind_shockSpire_hit", getPanFromX(enemy.getPosition().x))
			}
		})
		if (this.radius >= this.furthestEdge)
			this.suspend()
	}

	on_render()
	{
		for (let i = 0; i < 10; i++)
		{
			const from = Vector.add(Vector.rotate({ x: this.radius, y: 0 }, i * Math.PI * .2), this.position)
			const to = Vector.add(Vector.rotate({ x: this.radius, y: 0 }, (i + 1) * Math.PI * .2), this.position)
			if (Matter.Bounds.contains(screenBounds, from) || Matter.Bounds.contains(screenBounds, to))
				DrawLightning(from, to)
		}
	}
}
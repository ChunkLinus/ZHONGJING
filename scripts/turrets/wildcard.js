import { Random, Matter } from 'sphere-runtime'
import { Entity } from "../core/entityFactory.js"
import { getScreenEdgeCoords } from "./heatray.js"
import { Turret } from "./turret.js"
import { Impact } from '../effects/impact.js'
import { Sparks } from '../effects/sparks.js'
import { DrawLightning } from '../effects/drawLightning.js'
import { Explosion } from '../effects/explosion.js'
import { PausableTween } from '../core/fastTween.js'

const WILDCARD_KINETIC_PROJECTILE_SPEED = 5
const WILDCARD_KINETIC_PROJECTILE_SPEED_ONHIT = 1	// Speeds slows down when penetrating enemies.
const WILDCARD_HEAT_PROJECTILE_SPEED = 5
const WILDCARD_COLD_PROJECTILE_SPEED = 5
const WILDCARD_ELECTRIC_PROJECTILE_SPEED = 1.5
const WILDCARD_SHAPE_CHANGE_SPEED = .5

export class Wildcard extends Turret
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("weapon_wildcard_title") }
	static getDesc() { return localize("weapon_wildcard_desc") }
	static damageTags() { return [ "tag_kinetic", "tag_heat", "tag_cold", "tag_electric",] }
	static nonDamageTags() { return ["tag_main"] }

	constructor()
	{
		super()
		this.rotation = Random.uniform(Math.PI, Math.PI)
		this.currentDamageTags = [ "tag_kinetic", "tag_heat", "tag_cold", "tag_electric"]
		this.currentShot = null
		this.coldParticles = []
		this.heatParticles = []
		this.heatParticleRenderer = factory.spawn(WildcardHeatParticleRenderer, this)
		this.changeShape = false
		this.amplifiers = []
		this.conduit2Cooldown = 0

		// Evolutions.
		this.winter = 0
		this.warmth = 0
		this.repulsor = 0
		this.diamond = 0
		this.fragmentation = 0
		this.conduit = 0

		// Base stats.
		this.base.range = 200
		this.base.rateOfFire = 120
		this.base.duration = 420
		this.dmg.base.kinetic = 20
		this.dmg.base.heat = 30
		this.dmg.base.cold = 10
		this.dmg.base.electric = 20
		this.refreshModifiers()

		// Turret shape.
		const d = scalePix(25)
		this.kineticShape = []
		this.electricShape = []
		this.coldShape = []
		this.heatShape = [];

		["kinetic", "electric", "cold", "heat"]
			.forEach(type => {
				let radius
				switch(type)
				{
					case "kinetic":
						radius = (theta) => {
							const seg = (theta % (2 * Math.PI / 3))
							const local = seg - Math.PI / 3
							return (d * 0.5) / Math.cos(local)
						}
						break

					case "electric":
						radius = (theta) => {
							const period = Math.PI / 2
							const seg = theta % period
							const local = seg - Math.PI / 4
							return (d * Math.SQRT1_2) / Math.cos(local)
						}
						break

					case "cold":
						radius = (theta) => {

							// Normalise theta.
							const TWO_PI = 2 * Math.PI
							theta = theta % TWO_PI
							if (theta < 0) theta += TWO_PI

							const SIDE_ANGLE = Math.PI / 2
							const idx = Math.floor(theta / SIDE_ANGLE)
							const a = idx * SIDE_ANGLE
							const b = a + SIDE_ANGLE

							// radii at the vertices: 0 -> d, 1 -> d/2, 2 -> d, 3 -> d/2
							const rA = (idx % 2 === 0) ? d : d / 2
							const rB = ((idx + 1) % 2 === 0) ? d : d / 2

							// vertex coordinates
							const Ax = rA * Math.cos(a)
							const Ay = rA * Math.sin(a)
							const Bx = rB * Math.cos(b)
							const By = rB * Math.sin(b)

							// edge vector v = B - A
							const vx = Bx - Ax
							const vy = By - Ay

							// ray direction u = (cos θ, sin θ)
							const ux = Math.cos(theta)
							const uy = Math.sin(theta)

							// solve for t in: t * u = A + s * v  ->  t * u - s * v = A
							// Cross-product method: t = (A x v) / (u x v)
							const cross_uv = ux * vy - uy * vx
							if (Math.abs(cross_uv) < 1e-12)
								return Math.hypot(Ax, Ay) < Math.hypot(Bx, By) ? Math.hypot(Ax, Ay) : Math.hypot(Bx, By)

							const cross_Av = Ax * vy - Ay * vx
							const t = cross_Av / cross_uv
							return t
						}
						break

					default:
						radius = (_) => d
						break
				}

				for (let i = 0; i < 12; i++) {
					const theta = i * (Math.PI / 6)
					const r = radius(theta)
					this[type + "Shape"].push({
						x: r * Math.cos(theta),
						y: r * Math.sin(theta)
					});
				}
			})

		// Start weapon.
		this.start()
	}

	onGameStart()
	{
		this.currentShot = Random.sample(this.currentDamageTags)
		this.currentShape = this.getCurrentTargetShape().map(coord => Vector.clone(coord))
	}

	on_shutDown()
	{
		this.heatParticleRenderer.suspend()
		super.on_shutDown()
	}

	getCurrentTargetShape()
	{
		switch(this.currentShot)
		{
			case "tag_kinetic": return this.kineticShape
			case "tag_electric": return this.electricShape
			case "tag_cold": return this.coldShape
			case "tag_heat": return this.heatShape
		}
	}
	
	fire(target)
	{
		// Superclass fire.
		super.fire(target)

		// Spawn projectile based on current shot type.
		switch(this.currentShot)
		{
			case "tag_kinetic": 
				audioHandler.playAudioHook("wildcard_kinetic_fire")
				factory.spawn(WildcardProjectileKinetic, target, this)
				break

			case "tag_heat":
				audioHandler.playAudioHook("wildcard_heat_fire")
				factory.spawn(WildcardProjectileHeat, target, this)
				break

			case "tag_cold":
				audioHandler.playAudioHook("wildcard_cold_fire")
				factory.spawn(WildcardProjectileCold, target, this)
				break

			case "tag_electric":
				audioHandler.playAudioHook("wildcard_electric_fire")
				factory.spawn(WildcardProjectileElectric, target, this)
				break
		}

		// Randomize next shot type.
		this.currentShot = Random.sample(this.currentDamageTags.filter(shot => shot != this.currentShot))
		this.changeShape = true
	}

	on_update()
	{
		// If paused, skip update.
		if (isPaused()) return

		// Update rotation.
		this.rotation += .05

		// Progress DOT cooldown if Conduit evolution.
		if (this.conduit == 2 && ++this.conduit2Cooldown >= 3600 / this.mod.rateOfFire)
			this.conduit2Cooldown = 0

		// Progress cold particles.
		for (let i = this.coldParticles.length - 1; i >= 0; i--)
		{
			const particle = this.coldParticles[i]
			particle.alpha -= .02
			if (particle.alpha <= 0)
				this.coldParticles.splice(i, 1)
		}

		// Progress heat particles.
		for (let i = this.heatParticles.length - 1; i >= 0; i--)
		{
			const particle = this.heatParticles[i]
			if (particle.flareSize > 0) particle.flareSize -= 1
			particle.size -= .5
			if (particle.size <= 0)
				this.heatParticles.splice(i, 1)
		}

		// Update shape.
		if (this.changeShape)
		{
			const targetShape = this.getCurrentTargetShape()
			let coordsDone = 0
			for (let i = 0; i < this.currentShape.length; i++)
			{
				const coord = this.currentShape[i]
				const target = targetShape[i]
				if (coord.x != target.x || coord.y != target.y)
				{
					if (distanceBetween(coord, target) < scalePix(WILDCARD_SHAPE_CHANGE_SPEED))
					{
						coord.x = target.x
						coord.y = target.y
					}
					else
					{
						const velocity = Vector.mult(
							Vector.normalise(Vector.sub(target, coord)),
							scalePix(WILDCARD_SHAPE_CHANGE_SPEED)
						)
						coord.x += velocity.x
						coord.y += velocity.y
					}
				}
				else coordsDone++
			}
			if (coordsDone == this.currentShape.length)
				this.changeShape = false
		}
	}

	electricTurretDamage(position, applyDamage = false, chainFrom = false)
	{
		let enemyInRange = false
		hostilesArray.forEach((enemy) => {
			if (enemy.getType() == type.enemy
				&& Matter.Bounds.overlaps(enemy.body.bounds, screenBounds)
				&& distanceBetween(enemy.getPosition(), position) < scalePix(this.mod.range)
				&& !(chainFrom && this.amplifiers.includes(enemy))
			)
			{
				if (!enemyInRange)
					enemyInRange = true

				// If armor in line of fire.
				let armor = armoredEnemies.includes(enemy.constructor.name)
					? Matter.Query.ray(hostileBodies, screenCenter, enemy.getPosition())
						.find(col => {
							let hostile = hostiles.get(col.bodyA.id)
							return hostile && hostile.getType() == type.armor
						})
					: enemy.protection

				if (armor) 
				{
					if ("bodyA" in armor) armor = hostiles.get(armor.bodyA.id)
					let pointHitOnShield = collisionPoint(screenCenter, enemy.getPosition(), armor.body)
					DrawLightning(position, pointHitOnShield)
					if (applyDamage)
						armor.getHit(this.dmg.mod.electric, this, pointHitOnShield)
				}
				else 
				{
					DrawLightning(position, enemy.getPosition())
					if (applyDamage)
					{
						let damage = this.dmg.mod.electric
						damage = Random.uniform(damage, damage * .1)
						let result = enemy.getHit(damage, this, null, "electric")
						this.recordDamage(result.damage)
					}
				}
			}

			// Draw lighting from point of origin.
			if (chainFrom && enemyInRange)
				DrawLightning(chainFrom, position)
		})
		return enemyInRange
	}

	refreshModifiers()
	{
		super.refreshModifiers()
		this.primaryDamageTag = [ ...this.currentDamageTags ]
		this.mod.coldStatusChance = 1
	}

	on_render()
	{
		// Render main weapon UI.
		super.on_render()

		// Draw faint circle beneath turret.
		PrimNative.drawCircle(Surface.Screen, screenCenter.x, screenCenter.y, scalePix(20), scalePix(2), midGray.fadeTo(.2))

		// Skip if currentShape == null (happens during wiki generation)
		if (!this.currentShape) return

		// Render turret.
		for (let i = 0; i < this.currentShape.length; i++)
		{
			const thisCoord = Vector.add(Vector.rotate(this.currentShape[i], this.rotation), screenCenter)
			let nextCoord = i == this.currentShape.length - 1 ? this.currentShape[0] : this.currentShape[i + 1]
			nextCoord = Vector.add(Vector.rotate(nextCoord, this.rotation), screenCenter)
			PrimNative.drawFilledTriangle(
				Surface.Screen,
				thisCoord.x, thisCoord.y,
				nextCoord.x, nextCoord.y, 
				screenCenter.x, screenCenter.y,
				midGray
			)
		}
		const from = Vector.add(Vector.rotate(this.currentShape[0], this.rotation), screenCenter)
		const to = Vector.add(Vector.rotate(this.currentShape[6], this.rotation), screenCenter)
		PrimNative.drawLine(Surface.Screen, from.x, from.y, to.x, to.y, scalePix(2), paleYellow)
		PrimNative.drawFilledCircle(Surface.Screen, screenCenter.x, screenCenter.y, scalePix(5), paleYellow)

		// Render cold particles.
		this.coldParticles.forEach(p => {
			PrimNative.drawFilledCircle(Surface.Screen, p.x, p.y, scalePix(p.size), midGray.fadeTo(p.alpha * .5))
		})
	}

	getEvolution()
	{
		return [
			{
				name: "evo_wildcard_winter",
				desc: localize("evo_wildcard_winter_desc", "+30%"),
				icon: "",
				weight: 10,
				group: "damageTypeRemover",
				requirementsMet: (
					this.winter == 0 &&
					this.warmth == 0 &&
					this.repulsor == 0 &&
					this.diamond == 0
				),
				reference: this,
				effect: function(wildcard)
				{
					wildcard.winter = 1
					wildcard.currentDamageTags.splice(wildcard.currentDamageTags.indexOf("tag_heat"), 1)
					wildcard.dmg.base.heat = 0
					modifiers.addPercModifier("tag_cold", "evo_wildcard_winter", { damage: .3 })
				}
			},
			{
				name: "evo_wildcard_winter_2",
				desc: localize("evo_wildcard_winter_2_desc", "+50%"),
				icon: "",
				weight: 10,
				requirementsMet: this.winter == 1,
				reference: this,
				effect: function(wildcard)
				{
					wildcard.winter = 2
					modifiers.addPercModifier("tag_cold", "evo_wildcard_winter_2", { damage: .5 })
				}
			},
			{
				name: "evo_wildcard_warmth",
				desc: localize("evo_wildcard_warmth_desc", "+30%"),
				icon: "",
				weight: 10,
				group: "damageTypeRemover",
				requirementsMet: (
					this.winter == 0 &&
					this.warmth == 0 &&
					this.repulsor == 0 &&
					this.diamond == 0
				),
				reference: this,
				effect: function(wildcard)
				{
					wildcard.warmth = 1
					wildcard.currentDamageTags.splice(wildcard.currentDamageTags.indexOf("tag_cold"), 1)
					wildcard.dmg.base.cold = 0
					modifiers.addPercModifier("tag_heat", "evo_wildcard_warmth", { damage: .3 })
				}
			},
			{
				name: "evo_wildcard_warmth_2",
				desc: localize("evo_wildcard_warmth_2_desc", "+50%"),
				icon: "",
				weight: 10,
				requirementsMet: this.warmth == 1,
				reference: this,
				effect: function(wildcard)
				{
					wildcard.warmth = 2
					modifiers.addPercModifier("tag_heat", "evo_wildcard_warmth_2", { damage: .5 })
				}
			},
			{
				name: "evo_wildcard_repulsor",
				desc: localize("evo_wildcard_repulsor_desc", "+30%"),
				icon: "",
				weight: 10,
				group: "damageTypeRemover",
				requirementsMet: (
					this.winter == 0 &&
					this.warmth == 0 &&
					this.repulsor == 0 &&
					this.diamond == 0
				),
				reference: this,
				effect: function(wildcard)
				{
					wildcard.repulsor = 1
					wildcard.currentDamageTags.splice(wildcard.currentDamageTags.indexOf("tag_kinetic"), 1)
					wildcard.dmg.base.kinetic = 0
					modifiers.addPercModifier("tag_electric", "evo_wildcard_repulsor", { damage: .3 })
				}
			},
			{
				name: "evo_wildcard_repulsor_2",
				desc: localize("evo_wildcard_repulsor_2_desc", "+50%"),
				icon: "",
				weight: 10,
				requirementsMet: this.repulsor == 1,
				reference: this,
				effect: function(wildcard)
				{
					wildcard.repulsor = 2
					modifiers.addPercModifier("tag_electric", "evo_wildcard_repulsor_2", { damage: .5 })
				}
			},
			{
				name: "evo_wildcard_diamond",
				desc: localize("evo_wildcard_diamond_desc", "+30%"),
				icon: "",
				weight: 10,
				group: "damageTypeRemover",
				requirementsMet: (
					this.winter == 0 &&
					this.warmth == 0 &&
					this.repulsor == 0 &&
					this.diamond == 0
				),
				reference: this,
				effect: function(wildcard)
				{
					wildcard.diamond = 1
					wildcard.currentDamageTags.splice(wildcard.currentDamageTags.indexOf("tag_electric"), 1)
					wildcard.dmg.base.electric = 0
					modifiers.addPercModifier("tag_kinetic", "evo_wildcard_diamond", { damage: .3 })
				}
			},
			{
				name: "evo_wildcard_diamond_2",
				desc: localize("evo_wildcard_diamond_2_desc", "+50%"),
				icon: "",
				weight: 10,
				requirementsMet: this.diamond == 1,
				reference: this,
				effect: function(wildcard)
				{
					wildcard.diamond = 2
					modifiers.addPercModifier("tag_kinetic", "evo_wildcard_diamond_2", { damage: .5 })
				}
			},
			{
				name: "evo_wildcard_fragmentation",
				desc: localize("evo_wildcard_fragmentation_desc"),
				icon: "",
				weight: 10,
				requirementsMet: this.fragmentation == 0 && this.repulsor == 0,
				reference: this,
				effect: function(wildcard)
				{
					wildcard.fragmentation = 1
				}
			},
			{
				name: "evo_wildcard_fragmentation_2",
				desc: localize("evo_wildcard_fragmentation_2_desc"),
				icon: "",
				weight: 10,
				requirementsMet: this.fragmentation == 1 && this.repulsor == 0,
				reference: this,
				effect: function(wildcard)
				{
					wildcard.fragmentation = 2
				}
			},
			{
				name: "evo_wildcard_conduit",
				desc: localize("evo_wildcard_conduit_desc"),
				icon: "",
				weight: 10,
				requirementsMet: this.conduit == 0 && this.diamond == 0,
				reference: this,
				effect: function(wildcard)
				{
					wildcard.conduit = 1
				}
			},
			{
				name: "evo_wildcard_conduit_2",
				desc: localize("evo_wildcard_conduit_2_desc"),
				icon: "",
				weight: 10,
				requirementsMet: this.conduit == 1 && this.diamond == 0,
				reference: this,
				effect: function(wildcard)
				{
					wildcard.conduit = 2
				}
			},
			{
				name: "evo_wildcard_pestilence",
				desc: localize("evo_wildcard_pestilence_desc", "+5%"),
				icon: "",
				weight: 10,
				requirementsMet: modifiers.getModifierCount(this, "evo_wildcard_pestilence") == 0,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(
						wildcard,
						"evo_wildcard_pestilence",
						{
							heatStatusChance: .05,
							electricStatusChance: .05,
							kineticStatusChance: .05
						}
					)
				}
			},
			{
				name: "evo_wildcard_pestilence_2",
				desc: localize("evo_wildcard_pestilence_2_desc", "+50%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					modifiers.getModifierCount(this, "evo_wildcard_pestilence") == 1
					&& modifiers.getModifierCount("tag_status", "evo_wildcard_pestilence_2") == 0
				),
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier("tag_status", "evo_wildcard_pestilence_2", { damage: .5 })
				}
			}
		]
	}

	getUpgrades()
	{
		const currentWildcardRangeBoost =
			modifiers.getModifierCount(this, "wildcard_upgrade_range_common") +
			modifiers.getModifierCount(this, "wildcard_upgrade_range_uncommon") * 2 +
			modifiers.getModifierCount(this, "wildcard_upgrade_range_rare") * 3
		const wildcardRangeWeightFactor = Math.max(1 - (currentWildcardRangeBoost / 15), 0)

		return [
			...super.getEvolutionUpgrades(),
			{
				name: "wildcard_upgrade_damage_common",
				desc: localize("wildcard_upgrade_damage_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_wildcard_title",
				weight: 60,
				group: "wildcard_damage",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_damage_common", {damage: 0.1})
				}
			},
			{
				name: "wildcard_upgrade_damage_uncommon",
				desc: localize("wildcard_upgrade_damage_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_wildcard_title",
				weight: 20,
				group: "wildcard_damage",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_damage_uncommon", {damage: 0.2})
				}
			},
			{
				name: "wildcard_upgrade_damage_rare",
				desc: localize("wildcard_upgrade_damage_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_wildcard_title",
				weight: 7,
				group: "wildcard_damage",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_damage_rare", {damage: 0.3})
				}
			},
			{
				name: "wildcard_upgrade_rateOfFire_common",
				desc: localize("wildcard_upgrade_rateOfFire_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_wildcard_title",
				weight: 60,
				group: "wildcard_rate",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_rateOfFire_common", {rateOfFire: 0.1})
				}
			},
			{
				name: "wildcard_upgrade_rateOfFire_uncommon",
				desc: localize("wildcard_upgrade_rateOfFire_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_wildcard_title",
				weight: 20,
				group: "wildcard_rate",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_rateOfFire_uncommon", {rateOfFire: 0.2})
				}
			},
			{
				name: "wildcard_upgrade_rateOfFire_rare",
				desc: localize("wildcard_upgrade_rateOfFire_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_wildcard_title",
				weight: 7,
				group: "wildcard_rate",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_rateOfFire_rare", {rateOfFire: 0.3})
				}
			},
			{
				name: "wildcard_upgrade_range_common",
				desc: localize("wildcard_upgrade_range_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_wildcard_title",
				weight: 60 * wildcardRangeWeightFactor,
				group: "wildcard_range",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_range_common", {range: 0.1})
				}
			},
			{
				name: "wildcard_upgrade_range_uncommon",
				desc: localize("wildcard_upgrade_range_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_wildcard_title",
				weight: 20 * wildcardRangeWeightFactor,
				group: "wildcard_range",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_range_uncommon", {range: 0.2})
				}
			},
			{
				name: "wildcard_upgrade_range_rare",
				desc: localize("wildcard_upgrade_range_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_wildcard_title",
				weight: 7 * wildcardRangeWeightFactor,
				group: "wildcard_range",
				requirementsMet: true,
				reference: this,
				effect: function(wildcard)
				{
					modifiers.addPercModifier(wildcard, "wildcard_upgrade_range_rare", {range: 0.3})
				}
			}
		]
	}
}

class WildcardHeatParticleRenderer extends Entity
{
	constructor()
	{
		super()
		this.heatParticleSurface = new Surface(Surface.Screen.width, Surface.Screen.height)
		this.heatParticleShape = textureShape(this.heatParticleSurface, false)
		this.heatParticleMaskSurface = new Surface(Surface.Screen.width, Surface.Screen.height)
		this.heatParticleMaskSurface.clear(new Color(0, 0, 0, .5))
		this.heatParticleMaskShape = textureShape(this.heatParticleMaskSurface, false)
	}

	reset(parent)
	{
		this.parent = parent
		this.heatParticleSurface.clear()
	}

	on_renderStart()
	{
		this.parent.heatParticles.forEach(particle => PrimNative.drawFilledCircle(
			this.heatParticleSurface,
			particle.pos.x,
			particle.pos.y,
			particle.size,
			midGray
		))
		this.heatParticleSurface.blendOp = BlendOp.Subtract
		this.heatParticleMaskShape.draw(this.heatParticleSurface)
		this.heatParticleSurface.blendOp = BlendOp.Default
		this.heatParticleShape.draw(Surface.Screen)
	}

	on_render()
	{
		this.parent.heatParticles.forEach(particle => PrimNative.drawFilledCircle(
			Surface.Screen,
			particle.pos.x,
			particle.pos.y,
			particle.flareSize,
			paleYellow
		))
	}
}

class WildCardProjectile extends Entity
{
	reset(target, parent)
	{
		// Store target and parent turret.
		this.target = target
		this.parent = parent

		// Add to parent's children.
		parent.children.push(this)

		// Start at screen center and head towards target.
		this.position = screenCenter
		const vecToTarget = Vector.sub(target.getPosition(), this.position)
		this.velocity = Vector.normalise(vecToTarget)
		this.angle = Math.atan2(this.velocity.y, this.velocity.x) / Math.PI * 180
	}

	hitTarget(enemy, damageType, colPt = null)
	{
		let damage = this.parent.dmg.mod[damageType]
		damage = Random.uniform(damage, damage * .1)
		let result = enemy.getHit(damage, this.parent, colPt, damageType)
		this.parent.recordDamage(result.damage)
		return result
	}

	suspend()
	{
		this.on_shutDown()
		this.parent.children.splice(this.parent.children.indexOf(this), 1)
		super.suspend()
	}
}

const WILDCARD_FRAGMENTATION_COOLDOWN = 6
class WildcardProjectileKinetic extends WildCardProjectile
{
	reset(target, parent)
	{
		super.reset(target, parent)
		this.cooldown = 0
		this.screwOffset = .1
		this.fragmentationCooldown = 0
	}

	on_update()
	{
		if (isPaused()) return

		// Process Fragmentation cooldown.
		if (this.fragmentationCooldown > 0)
			this.fragmentationCooldown--

		// If out of screen, destroy.
		if (!Matter.Bounds.contains(screenBounds, this.position))
			this.suspend()

		// Progress cooldown.
		if (this.cooldown > 0)
			this.cooldown--
		else
		{
			// Detect collisions.
			const tipPosition = Vector.add(this.position, Vector.mult(Vector.normalise(this.velocity), scalePix(this.parent.mod.range / 4)))
			let collisions = Matter.Query.ray(hostileBodies, this.position, tipPosition, scalePix(this.parent.mod.range / 15))
			if (collisions.length > 0)
			{
				// Reset cooldown.
				this.cooldown = 2

				// Slow down projectile.
				this.velocity = Vector.mult(Vector.normalise(this.velocity), scalePix(WILDCARD_KINETIC_PROJECTILE_SPEED_ONHIT))

				// Handle each collision.
				for (const other of collisions.map(collision => hostiles.get(collision.bodyA.id)))
				{
					// Make sure enemy is still valid.
					if (other && !other.protection)
					{
						// Get collision point.
						const colPt = other.getPosition()

						// Fragmentation Evolution.
						if (this.parent.fragmentation > 0 && this.fragmentationCooldown == 0)
						{
							this.fragmentationCooldown = WILDCARD_FRAGMENTATION_COOLDOWN
							if (this.parent.amplifiers.includes(other))
							{
								const pt = Vector.add(Vector.rotate({ x: scalePix(50), y: 0 }, Random.uniform(Math.PI, Math.PI)), this.position)
								factory.spawn(WildcardColdExplosion, pt.x, pt.y, this.parent, true)
							}

							else if (this.parent.fragmentation == 2)
							{
								const pt = Vector.add(Vector.rotate({ x: scalePix(50), y: 0 }, Random.uniform(Math.PI, Math.PI)), this.position)
								audioHandler.playAudioHook("wildcard_fragmentation_enemy", getPanFromX(pt.x))
								factory.spawn(
									Explosion,
									pt.x, pt.y,
									this.parent,
									this.parent.mod.range * .5,
									false,
									{
										type: 'kinetic',
										damage: Random.uniform(this.parent.dmg.mod.kinetic * .5, 3)
									}
								)
							}
						}

						// Handle damage.
						const result = this.hitTarget(other, "kinetic", colPt)

						// VFX.
						let randomPositionX = Random.uniform(colPt.x, scalePix(5))
						let randomPositionY = Random.uniform(colPt.y, scalePix(5))
						let angle = Math.atan2(this.velocity.y, this.velocity.x)
						factory.spawn(Impact, randomPositionX, randomPositionY)
						for (let i = 0; i < 5; i++)
							factory.spawn(Sparks, randomPositionX, randomPositionY, Random.normal(angle, Math.PI / 6))

						// SFX.
						audioHandler.playAudioHook(result.isCrit ? `wildcard_kinetic_crit` : `wildcard_kinetic_hit`, getPanFromX(colPt.x))
					}
				}
			}

			// Else, return to normal speed if slowed.
			else if (Vector.magnitude(this.velocity) < scalePix(WILDCARD_KINETIC_PROJECTILE_SPEED))
				this.velocity = Vector.mult(Vector.normalise(this.velocity), scalePix(WILDCARD_KINETIC_PROJECTILE_SPEED))

			// If Fragmentation, also trigger explosions on contact with Heat Orbs.
			if (this.parent.fragmentation > 0 && this.fragmentationCooldown == 0)
			{
				this.fragmentationCooldown = WILDCARD_FRAGMENTATION_COOLDOWN
				this.parent.amplifiers.forEach(amp =>
				{
					// If Heat Orb.
					if (amp.constructor.name == "WildcardProjectileHeatOrb"
						&& distanceBetween(this.position, amp.getPosition()) <= amp.currentOrbSize)
					{
						const pt = Vector.add(Vector.rotate({ x: scalePix(50), y: 0 }, Random.uniform(Math.PI, Math.PI)), this.position)
						audioHandler.playAudioHook("wildcard_fragmentation_heat", getPanFromX(pt.x))
						factory.spawn(
							Explosion,
							pt.x, pt.y,
							this.parent,
							this.parent.mod.range,
							false,
							{
								type: 'heat',
								damage: Random.uniform(this.parent.dmg.mod.heat * .5, 3)
							}
						)
					}
				})
			}
		}

		// Move to next position.
		this.position = Vector.add(this.position, this.velocity)
	}

	on_render()
	{
		// Draw projectile model.
		wildcardKineticModel.transform.identity()
		wildcardKineticModel.transform.rotate(this.angle)
		wildcardKineticModel.transform.scale(scalePix(this.parent.mod.range), scalePix(this.parent.mod.range))
		wildcardKineticModel.transform.translate(this.position.x, this.position.y)
		wildcardKineticModel.draw(Surface.Screen)

		// Draw screw lines.
		for (let i = 0; i < 1; i += .25)
			this.drawScrewLine(i + this.screwOffset, scalePix(this.parent.mod.range), this.velocity)
		this.screwOffset += .01
		if (this.screwOffset > .25) this.screwOffset = 0
	}

	drawScrewLine(fraction, range, velocity)
	{
		const tipLength = range / 4
		const sideRadius = range / 15
		const normalizedVel = Vector.normalise(velocity)
		
		// Calculate positions.
		const topCenterPos = Vector.add(this.position, Vector.mult(normalizedVel, tipLength * (1 - fraction)))
		const rightPos = Vector.add(topCenterPos, Vector.mult(Vector.perp(normalizedVel, true), sideRadius * fraction))
		const btmCenterPos = Vector.add(this.position, Vector.mult(normalizedVel, tipLength * (1 - (fraction + .05))))
		const leftPos = Vector.add(btmCenterPos, Vector.mult(Vector.perp(normalizedVel), sideRadius * (fraction + .05)))
		PrimNative.drawLine(Surface.Screen, rightPos.x, rightPos.y, leftPos.x, leftPos.y, scalePix(2), midGray)
	}
}

class WildcardProjectileHeat extends WildCardProjectile
{
	reset(target, parent)
	{
		super.reset(target, parent)
		this.velocity = Vector.mult(this.velocity, scalePix(WILDCARD_HEAT_PROJECTILE_SPEED))
		this.particleCooldown = 0
	}

	on_update()
	{
		// If paused, do nothing.
		if (isPaused()) return

		// Spawn trail particles.
		if (++this.particleCooldown >= 3)
		{
			const pos = Vector.add(
				Vector.mult(
					Vector.perp(
						Vector.normalise(this.velocity)
					),
					Random.uniform(0, scalePix(this.parent.mod.range * .03))
				),
				this.position
			)
			this.parent.heatParticles.push({
				pos: pos,
				flareSize: scalePix(4),
				size: scalePix(8)
			})
		}

		// If out of screen, destroy.
		if (!Matter.Bounds.contains(screenBounds, this.position))
			this.suspend()

		// Detect collisions.
		let nextPosition = Vector.add(this.position, this.velocity)
		let collisions = Matter.Query.ray(hostileBodies, this.position, nextPosition)
		if (collisions.length > 0)
		{
			let collision = collisions[0]
			let other = hostiles.get(collision.bodyA.id)
			let colPt = collisionPoint(this.position, nextPosition, collision.bodyA)

			if (other)
			{
				// Deal damage.
				this.hitTarget(other, "heat", colPt)

				// Spawn heat orbs.
				const startAngle = Random.uniform(Math.PI, Math.PI)
				for (let i = 0; i < 3; i++)
				{
					const targetPos = Vector.add (
						Vector.rotate (
							{ x: scalePix(this.parent.mod.range * .4), y: 0 },
							i * Math.PI * .667 + startAngle
						),
						colPt
					)
					const orb = factory.spawn(WildcardProjectileHeatOrb, targetPos, Vector.clone(colPt), this.parent)
					if (i == 0) orb.audioStart()	// Play SFX.
				}
				this.suspend()
			}
		}

		// Move projectile.
		this.position = nextPosition
	}

	on_renderStart()
	{
		PrimNative.drawFilledCircle(
			this.parent.heatParticleRenderer.heatParticleSurface,
			this.position.x,
			this.position.y,
			scalePix(this.parent.mod.range * .05),
			midGray
		)
	}

	on_render()
	{
		PrimNative.drawFilledCircle(Surface.Screen, this.position.x, this.position.y, scalePix(this.parent.mod.range * .025), paleYellow)
	}
}

const WILDCARD_HEAT_PROJECTILE_ROTATION_SPEED = .1
class WildcardProjectileHeatOrb extends Entity
{
	constructor()
	{
		super()
		this.tween = new PausableTween()
	}

	reset(position, target, parent)
	{
		this.position = Vector.clone(target)
		this.parent = parent
		this.target = target
		this.enemiesOnCooldown = []
		this.particleCooldown = 0
		this.duration = 0
		this.parent.amplifiers.push(this)
		this.heatAudioLoop = null
		
		// Get current rotation.
		const vecFromTarget = Vector.sub(position, target)
		this.rotation = Math.atan2(vecFromTarget.y, vecFromTarget.x)

		// Reset orb parameters to prepare for spawn animation.
		this.distanceToTarget = 0
		this.currentOrbSize = 0
		this.ready = false

		// Start spawn animation.
		const stepFunc = t => {
			this.distanceToTarget = t[0]
			this.currentOrbSize = t[1]
		}
		this.tween.easeIn([0, 0], [distanceBetween(position, target), scalePix(this.parent.mod.range * .2)], stepFunc, 20)
			.then(() => this.ready = true)
	}

	audioStart()
	{
		if (this.heatAudioLoop == null)
		{
			audioHandler.playAudioHook("wildcard_heat_wheel", getPanFromX(this.position.x))
			this.heatAudioLoop = audioHandler.playAudioHook("wildcard_heat_loop", getPanFromX(this.position.x), true)
		}
	}

	audioStop()
	{
		if (this.heatAudioLoop != null)
		{
			this.heatAudioLoop.stop()
			this.heatAudioLoop = null
		}
	}

	on_shutDown()
	{
		this.audioStop()
	}

	on_update()
	{
		// If pause, skip update.
		if (isPaused()) return

		// Progress rotation.
		this.rotation += .05
		const nextPosition = Vector.add(Vector.rotate({ x: this.distanceToTarget, y: 0 }, this.rotation), this.target)

		// If still in spawn animation, skip rest of update.
		if (!this.ready) { this.position = nextPosition; return }

		// Progress duration.
		if (++this.duration >= this.parent.mod.duration)
			this.suspend()

		// Parse cooldown list.
		for (let i = this.enemiesOnCooldown.length - 1; i >= 0; i--)
			if (--this.enemiesOnCooldown[i][1] <= 0)
				this.enemiesOnCooldown.splice(i, 1)
		
		if (this.parent.conduit == 2)
			this.parent.electricTurretDamage(this.position, this.parent.conduit2Cooldown == 0)

		// Spawn trail particles.
		const direction = Vector.normalise(Vector.sub(nextPosition, this.position))
		if (++this.particleCooldown >= 3)
		{
			const pos = Vector.add(
				Vector.mult(
					Vector.rotate(
						Vector.neg(direction),
						Random.uniform(Math.PI, Math.PI) / 2
					),
					scalePix(Random.discrete(0, this.parent.mod.range * .07))
				),
				this.position
			)
			this.parent.heatParticles.push({
				pos: pos,
				flareSize: scalePix(8),
				size: scalePix(16)
			})
		}

		// Process damage.
		const startPos = Vector.add(Vector.mult(Vector.neg(direction), this.currentOrbSize), this.position)
		const endPos = Vector.add(nextPosition, Vector.mult(direction, this.currentOrbSize))
		Matter.Query.ray(hostileBodies, startPos, endPos, this.currentOrbSize * 2)
			.map(col => hostiles.get(col.bodyA.id))
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
					audioHandler.playAudioHook("wildcard_heat_hit", getPanFromX(colPtShield.x))
					this.hitTarget(armor, "heat", colPtShield)
					this.enemiesOnCooldown.push([armor, 3600 / this.parent.mod.rateOfFire])
					factory.spawn(Impact, colPtShield.x, colPtShield.y)
					return
				}

				// Handle damage.
				let result = this.hitTarget(enemy, "heat")
				this.enemiesOnCooldown.push([enemy, 3600 / this.parent.mod.rateOfFire])

				// Hit effects.
				let randomPositionX = Random.uniform(enemy.getPosition().x, scalePix(5))
				let randomPositionY = Random.uniform(enemy.getPosition().y, scalePix(5))
				factory.spawn(Impact, randomPositionX, randomPositionY)
				audioHandler.playAudioHook((result.isCrit ? "wildcard_heat_crit" : "wildcard_heat_hit"), getPanFromX(randomPositionX))
			})
		
		// Move orb.
		this.position = nextPosition
	}

	getPosition()
	{
		return this.position
	}

	suspend()
	{
		this.on_shutDown()
		if (this.parent && this.parent.amplifiers.includes(this))
			this.parent.amplifiers.splice(this.parent.amplifiers.indexOf(this), 1)
		super.suspend()
	}

	hitTarget(enemy, damageType, colPt = null)
	{
		let damage = this.parent.dmg.mod[damageType]
		damage = Random.uniform(damage, damage * .1)
		let result = enemy.getHit(damage, this.parent, colPt, damageType)
		this.parent.recordDamage(result.damage)
		return result
	}

	on_renderStart()
	{
		PrimNative.drawFilledCircle(
			this.parent.heatParticleRenderer.heatParticleSurface,
			this.position.x,
			this.position.y,
			this.currentOrbSize,
			midGray
		)
	}

	on_render()
	{
		PrimNative.drawFilledCircle(
			Surface.Screen,
			this.position.x,
			this.position.y,
			this.currentOrbSize * .5,
			paleYellow)
	}
}

class WildcardProjectileElectric extends WildCardProjectile
{
	reset(target, parent)
	{
		super.reset(target, parent)
		this.velocity = Vector.mult(this.velocity, scalePix(WILDCARD_ELECTRIC_PROJECTILE_SPEED))
		const targetPos = target.getPosition()
		this.screenEdgeCoords = getScreenEdgeCoords(targetPos.x, targetPos.y)
		this.rotation = Random.uniform(Math.PI, Math.PI)
		this.cooldown = 0
		this.enemiesInRange = false
		this.electricAudioLoop = null
	}

	audioStart()
	{
		if (this.electricAudioLoop == null)
		{
			audioHandler.playAudioHook("wildcard_electric_attack", getPanFromX(this.position.x))
			this.electricAudioLoop = audioHandler.playAudioHook("wildcard_electric_loop", getPanFromX(this.position.x), true)
		}
	}

	audioStop()
	{
		if (this.electricAudioLoop != null)
		{
			this.electricAudioLoop.stop()
			this.electricAudioLoop = null
		}
	}

	on_shutDown()
	{
		this.audioStop()
	}

	on_update()
	{
		// If paused, do nothing.
		if (isPaused()) return

		// If out of screen, destroy.
		if (!Matter.Bounds.contains(screenBounds, this.position))
			this.suspend()

		// Progress cooldown.
		if (++this.cooldown >= 3600 / this.parent.mod.rateOfFire)
			this.cooldown = 0

		// Rotate.
		this.rotation += .01

		// Electric arc to nearby enemies.
		const enemiesInRangeThisFrame = this.parent.electricTurretDamage(this.position, this.cooldown == 0)

		// Play SFX if enemies just got in range.
		if (!this.enemiesInRange && enemiesInRangeThisFrame)
			this.audioStart()
		else if (this.enemiesInRange && !enemiesInRangeThisFrame)
			this.audioStop()

		// Save enemiesInRange for comparision next frame.
		this.enemiesInRange = enemiesInRangeThisFrame

		// Conduit.
		if (this.parent.conduit == 1)
			this.parent.amplifiers.forEach(amp => {
				if (distanceBetween(this.position, amp.getPosition()) < scalePix(this.parent.mod.range))
					this.parent.electricTurretDamage(amp.getPosition(), this.cooldown == 0, this.position)
			})

		// Move projectile.
		this.position = Vector.add(this.velocity, this.position)
	}

	on_render()
	{
		this.startingAngle = this.rotation - Math.PI * .25
		for (let i = 0; i < 4; i++)
		{
			const angle = this.startingAngle + (i * Math.PI * .5)
			const startPos = Vector.add(this.position, Vector.rotate({ x: scalePix(15), y: 0 }, angle))
			const endPos = Vector.add(this.position, Vector.rotate({ x: scalePix(15), y: 0 }, angle + Math.PI * .5))
			DrawLightning(startPos, endPos, .5)
			PrimNative.drawFilledCircle(Surface.Screen, startPos.x, startPos.y, scalePix(3), midGray)
		}
	}
}

const WILDCARD_COLD_PARTCILE_EFFECT_COOLDOWN = 3
class WildcardProjectileCold extends WildCardProjectile
{
	reset(target, parent)
	{
		super.reset(target, parent)
		this.velocity = Vector.mult(this.velocity, scalePix(WILDCARD_COLD_PROJECTILE_SPEED))
		this.particleCooldown = WILDCARD_COLD_PARTCILE_EFFECT_COOLDOWN
	}

	on_update()
	{
		// If paused, skip update.
		if (isPaused()) return
		
		// If out of screen, destroy.
		if (!Matter.Bounds.contains(screenBounds, this.position))
			this.suspend()

		// Detect collisions.
		let nextPosition = Vector.add(this.position, this.velocity)
		let collisions = Matter.Query.ray(hostileBodies, this.position, nextPosition)
		if (collisions.length > 0)
		{
			let collision = collisions[0]
			let other = hostiles.get(collision.bodyA.id)
			let colPt = collisionPoint(this.position, nextPosition, collision.bodyA)

			// Spawn cold explosion.
			if (other)
			{
				factory.spawn(WildcardColdExplosion, colPt.x, colPt.y, this.parent)
				audioHandler.playAudioHook(`wildcard_cold_explosion_start`, getPanFromX(colPt.x))
				this.suspend()
			}
		}

		// Move projectile.
		this.position = nextPosition

		// Add particles.
		if (--this.particleCooldown <= 0)
		{
			this.particleCooldown = WILDCARD_COLD_PARTCILE_EFFECT_COOLDOWN
			const pos = Vector.add(Vector.rotate(this.velocity, Random.uniform(Math.PI, Math.PI / 2)), this.position)
			this.parent.coldParticles.push({
				x: pos.x,
				y: pos.y,
				size: Random.discrete(1, 3),
				alpha: 1
			})
		}
	}
	
	on_render()
	{
		wildcardColdModel.transform.identity()
		wildcardColdModel.transform.scale(scalePix(20), scalePix(20))
		wildcardColdModel.transform.rotate(this.angle)
		wildcardColdModel.transform.translate(this.position.x, this.position.y)
		wildcardColdModel.draw(Surface.Screen)
	}
}

class WildcardColdExplosion extends Explosion
{
	constructor() {
		super()
		this.frostCirclesTweens = []
		this.duration = 30
		for (let i = 0; i < 3; i++)
			this.frostCirclesTweens.push(new PausableTween())
	}

	reset(x, y, parent, isFragmentation = false)
	{
		// Set vars.
		let radius = scalePix(parent.mod.range)
		this.sparks = true
		this.parent = parent
		this.position = Vector.create(x, y)
		this.radius = 0
		this.radiusPerFrame = radius / this.duration
		this.forceDamage = { type: "cold", damage: parent.dmg.mod.cold * (isFragmentation ? .5 : 1) }
		this.collided = []

		// Expanding radius.
		this.tween.easeOut([this.radius], [radius], (t) => this.radius = t[0], this.duration)
		this.coldParticleCooldown = WILDCARD_COLD_PARTCILE_EFFECT_COOLDOWN

		// Frost circles.
		const allPromises = []
		this.frostCircles = [
			{ active: false, current: parent.mod.range * .333 * .8, max: parent.mod.range * .333, rotation: Random.uniform(Math.PI, Math.PI), alpha: 0 },
			{ active: false, current: parent.mod.range * .667 * .8, max: parent.mod.range * .667, rotation: Random.uniform(Math.PI, Math.PI), alpha: 0 },
			{ active: false, current: parent.mod.range * .8, max: parent.mod.range, rotation: Random.uniform(Math.PI, Math.PI), alpha: 0 }
		]
		this.frostCircles.forEach((circle, i) => {
			allPromises.push(new Promise(resolve => {
				Sphere.sleep(this.duration / 3 * i)
					.then(() => {
						circle.active = true
						audioHandler.playAudioHook("wildcard_cold_explosion", getPanFromX(this.position.x))
						this.frostCirclesTweens[i].easeOut([circle.current, 0], [circle.max, 1], t => { circle.current = t[0]; circle.alpha = t[1] }, this.duration / 3)
							.then(() => this.frostCirclesTweens[i].easeIn([1], [0], t => circle.alpha = t[0], this.duration)
								.then(() => resolve()))
					})
			}))
		})
		Promise.all(allPromises)
			.then(() => {
				this.collided.forEach(enemy => {
					let amp = enemy.isChild && enemy.parent ? enemy.parent : enemy
					if (!this.parent.amplifiers.includes(amp))
						this.parent.amplifiers.push(amp)
				})
				this.suspend()
			})
	}

	on_update()
	{
		// If paused, skip update.
		if (isPaused()) return

		// Else spawn more cold particles.
		super.on_update()
		if (--this.coldParticleCooldown <= 0)
		{
			this.coldParticleCooldown = WILDCARD_COLD_PARTCILE_EFFECT_COOLDOWN
			for (let i = 0; i < 10; i++)
			{
				const pos = Vector.add(Vector.rotate({ x: Random.uniform(this.radius, this.radius * .05), y: 0}, Random.uniform(Math.PI, Math.PI)), this.position)
				this.parent.coldParticles.push({ x: pos.x, y: pos.y, size: Random.discrete(1, 3), alpha: 1 })
			}
		}
	}

	on_render()
	{
		this.frostCircles.forEach(circle => {
			if (!circle.active) return
			wildcardColdExplosionModel.shader.setFloat("alpha", circle.alpha)
			wildcardColdExplosionModel.transform.identity()
			wildcardColdExplosionModel.transform.rotate(circle.rotation / Math.PI * 180)
			wildcardColdExplosionModel.transform.scale(scalePix(circle.current), scalePix(circle.current))
			wildcardColdExplosionModel.transform.translate(this.position.x, this.position.y)
			wildcardColdExplosionModel.draw(Surface.Screen)
		})
	}
}
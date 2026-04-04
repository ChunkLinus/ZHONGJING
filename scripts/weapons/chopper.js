import { Matter, Random } from 'sphere-runtime'
import { Weapon } from './weapon.js'
import { Impact } from '../effects/impact.js'
import { Sparks } from '../effects/sparks.js'
import { Entity } from '../core/entityFactory.js'

export class Chopper extends Weapon
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("weapon_chopper_title") }
	static getDesc() { return localize("weapon_chopper_desc") }
	static damageTags() { return ["tag_kinetic"] }
	static nonDamageTags() { return ["tag_remote"] }

	constructor()
	{
		super()

		this.choppersReady = 1
		this.chopperCountUpgrade = 0
		this.boomerang = false
		this.sawLauncher = 0
		this.bloodbath = 0
		this.activeChoppers = []

		this.dmg.base.kinetic = 24
		this.base.range = 150
		this.base.rateOfFire = 200
		this.base.speed = 4
		this.base.critChance = .01
		this.base.critMult = 2
		this.refreshModifiers()
	}

	onMainTurretFire(target)
	{
		if (this.choppersReady > 0)
		{
			this.choppersReady--
			let baseDirection = Vector.normalise(Vector.sub(target.getPosition(), screenCenter))

			if (this.sawLauncher == 1) {
				// Fire 2 saws (±10°)
				let angles = [-Math.PI / 18, 0, Math.PI / 18]
				let sawCount = [angles.length]
				angles.forEach(angle => {
					let rotated = Vector.rotate(baseDirection, angle)
					factory.spawn(SawInstance, rotated, this, sawCount)
				})
			}
			else if (this.sawLauncher == 2) {
				// Fire 4 saws (±10° and ±30°)
				let angles = [-Math.PI / 6, -Math.PI / 18, 0, Math.PI / 18, Math.PI / 6]
				let sawCount = [angles.length]
				angles.forEach(angle => {
					let rotated = Vector.rotate(baseDirection, angle)
					factory.spawn(SawInstance, rotated, this, sawCount)
				})
			}
			else
			{
				// Default single Chopper
				factory.spawn(ChopperInstance, baseDirection, this)
			}
		}
	}

	getEvolution()
	{
		return [
			{
				name: "evo_chopper_dualWield",
				desc: localize("evo_chopper_dualWield_desc"),
				icon: "",
				weight: 10,
				requirementsMet: this.chopperCountUpgrade == 0,
				reference: this,
				effect: function(chopper)
				{
					chopper.chopperCountUpgrade++
					chopper.choppersReady++
				}
			},
			{
				name: "evo_chopper_flamingBlades",
				desc: localize("evo_chopper_flamingBlades_desc", "-24", "+24"),
				icon: "",
				weight: 10,
				requirementsMet: modifiers.getModifierCount(this, "evo_chopper_flamingBlades") == 0,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addAbsModifier(chopper, "evo_chopper_flamingBlades", { heat: 24 , kinetic: -24 })
					chopper.refreshModifiers()
				}
			},
			{
				name: "evo_chopper_flamingBlades_2",
				desc: localize("evo_chopper_flamingBlades_2_desc", "+10", "+20%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					modifiers.getModifierCount(this, "evo_chopper_flamingBlades") > 0 &&
					modifiers.getModifierCount(this, "evo_chopper_flamingBlades_2") == 0
				),
				reference: this,
				effect: function(chopper)
				{
					modifiers.addAbsModifier(chopper, "evo_chopper_flamingBlades_2", { heat: 12 })
					modifiers.addPercModifier("tag_heat", "evo_chopper_flamingBlades_2", { damage: .2 })
					refreshAllModifiers()
				}
			},
			{
				name: "evo_chopper_boomerang",
				desc: localize("evo_chopper_boomerang_desc"),
				icon: "",
				weight: 10,
				requirementsMet: !this.boomerang,
				reference: this,
				effect: function(chopper)
				{
					chopper.boomerang = true
				}
			},
			{
				name: "evo_chopper_boomerang_2",
				desc: localize("evo_chopper_boomerang_2_desc", "+75%", "+50%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					this.boomerang &&
					modifiers.getModifierCount(this, "evo_chopper_boomerang_2") == 0
				),
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "evo_chopper_boomerang_2", { speed: .75, rateOfFire: .5 })
					chopper.refreshModifiers()
				}
			},
			{
				name: "evo_chopper_bloodbath",
				desc: localize("evo_chopper_bloodbath_desc", "+10%", "10%"),
				icon: "",
				weight: 10,
				requirementsMet: this.bloodbath == 0,
				reference: this,
				effect: function(chopper)
				{
					chopper.bloodbath++
				}
			},
			{
				name: "evo_chopper_bloodbath_2",
				desc: localize("evo_chopper_bloodbath_2_desc", "+25%", "25%"),
				icon: "",
				weight: 10,
				requirementsMet: this.bloodbath == 1,
				reference: this,
				effect: function(chopper)
				{
					chopper.bloodbath++
				}
			},
			{
				name: "evo_chopper_sawLauncher",
				desc: localize("evo_chopper_sawLauncher_desc", "+7%", "+25%", "+7%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					modifiers.getModifierCount(this, "evo_chopper_sawLauncher") == 0 &&
					currentTurret.constructor.name == "Repeater"

				),
				reference: this,
				effect: function(chopper)
				{
					chopper.sawLauncher++
					modifiers.addPercModifier(chopper, "evo_chopper_sawLauncher", {kineticStatusChance: .07})
					modifiers.addPercModifier("Bleeding", "evo_chopper_sawLauncher", {damage: .25})
					modifiers.addPercModifier(currentTurret, "evo_chopper_sawLauncher", {kineticStatusChance: .07})
					chopper.refreshModifiers()
				}
			},
			{
				name: "evo_chopper_sawLauncher_2",
				desc: localize("evo_chopper_sawLauncher_2_desc", "+12%", "+50%", "+12%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					modifiers.getModifierCount(this, "evo_chopper_sawLauncher") > 0 &&
					modifiers.getModifierCount(this, "evo_chopper_sawLauncher_2") == 0
				),
				reference: this,
				effect: function(chopper)
				{
					chopper.sawLauncher++
					modifiers.addPercModifier(chopper, "evo_chopper_sawLauncher_2", {kineticStatusChance: .12})
					modifiers.addPercModifier("Bleeding", "evo_chopper_sawLauncher_2", {damage: .50})
					modifiers.addPercModifier(currentTurret, "evo_chopper_sawLauncher_2", {kineticStatusChance: .07})
					chopper.refreshModifiers()
				}
			}
		]
	}

	getUpgrades()
	{
		return [
			...super.getEvolutionUpgrades(),
			{
				name: "chopper_upgrade_damage_common",
				desc: localize("chopper_upgrade_damage_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_chopper_title",
				weight: 60,
				group: "chopper_damage",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_damage_common", {damage: 0.1})
				}
			},
			{
				name: "chopper_upgrade_damage_uncommon",
				desc: localize("chopper_upgrade_damage_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_chopper_title",
				weight: 20,
				group: "chopper_damage",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_damage_uncommon", {damage: 0.2})
				}
			},
			{
				name: "chopper_upgrade_damage_rare",
				desc: localize("chopper_upgrade_damage_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_chopper_title",
				weight: 7,
				group: "chopper_damage",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_damage_rare", {damage: 0.3})
				}
			},
			{
				name: "chopper_upgrade_rate_common",
				desc: localize("chopper_upgrade_rate_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_chopper_title",
				weight: 60,
				group: "chopper_rate",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_rate_common", {rateOfFire: 0.1})
				}
			},
			{
				name: "chopper_upgrade_rate_uncommon",
				desc: localize("chopper_upgrade_rate_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_chopper_title",
				weight: 20,
				group: "chopper_rate",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_rate_uncommon", {rateOfFire: 0.2})
				}
			},
			{
				name: "chopper_upgrade_rate_rare",
				desc: localize("chopper_upgrade_rate_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_chopper_title",
				weight: 7,
				group: "chopper_rate",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_rate_rare", {rateOfFire: 0.3})
				}
			},
			{
				name: "chopper_upgrade_range_common",
				desc: localize("chopper_upgrade_range_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_chopper_title",
				weight: 60,
				group: "chopper_range",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_range_common", {range: 0.1})
				}
			},
			{
				name: "chopper_upgrade_range_uncommon",
				desc: localize("chopper_upgrade_range_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_chopper_title",
				weight: 20,
				group: "chopper_range",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_range_uncommon", {range: 0.2})
				}
			},
			{
				name: "chopper_upgrade_range_rare",
				desc: localize("chopper_upgrade_range_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_chopper_title",
				weight: 7,
				group: "chopper_range",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_range_rare", {range: 0.3})
				}
			},
			{
				name: "chopper_upgrade_bleed_common",
				desc: localize("chopper_upgrade_bleed_desc", "1%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_chopper_title",
				weight: 60,
				group: "chopper_bleed",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_bleed_common", {kineticStatusChance: .01})
				}
			},
			{
				name: "chopper_upgrade_bleed_uncommon",
				desc: localize("chopper_upgrade_bleed_desc", "3%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_chopper_title",
				weight: 20,
				group: "chopper_bleed",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_bleed_uncommon", {kineticStatusChance: .03})
				}
			},
			{
				name: "chopper_upgrade_bleed_rare",
				desc: localize("chopper_upgrade_bleed_desc", "5%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_chopper_title",
				weight: 7,
				group: "chopper_bleed",
				requirementsMet: true,
				reference: this,
				effect: function(chopper)
				{
					modifiers.addPercModifier(chopper, "chopper_upgrade_bleed_rare", {kineticStatusChance: .05})
				}
			}
		]
	}
}

class ChopperInstance extends Entity
{
	constructor() { super() }
	reset(direction, parent)
	{
		parent.activeChoppers.push(this)
		this.rotation = 0
		this.direction = direction
		this.position = {x: screenCenter.x, y: screenCenter.y}
		this.parent = parent
		this.boomerang = parent.boomerang
		audioHandler.playAudioHook("chopper_spawn")
	}

	on_update()
	{
		// If game not paused.
		if (!isPaused())
		{
			// Rotate.
			let rotationPerFrame = 360 * this.parent.mod.rateOfFire / 7200
			this.rotation -= rotationPerFrame

			// Determine next position.
			let nextPosition = Vector.add(this.position, Vector.mult(this.direction, scalePix(this.parent.mod.speed)))

			// Check if chopper should be destroyed.
			if (this.boomerang ?
				distanceBetween(nextPosition, screenCenter) < scalePix(this.parent.mod.speed) - 1 :
				!Matter.Bounds.contains(screenBounds, this.lastVisiblePoint(nextPosition)))
			{
				this.parent.choppersReady++
				this.parent.activeChoppers.splice(this.parent.activeChoppers.indexOf(this), 1)
				this.suspend()
				return
			}
			
			// If boomerang and reached edge of screen, bounce back.
			if (this.boomerang && !Matter.Bounds.contains(screenBounds, nextPosition))
			{
				this.direction = Vector.mult(this.direction, -1)
				this.position = Vector.add(this.position, Vector.mult(this.direction, scalePix(this.parent.mod.speed)))
			}
			else this.position = nextPosition

			// Get enemies in range.
			let collisions = hostilesArray.filter(enemy => {
				return enemy.getType() == type.enemy &&
					Matter.Bounds.overlaps(enemy.body.bounds, screenBounds) &&
					distanceBetween(this.position, enemy.getPosition()) <= scalePix(this.parent.mod.range)
			})
			if (collisions.length > 0)
			{
				// Get enemies hit by blades.
				let rotationInRadians = this.rotation / 180 * Math.PI
				let rotationVector = {x: Math.cos(rotationInRadians), y: Math.sin(rotationInRadians)}
				let angleRange = rotationPerFrame / 360 * Math.PI
				collisions = collisions.filter((enemy) => {
					let directionToEnemy = Vector.sub(enemy.getPosition(), this.position)
					return this.angleDifference(directionToEnemy, rotationVector) <= angleRange ||
						this.angleDifference(directionToEnemy, Vector.rotate(rotationVector, Math.PI)) <= angleRange
				})
				if (collisions.length > 0)
				{
					collisions.forEach((enemy) => {

						// Armor Check
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
							audioHandler.playAudioHook("chopper_hit_normal", getPanFromX(colPtShield.x))
							armor.getHit(this.parent.dmg.mod.all, this.parent, colPtShield)
							factory.spawn(Impact, colPtShield.x, colPtShield.y)
							return
						}

						// Handle damage
						let damage = Random.uniform(this.parent.dmg.mod.all, 5)
						if (this.parent.constructor.name === "Chopper" && this.parent.bloodbath > 0 && enemy.statusEffects.some(status => status[0] === "kineticStatus"))
						{
							damage *= this.parent.bloodbath == 2 ? 1.25 : 1.1
						}
						let result = enemy.getHit(damage, this.parent, null)
						this.parent.recordDamage(result.damage)

						// Hit effects
						let randomPositionX = Random.uniform(enemy.getPosition().x, 5)
						let randomPositionY = Random.uniform(enemy.getPosition().y, 5)
						let direction = Vector.sub({x: randomPositionX, y: randomPositionY}, this.position)
						let angle = Math.atan2(direction.y, direction.x)
						factory.spawn(Impact, randomPositionX, randomPositionY)
						audioHandler.playAudioHook(result.isCrit ? "chopper_hit_crit" : "chopper_hit_normal", getPanFromX(randomPositionX))
						for (let i = 0; i < 7; i++)
							factory.spawn(Sparks, randomPositionX, randomPositionY, Random.normal(angle, Math.PI / 6))
					})
				}
			}
		}
	}

	on_render()
	{
		chopperModel.transform.identity()
		chopperModel.transform.scale(scalePix(this.parent.mod.range), scalePix(this.parent.mod.range))
		chopperModel.transform.rotate(this.rotation)
		chopperModel.transform.translate(this.position.x, this.position.y)
		chopperModel.draw(Surface.Screen)
	}

	angleDifference(vecA, vecB)
	{
		return Math.abs(Math.acos(Vector.dot(vecA, vecB) / (Vector.magnitude(vecA) * Vector.magnitude(vecB))))
	}

	lastVisiblePoint(pos)
	{
		return Vector.add(Vector.mult(Vector.normalise(Vector.sub(screenCenter, pos)), scalePix(this.parent.mod.range)), pos)
	}
}

class SawInstance extends Entity
{
	constructor() { super() }
	reset(direction, parent, sawCount)
	{
		parent.activeChoppers.push(this)
		this.sawCount = sawCount
		this.rotation = 0
		this.direction = direction
		this.position = {x: screenCenter.x, y: screenCenter.y}
		this.parent = parent
		this.boomerang = parent.boomerang
		this.sawDamageCooldown = 0
		this.hitRadius = scalePix(this.parent.mod.range * 0.33)
		audioHandler.playAudioHook("chopper_spawn")
	}

	on_update()
	{
		// If game not paused.
		if (!isPaused())
		{
			// Rotate.
			let rotationPerFrame = 360 * this.parent.mod.rateOfFire / 7200
			this.rotation -= rotationPerFrame

			// Determine next position.
			let nextPosition = Vector.add(this.position, Vector.mult(this.direction, scalePix(this.parent.mod.speed)))

			// Check if chopper should be destroyed.
			if (this.boomerang ?
				distanceBetween(nextPosition, screenCenter) < scalePix(this.parent.mod.speed) - 1 :
				!Matter.Bounds.contains(screenBounds, this.lastVisiblePoint(nextPosition)))
			{
				// Check if all saws from this volley are destroyed and update choppersReady.
				this.sawCount[0]--
				if (this.sawCount[0] <= 0) this.parent.choppersReady++
				this.sawCount = null
				
				this.parent.activeChoppers.splice(this.parent.activeChoppers.indexOf(this), 1)
				this.suspend()
				return
			}
			
			// If boomerang and reached edge of screen, bounce back.
			if (this.boomerang && !Matter.Bounds.contains(screenBounds, nextPosition))
			{
				this.direction = Vector.mult(this.direction, -1)
				this.position = Vector.add(this.position, Vector.mult(this.direction, scalePix(this.parent.mod.speed)))
			}
			else this.position = nextPosition

			// Damage enemies in contact
			if (++this.sawDamageCooldown >= 200 / this.parent.mod.rateOfFire * 5)
			{
				this.sawDamageCooldown = 0

				hostilesArray.forEach(enemy =>
				{
					if (
						enemy.getType() != type.enemy ||
						!Matter.Bounds.overlaps(enemy.body.bounds, screenBounds) ||
						distanceBetween(this.position, enemy.getPosition()) > this.hitRadius
					) return

					// Armor check
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
						audioHandler.playAudioHook("chopper_hit_normal", getPanFromX(colPtShield.x))
						armor.getHit(this.parent.dmg.mod.all, this.parent, colPtShield)
						factory.spawn(Impact, colPtShield.x, colPtShield.y)
						return
					}

					// Handle Damage
					let damage = Random.uniform(this.parent.dmg.mod.all, 5)
					if (this.parent.constructor.name === "Chopper" && this.parent.bloodbath > 0 && enemy.statusEffects.some(status => status[0] === "kineticStatus"))
					{
						damage *= this.parent.bloodbath == 2 ? 1.25 : 1.1
					}
					let result = enemy.getHit(damage, this.parent, null)
					this.parent.recordDamage(result.damage)

					// Hit Effects
					let pos = enemy.getPosition()
					let angle = Math.atan2(pos.y - this.position.y, pos.x - this.position.x)
					let randX = Random.uniform(pos.x, 5)
					let randY = Random.uniform(pos.y, 5)
					factory.spawn(Impact, randX, randY)
					audioHandler.playAudioHook(result.isCrit ? "chopper_hit_crit" : "chopper_hit_normal", getPanFromX(randX))
					for (let i = 0; i < 7; i++)
						factory.spawn(Sparks, randX, randY, Random.normal(angle, Math.PI / 6))
				})
			}
		}
	}

	on_render()
	{
		chopperSawbladeModel.transform.identity()
		chopperSawbladeModel.transform.scale(this.hitRadius, this.hitRadius)
		chopperSawbladeModel.transform.rotate(-this.rotation / 2)
		chopperSawbladeModel.transform.translate(this.position.x, this.position.y)
		chopperSawbladeModel.draw(Surface.Screen)
	}

	lastVisiblePoint(pos)
	{
		return Vector.add(Vector.mult(Vector.normalise(Vector.sub(screenCenter, pos)), this.hitRadius), pos)
	}
}
import { Random, Matter } from 'sphere-runtime'
import { Weapon, FriendlyDrone } from './weapon.js'
import { Explosion } from '../effects/explosion.js'

const IgnoreEnemies = ["Jormungandr", "BodySegment"]

export class Minefield extends Weapon
{
	static getIcon() { return "" }
	static getName() { return localize("weapon_minefield_title") }
	static getDesc() { return localize("weapon_minefield_desc") }
	static damageTags() { return ["tag_explosive"] }
	static nonDamageTags() { return ["tag_drone"] }

	constructor()
	{
		super()
		this.extraLetters = 0

		// Word/Button matches.
		this.glyphMatches = [button_top, button_bottom]
		this.wordMatches = getTriggerLetters('Minefield')
		this.hunterSeeker = false
		
		// Base stats.
		this.baseAmount = 3
		this.dmg.base.explosive = 150
		this.base.range = 250
		this.base.speed = 1
		this.base.critChance = .01
		this.base.critMult = 3
		this.refreshModifiers()

		// Additional mines from upgrade.
		this.amountUpgrade = 0

		// Dirty Bomb - SplatterGun Combo Evo
		this.splatterMines = false
		this.splatterMinesUpgraded = false
		
		// Recursive Mines
		this.recursiveMinesNum = 0
		this.recursiveMines = false
		this.cooldown = 0
		this.start()
	}

	on_update()
	{
		// If Recursive Mines are active. Cooldown without upgrade: 12 sec. With upgrade: 9 sec.
		if (!isPaused() && this.recursiveMines)
			if (--this.cooldown <= 0)
			{
				this.cooldown = Math.round(720 / this.mod.rateOfFire)
				this.spawnMines(screenCenter, Math.floor((this.baseAmount + this.amountUpgrade) / 2) + this.recursiveMinesNum)
			}
	}

	getRandomWeightedNearest(position, ignore)
	{
		let eligibleTargets = hostilesArray.filter(hostile => 
			hostile.getType() == type.enemy &&
			Matter.Bounds.overlaps(hostile.body.bounds, screenBounds) &&
			!IgnoreEnemies.includes(hostile.constructor.name) &&
			hostile != ignore
		)
		let furthestDistance = eligibleTargets.reduce((furthest, current) => {
			let currentDistance = distanceBetween(current.getPosition(), position)
			return currentDistance > furthest ? currentDistance : furthest
		}, 0)
		let random = Random.discrete(0, eligibleTargets.reduce((tot, curr) => tot + (furthestDistance - distanceBetween(curr.getPosition(), position)), 0))
		return eligibleTargets.find(tar => {
			random -= furthestDistance - distanceBetween(tar.getPosition(), position)
			return random <= 0
		})
	}

	onWordComplete(word, quicktime, target)
	{
		if (usingController)
		{
			if (this.glyphMatches.some(v => quicktime[0] == v))
				this.spawnMines(target)
		}
		else 
		{
			if (this.wordMatches.some(v => word[0] == v))
				this.spawnMines(target)
		}
	}

	spawnMines(target, spawnAmount = this.baseAmount + this.amountUpgrade)
	{
		audioHandler.playAudioHook("minefield_spawn")
		let targetPos = "x" in target && "y" in target ? target : target.getPosition()
		let directionToCenter = screenCenter.x == targetPos.x && screenCenter.y == targetPos.y ?
			Vector.rotate(Vector.create(1, 0), Random.uniform(Math.PI, Math.PI)) :
			Vector.normalise(Vector.sub(screenCenter, targetPos))
		let mineCount = spawnAmount

		// Add bonus drones.
		mineCount += this.getBonusDrones(mineCount)

		// Spawn mines.
		for (let i = 0; i < mineCount; i++)
		{
			factory.spawn(
				MineDrone,
				targetPos.x,
				targetPos.y,
				Vector.rotate (
					directionToCenter,
					Random.normal(0, Math.PI / 3)),
				target,
				this,
				this.hunterSeeker ? this.getRandomWeightedNearest(targetPos, target) : null,
				currentTurret.constructor.name == "SplatterShot" ? currentTurret : null
			)
		}
	}

	getEvolution()
	{
		return [
			
			{
				name: this.wordMatches.length > 4 ? "evo_minefield_mineLayer_2" : "evo_minefield_mineLayer",
				desc: localize("evo_minefield_mineLayer_desc"),
				descBlock: true,
				triggerDesc: localize("starts_with_character"),
				triggerDescQuicktime: localize("starts_with_glyphs"),
				triggerValue: super.getNextExtraLetter(),
				triggerValueQuicktime: super.getNextExtraButton(),
				icon: "",
				weight: 10,
				requirementsMet: possibleExtraLetters.length > extraLetters.length,
				reference: this,
				effect: function(minefield)
				{
					let extraLetter = possibleExtraLetters.find(letter => !extraLetters.includes(letter))
					let extraButton = possibleExtraButtons.find(button => !extraButtons.includes(button))
					minefield.extraLetters += 1
					extraLetters.push(extraLetter)
					extraButtons.push(extraButton)
					minefield.wordMatches = [...minefield.wordMatches, ...extraLetter]
					minefield.glyphMatches.push(extraButton)
				}
			},
			{
				name: "evo_minefield_infusion",
				desc: localize("evo_minefield_infusion_desc", "+150", "-150"),
				icon: "",
				weight: 10,
				requirementsMet: modifiers.getModifierCount(this, "evo_minefield_infusion") == 0,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addAbsModifier(minefield, "evo_minefield_infusion", { chemical: 150 , explosive: -150 })
					minefield.refreshModifiers()
				}
			},
			{
				name: "evo_minefield_infusion_2",
				desc: localize("evo_minefield_infusion_2_desc", "+50", "+10%", "+20%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					modifiers.getModifierCount(this, "evo_minefield_infusion") > 0 &&
					modifiers.getModifierCount(this, "evo_minefield_infusion_2") == 0
				),
				reference: this,
				effect: function(minefield)
				{
					modifiers.addAbsModifier(minefield, "evo_minefield_infusion", { chemical: 50 })
					modifiers.addPercModifier(minefield, "evo_minefield_infusion_2", { chemicalStatusChance: .1 })
					modifiers.addPercModifier("tag_chemical", "evo_minefield_infusion_2", { damage: .2 })
					refreshAllModifiers()
				}
			},
			{
				name: "evo_minefield_hunterSeeker",
				desc: localize("evo_minefield_hunterSeeker_desc", "+200%", "-50%"),
				icon: "",
				weight: 10,
				requirementsMet: !this.hunterSeeker,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "evo_minefield_hunterSeeker", { speed: 2, range: -.5 })
					minefield.hunterSeeker = true
					minefield.refreshModifiers()
				}
			},
			{
				name: "evo_minefield_hunterSeeker_2",
				desc: localize("evo_minefield_hunterSeeker_2_desc", "+1", "+100%"),
				icon: "",
				weight: 20,
				requirementsMet: (
					this.hunterSeeker &&
					modifiers.getModifierCount(this, "evo_minefield_hunterSeeker_2") == 0
				),
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "evo_minefield_hunterSeeker_2", { speed: 1 })
					minefield.amountUpgrade++
					minefield.refreshModifiers()
				}
			},
			{
				name: "evo_minefield_dirtyBomb",
				desc: localize("evo_minefield_dirtyBomb_desc", "+5", "+10%"),
				icon: "",
				weight: 10,
				requirementsMet: (
					!this.splatterMines &&
					currentTurret.constructor.name == "SplatterShot"
				),
				reference: this,
				effect: function(minefield)
				{
					minefield.splatterMines = true
					modifiers.addAbsModifier(minefield, "evo_minefield_dirtyBomb", { chemical: 5 })
					modifiers.addPercModifier(currentTurret, "evo_minefield_dirtyBomb", {damage: .1})
					minefield.refreshModifiers()
				}
			},
			{
				name: "evo_minefield_dirtyBomb_2",
				desc: localize("evo_minefield_dirtyBomb_2_desc", "+5", "+10%"),
				icon: "",
				weight: 20,
				requirementsMet: (
					this.splatterMines &&
					!this.splatterMinesUpgraded
				),
				reference: this,
				effect: function(minefield)
				{
					minefield.splatterMinesUpgraded = true
					modifiers.addAbsModifier(minefield, "evo_minefield_dirtyBomb_2", { chemical: 5 })
					modifiers.addPercModifier(currentTurret, "evo_minefield_dirtyBomb_2", {damage: .1})
					minefield.refreshModifiers()
				}
			},
			{
				name: "evo_minefield_recursiveMines",
				desc: localize("evo_minefield_recursiveMines_desc"),
				icon: "",
				weight: 10,
				requirementsMet: !this.recursiveMines,
				reference: this,
				effect: function(minefield)
				{
					minefield.base.rateOfFire = 1
					minefield.recursiveMines = true
					minefield.refreshModifiers()
				}
			},
			{
				name: "evo_minefield_recursiveMines_2",
				desc: localize("evo_minefield_recursiveMines_2_desc", "30%"),
				icon: "",
				weight: 20,
				requirementsMet: (
					this.recursiveMines &&
					this.recursiveMinesNum == 0
				),
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "evo_minefield_recursiveMines_2", { rateOfFire: .3 })
					minefield.recursiveMinesNum++
					minefield.refreshModifiers()
				}
			}
		]
	}

	getUpgrades()
	{
		return [
			...super.getEvolutionUpgrades(),
			{
				name: "minefield_upgrade_damage_common",
				desc: localize("minefield_upgrade_damage_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_minefield_title",
				weight: 60,
				group: "minefield_damage",
				requirementsMet: true,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "minefield_upgrade_damage_common", {damage: .1})
				}
			},
			{
				name: "minefield_upgrade_damage_uncommon",
				desc: localize("minefield_upgrade_damage_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_minefield_title",
				weight: 20,
				group: "minefield_damage",
				requirementsMet: true,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "minefield_upgrade_damage_uncommon", {damage: .2})
				}
			},
			{
				name: "minefield_upgrade_damage_rare",
				desc: localize("minefield_upgrade_damage_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_minefield_title",
				weight: 7,
				group: "minefield_damage",
				requirementsMet: true,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "minefield_upgrade_damage_rare", {damage: .3})
				}
			},
			{
				name: "minefield_upgrade_range_common",
				desc: localize("minefield_upgrade_range_desc", "10%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: "weapon_minefield_title",
				weight: 60,
				group: "minefield_range",
				requirementsMet: true,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "minefield_upgrade_range_common", {range: .1})
				}
			},
			{
				name: "minefield_upgrade_range_uncommon",
				desc: localize("minefield_upgrade_range_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_minefield_title",
				weight: 20,
				group: "minefield_range",
				requirementsMet: true,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "minefield_upgrade_range_uncommon", {range: .2})
				}
			},
			{
				name: "minefield_upgrade_range_rare",
				desc: localize("minefield_upgrade_range_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_minefield_title",
				weight: 7,
				group: "minefield_range",
				requirementsMet: true,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "minefield_upgrade_range_rare", {range: .3})
				}
			},
			{
				name: "minefield_upgrade_count",
				desc: localize("minefield_upgrade_count_desc"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_minefield_title",
				weight: 7,
				requirementsMet: this.amountUpgrade == 0,
				reference: this,
				effect: function(minefield)
				{
					minefield.amountUpgrade++
				}
			},
			{
				name: "minefield_upgrade_rateOfFire_uncommon",
				desc: localize("minefield_upgrade_rateOfFire_desc", "20%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: "weapon_minefield_title",
				weight: 20,
				group: "minefield_rateOfFire",
				requirementsMet: this.recursiveMines,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "minefield_upgrade_rateOfFire_uncommon", {rateOfFire: .2})
				}
			},
			{
				name: "minefield_upgrade_rateOfFire_rare",
				desc: localize("minefield_upgrade_rateOfFire_desc", "30%"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: "weapon_minefield_title",
				weight: 7,
				group: "minefield_rateOfFire",
				requirementsMet: this.recursiveMines,
				reference: this,
				effect: function(minefield)
				{
					modifiers.addPercModifier(minefield, "minefield_upgrade_rateOfFire_rare", {rateOfFire: .3})
				}
			},
		]
	}
}

class MineDrone extends FriendlyDrone
{
	constructor()
	{
		super()
		this.line = {x: scalePix(10), y: 0}
		this.rotationSpeed = Math.PI / 40
		this.directionChangeSpeed = .05
	}

	reset(x, y, direction, enemySpawnedFrom, parent, target, splatterRef)
	{
		super.reset(parent)
		this.rotation = Random.uniform(Math.PI, Math.PI)
		this.position = {x: x, y: y}
		this.direction = direction
		this.enemySpawnedFrom = enemySpawnedFrom
		this.target = target
		this.splatterRef = splatterRef
		this.countdown = null
		this.splatterCooldown = 0
	}

	on_update()
	{
		if (!isPaused())
		{
			// If out of screen, destroy.
			if (!Matter.Bounds.contains(screenBounds, this.position))
				this.suspend()

			// Change direction.
			if (this.parent.hunterSeeker)
			{
				// Change target if target no longer exists.
				if (!this.target || !this.target.active)
					this.target = this.parent.getRandomWeightedNearest(this.position, this.enemySpawnedFrom)

				// If target is exists.
				if (this.target && this.target.active)
				{
					// Get angle to nearest enemy.
					let currentAngle = Math.atan2(this.direction.y, this.direction.x)
					let directionToTarget = Vector.sub(this.target.getPosition(), this.position)
					let targetAngle = Math.atan2(directionToTarget.y, directionToTarget.x)

					// Rotate (pick whatever direction is closer).
					let difference = diff(currentAngle, targetAngle)
					if (Math.abs(difference) > this.directionChangeSpeed)
						this.direction = Vector.rotate(this.direction, Math.sign(difference) * this.directionChangeSpeed * (this.superSpectre ? 1.5 : 1))
				}
			}

			// Move.
			this.position = Vector.add(this.position, Vector.mult(this.direction, scalePix(this.parent.mod.speed)))

			// Dirty Bomb Evo 2 – Passive splatter trail while moving
			if (this.parent.splatterMinesUpgraded && this.splatterRef)
			{
				if (--this.splatterCooldown <= 0)
				{
					let spawnRadius = scalePix(this.splatterRef.mod.range * .3)
					let splatterDistance = Random.uniform(spawnRadius * .75, spawnRadius * .25)
					this.splatterRef.spawnSplatterParticle(this.position, false, splatterDistance, Random.uniform(.05, .15))
					this.splatterCooldown = Random.uniform(30, 20)
				}
			}

			// Rotate.
			this.rotation += this.rotationSpeed

			// Countdown to explosion or immediately explode if hunterSeeker near target.
			let nearTarget = 
					this.parent.hunterSeeker &&
					this.target &&
					distanceBetween(this.target.getPosition(), this.position) < scalePix(this.parent.mod.speed)
			if (this.countdown != null)
			{
				if (--this.countdown <= 0 || nearTarget)
				{
					audioHandler.playAudioHook("minefield_explode")
					factory.spawn(Explosion, this.position.x, this.position.y, this.parent)

					if (this.parent.splatterMines && this.splatterRef) // Dirty Bomb Evo - splatter goo when exploding
					{
						for (let i = 0; i < 3; i++)
						{
							this.splatterRef.spawnTempImpactSplatters({ x: this.position.x, y: this.position.y })
							this.splatterRef.spawnSplatterParticle({ x: this.position.x, y: this.position.y })
						}
					}

					this.suspend()
				}
			}

			// Detect enemies.
			if (hostilesArray.some((enemy) => {
				return enemy.getType() == type.enemy &&
					enemy != this.enemySpawnedFrom &&
					this.countdown == null &&
					distanceBetween(enemy.getPosition(), this.position) <= (scalePix(this.parent.mod.range) / 2)
			}))
				this.countdown = 60
		}
	}

	on_render()
	{
		for (let i = 0; i < 3; i++)
		{
			let point = Vector.add(Vector.rotate(this.line, this.rotation + (2.09 * i)), this.position)
			PrimNative.drawLine (
				Surface.Screen,
				this.position.x,
				this.position.y,
				point.x,
				point.y,
				scalePix(3),
				midGray
			)
		}
		PrimNative.drawFilledCircle(Surface.Screen, this.position.x, this.position.y, scalePix(5), midGray)
		PrimNative.drawCircle(Surface.Screen, this.position.x, this.position.y, scalePix(this.parent.mod.range) / 2, 2, midGray.fadeTo(.3))
		if (this.countdown != null)
			typingFont.drawText(Surface.Screen, this.position.x - typingFont.widthOf("!") / 2, this.position.y - 10 - typingFont.height, "!", midGray)
	}
}
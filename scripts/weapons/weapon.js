import { Task, Random, Matter } from 'sphere-runtime'
import { Debris } from '../effects/debris.js'
import { Impact } from '../effects/impact.js'
import { LevelUpDots } from '../effects/levelUpDots.js'
import { Entity } from '../core/entityFactory.js'

export class Weapon extends Task
{
	static damageTags() { return [] }
	static nonDamageTags() { return [] }
	static getTags() { return [...this.damageTags(), ...this.nonDamageTags()] }

	constructor()
	{
		// Superclass constructor.
		super()

		// Children.
		this.children = []

		// Append weapon to modifier database.
		modifiers.addEntry(this)

		// Vars for dps calculations.
		this.isWeapon = true
		this.totalDamage = 0
		this.timeSpawned = timeElapsed / 1000

		// Vars for Evolution.
		this.evolutionLevel = 1
		this.evolutionMaxLevel = 4
		this.currentEvolution = 0
		this.maxEvolution = 50

		// Damage types.
		this.dmg = {
			base: { all: 0 },
			mod: { all: 0 }
		}
		this.primaryDamageTag = null
		this.allDamageTags = null
		modifiers.damageTypes.forEach(type => {
			this.dmg.base[type] = 0,
			this.dmg.mod[type] = 0
		})

		// Non-damage stats.
		this.base = {}
		this.mod = {}
		modifiers.modifierTypes.slice(1).forEach(stat => {
			this.base[stat] = 0
			this.mod[stat] = 0
		})
	}

	isStatus()
	{
		return this.constructor.nonDamageTags().includes("tag_status")
	}

	isUntriggerableStatus()
	{
		return this.isStatus() &&
			![...allWeapons, currentTurret].some(weap =>
				!weap.isStatus() &&
				weap.primaryDamageTag &&
				weap.primaryDamageTag.includes(this.primaryDamageTag[0])
			)
	}

	isCrit(enemy)
	{
		// If possible to crit.
		if (this.mod.critChance > 0)
		{
			// Calculate contextual bonuses to critChance
			let critChance = this.mod.critChance
			if (
				"item_shatter" in serializedLoot
				&& this.allDamageTags.includes("tag_kinetic")
				&& (powerup_freeze || enemy.statusEffects.find(se => se[0] == "coldStatus"))
			)
				critChance = Math.min(1, critChance + .05)
			
			// Roll the dice.
			if (Random.chance(critChance))
				return true
		}
		return false
	}

	// Record damage for dps calculation.
	recordDamage(damage)
	{
		this.totalDamage += damage
		totalDamage += damage
	}

	registerKill() { this.evolutionAdd(1) }
	evolutionAdd(amt)
	{
		// No evolution in typist mode.
		if (omenLevel < -1) return
		
		if (this.evolutionLevel < this.evolutionMaxLevel)
		{
			if (this.currentEvolution + amt >= this.maxEvolution)
			{
				this.currentEvolution = amt - (this.maxEvolution - this.currentEvolution)
				this.increaseEvolutionLevel()
			}
			else this.currentEvolution += amt
		}
	}

	increaseEvolutionLevel()
	{
		if (this.evolutionLevel < this.evolutionMaxLevel)
		{
			this.evolutionLevel++
			if (this.evolutionLevel < this.evolutionMaxLevel) this.maxEvolution = 50 * this.evolutionLevel
			if (spawner.running)
				this.showEvolutionPrompt()
			else
				pendingEvolution.push(this.constructor.name)
		}
	}

	showEvolutionPrompt(promptOnly = false)
	{
		audioHandler.playAudioHookUI("evolution_complete")
		let slot = ui.hud.bottom.getSlot(this)
		if (!slot) return

		let xPos = ui.hud.bottom.weaponsGrid.getComputedLeft() + slot.getComputedLeft() + slot.getComputedWidth() / 2
		let yPos = ui.hud.bottom.weaponsGrid.getComputedTop() + slot.getComputedTop() + slot.getComputedHeight() / 2
		factory.spawn(LevelUpDots, {x: xPos, y: yPos}).endPromise
			.then(() => {
				if (!spawner.running) return
				if (!promptOnly) pendingEvolution.push(this.constructor.name)
				ui.hud.bottom.evolutionPopUp.setEvolution(this)
			})
	}

	triggerEvolution()
	{
		if (!ui.hud.bottom.evolutionPopUp.hidden) ui.hud.bottom.evolutionPopUp.hide()
		if (!isOozaru && autoLevel)
		{
			weightedRandom(this.getEvolution().filter(evo => evo.requirementsMet), 2)[0].effect(this)
			ui.hud.bottom.addEvolution(this)
			return
		} 
		ui.evolutionComplete.startIntro(this)
	}

	// Convert frame to sec.
	frameToSeconds(frame)
	{
		return frame / 60
	}

	// Get DPS.
	getDPS()
	{
		return timeElapsed / 1000 == this.timeSpawned ? 0 // Weapon just spawned.
			: this.totalDamage / (timeElapsed / 1000 - this.timeSpawned)
			
	}

	// Helper function for calculating upgrade weight.
	weightFormula(name, initial, decay)
	{
		return Math.max(initial - modifiers.getModifierCount(this, name) * decay, 1)
	}

	// Helper functions to get extra letters/buttons.
	getNextExtraLetter()
	{
		return possibleExtraLetters.length > extraLetters.length ? possibleExtraLetters.find(letter => !extraLetters.includes(letter)).join(", ") : ""
	}
	getNextExtraButton()
	{
		return possibleExtraLetters.length > extraLetters.length ? getQuickTimeString([possibleExtraButtons.find(button => !extraButtons.includes(button))]) : ""
	}

	// Refresh all modifiers.
	refreshModifiers()
	{
		this.allDamageTags = []
		let primaryDamage
		let damagePercModifiers = modifiers.getPercModifier(this, "damage")
		let additionalDamageModifiers = 0

		// If drone and Blitzkrieg augment.
		if ("augment_blitzkrieg" in activeAugments && this.constructor.nonDamageTags().includes("tag_drone"))
			additionalDamageModifiers += modifiers.getPercModifier(this, "speed")

		// If Sniper Agument and Remote weapon
		if ("augment_sniper" in activeAugments && this.constructor.nonDamageTags().includes("tag_remote"))
			additionalDamageModifiers += modifiers.getPercModifier(this, "range")

		// Get modified value for each damage type.
		for (const dmgType of modifiers.damageTypes)
		{
			// Check if there is a base damage.
			let damage = this.dmg.base[dmgType] + modifiers.getAbsModifier(this, dmgType)
			if (damage <= 0)
			{
				// If this damage type previously had base damage, but is now zero.
				if (this.dmg.mod[dmgType] && this.dmg.mod[dmgType] != 0)
				{
					this.dmg.mod[dmgType] = 0
					this.base[dmgType + "StatusChance"] = 0
					this.mod[dmgType + "StatusChance"] = 0
				}
				continue
			}

			// Apply percentage modifier.
			this.dmg.mod[dmgType] = damage * (1 + (damagePercModifiers[dmgType] || 0) + additionalDamageModifiers)

			// Add associated status chance.
			if (!this.constructor.nonDamageTags().includes("tag_status")) {
				let baseChance = dmgType == "chemical" ? .1 : .03

				// If Voltaic Burst Agument and Electric Weapon
				if ("augment_voltaicBurst" in activeAugments && dmgType == "electric")
					baseChance += (modifiers.getPercModifier(this, "duration") / 4)
			
				this.base[dmgType + "StatusChance"] = baseChance
			}

			// Add entry to damage tags.
			this.allDamageTags.push("tag_" + dmgType)

			// Check if highest damage (becomes primary damage type).
			if (!primaryDamage || damage > primaryDamage[1]) primaryDamage = [dmgType, damage]
		}

		// Set final primary damage type.
		this.primaryDamageTag = [ "tag_" + primaryDamage[0] ]

		// If Cauterization Augment and Heat Weapon
		if ("augment_cauterization" in activeAugments && this.primaryDamageTag.includes("tag_heat"))
			modifiers[
				(modifiers.getModifierCount(this, "augment_cauterization") == 0 ? "add" : "edit")
				+ "PercModifier"
			](this, "augment_cauterization", { nearDamage: modifiers.getPercModifier(this, "range") })

		// Calculate Caltrops bonus bleed chance based on damage.
		if (this.constructor.name == "Caltrops")
		{
			let getDamage = this.dmg.mod.kinetic || 0
			let bonusKineticStatusChance = .04 + getDamage * 0.0075
			modifiers.editPercModifier(this, "augment_caltrops", { kineticStatusChance: bonusKineticStatusChance })
		}

		// Record total damage for base and mod.
		this.dmg.base.all = Object.values(this.dmg.base).slice(1).reduce((t, c) => t + c, 0)
		this.dmg.mod.all = Object.values(this.dmg.mod).slice(1).reduce((t, c) => t + c, 0)

		// Get modifier value for other stats.
		for (let stat in this.base)
		{
			// If damage over time, check if damage over time can crit.
			if (this.constructor.nonDamageTags().includes("tag_damageOverTime") &&
				!("item_DOTCanCrit" in serializedLoot) &&
				!("augment_corrosion" in activeAugments) &&
				(stat == "critChance" || stat == "critMult")
			) continue
			
			if (this.base[stat] > 0 || modifiers.defaultModifiers.includes(stat))
			{
				if (modifiers.additiveModifiers.includes(stat))
					this.mod[stat] = this.base[stat] + modifiers.getPercModifier(this, stat)
				else
					this.mod[stat] = this.base[stat] * (1 + modifiers.getPercModifier(this, stat))
			}
		}
	}

	spawnDebris(pos)
	{
		factory.spawn(Impact, pos.x, pos.y)
		for (let i = 0; i < 10; i++)
			factory.spawn(Debris, pos.x, pos.y)
	}

	getEvolutionUpgrades()
	{
		let name = this.constructor.name.toLowerCase()
		return [
			{
				name: name + "_upgrade_evolution_common",
				desc: localize(name + "_upgrade_evolution_desc", "10"),
				icon: this.constructor.getIcon(),
				rarity: rarity.common,
				base: this.constructor.getName(),
				weight: 30,
				showEvolution: true,
				group: name + "_evolution",
				requirementsMet: this.evolutionLevel < 4,
				reference: this,
				effect: function(weapon)
				{
					weapon.evolutionAdd(10)
				}
			},
			{
				name: name + "_upgrade_evolution_uncommon",
				desc: localize(name + "_upgrade_evolution_desc", "20"),
				icon: this.constructor.getIcon(),
				rarity: rarity.uncommon,
				base: this.constructor.getName(),
				weight: 10,
				showEvolution: true,
				group: name + "_evolution",
				requirementsMet: this.evolutionLevel < 4,
				reference: this,
				effect: function(weapon)
				{
					weapon.evolutionAdd(20)
				}
			},
			{
				name: name + "_upgrade_evolution_rare",
				desc: localize(name + "_upgrade_evolution_desc", "30"),
				icon: this.constructor.getIcon(),
				rarity: rarity.rare,
				base: this.constructor.getName(),
				weight: 3,
				showEvolution: true,
				group: name + "_evolution",
				requirementsMet: this.evolutionLevel < 4,
				reference: this,
				effect: function(weapon)
				{
					weapon.evolutionAdd(30)
				}
			}
		]
	}

	getBonusDrones(count)
	{
		let result = 0

		for (let i = 0; i < count; i++)
		{
			if ("augment_armada" in activeAugments)
				result += Random.chance(.2)
			if ("item_bonus_drones" in serializedLoot)
				result += Random.chance(.35)
		}
		
		return result
	}

	// All triggers.
	onGameStart() {}
	onTrialStart() {}
	onTrialComplete() {}
	onMainTurretHit(target) {}
	onMainTurretFire(target) {}
	onEnemyHit(target, weapon, isCrit) {}
	onEnemyDestroyed(target, weapon, isCrit, forceDamageType) {}
	onWordComplete(word, quicktime, target) {}
	onDoubleWordComplete(word, quicktime, target) {}
	onShieldDestroyed() {}
}

export class FriendlyDrone extends Entity
{
	reset(parent)
	{
		this.parent = parent
		this.canSpawnPowerups = "augment_spoils" in activeAugments ? true : false
		parent.children.push(this)
	}

	getPosition()
	{
		return "position" in this ? this.position : screenCenter
	}

	scapegoat()
	{
		this.suspend()
	}

	suspend()
	{
		this.on_shutDown()
		this.parent.children.splice(this.parent.children.indexOf(this), 1)

		// If Spoils augment.
		if ("augment_spoils" in activeAugments
			&& spawner.running
			&& this.canPositionSpawnLoot()
			&& Random.chance(.6)
		)
			pickupController.spawnRandomPickup(this, this.parent, false)
		
		super.suspend()
	}

	canPositionSpawnLoot()
	{
		let pos = this.getPosition()
		return !!(spawner && typeof spawner.isPositionBossBlocked === 'function' && spawner.isPositionBossBlocked(pos))
	}
}

export class FriendlyTurret extends Entity
{
	reset(x, y, parent)
	{
		this.parent = parent
		this.position = {x: x, y: y}
		parent.children.push(this)

		// If Networked augment.
		if ("augment_networked" in activeAugments)
			Sphere.sleep(1).then(() => this.refreshNetworked())

		// If Dark Relay augment.
		if ("augment_darkRelay" in activeAugments)
			allWeapons.find(weap => weap.constructor.name == "DarkRelay").spawnRelay(this)
	}

	update() {}
	on_update()
	{
		if ("augment_weakness" in activeAugments)
			hostilesArray.forEach(hostile => {
				if (
					hostile.getType() == type.enemy &&
					!hostile.weakened &&
					distanceBetween(hostile.getPosition(), this.position) < this.parent.mod.range &&
					Matter.Bounds.overlaps(hostile.body.bounds, screenBounds)
				)
					hostile.weakened = this.parent
			})

		this.update()
	}

	refreshNetworked()
	{
		let turretCount = allWeapons.reduce((t, c) => t + (c.constructor.nonDamageTags().includes("tag_turret") ? c.children.length : 0), 0)
		modifiers.editPercModifier("tag_turret", "augment_networked", { rateOfFire: Math.min(.5, turretCount * .1) });
		refreshAllModifiers()
	}

	suspend()
	{
		this.on_shutDown()
		this.parent.children.splice(this.parent.children.indexOf(this), 1)

		// If Networked augment.
		if ("augment_networked" in activeAugments)
			this.refreshNetworked()

		super.suspend()
	}
}
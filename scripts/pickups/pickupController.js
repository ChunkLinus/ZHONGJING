import { Random, Task } from 'sphere-runtime'
import { DoubleDamagePickup } from './doubleDamage.js'
import { FreezePickup } from './freeze.js'
import { Health } from './health.js'
import { Loot } from './loot.js'
import { RerollPickup } from './reroll.js'
import { Shield } from './shield.js'
import { LootItems } from '../data/lootItems.js'
import { Coins } from './coins.js'
import { CausticAmmoPickup } from './causticAmmo.js'
import { ScrapPickup } from './scrapArmaments.js'

export const coinCooldownInitial = 3600
export const lootCooldownInitial = 5400

export class PickupController extends Task
{
	on_startUp()
	{
		this.coinCooldown = coinCooldownInitial
		this.lootCooldown = lootCooldownInitial
	}

	on_update()
	{
		if (isPaused()) return
		if (this.coinCooldown > 0)
			this.coinCooldown--
		if (this.lootCooldown > 0)
			this.lootCooldown--
	}

	getAllEligiblePickups(weapon, isCrit)
	{
		let canSpawnCausticAmmo = function()
		{
			return "augment_causticAmmo" in activeAugments 
		}

		let canSpawnScrap = function()
		{
			return "augment_scrapArmaments" in activeAugments 
		}

		let isPrize = isCrit && "item_prize" in serializedLoot && Random.chance(.3)

		return [
			{
				class: Coins,
				requirementsMet: (
					!demo &&
					this.coinCooldown <= 0 &&
					!currentPickups.some(pickup => pickup.constructor.name == "Coins")
				)
			},
			{
				class: DoubleDamagePickup,
				requirementsMet: (
					omenLevel > -2 &&
					Random.chance(0.01 + weapon.mod.doubleDamageChance)
				)
			},
			{
				class: CausticAmmoPickup,
				requirementsMet: (
					canSpawnCausticAmmo() &&
					Random.chance(0.05)
				)
			},
			{
				class: ScrapPickup,
				requirementsMet: (
					canSpawnScrap() &&
					Random.chance(0.1)
				)
			},
			{
				class: FreezePickup,
				requirementsMet: (
					enemyCount() > 4 &&
					Random.chance(0.01 + weapon.mod.freezeChance)
				)
			},
			{
				class: Health,
				requirementsMet: (
					currentTurret.currentHealth < currentTurret.health &&
					(isPrize || Random.chance(0.025 + weapon.mod.healthChance))
				)
			},
			{
				class: Loot,
				requirementsMet: (
					omenLevel > -2 &&
					this.lootCooldown <= lootCooldownInitial * weapon.mod.lootChance &&
					!currentPickups.some(pickup => pickup instanceof Loot) &&
					LootItems().filter(v => v.requirementsMet).length > 0 &&
					allWeapons.length > 0
				)
			},
			{
				class: RerollPickup,
				requirementsMet: (
					omenLevel > -2 &&
					reroll + currentPickups.reduce((t, c) => t += c.constructor.name == "RerollPickup", 0) < maxReroll &&
					(isPrize || Random.chance(.03 - (.006 * reroll) + weapon.mod.rerollChance))
				)
			},
			{
				class: Shield,
				requirementsMet: (
					shields + currentPickups.reduce((t, c) => t += c.constructor.name == "Shield", 0) < maxShields &&
					(isPrize || Random.chance((.01 - (.003 * shields)) + weapon.mod.shieldChance))
				)
			}
		]
	}

	spawnRandomPickup(enemy, weapon, isCrit)
	{
		let pos = enemy.getPosition()
		if (
			pickupCount < 2
			&& enemy.canSpawnPowerups
			&& isInActiveBounds(pos)
			&& !currentPickups.some(pickup => distanceBetween(pickup.position, pos) < scalePix(100))
		)
		{
			let pickup = Random.sample(this.getAllEligiblePickups(weapon, isCrit).filter(pickup => pickup.requirementsMet))
			if (pickup)
				factory.spawn(pickup.class, pos.x, pos.y)
		}
	}
}

export const getRandomPickupSpawnPos = function()
{
	let spawnAngle = Random.uniform(0, Math.PI / 4) + (Random.chance(.5) ? Math.PI : 0)
	let spawnDistance = Random.discrete(
		scalePix(200),
		Vector.magnitude({
			x: Math.cos(spawnAngle) * (Surface.Screen.width / 2 - scalePix(49)),
			y: Math.sin(spawnAngle) * (Surface.Screen.height / 2 - scalePix(80))
		})
	)
	return Vector.add(screenCenter, Vector.rotate({ x: spawnDistance, y: 0 }, spawnAngle))
}
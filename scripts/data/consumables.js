import { Matter, Random } from 'sphere-runtime'
import { Powerup } from "../core/powerup.js"
import { triggerDoubleDamage } from "../pickups/doubleDamage.js"
import { Freeze } from "../pickups/freeze.js"
import { GiveWeapon } from "./weaponsList.js"
import { getRandomPickupSpawnPos } from '../pickups/pickupController.js'

export const Consumables =
[
	{
		name: "consumable_medpack",
		desc: "consumable_medpack_desc",
		icon: "¡",
		action: function()
		{
			let healAmount = Math.round(currentTurret.health * .3)
			if (currentTurret.currentHealth + healAmount < currentTurret.health)
				currentTurret.addHealth(healAmount)
			else
				currentTurret.addHealth(currentTurret.health - currentTurret.currentHealth)
		}
	},
	{
		name: "consumable_warhead",
		desc: "consumable_warhead_desc",
		icon: "£",
		action: function()
		{
			let weap = getExistingWeapon("Warhead") || GiveWeapon("Warhead")
			weap.fire()
		}
	},
	{
		name: "consumable_serum",
		desc: "consumable_serum_desc",
		icon: "¤",
		action: function()
		{
			if (modifiers.getModifierCount("global", "consumable_serum") == 0)
				modifiers.addPercModifier("global", "consumable_serum", { critChance: 0 });
			(powerups.find(powerup => powerup.constructor.name == "Serum") || factory.spawn(Serum, 600)).refresh()
		}
	},
	{
		name: "consumable_cryocore",
		desc: "consumable_cryocore_desc",
		icon: "¥",
		action: function()
		{
			(powerups.find(powerup => powerup.constructor.name == "Freeze") || factory.spawn(Freeze, 420 * (1 + freezeDurationBonus))).refresh()
		}
	},
	{
		name: "consumable_killPill",
		desc: "consumable_killPill_desc",
		icon: "¦",
		action: function()
		{
			triggerDoubleDamage()
		}
	},
	{
		name: "augment_flameWave",
		desc: "augment_flameWave_desc",
		icon: "§",
		action: function()
		{
			currentTurret.getHit(currentTurret.currentHealth * .1)
			hostilesArray.forEach(hostile => {
				if (
					hostile.getType() == type.enemy
					&& Matter.Bounds.overlaps(hostile.body.bounds, screenBounds)
				)
				{
					audioHandler.playAudioHook("flameWave_activate")
					hostile.addStatusEffect("heatStatus")
				}
			})
		}
	},
	{
		name: "augment_pocketTurret",
		desc: "augment_pocketTurret_desc",
		icon: "¨",
		action: function()
		{
			let weap = getExistingWeapon("PocketTurret") || GiveWeapon("PocketTurret")
			const spawnPos = getRandomPickupSpawnPos()
			weap.spawnTurretAt(spawnPos.x, spawnPos.y)
		}
	}
]

class Serum extends Powerup
{
	constructor()
	{
		super("consumable_serum")
		this.node.setText(localize("consumable_serum"), `+25% ${localize("critChance_text")}`)
	}
	on_init()
	{
		modifiers.editPercModifier("global", "consumable_serum", { critChance: .25 });
		refreshAllModifiers()
	}
	refresh()
	{
		this.node.currentProgress = this.node.maxProgress
	}
	on_expire()
	{
		modifiers.editPercModifier("global", "consumable_serum", { critChance: 0 });
		refreshAllModifiers()
	}
}
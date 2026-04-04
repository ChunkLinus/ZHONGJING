import { Weapon } from "./weapon.js"

export const SpawnWeapon = function(weapon)
{
	// Push instance of weapon.
	if (weapon.prototype instanceof Weapon)
	{
		let weap = new weapon()
		allWeapons.push(weap)
		if (weap.isWeapon) ui.hud.bottom.addWeapon(weap)
		lootAndAugments()
		return weap
	}
	else return false
}

// Loot and augments.
// This function fires once per new weapon added.
export const lootAndAugments = function()
{
	let weapons = [...allWeapons, currentTurret]

	// If Multi-Targeting loot.
	if ("item_multitargeting" in serializedLoot)
	{
		modifiers.editPercModifier("tag_remote", "item_multitargeting", {critChance: weapons.reduce((count, v) => count + v.isWeapon, 0) * .01})
		refreshAllModifiers()
	}

	// If Devotion augment.
	if ("augment_devotion" in activeAugments)
	{
		modifiers.editPercModifier("tag_main", "augment_devotion", { damage: (4 - allWeapons.reduce((t, c) => t + c.isWeapon, 0)) * .25 });
		refreshAllModifiers()
	}

	// If Diversity augment.
	if ("augment_diversity" in activeAugments)
	{
		let isDrone = (weap) => weap.constructor.nonDamageTags().includes("tag_drone")
		let nonDroneWeapons = weapons.filter(weap => weap.isWeapon).length - weapons.filter(weap => isDrone(weap)).length
		modifiers.editPercModifier("tag_drone", "augment_diversity", { duration: nonDroneWeapons * .2 })
		refreshAllModifiers()
	}

	// If Research Teams augment.
	if ("augment_piracy" in activeAugments)
	{
		let isLootWeapon = (weap) => weap.constructor.nonDamageTags().includes("tag_loot")
		let activeLootWeapons = weapons.reduce((t, c) => t + isLootWeapon(c), 0)
		modifiers.editPercModifier("tag_remote", "augment_piracy", { damage: activeLootWeapons * .15 })
		refreshAllModifiers()
	}
}
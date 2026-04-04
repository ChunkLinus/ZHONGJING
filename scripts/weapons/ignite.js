import { Random, Matter } from 'sphere-runtime'
import { Weapon } from './weapon.js'

export class Ignite extends Weapon
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("weapon_ignite_title") }
	static getDesc() { return localize("weapon_ignite_desc") }
	static damageTags() { return ["tag_heat"] }
	static nonDamageTags() { return ["tag_damageOverTime", "tag_status"] }

	constructor()
	{
		super()
		this.isWeapon = false

		this.dmg.base.heat = 10
		this.base.rateOfFire = 120
		this.base.critChance = .01
		this.base.critMult = 2.5
		this.base.duration = 300
		this.refreshModifiers()

		this.currentCooldown = 0
		this.ignitedEnemies = 0
		this.start()
	}

	on_update()
	{
		if (!isPaused() && ++this.currentCooldown >= 3600 / this.mod.rateOfFire)
		{
			let ignitedCount = 0
			this.currentCooldown = 0
			hostilesArray.forEach((enemy) => {
				if (
					enemy.getType() == type.enemy
					&& Matter.Bounds.overlaps(enemy.body.bounds, screenBounds)
					&& enemy.statusEffects.some(status => status[0] == "heatStatus")
				)
				{
					ignitedCount++
					let damage = Random.uniform(this.dmg.mod.all, 1)
					let result = enemy.getHit(damage, this, null)
					this.recordDamage(result.damage)
				}
			})

			// If Pyromancy Augment.
			if ("augment_pyromancy" in activeAugments && ignitedCount != this.ignitedEnemies)
				modifiers.editPercModifier("tag_heat", "augment_pyromancy", { damage: ignitedCount * .02 })

			this.ignitedEnemies = ignitedCount
		}
	}

	// Bonus damage from Pyromancy Augment.
	applyPyromancyBonusDamage(enemy)
	{
		let damage = this.dmg.mod.all * 4 + this.mod.duration * .267 + Random.uniform(0, 5)
		let result = enemy.getHit(damage, this, null)
		this.recordDamage(result.damage)
	}
}
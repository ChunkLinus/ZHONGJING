import { Random, Matter } from 'sphere-runtime'
import { Weapon } from './weapon.js'
import { DrawLightning } from '../effects/drawLightning.js'

export class StormBattery extends Weapon
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("augment_stormBattery") }
	static getDesc() { return localize("weapon_stormBattery_desc") }
	static damageTags() { return ["tag_electric"] }
	static nonDamageTags() { return ["tag_turret", "tag_damageOverTime", "tag_augment"] }

	constructor()
	{
		super()
		this.isWeapon = false

		this.base.range = 400
		this.dmg.base.electric = 6
		this.base.rateOfFire = 120
		this.base.critChance = .01
		this.base.critMult = 2.5
		this.cooldown = 0
		this.electricAudioLoop = null

		// Base modifier for bonus damage.
		modifiers.addAbsModifier(this, "augment_stormBattery", { electric: 0 })

		this.refreshModifiers()
		this.start()
	}

	on_update()
	{
		if (isPaused()) return

		if (++this.cooldown >= 3600 / this.mod.rateOfFire)
		{
			this.cooldown = 0

			// Find all enemies in range.
			hostilesArray.forEach((enemy) => {
				if (enemy.getType() == type.enemy
					&& Matter.Bounds.overlaps(enemy.body.bounds, screenBounds)
					&& distanceBetween(enemy.getPosition(), screenCenter) < scalePix(this.mod.range))
				{
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
						DrawLightning(screenCenter, pointHitOnShield) // Draw lightning bolts.
						armor.getHit(this.dmg.mod.all, this, pointHitOnShield)
					}
					else 
					{
						let damage = Random.uniform(this.dmg.mod.all, 1)
						let result = enemy.getHit(damage, this, null)
						this.recordDamage(result.damage)
						DrawLightning(screenCenter, enemy.getPosition()) // Draw lightning bolts.
					}
				}
			})
		}
	}
}
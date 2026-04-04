import { Random, Matter } from 'sphere-runtime'
import { Weapon } from './weapon.js'
import { Explosion } from '../effects/explosion.js'

export class Warhead extends Weapon
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("consumable_warhead") }
	static getDesc() { return localize("weapon_warhead_desc") }
	static damageTags() { return ["tag_explosive"] }
	static nonDamageTags() { return ["tag_remote", "tag_consumable"] }

	constructor()
	{
		super()
		this.isWeapon = false

		this.dmg.base.explosive = 100
		this.base.rateOfFire = 12
		this.base.range = 450
		this.base.critChance = .01
		this.base.critMult = 2
		this.refreshModifiers()

		this.explosions = []
		this.start()
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
		}
	}

	fire()
	{
		audioHandler.playAudioHook("firestorm_fire")
		for (let i = 0; i < 100; i ++)
		{
			let randomAngle = Random.uniform(Math.PI, Math.PI)
			let explosionDistance = Random.discrete(0, this.mod.range)
			let explosionPosition = Vector.add(Vector.rotate({x: explosionDistance, y: 0}, randomAngle), screenCenter)
			let explosionSize = Math.max(Random.uniform(this.mod.range / 2 * explosionDistance / this.mod.range, this.mod.range / 10), this.mod.range / 5)
			let delay = explosionDistance / 30
			this.explosions.push({
				delay,
				payload: () => {
					audioHandler.playAudioHook("firestorm_explode")
					factory.spawn(Explosion, explosionPosition.x, explosionPosition.y, this, explosionSize, false)
				}
			})
		}
	}
}
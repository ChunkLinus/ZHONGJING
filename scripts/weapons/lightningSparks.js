import { Random, Matter } from 'sphere-runtime'
import { FriendlyDrone, Weapon } from './weapon.js'
import { DrawLightning } from '../effects/drawLightning.js'

export class LightningSparks extends Weapon
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("augment_lightningSparks") }
	static getDesc() { return localize("weapon_lightningSparks_desc") }
	static damageTags() { return ["tag_electric"] }
	static nonDamageTags() { return ["tag_drone", "tag_augment"] }

	constructor()
	{
		super()
		this.isWeapon = false

		// Add base modifier for damage bonus based on critChance and critMult.
		modifiers.addAbsModifier(this, "augment_lightningSparks", { electric: 0 })

		// Declare base stats.
		this.dmg.base.electric = 24
		this.base.range = 10
		this.base.speed = 3
		this.base.critChance = .01
		this.base.critMult = 2.5

		// Refresh modifiers to apply initial bonus damage.
		this.primaryDamageTag = ["tag_electric"]
		this.refreshModifiers()
	}

	onEnemyHit(target, weapon, isCrit)
	{
		if (isCrit && weapon.allDamageTags.includes("tag_electric") && weapon.constructor.name !== "LightningSparks")
		{
			// Determine spark count.
			let count = 6
			count += this.getBonusDrones(count)

			// Spawn sparks.
			let originPosition = target.getPosition()
			for (let i = 0; i < count; i++)
				factory.spawn(LightningSparksProjectile, this, originPosition.x, originPosition.y, target)
		}
	}

	refreshModifiers()
	{
		// Modify bonus damage based on current critChance and critMult.
		let critChance = this.base.critChance + modifiers.getPercModifier(this, "critChance")
		let critMult = this.base.critMult + modifiers.getPercModifier(this, "critMult")
		let bonusDamage = Math.floor(critChance * critMult * 50)
		modifiers.editAbsModifier(this, "augment_lightningSparks", { electric: bonusDamage })

		// Call base refreshModifiers.
		super.refreshModifiers()
	}
}

class LightningSparksProjectile extends FriendlyDrone
{
	constructor()
	{
		super()
		this.velocity = { x: 0, y: 0 }
	}

	reset(parent, originX, originY, enemySpawnedFrom)
	{
		super.reset(parent)
		this.position = { x: originX, y: originY }
		this.parent = parent
		this.speed = scalePix(Random.discrete(parent.mod.speed, 2))
		this.enemySpawnedFrom = enemySpawnedFrom

		// Set initial random direction
		let angle = Random.uniform(0, Math.PI * 2)
		this.velocity = {
			x: Math.cos(angle) * this.speed,
			y: Math.sin(angle) * this.speed
		}
	}

	on_update()
	{
		if (isPaused()) return

		// Get the closest enemy using "reduce" native js function.
		let closestEnemy = hostilesArray.reduce (
			(closest, current) => {

				// Get the square of distance between spark and each enemy.
				// Skip the square root step because it's not needed for comparison.
				let vec = Vector.sub(current.getPosition(), this.position)
				let squareOfDistance = vec.x * vec.x + vec.y * vec.y
				if (squareOfDistance < closest[1])
					return [current, squareOfDistance]
				return closest
			},
			[null, Infinity]
		)[0]

		// If closest enemy is not null.
		if (closestEnemy)
		{
			// Get distance between closest enemy and spark.
			let closestDistance = distanceBetween(closestEnemy.getPosition(), this.position)

			// If within damage distance, do damage and suspend.
			if (closestDistance <= scalePix(this.parent.mod.range))
			{
				let damage = Random.uniform(this.parent.dmg.mod.all, 1)
				let result = closestEnemy.getHit(damage, this.parent, null)
				this.parent.recordDamage(result.damage)
		
				this.suspend()
				return
			}

			// Soft homing toward enemies within 300px
			let influence = 0.05

            // Scale up homing when closer than 200px
            if (closestDistance < scalePix(200))
                influence *= 1.5

            // Scale up homing when closer than 100px
            if (closestDistance < scalePix(100))
                influence *= 1.75
        
            // Scale up homing when closer than 50px
            if (closestDistance < scalePix(50))
                influence *= 2
		
			let homingDir = Vector.normalise(Vector.sub(closestEnemy.getPosition(), this.position))
			this.velocity = Vector.normalise(Vector.add(this.velocity, Vector.mult(homingDir, influence)))
			this.velocity = Vector.mult(this.velocity, this.speed)
		}
	
		// Jitter for chaotic movement
		let jitter = Random.normal(0, Math.PI / 48)
		this.velocity = Vector.rotate(this.velocity, jitter)
	
		// Move.
		this.position = Vector.add(this.position, this.velocity)
	
		// Kill if off-screen
		if (!Matter.Bounds.contains(screenBounds, this.position))
			this.suspend()
	}

	on_render()
	{
		for (let i = 0; i < Random.discrete(2, 4); i++)
		{
			let tendrilLength = scalePix(Random.uniform(this.parent.mod.range, 1))
			let tendrilDirection = Random.uniform(Math.PI, Math.PI)
			DrawLightning(this.position, Vector.add(Vector.rotate({ x: tendrilLength, y: 0 }, tendrilDirection), this.position))
		}
	}
}
import { Random, Matter } from 'sphere-runtime'
import { Impact } from '../effects/impact.js'
import { Weapon, FriendlyTurret } from './weapon.js'
import { Sparks } from '../effects/sparks.js'
import { Entity } from '../core/entityFactory.js'
import { PocketTurretChargePickup } from '../pickups/pocketTurretPickup.js'
import { PausableTween } from '../core/fastTween.js'

export class PocketTurret extends Weapon
{
	static getIcon() { return "" }
	static getName() { return localize("consumable_pocketTurret") }
	static getDesc() { return localize("weapon_pocket_turret_desc") }
	static damageTags() { return ["tag_kinetic"] }
	static nonDamageTags() { return ["tag_turret"] }

	constructor()
	{
		super()
		this.isWeapon = false

		// Set parameters.
		this.base.speed = 0.3
		this.dmg.base.kinetic = 30
		this.base.rateOfFire = 120
		this.base.range = 300
		this.base.duration = 900
		this.base.critChance = 0.01
		this.base.critMult = 2
		this.refreshModifiers()

		// Start.
		this.start()
	}

	// Consumable spawn.
	spawnTurretAt(x, y)
	{
		audioHandler.playAudioHook("pocketTurret_activate")
		factory.spawn(PocketTurretTurret, this, x, y)
	}
}

class PocketTurretTurret extends FriendlyTurret
{
	constructor()
	{
		super()
		this.visualTween = new PausableTween()
	}

	reset(parent, x, y)
	{
		// parent = PocketTurret
		super.reset(x, y, parent)

		this.restAngle = 0
		this.angle = Random.uniform(Math.PI, Math.PI)
		this.currentCooldown = 0
		this.currentDuration = 0
		this.target = null

		// Visuals.
		this.animationStage = 0
		this.visualPosition = { x: screenCenter.x, y: screenCenter.y }
		this.visualRotation = Random.uniform(Math.PI, Math.PI)
		this.visualBarrelLength = 0
		this.visualTween.easeIn(
			[screenCenter.x, screenCenter.y],
			[this.position.x, this.position.y],
			t => { this.visualPosition.x = t[0]; this.visualPosition.y = t[1] },
			20
		).then(() => {
			this.animationStage = 1
			audioHandler.playAudioHook("pocketTurret_deploy")
			this.visualTween.easeIn([0], [scalePix(10)], t => this.visualBarrelLength = t[0], 20)
		}).then(() => {
			this.animationStage = 2
		})
	}

	// Every frame.
	update()
	{
		if (isPaused()) return

		// If not yet active, skip update.
		if (this.animationStage < 2)
		{
			if (this.animationStage == 0) this.visualRotation += .2
			return
		}

		// Remove when duration runs out.
		if (++this.currentDuration > this.parent.mod.duration)
		{
			this.animationStage--
			audioHandler.playAudioHook("pocketTurret_expire")
			this.visualTween.easeIn([this.visualBarrelLength], [0], t => this.visualBarrelLength = t[0], 20)
				.then(() => Sphere.sleep(10)
					.then(() => {
					factory.spawn(PocketTurretChargePickup, this.position.x, this.position.y)
					this.suspend()
					return
				}))
		}

		// Find closest enemy.
		let range = scalePix(this.parent.mod.range)
		let rangeSq = range * range
		let nearest = null
		let bestSq = rangeSq

		hostilesArray.forEach(enemy => {
			if (enemy.getType() != type.enemy) return
			let pos = enemy.getPosition()
			let dx  = pos.x - this.position.x
			let dy  = pos.y - this.position.y
			let dSq = dx*dx + dy*dy
			if (dSq < bestSq)
			{
				bestSq  = dSq
				nearest = enemy
			}
		})

		this.target = nearest

		// Firing logic.
		if (this.target && this.target.running)
		{
			let direction = Vector.sub(this.target.body.position, this.position)
			let angle     = Math.atan2(direction.y, direction.x)
			let diffAngle = diff(this.angle, angle)

			// Aim.
			let rotSpeed = this.parent.mod.speed
			if (Math.abs(diffAngle) > rotSpeed)
			{
				this.angle += Math.sign(diffAngle) * rotSpeed
			}
			else
			{
				this.angle = angle
				let dist   = Math.sqrt(bestSq)

				if (++this.currentCooldown >= 3600 / this.parent.mod.rateOfFire
					&& dist < range)
				{
					let dirNorm       = Vector.normalise(direction)
					let startPosition = Vector.add(Vector.mult(dirNorm, 25), this.position)

					audioHandler.playAudioHook("sentry_shot")
					factory.spawn(ProjPocketTurret, startPosition, this.target.body.position, this.parent)
					this.currentCooldown = 0
				}
			}
		}
		else
		{
			let diffAngle = diff(this.angle, this.restAngle)
			let rotSpeed  = this.parent.mod.speed

			if (Math.abs(diffAngle) > rotSpeed)
				this.angle += Math.sign(diffAngle) * rotSpeed
			else
				this.angle = this.restAngle
		}
	}

	// Render
	on_render()
	{
		PrimNative.drawFilledCircle(Surface.Screen, this.visualPosition.x, this.visualPosition.y, scalePix(20), midGray)
		PrimNative.drawFilledCircle(Surface.Screen, this.visualPosition.x, this.visualPosition.y, scalePix(8), paleYellow)
		const barrelTip = Vector.add(Vector.rotate({ x: this.visualBarrelLength + scalePix(5), y: 0 }, this.angle), this.visualPosition)
		if (this.visualBarrelLength > 0)
			PrimNative.drawLine(Surface.Screen, this.visualPosition.x, this.visualPosition.y, barrelTip.x, barrelTip.y, scalePix(5), paleYellow)
		for (let i = 0; i < 4; i ++)
		{
			const normVec = Vector.rotate({ x: 1, y: 0 }, i * Math.PI / 2 + this.visualRotation)
			const startPos = Vector.add(Vector.mult(normVec, scalePix(25)), this.visualPosition)
			const midPos = this.visualBarrelLength == 0 ?
				startPos :
				Vector.add(Vector.mult(normVec, scalePix(25) + this.visualBarrelLength), this.visualPosition)
			const endPos = Vector.add(Vector.mult(normVec, scalePix(30) + this.visualBarrelLength), this.visualPosition)
			PrimNative.drawLine(Surface.Screen, midPos.x, midPos.y, endPos.x, endPos.y, scalePix(10), midGray)
			if (this.visualBarrelLength > 0)
				PrimNative.drawLine(Surface.Screen, startPos.x, startPos.y, midPos.x, midPos.y, scalePix(5), midGray)
		}

		// Range radius.
		if (this.animationStage >= 2)
			PrimNative.drawCircle(Surface.Screen, this.position.x, this.position.y, scalePix(this.parent.mod.range), 2, midGray.fadeTo(0.3))
	}
}

class ProjPocketTurret extends Entity
{
	constructor()
	{
		super()
		this.speed = scalePix(25)
	}

	reset(position, target, parent)
	{
		this.position = position
		this.parent = parent

		let direction = Vector.normalise(Vector.sub(target, position))
		this.velocity = Vector.mult(direction, this.speed)
	}

	on_update()
	{
		if (isPaused()) return

		if (!Matter.Bounds.contains(screenBounds, this.position))
		{
			this.suspend()
			return
		}

		let nextPosition = Vector.add(this.position, this.velocity)
		let collisions   = Matter.Query.ray(hostileBodies, this.position, nextPosition)
		if (collisions.length > 0)
		{
			let collision = collisions[0]
			let other     = hostiles.get(collision.bodyA.id)
			let colPt     = collisionPoint(this.position, nextPosition, collision.bodyA)

			if (other)
			{
				let damage = Random.uniform(this.parent.dmg.mod.all, 5)
				let result = other.getHit(damage, this.parent, colPt)
				this.parent.recordDamage(result.damage)

				let randomPositionX = Random.uniform(colPt.x, 5)
				let randomPositionY = Random.uniform(colPt.y, 5)
				let angle           = Math.atan2(this.velocity.y, this.velocity.x)

				factory.spawn(Impact, randomPositionX, randomPositionY)
				audioHandler.playAudioHook(
					result.isCrit ? "sentry_hit_crit" : "sentry_hit_normal",
					getPanFromX(colPt.x)
				)
				for (let i = 0; i < 7; i++)
					factory.spawn(Sparks, randomPositionX, randomPositionY, Random.normal(angle, Math.PI / 6))

				this.suspend()
			}
		}

		factory.spawn(ProjPocketTurretTrail, this.position.x, this.position.y)

		this.position = nextPosition
	}

	on_render()
	{
		PrimNative.drawFilledCircle(Surface.Screen, this.position.x, this.position.y, scalePix(10), midGray)
	}
}

class ProjPocketTurretTrail extends Entity
{
	reset(x, y)
	{
		this.position  = { x, y }
		this.thickness = scalePix(5)
	}

	on_update()
	{
		if (isPaused()) return
		this.thickness -= scalePix(1)
		if (this.thickness <= 0)
			this.suspend()
	}

	on_render()
	{
		PrimNative.drawCircle(Surface.Screen, this.position.x, this.position.y, scalePix(10) - this.thickness / 2, this.thickness, midGray.fadeTo(.5))
	}
}
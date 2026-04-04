import { Random, Matter } from 'sphere-runtime'
import { Weapon } from './weapon.js'
import { Entity } from '../core/entityFactory.js'
import { EffectsSurface } from '../effects/effectsSurface.js'
import { IgniteEffect } from '../effects/ignite.js'

const smokeInterval = 2
const heatSpotInterval = 20

export class Fireball extends Weapon
{
	// Static info functions.
	static getIcon() { return "" }
	static getName() { return localize("augment_fireball") }
	static getDesc() { return localize("weapon_fireball_desc") }
	static damageTags() { return ["tag_heat"] }
	static nonDamageTags() { return ["tag_remote", "tag_augment", "tag_damageOverTime"] }

	constructor()
	{
		super()
		this.isWeapon = false
		this.activeFireballs = []
		this.fireballSurface = factory.spawn(EffectsSurface)

		// Declare stats.
		this.dmg.base.heat = 25
		this.base.range = 100
		this.base.speed = 1
		this.base.rateOfFire = 240
		this.refreshModifiers()

		this.start()
	}
	
	onMainTurretFire(target)
	{
		if (this.activeFireballs.length == 0)
		{
			let baseDirection = Vector.normalise(Vector.sub(target.getPosition(), screenCenter))
			factory.spawn(ProjFireball, baseDirection, this)
		}
	}

	on_shutDown()
	{
		for (const fireball of this.activeFireballs)
			fireball.suspend()
		this.activeFireballs = []
	}
}

class ProjFireball extends Entity
{
	constructor()
	{
		// Superclass constructor.
		super()

		// Damage cooldown.
		this.cooldown = 0

		// Smoke effects - use fixed-size pool to avoid allocations.
		this.smoke = []
		this.smokeCount = 0
		this.smokeCooldown = 0
		this.smokeFrontCooldown = 0

		// Fireball effect - use fixed-size array.
		this.heatSpots = []
		this.heatSpotCount = 0
		this.heatSpotCooldown = 0

		// Ignite visual effects (while in fireball)
		this.igniteEffects = new Map()

		// Reused objects/collections to reduce per-frame allocations.
		this._velocity = { x: 0, y: 0 }
		this._nextPosition = { x: 0, y: 0 }
		this._lastVisiblePoint = { x: 0, y: 0 }
		this._collisions = []
		this._collisionIds = new Set()
		this._heatSpotPos = { x: 0, y: 0 }
	}

	reset(direction, parent)
	{
		parent.activeFireballs.push(this)
		this.direction = direction
		this.position = {x: screenCenter.x, y: screenCenter.y}
		this.parent = parent
		this._collisions.length = 0
		this._collisionIds.clear()
		this.igniteEffects.clear()
		this.smokeCount = 0
		this.heatSpotCount = 0
		audioHandler.playAudioHook("fireball_spawn")
	}

	on_update()
	{
		// If game is paused, skip update.
		if (isPaused()) return

		const rangePix = scalePix(this.parent.mod.range)
		const rangePixSq = rangePix * rangePix
		const speedPix = scalePix(this.parent.mod.speed)

		// Calculate next position.
		this._velocity.x = this.direction.x * speedPix
		this._velocity.y = this.direction.y * speedPix
		this._nextPosition.x = this.position.x + this._velocity.x
		this._nextPosition.y = this.position.y + this._velocity.y

		// Destroy if out of screen.
		if (!Matter.Bounds.contains(screenBounds, this.lastVisiblePoint(this._nextPosition, rangePix)))
		{
			for (const eff of this.igniteEffects.values()) eff.terminate = true
			this.igniteEffects.clear()
			const idx = this.parent.activeFireballs.indexOf(this)
			if (idx !== -1) {
				const last = this.parent.activeFireballs.length - 1
				this.parent.activeFireballs[idx] = this.parent.activeFireballs[last]
				this.parent.activeFireballs.pop()
			}
			this.smokeCount = 0
			this.heatSpotCount = 0
			this.suspend()
			return
		}

		// Respect rate of fire.
		if (++this.cooldown >= 3600 / this.parent.mod.rateOfFire)
		{
			// Reset rate of fire cooldown.
			this.cooldown = 0

			// Get all collisions.
			const collisions = this._collisions
			collisions.length = 0
			this._collisionIds.clear()
			Matter.Query.ray(hostileBodies, this.position, this._nextPosition, rangePix)
				.forEach(col => {
					let enemy = hostiles.get(col.bodyA.id)
					if (enemy && (enemy.getType() == type.armor || enemy.getType() == type.enemy))
					{
						const id = enemy.body.id
						if (!this._collisionIds.has(id))
						{
							this._collisionIds.add(id)
							collisions.push(enemy)
						}
					}
				})
			hostilesArray.forEach(enemy => {
				if (enemy.getType() != type.enemy) return
				if (!Matter.Bounds.overlaps(enemy.body.bounds, screenBounds)) return
				const id = enemy.body.id
				if (this._collisionIds.has(id)) return
				const pos = enemy.getPosition()
				let dx = pos.x - this.position.x
				let dy = pos.y - this.position.y
				if (dx * dx + dy * dy <= rangePixSq)
				{
					this._collisionIds.add(id)
					collisions.push(enemy)
					return
				}
				dx = pos.x - this._nextPosition.x
				dy = pos.y - this._nextPosition.y
				if (dx * dx + dy * dy <= rangePixSq)
				{
					this._collisionIds.add(id)
					collisions.push(enemy)
				}
			})

			// Damage collided.
			for (const enemy of collisions)
			{
				let damage = Random.uniform(this.parent.dmg.mod.all, 1)
				let result = enemy.getHit(damage, this.parent, null)
				this.parent.recordDamage(result.damage)
				const enemyId = enemy.body.id
				if (!this.igniteEffects.has(enemyId))
					this.igniteEffects.set(enemyId, factory.spawn(IgniteEffect, enemy, enemy.radius * (enemy.largeEnemy ? enemy.largeEnemy : 1)))
			}

			// Update ignite effects.
			for (const [enemyId, effect] of this.igniteEffects)
			{
				const enemy = hostiles.get(enemyId)
				if (!enemy || !enemy.running || !this._collisionIds.has(enemyId))
				{
					effect.terminate = true
					this.igniteEffects.delete(enemyId)
				}
			}
				
			// Play audio.
			if (collisions.length > 0) audioHandler.playAudioHook("fireball_hit", getPanFromX(this.position.x))
		}

		// Move fireball.
		this.position.x = this._nextPosition.x
		this.position.y = this._nextPosition.y

		// Create smoke at back.
		if (++this.smokeCooldown > smokeInterval)
		{
			this.smokeCooldown = 0
			const angle = Random.uniform(0, Math.PI * 2)
			const dist = Random.discrete(0, rangePix * .8)
			const posX = this.position.x + Math.cos(angle) * dist
			const posY = this.position.y + Math.sin(angle) * dist
			const sizeRate = Random.uniform(this.parent.mod.range * .01, this.parent.mod.range * .005)
			this.smoke.push([posX, posY, 0, sizeRate, 1])
		}

		// Create new heat spot in fireball.
		if (++this.heatSpotCooldown > heatSpotInterval)
		{
			this.heatSpotCooldown = 0
			this.heatSpots.push(0)
		}

		// Progress existing smoke.
		for (let i = this.smoke.length - 1; i >= 0; i--)
		{
			const smoke = this.smoke[i]

			// Change alpha.
			smoke[4] -= .002
			if (smoke[4] <= 0.5)
			{
				this.smoke.splice(i, 1)
				continue
			}

			// Change size.
			smoke[2] += smoke[3]
		}
		
		// Progress heatSpots.
		for (let i = this.heatSpots.length - 1; i >= 0; i--)
		{
			this.heatSpots[i] += .017
			if (this.heatSpots[i] >= 1)
				this.heatSpots.splice(i, 1)
		}
	}

	lastVisiblePoint(pos, rangePix)
	{
		let dx = screenCenter.x - pos.x
		let dy = screenCenter.y - pos.y
		const len = Math.hypot(dx, dy) || 1
		dx /= len
		dy /= len
		this._lastVisiblePoint.x = pos.x + dx * rangePix
		this._lastVisiblePoint.y = pos.y + dy * rangePix
		return this._lastVisiblePoint
	}

	on_renderStart()
	{
		const surface = this.parent.fireballSurface.surface
		const rangePix = scalePix(this.parent.mod.range)
		const rangePix09 = rangePix * 0.9

		// Draw back smoke.
		for (let i = 0; i < this.smoke.length; i++)
		{
			const smoke = this.smoke[i]
			PrimNative.drawFilledCircle(surface, smoke[0], smoke[1], scalePix(smoke[2]), midGray.fadeTo(smoke[4]))
		}

		// Draw fireball outline.
		PrimNative.drawFilledCircle(surface, this.position.x, this.position.y, rangePix, midGray)

		// Draw heat spots.
		for (let i = 0; i < this.heatSpots.length; i++)
		{
			const heatSpot = this.heatSpots[i]
			const radius = heatSpot * rangePix09
			const offset = rangePix09 - radius
			this._heatSpotPos.x = this.position.x + this.direction.x * offset
			this._heatSpotPos.y = this.position.y + this.direction.y * offset
			PrimNative.drawFilledCircle(surface, this._heatSpotPos.x, this._heatSpotPos.y, radius, paleYellow.fadeTo(1 - heatSpot))
		}
	}
}
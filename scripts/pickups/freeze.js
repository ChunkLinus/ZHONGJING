import { Powerup } from '../core/powerup.js'
import { Pickup, PICKUP_DURATION } from './pickup.js'
import { Damage } from '../effects/damage.js'
import { Impact } from '../effects/impact.js'
import { Snowflakes } from '../effects/snowflakes.js'

export class FreezePickup extends Pickup
{
	constructor()
	{
		super()
		this.duration = 420
		this.timer = PICKUP_DURATION
		this.iconYOffset = pickupIcons.heightOf("6") / 2
		this.iconXOffset = pickupIcons.widthOf("6") / 2
	}

	on_activate()
	{
		// Make a record that player has used Freeze before.
		if (!("hasUsedFreeze" in save))
			save.hasUsedFreeze = true

		// Visual effect.
		factory.spawn(Impact, this.position.x, this.position.y)
		this.showEffect("powerup_freeze", true);

		// Trigger Freeze.
		(powerups.find(powerup => powerup.constructor.name == "Freeze") || factory.spawn(Freeze, this.duration * (1 + freezeDurationBonus))).refresh()

		// Kill pickup.
		this.stop()
	}

	on_render()
	{
		pickupIcons.drawText(
			Surface.Screen,
			this.position.x - this.iconXOffset,
			this.position.y - this.iconYOffset,
			"6",
			midGray
		)
		this.renderWordAndProgress()
	}
}

export class Freeze extends Powerup
{
	constructor() { super("powerup_freeze") }
	on_init()
	{
		powerup_freeze = true
		audioHandler.playAudioHookBGM("freeze_start")
		bgm.fadeTo(bgm.getMusicInSet("freeze"))
		hostilesArray.forEach(hostile => {
			if (hostile.getType() == type.enemy)
			{
				let enemyPos = hostile.getPosition()
				factory.spawn(Damage, enemyPos.x, enemyPos.y, localize("powerup_freeze"), false, true, true)
				factory.spawn(Snowflakes, hostile)
			}
		})
	}
	refresh()
	{
		this.node.currentProgress = this.node.maxProgress
	}
	on_expire(forced)
	{
		if (!forced)
		{
			audioHandler.playAudioHookBGM("freeze_stop")
			bgm.resume()
		}
		powerup_freeze = false
	}
}
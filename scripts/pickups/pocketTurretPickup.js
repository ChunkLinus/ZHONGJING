import { Pickup, PICKUP_DURATION } from './pickup.js'
import { Impact } from '../effects/impact.js'

export class PocketTurretChargePickup extends Pickup
{
	constructor()
	{
		super()
		this.timer = PICKUP_DURATION
		this.iconYOffset = pickupIcons.heightOf("5") / 2
		this.iconXOffset = pickupIcons.widthOf("5") / 2
	}

	on_activate()
	{
		factory.spawn(Impact, this.position.x, this.position.y)
		this.showEffect("augment_pocketTurret", true)

		ui.hud.bottom.addConsumable("augment_pocketTurret", 1)

		this.stop()
	}

	on_render()
	{
		pickupIcons.drawText(
			Surface.Screen,
			this.position.x - this.iconXOffset,
			this.position.y - this.iconYOffset,
			"¨",
			midGray
		)
		this.renderWordAndProgress()
	}
}
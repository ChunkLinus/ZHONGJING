import { Powerup } from '../core/powerup.js'
import { Pickup, PICKUP_DURATION } from './pickup.js'
import { Impact } from '../effects/impact.js'

export class ScrapPickup extends Pickup
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
		// Effect.
		factory.spawn(Impact, this.position.x, this.position.y)
		this.showEffect("augment_scrapArmaments", true)

		// Trigger Scrap Armaments and destroy self.
		this.triggerScrapArmaments()
		this.stop()
	}

	triggerScrapArmaments()
	{
		let existingScrapArmaments = powerups.find((powerup) => powerup.constructor.name == "ScrapArmaments")
		if (existingScrapArmaments)
			existingScrapArmaments.node.currentProgress = existingScrapArmaments.node.maxProgress
		else
			factory.spawn(ScrapArmaments, 1200)
	}

	on_render()
	{
		pickupIcons.drawText(
			Surface.Screen,
			this.position.x - this.iconXOffset,
			this.position.y - this.iconYOffset,
			"<",
			midGray
		)
		this.renderWordAndProgress()
	}
}

class ScrapArmaments extends Powerup
{
	constructor() { super("augment_scrapArmaments") }
	on_init()
	{
		modifiers.editAbsModifier("tag_kinetic", "augment_scrapArmaments", { kinetic: 10 })
		Sphere.sleep(1).then(() => refreshAllModifiers())
	}
	on_expire(forced)
	{
		modifiers.editAbsModifier("tag_kinetic", "augment_scrapArmaments", { kinetic: 0 });
		refreshAllModifiers()
	}
}
import { Task } from 'sphere-runtime'
import { TempUpgrade } from '../ui/tempUpgrade.js'

export class Powerup extends Task
{
	constructor(name)
	{
		super()

		// Create UI display.
		this.node = new TempUpgrade(ui.hud.middle)
		this.node.setText(localize(name))
		this.node.hide()

		// Start.
		this.start()
		this.suspend()
	}

	on_init() {}
	reset(duration, reverse = false, autoProgress = true)
	{
		powerups.push(this)
		this.reverse = reverse
		this.autoProgress = autoProgress
		this.node.show()
		this.node.currentProgress = reverse ? 0 : duration
		this.node.maxProgress = duration
		this.on_init()
		this.resume()
	}

	on_update()
	{
		if (!isPaused() && this.autoProgress)
			if (this.reverse ?
				++this.node.currentProgress >= this.node.maxProgress :
				--this.node.currentProgress <= 0
			)
				this.expire()
	}

	on_expire(forced) {}
	expire(forced = false)
	{
		this.on_expire(forced)
		powerups.splice(powerups.indexOf(this), 1);
		this.node.hide()
		this.suspend()
	}

	on_shutdown()
	{
		this.node.detach()
	}
}
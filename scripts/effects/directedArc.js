import { Entity } from '../core/entityFactory.js'
import { DrawLightning } from '../effects/drawLightning.js'

export class DirectedArc extends Entity {
	constructor() {
		super()
		this.ticks = 0
		this.duration = 30
	}

	reset(from, to) {
		this.from = from
		this.to = to
		this.resume()
	}

	on_update() {
		if (++this.ticks >= this.duration)
			this.suspend()
	}

	on_renderStart() {
		if (this.from && this.to)
			DrawLightning(this.from, this.to)
	}
}
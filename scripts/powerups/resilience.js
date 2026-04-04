import { Powerup } from '../core/powerup.js';


export class Resilience extends Powerup {
	constructor() { super("item_resilience"); }
	on_init() {
		this.stacks = 0;
		this.trigger();
	}
	trigger() {
		if (this.stacks < 3) {
			this.stacks++;
			this.node.setText(
				`${localize("item_resilience")} x${this.stacks}`,
				`+${this.stacks * 10}% ${localize("range_text")}`);
			modifiers.editPercModifier("global", "item_resilience", { duration: this.stacks * .1 });
			refreshAllModifiers();
		}
	}
	on_expire() {
		modifiers.editPercModifier("global", "item_resilience", { duration: 0 });
		refreshAllModifiers();
	}
}
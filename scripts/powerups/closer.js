import { Powerup } from '../core/powerup.js';


export class Closer extends Powerup {
	constructor() { super("item_closer"); }
	on_init() {
		this.stacks = 0;
		this.trigger();
	}
	trigger() {
		if (this.stacks < 3) {
			this.stacks++;
			this.node.setText(
				`${localize("item_closer")} x${this.stacks}`,
				`+${this.stacks * 10}% ${localize("damage")}`);
			modifiers.editPercModifier("global", "item_closer", { damage: this.stacks * .1 });
			refreshAllModifiers();
		}
	}
	on_expire() {
		modifiers.editPercModifier("global", "item_closer", { damage: 0 });
		refreshAllModifiers();
	}
}

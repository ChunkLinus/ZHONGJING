import { Powerup } from '../core/powerup.js';

export class Ascetic extends Powerup {
	constructor() { super("item_ascetic"); }
	trigger(stacks) {
		this.node.setText(localize("item_ascetic"), `+${stacks * 10}% ${localize("damage")}`);
		modifiers.editPercModifier("global", "item_ascetic", { damage: stacks * .1 });
		refreshAllModifiers();
	}
	on_expire() {
		modifiers.editPercModifier("global", "item_ascetic", { damage: 0 });
		refreshAllModifiers();
	}
}

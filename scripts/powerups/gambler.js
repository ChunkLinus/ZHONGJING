import { Powerup } from "../core/powerup.js";


export class Gambler extends Powerup {
	constructor() { super("augment_gambler"); }
	on_init() {
		this.stacks = 0;
	}
	increment() {
		this.stacks++;
		this.node.currentProgress = this.node.maxProgress;
		modifiers.editPercModifier("tag_main", "augment_gambler", { damage: this.stacks * .2 });
		refreshAllModifiers();
		this.node.setText(localize("augment_gambler"), `+${this.stacks * 20}% ${localize("damage")}`);
	}
	on_expire() {
		modifiers.editPercModifier("tag_main", "augment_gambler", { damage: 0 });
		refreshAllModifiers();
	}
}

import { Powerup } from "../core/powerup.js";


export class Conviction extends Powerup {
	constructor() {
		super("augment_conviction");
		this.node.setText(localize("augment_conviction"), localize("augment_conviction_powerup", "+40%"));
	}
	on_init() {
		modifiers.editPercModifier("tag_damageOverTime", "augment_conviction", { rateOfFire: .4 });
		refreshAllModifiers();
	}
	on_expire() {
		modifiers.editPercModifier("tag_damageOverTime", "augment_conviction", { rateOfFire: 0 });
		refreshAllModifiers();
	}
}

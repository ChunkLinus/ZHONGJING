import { Powerup } from "../core/powerup.js";


export class Haze extends Powerup {
	constructor() { super("augment_gambler"); }
	on_init() {
		modifiers.editPercModifier("global", "augment_haze", { rateOfFire: activeAugments["augment_haze"] * .5 });
		refreshAllModifiers();
		this.node.setText(localize("augment_haze"), `+${activeAugments["augment_haze"] * 50}% ${localize("rateOfFire_text")}`);
	}
	on_expire() {
		modifiers.editPercModifier("global", "augment_haze", { rateOfFire: 0 });
		refreshAllModifiers();
	}
}

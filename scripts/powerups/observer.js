import { Powerup } from "../core/powerup.js";


export class Observer extends Powerup {
	constructor() {
		super("augment_observer");
		this.node.setText(localize("augment_observer"), localize("augment_observer_powerup", "+30%"));
	}
	on_init() {
		modifiers.editPercModifier("tag_turret", "augment_observer", { damage: .3 });
		refreshAllModifiers();
	}
	on_expire() {
		modifiers.editPercModifier("tag_turret", "augment_observer", { damage: 0 });
		refreshAllModifiers();
	}
}

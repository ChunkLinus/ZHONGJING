import { Powerup } from "../core/powerup.js";


export class Deliverance extends Powerup {
	constructor() {
		super("augment_deliverance");
		this.node.setText(localize("augment_deliverance"), localize("augment_deliverance_powerup", "+40%"));
	}
	on_init() {
		modifiers.editPercModifier("tag_remote", "augment_deliverance", { range: .4 });
		refreshAllModifiers();
	}
	on_expire() {
		modifiers.editPercModifier("tag_remote", "augment_deliverance", { range: 0 });
		refreshAllModifiers();
	}
}

import { Powerup } from "../core/powerup.js";


export class FieldIntel extends Powerup {
	constructor() {
		super("augment_fieldIntel");
		this.node.setText(localize("augment_fieldIntel"), `+30% ${localize("tag_turret")} ${localize("range_text")}`);
	}
	on_init() {
		modifiers.editPercModifier("tag_turret", "augment_fieldIntel", { range: .3 });
		refreshAllModifiers();
	}
	refresh() {
		this.node.currentProgress = this.node.maxProgress;
	}
	on_expire() {
		modifiers.editPercModifier("tag_turret", "augment_fieldIntel", { range: 0 });
		refreshAllModifiers();
	}
}

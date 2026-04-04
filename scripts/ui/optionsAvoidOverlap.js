import { OptionsToggle } from "./optionsToggle.js"
import { saveGame } from "../core/loader.js"

export class OptionsAvoidOverlap extends OptionsToggle
{
	constructor(navigationMenu)
	{
		super(navigationMenu)
		this.name.setText(localize("options_avoidOverlap"))
	}

	refresh()
	{
		this.varCount.setText(avoidOverlap ? localize("on_text") : localize("off_text"))
		this.canVariableDecrease = avoidOverlap ? true : false
		this.canVariableIncrease = avoidOverlap ? false : true
		super.refresh()
	}

	changeVariable(increment)
	{
		if ((increment > 0 && this.canVariableIncrease) || (increment < 0 && this.canVariableDecrease))
		{
			audioHandler.playAudioHookUI("main_menu_options_change_value")
			avoidOverlap = increment > 0
			save.avoidOverlap = avoidOverlap
			saveGame()
			this.refresh()
		}
	}
}

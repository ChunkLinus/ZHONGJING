import { OptionsToggle } from "./optionsToggle.js"
import { saveGame } from "../core/loader.js"

export class OptionsSFXVolume extends OptionsToggle
{
	constructor(navigationMenu)
	{
		super(navigationMenu)
		this.name.setText(localize("options_SFXVolume"))
	}

	refresh()
	{
		let volume = Math.round(audioHandler.getSfxVolume() * 100)
		this.varCount.setText( Sphere.audioEnabled() ? volume + "%" : "---" )
		this.canVariableDecrease = volume > 0 ? true : false
		this.canVariableIncrease = volume < 100 ? true : false
		super.refresh()
	}

	changeVariable(increment)
	{
		if ((increment > 0 && this.canVariableIncrease) || (increment < 0 && this.canVariableDecrease))
		{
			audioHandler.playAudioHookUI("main_menu_options_change_value")
			audioHandler.setSfxVolume( audioHandler.getSfxVolume() + increment * .1 )
			save.sfxVolume = audioHandler.getSfxVolume()
			saveGame()
			this.refresh()
		}
	}
}
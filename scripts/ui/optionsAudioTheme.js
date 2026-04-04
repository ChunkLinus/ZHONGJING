import { OptionsLanguage } from "./optionsLanguage.js"

export class OptionsAudioTheme extends OptionsLanguage
{
	constructor(navigationMenu)
	{
		super(false, navigationMenu)
		this.name.setText(localize("options_audio_theme"))
	}

	triggerPopUp()
	{
		ui.audioThemeSelect.lastFocus = this
		ui.audioThemeSelect.startIntro(this)
	}

	refresh()
	{
		this.varCount.setText("bgmSet" in save ? localize(save.bgmSet + "_audio_theme") : localize("default_audio_theme"))
		super.refresh()
	}
}
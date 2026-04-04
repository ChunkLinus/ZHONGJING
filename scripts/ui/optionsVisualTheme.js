import { OptionsLanguage } from "./optionsLanguage.js"

export class OptionsVisualTheme extends OptionsLanguage
{
	constructor(navigationMenu)
	{
		super(false, navigationMenu)
		this.name.setText(localize("options_visual_theme"))
	}

	triggerPopUp()
	{
		this.lastTheme = visualTheme
		ui.visualThemeSelect.lastFocus = this
		ui.visualThemeSelect.startIntro(this)
	}

	onPopupClose()
	{
		if (visualTheme != this.lastTheme)
			super.refreshUIAndSkipToCurrentOption()
	}

	refresh()
	{
		this.varCount.setText("visualTheme" in save ? localize(save.visualTheme) : localize("theme_light_mode"))
		super.refresh()
	}
}
import { saveGame } from "../core/loader.js"
import { OptionsLanguage } from "./optionsLanguage.js"

export class OptionsLanguageGame extends OptionsLanguage
{
	constructor(navigationMenu)
	{
		super(true, navigationMenu)
		this.name.setText(localize("options_game_language"))
	}

	refresh()
	{
		// Update options text.
		if ("language_name" in wordlists[currentGameLanguage])
		{
			const langName = wordlists[currentGameLanguage]["language_name"]
			this.setLanguageFont(langName)
			this.varCount.setText(langName)
		}
		else
		{
			this.varCount.setFont(typingFont)
			this.varCount.setText(currentGameLanguage)
		}
		super.refresh()
	}

	setLanguageFont(languageName)
	{
		const lang = guessLanguage(languageName)
		switch(lang)
		{
			case "schinese":
			case "tchinese":
			case "koreana":
				this.varCount.setFont(regularEastAsian)
				break
			case "japanese":
				this.varCount.setFont(regularJapanese)
				break
			default:
				this.varCount.setFont(typingFont)
				break
		}
	}
	
	onPopupClose(lang)
	{
		if (lang != currentGameLanguage)
		{
			changeGameLanguage(lang)
			save.gameLanguage = currentGameLanguage
			saveGame()
			super.refreshUIAndSkipToCurrentOption()
		}
	}
}
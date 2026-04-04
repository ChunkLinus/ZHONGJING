import { Yoga } from 'sphere-runtime'
import { DiscordButton } from "./discordButton.js"

export class WikiButton extends DiscordButton
{
	constructor()
	{
		super()
			.setMargin(Yoga.EDGE_TOP, scalePix(40))
		this.logo.setText("<")
		this.logo.setWidth(interfaceIcons.widthOf("<"))
		this.text.setFont(regularFontUI())
		this.text.setText(localize("official_wiki"))
		this.text.setWidth(regularFontUI().widthOf(localize("official_wiki")))
	}
	interact()
	{
		if (!inPopUp)
		{
			let lang = officialLanguages.includes(currentUILanguage) ? currentUILanguage : "english"
			if (steamEnabled && ISteamUtils.IsOverlayEnabled())
				ISteamFriends.ActivateGameOverlayToWebPage(
					`https://alias.black/glyphica/wiki_${lang}.html`,
					EActivateGameOverlayToWebPageMode.k_EActivateGameOverlayToWebPageMode_Modal
				)
			else Sphere.openURL(`https://alias.black/glyphica/wiki_${lang}.html`)
		}
	}
}
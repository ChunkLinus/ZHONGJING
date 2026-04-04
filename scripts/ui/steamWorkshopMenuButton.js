import { Node, Text, Yoga, Tween, Easing } from 'sphere-runtime'
import { Button } from '../core/button.js'

export class SteamWorkshopMenuButton extends Button
{
	constructor()
	{
		super()
			.setWidth("80%")
			.setHeight("10%")
			.setRenderMode(renderMode.colorRounded)
			.setMargin(Yoga.EDGE_TOP, scalePix(40))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setPadding(Yoga.EDGE_HORIZONTAL, scalePix(5))
			.setTexture(midGray.fadeTo(0))
		
		this.logo = new Text()
			.setFont(interfaceIconsMedium)
			.setColor(paleYellow.fadeTo(0))
			.setWidth(interfaceIconsMedium.widthOf("#"))
			.setMargin(Yoga.EDGE_RIGHT, scalePix(20))
			.setText("#")
			.setChildOf(this)
		
		this.textGroup = new Node()
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setChildOf(this)
		
		this.wishlistText = new Text()
			.setFont(titleFontUI())
			.setColor(paleYellow.fadeTo(0))
			.setWidth(titleFontUI().widthOf(localize("steam_txt")))
			.setText(localize("steam_txt"))
			.setChildOf(this.textGroup)
		
		this.onSteamText = new Text()
			.setFont(regularFontUI())
			.setColor(paleYellow.fadeTo(0))
			.setWidth(regularFontUI().widthOf(localize("workshop_txt")))
			.setText(localize("workshop_txt"))
			.setChildOf(this.textGroup)
		
		this.opacity = 0
		this.tween = new Tween(this, Easing.Linear)
		
		return this
	}

	focusStart()
	{
		if (!inPopUp)
		{
			audioHandler.playAudioHookUI("main_menu_navigation_hover")
			this.setTexture(secondColorDark)
		}
	}
	
	focusEnd()
	{
		this.setTexture(midGray)
	}

	setOpacity(opacity)
	{
		this.opacity = opacity
		this.setTexture(midGray.fadeTo(opacity))
		this.logo.setColor(paleYellow.fadeTo(opacity))
		this.wishlistText.setColor(paleYellow.fadeTo(opacity))
		this.onSteamText.setColor(paleYellow.fadeTo(opacity))
	}

	prepareForExtro() {}

	startIntro()
	{
		this.setAnimating(true)
		return new Promise((resolve) => {
			this.tween.easeIn({opacity: 1}, 50)
				.then(() => {
					this.setAnimating(false)
					resolve()
				})
		})
	}

	startExtro()
	{
		this.setAnimating(true)
		return new Promise((resolve) => {
			this.tween.easeOut({opacity: 0}, 50)
				.then(() => {
					this.setAnimating(false)
					resolve()
				})
		})
	}

	update()
	{
		super.update()
		if (this.animating)
			this.setOpacity(this.opacity)
	}

	pressMouseLeftStart() { this.interact() }
	pressButtonBottomStart() { this.interact() }
	interact()
	{
		if (!inPopUp)
		{
			audioHandler.playAudioHookUI("main_menu_navigation_click")
			this.focusEnd()
			ui.steamWorkshop.lastFocus = this
			ui.steamWorkshop.startIntro()
		}
	}
}
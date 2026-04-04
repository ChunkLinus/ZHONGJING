import { Node, Yoga, Tween, Easing, Text } from 'sphere-runtime'
import { Button } from '../core/button.js'
import { saveGame } from '../core/loader.js'

export class AudioThemeSelect extends Node
{
	constructor()
	{
		super()
			.setRenderMode(renderMode.color)
			.setTexture(bgColor.fadeTo(0))
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("100%")
			.setHeight("100%")

		this.tween = new Tween(this, Easing.Linear)
		this.confirmAction = null
		this.lastFocus = null
		this.optionButton = null		
		this.opacity = 0
		
		this.panel = new ConfirmPanel(this)
			.setChildOf(this)
		
		return this
	}

	startIntro(optionButton = null)
	{
		this.populate()
		inPopUp = true
		this.optionButton = optionButton
		if (!ui.main_menu.turrets.hidden)
			ui.disableAllTurretButtons()
		audioHandler.playAudioHookUI("main_menu_confirmation_popup_intro")
		this.setAnimating(true)
		control.suspend(true)
		this.tween.easeIn({opacity: 1}, 40)
			.then(() => this.setAnimating(false))
		this.panel.animYOffset = this.getComputedHeight() - this.panel.getComputedTop()
		Sphere.sleep(20).then(() => {
			this.panel.startIntro()
				.then(() => control.suspend(false))
		})
		this.show()
	}

	startExtro()
	{
		this.setAnimating(true)
		control.suspend(true)
		audioHandler.playAudioHookUI("main_menu_confirmation_popup_extro")
		this.panel.startExtro()
		Sphere.sleep(10).then(() => {
			this.tween.easeIn({opacity: 0}, 40)
				.then(() => {
					this.setAnimating(false)
					control.suspend(false)
					inPopUp = false
					if (usingController || keyboardArrows)
					{
						currentFocus.focusEnd()
						if (this.lastFocus)
						{
							this.lastFocus.takeFocus()
							this.lastFocus = null
						}
						else ui.main_menu.left.main_menu_buttons[4].takeFocus()
					}
					if (!ui.main_menu.turrets.hidden)
						ui.disableAllTurretButtons(false)
					this.hide()
				})
		})
	}

	populate()
	{
		let themeInfo = Object.keys(BGMSets.menu).map(theme => theme.replace("_menu", ""))
		for (let i = 0; i < this.panel.themes.length; i++)
		{
			if (themeInfo.length > i)
			{
				let button = this.panel.themes[i]
				button.show()
				button.theme = themeInfo[i]
				button.text.setFont(regularFontUI())
				button.text.setText(localize(themeInfo[i] + "_audio_theme"))
				button.currentSelected = button.defaultFocus =
					"bgmSet" in save && save.bgmSet == themeInfo[i] || !("bgmSet" in save) && themeInfo[i] == "default"
				if (button.currentSelected && (usingController || keyboardArrows))
					button.takeFocus()
				else button.focusEnd()
			}
			else this.panel.themes[i].hide()
		}
	}

	update()
	{
		if (this.animating)
			this.setTexture(bgColor.fadeTo(this.opacity))
	}
}

class ConfirmPanel extends Node
{
	constructor(parent)
	{
		super()
			.setRenderMode(renderMode.color)
			.setTexture(paleYellow)
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("50%")
			.setHeight("80%")

		this.titleGroup = new Text()
			.setWidth("100%")
			.setHeight(titleFontUI().height)
			.setTextAlign(textAlign.center)
			.setFont(titleFontUI())
			.setColor(midGray)
			.setText(localize("options_audio_theme"))
			.setChildOf(this)
		
		this.themeContainer = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("85%")
			.setHeight("63%")
			.setMargin(Yoga.EDGE_VERTICAL, "3%")
			.setChildOf(this)
		
		this.buttonGroup = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("100%")
			.setHeight("10%")
			.setChildOf(this)
		
		this.cancelButton = new CancelButton(parent)
			.setChildOf(this.buttonGroup)

		this.themes = []
		for (let i = 0; i < 7; i++)
		{
			let themeButton = new AudioThemeButton(parent, i).setChildOf(this.themeContainer)
			if (i > 0)
			{
				this.themes[i - 1].bottomNext = themeButton
				themeButton.topNext = this.themes[i - 1]
			}
			this.themes.push(themeButton)
		}

		this.parent = parent
		this.tween = new Tween(this, Easing.Exponential)
	}

	startIntro()
	{
		this.cancelButton.topNext = this.themes.findLast(theme => !theme.hidden)
		this.setAnimating(true)
		return new Promise((resolve) => {
			this.tween.easeOut({animYOffset: 0}, 20)
				.then(() => {
					this.setAnimating(false)
					resolve()
			})
		})
	}

	startExtro()
	{
		this.setAnimating(true)
		this.tween.easeIn({animYOffset: -(this.getComputedTop() + this.getComputedHeight())}, 20)
			.then(() => this.setAnimating(false))
	}
}

class AudioThemeButton extends Button
{
	constructor(parent, index)
	{
		super()
			.setWidth("100%")
			.setHeight(scalePix(60))
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray.fadeTo(.3))
			.setMargin(Yoga.EDGE_BOTTOM, "1%")
			.setMargin(Yoga.EDGE_HORIZONTAL, "1%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
		
		this.text = new Text()
			.setFont(typingFont)
			.setTextAlign(textAlign.center)
			.setColor(midGray)
			.setText("Test")
			.setWidth("100%")
			.setHeight(typingFont.height)
			.setChildOf(this)
		
		this.parent = parent
		this.currentSelected = false
		this.theme = ""
		this.index = index
	}

	selectBottom()
	{
		if (this.bottomNext && !this.bottomNext.hidden)
			this.bottomNext.takeFocus()
		else
			this.parent.panel.cancelButton.takeFocus()
		this.focusEnd()
	}

	selected()
	{
		this.setTexture(darkGray)
		this.text.setColor(paleYellow)
	}

	focusStart()
	{
		this.setTexture(secondColorDark)
		this.text.setColor(paleYellow)
	}

	focusEnd()
	{
		if (this.currentSelected)
			this.selected()
		else
		{
			this.setTexture(midGray.fadeTo(.3))
			this.text.setColor(midGray)
		}
	}

	pressMouseLeftStart() { this.activate() }
	pressButtonBottomStart() { this.activate() }
	activate()
	{
		audioHandler.playAudioHookUI("main_menu_confirmation_click")
		bgm.changeTheme(this.theme)
		save.bgmSet = this.theme
		saveGame()
		if (this.parent.optionButton) this.parent.optionButton.refresh()
		this.parent.startExtro()
	}
}

class CancelButton extends Button
{
	constructor(parent)
	{
		super()
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("30%")
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(5))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setDefault()
			.setHeight(regularFontUI().height + scalePix(25))
		
		this.text = new Text()
			.setColor(paleYellow)
			.setFont(regularFontUI())
			.setText(localize("cancel_text"))
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setChildOf(this)

		this.parent = parent
		return this
	}

	focusStart()
	{
		audioHandler.playAudioHookUI("main_menu_confirmation_hover")
		this.setTexture(secondColorDark)
	}

	focusEnd()
	{
		this.setTexture(midGray)
	}

	pressMouseLeftStart() { this.activate() }
	pressButtonBottomStart() { this.activate() }
	activate()
	{
		audioHandler.playAudioHookUI("main_menu_confirmation_click")
		this.parent.startExtro()
	}
}
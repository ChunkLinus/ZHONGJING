import { Node, Yoga, Tween, Easing, Text } from 'sphere-runtime'
import { Button } from '../core/button.js'
import { saveGame } from '../core/loader.js'
import { doublePinyinOptions } from './optionsLanguageDoublePinyin.js'

export class DoublePinyinSelect extends Node
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
		let setDisable = false
		this.panel.titleGroup.setText(localize("options_allowDoublePinyin"))
		for (let i = 0; i < this.panel.doublePinyins.length; i++)
		{
			let button = this.panel.doublePinyins[i]
			if (doublePinyinOptions.length > i)
			{
				button.show()
				button.isDisable = false
				button.text.setFont(regularEastAsian)
				button.text.setText(doublePinyinOptions[i])
				button.currentSelected = button.defaultFocus =
					"allowDoublePinyin" in save && save.allowDoublePinyin == i
				if (button.currentSelected && (usingController || keyboardArrows))
					button.takeFocus()
				else button.focusEnd()
			}
			else if (!setDisable)
			{
				setDisable = true
				button.isDisable = true
				button.text.setFont(regularFontUI())
				button.text.setText(localize("off_text"))
			}
			else button.hide()
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
			.setWidth("80%")
			.setHeight("80%")
		
		this.titleGroup = new Text()
			.setWidth("100%")
			.setHeight(titleFontUI().height)
			.setTextAlign(textAlign.center)
			.setFont(titleFontUI())
			.setColor(midGray)
			.setText("title")
			.setChildOf(this)
		
		this.doublePinyinContainer = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("85%")
			.setHeight("63%")
			.setMargin(Yoga.EDGE_VERTICAL, "3%")
			.setChildOf(this)
		
		this.doublePinyinGroup = new Node()
			.setWidth("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setFlexWrap(Yoga.FLEX_FLEX)
			.setChildOf(this.doublePinyinContainer)
		
		this.buttonGroup = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("100%")
			.setHeight("10%")
			.setChildOf(this)
		
		this.cancelButton = new CancelButton(parent)
			.setChildOf(this.buttonGroup)
		
		// Create language buttons.
		this.doublePinyins = []
		for (let i = 0; i < 24; i++)
		{
			let dp = new DoublePinyinOption(parent, i)
				.setChildOf(this.doublePinyinGroup)
			this.doublePinyins.push(dp)
		}

		// Setup controller navigation.
		for (let i = 0; i < this.doublePinyins.length; i += 3)
		{
			// Horizontal Navigation.
			this.doublePinyins[i].rightNext = this.doublePinyins[i + 1]
			this.doublePinyins[i + 1].leftNext = this.doublePinyins[i]
			this.doublePinyins[i + 1].rightNext = this.doublePinyins[i + 2]
			this.doublePinyins[i + 2].leftNext = this.doublePinyins[i + 1]

			// Vertical Navigation.
			for (let k = 0; k < 3; k++)
			{
				if (i < this.doublePinyins.length - 4)
					this.doublePinyins[i + k].bottomNext = this.doublePinyins[i + k + 3]
				if (i > 2)
					this.doublePinyins[i + k].topNext = this.doublePinyins[i + k - 3]
			}
		}
		this.tween = new Tween(this, Easing.Exponential)
		return this
	}

	startIntro()
	{
		this.cancelButton.topNext = this.doublePinyins.findLast(lang => !lang.hidden)
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

class DoublePinyinOption extends Button
{
	constructor(parent, index)
	{
		super()
			.setWidth("30%")
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
		this.isDisable = false
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
		save.allowDoublePinyin = this.isDisable ? null : this.index
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
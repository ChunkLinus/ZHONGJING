import { Node, Text, Yoga, Tween, Easing } from 'sphere-runtime'
import { Button } from '../core/button.js'
import { saveGame } from '../core/loader.js'

export class PauseMenuVolumePanel extends Node
{
	constructor(parent)
	{
		super()
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setWidth("100%")
			.setHeight("100%")
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
		
		this.volumePanelBG = new Node()
			.setWidth("50%")
			.setHeight("55%")
			.setRenderMode(renderMode.color)
			.setTexture(paleYellow)
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this)

		this.title = new Text()
			.setFont(titleFontUI())
			.setColor(midGray)
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setText(localize("options_volume"))
			.setMargin(Yoga.EDGE_BOTTOM, scalePix(40))
			.setChildOf(this.volumePanelBG)

		// Volume controls
		this.volumeControlsGroup = new Node()
			.setHeight("50%")
			.setWidth("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this.volumePanelBG)
		this.volumeControls = []
		this.bgmVolume = new PauseMenuBGMVolume(this)
			.setChildOf(this.volumeControlsGroup)
		this.sfxVolume = new PauseMenuSFXVolume(this)
			.setChildOf(this.volumeControlsGroup)
		this.volumeControls.push(this.bgmVolume)
		this.volumeControls.push(this.sfxVolume)

		// Confirm button
		this.confirmButton = new PauseMenuVolumeConfirmButton(this)
			.setMargin(Yoga.EDGE_TOP, scalePix(30))
			.setChildOf(this.volumePanelBG)

		// Setup controller navigation
		this.bgmVolume.setBottomNext(this.sfxVolume)
		this.sfxVolume.setTopNext(this.bgmVolume)
		this.sfxVolume.setBottomNext(this.confirmButton)
		this.confirmButton.setTopNext(this.sfxVolume)

		this.parent = parent
		this.tween = new Tween(this, Easing.Exponential)
	}

	refresh()
	{
		this.bgmVolume.refresh()
		this.sfxVolume.refresh()
	}

	startIntro()
	{
		this.setAnimating(true)
		control.suspend(true)
		this.animYOffset = this.getComputedHeight()
		this.refresh()
		this.show()
		this.parent.panel.startExtro()
			.then(() => {
				this.parent.panel.hide()
				this.tween.easeOut({animYOffset: 0}, 20)
					.then(() => {
						control.suspend(false)
						this.setAnimating(false)
						if (usingController || keyboardArrows)
							this.bgmVolume.takeFocus()
					})
			})
	}

	startExtro()
	{
		this.setAnimating(true)
		control.suspend(true)
		if (currentFocus) currentFocus.focusEnd()
		currentFocus = null
		this.tween.easeIn({animYOffset: this.getComputedHeight()}, 20)
			.then(() => {
				this.hide()
				this.parent.panel.show()
				this.parent.panel.startIntro()
					.then(() => {
						this.parent.panel.pauseMenuButtons[1].takeFocus()
						control.suspend(false)
						this.setAnimating(false)
					})
			})
	}

	keyboardEnter()
	{
		if (!this.hidden && !this.animating)
		{
			keyboardArrows = true
			if (!currentFocus)
				this.bgmVolume.takeFocus()
			else
				currentFocus.activate()
		}
	}

	keyboardArrows(key)
	{
		if (!this.hidden && !this.animating)
		{
			keyboardArrows = true
			if (!currentFocus)
				this.bgmVolume.takeFocus()
			else
				switch(key)
				{
					case Key.Up: currentFocus.selectTop(); break
					case Key.Down: currentFocus.selectBottom(); break
					case Key.Left: if (currentFocus.changeVariable) currentFocus.changeVariable(-1); break
					case Key.Right: if (currentFocus.changeVariable) currentFocus.changeVariable(1); break
				}
		}
	}
}

class PauseMenuVolumeToggle extends Button
{
	constructor(parent)
	{
		super()
			.setRenderMode(renderMode.color)
			.setTexture(null)
			.setWidth("90%")
			.setHeight(scalePix(60))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)

		this.canVariableDecrease = true
		this.canVariableIncrease = true
		this.parent = parent
		
		this.name = new Text()
			.setFont(regularFontUI())
			.setTextAlign(textAlign.center)
			.setText("name")
			.setWidth("35%")
			.setColor(midGray)
			.setChildOf(this)

		this.varCountMouseLeft = new VolumeChangeButton(this, -1)
			.setChildOf(this)
		
		this.varCountIconsLeftGroup = new Node()
			.setWidth("10%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setChildOf(this)
		
		this.varCountControllerLeft = new Text()
			.setFont(quicktimeFont)
			.setColor(midGray)
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setText(getQuickTimeString([shoulder_trigger_left]))
			.setChildOf(this.varCountIconsLeftGroup)

		this.varCountKeyboardLeft = new Node()
			.setWidth("100%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this.varCountIconsLeftGroup)

		this.varCountKeyboardLeftBG = new Node()
			.setRenderMode(renderMode.colorRounded)
			.setWidth(typingFontSmall.height + 30)
			.setHeight(typingFontSmall.height + 10)
			.setTexture(midGray)
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setChildOf(this.varCountKeyboardLeft)

		this.varCountKeyboardLeftText = new Text()
			.setColor(paleYellow)
			.setWidth("100%")
			.setHeight(typingFontSmall.height)
			.setFont(typingFontSmall)
			.setTextAlign(textAlign.center)
			.setText("◀")
			.setChildOf(this.varCountKeyboardLeftBG)
		
		this.varCountBG = new Node()
			.setRenderMode(renderMode.color)
			.setTexture(midGray.fadeTo(.2))
			.setWidth("30%")
			.setHeight(scalePix(35))
			.setMargin(Yoga.EDGE_HORIZONTAL, "1%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this)

		this.varCount = new Text()
			.setColor(midGray)
			.setFont(regularFontUI())
			.setWidth("100%")
			.setHeight(regularFontUI().height)
			.setText("100%")
			.setTextAlign(textAlign.center)
			.setChildOf(this.varCountBG)
		
		this.varCountIconsRightGroup = new Node()
			.setWidth("10%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setChildOf(this)

		this.varCountKeyboardRight = new Node()
			.setWidth("100%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this.varCountIconsRightGroup)

		this.varCountKeyboardRightBG = new Node()
			.setRenderMode(renderMode.colorRounded)
			.setWidth(typingFontSmall.height + scalePix(30))
			.setHeight(typingFontSmall.height + scalePix(10))
			.setTexture(midGray)
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setChildOf(this.varCountKeyboardRight)

		this.varCountKeyboardRightText = new Text()
			.setColor(paleYellow)
			.setWidth("100%")
			.setHeight(typingFontSmall.height)
			.setFont(typingFontSmall)
			.setTextAlign(textAlign.center)
			.setText("▶")
			.setChildOf(this.varCountKeyboardRightBG)

		this.varCountControllerRight = new Text()
			.setFont(quicktimeFont)
			.setColor(midGray)
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setText(getQuickTimeString([shoulder_trigger_right]))
			.setChildOf(this.varCountIconsRightGroup)
		
		this.varCountMouseRight = new VolumeChangeButton(this, 1)
			.setChildOf(this)
	}

	pressShoulderTriggerLeftStart() { this.changeVariable(-1) }
	pressShoulderTriggerRightStart() { this.changeVariable(1) }
	changeVariable(increment) {}

	refresh()
	{
		if (usingController || keyboardArrows)
		{
			this.varCountControllerLeft.hide()
			this.varCountControllerRight.hide()
			this.varCountKeyboardLeft.hide()
			this.varCountKeyboardRight.hide()
			this.varCountIconsLeftGroup.show()
			this.varCountIconsRightGroup.show()
			if (usingController)
			{
				this.varCountControllerLeft.setText(getQuickTimeString([shoulder_trigger_left]))
				this.varCountControllerRight.setText(getQuickTimeString([shoulder_trigger_right]))
			}
			this.varCountMouseLeft.hide()
			this.varCountMouseRight.hide()
			this[currentFocus == this ? "focusStart" : "focusEnd"]()
		}
		else
		{
			this.varCountIconsLeftGroup.hide()
			this.varCountIconsRightGroup.hide()
			this.varCountMouseLeft.setActive(this.canVariableDecrease)
			this.varCountMouseRight.setActive(this.canVariableIncrease)
			this.varCountMouseLeft.show()
			this.varCountMouseRight.show()
		}
	}

	focusStart()
	{
		if (usingController || keyboardArrows)
		{
			audioHandler.playAudioHookUI("pause_menu_button_hover")
			this.setTexture(midGray.fadeTo(.1))
			if (usingController)
			{
				this.varCountControllerLeft.show()
				this.varCountControllerRight.show()
				this.varCountControllerLeft.setColor(this.canVariableDecrease ? midGray : midGray.fadeTo(.3))
				this.varCountControllerRight.setColor(this.canVariableIncrease ? midGray : midGray.fadeTo(.3))
			}
			else if (keyboardArrows)
			{
				this.varCountKeyboardLeft.show()
				this.varCountKeyboardRight.show()
				this.varCountKeyboardLeftBG.setTexture(this.canVariableDecrease ? midGray : midGray.fadeTo(.3))
				this.varCountKeyboardRightBG.setTexture(this.canVariableIncrease ? midGray : midGray.fadeTo(.3))
			}
		}
	}

	focusEnd()
	{
		if (usingController || keyboardArrows)
		{
			this.setTexture(null)
			this.varCountControllerLeft.hide()
			this.varCountControllerRight.hide()
			this.varCountKeyboardLeft.hide()
			this.varCountKeyboardRight.hide()
		}
	}

	update()
	{
		let directionalNav = usingController || keyboardArrows
		if ((!directionalNav && this.varCountMouseLeft.hidden) || (directionalNav && this.varCountIconsLeftGroup.hidden))
			this.refresh()
	}
}

class PauseMenuBGMVolume extends PauseMenuVolumeToggle
{
	constructor(parent)
	{
		super(parent)
		this.name.setText(localize("options_BGMVolume"))
	}

	refresh()
	{
		const text = Sphere.audioEnabled() ? Math.round(audioHandler.getBgmVolume() * 100) + "%" : "---"
		this.varCount.setText(text)
		this.canVariableDecrease = audioHandler.getBgmVolume() > 0 ? true : false
		this.canVariableIncrease = audioHandler.getBgmVolume() < 1 ? true : false
		super.refresh()
	}

	changeVariable(increment)
	{
		if ((increment > 0 && this.canVariableIncrease) || (increment < 0 && this.canVariableDecrease))
		{
			audioHandler.playAudioHookUI("main_menu_options_change_value")
			audioHandler.setBgmVolume(audioHandler.getBgmVolume() + increment * .1)
			save.bgmVolume = audioHandler.getBgmVolume()
			saveGame()
			this.refresh()
		}
	}
}

class PauseMenuSFXVolume extends PauseMenuVolumeToggle
{
	constructor(parent)
	{
		super(parent)
		this.name.setText(localize("options_SFXVolume"))
	}

	refresh()
	{
		let volume = Math.round(audioHandler.getSfxVolume() * 100)
		this.varCount.setText(Sphere.audioEnabled() ? volume + "%" : "---")
		this.canVariableDecrease = volume > 0 ? true : false
		this.canVariableIncrease = volume < 100 ? true : false
		super.refresh()
	}

	changeVariable(increment)
	{
		if ((increment > 0 && this.canVariableIncrease) || (increment < 0 && this.canVariableDecrease))
		{
			audioHandler.playAudioHookUI("main_menu_options_change_value")
			audioHandler.setSfxVolume(audioHandler.getSfxVolume() + increment * .1)
			save.sfxVolume = audioHandler.getSfxVolume()
			saveGame()
			this.refresh()
		}
	}
}

class VolumeChangeButton extends Button
{
	constructor(parent, increment)
	{
		super()
			.setRenderMode(renderMode.colorRounded)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setTexture(midGray)
			.setWidth("7%")
			.setHeight(scalePix(35))
		
		this.buttonText = new Text()
			.setColor(paleYellow)
			.setFont(typingFontLarge)
			.setWidth("100%")
			.setText(increment > 0 ? "▶" : "◀")
			.setTextAlign(textAlign.center)
			.setChildOf(this)

		this.increment = increment
		this.active = true
		this.parent = parent
		return this
	}

	setActive(active)
	{
		this.active = active
		this.setTexture(active ? midGray : midGray.fadeTo(.3))
	}

	focusStart()
	{
		if (this.active)
			this.setTexture(darkGray)
	}

	focusEnd()
	{
		if (this.active)
			this.setTexture(midGray)
	}

	pressMouseLeftStart()
	{
		if (this.active)
			this.parent.changeVariable(this.increment)
	}
}

class PauseMenuVolumeConfirmButton extends Button
{
	constructor(parent)
	{
		super()
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth('75%')
			.setMargin(Yoga.EDGE_TOP, scalePix(5))
			.setHeight(regularFontUI().height + scalePix(25))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
		
		this.text = new Text()
			.setWidth('100%')
			.setTextAlign(textAlign.center)
			.setFont(regularFontUI())
			.setColor(paleYellow)
			.setText(localize("confirm_text"))
			.setChildOf(this)
		
		this.parent = parent
		return this
	}

	focusStart()
	{
		audioHandler.playAudioHookUI("pause_menu_button_hover")
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
		audioHandler.playAudioHookUI("pause_menu_button_click")
		this.parent.startExtro()
	}
}

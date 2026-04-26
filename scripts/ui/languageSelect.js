import { Node, Text, Yoga, Tween, Easing } from 'sphere-runtime'
import { Button } from '../core/button.js'
import { OptionsToggle } from './optionsToggle.js'

export class LanguageSelect extends Node
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
		this.opacity = 0
		this.onlyOfficialLanguages = false
		this.useConfirmButton = false
		this.currentLanguage = null
		
		this.panel = new ConfirmPanel(this)
			.setChildOf(this)
		
		return this
	}

	startIntro(gameOrUI, optionButton = null)
	{
		// Populate language buttons.
		this.gameOrUI = gameOrUI
		this.populate()

		// Start intro animation.
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

		// Make visible.
		this.show()
	}

	startExtro(lang = null)
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
					if (lang && this.optionButton)
						this.optionButton.onPopupClose(lang)
					this.hide()
				})
		})
	}

	populate()
	{
		// Set title text.
		this.panel.titleGroup.setText(
			localize(
				this.gameOrUI ?
				"options_game_language" :
				"options_UI_language"
			)
		)

		// Hide confirm button if not used.
		if (!this.useConfirmButton)
			this.panel.confirmButton.hide()

		// --- 【伤寒论核心干预：UI 生成管线劫持】 ---
		let languageInfo = [];
		let currentLang = "";

		if (this.gameOrUI) {
			// 【核心改动】：直接读取侦测到的模块列表，不再硬编码
			languageInfo = global.availableModules; 
			currentLang = currentGameLanguage || "shanghan";
		} else {
			// 2. 放行界面语言选项：保留原版的多国语言切换功能
			const dict = localization;
			languageInfo = Object.keys(dict)
				.filter(lang => this.onlyOfficialLanguages ? officialLanguages.includes(lang) : true)
				.map(lang => {
					let languageName = dict[lang]['language_name']
					let isEastAsian = eastAsianRange.test(languageName)
					return {
						lang: lang,
						font: isEastAsian ? regularEastAsian : typingFont,
						text: languageName
					}
				});
			currentLang = currentUILanguage;
		}
		// -------------------------------------------

		for (let i = 0; i < this.panel.languages.length; i++)
		{
			if (languageInfo.length > i + this.panel.currentPage * 24)
			{
				const button = this.panel.languages[i]
				const langInfo = languageInfo[i + this.panel.currentPage * 24]
				button.show()
				button.lang = langInfo.lang
				
				// 【伤寒论核心：在 UI 生成的绝对安全期，强制挂载中文字体】
				button.text.setFont(regularEastAsian) 
				
				button.text.setText(langInfo.text || langInfo.lang)
				button.currentSelected = button.defaultFocus = langInfo.lang == currentLang
				if (button.currentSelected && (usingController || keyboardArrows))
					button.takeFocus()
				else button.focusEnd()
			}
			else this.panel.languages[i].hide()
		}

		// Update Paginator.
		// 修改分页器的计算源，防止游戏模块由于缺少 dict 报错
		let totalItems = this.gameOrUI ? languageInfo.length : Object.values(localization).length;
		this.panel.maxPages = Math.ceil(totalItems / 24);
		this.panel.paginator.refresh()
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
			.setHeight("82%")
		
		this.titleGroup = new Text()
			.setWidth("100%")
			.setHeight(titleFontUI().height)
			.setTextAlign(textAlign.center)
			.setFont(titleFontUI())
			.setColor(midGray)
			.setText("title")
			.setChildOf(this)
		
		this.languagesContainer = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("85%")
			.setHeight("57%")
			.setMargin(Yoga.EDGE_TOP, "5%")
			.setMargin(Yoga.EDGE_BOTTOM, "2.7%")
			.setChildOf(this)
		
		this.languagesGroup = new Node()
			.setWidth("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_FLEX_START)
			.setFlexWrap(Yoga.FLEX_FLEX)
			.setChildOf(this.languagesContainer)
		
		this.paginatorGroup = new Node()
			.setWidth("50%")
			.setHeight(scalePix(70))
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this)
		
		this.paginator = new Paginator(this)
			.setChildOf(this.paginatorGroup)
		
		this.buttonGroup = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("100%")
			.setHeight("10%")
			.setChildOf(this)
		
		this.confirmButton = new ConfirmButton(parent)
			.setChildOf(this.buttonGroup)
		
		this.cancelButton = new CancelButton(parent)
			.setChildOf(this.buttonGroup)
		
		// Create language buttons.
		this.languages = []
		for (let i = 0; i < 24; i++)
		{
			let lang = new LanguageButton(parent, i)
				.setChildOf(this.languagesGroup)
			this.languages.push(lang)
		}

		// Setup controller navigation.
		for (let i = 0; i < this.languages.length; i += 3)
		{
			// Horizontal Navigation.
			this.languages[i].rightNext = this.languages[i + 1]
			this.languages[i + 1].leftNext = this.languages[i]
			this.languages[i + 1].rightNext = this.languages[i + 2]
			this.languages[i + 2].leftNext = this.languages[i + 1]

			// Vertical Navigation.
			for (let k = 0; k < 3; k++)
			{
				if (i < this.languages.length - 4)
					this.languages[i + k].bottomNext = this.languages[i + k + 3]
				if (i > 2)
					this.languages[i + k].topNext = this.languages[i + k - 3]
			}
		}
		this.tween = new Tween(this, Easing.Exponential)
		this.currentPage = 0
		this.maxPages = 0
		this.parent = parent
		return this
	}

	startIntro()
	{
		this.cancelButton.topNext = this.languages.findLast(lang => !lang.hidden)
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

class Paginator extends OptionsToggle
{
	constructor(parent)
	{
		super()
		this.parent = parent
		this.name.hide()
		this.varCountBG.setTexture(null)
		this.varCountControllerLeft.setText(getQuickTimeString([direction_left]))
		this.varCountControllerRight.setText(getQuickTimeString([direction_right]))
		this.varCountKeyboardLeftText.setText("←")
		this.varCountKeyboardRightText.setText("→")
		this.varCountMouseLeft.pressMouseLeftStart = function() {
			this.parent.changeVariable(-1)
		}
		this.varCountMouseRight.pressMouseLeftStart = function() {
			this.parent.changeVariable(1)
		}
	}
	refresh()
	{
		if (this.parent.maxPages <= 1)
			this.hide()
		else
		{
			this.show()
			this.varCount.setText(`${localize("page")} ${this.parent.currentPage + 1} / ${this.parent.maxPages}`)
			if (usingController || keyboardArrows)
			{
				this.varCountIconsLeftGroup.show()
				this.varCountIconsRightGroup.show()
				if (usingController)
				{
					this.varCountControllerLeft.show()
					this.varCountControllerRight.show()
					this.varCountKeyboardLeft.hide()
					this.varCountKeyboardRight.hide()
					this.varCountMouseLeft.hide()
					this.varCountMouseRight.hide()
				}
				else
				{
					this.varCountKeyboardLeft.show()
					this.varCountKeyboardRight.show()
					this.varCountControllerLeft.hide()
					this.varCountControllerRight.hide()
					this.varCountMouseLeft.hide()
					this.varCountMouseRight.hide()
				}
			}
			else
			{
				this.varCountIconsLeftGroup.hide()
				this.varCountIconsRightGroup.hide()
				this.varCountMouseLeft.setActive(!this.isFirstPage())
				this.varCountMouseRight.setActive(!this.isLastPage())
				this.varCountMouseLeft.show()
				this.varCountMouseRight.show()
			}
		}
	}

	isFirstPage() { return this.parent.currentPage <= 0 }
	isLastPage() { return this.parent.currentPage >= this.parent.maxPages }

	changeVariable(increment)
	{
		if ((increment > 0 && !this.isLastPage()) || (increment < 0 && !this.isFirstPage()))
		{
			this.parent.currentPage += increment
			this.parent.parent.populate()
		}
	}
}

class LanguageButton extends Button
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
		this.lang = ""
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
		if (this.parent.useConfirmButton)
		{
			this.parent.currentLanguage = this.lang
			for (const lang of this.parent.panel.languages)
			{
				lang.currentSelected = false
				lang.focusEnd()
			}
			this.currentSelected = true
			this.selected()
		}
		else this.parent.startExtro(this.lang)
	}
}

class CancelButton extends Button
{
	constructor(parent)
	{
		super()
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("25%")
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

class ConfirmButton extends Button
{
	constructor(parent)
	{
		super()
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("25%")
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(5))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setDefault()
			.setHeight(regularFontUI().height + scalePix(25))
		
		this.text = new Text()
			.setColor(paleYellow)
			.setFont(regularFontUI())
			.setText(localize("create_mod_txt"))
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
		this.parent.startExtro(this.parent.currentLanguage)
	}
}
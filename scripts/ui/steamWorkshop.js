import { Node, Text, Yoga, Tween, Easing, Random } from 'sphere-runtime'
import { Button } from '../core/button.js'
import { OptionsToggle } from './optionsToggle.js'
import { createModTemplate, uploadMod, listLocalMods, listSubscribedItems, reloadMods, modOptions } from '../core/workshop.js'
import { LanguageSelect } from './languageSelect.js'

export class SteamWorkshop extends Node
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
		
		this.panel = new SteamWorkshopPanel()
			.setChildOf(this)
		
		this.baseLanguageSelect = new BaseLanguageSelect(this)
			.setChildOf(this)
			.hide()
		
		return this
	}

	startIntro()
	{
		inPopUp = true
		ui.disableAllTurretButtons()
		ui.disableAllMainMenuButtons()
		if (!ui.main_menu.turrets.hidden)
			ui.disableAllTurretButtons()
		audioHandler.playAudioHookUI("main_menu_confirmation_popup_intro")
		this.setAnimating(true)
		control.suspend(true)
		this.tween.easeIn({opacity: 1}, 40)
			.then(() => this.setAnimating(false))
		this.panel.animYOffset = this.getComputedHeight() - this.panel.getComputedTop()
		Sphere.sleep(20).then(() => {
			this.panel.cancelButton.takeFocus()
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
					ui.disableAllTurretButtons(false)
					ui.disableAllMainMenuButtons(false)
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

	update()
	{
		if (this.animating)
			this.setTexture(bgColor.fadeTo(this.opacity))
	}
}

class SteamWorkshopPanel extends Node
{
	constructor()
	{
		super()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setRenderMode(renderMode.colorRounded)
			.setTexture(paleYellow)
			.setPadding(Yoga.EDGE_TOP, "3%")
			.setWidth("75%")
			.setHeight("78%")
		
		// Tabs.
		this.tabsGroup = new Node()
			.setWidth("65%")
			.setHeight("8%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this)
		
		this.tabsLeft = new TabChangeButton(-1, this.testValidity.bind(this), this.tabsChange.bind(this))
			.setWidth("10%")
			.setHeight("100%")
			.setChildOf(this.tabsGroup)

		this.tabsBG = new Node()
			.setWidth("80%")
			.setHeight("100%")
			.setPadding(Yoga.EDGE_VERTICAL, ".5%")
			.setRenderMode(renderMode.color)
			.setTexture(midGray.fadeTo(.2))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(10))
			.setChildOf(this.tabsGroup)
		
		this.tabButton_1 = new TabButton(this, 0)
			.setChildOf(this.tabsBG)

		this.tabButton_2 = new TabButton(this, 1)
			.setChildOf(this.tabsBG)
		
		this.tabsRight = new TabChangeButton(1, this.testValidity.bind(this), this.tabsChange.bind(this))
			.setWidth("10%")
			.setHeight("100%")
			.setChildOf(this.tabsGroup)

		this.tabContents = new Node()
			.setWidth("90%")
			.setHeight("55%")
			.setMargin(Yoga.EDGE_VERTICAL, "3%")
			.setChildOf(this)
		
		this.tabContents_1 = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("100%")
			.setHeight("100%")
			.setChildOf(this.tabContents)
			.hide()
		
		this.tabContents_2 = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("100%")
			.setHeight("100%")
			.setChildOf(this.tabContents)
			.hide()
		
		this.modFolderNotFound = new Node()
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setWidth("100%")
			.setHeight("100%")
			.setChildOf(this.tabContents)
			.hide()
		
		this.modFolderNotFound_txt = new Text()
			.setWidth("100%")
			.setHeight(regularFontUI().height)
			.setFont(regularFontUI())
			.setTextAlign(textAlign.center)
			.setColor(midGray)
			.setText(localize("mod_folder_not_found_txt"))
			.setChildOf(this.modFolderNotFound)
		
		this.information = new Information(this)
			.setChildOf(this.tabContents)

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
			.setMargin(Yoga.EDGE_TOP, "1%")
			.setChildOf(this)
		
		this.browseMods = new BrowseMods(this)
			.setChildOf(this.buttonGroup)
		
		this.refreshMods = new RefreshMods(this)
			.setChildOf(this.buttonGroup)
		
		this.createMod = new CreateMod(this)
			.setChildOf(this.buttonGroup)
		
		this.cancelButton = new CancelButton(this)
			.setChildOf(this.buttonGroup)

		// Controller setup.
		this.browseMods.setRightNext(this.cancelButton)
		this.refreshMods.setRightNext(this.createMod)
		this.createMod.setRightNext(this.cancelButton)
		this.createMod.setLeftNext(this.refreshMods)

		// Add subscribed mod entries.
		this.steamWorkshopEntries = []
		for (let i = 0; i < 10; i++)
			this.steamWorkshopEntries.push (
				new ModEntry(i, this)
					.setTopNext(i > 1 ? this.steamWorkshopEntries[this.steamWorkshopEntries.length - 1] : null)
					.setChildOf(this.tabContents_1)
			)
		
		// Add local mod entries.
		this.localModEntries = []
		for (let i = 0; i < 10; i++)
			this.localModEntries.push (
				new ModEntry(i, this)
					.setTopNext(i > 1 ? this.localModEntries[this.localModEntries.length - 1] : null)
					.setChildOf(this.tabContents_2)
			)

		this.tween = new Tween(this, Easing.Exponential)
		this.currentTab = 0
		this.currentPage = [0, 0]
		this.maxPages = [0, 0]
		this.tabButton_1.text.setText(localize("steam_workshop_txt"))
		this.tabButton_2.text.setText(localize("local_mods_txt"))
		this.paginator.refresh()
		return this
	}

	testValidity(increment)
	{
		let nextTab = this.currentTab + increment
		return nextTab >= 0 && nextTab < 2
	}

	tabsChange(increment = 0)
	{
		this.tabSelect(this.currentTab + increment)
	}

	tabSelect(tabNumber)
	{
		if (this.currentTab != tabNumber && tabNumber >= 0 && tabNumber < 2)
		{
			this.currentTab = tabNumber
			this.refresh()
		}
	}

	createNewMod(baseLanguage)
	{
		if (!baseLanguage) return
		const newModName = "new_mod_" + Date.now()
		createModTemplate(newModName, baseLanguage)
			.then(() => {
				this.refresh()
				reloadMods()
			})
			.catch((error) => {
				console.error("Failed to create new mod:", error)
			})
	}

	refresh()
	{
		// Hide information panel.
		this.information.hide()

		// Hide all entries first.
		this.tabContents_1.hide()
		this.tabContents_2.hide()
		this.modFolderNotFound.hide()

		// Show entries container based on selection.
		let lastEntryOnPage = null
		switch (this.currentTab)
		{
			// Steam Workshop tab.
			case 0:

				// Reset buttons.
				lastEntryOnPage = null
				this.cancelButton.setTopNext(lastEntryOnPage)
				this.browseMods.setTopNext(lastEntryOnPage)

				// Update list.
				listSubscribedItems().then((subscribedItems) => {

					// Update max pages.
					this.maxPages[0] = Math.ceil(subscribedItems.length / 9)

					// Populate mod entries list.
					for (let i = 0; i < 9; i++)
					{
						const entry = this.steamWorkshopEntries[i + 1]
						const modIndex = i + this.currentPage[0] * 9
						if (modIndex < subscribedItems.length)
						{
							const item = subscribedItems[modIndex]
							entry.setContent(item.title, item)
							if (i > 0) this.steamWorkshopEntries[i].setBottomNext(entry)
							lastEntryOnPage = entry

							// If the same row on previous tab was controller focus, keep focus on row.
							if (currentFocus && currentFocus == this.localModEntries[i + 1])
							{
								currentFocus.focusEnd()
								this.takeFocus()
							}
						}
						else
						{
							entry.setContent(null, null)
							if (i > 0) this.steamWorkshopEntries[i].setBottomNext(null)

							// If the same row on previous tab was controller focus, move focus elsewhere.
							if (currentFocus && currentFocus == this.localModEntries[i + 1])
							{
								currentFocus.focusEnd();
								(lastEntryOnPage || this.cancelButton).takeFocus()
							}
						}
					}

					// Show entries.
					this.tabContents_1.show()

					// Update buttons.
					if (lastEntryOnPage)
					{
						lastEntryOnPage.setBottomNext(this.browseMods)
						this.cancelButton.setTopNext(lastEntryOnPage)
						this.browseMods.setTopNext(lastEntryOnPage)
					}
				})

				// Show/hide UI widgets.
				this.tabButton_1.select()
				this.tabButton_2.unselect()
				this.createMod.hide()
				this.refreshMods.hide()
				this.browseMods.show()

				// Update buttons.
				this.cancelButton.setLeftNext(this.browseMods)
				if (currentFocus && (currentFocus == this.createMod || currentFocus == this.refreshMods))
				{
					currentFocus.focusEnd()
					this.browseMods.takeFocus()
				}
				break
			
			// Local mods tab.
			case 1:

				// Reset buttons.
				lastEntryOnPage = null
				this.cancelButton.setTopNext(lastEntryOnPage)
				this.refreshMods.setTopNext(lastEntryOnPage)
				this.createMod.setTopNext(lastEntryOnPage)

				// Update list.
				listLocalMods().then((localMods) => {

					// Report mod folder not found.
					if (!localMods)
					{
						this.modFolderNotFound.show()
						return
					}

					// Update max pages.
					this.maxPages[1] = Math.ceil(localMods.length / 9)

					// Populate mod entries list.
					for (let i = 0; i < 9; i++)
					{
						const entry = this.localModEntries[i + 1]
						const modIndex = i + this.currentPage[1] * 9
						if (modIndex < localMods.length)
						{
							const item = localMods[modIndex]
							entry.setContent(item.title, item, true)
							if (i > 0) this.localModEntries[i].setBottomNext(entry)
							lastEntryOnPage = entry
						
							// If the same row on previous tab was controller focus, keep focus on row.
							if (currentFocus && currentFocus == this.steamWorkshopEntries[i + 1])
							{
								currentFocus.focusEnd()
								this.takeFocus()
							}
						}
						else
						{
							entry.setContent(null, null)
							if (i > 0) this.localModEntries[i].setBottomNext(null)

							// If the same row on previous tab was controller focus, move focus elsewhere.
							if (currentFocus && currentFocus == this.steamWorkshopEntries[i + 1])
							{
								currentFocus.focusEnd();
								(lastEntryOnPage || this.cancelButton).takeFocus()
							}
						}
					}

					// Show entries.
					this.tabContents_2.show()

					// Update buttons.
					if (lastEntryOnPage)
					{
						lastEntryOnPage.setBottomNext(this.refreshMods)
						this.cancelButton.setTopNext(lastEntryOnPage)
						this.refreshMods.setTopNext(lastEntryOnPage)
						this.createMod.setTopNext(lastEntryOnPage)
					}
				})

				// Show/hide UI widgets.
				this.tabButton_1.unselect()
				this.tabButton_2.select()
				this.refreshMods.show()
				this.createMod.show()
				this.browseMods.hide()

				// Update buttons.
				this.cancelButton.setLeftNext(this.createMod)
				if (currentFocus && currentFocus == this.browseMods)
				{
					this.browseMods.focusEnd()
					this.createMod.takeFocus()
				}
				break
		}
	}

	startIntro(startingTab = 0, information = null)
	{
		this.currentTab = startingTab
		this.refresh()
		this.setAnimating(true)
		return new Promise((resolve) => {
			this.tween.easeOut({animYOffset: 0}, 20)
				.then(() => {
					this.setAnimating(false)
					if (information)
					{
						this.information.informationHeader.setText(localize(information))
						this.information.informationSubtext.setText(localize(`${information}_subtext`))
						this.information.show()
					}
					resolve()
			})
		})
	}

	startExtro()
	{
		this.setAnimating(true)
		return new Promise(resolve => {
			this.tween.easeIn({animYOffset: -(this.getComputedTop() + this.getComputedHeight())}, 20)
				.then(() => {
					this.setAnimating(false)
					resolve()
				})
		})
	}
}

class TabButton extends Button
{
	constructor(parent, index)
	{
		super()
			.setWidth("45%")
			.setHeight("100%")
			.setMargin(Yoga.EDGE_HORIZONTAL, "1%")
			.setRenderMode(renderMode.colorRounded)
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setTexture(midGray)

		this.text = new Text()
			.setWidth("100%")
			.setFont(regularFontUI())
			.setTextAlign(textAlign.center)
			.setColor(paleYellow)
			.setChildOf(this)
		
		this.parent = parent
		this.index = index
	}

	select()
	{
		this.setTexture(midGray)
		this.text.setColor(paleYellow)
	}

	unselect()
	{
		this.setTexture(null)
		this.text.setColor(midGray)
	}

	pressMouseLeftStart()
	{
		this.parent.tabSelect(this.index)
	}
}

class Information extends Node
{
	constructor(parent)
	{
		super()
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setWidth("100%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setRenderMode(renderMode.color)
			.setTexture(bgColor)
		
		this.informationPanel = new Node()
			.setWidth("70%")
			.setHeight("90%")
			.setRenderMode(renderMode.colorRounded)
			.setTexture(paleYellow)
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this)
		
		this.informationHeader = new Text()
			.setWidth("100%")
			.setText(localize("mod_created"))
			.setFont(titleFontUI())
			.setColor(midGray)
			.setTextAlign(textAlign.center)
			.setChildOf(this.informationPanel)
		
		this.informationSubtext = new Text()
			.setWidth("100%")
			.setText(localize("mod_created_subtext"))
			.setMargin(Yoga.EDGE_TOP, "5%")
			.setColor(midGray)
			.setTextAlign(textAlign.center)
			.setFont(regularFontUI())
			.setPadding(Yoga.EDGE_HORIZONTAL, "3%")
			.setChildOf(this.informationPanel)
		
		this.informationPanelOKButton = new InformationPanelOKButton(parent)
			.setChildOf(this.informationPanel)
	}
}

class InformationPanelOKButton extends Button
{
	constructor(parent)
	{
		super()
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("30%")
			.setMargin(Yoga.EDGE_TOP, "5%")
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(5))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setDefault()
			.setHeight(regularFontUI().height + scalePix(25))
		
		this.text = new Text()
			.setColor(paleYellow)
			.setFont(regularFontUI())
			.setText(localize("confirm_text"))
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
		this.parent.information.hide()
	}
}

class BaseWorkshopButton extends Button
{
	constructor(parent)
	{
		super()
		this.parent = parent
		return this
	}
	pressShoulderButtonLeftStart()
	{
		if (this.parent.testValidity(-1))
			this.parent.tabSelect(this.parent.currentTab - 1)
	}
	pressShoulderButtonRightStart()
	{
		if (this.parent.testValidity(1))
			this.parent.tabSelect(this.parent.currentTab + 1)
	}
	pressShoulderTriggerLeftStart()
	{

	}
	pressShoulderTriggerRightStart()
	{

	}
}

class BrowseMods extends BaseWorkshopButton
{
	constructor(parent)
	{
		super(parent)
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("20%")
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(5))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setHeight(regularFontUI().height + scalePix(25))
		
		this.text = new Text()
			.setColor(paleYellow)
			.setFont(regularFontUI())
			.setText(localize("browse_mods_txt"))
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setChildOf(this)

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
		if (steamEnabled && ISteamUtils.IsOverlayEnabled())
			ISteamFriends.ActivateGameOverlayToWebPage(
				"https://steamcommunity.com/workshop/browse/?appid=2400160&browsesort=trend&section=readytouseitems",
				EActivateGameOverlayToWebPageMode.k_EActivateGameOverlayToWebPageMode_Modal
			)
		else Sphere.openURL(`https://steamcommunity.com/workshop/browse/?appid=2400160&browsesort=trend&section=readytouseitems`)
	}
}

class CreateMod extends BaseWorkshopButton
{
	constructor(parent)
	{
		super(parent)
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("20%")
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(5))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setHeight(regularFontUI().height + scalePix(25))
		
		this.text = new Text()
			.setColor(paleYellow)
			.setFont(regularFontUI())
			.setText(localize("create_mod_txt"))
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setChildOf(this)

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
		this.parent.getParent().baseLanguageSelect.startIntro()
	}
}

class RefreshMods extends BaseWorkshopButton
{
	constructor(parent)
	{
		super(parent)
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("20%")
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(5))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setHeight(regularFontUI().height + scalePix(25))
		
		this.text = new Text()
			.setColor(paleYellow)
			.setFont(regularFontUI())
			.setText(localize("refresh_mod_txt"))
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setChildOf(this)

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
		reloadMods()
	}
}

class CancelButton extends BaseWorkshopButton
{
	constructor(parent)
	{
		super(parent)
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("20%")
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(5))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setHeight(regularFontUI().height + scalePix(25))
			.setDefault()
		
		this.text = new Text()
			.setColor(paleYellow)
			.setFont(regularFontUI())
			.setText(localize("cancel_text"))
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setChildOf(this)

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
		this.parent.getParent().startExtro()
		ui.main_menu.options.refresh()
	}
}

export class TabChangeButton extends Node
{
    constructor(direction, validityCheck, action)
    {
		// Base class.
        super()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)

		// Variables.
		this.direction = direction
		this.action = action
		this.validityCheck = validityCheck

		// Keyboard.
		this.keyboard = new Node()
			.setRenderMode(renderMode.colorRounded)
			.setWidth(typingFont.height + 30)
			.setHeight(typingFont.height + 10)
			.setTexture(midGray)
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setChildOf(this)
			.hide()

		this.keyboardText = new Text()
			.setColor(paleYellow)
			.setWidth("100%")
			.setHeight(typingFont.height)
			.setFont(typingFont)
			.setTextAlign(textAlign.center)
			.setText(direction < 0 ? "Q" : "W")
			.setChildOf(this.keyboard)
		
		// Controller.
		this.controller = new Node()
			.setWidth("100%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
            .setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setChildOf(this)
			.hide()

		this.controllerText = new Text()
			.setFont(quicktimeFont)
			.setColor(midGray)
			.setHeight(quicktimeFont.height)
			.setWidth("100%")
			.setTextAlign(textAlign.center)
			.setText(getQuickTimeString([direction < 0 ? shoulder_button_left : shoulder_button_right]))
			.setChildOf(this.controller)
    }

	isValid()
	{
		return this.validityCheck(this.direction)
	}

	refresh()
	{
		// Enable/Disable button based on validity check.
		this.keyboard.setTexture(this.isValid() ? midGray : midGray.fadeTo(.5))
		this.controllerText.setColor(this.isValid ? midGray : midGray.fadeTo(.5))

		// Hide/show parts depending on control scheme.
		if (usingController)
		{
			this.keyboard.hide()
			this.controllerText.setText(getQuickTimeString([this.direction < 0 ? shoulder_button_left : shoulder_button_right]))
			this.controller.show()
		}
		else if (keyboardArrows)
		{
			this.keyboard.show()
			this.controller.hide()
		}
		else // Mouse
		{
			this.keyboard.hide()
			this.controller.hide()
		}
	}

	update()
	{
		if (
			!this.hidden &&
			(
				(usingController && this.controller.hidden) ||
				(keyboardArrows && this.keyboard.hidden)
			)
		)
			this.refresh()
	}
}

class ModEntry extends BaseWorkshopButton
{
	constructor(index, parent)
	{
		const isOdd = index % 2 > 0
		super(parent)
			.setRenderMode(renderMode.color)
			.setTexture(isOdd ? midGray.fadeTo(.1) : null)
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setWidth("100%")
			.setHeight("11%")

		this.content = new Node()
			.setWidth("100%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setChildOf(this)

		if (index == 0)
			this.active = new Text()
				.setFont(regularFontUI())
				.setText(index == 0 ? localize("mod_active_txt") : "")
				.setTextAlign(textAlign.center)
				.setColor(midGray)
				.setWidth("10%")
				.setChildOf(this.content)
		else
			this.activeIcon = new ModActiveButton(this)
				.setChildOf(this.content)

		this.name = new Text()
			.setFont(regularFontUI())
			.setText(index == 0 ? localize("mod_name_txt") : "")
			.setColor(midGray)
			.setWidth("60%")
			.setChildOf(this.content)

		this.status = new Text()
			.setFont(regularFontUI())
			.setText(index == 0 ? localize("mod_status_txt") : "")
			.setColor(midGray)
			.setWidth("30%")
			.setChildOf(this.content)
		
		this.uploadButton = new ModUploadButton(this)
			.setChildOf(this.content)
			.hide()
		
		this.isOdd = isOdd
		this.index = index
		this.ignoreMouse = true
	}

	focusStart()
	{
		this.setTexture(midGray.fadeTo(.3))
	}

	focusEnd()
	{
		this.setTexture(this.isOdd ? midGray.fadeTo(.1) : null)
	}

	clear()
	{
		if (this.index > 0)
		{
			this.active.setText("")
			this.name.setText("")
			this.status.hide()
			this.activeIcon.show()
		}
	}

	guessLanguageAndSetFont(name)
	{
		let lang = guessLanguage(name)
		switch(lang)
		{
			case "japanese": this.name.setFont(regularJapanese); return
			case "schinese": case "tchinese": case "koreana": this.name.setFont(regularEastAsian); return
			default: this.name.setFont(typingFont); return
		}
	}

	setContent(name = null, mod = null, showUploadButton = false, status = "mod_status_active_txt")
	{
		if (this.index == 0) return		
		this.mod = mod
		this.guessLanguageAndSetFont(name ? name : "english")
		this.name.setText(name ? name : "")
		this.status.setText(status ? localize(status) : "")
		this.uploadButton[name && showUploadButton ? "show" : "hide"]()
		this.content[name ? "show" : "hide"]()
		if (mod) {
			this.activeIcon.active = modOptions.getActive(mod.id)
			this.activeIcon.focusEnd()
		}
	}

	pressButtonBottomStart()
	{
		this.activeIcon.interact()
	}
}

class ModUploadButton extends Button
{
	constructor(parent)
	{
		super()
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setPosition(Yoga.EDGE_RIGHT, "35%")
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setWidth("8%")
			.setHeight("80%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
		
		this.text = new Text()
			.setColor(paleYellow)
			.setFont(interfaceIconsSmall)
			.setText("A")
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
		this.parent.status.setText(localize("mod_status_uploading_txt"))
		uploadMod(this.parent.mod.folder)
			.then(() => {
			// Show result.
			const info = this.parent.parent.information
			info.informationHeader.setText(localize("mod_submit_success"))
			info.informationSubtext.setText(localize("mod_submit_success_subtext"))
		})
		.catch((error) => {
			console.error("Failed to upload mod:", error)
			// Show result.
			const info = this.parent.parent.information
			info.informationHeader.setText(localize("mod_submit_failed"))
			info.informationSubtext.setText(localize("mod_submit_failed_subtext"))
		})
		.finally(() => {
			const info = this.parent.parent.information
			info.show()
			this.parent.status.setText(localize("mod_status_active_txt"))
		})
	}
}

class ModActiveButton extends Button
{
	constructor(parent)
	{
		super()
			.setWidth("10%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
		
		this.activeIcon = new Text()
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setFont(titleEastAsianSmall)
			.setTextAlign(textAlign.center)
			.setColor(midGray.fadeTo(.5))
			.setText("◇")
			.setChildOf(this)
		
		this.active = false
		this.parent = parent
		return this
	}

	focusStart()
	{
		this.activeIcon.setColor (
			usingController || keyboardArrows ?
				midGray.fadeTo(this.active ? 1 : .5) :
				secondColor
		)
		this.activeIcon.setText(this.active ? "◈" : "◇")
	}

	focusEnd()
	{
		this.activeIcon.setColor(midGray.fadeTo(this.active ? 1 : .5))
		this.activeIcon.setText(this.active ? "◈" : "◇")
	}

	pressMouseLeftStart() { this.interact() }
	pressButtonBottomStart() { this.interact() }
	interact()
	{
		this.active = !this.active
		this.focusStart()
		modOptions.setActive(this.parent.mod.id, this.active)
		modOptions.save()
		reloadMods()
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
	}
	refresh()
	{
		if (this.parent.maxPages[this.parent.currentTab] == 0)
			this.hide()
		else
		{
			this.show()
			this.varCount.setText(`${localize("page")} ${this.parent.currentPage[this.parent.currentTab] + 1} / ${this.parent.maxPages[this.parent.currentTab] + 1}`)
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

	isFirstPage() { return this.parent.currentPage[this.parent.currentTab] <= 0 }
	isLastPage() { return this.parent.currentPage[this.parent.currentTab] >= this.parent.maxPages[this.parent.currentTab] }

	changeVariable(increment)
	{
		if ((increment > 0 && !this.isLastPage()) || (increment < 0 && !this.isFirstPage()))
		{
			this.parent.currentPage += increment
			this.parent.refresh()
		}
	}
}

class BaseLanguageSelect extends LanguageSelect
{
	constructor(parent)
	{
		super()
			.setTexture(null)
		this.parent = parent
		this.gameOrUI = true
		this.onlyOfficialLanguages = true
		this.useConfirmButton = true
	}
	
	startIntro()
	{
		// Populate with typing languages.
		this.populate()

		// Set title.
		this.panel.titleGroup.setText(localize("select_base_language"))

		// Set visble and start animating.
		this.setAnimating(true)
		control.suspend(true)
		this.animYOffset = this.getComputedHeight()
		this.show()

		// Animate current panel out.
		this.parent.panel.startExtro()
			.then(() => {
				this.parent.panel.hide()
				this.tween.easeOut({animYOffset: 0}, 20)
			
				// Then, animate this panel in.
				.then(() => {
					control.suspend(false)
					this.setAnimating(false)
				})
			})
	}

	startExtro(selectedLang = null)
	{
		// Create new mod based on selected language.
		if (selectedLang)
			this.parent.panel.createNewMod(selectedLang)

		// Animate this panel out.
		this.setAnimating(true)
		control.suspend(true)
		this.tween.easeIn({animYOffset: this.getComputedHeight()}, 20)

			// Animate local mods panel back.
			.then(() => {
				this.hide()
				this.parent.panel.show()
				this.parent.panel.startIntro(1, selectedLang ? "mod_created" : null)
					.then(() => {
						this.parent.panel.createMod.takeFocus()
						control.suspend(false)
						this.setAnimating(false)
					})
			})
	}
}
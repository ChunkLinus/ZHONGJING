import { Task, Yoga, Tween, Easing } from 'sphere-runtime'
import { LootItems } from '../data/lootItems.js'
import { saveGame } from './loader.js'
import { DefineShapes } from './shapes.js'

// Import UI definitions.
import { UIDef } from '../ui/uiDefinitions.js'
import { VisualThemes } from '../data/visualTheme.js'

(function()
{
	// Define font loading function.
	global.loadFonts = async function()
	{
		// Font loader.
		let loadFont = async function(fontObject) {
			let fontExists = await File.exists(`@/fonts/${fontObject.font}`)
			if (!fontExists) { console.log(`Font ${fontObject.font} does not exist in the fonts folder.`); return }
			return await Font.fromFile (
				`@/fonts/${fontObject.font}`,
				scalePix(fontObject.size || 30),
				{
					antialias: true,
					webglScale: fontObject.webglScale || 1,
					webglHeightScale: fontObject.webglHeightScale || 1
				}
			)
		}

		// Load icon fonts.
		global.pickupIcons = await Font.fromFile('@/fonts/Pickup-Icons-Glyphica.ttf', scalePix(30), {antialias: true})
		global.pickupIconsLarge = await Font.fromFile('@/fonts/Pickup-Icons-Glyphica.ttf', scalePix(50), {antialias: true})
		global.interfaceIconsSmall = await Font.fromFile('@/fonts/Interface-Icons.ttf', scalePix(15), {antialias: true})
		global.interfaceIcons = await Font.fromFile('@/fonts/Interface-Icons.ttf', scalePix(30), {antialias: true})
		global.interfaceIconsMedium = await Font.fromFile('@/fonts/Interface-Icons.ttf', scalePix(70), {antialias: true})
		global.interfaceIconsLarge = await Font.fromFile('@/fonts/Interface-Icons.ttf', scalePix(120), {antialias: true})
		global.interfaceIconsLarger = await Font.fromFile('@/fonts/Interface-Icons.ttf', scalePix(200), {antialias: true})
		global.interfaceIconsExtraLarge = await Font.fromFile('@/fonts/Interface-Icons.ttf', scalePix(500), {antialias: true})
		global.quicktimeFontSmall = await Font.fromFile('@/fonts/SourceCodeProGlyphica.ttf', scalePix(35), {antialias: true})
		global.quicktimeFont = await Font.fromFile('@/fonts/SourceCodeProGlyphica.ttf', scalePix(55), {antialias: true})
		global.quicktimeFontLarge = await Font.fromFile('@/fonts/SourceCodeProGlyphica.ttf', scalePix(65), {antialias: true})
		global.titleIcons = await Font.fromFile('@/fonts/Title-Icons-Glyphica.ttf', scalePix(55), {antialias: true})
		global.titleIconsLarge = await Font.fromFile('@/fonts/Title-Icons-Glyphica.ttf', scalePix(65), {antialias: true, webglHeightScale: 1.2})
		global.titleIconsExtraLarge = await Font.fromFile('@/fonts/Title-Icons-Glyphica.ttf', scalePix(250), {antialias: true, webglHeightScale: 1.2})
		global.lootIcons = await Font.fromFile('@/fonts/Loot-Icons-Glyphica.ttf', scalePix(100), {antialias: true, webglHeightScale: 1.2})
		global.evolutionIcons = await Font.fromFile('@/fonts/Evolution-Icons-Glyphica.ttf', scalePix(200), {antialias: true, webglHeightScale: 1.3, webglYOffset: 25 })

		let themes = VisualThemes()
		let theme = visualTheme in themes ? themes[visualTheme] : themes.theme_light_mode

		// Non-localized fonts.		
		global.timerFont = await loadFont(theme.timerFont || themes.theme_light_mode.timerFont)
		global.critFont = await loadFont(theme.critFont || themes.theme_light_mode.critFont)
		global.typingFontLarge = await loadFont(theme.typingFontLarge || themes.theme_light_mode.typingFontLarge)
		global.regularEastAsianLarge = await loadFont(theme.regularEastAsianLarge || themes.theme_light_mode.regularEastAsianLarge)

		// Localized fonts.
		// English
		global.typingFont = await loadFont(theme.typingFont || themes.theme_light_mode.typingFont)
		global.typingFontMedium = await loadFont(theme.typingFontMedium || themes.theme_light_mode.typingFontMedium)
		global.typingFontSmall = await loadFont(theme.typingFontSmall || themes.theme_light_mode.typingFontSmall)
		global.grandRegular = await loadFont(theme.grandRegular || themes.theme_light_mode.grandRegular)
		global.grandRegularSmall = await loadFont(theme.grandRegularSmall || themes.theme_light_mode.grandRegularSmall)

		// East Asian (Korean, Simplified Chinese, Traditional Chinese)
		global.regularEastAsian = await loadFont(theme.regularEastAsian || themes.theme_light_mode.regularEastAsian)
		global.regularEastAsianMedium = await loadFont(theme.regularEastAsianMedium || themes.theme_light_mode.regularEastAsianMedium)
		global.regularEastAsianSmall = await loadFont(theme.regularEastAsianSmall || themes.theme_light_mode.regularEastAsianSmall)
		global.regularEastAsianExtraSmall = await loadFont(theme.regularEastAsianExtraSmall || themes.theme_light_mode.regularEastAsianExtraSmall)
		global.titleEastAsian = await loadFont(theme.titleEastAsian || themes.theme_light_mode.titleEastAsian)
		global.titleEastAsianSmall = await loadFont(theme.titleEastAsianSmall || themes.theme_light_mode.titleEastAsianSmall)

		// Japanese.
		global.regularJapanese = await loadFont(theme.regularJapanese || themes.theme_light_mode.regularJapanese)
		global.regularJapaneseMedium = await loadFont(theme.regularJapaneseMedium || themes.theme_light_mode.regularJapaneseMedium)
		global.regularJapaneseSmall = await loadFont(theme.regularJapaneseSmall || themes.theme_light_mode.regularJapaneseSmall)
		global.titleJapanese = await loadFont(theme.titleJapanese || themes.theme_light_mode.titleJapanese)
		global.titleJapaneseSmall = await loadFont(theme.titleJapaneseSmall || themes.theme_light_mode.titleJapaneseSmall)

		// Cyrillic.
		global.titleCyrillic = await loadFont(theme.titleCyrillic || themes.theme_light_mode.titleCyrillic)
		global.titleCyrillicSmall = await loadFont(theme.titleCyrillicSmall || themes.theme_light_mode.titleCyrillicSmall)
	}
})()

export class Interface extends Task {
	constructor()
	{
		// Superclass constructor.
		super({priority: 100})

		// Create base Yoga-layout instance.
		this.node = null
		this.hudNode = null
		this.nodeActive = null
		this.hudNodeActive = null
		this.inGameWordOpacity = 1

		// Refresh sprites based on current theme.
		this.refreshUI()

		this.inGameWordOpacityTween = new Tween(this, Easing.Linear)

		// Backdrop renderer.
		this.backdropRenderer = new (class extends Task {
			constructor(parent) { super(); this.parent = parent }
			on_render() { this.parent.bgSprite.draw(Surface.Screen) }
		}) (this)
		this.backdropRenderer.start()

		// HUD state tracking.
		this.queuedHudAnims = []
		this.hudState = 0
		this.hudTopVisible = false
		this.hudBottomVisible = false
		this.hintsVisible = false

		// Steam specific stuff.
		if (steamEnabled)
		{
			// Register listener for Steam Overlay.
			callback.addListener("GameOverlayActivated", this.steamOverlay)

			// Show announcement on Steam Community if it's newer than last announcement read.
			if (!("firstLevelUpDone" in save))
			{
				// Skip announcement on first run cause bad UX.
				save.lastAnnouncementRead = latestAnnouncement
				saveGame()
			}
			else if (!("lastAnnouncementRead" in save) || save.lastAnnouncementRead < latestAnnouncement)
			{
				save.lastAnnouncementRead = latestAnnouncement
				ISteamFriends.ActivateGameOverlayToWebPage(
					latestAnnouncementLink,
					EActivateGameOverlayToWebPageMode.k_EActivateGameOverlayToWebPageMode_Modal
				)
				saveGame()
			}
		}

		// Start event loop.
		this.start()
	}

	updateNode(node) {
		for (let i = 0; i < node.getChildCount(); i++) {
			let child = node.getChild(i)
			if (!child.hidden)
			{
				child.update()
				child.updateChildren()
				// If any nodes are dirtied, re-calculate layout.
				if (child.checkIfDirtied())
				{
					this.calculateNodeLayout(node)
					break
				}
			}
		}
	}

	on_update() {
		if (this.hudNodeActive)
			this.updateNode(this.hudNodeActive)
		if (this.mainMenuNodeActive)
			this.updateNode(this.mainMenuNodeActive)
		if (this.nodeActive)
			this.updateNode(this.nodeActive)

		Mouse.Default.clearQueue()
	}

	refreshUI(fastForwardToOptionsCategory = null)
	{
		// Refresh theme.
		this.refreshTheme()

		const createBaseNode = function()
		{
			let node = Yoga.Node.create()
			node.setWidth("100%")
			node.setHeight("100%")
			return node
		}
		// Init all UI definitions.
		this.node = createBaseNode()
		this.hudNode = createBaseNode()
		this.mainMenuNode = createBaseNode()
		UIDef.initAll(this)

		// Update timer fixed spacing.
		this.hud.top.hud_time.refreshSpacing()

		// If fast forward to options category requested.
		if (fastForwardToOptionsCategory != null)
		{
			this.title_screen.hide()
			this.showMainMenu(true)
			this.main_menu.left.changeContext(this.main_menu.left.main_menu_buttons[0])
			this.main_menu.left.changeContext(this.main_menu.left.main_menu_buttons[2])
			this.main_menu.options.currentCategory = fastForwardToOptionsCategory
			this.main_menu.options.refresh()
			this.main_menu.left.main_menu_buttons[2].focusEnd()
		}

		// If not demo, hide demo disclaimer.
		if (!demo) this.demo_disclaimer.hide()

		// Calculate new layout.
		let calcLayout = function(node)
		{
			return new Promise(resolve => {
				node.calculateLayout(Surface.Screen.width, Surface.Screen.height, Yoga.DIRECTION_LTR)
				Sphere.sleep(1).then(() => {
					let dirtied = false
					for (let i = 0; i < node.getChildCount(); i++)
					{
						let child = node.getChild(i)
						child.update()
						child.render(Surface.Screen)
						child.updateChildren()
						if (child.checkIfDirtied())
							dirtied = true
					}
					if (dirtied)
						calcLayout(node).then(() => resolve())
					else resolve()
				})
			})
		}

		// Once layout is finalized, swap active layout for new one.
		return Promise.all([
			calcLayout(this.node).then(() => {
				this.nodeActive = this.node
			}),
			calcLayout(this.hudNode).then(() => {
				this.hudNodeActive = this.hudNode
			}),
			calcLayout(this.mainMenuNode).then(() => {
				this.mainMenuNodeActive = this.mainMenuNode
			})
		])
	}

	refreshTheme()
	{
		// Create background function.
		let createBG = function(spriteName)
		{
			return new Shape(ShapeType.Fan, getSprite(spriteName), new VertexList(
				[
					{x: 0, y: 0, u: 1, v: 1},
					{x: Surface.Screen.width, y: 0, u: 0, v: 1},
					{x: Surface.Screen.width, y: Surface.Screen.height, u: 0, v: 0},
					{x: 0, y: Surface.Screen.height, u: 1, v: 0}
				]
			))
		}

		// Grab current theme. (Silent fallback to light mode if not found)
		let themes = VisualThemes()
		let theme = VisualThemes()[visualTheme in themes ? visualTheme : "theme_light_mode"]

		// Apply theme. (Silent fallback to light mode if not found)
		this.bgSprite = createBG("background" in theme && theme.background in sprites ? theme.background : themes.theme_light_mode.background)
		global.paleYellow = theme.paleYellow 			|| themes.theme_light_mode.paleYellow
		global.midGray = theme.midGray 					|| themes.theme_light_mode.midGray
		global.darkGray = theme.darkGray 				|| themes.theme_light_mode.darkGray
		global.darkestGray = theme.darkestGray 			|| themes.theme_light_mode.darkestGray
		global.bgColor = theme.bgColor 					|| themes.theme_light_mode.bgColor
		global.bgColorOpaque = theme.bgColorOpaque 		|| themes.theme_light_mode.bgColorOpaque
		global.absoluteMidGray = theme.absoluteMidGray 	|| themes.theme_light_mode.absoluteMidGray
		global.secondColor = theme.secondColor 			|| themes.theme_light_mode.secondColor
		global.secondColorDark = theme.secondColorDark 	|| themes.theme_light_mode.secondColorDark
		global.runInfoBG = theme.runInfoBG				|| themes.theme_light_mode.runInfoBG
		global.runInfoPanel = theme.runInfoPanel		|| themes.theme_light_mode.runInfoPanel
		global.runInfoDialog = theme.runInfoDialog		|| themes.theme_light_mode.runInfoDialog

		// Regenerate shapes.
		while (true)
		{
			try {
				DefineShapes()
				break
			}
			catch(e) {}
		}
	}

	updateButtonLabels()
	{
		if (!ui.weaponDetail.hidden)
		{
			ui.weaponDetail.refreshInstructions()
			ui.weaponDetail.modifiersPaginator.refresh()
			ui.weaponDetail.sectionSelectLeft.refresh()
			ui.weaponDetail.sectionSelectRight.refresh()
			ui.weaponDetail.bottomPaginatorLeftArrow.refresh()
			ui.weaponDetail.bottomPaginatorRightArrow.refresh()
		}
		if (!ui.omenSelect.hidden)
		{
			ui.omenSelect.panel.refresh()
			ui.omenSelect.augmentSelectPanel.refresh()
		}
		if (!ui.main_menu.augments.hidden)
			ui.main_menu.augments.refresh()
	}

	steamOverlay(data)
	{
		if (data.m_bActive > 0
			&& currentScreen == game
			&& !isPaused()
		)
			ui.pauseMenu.startIntro()
	}

	disableAllTurretButtons(disable = true)
	{
		for (const button of this.main_menu.turrets.turrets)
			button.disabled = disable
	}

	disableAllMainMenuButtons(disable = true)
	{
		for (const button of this.main_menu.left.main_menu_buttons)
			button.disabled = disable
	}

	renderNode(node)
	{
		for (let i = 0; i < node.getChildCount(); i++)
			node.getChild(i).render(Surface.Screen)
	}

	on_render()
	{
		// Draw yoga-layout nodes.
		if (this.hudNodeActive)
			this.renderNode(this.hudNodeActive)
		if (this.mainMenuNodeActive)
			this.renderNode(this.mainMenuNodeActive)
		if (this.nodeActive)
			this.renderNode(this.nodeActive)
	}

	calculateNodeLayout(node)
	{
		node.calculateLayout(Surface.Screen.width, Surface.Screen.height, Yoga.DIRECTION_LTR)
	}

	calculateLayout()
	{
		this.calculateNodeLayout(this.hudNode)
		this.calculateNodeLayout(this.mainMenuNode)
		this.calculateNodeLayout(this.node)
	}

	getUIDefinitions()
	{
		return UIDef
	}

	showMainMenu(skipIntro = false)
	{
		this.main_menu.show()
		if (skipIntro)
		{
			this.main_menu.left.skipIntro()
			this.main_menu.logo.skipIntro()
		}
		else
		{
			currentFocus = null
			this.main_menu.left.startIntro()
			this.main_menu.logo.startIntro()
		}
	}

	generateLoot(bossLoot)
	{
		let allLoot = LootItems().filter(loot => loot.requirementsMet)
		let inventory = []
		for (let i = 0; i < 3 + ("item_plunder" in serializedLoot); i++)
		{
			// If no more loot left, stop generating.
			if (allLoot.length <= 0) break

			// If less than 3 valid loot available, trigger low-loot mode.
			if (allLoot.length <= 3)
			{
				console.log("Low on loot, enabling low-loot mode.")
				outOfLoot = true
			}

			// Get all loot of a rarity.
			let attempts = 0
			let lootOfRarity
			do {
				let lootRarity = bossLoot ? rarity.rare : weightedRandom(lootWeight, 1)[0].rarity
				lootOfRarity = allLoot.filter(loot => {
					return loot.rarity == lootRarity
						&& !(loot.group && inventory.some(item => item.group && item.group == loot.group))
				})
				attempts++
			}
			while (lootOfRarity.length == 0 && attempts < 1000)

			if (lootOfRarity.length > 0)
			{
				// Get random loot of rarity.
				let randomLoot = weightedRandom(lootOfRarity, 1)[0]
				inventory.push(randomLoot)

				// Remove loot from allLoot.
				allLoot[allLoot.indexOf(randomLoot)] = allLoot[allLoot.length - 1]
				allLoot.pop()
			}
			else break
		}
		return inventory
	}

	showLootUI(bossLoot = false)
	{
		// Pick eligible loot using weighted random.
		let inventory = this.generateLoot(bossLoot)
		if (inventory.length === 0)
			console.error("Warning: Trying to show empty loot")

		else
		{
			// Pause game and clear keylogs.
			pause("loot")
			inUpgradeMenu = true
			Keylog = "************"
			Joylog.fill(null)
			wordsInUse.forEach(v => v[2].updateWordDisplay(2, true))

			// Populate loot options.
			this.lootScreen.lootOptions.forEach((v, i) => {
				if (inventory.length <= i)
					v.hide()
				else
					v.setUpgrade(inventory[i])
			})

			// Update Loot Title.
			this.lootScreen.title.setText(localize("loot_pickup"))

			// Show Loot UI.
			this.lootScreen.startIntro(inventory.length, bossLoot)
		}
	}

	setHUDState(state)
	{
		if (this.hudState != state)
		{
			let promises = []
			this.hudState = state
			switch(state)
			{
				// No HUD.
				case "none":
					if (this.hudTopVisible)
					{
						this.hudTopVisible = false
						promises.push(this.hud.top.startExtro())
					}
					if (this.hudBottomVisible)
					{
						this.hudBottomVisible = false
						promises.push(this.hud.bottom.startExtro())
					}
					if (this.hintsVisible)
					{
						this.hintsVisible = false
						promises.push(this.buttonHints.startExtro())
					}
					break

				// Normal in-game HUD.
				case "game":
					if (!this.hudTopVisible)
					{
						this.hudTopVisible = true
						promises.push(this.hud.top.startIntro())
					}
					if (!this.hudBottomVisible && this.hintsVisible)
					{
						this.hintsVisible = false
						promises.push(new Promise(resolve => {
							this.buttonHints.startExtro()
								.then(() => {
									this.hudBottomVisible = true
									this.hud.bottom.startIntro()
										.then(() => resolve())
								})
						}))
					}
					else if (!this.hudBottomVisible)
					{
						this.hudBottomVisible = true
						promises.push(this.hud.bottom.startIntro())
					}
					else if (this.hintsVisible)
					{
						this.hintsVisible = false
						promises.push(this.buttonHints.startExtro())
					}
					break
				
				// In-game menu HUD.
				case "menu":
				case "end":
					// Top.
					if (state == "menu" && !this.hudTopVisible)
					{
						this.hudTopVisible = true
						promises.push(this.hud.top.startIntro())
					}
					else if (state == "end" && this.hudTopVisible)
					{
						this.hudTopVisible = false
						promises.push(this.hud.top.startExtro())
					}

					// Bottom.
					if (this.hudBottomVisible && !this.hintsVisible)
					{
						this.hudBottomVisible = false
						promises.push(new Promise(resolve => {
							this.hud.bottom.startExtro()
								.then(() => {
									this.hintsVisible = true
									this.buttonHints.startIntro()
										.then(() => resolve())
								})
						}))
					}
					else if (!this.hintsVisible)
					{
						this.hintsVisible = true
						promises.push(this.buttonHints.startIntro())
					}
					else if (this.hudBottomVisible)
					{
						this.hudBottomVisible = false
						promises.push(this.hud.bottom.startExtro())
					}
					break
			}
			return Promise.all(promises)
		}
		else 
		{
			if (state == "menu" || state == "end")
				this.buttonHints.refresh()
			return Promise.resolve()
		}
	}
}
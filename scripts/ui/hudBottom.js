import { Node, Text, Yoga, Easing, Prim } from 'sphere-runtime'
import { FastTween } from '../core/fastTween.js'
import { Consumables } from '../data/consumables.js'
import { QwertyToZhuyin } from '../data/zhuyin.js'

export class HUDBottom extends Node
{
	constructor()
	{
		super()
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setWidth("100%")
			.setHeight("100%")
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN_REVERSE)
			.setAlignItems(Yoga.ALIGN_CENTER)
		
		this.weaponsGrid = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setMargin(Yoga.EDGE_BOTTOM, scalePix(12))
			.setChildOf(this)
		
		this.consumablesGrid = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setMargin(Yoga.EDGE_BOTTOM, scalePix(5))
			.setChildOf(this)
		
		this.weapons = []
		for (let i = 0; i < 5; i++)
			this.weapons.push(new HUDBottomWeapon().setChildOf(this.weaponsGrid))

		this.consumables = []
		for (let i = 0; i < 2; i++)
			this.consumables.push(new HUDBottomConsumable().setChildOf(this.consumablesGrid))
		
		this.evolutionPopUp = new EvolutionPopUp()
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setChildOf(this)
			.hide()	
		
		this.tween = new FastTween()
		
		Sphere.sleep(0).then(() =>
		{
			this.evolutionPopUp.setPosition(
				Yoga.EDGE_TOP,
				this.consumablesGrid.getComputedTop()
					- this.evolutionPopUp.getComputedHeight()
					- scalePix(40)
			)
			this.offscreenOffset = this.weaponsGrid.getComputedHeight()
				+ this.consumablesGrid.getComputedHeight()
				+ scalePix(20)
			this.weaponsGrid.animYOffset
				= this.consumablesGrid.animYOffset
				= this.offscreenOffset
		})
	}
	
	clearWeapons()
	{
		this.weapons.forEach(weapon => weapon.setWeapon(null))
	}

	addUpgrade(weapon)
	{
		let slot = this.getSlot(weapon)
		if (slot) slot.addUpgrade()
	}

	setUpgrade(weapon, count)
	{
		let slot = this.getSlot(weapon)
		if (slot) slot.setUpgrade(count)
	}

	addEvolution(weapon)
	{
		let slot = this.getSlot(weapon)
		if (slot) slot.addEvolution()
	}

	setEvolution(weapon, count)
	{
		let slot = this.getSlot(weapon)
		if (slot) slot.setEvolution(count)
	}

	addWeapon(weapon)
	{
		let slot = this.weapons.find(weap => weap.weaponName == "")
		if (slot) slot.setWeapon(weapon)
	}

	getSlot(weapon)
	{
		let weaponName = typeof weapon == "string" ? weapon : weapon.constructor.name
		return (this.weapons.find(weap => weap.weaponName == weaponName))
	}

	getConsumableSlot()
	{
		return this.consumables.find(consumableSlot => consumableSlot.action == null)
	}

	addConsumable(name, amt)
	{
		let consumable = Consumables.find(consumable => consumable.name == name)
		if (!consumable) return
		let slot = this.consumables.find(consumableSlot => consumableSlot.consumableName === consumable.name) || this.getConsumableSlot()
		if (!slot) return
		slot.setConsumable(consumable, amt)
	}

	startIntro()
	{
		omenLevel < -1 ? this.hide() : this.show()
		return this.tween.easeOut(
			[this.weaponsGrid.animYOffset],
			[0],
			t => this.consumablesGrid.animYOffset = this.weaponsGrid.animYOffset = t[0],
			30
		)
	}

	startExtro()
	{
		return this.tween.easeOut(
			[this.weaponsGrid.animYOffset],
			[this.offscreenOffset],
			t => this.consumablesGrid.animYOffset = this.weaponsGrid.animYOffset = t[0],
			30
		)
	}
}

class HUDBottomConsumable extends Node
{
	constructor()
	{
		super()
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray.fadeTo(.2))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setMargin(Yoga.EDGE_HORIZONTAL, scalePix(3))
			.setWidth(scalePix(142))
			.setHeight(scalePix(50))
		
		this.icon = new Text()
			.setColor(midGray.fadeTo(.2))
			.setFont(pickupIconsLarge)
			.setHeight(pickupIconsLarge.height)
			.setWidth(scalePix(50))
			.setText("¢")
			.setTextAlign(textAlign.center)
			.setChildOf(this)
		
		this.count = new Text()
			.setColor(paleYellow)
			.setFont(typingFontSmall)
			.setHeight(typingFontSmall.height)
			.setWidth(scalePix(20))
			.setTextAlign(textAlign.center)
			.setChildOf(this)
			.hide()

		this.consumableName = ""
		this.action = null
		this.amount = 0
		this.wordOffset = scalePix(35)
	}

	refreshWord()
	{
		if (this.hasOwnProperty('word'))
			removeWord(this)
		addWord(this, false, 4)
		this.updateWordDisplay(2)
	}

	updateWordDisplay(which, clearInactive = false)
	{
		return control.updateWordDisplay(this, which, clearInactive)
	}

	setConsumable(consumable, amt)
	{
		// If increment qty only.
		if (this.action != null)
		{
			if (this.consumableName === consumable.name)
			{
				this.amount += amt
				this.count.setText(`x${this.amount}`)
			}
			return
		}

		// Set name.
		this.consumableName = consumable.name

		// Set background.
		this.setTexture(secondColor)

		// Set icon.
		this.icon.setText(consumable.icon)
		this.icon.setColor(paleYellow)

		// Set count.
		this.amount = amt
		this.count.setText(`x${this.amount}`)
		this.count.show()

		// Set action.
		this.action = consumable.action

		// Get new word.
		this.refreshWord()
	}

	activate()
	{
		// Activate
		this.action()

		// Reduce count.
		if (--this.amount <= 0)
			this.clear()
		else
		{
			this.count.setText(`x${this.amount}`)
			this.refreshWord()
		}
	}

	clear()
	{
		this.consumableName = ""
		this.setTexture(midGray.fadeTo(.2))
		this.icon.setText("¢")
		this.icon.setColor(midGray.fadeTo(.2))
		this.amount = 0
		this.count.hide()
		this.action = null
		removeWord(this)
	}

	getType()
	{
		return type.consumable
	}

	render(surface, xOffset = 0, yOffset = 0)
	{
		// Superclass render.
		super.render(surface, xOffset, yOffset)

		// Print word to screen, if any.
		if (!this.word) return
		let font, word, matchingLetters

		// Exception for Korean.
		if (isGameKorean)
		{
			font = regularEastAsianLarge
			word = this.word
			matchingLetters = this.numMatchingLetters
		}

		// If East Asian primary display.
		else if (isEastAsianPrimaryDisplay)
		{
			font = regularEastAsianLarge
			word = this.word
			matchingLetters = this.numMatchingLetters
		}

		// All other languages.
		else
		{
			font = typingFontLarge
			word = this.variantString
			matchingLetters = this.variantMatches
		}

		// Get position.
		this.position = {
			x: this.getComputedLeft() + xOffset + this.getComputedWidth() / 2,
			y: this.getComputedTop() + yOffset + this.getComputedHeight() / 2,
		}
		
		// Print word.
		this.printToScreen(
			this.position.x,
			this.position.y,
			word,
			matchingLetters,
			font
		)

		// If current game language is Traditional Chinese, also print zhuyin.
		let chinesePhoneticsDisplayHeight = 0
		if (isGameTraditionalChinese && this.displayedPinyin)
		{
			const displayedZhuyin = this.displayedPinyin.split("").map(char => QwertyToZhuyin[char]).join("")
			const zhuyinFont = eastAsianFontGame(fontSize.extraSmall)
			let yPos = this.position.y - this.wordOffset - font.height * .75 - zhuyinFont.height - scalePix(5)
			let xPos = this.position.x - zhuyinFont.widthOf(displayedZhuyin) / 2
			let matchCount = this.variantMatches + Math.floor(this.numMatchingLetters)
			let matchedZhuyin = displayedZhuyin.slice(0, matchCount)
			let unmatchedZhuyin = displayedZhuyin.slice(matchCount)
			zhuyinFont.drawText(Surface.Screen, xPos, yPos, matchedZhuyin, darkGray.fadeTo(ui.inGameWordOpacity))
			zhuyinFont.drawText(Surface.Screen, xPos + zhuyinFont.widthOf(matchedZhuyin), yPos, unmatchedZhuyin, midGray.fadeTo(.5 * ui.inGameWordOpacity))
			chinesePhoneticsDisplayHeight = zhuyinFont.height * .5
		}

		// If current game language is Simplified Chinese, also print pinyin.
		else if (isGameSimplifiedChinese && this.displayedPinyin)
		{
			let yPos = this.position.y - this.wordOffset - font.height * .75 - typingFontMedium.height - scalePix(5)
			let xPos = this.position.x - typingFontMedium.widthOf(this.displayedPinyin) / 2
			let matchCount = this.variantMatches + Math.floor(this.numMatchingLetters)
			let matchedPinyin = this.displayedPinyin.slice(0, matchCount)
			let unmatchedPinyin = this.displayedPinyin.slice(matchCount)
			typingFontMedium.drawText(Surface.Screen, xPos, yPos, matchedPinyin, darkGray.fadeTo(ui.inGameWordOpacity))
			typingFontMedium.drawText(Surface.Screen, xPos + typingFontMedium.widthOf(matchedPinyin), yPos, unmatchedPinyin, midGray.fadeTo(.5 * ui.inGameWordOpacity))
			chinesePhoneticsDisplayHeight = typingFontMedium.height * .5
		}

		// Print secondary text, if any.
		if (this.secondaryText)
			secondaryTextFont.drawText(
				Surface.Screen,
				this.position.x - secondaryTextFont.widthOf(this.secondaryText) / 2,
				this.position.y - this.wordOffset - font.height - secondaryTextFont.height - scalePix(7) - chinesePhoneticsDisplayHeight,
				this.secondaryText,
				midGray.fadeTo(.5 * ui.inGameWordOpacity)
			)
	}

	getPosition()
	{
		return this.position
	}

	printToScreen(x, y, string, matching, font)
	{
		// Get matched and unmatched parts of the string.
		let partialMatch = matching % 1
		matching = partialMatch == 0 ? matching : Math.floor(matching)
		let matchedString = string.slice(0, matching)
		let partialMatchedString = partialMatch > 0 ? string.slice(matching, matching + 1) : ""
		let unmatchedString = string.slice(matching + (partialMatch > 0))

		// Get offsets.
		let wordX = x - font.widthOf(string) / 2
		let wordY = y - this.wordOffset - font.height

		// Print unmatched text onto surface.
		font.drawText(Surface.Screen, wordX + font.widthOf(matchedString + partialMatchedString), wordY, unmatchedString, midGray.fadeTo(.5 * ui.inGameWordOpacity))

		// Print matched text.
		font.drawText(Surface.Screen, wordX, wordY, matchedString, darkGray.fadeTo(ui.inGameWordOpacity))

		// Print partial matched text onto screen.
		if (partialMatch > 0 && this.wordSurface)
			this.drawPartialMatch(wordX, wordY, Math.floor(matching), font, partialMatch, ui.inGameWordOpacity)
	}

	// Draw partially matched character.
	drawPartialMatch(x, y, charIndex, font, perc, opacity)
	{
		let startX = font.widthOf(this.word.slice(0, charIndex))
		let partialCharWidth = font.widthOf(this.word[charIndex])
		let partialMatchWidth = partialCharWidth * perc
		Prim.blitSection(Surface.Screen, x + startX, y, this.wordSurface, startX, 0, partialMatchWidth, font.height, darkGray.fadeTo(opacity))
		Prim.blitSection(Surface.Screen, x + startX + partialMatchWidth, y, this.wordSurface, startX + partialMatchWidth, 0, partialCharWidth - partialMatchWidth, font.height, midGray.fadeTo(.5 * opacity))
	}
}

class HUDBottomWeapon extends Text
{
	constructor()
	{
		super()
			.setFont(titleIconsLarge)
			.setColor(midGray.fadeTo(.5))
			.setText("")
			.setWidth(titleIconsLarge.widthOf(""))
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW_REVERSE)
			.setHeight(titleIconsLarge.height)
		
		this.upgradeBox = new Node()
			.setRenderMode(renderMode.colorRounded)
			.setTexture(darkGray)
			.setWidth(typingFontSmall.widthOf("99") + scalePix(10))
			.setHeight(typingFontSmall.height)
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setPosition(Yoga.EDGE_TOP, scalePix(5))
			.setChildOf(this)
		
		this.upgradeText = new Text()
			.setFont(typingFontSmall)
			.setText("99")
			.setColor(paleYellow)
			.setTextAlign(textAlign.center)
			.setWidth("100%")
			.setChildOf(this.upgradeBox)
		
		this.evolutionBox = new Node()
			.setRenderMode(renderMode.colorRounded)
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setPosition(Yoga.EDGE_TOP, "70%")
			.setPosition(Yoga.EDGE_LEFT, "20%")
			.setWidth("60%")
			.setHeight(typingFontSmall.height * .6)
			.setTexture(darkGray.fadeTo(.6))
			.setChildOf(this)
			.hide()
		
		this.evolutionText = new Text()
			.setFont(typingFontSmall)
			.setText("")
			.setColor(paleYellow)
			.setWidth("100%")
			.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
			.setPosition(Yoga.EDGE_TOP, "-50%")
			.setTextAlign(textAlign.center)
			.setChildOf(this.evolutionBox)
		
		this.weaponName = ""
		this.weapon = null
		this.upgradeCount = 0
		this.evolutionCount = 0
		return this
	}

	addUpgrade() { this.setUpgrade(++this.upgradeCount) }
	setUpgrade(count)
	{
		this.upgradeCount = count
		this.upgradeBox.show()
		this.upgradeText.setText(String(this.upgradeCount))
	}

	addEvolution() { this.setEvolution(++this.evolutionCount)}
	setEvolution(count)
	{
		this.evolutionCount = count
		this.evolutionBox.show()
		this.evolutionText.setText("◆".repeat(this.evolutionCount))
	}

	render(surface, xOffset = 0, yOffset = 0)
	{
		super.render(surface, xOffset, yOffset)
		if (this.weapon)
			drawProgress(
				xOffset + this.getComputedLeft() + scalePix(5),
				yOffset + this.getComputedTop() + this.getComputedHeight(),
				this.getComputedWidth() - scalePix(10),
				scalePix(5),
				this.weapon.currentEvolution / this.weapon.maxEvolution,
				false
			)
	}

	setWeapon(weapon)
	{
		if (weapon != null)
		{
			this.weaponName = weapon.constructor.name
			this.weapon = weapon
			this.setText(weapon.constructor.getIcon())
			this.setColor(secondColor)
		}

		// Reset ui to blank.
		else
		{
			this.weaponName = ""
			this.weapon = null
			this.setText("")
			this.setColor(midGray.fadeTo(.5))
			this.upgradeCount = 0
			this.upgradeBox.hide()
			this.evolutionCount = 0
			this.evolutionBox.hide()
		}
	}
}

class EvolutionPopUp extends Node
{
	constructor()
	{
		super()
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setRenderMode(renderMode.colorRounded)
			.setTexture(midGray)
			.setHeight("17%")
			.setWidth("18%")
			.setMargin(Yoga.EDGE_BOTTOM, "2%")

		this.textTop = new Text()
			.setFont(regularFontUI())
			.setColor(paleYellow)
			.setTextAlign(textAlign.center)
			.setWidth("80%")
			.setText("Repeater has")
			.setChildOf(this)
		
		this.textBottom = new Text()
			.setFont(titleFontUI())
			.setColor(paleYellow)
			.setTextAlign(textAlign.center)
			.setWidth("80%")
			.setText(localize("evolution_pop_up_2"))
			.setChildOf(this)
		
		this.pressButtonGroup = new Node()
			.setFlexDirection(Yoga.FLEX_DIRECTION_ROW)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setAlignItems(Yoga.ALIGN_CENTER)
			.setHeight(scalePix(50))
			.setChildOf(this)

		this.pressText = new Text()
			.setFont(regularFontUI())
			.setColor(paleYellow)
			.setText(localize("press_text"))
			.setWidth(regularFontUI().widthOf(localize("press_text")))
			.setMargin(Yoga.EDGE_RIGHT, scalePix(10))
			.setChildOf(this.pressButtonGroup)
		
		this.rightStickButton = new Text()
			.setFont(quicktimeFont)
			.setColor(paleYellow)
			.setText(getQuickTimeString([stick_down_right]))
			.setWidth(quicktimeFont.widthOf(getQuickTimeString([stick_down_right])))
			.setChildOf(this.pressButtonGroup)
		
		this.spaceButton = new Node()
			.setRenderMode(renderMode.colorRounded)
			.setTexture(paleYellow)
			.setWidth(typingFont.widthOf(levelUpKey) + scalePix(30))
			.setHeight(scalePix(40))
			.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
			.setJustifyContent(Yoga.JUSTIFY_CENTER)
			.setChildOf(this.pressButtonGroup)

		this.spaceButtonText = new Text()
			.setColor(midGray)
			.setFont(typingFont)
			.setTextAlign(textAlign.center)
			.setWidth("100%")
			.setHeight(typingFont.height)
			.setText(levelUpKey)
			.setChildOf(this.spaceButton)
		
		this.pointerXCoord = 0
		this.opacity = 1
		this.tween = new FastTween(Easing.Linear)
		return this
	}

	setEvolution(weapon)
	{
		let slot = this.getParent().getSlot(weapon)
		this.pointerXCoord = this.getParent().weaponsGrid.getComputedLeft() + slot.getComputedLeft() + slot.getComputedWidth() / 2
		this.textTop.setText(localize("evolution_pop_up_1", weapon.constructor.getName()))
		this.rightStickButton[usingController ? "show" : "hide"]()
		this.spaceButton[usingController ? "hide" : "show"]()
		this.show()

		// Blink.
		Sphere.sleep(60).then(() => {
			if (!this.hidden)
				this.blink()
		})
	}

	blink()
	{
		this.setAnimating(true)
		this.tween.easeIn([1], [0], (t) => { this.changeOpacity(t[0]) }, 30)
			.then(() => {
				this.tween.easeIn([0], [1], (t) => { this.changeOpacity(t[0]) }, 30)
					.then(() => {
						this.setAnimating(false)
						Sphere.sleep(60).then(() => {
							if (!this.hidden)
								this.blink()
						})
					})
			})
	}

	changeOpacity(opacity)
	{
		this.textTop.setColor(paleYellow.fadeTo(opacity))
		this.textBottom.setColor(paleYellow.fadeTo(opacity))
		this.pressText.setColor(paleYellow.fadeTo(opacity))
		this.rightStickButton.setColor(paleYellow.fadeTo(opacity))
		this.spaceButton.setTexture(paleYellow.fadeTo(opacity))
		this.spaceButtonText.setColor(midGray.fadeTo(opacity))
		this.setTexture(midGray.fadeTo(opacity))
		this.opacity = opacity
	}

	render(surface, xOffset = 0, yOffset = 0)
	{
		if (!this.hidden)
		{
			let bottom = yOffset + this.getComputedTop() + this.getComputedHeight() - scalePix(.5)
			let pt1 = {x: this.pointerXCoord - scalePix(8), y: bottom}
			let pt2 = {x: this.pointerXCoord, y: bottom + scalePix(105)}
			let pt3 = {x: this.pointerXCoord + scalePix(8), y: bottom}
			PrimNative.drawFilledTriangle(surface, pt1.x, pt1.y, pt2.x, pt2.y, pt3.x, pt3.y, midGray.fadeTo(this.opacity))
		}
		super.render(surface, xOffset, yOffset)
	}
}
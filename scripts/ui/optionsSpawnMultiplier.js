import { OptionsToggle } from "./optionsToggle.js"
import { saveGame } from "../core/loader.js"

const spawnMultiplierSteps = [
	{ value: 0.25, label: "0.25x (温经精读)" },
	{ value: 0.50, label: "0.50x (缓进熟背)" },
	{ value: 0.75, label: "0.75x (渐入佳境)" },
	{ value: 1.00, label: "1.00x (标准演练)" },
	{ value: 1.25, label: "1.25x (融会贯通)" },
	{ value: 1.50, label: "1.50x (疾风骤雨)" },
	{ value: 2.00, label: "2.00x (悬壶急救)" },
	{ value: 3.00, label: "3.00x (百病丛生)" },
	{ value: 5.00, label: "5.00x (神农百草)" }
]

export class OptionsSpawnMultiplier extends OptionsToggle
{
	constructor(navigationMenu)
	{
		super(navigationMenu)
		this.name.setText("出怪强度倍率")
		if (typeof regularEastAsian !== 'undefined')
		{
			this.name.setFont(regularEastAsian)
			this.varCount.setFont(regularEastAsian)
		}
	}

	getCurrentIndex()
	{
		let currentVal = (global.spawnConfig && global.spawnConfig.globalMultiplier != null)
			? global.spawnConfig.globalMultiplier
			: (save && save.spawnMultiplier != null ? save.spawnMultiplier : 1.0)
		
		let closestIndex = 3
		let minDiff = Infinity
		for (let i = 0; i < spawnMultiplierSteps.length; i++)
		{
			let diff = Math.abs(spawnMultiplierSteps[i].value - currentVal)
			if (diff < minDiff)
			{
				minDiff = diff
				closestIndex = i
			}
		}
		return closestIndex
	}

	refresh()
	{
		let idx = this.getCurrentIndex()
		let currentStep = spawnMultiplierSteps[idx]
		
		if (typeof regularEastAsian !== 'undefined')
		{
			this.varCount.setFont(regularEastAsian)
		}
		this.varCount.setText(currentStep.label)
		this.canVariableDecrease = idx > 0
		this.canVariableIncrease = idx < spawnMultiplierSteps.length - 1
		super.refresh()
	}

	changeVariable(increment)
	{
		let idx = this.getCurrentIndex()
		let targetIdx = idx + increment

		if ((increment > 0 && this.canVariableIncrease) || (increment < 0 && this.canVariableDecrease))
		{
			if (targetIdx >= 0 && targetIdx < spawnMultiplierSteps.length)
			{
				audioHandler.playAudioHookUI("main_menu_options_change_value")
				let chosen = spawnMultiplierSteps[targetIdx].value

				if (!global.spawnConfig) global.spawnConfig = {}
				global.spawnConfig.globalMultiplier = chosen
				save.spawnMultiplier = chosen

				saveGame()
				this.refresh()
			}
		}
	}
}

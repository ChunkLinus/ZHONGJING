import { OptionsToggle } from "./optionsToggle.js"
import { saveGame } from "../core/loader.js"

const maxConcurrentSteps = [
	{ value: 15,  label: "15 只 (幽闭单挑)" },
	{ value: 25,  label: "25 只 (从容背诵)" },
	{ value: 35,  label: "35 只 (适度考场)" },
	{ value: 50,  label: "50 只 (标准密度)" },
	{ value: 65,  label: "65 只 (紧凑防线)" },
	{ value: 80,  label: "80 只 (大考临头)" },
	{ value: 100, label: "100 只 (经书覆顶)" }
]

export class OptionsMaxConcurrent extends OptionsToggle
{
	constructor(navigationMenu)
	{
		super(navigationMenu)
		this.name.setText("同屏怪物上限")
		if (typeof regularEastAsian !== 'undefined')
		{
			this.name.setFont(regularEastAsian)
			this.varCount.setFont(regularEastAsian)
		}
	}

	getCurrentIndex()
	{
		let currentVal = (global.spawnConfig && global.spawnConfig.maxConcurrent != null)
			? global.spawnConfig.maxConcurrent
			: (save && save.maxConcurrent != null ? save.maxConcurrent : 50)

		let closestIndex = 3
		let minDiff = Infinity
		for (let i = 0; i < maxConcurrentSteps.length; i++)
		{
			let diff = Math.abs(maxConcurrentSteps[i].value - currentVal)
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
		let currentStep = maxConcurrentSteps[idx]

		if (typeof regularEastAsian !== 'undefined')
		{
			this.varCount.setFont(regularEastAsian)
		}
		this.varCount.setText(currentStep.label)
		this.canVariableDecrease = idx > 0
		this.canVariableIncrease = idx < maxConcurrentSteps.length - 1
		super.refresh()
	}

	changeVariable(increment)
	{
		let idx = this.getCurrentIndex()
		let targetIdx = idx + increment

		if ((increment > 0 && this.canVariableIncrease) || (increment < 0 && this.canVariableDecrease))
		{
			if (targetIdx >= 0 && targetIdx < maxConcurrentSteps.length)
			{
				audioHandler.playAudioHookUI("main_menu_options_change_value")
				let chosen = maxConcurrentSteps[targetIdx].value

				if (!global.spawnConfig) global.spawnConfig = {}
				global.spawnConfig.maxConcurrent = chosen
				save.maxConcurrent = chosen

				saveGame()
				this.refresh()
			}
		}
	}
}

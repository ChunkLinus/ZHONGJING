import { OptionsToggle } from "./optionsToggle.js"
import { saveGame } from "../core/loader.js"

const pinyinAssistSteps = [
	{ mode: "assist",      label: "智能助记 (近防提示)" },
	{ mode: "locked_only", label: "半闭卷 (锁定注音)" },
	{ mode: "exam",        label: "大考纯闭卷 (全盲打)" }
]

export class OptionsPinyinAssistMode extends OptionsToggle
{
	constructor(navigationMenu)
	{
		super(navigationMenu)
		this.name.setText("背诵助记模式")
		if (typeof regularEastAsian !== 'undefined')
		{
			this.name.setFont(regularEastAsian)
			this.varCount.setFont(regularEastAsian)
		}
	}

	getCurrentIndex()
	{
		let currentMode = global.pinyinAssistMode || (save && save.pinyinAssistMode ? save.pinyinAssistMode : "assist")
		let index = pinyinAssistSteps.findIndex(s => s.mode === currentMode)
		return index !== -1 ? index : 0
	}

	refresh()
	{
		let idx = this.getCurrentIndex()
		let currentStep = pinyinAssistSteps[idx]

		if (typeof regularEastAsian !== 'undefined')
		{
			this.varCount.setFont(regularEastAsian)
		}
		this.varCount.setText(currentStep.label)
		this.canVariableDecrease = idx > 0
		this.canVariableIncrease = idx < pinyinAssistSteps.length - 1
		super.refresh()
	}

	changeVariable(increment)
	{
		let idx = this.getCurrentIndex()
		let targetIdx = idx + increment

		if ((increment > 0 && this.canVariableIncrease) || (increment < 0 && this.canVariableDecrease))
		{
			if (targetIdx >= 0 && targetIdx < pinyinAssistSteps.length)
			{
				audioHandler.playAudioHookUI("main_menu_options_change_value")
				let chosenMode = pinyinAssistSteps[targetIdx].mode

				global.pinyinAssistMode = chosenMode
				save.pinyinAssistMode = chosenMode

				saveGame()
				this.refresh()
			}
		}
	}
}

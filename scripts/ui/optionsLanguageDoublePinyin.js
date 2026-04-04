import { OptionsLanguage } from "./optionsLanguage.js"

export const doublePinyinOptions = [ "自然码", "智能ABC", "星空双拼", "小浪双拼", "开源小鹳",
	"拼音加加", "键道双拼3", "键道双拼6", "大牛双拼", "白云双拼方案.",
	"国标双拼", "蓝天双拼", "搜狗双拼", "微软双拼", "小鹤双拼", "小月双拼",
	"韵标块拼", "紫光双拼" ]

export class OptionsLanguageDoublePinyin extends OptionsLanguage
{
	constructor(navigationMenu)
	{
		super(navigationMenu)
		this.name.setText(localize("options_allowDoublePinyin"))
	}

	triggerPopUp()
	{
		ui.doublePinyinSelect.lastFocus = this
		ui.doublePinyinSelect.startIntro(this)
	}

	refresh()
	{
		this.varCount.setText(localize("off_text"))
		if ("allowDoublePinyin" in save && save.allowDoublePinyin != null)
		{
			this.varCount.setFont(regularEastAsian)
			this.varCount.setText(doublePinyinOptions[save.allowDoublePinyin])
		}
		else
		{
			this.varCount.setFont(regularFontUI())
			this.varCount.setText(localize("off_text"))
		}
		super.refresh()
	}
}
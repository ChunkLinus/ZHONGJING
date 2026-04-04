export const VisualThemes = function()
{
	let themes = {}
	let steamDeck = steamEnabled && ISteamUtils.IsSteamRunningOnSteamDeck()

	// Light mode.
	let midGrayValue = .45 - (contrast * .3)
	let darkGrayValue = .3 - (contrast * .3)
	let darkestGrayValue = .25 - (contrast * .25)
	let asianFontName = Surface.Screen.height < 900 ? 'SourceHanSans-Medium.otf' : 'SourceHanSans-Normal.otf'
	let japaneseFontName = Surface.Screen.height < 900 ? 'SourceHanSansJ-Medium.otf' : 'SourceHanSansJ-Normal.otf'

	/*	Below is how you define a new theme. Add another
		line on the same indent level as this one with
		"themes.(theme_name_no_spaces) = {". The theme name
		will also be the localization key used. End the
		block with a "}" just like this block. 
		
		This is the default theme, do not remove. */

	themes.theme_light_mode = {

		// ======
		// IMAGES
		// ======

		/*  Background image. Put image in "sprites" folder,
			and key in the filename (without extension) here.*/

		background: "bg_01",

		// ======
		// COLORS
		// ======

		/*	Color Definition Primer
			-----------------------

			You can input colors in several ways:

			1.	"new Color(red, green, blue[, alpha])"

				Input the color using channel values, each value
				is a floating point from 0 to 1. Alpha value
				is optional, defaults to full opacity.

			2.	"Color.fromHex(hexvalue)"

				Input the hex value with or without the
				preceding hex symbol. (e.g. "Color.fromHex("#efefe5")"
				or "Color.fromHex("efefe5")" both work). */

		/*  Color of the background. This is used whenever the
			color of the background is needed. Like for backgrounds
			of dialog boxes or words that are light-colored against
			a dark background (or vice versa in dark mode). */

		paleYellow: Color.fromHex("#efefe5"),

		/*  Default friendly drone and friendly projectile color.
			Also used as font color for most descriptions and the
			default button color. This value at 30% opacity is used 
			for untyped words*/

		midGray: new Color(midGrayValue, midGrayValue, midGrayValue),

		/*  Used when more emphasis is needed, a darker (or lighter
			in dark mode) shade of midGray. */

		darkGray: new Color(darkGrayValue, darkGrayValue, darkGrayValue),

		/*  Used only for the font color of TYPED characters in in-game
			menus (e.g. upgrade menu, loot menu, evolution menu). Like if
			a word is "ANIMALS" and you type "ANIM", "ANIM" will be in
			darkestGray. */

		darkestGray: new Color(darkestGrayValue, darkestGrayValue, darkestGrayValue),

		/*  Used as the semi-transparent background behind dialogs.
			For example, the Omen Select or Quit Game dialog. */

		bgColor: Color.Black.fadeTo(.7),

		/*  This is only used for the background of the instruction 
			box that shows just before the first time you fight a boss. */

		bgColorOpaque: Color.Black,

		/*  Used only as the background for words you need to type
			in in-game UIs. e.g. the word at the bottom on upgrade
			options when you level up. */

		absoluteMidGray: new Color(.45, .45, .45),

		/*	Enemy color and also the color of most icons (weapons,
			loot, augments, etc.) */

		secondColor: new Color(0.62, 0.36, 0.38),

		/*	Darker version (or lighter in dark mode) of secondColor,
			used wherever necessary. */
			
		secondColorDark: new Color(0.53, 0.27, 0.27),

		/*	Special colors for run information UI. */

		runInfoBG: new Color(midGrayValue, midGrayValue, midGrayValue),
		runInfoPanel: Color.fromHex("#efefe5").fadeTo(.6),
		runInfoDialog: new Color(midGrayValue, midGrayValue, midGrayValue).fadeTo(.2),

		// =====
		// FONTS
		// =====

		/*	Font are defined using a Javascript object in the
			format "{ font: (filename-of-font-with-extension),
			size: (size-of-font) }". Font files should be added
			to the "fonts" folder in the root directory. If a
			font is not defined, the game will fall back to
			the font defined in theme_light_mode. */

		/*	Font used for timer at top of screen. */

		timerFont: { font: 'NTF-Grand-Regular.ttf', size: 65, webglScale: 0.867, webglHeightScale: .95 },

		/*	Font used for crit damage. */

		critFont: { font: 'Montserrat-SemiBold.ttf', size: 50, webglScale: 0.845 },

		/*	Regular font used for descriptions and names. Please
			note that this font needs to also include accented
			characters for languages other than English that use
			latin script. */

		typingFont: { font: 'Montserrat-Regular.ttf', size: 30, webglScale: 0.845 },
		typingFontMedium: { font: 'Montserrat-Regular.ttf', size: 27, webglScale: 0.845 },
		typingFontSmall: { font: 'Montserrat-SemiBold.ttf', size: steamDeck ? 27 : 20, webglScale: 0.845 },
		typingFontLarge: { font: 'Montserrat-Regular.ttf', size: 35, webglScale: 0.845 },

		/*	Font used for titles and headers. Please note that this
			font needs to also include accented characters for
			languages other than English that use latin script. */

		grandRegular: { font: 'NTF-Grand-Regular.ttf', size: 65, webglScale: 0.867, webglHeightScale: .95 },
		grandRegularSmall: { font: 'NTF-Grand-Regular.ttf', size: 45, webglScale: 0.867, webglHeightScale: .95 },

		/*	Regular East-Asian font used for description and names.
			Used for Korean, Simplified and Traditional
			Chinese. */

		regularEastAsian: { font: asianFontName, size: 35, webglScale: 0.71, webglHeightScale: .95 },
		regularEastAsianMedium: { font: asianFontName, size: 30, webglScale: 0.71, webglHeightScale: .95 },
		regularEastAsianSmall: { font: 'SourceHanSans-Bold.otf', size: 25, webglScale: 0.71, webglHeightScale: .95 },
		regularEastAsianExtraSmall: { font: 'SourceHanSans-Bold.otf', size: 20, webglScale: 0.71, webglHeightScale: .95 },
		regularEastAsianLarge: { font: asianFontName, size: 40, webglScale: 0.71, webglHeightScale: .95 },

		/*	Regular Japanese font used for description and names. */

		regularJapanese: { font: japaneseFontName, size: 35, webglScale: 0.71, webglHeightScale: .95 },
		regularJapaneseMedium: { font: japaneseFontName, size: 30, webglScale: 0.71, webglHeightScale: .95 },
		regularJapaneseSmall: { font: 'SourceHanSansJ-Bold.otf', size: 25, webglScale: 0.71, webglHeightScale: .95 },
		regularJapaneseLarge: { font: japaneseFontName, size: 40, webglScale: 0.71, webglHeightScale: .95 },

		/*	East-Asian font for titles and headers. Used for Japanese,
			Korean, Simplified and Traditional Chinese. */

		titleEastAsian: { font: 'SourceHanSans-Bold.otf', size: 60, webglScale: 0.71, webglHeightScale: .95 },
		titleEastAsianSmall: { font: 'SourceHanSans-Bold.otf', size: 40, webglScale: 0.71, webglHeightScale: .95 },

		/*	Japanese font for titles and headers. */

		titleJapanese: { font: 'SourceHanSansJ-Bold.otf', size: 60, webglScale: 0.71, webglHeightScale: .95 },
		titleJapaneseSmall: { font: 'SourceHanSansJ-Bold.otf', size: 40, webglScale: 0.71, webglHeightScale: .95 },

		/*	Cyrillic font for titles and headers. Used for
			Ukrainian, Russian and Bulgarian. */

		titleCyrillic: { font: 'Oswald-Regular.ttf', size: 65 },
		titleCyrillicSmall: { font: 'Oswald-Regular.ttf', size: 45 }
	}

	// Dark mode.
	midGrayValue = .55 + (contrast * .3)
	darkGrayValue = .7 + (contrast * .3)
	darkestGrayValue = .8 + (contrast * .2)
	themes.theme_dark_mode = {
		background: "bg_02",
		paleYellow: new Color(.15, .15, .15),
		midGray: new Color(midGrayValue, midGrayValue, midGrayValue),
		darkGray: new Color(darkGrayValue, darkGrayValue, darkGrayValue),
		darkestGray: new Color(darkestGrayValue, darkestGrayValue, darkestGrayValue),
		bgColor: new Color(.94, .94, .9).fadeTo(.3),
		bgColorOpaque: new Color(.94, .94, .9),
		absoluteMidGray: new Color(.55, .55, .55),
		secondColor: new Color(0.60, 0.48, 0.13),
		secondColorDark: new Color(0.75, 0.60, 0.23),
		runInfoBG: new Color(midGrayValue, midGrayValue, midGrayValue),
		runInfoPanel: new Color(.15, .15, .15).fadeTo(.6),
		runInfoDialog: new Color(midGrayValue, midGrayValue, midGrayValue).fadeTo(.2),
	}

	// Sunset.
	midGrayValue = .55 + (contrast * .3)
	darkGrayValue = .7 + (contrast * .3)
	darkestGrayValue = .8 + (contrast * .2)
	themes.theme_sunset = {
		background: "bg_sunset",
		paleYellow: Color.fromHex("ffd380"),
		midGray: Color.fromHex("ff6777"),
		darkGray: Color.fromHex("ce4993"),
		darkestGray: Color.fromHex("6b0c82"),
		bgColor: Color.fromHex("1a0a32").fadeTo(.7),
		bgColorOpaque: Color.fromHex("1a0a32"),
		absoluteMidGray: Color.fromHex("ff6777"),
		secondColor: Color.fromHex("8935b3"),
		secondColorDark: Color.fromHex("8935b3"),
		runInfoBG: Color.fromHex("f6d6a6"),
		runInfoPanel: Color.fromHex("ffa77c"),
		runInfoDialog: Color.fromHex("ffd380")
	}

	// Midnight.
	midGrayValue = .55 + (contrast * .3)
	darkGrayValue = .7 + (contrast * .3)
	darkestGrayValue = .8 + (contrast * .2)
	themes.theme_midnight = {
		background: "bg_midnight",
		paleYellow: Color.fromHex("0f264c"),
		midGray: Color.fromHex("a8aed9"),
		darkGray: Color.fromHex("d2e4ff"),
		darkestGray: Color.fromHex("fff7bf"),
		bgColor: Color.fromHex("a8aed9").fadeTo(.6),
		bgColorOpaque: Color.fromHex("ffdc98"),
		absoluteMidGray: Color.fromHex("1b345b"),
		secondColor: Color.fromHex("ffc34c"),
		secondColorDark: Color.fromHex("ffcc67"),
		runInfoBG: Color.fromHex("a8aed9"),
		runInfoPanel: Color.fromHex("0f264c").fadeTo(.6),
		runInfoDialog: Color.fromHex("a8aed9").fadeTo(.2)
	}
	return themes
}
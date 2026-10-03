import { augmentsList, augmentSteamStatNames } from '../data/augmentsList.js'
import { mangleData, demangle } from './storage.js'
//import { reloadMods, modOptions } from './workshop.js'

// Load all.
export function LoadAll()
{
	return Promise.all([
		loadSprites(),
		loadSounds(),
		loadMusic(),
		loadLocalizations(),
		loadAudioHooks(),
		loadBGMSets(),
		loadGame(),
		loadShaders(),
		//checkModsFolder(),
		global.loadExternalDictionary() // <--- 【伤寒论核心：在引擎启动流中注入外部模组】
	])
}

// Load sprites.
async function loadSprites()
{
	return new Promise(async resolve => {
		let spritesFolder = await DirectoryStream.fromURL('@/sprites/')
		let current = 0
		let total = spritesFolder.fileCount
		if (total == 0) resolve()
		else {
			let progress = (res) => { current++; if (current >= total) res()}
			while (true)
			{
				let file = spritesFolder.next()
				if (file.done) break
				if (file.value.extension != ".png")
					progress(resolve)
				else
					Texture.fromFile(file.value.fullPath)
						.then(texture => {
							sprites[file.value.fileName.split(".")[0]] = texture
							progress(resolve)
						})
			}
		}
	})
}

// Load sounds.
const supportedFormats = [".wav", ".flac", ".ogg", ".opus", ".it", ".mod", ".s3m", ".xm", ".voc", ".mp3"]
async function loadSounds()
{
	return new Promise(async resolve => {
		let soundsFolder = await DirectoryStream.fromURL('@/sounds/')
		let current = 0
		let total = soundsFolder.fileCount
		if (total == 0) resolve()
		else {
			let progress = (res) => { current++; if (current >= total) res()}
			while (true)
			{
				let file = soundsFolder.next()
				if (file.done) break
				if (!supportedFormats.includes(file.value.extension))
					progress(resolve)
				else
					Sample.fromFile(file.value.fullPath)
						.then(sample => {
							audioHandler.sounds[file.value.fileName.split(".")[0]] = sample
							progress(resolve)
						})
			}
		}
	})
}

// Load music.
async function loadMusic()
{
	return new Promise(async resolve => {
		let musicFolder = await DirectoryStream.fromURL('@/music/')
		let current = 0
		let total = musicFolder.fileCount
		if (total == 0) resolve()
		else {
			let progress = (res) => { current++; if (current >= total) res()}
			while (true)
			{
				let file = musicFolder.next()
				if (file.done) break
				if (!supportedFormats.includes(file.value.extension))
					progress(resolve)
				else
					Sound.fromFile(file.value.fullPath)
						.then(audio => {
							audioHandler.music[file.value.fileName.split(".")[0]] = audio
							progress(resolve)
						})
			}
		}
	})
}

// Load hooks.
async function loadAudioHooks()
{
	if (await File.exists("@/scripts/data/audioHooks.jsonc"))
	{
		let file = await File.load("@/scripts/data/audioHooks.jsonc")
		global.audioHandler.audioHooks = JSON.parse(stripComments(file))
	}
}

// Load BGM Sets.
async function loadBGMSets()
{
	global.BGMSets = {"menu": {}, "game": {}}
	if (await File.exists("@/scripts/data/bgmSets.jsonc"))
	{
		let file = await File.load("@/scripts/data/bgmSets.jsonc")
		let data = JSON.parse(stripComments(file))
		for (let key in data)
			if ("category" in data[key])
				switch(data[key].category)
				{
					case "menu": BGMSets.menu[key] = data[key]; break
					case "game": BGMSets.game[key] = data[key]; break
					default: console.log(`Unrecognized category "${data[key].category}" for "${key}" in BGMSets.`); break
				}
	}
}

// Load loc files async.
async function loadLocalizationFiles(directory)
{
	return new Promise(async resolve => {
		let locFolder = await DirectoryStream.fromURL(directory)
		let current = 0
		let total = locFolder.fileCount
		if (total == 0) resolve()
		else {
			let progress = (res) => { current++; if (current >= total) res()}
			while(true)
			{
				let file = locFolder.next()
				if (file.done) break
				if (![".jsonc", ".wordlist", ".triggers", ".paragraphs"].includes(file.value.extension))
					progress(resolve)
				else
					File.load(file.value.fullPath)
						.then(contents => {
							let locType
							switch(file.value.extension)
							{
								case '.jsonc': 		locType = localization; 	break
								case '.wordlist': 	locType = wordlists; 		break
								case '.triggers':	locType = triggerLetters; 	break
								case '.paragraphs':	locType = paragraphs;		break
							}
							Object.assign(locType, JSON.parse(stripComments(contents)))
							progress(resolve)
						})
			}
		}
	})
}

// Load translations.
async function loadLocalizations()
{
	global.localization = {}
	global.wordlists = {}
	global.triggerLetters = {}
	global.paragraphs = {}

	// Load localization.
	let defaultLocPath = '@/localization'
	await loadLocalizationFiles(defaultLocPath)

	// Load user localization if desktop.
	if (!isOozaru)
	{
		let userLocPath = '~/localization/'
		if (!FS.directoryExists(userLocPath))
		{
			try { FS.createDirectory(userLocPath) }
			catch { console.log("Failed to create user localization directory.") }
		}
		await loadLocalizationFiles(userLocPath)
		//await modOptions.load()
		//await reloadMods()
	}
}

// Check if mods folder exists.
function checkModsFolder()
{
	let localModsFolder = "~/mods/"
	if (!FS.directoryExists(localModsFolder))
	{
		try { FS.createDirectory(localModsFolder) }
		catch { console.log("Failed to create local mods directory.") }
	}
}

// Load game.
const key = global.demo ? "961" : "186"	// Obviously unsecure, more of a deterrance.
async function loadGame()
{
	// Create default save.
	let fullScreen = (steamEnabled && ISteamUtils.IsSteamRunningOnSteamDeck()) || isSmallScreen() ? true : false
	global.save = {
		coins: 0,
		coinsTotal: 0,
		difficultyUnlocked: 1,
		fullScreen: fullScreen,
		resolution: isOozaru ?
			Sphere.desktopResolution
			: detectOptimalResolution(fullScreen),
		augments: {},
		spawnMultiplier: 1.0,
		maxConcurrent: 50,
		pinyinAssistMode: "assist",
		turrets: {
			Repeater: {
				trialsRecord: { trial: 0, omen: 0 },
				endlessRecord: { score: 0, omen: 0 }
			}
		},
		gameStates: {}
	}

	// Check for old save
	const fileExists = await loadSaveFromFile(generateSaveId())

	// 【伤寒论干预：强制配给无限军费】
	// 无论本地是新兵的初始空档，还是已经存过盘的旧档，在移交前端前一律执行物理覆写
	save.coins = 9999999;
	save.coinsTotal = 9999999;

	if (fileExists) return

	// Just use default
	await applySaveSettings(save.fullScreen, save.resolution)
}

async function loadSaveFromFile(saveGamePath)
{
	let fileExists = false
	try {
		fileExists = await File.exists(saveGamePath)
		if (fileExists) {
			let file = await File.load(saveGamePath, DataType.Bytes)
			save = demangle(file, key) || save
			visualTheme = "visualTheme" in save ? save.visualTheme : "darkMode" in save && save.darkMode ? "theme_dark_mode" : "theme_light_mode"
			monochromeMode = "monochromeMode" in save ? save.monochromeMode : false
			muteTypingSounds = "muteTypingSounds" in save ? save.muteTypingSounds : false
			contrast = "contrast" in save ? save.contrast : 0
			avoidOverlap = "avoidOverlap" in save ? save.avoidOverlap : false
			audioHandler.setBgmVolume( "bgmVolume" in save ? save.bgmVolume : 1 )
			audioHandler.setSfxVolume( "sfxVolume" in save ? save.sfxVolume : 1 )
			spacesAndPunctuation = "spacesAndPunctuation" in save ? save.spacesAndPunctuation : false
			levelUpKey = spacesAndPunctuation ? "Enter" : "__"
			allowDoublePinyin = "allowDoublePinyin" in save ? save.allowDoublePinyin : null

			// 仲景配置持久化反序列化
			if ("spawnMultiplier" in save) global.spawnConfig.globalMultiplier = save.spawnMultiplier
			if ("maxConcurrent" in save) global.spawnConfig.maxConcurrent = save.maxConcurrent
			if ("pinyinAssistMode" in save) global.pinyinAssistMode = save.pinyinAssistMode

			// Update old saves.
			// -----------------

			// Convert old dark mode to theme system.
			if ("darkMode" in save)
			{
				save.visualTheme = save.darkMode ? "theme_dark_mode" : "theme_light_mode"
				delete save.darkMode
			}

			// New turret savestate.
			save.gameStates = save.gameStates || {}
			if (Array.isArray(save.turrets))
				save.turrets = {
					Repeater: {
						trialsRecord: { trial: 0, omen: 0 },
						endlessRecord: { score: 0, omen: 0 }
					}
				}
			
			// Split up old single save language into UI and typing languages.
			if ("language" in save)
			{
				save.UILanguage = save.language
				save.gameLanguage = save.language
				delete save.language
			}

			// Award main weapon unlocks to players who unlocked main weapon via requirements.
			if (!("Dec2024MainWeaponUpdate" in save))
			{
				save.mainWeaponsUnlocked = save.mainWeaponsUnlocked || {}

				// Award Heat Ray unlock.
				if (save.turrets.Repeater &&
					save.turrets.Repeater.trialsRecord &&
					save.turrets.Repeater.trialsRecord.omen > 0
				)
					save.mainWeaponsUnlocked.HeatRay = true

				// Award Barrage unlock.
				if (Object.values(save.turrets).some(turret => turret.trialsRecord && turret.trialsRecord.omen >= 3))
					save.mainWeaponsUnlocked.Barrage = true

				// Mark as updated.
				save.Dec2024MainWeaponUpdate = true
			}

			// Update progress for Steam achievements and stats to current format.
			if (steamEnabled)
			{
				let storeStats = false
				if (!("Jul2025SteamAchievements" in save))
				{
					// Go through augments and save unlocked augments to Steam Stats.
					let augments = augmentsList()
					for (let i = 0; i < augments.length / 6; i++)
					{
						let j = i * 6
						let completed = 0
						for (let k = 0; k < 6; k++)
						{
							let augment = augments[j + k]
							if (augment.name in save.augments && save.augments[augment.name] == augment.cost.length)
								completed++
						}
						ISteamUserStats.SetStatInt32(augmentSteamStatNames[i], completed)
					}

					// Go through main weapons.
					let bestEndlessRecord = 0
					for (const turretName of Object.keys(save.turrets))
					{
						// Save endless records to Steam.
						let endless = save.turrets[turretName].endlessRecord
						let timeInMinutes = (endless.score / (1 + endless.omen * .2)) / 60000
						ISteamUserStats.SetStatFloat(turretName + "EndlessRecord", timeInMinutes)
						bestEndlessRecord = Math.max(bestEndlessRecord, timeInMinutes)

						// Trigger trial achievements.
						let trial = save.turrets[turretName].trialsRecord
						if (trial.omen > 0 || trial.trial == 3)
							ISteamUserStats.SetAchievement(`${turretName.toLowerCase()}_all_trials`)
						if (trial.omen == 7)
							ISteamUserStats.SetAchievement(`${turretName.toLowerCase()}_all_omens`)
					}

					// Save longest endless record (any main weapon).
					ISteamUserStats.SetStatFloat("AnyEndlessRecord", bestEndlessRecord)

					// Mark for stat saving.
					storeStats = true

					// Mark as updated.
					save.Jul2025SteamAchievements = true
				}

				// Update progress for Steam achievements (Part 2)
				if (!("Jul2025SteamAchievements2" in save))
				{
					// List weapons with pre-July-2025 dps Steam Achivements
					let oldWeaponDPSAchivements = [
						"spectre",
						"repeater",
						"hunter",
						"blade",
						"tesla",
						"chopper",
						"oscillator",
						"meteor",
						"sentry",
						"minefield"
					]

					// If player already has the 500 dps achivement,
					// auto-update the highest recorded dps for the weapon.
					for (const weap of oldWeaponDPSAchivements)
						if (ISteamUserStats.GetAchievement(weap + "_500").pbAchieved)
							ISteamUserStats.SetStatFloat(weap + "DPS", 500.0)
					
					// Mark for stat saving.
					storeStats = true

					// Mark as updated.
					save.Jul2025SteamAchievements2 = true
				}

				// Update double pinyin to new system.
				if (!("Oct2025DoublePinyinUpdate" in save))
				{
					if ("allowDoublePinyin" in save)
						save.allowDoublePinyin = null

					// Mark as updated.
					save.Oct2025DoublePinyinUpdate = true
				}

				// Double-check trials and endless achievements.
				if (!demo && save.turrets)
					for (const turret of Object.keys(save.turrets))
					{
						const highestOmen = save.turrets[turret].trialsRecord.omen
						const endlessTime = save.turrets[turret].endlessRecord.score / (1 + save.turrets[turret].endlessRecord.omen * .2)
						const endlessTimeInMins = endlessTime / 60000

						// Check all trials (any omen) achievement.
						if (highestOmen > 0 && !ISteamUserStats.GetAchievement(`${turret}_all_trials`).pbAchieved)
							ISteamUserStats.SetAchievement(`${turret}_all_trials`)

						// Check all trials (Omen VI) achievement.
						if (highestOmen > 6 && !ISteamUserStats.GetAchievement(`${turret}_all_omens`).pbAchieved)
							ISteamUserStats.SetAchievement(`${turret}_all_omens`)
						
						// Check turret endless stat.
						if (endlessTimeInMins > ISteamUserStats.GetStatFloat(turret + "EndlessRecord").pData)
							ISteamUserStats.SetStatFloat(turret + "EndlessRecord", endlessTimeInMins)

						// Check any turret endless stat.
						if (endlessTimeInMins > ISteamUserStats.GetStatFloat("AnyEndlessRecord").pData)
							ISteamUserStats.SetStatFloat("AnyEndlessRecord", endlessTimeInMins)
					}

				// Save to Steam.
				if (storeStats)
					ISteamUserStats.StoreStats()
			}

			// Update old endless mode records.
			for (const weapon of Object.values(save.turrets))
				if (weapon.endlessRecord == null || typeof weapon.endlessRecord == "number")
					weapon.endlessRecord = {
						score: weapon.endlessRecord,
						omen: 0
					}

			// Fullscreen
			let isFullScreen = false
			if ("fullScreen" in save)
				isFullScreen = save.fullScreen
			if ((steamEnabled && ISteamUtils.IsSteamRunningOnSteamDeck()) || isSmallScreen() || (isOozaru && !isXbox))
				isFullScreen = true

			// Resolution
			let res = "resolution" in save ? save.resolution : detectOptimalResolution(isFullScreen)
			if (!isResolutionSuitableForScreen(res, isFullScreen))
				res = detectOptimalResolution(isFullScreen)

			await applySaveSettings(isFullScreen, res)
		}
	} catch (e) {
		return false;
	}
	return fileExists
}

async function loadShaders()
{
	// Load alpha shader.
	const availableShaderVersions = [ "v15", "v12" ]
	var exception
	var succeeded = false
	for ( const version of availableShaderVersions )
	{
		try
		{
			global.alphaShader = await Shader.fromFiles({
				vertexFile: `@/scripts/data/shaders/${version}/alpha.vert.glsl`,
				fragmentFile: `@/scripts/data/shaders/${version}/alpha.frag.glsl`
			})
			succeeded = true
			break
		}
		catch (e)
		{
			exception = e
			console.log(`Failed to load shader: ${e}`)
		}
	}
	if( !succeeded )
		throw exception
}

async function applySaveSettings(isFullScreen, res)
{
	Sphere.fullScreen = isFullScreen
	Sphere.setResolution(res.width, res.height)
	setScreenScale()
	await loadFonts()
	calculateScreenDimensions()
}

// Save game.
export function saveGame()
{
	let data = mangleData(save, key)
	File.save(generateSaveId(), data).catch((e) => {
		console.log(`Failed to save: ${e}`)
	})
}

export function generateSaveId()
{
	// Parse the steam id down to a number to avoid breaking old saves
	let savePrefix = demo ? '~/demo_save_' : '~/save_'
	return (steamEnabled ? `${savePrefix}${parseInt(ISteamUser.GetSteamID())}` : `${savePrefix}default`) + ".sav"
}
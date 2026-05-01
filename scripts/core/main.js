/*
 *  Glyphica
 *  (c) 2025 AliasBLACK Pte. Ltd.
 */

// Import libraries.
import './global.js'
import '../data/versionString.js'
import './words.js'

// Import other script files.
import { Task, Matter } from 'sphere-runtime'
import { Control } from './control.js'
import { Interface } from './interface.js'
import { Spawner } from './spawner.js'
import { Factory } from './factory.js'
import { LoadAll, saveGame } from './loader.js'
import { BGM } from './bgm.js'
import { Modifiers } from './modifiers.js'
import { GlyphicaConsole } from './console.js'
import { platform_overrides } from './platform_overrides.js'
import { Callback } from './callback.js'
//import { itemInstalled } from './workshop.js'

export default class MyGame extends Task
{	
	constructor()
	{
		super({priority: 101})
		Sphere.fullScreen

		platform_overrides()

		// Init Steam API.
		if (steamEnabled)
		{
			SteamAPI.Init()
			ISteamUserStats.RequestCurrentStats()
			steamStats.lootCollected = ISteamUserStats.GetStatInt32("lootCollected").pData
			steamStats.wordsTyped = ISteamUserStats.GetStatInt32("wordsTyped").pData
		}
		
		// Physics engine and delta calculation.
		global.physics = Matter.Engine.create()
		global.timeLastFrame = Date.now()

		// Set callback if user using IME.
		Sphere.onIMESetContext((active) => IMEActiveWarningTrigger = active)

		// Start console.
		global.console = new GlyphicaConsole()

		if (!Sphere.audioEnabled())
		{
			console.log("Failed to initialize audio system")
		}

		// Load all external assets.
		LoadAll().then(() => {
			
			// 【启动总线：极简语言记忆】
			global.changeUILanguage("schinese"); 
			global.changeGameLanguage(save.gameLanguage);

			// Init core systems.
			global.callback = new Callback()
			global.bgm = new BGM()
			global.control = new Control()
			global.factory = new Factory()
			global.spawner = new Spawner()
			global.ui = new Interface()
			global.modifiers = new Modifiers()

			// If HTML5.
			if (isOozaru && !isXbox)
			{
				// Test for hardware acceleration.
				new FrameRateTester()

				// Restart game if resize detected.
				this.restartCountDown = null
				this.prevGameWindowWidth = Surface.Screen.width
				window.addEventListener('resize', this.resizeEvent.bind(this))
			}

			//global.callback.addListener("ItemInstalled", (item) => {
			//	itemInstalled(item)
			//})
		})
	}

	resizeEvent()
	{
		let startCountdown = this.restartCountDown == null
		this.restartCountDown = 3
		if (startCountdown)
		{
			let countDownFunc = (() => {
				if (--this.restartCountDown > 0)
					Sphere.sleep(60).then(countDownFunc)
				else
				{
					this.restartCountDown = null
					this.prevGameWindowWidth = Surface.Screen.width
					restartGame(this)
				}
			}).bind(this)
			countDownFunc()
		}
	}
	
	on_update()
	{
		// Delta
		let dateNow = Date.now()
		let delta = dateNow - global.timeLastFrame
		global.timeLastFrame = dateNow

		// Update global timer.
		if (currentScreen == game && !isPaused())
			timeElapsed += delta

		// Run Steam callbacks.
		if (steamEnabled && global.callback)
			SteamAPI.RunCallbacks()
				.forEach(cb => {
					if ("callID" in cb)
						callback.triggerSteamAPICallback(cb.callID, cb)
					else
						callback.triggerCallback(cb.name, cb)
				})
		
		// Update physics engine.
		Matter.Engine.update(physics, delta)

		// Trigger IME Warning.
		if (IMEActiveWarningTrigger && !inPopUp)
		{
			IMEActiveWarningTrigger = false
			if (currentScreen == game)
				pause("IME Active Warning")
			ui.confirmPopUp.trigger(
				localize("ime_active_warning"),
				currentScreen == game ? unpause : null
			)
		}
	}

	on_shutDown()
	{
		// Shutdown Steam API.
		if (steamEnabled)
			SteamAPI.Shutdown()

		// Profile factory.
		console.log("Task factory")
		for (const pair of Object.entries(factory.archives))
			console.log(pair[0] + ": " + pair[1].length)

		console.log("Entity factory")
		for ( const pair of Object.entries(factory.entityFactory.inactiveEntities))
			console.log(`${pair[0]}: ${pair[1].length + factory.entityFactory.runningEntities[pair[0]].length}`)
	}

	on_render()
	{
		// Resize event restart countdown, only for HTML5.
		if (isOozaru && this.restartCountDown && this.restartCountDown > 0)
		{
			let gameWindowDimensions = HTML5_GetOptimalGameWindowDimensions()
			PrimNative.drawFilledRectangle(Surface.Screen, 0, 0, gameWindowDimensions.width, gameWindowDimensions.height, Color.Black)
			let resizeNotice = localize("resize_notification", this.restartCountDown.toString())
			let resizeScale = gameWindowDimensions.width / this.prevGameWindowWidth
			let textPosition = {
				x: (gameWindowDimensions.width / 2) - ((regularFontUI().widthOf(resizeNotice) * resizeScale) / 2),
				y: (gameWindowDimensions.height / 2) - ((regularFontUI().heightOf(resizeNotice) * resizeScale) / 2)
			}
			regularFontUI().drawText(Surface.Screen, textPosition.x, textPosition.y, resizeNotice, Color.White, undefined, resizeScale)
		}
	}
}

class FrameRateTester extends Task
{
	constructor()
	{
		super()
		this.startTime = Date.now()
		this.currentFrame = 0
		this.start()
	}
	on_render()
	{
		this.currentFrame++
		let timeElapsed = (Date.now() - this.startTime) / 1000
		if (timeElapsed > 5)
		{
			let fps = (this.currentFrame / (Date.now() - this.startTime)) * 1000
			if (fps < 40)
				ui.confirmPopUp.trigger(localize("webgl2_not_supported"), null, true)
			else if (!("resizeWarning" in save))
			{
				save.resizeWarning = true
				ui.confirmPopUp.trigger(localize("resize_warning"), null)
				saveGame()
			}
			this.stop()
		}
	}
}
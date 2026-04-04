import { Task, Easing } from 'sphere-runtime'
import { FastTween } from './fastTween.js'

export class BGM extends Task
{
	constructor()
	{
		super()

		// Declare variables.
		this.currentSet = "bgmSet" in save ? save.bgmSet : "default"
		this.currentlyPlaying
		this.previouslyPlaying = []
		this.playQueue = []
		this.mode
		this.modeName
		
		// Music fading variables.
		this.volumeTween = new FastTween(Easing.Linear)

		// Set all special menu music to loop.
		for (let key in BGMSets.game)
			for (let context in BGMSets.game[key])
				if (
					context != "category" &&
					context != "bgm" &&
					audioHandler.music[BGMSets.game[key][context]]
				)
				audioHandler.music[BGMSets.game[key][context]].repeat = true

		if (!Sphere.audioEnabled())
			return

		// Start playing menu music.
		this.setMode("menu")

		// Start task.
		this.start()
		this.playModeBGM(false)
	}

	fadeTo(music, pauseCurrent = true)
	{
		// Check if music is valid.
		if (!Sphere.audioEnabled() || !music || music == this.currentlyPlaying)
			return

		// Fade out current music.
		if (this.transition)
			this.playQueue.push([music, pauseCurrent])
		else
		{
			this.transition = true
			if (this.currentlyPlaying) this.previouslyPlaying.push(this.currentlyPlaying)
			this.volumeTween.easeOut([1, 0], [0, 1], t => {
				if (this.previouslyPlaying.length > 0)
					this.previouslyPlaying[this.previouslyPlaying.length - 1].volume = t[0]
				this.currentlyPlaying.volume = t[1]
			}, 60)
				.then(() => {
					this.transition = false
					if (this.previouslyPlaying.length > 0)
					{
						let previous = this.previouslyPlaying[this.previouslyPlaying.length - 1]
						previous.volume = 1
						pauseCurrent ? previous.pause() : this.previouslyPlaying.pop().stop()
					}
					if (this.playQueue.length > 0)
					{
						let next = this.playQueue.pop()
						this.fadeTo(next[0], next[1])
					}
				})
			this.currentlyPlaying = music
			this.currentlyPlaying.volume = 0.0
			if (this.currentlyPlaying.position < .1)
				this.currentlyPlaying.play(audioHandler.bgmMixer)
			else
				this.currentlyPlaying.play()
		}
	}

	getMusicInSet(key)
	{
		if (!Sphere.audioEnabled())
			return null
		else
		{
			let setName = `${this.currentSet}_${this.modeName}`
			if (setName in this.mode && key in this.mode[setName])
				return audioHandler.music[this.mode[setName][key]]
			else if (key in this.mode["default_" + this.modeName])
				return audioHandler.music[this.mode["default_" + this.modeName][key]]
			else return null
		}
	}

	resume()
	{
		this.fadeTo(this.previouslyPlaying.pop(), false)
	}

	setMode(mode, startNow = true)
	{
		if (!Sphere.audioEnabled()) return

		this.modeName = mode
		this.mode = BGMSets[mode]
		if (startNow && mode)
		{
			this.previouslyPlaying.forEach(track => track.stop())
			this.previouslyPlaying = []
			this.playQueue = []
			this.playModeBGM()
		}
	}

	changeTheme(theme)
	{
		if (this.currentSet != theme)
		{
			this.currentSet = theme
			this.setMode(this.modeName, true)
		}
	}

	playModeBGM(fade = true)
	{
		// Play track.
		if (fade)
			this.fadeTo(this.getMusicInSet("bgm"), false)
		else
		{
			if (this.currentlyPlaying.playing) this.currentlyPlaying.stop()
			this.currentlyPlaying = this.getMusicInSet("bgm")
			this.currentlyPlaying.play(audioHandler.bgmMixer)
		}
	}

	on_update()
	{
		if (!this.currentlyPlaying.playing)
			this.playModeBGM(false)
	}

	on_shutDown()
	{
		this.previouslyPlaying.forEach(track => track.stop())
		if (this.currentlyPlaying)
			this.currentlyPlaying.stop()
	}
}
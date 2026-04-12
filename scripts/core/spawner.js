import { Task, Random } from 'sphere-runtime'

// Enemies
import {
	Drone, Drone2, Drone3, Drone4, Drone5, Drone6, Drone7,
	ShieldDrone, ShieldDrone2, ShieldDrone3, ShieldDrone4, ShieldDrone5,
	Stalker, Stalker2, Stalker3, Stalker4
} from '../enemies/drone.js'
import { Shooter, Shooter2, Shooter3, Shooter4, Shooter5 } from '../enemies/shooter.js'
import { Splitter, Splitter2, Splitter3 } from '../enemies/splitter.js'
import { Warder } from '../enemies/warder.js'
import { Swarmer } from '../enemies/swarmer.js'
import { Announcer } from '../effects/announcer.js'

// Bosses.
import { currentBossType } from '../bosses/bossUtilities.js'

// Pickup Controller.
import { PickupController } from '../pickups/pickupController.js'

// Spawn-lanes.
const minAngle = - Math.PI * .25
const maxAngle = Math.PI * .25
const numLanes = 12
const increment = (maxAngle - minAngle) / numLanes
const lanes = Array(numLanes * 2)
const laneTemplate = JSON.stringify({
	noBlockers: false,
	bossBlocked: false,
	blocked: false,
	enemies: []
})

export class Spawner extends Task
{
	constructor()
	{
		super()

		// Timekeeping vars.
		this.maxCooldown = 280
		this.currentCooldown = 0
		this.eliteCooldown = 0
		this.lastFiveCooldowns = Array(5).fill(0)

		// Pickup controller.
		global.pickupController = new PickupController()

		// Key: End of time bracket (mins).
		// Value: Threat, Weight, Enemy Type
		this.threatTable = {

			1: [
				[2,		100,	Drone]
			],

			2: [
				[2,		90,		Drone],
				[3,		10,		Drone2]
			],

			4: [
				[2,		80,		Drone],
				[2,		20,		Drone2],
				[4,		10,		Shooter]
			],

			7: [
				[2,		50,		Drone],
				[2,		50,		Drone2],
				[4,		10,		Shooter],
				[4,		5,		Stalker],
				[4,		15,		ShieldDrone]
			],

			9: [
				[2,		90,		Drone2],
				[3,		10,		Drone3],
				[4,		15,		Shooter],
				[5,		5,		Shooter2],
				[4,		10,		Stalker],
				[5,		5,		Splitter],
				[4,		20,		ShieldDrone]
			],

			11: [
				[2,		70,		Drone2],
				[3,		30,		Drone3],
				[4,		10,		Shooter],
				[5,		10,		Shooter2],
				[4,		15,		Stalker],
				[5,		10,		Splitter],
				[4,		20,		ShieldDrone],
				[4,		10,		ShieldDrone2],
				[6,		10,		Warder]
			],

			13: [
				[2,		30,		Drone2],
				[3,		70,		Drone3],
				[4,		20,		Shooter2],
				[4,		10,		Stalker],
				[4,		5,		Stalker2],
				[5,		8,		Splitter],
				[6,		2,		Splitter2],
				[4,		10,		ShieldDrone],
				[4,		20,		ShieldDrone2],
				[6,		10,		Warder],
				[8,		5,		Swarmer]
			],

			16: [
				[3,		70,		Drone3],
				[4,		30,		Drone4],
				[4,		15,		Shooter2],
				[6,		5,		Shooter3],
				[4,		5,		Stalker],
				[4,		10,		Stalker2],
				[5,		5,		Splitter],
				[6,		5,		Splitter2],
				[4,		30,		ShieldDrone2],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			19: [
				[3,		30,		Drone3],
				[4,		70,		Drone4],
				[4,		10,		Shooter2],
				[6,		10,		Shooter3],
				[4,		15,		Stalker2],
				[5,		2,		Splitter],
				[6,		8,		Splitter2],
				[4,		20,		ShieldDrone2],
				[4,		10,		ShieldDrone3],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			21: [
				[4,		70,		Drone4],
				[5,		30,		Drone5],
				[6,		20,		Shooter3],
				[4,		10,		Stalker2],
				[6,		5,		Stalker3],
				[5,		10,		Splitter2],
				[4,		10,		ShieldDrone2],
				[4,		20,		ShieldDrone3],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			24: [
				[4,		30,		Drone4],
				[5,		70,		Drone5],
				[6,		15,		Shooter3],
				[6,		5,		Shooter4],
				[4,		5,		Stalker2],
				[6,		10,		Stalker3],
				[6,		8,		Splitter2],
				[7,		2,		Splitter3],
				[4,		30,		ShieldDrone3],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			27: [
				[5,		70,		Drone5],
				[6,		30,		Drone6],
				[6,		10,		Shooter3],
				[6,		10,		Shooter4],
				[6,		15,		Stalker3],
				[6,		5,		Splitter2],
				[7,		5,		Splitter3],
				[4,		20,		ShieldDrone3],
				[6,		10,		ShieldDrone4],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			30: [
				[5,		30,		Drone5],
				[6,		70,		Drone6],
				[6,		20,		Shooter4],
				[6,		10,		Stalker3],
				[7,		5,		Stalker4],
				[6,		2,		Splitter2],
				[7,		8,		Splitter3],
				[4,		10,		ShieldDrone3],
				[6,		20,		ShieldDrone4],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			32: [
				[6,		70,		Drone6],
				[7,		30,		Drone7],
				[6,		15,		Shooter4],
				[7,		5,		Shooter5],
				[6,		5,		Stalker3],
				[7,		10,		Stalker4],
				[7,		10,		Splitter3],
				[6,		30,		ShieldDrone4],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			34: [
				[6,		30,		Drone6],
				[7,		70,		Drone7],
				[6,		10,		Shooter4],
				[7,		10,		Shooter5],
				[7,		15,		Stalker4],
				[7,		10,		Splitter3],
				[6,		20,		ShieldDrone4],
				[7,		10,		ShieldDrone5],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			36: [
				[7,		100,	Drone7],
				[6,		5,		Shooter4],
				[7,		15,		Shooter5],
				[7,		15,		Stalker4],
				[7,		10,		Splitter3],
				[6,		10,		ShieldDrone4],
				[7,		20,		ShieldDrone5],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			],

			Infinity: [
				[7,		100,	Drone7],
				[7,		20,		Shooter5],
				[7,		15,		Stalker4],
				[7,		10,		Splitter3],
				[7,		30,		ShieldDrone5],
				[6,		15,		Warder],
				[8,		10,		Swarmer]
			]
		}

		// Class hierachy breakdown for wiki generation.
		this.classHierachy = [
			[Drone, Drone2, Drone3, Drone4, Drone5, Drone6, Drone7],
			[ShieldDrone, ShieldDrone2, ShieldDrone3, ShieldDrone4, ShieldDrone5],
			[Stalker, Stalker2, Stalker3, Stalker4],
			[Shooter, Shooter2, Shooter3, Shooter4, Shooter5],
			[Splitter, Splitter2, Splitter3],
			[Warder],
			[Swarmer]
		]
	}

	start()
	{
		super.start()

		// Reset vars.
		this.currentFrame
			= this.currentCooldown
			= this.eliteCooldown
			= this.existingThreat
			= this.lastSpawn
			= this.lastEliteSpawn
			= this.eagerCount
			= 0
		this.hasBossSpawned = false
		this.bossLaneBlocked = false
		this.lastFiveCooldowns.fill(0)

		// If Trial mode, determine boss for the level.
		this.incomingBoss = missionMode ? currentBossType() : null

		// Clear spawn lanes.
		this.clearLanes()

		// Update hud level.
		let lvlText = ui.hud.top.hud_level
		let text = `${omenLevel > -2 ? localize("level", levelNumberText()) + " " : ""}${currentTurret.constructor.getName()}`
		Sphere.sleep(0).then(() => lvlText.setText(text))
	}

	on_update()
	{
		if (isPaused()) return

		// --- 【伤寒论核心：动态场控与反身性惩罚】 ---
		// 1. 初始化错字监控雷达
		if (this.shanghanLastMistypes === undefined) {
			this.shanghanLastMistypes = global.totalMistypes || 0;
			this.punishmentTimer = 0;
		}

		// 2. 侦测神经反射失误
		let currentMistypes = global.totalMistypes || 0;
		if (currentMistypes > this.shanghanLastMistypes) {
			this.punishmentTimer = 60; // 错字惩罚：全场狂暴加速持续 60 帧 (1秒)
			this.shanghanLastMistypes = currentMistypes;
		}

		// 3. 确立时空膨胀规则
		let isFocused = hostilesArray.some(e => e.numMatchingLetters > 0);

		if (this.punishmentTimer > 0) {
			global.shanghanTimeScale = 2.5; // 惩罚状态：2.5倍速死亡冲锋
			this.punishmentTimer--;
		} else if (isFocused) {
			global.shanghanTimeScale = 0.15; // 专注状态：其他怪物降速至 15% (泥沼漫步)
		} else {
			global.shanghanTimeScale = 1.0; // 游荡状态：正常流速
		}
		// --- 【系统广播结束】 ---

		// Process spawn-lanes.
		for (const lane of lanes)
			for (const enemy of lane.enemies)
				enemy[1]--

		// Spawn enemies.
		this.currentFrame = Math.ceil(timeElapsed * .06)
		
		// 4. 控制暴兵轴线
		if (isFocused && this.punishmentTimer <= 0) {
			// 绝对专注时：强制挂起后台的刷怪倒计时，不刷出新怪干扰
			this.lastSpawn = this.currentFrame; 
		} else {
			// 惩罚状态下冷却减半（狂暴刷怪），正常状态取原值
			let activeCooldown = this.punishmentTimer > 0 ? this.currentCooldown * 0.5 : this.currentCooldown;
			if (this.currentFrame - this.lastSpawn > activeCooldown)
				this.randomSpawn()
		}
		
		// If Trial mode..
		if (missionMode)
		{
			// Block lanes prior to boss arrival.
			if (!this.bossLaneBlocked && this.currentFrame >= missionCountdown * .875)
			{
				this.bossLaneBlocked = true
				let startLane, endLane
				switch (this.incomingBoss.name)
				{
					case "Gemini":
						startLane = Math.round(numLanes * .4)
						endLane = Math.round(numLanes * .7)
						break
					
					case "Poet":
						startLane = 0
						endLane = Math.round(numLanes * .1)
						break
				}
				for (let i = 0; i < 2; i++)
					for (let k = startLane; k <= endLane; k++)
						lanes[(i * numLanes) + k].bossBlocked = true
			}

			// Spawn boss.
			if (!this.hasBossSpawned && this.currentFrame >= missionCountdown)
			{
				this.hasBossSpawned = true
				let bossType = this.incomingBoss
				bgm.fadeTo(bossType.getBGM())

				// If boss has not been defeated before, show intro screen.
				if (!("defeated" + bossType.name in save))
				{
					pause("bossIncomingAnnounce")
					factory.spawn(Announcer, bossType.getName(), localize("boss_incoming"), bossType.getDesc(), true).endPromise
						.then(() => {
							unpause("bossIncomingAnnounce")
							factory.spawn(bossType)
						})
				}
				else factory.spawn(bossType)
			}
		}

		// If Endless mode.
		else
		{
			// Eager Augment.
			if ("augment_eager" in activeAugments && Math.floor(timeElapsed / 240000) > this.eagerCount)
			{
				this.eagerCount++
				addExperience(expToNextLevel - currentExperience)
			}
		}
	}

	getTimeFactor(currentFrame)
	{
		// Trials.
		if (missionMode)
		{
			if (currentFrame > missionCountdown)
				return missionCountdown * missionTier + (currentFrame - missionCountdown)
			return currentFrame * missionTier
		}

		// Endless.
		let adaptiveDifficulty = (Math.pow(2, 0.000025 * currentFrame) - 1.6) * currentLevel * 3600
		return Math.max(currentFrame, adaptiveDifficulty)
	}

	getThreatBudget(timeFactor)
	{
		let omenFactor = 1
		switch (omenLevel)
		{
			case omen.typist:
			case omen.relaxed:
				omenFactor = .1
		}
		let increment = .0045 * omenFactor * timeFactor
		return Math.floor(30 + increment)
	}

	getSpecialsBudget(timeFactor)
	{
		let omenFactor = 1
		switch (omenLevel)
		{
			case omen.typist: omenFactor = 0; break
			case omen.relaxed: omenFactor = .5
		}
		let increment = .000082 * omenFactor * timeFactor
		return Math.floor(1 + increment)
	}

	getEliteBudget(timeFactor)
	{
		let omenFactor = 1
		switch (omenLevel)
		{
			case omen.typist: omenFactor = 0; break
			case omen.relaxed: omenFactor = .5
		}
		let increment = .000035 * omenFactor * timeFactor
		return Math.floor(increment)
	}

	randomSpawn()
	{
		// If freeze is not active.
		if (!powerup_freeze)
		{
			// Get total budget.
			let timeFactor = this.getTimeFactor(this.currentFrame)
			let threatBudget = this.getThreatBudget(timeFactor)
			let specialsBudget = this.getSpecialsBudget(timeFactor)
			let eliteBudget = this.getEliteBudget(timeFactor)

			// Get available budget.
			let currentThreatBudget = threatBudget - this.existingThreat
			let currentSpecials = hostilesArray.reduce((total, current) => total += current.constructor.isSpecial ? current.constructor.isSpecial() : 0, 0)
			let currentElite = hostilesArray.reduce((total, current) => total += current.constructor.isElite ? current.constructor.isElite() : 0, 0)

			// If we can still spawn enemies.
			if (currentThreatBudget > 0)
			{
				// If typist mode, just spawn Drone.
				if (omenLevel < -1)
				{
					if (currentThreatBudget > 2)
					{
						this.existingThreat += 2
						factory.spawn(Drone, 2)
					}
				}

				// Else, in any other mode...
				else
				{
					// Find eligible enemies to spawn.
					let timeBracket = Object.keys(this.threatTable).find(key => timeFactor <= key * 3600)
					let eliteCooldownOver = this.currentFrame - this.lastEliteSpawn > this.eliteCooldown
					let randomPool = this.threatTable[timeBracket].filter((set) => {
						return set[0] <= threatBudget
							&& !(set[2].isElite() && (currentElite >= eliteBudget || !eliteCooldownOver))
							&& !(set[2].isSpecial() && currentSpecials >= specialsBudget)
					})

					// If any are found.
					if (randomPool.length > 0)
					{
						// Roll the dice.
						let totalWeight = randomPool.reduce((total, current) => total += current[1], 0)
						let weightedRandom = Random.discrete(0, totalWeight)

						// Spawn the lucky enemy.
						let enemyToSpawn = randomPool.find((set) => {
							weightedRandom -= set[1]
							return weightedRandom <= 0
						})
						this.existingThreat += enemyToSpawn[0]
						factory.spawn(enemyToSpawn[2], enemyToSpawn[0])
						
						// Set elite cooldown.
						if (enemyToSpawn[2].isElite())
						{
							this.lastEliteSpawn = this.currentFrame
							this.eliteCooldown = 800 + (++currentElite / eliteBudget * 800)
						}
					}
				}
			}
			
			// Set next cooldown.
			this.lastSpawn = this.currentFrame
			
			// --- 【伤寒论干预：应用全局降速倍率】 ---
			this.currentCooldown = (20 + Math.floor(
				(this.existingThreat / threatBudget)
				* this.maxCooldown
				* this.sineFactor(this.currentFrame)
			)) * (global.shanghanSpawnMultiplier !== undefined ? global.shanghanSpawnMultiplier : 1);
			// ----------------------------------------
			
			this.lastFiveCooldowns.shift()
			this.lastFiveCooldowns.push(this.currentCooldown / 60)
		}
		else this.currentCooldown = powerups.find((powerup) => powerup.constructor.name == "Freeze").node.currentProgress
	}

	sineFactor(frame)
	{
		return Math.min (
			frame > 9000 ? 1.2 :
			1, .35 * Math.sin((missionMode ? .0009 : .00067) * frame) + .85
		)
	}

	removeThreat(enemy)
	{
		this.existingThreat -= enemy.threat;

		// Clear lane (if any)
		lanes.some(ln => {
			let index = ln.enemies.findIndex(e => e[0] == enemy)
			if (index >= 0)
			{
				ln.enemies.splice(index, 1)
				if (enemy.isBlocker) ln.blocked = false
				return true
			}
			return false
		})
	}

	clearLanes()
	{
		for (let i = 0; i < lanes.length; i++)
			lanes[i] = JSON.parse(laneTemplate)

		if (missionMode)
		{
			let startLane, endLane
			switch(this.incomingBoss.name)
			{
				case "Gemini":
					startLane = Math.round(numLanes * .4)
					endLane = Math.round(numLanes * .6)
					break

				case "Poet":
					startLane = 0
					endLane = Math.round(numLanes * .1)
					break
			}
			for (let i = 0; i < 2; i++)
				for (let k = startLane; k <= endLane; k++)
					lanes[(i * numLanes) + k].noBlockers = true
		}
	}

	getSpawnPositionAndSpeed(enemy)
	{
		// Check if enemy has a speed range defined.
		if (!("maxSpeed" in enemy) || !("minSpeed" in enemy))
		{
			console.log(`"maxSpeed" or "minSpeed" variable missing when trying to spawn ${enemy.constructor.name}.`)
			return
		}

		// If speed range available, proceed to find suitable lane.
		let distanceFromCenter = distanceBetween({ x: 0, y: 0 }, screenCenter)
		let speed, position = null
		let attempts = 0
		do {
			attempts++
			let startingIndex = Random.chance(.5) ? 0 : numLanes
			let laneNumber = startingIndex + Random.discrete(0, numLanes - 1)
			let lane = lanes[laneNumber]
			if (
				!lane.blocked
				&& !lane.bossBlocked
				&& !(enemy.isBlocker && lane.noBlockers)
			)
			{
				let maxPossibleSpeed = lane.enemies.reduce(
					(maxSpd, e) => Math.min(maxSpd, distanceFromCenter / (e[1] + 40)),
					Infinity
				)
				if (maxPossibleSpeed > enemy.minSpeed)
				{
					speed = enemy.minSpeed + (Math.random() * (Math.min(maxPossibleSpeed, enemy.maxSpeed) - enemy.minSpeed))
					let angle = 
						Random.uniform (
							( startingIndex == 0 ?
								- Math.PI - minAngle - (laneNumber - startingIndex) * increment :
								minAngle + (laneNumber - startingIndex) * increment
							) + increment * .5,
							increment * .33
						)
					position = Vector.add(screenCenter, Vector.rotate({ x: distanceFromCenter, y: 0 }, angle))
					lane.enemies.push([enemy, distanceFromCenter / speed])
					if (enemy.isBlocker) lane.blocked = true
				}
			}
		}
		while (position == null && attempts < 100)
		return position ? { position: position, speed: speed } : null
	}

	// Check if a world position lies within one of the permissible spawn lanes
	// and that the corresponding lane isn't blocked by boss or blockers.
	isPositionBossBlocked(pos)
	{
		if (!pos) return false
		let dx = pos.x - screenCenter.x
		let dy = pos.y - screenCenter.y
		if (dx === 0 && dy === 0) return false
		let ang = Math.atan2(dy, dx)
		let norm = (a) => Math.atan2(Math.sin(a), Math.cos(a)) // (-PI, PI)

		let checkSide = (base, startIndex) => {
			let rel = norm(ang - base)
			if (rel < minAngle || rel > maxAngle) return false
			let k = Math.floor((rel - minAngle) / increment)
			k = Math.max(0, Math.min(numLanes - 1, k))
			let lane = lanes[startIndex + k]
			return lane && !lane.bossBlocked
		}

		// Right wedge (indices numLanes..2*numLanes-1)
		if (checkSide(0, numLanes)) return true
		// Left wedge (indices 0..numLanes-1)
		if (checkSide(Math.PI, 0)) return true
		return false
	}

	// Check if a world position lies within a lane blocked by a Warder.
	isPositionInBlockerLane(pos)
	{
		if (!pos) return false
		let dx = pos.x - screenCenter.x
		let dy = pos.y - screenCenter.y
		if (dx === 0 && dy === 0) return false
		let ang = Math.atan2(dy, dx)
		let norm = (a) => Math.atan2(Math.sin(a), Math.cos(a)) // (-PI, PI)

		let checkSide = (base, startIndex) => {
			let rel = norm(ang - base)
			if (rel < minAngle || rel > maxAngle) return false
			let k = Math.floor((rel - minAngle) / increment)
			k = Math.max(0, Math.min(numLanes - 1, k))
			let lane = lanes[startIndex + k]
			return lane && lane.blocked
		}

		// Right wedge (indices numLanes..2*numLanes-1)
		if (checkSide(0, numLanes)) return true
		// Left wedge (indices 0..numLanes-1)
		if (checkSide(Math.PI, 0)) return true
		return false
	}

	on_render()
	{
		if (spawnerDebug)
		{
			let timeFactor = this.getTimeFactor(this.currentFrame)
			let threatBudget = this.getThreatBudget(timeFactor)
			let line = 0
			let addLine = function(text) { typingFont.drawText(Surface.Screen, 10, 10 + typingFont.height * line, text, midGray.fadeTo(.5)); line++ }
			let min = Math.floor(timeFactor / 3600)
			let sec = Math.floor(timeFactor % 3600 / 60)
			addLine(`Adjusted Time: ${min}:${sec.toString().padStart(2, '0')}`)
			addLine(`Threat Budget: ${threatBudget}`)
			addLine(`Existing Threat: ${this.existingThreat} (${hostilesArray.length} Enemies)`)
			addLine(`Balance Threat: ${threatBudget - this.existingThreat}`)
			addLine("")
			addLine(`Next Spawn In: ${((this.currentCooldown - this.currentFrame + this.lastSpawn) / 60).toFixed(2)} sec`)
			addLine(`Average Spawn Time: ${(this.lastFiveCooldowns.reduce((t, c) => t + c, 0) / 5).toFixed(2)} sec`)
		}
	}
}
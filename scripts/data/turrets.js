import { Repeater } from "../turrets/repeater.js"
import { HeatRay } from "../turrets/heatray.js"
import { Barrage } from "../turrets/barrage.js"
import { SplatterShot } from "../turrets/splattershot.js"
import { Overmind } from "../turrets/overmind.js"
import { Wildcard } from "../turrets/wildcard.js"

export const Turrets = function()
{
	return [
		{
			icon: Repeater.getIcon(),
			name: Repeater.getName(),
			desc: Repeater.getDesc(),
			tags: Repeater.getTags(),
			requirementsMet: true,
			weapon: Repeater,
			demo: true
		},
		{
			icon: HeatRay.getIcon(),
			name: HeatRay.getName(),
			desc: HeatRay.getDesc(),
			tags: HeatRay.getTags(),
			requirementsMet: "mainWeaponsUnlocked" in save && "HeatRay" in save.mainWeaponsUnlocked,
			cost: 1000,
			weapon: HeatRay,
			demo: false
		},
		{
			icon: Barrage.getIcon(),
			name: Barrage.getName(),
			desc: Barrage.getDesc(),
			tags: Barrage.getTags(),
			requirementsMet: "mainWeaponsUnlocked" in save && "Barrage" in save.mainWeaponsUnlocked,
			cost: 1000,
			weapon: Barrage,
			demo: false
		},
		{
			icon: SplatterShot.getIcon(),
			name: SplatterShot.getName(),
			desc: SplatterShot.getDesc(),
			tags: SplatterShot.getTags(),
			requirementsMet: "mainWeaponsUnlocked" in save && "SplatterShot" in save.mainWeaponsUnlocked,
			cost: 1000,
			weapon: SplatterShot,
			demo: false
		},
		{
			icon: Overmind.getIcon(),
			name: Overmind.getName(),
			desc: Overmind.getDesc(),
			tags: Overmind.getTags(),
			requirementsMet: "mainWeaponsUnlocked" in save && "Overmind" in save.mainWeaponsUnlocked,
			cost: 1000,
			weapon: Overmind,
			demo: false
		},
		{
			icon: Wildcard.getIcon(),
			name: Wildcard.getName(),
			desc: Wildcard.getDesc(),
			tags: Wildcard.getTags(),
			requirementsMet: "mainWeaponsUnlocked" in save && "Wildcard" in save.mainWeaponsUnlocked,
			cost: 1000,
			weapon: Wildcard,
			demo: false
		}
	]
}

export const StaticMainWeaponList = {
	"Repeater": Repeater,
	"HeatRay": HeatRay,
	"Barrage": Barrage,
	"SplatterShot": SplatterShot,
	"Overmind": Overmind,
	"Wildcard": Wildcard
}
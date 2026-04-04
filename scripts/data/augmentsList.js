import { Caltrops } from "../weapons/caltrops.js"
import { DarkRelay } from "../weapons/darkRelay.js"
import { Fireball } from "../weapons/fireball.js"
import { LightningSparks } from "../weapons/lightningSparks.js"
import { Retribution } from "../weapons/retribution.js"
import { Static } from "../weapons/static.js"
import { StormBattery } from "../weapons/stormBattery.js"
import { SpawnWeapon } from "../weapons/weaponTools.js"

export const augmentCategories = [
	"augment_category_mainWeapon",
	"augment_category_drones",
	"augment_category_turret",
	"augment_category_dot",
	"augment_category_remote",
	"augment_category_electric",
	"augment_category_heat",
	"augment_category_kinetic"
]
export const augmentSteamStatNames = [
	"MainWeaponCodex",
	"DronesCodex",
	"TurretCodex",
	"DOTCodex",
	"RemoteCodex",
	"ElectricCodex",
	"HeatCodex",
	"KineticCodex"
]
export const augmentsList = function()
{
	return [

		// Codex: Main Weapon.
		{
			name: "augment_armored",
			icon: "",
			cost: [50, 200],
			desc: "augment_armored_desc",
			start_action: function(amt)
			{
				currentTurret.health = Math.round(currentTurret.health * (1 + .5 * amt))
				currentTurret.currentHealth = currentTurret.health
			}
		},
		{
			name: "augment_eager",
			icon: "",
			cost: [50],
			desc: "augment_eager_desc",
			start_action: function(amt)
			{}
		},
		{
			name: "augment_gambler",
			icon: "",
			cost: [50],
			desc: "augment_gambler_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_main", "augment_gambler", { damage: 0 })
			}
		},
		{
			name: "augment_immaculate",
			icon: "",
			cost: [100],
			desc: "augment_immaculate_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_haze",
			icon: "",
			cost: [200, 500],
			desc: "augment_haze_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("global", "augment_haze", { rateOfFire: 0 })
			}
		},
		{
			name: "augment_devotion",
			icon: "",
			cost: [200],
			desc: "augment_devotion_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_main", "augment_devotion", { damage: 1 })
			}
		},

		// Codex: Turret.
		{
			name: "augment_armada",
			icon: "",
			cost: [200],
			desc: "augment_armada_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_diversity",
			icon: "",
			cost: [50],
			desc: "augment_diversity_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier(
					"tag_drone",
					"augment_diversity",
					{
						duration: currentTurret.constructor.name == "Overmind" ? .8 : 1
					}
				)
			}
		},
		{
			name: "augment_blitzkrieg",
			icon: "",
			cost: [50],
			desc: "augment_blitzkrieg_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_retribution",
			icon: "",
			cost: [300],
			desc: "augment_retribution_desc",
			start_action: function(amt)
			{
				SpawnWeapon(Retribution)
			}
		},
		{
			name: "augment_scapegoat",
			icon: "",
			cost: [100],
			desc: "augment_scapegoat_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_spoils",
			icon: "",
			cost: [200],
			desc: "augment_spoils_desc",
			start_action: function(amt) {}
		},

		// Codex: Drones.
		{
			name: "augment_fortress",
			icon: "",
			cost: [100, 400],
			desc: "augment_fortress_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_networked",
			icon: "",
			cost: [50],
			desc: "augment_networked_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_turret", "augment_networked", { rateOfFire: 0 })
			}
		},
		{
			name: "augment_fieldIntel",
			icon: "",
			cost: [50],
			desc: "augment_fieldIntel_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_turret", "augment_fieldIntel", { range: 0 })
			}
		},
		{
			name: "augment_darkRelay",
			icon: "",
			cost: [500],
			desc: "augment_darkRelay_desc",
			start_action: function(amt)
			{
				SpawnWeapon(DarkRelay)
			}
		},
		{
			name: "augment_observer",
			icon: "",
			cost: [100],
			desc: "augment_observer_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_turret", "augment_observer", { damage: 0 })
			}
		},
		{
			name: "augment_weakness",
			icon: "",
			cost: [200],
			desc: "augment_weakness_desc",
			start_action: function(amt) {}
		},
		
		// Codex: D.O.T.
		{
			name: "augment_corrosion",
			icon: "",
			cost: [500],
			desc: "augment_corrosion_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_lamprey",
			icon: "",
			cost: [200],
			desc: "augment_lamprey_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_tenacity",
			icon: "",
			cost: [100, 300],
			desc: "augment_tenacity_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_damageOverTime", "augment_tenacity", { duration: amt * .35 })
			}
		},
		{
			name: "augment_afflictors",
			icon: "",
			cost: [50],
			desc: "augment_afflictors_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_conviction",
			icon: "",
			cost: [100],
			desc: "augment_conviction_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_damageOverTime", "augment_conviction", { rateOfFire: 0 })
			}
		},
		{
			name: "augment_infector",
			icon: "",
			cost: [300, 500],
			desc: "augment_infector_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_damageOverTime", "augment_infector", {
					kineticStatusChance: amt * .03,
					heatStatusChance: amt * .03,
					coldStatusChance: amt * .03,
					electricStatusChance: amt * .03,
					chemicalStatusChance: amt * .03
				})
			}
		},

		// Codex: Remote.
		{
			name: "augment_closeCombat",
			icon: "",
			cost: [100],
			desc: "augment_closeCombat_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_caltrops",
			icon: "",
			cost: [200],
			desc: "augment_caltrops_desc",
			start_action: function(amt) 
			{
				SpawnWeapon(Caltrops)
			}
		},
		{
			name: "augment_causticAmmo",
			icon: "",
			cost: [500],
			desc: "augment_causticAmmo_desc",
			start_action: function(amt)
			{
				modifiers.addAbsModifier("tag_remote", "augment_causticAmmo", { chemical: 0 })
			}
		},
		{
			name: "augment_piracy",
			icon: "",
			cost: [50],
			desc: "augment_piracy_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_remote", "augment_piracy", { damage: 0 })
			}
		},
		{
			name: "augment_deliverance",
			icon: "",
			cost: [100],
			desc: "augment_deliverance_desc",
			start_action: function(amt)
			{
				modifiers.addPercModifier("tag_remote", "augment_deliverance", { range: 0 })
			}
		},
		{
			name: "augment_sniper",
			icon: "",
			cost: [200],
			desc: "augment_sniper_desc",
			start_action: function(amt) {}
		},

		// Codex: Electric.

		{
			name: "augment_voltaicBurst",
			icon: "",
			cost: [200],
			desc: "augment_voltaicBurst_desc",
			start_action: function(amt)	{}
		},
		{
			name: "augment_stormBattery",
			icon: "",
			cost: [500],
			desc: "augment_stormBattery_desc",
			start_action: function(amt)
			{
				SpawnWeapon(StormBattery)
			}
		},
		{
			name: "augment_lightningSparks",
			icon: "",
			cost: [300],
			desc: "augment_lightningSparks_desc",
			start_action: function(amt)
			{
				SpawnWeapon(LightningSparks)
			}
		},
		{
			name: "augment_efficientGrid",
			icon: "",
			cost: [100],
			desc: "augment_EfficientGrid_desc",
			start_action: function(amt)	
			{
				modifiers.addPercModifier("tag_electric", "augment_efficientGrid", { duration: currentTurret.constructor.name == "Overmind" ? .9 : 1 })
			}
		},
		{
			name: "augment_violentDischarge",
			icon: "",
			cost: [300],
			desc: "augment_violentDischarge_desc",
			start_action: function(amt)
			{
				let staticWeap = SpawnWeapon(Static)
				modifiers.addPercModifier(staticWeap, "augment_violentDischarge", { damage: 1, range: 0.5 })
				staticWeap.refreshModifiers()
			}
		},
		{
			name: "augment_electrifiedTurret",
			icon: "",
			cost: [100],
			desc: "augment_electrifiedTurret_desc",
			start_action: function(amt)
			{
				modifiers.addAbsModifier(currentTurret, "augment_electrifiedTurret", { electric: 5 })
				modifiers.addPercModifier("tag_electric", "augment_electrifiedTurret", { damage: 0.1 })
			}
		},
		{
			name: "augment_pyromancy",
			icon: "",
			cost: [200],
			desc: "augment_pyromancy_desc",
			start_action: function(amt)
			{
				let existingIgnite = getExistingWeapon("Ignite")
				modifiers.addPercModifier("tag_heat", "augment_pyromancy", { damage: existingIgnite ? existingIgnite.ignitedEnemies * .02 : 0 })
			}
		},
		{
			name: "augment_cauterization",
			icon: "",
			cost: [200],
			desc: "augment_cauterization_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_furnaceCore",
			icon: "",
			cost: [100],
			desc: "augment_furnaceCore_desc",
			start_action: function(amt)
			{
				modifiers.addAbsModifier(currentTurret, "augment_furnaceCore", { heat: 5 })
				modifiers.addPercModifier("tag_heat", "augment_furnaceCore", { damage: 0.1 })
			}
		},
		{
			name: "augment_fireball",
			icon: "",
			cost: [500],
			desc: "augment_fireball_desc",
			start_action: function(amt)
			{
				SpawnWeapon(Fireball)
			}
		},
		{
			name: "augment_flameWave",
			icon: "",
			cost: [250],
			desc: "augment_flameWave_desc",
			start_action: function(amt)
			{
				ui.hud.bottom.addConsumable("augment_flameWave", 3)
			}
		},
		{
			name: "augment_blazingGlory",
			icon: "",
			cost: [50],
			desc: "augment_blazingGlory_desc",
			start_action: function(amt) {}
		},

		// Codex: Kinetic.

		{
			name: "augment_gunslinger",
			icon: "",
			cost: [500],
			desc: "augment_gunslinger_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_bloodlust",
			icon: "",
			cost: [200],
			desc: "augment_bloodlust_desc",
			start_action: function(amt) {
				let existingBleed = getExistingWeapon("Bleeding")
				modifiers.addPercModifier("tag_kinetic", "augment_bloodlust", { rateOfFire: existingBleed ? existingBleed.bleedingEnemies * .02 : 0 })
				modifiers.addPercModifier("tag_kinetic", "augment_bloodlust", { range: existingBleed ? existingBleed.bleedingEnemies * .01 : 0 })
			}
		},
		{
			name: "augment_infusedAmmo",
			icon: "",
			cost: [300],
			desc: "augment_infusedAmmo_desc",
			start_action: function(amt) {}
		},
		{
			name: "augment_scrapArmaments",
			icon: "",
			cost: [500],
			desc: "augment_scrapArmaments_desc",
			start_action: function(amt) {
				modifiers.addAbsModifier("tag_kinetic", "augment_scrapArmaments", { kinetic: 0 })
			}
		},
		{
			name: "augment_combinedArms",
			icon: "",
			cost: [100],
			desc: "augment_combinedArms_desc",
			start_action: function(amt) {
				modifiers.addPercModifier("tag_kinetic", "augment_combinedArms", { damage: currentTurret.constructor.name == "Repeater" ? .9 : 1 })
			}
		},
		{
			name: "augment_pocketTurret",
			icon: "",
			cost: [200],
			desc: "augment_pocketTurret_desc",
			start_action: function(amt) 
			{
				ui.hud.bottom.addConsumable("augment_pocketTurret", 1)
			}
		}
	]
}
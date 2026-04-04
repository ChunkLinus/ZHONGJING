import { Poet } from './poet.js'
import { Cypher } from './cypher.js'
import { Cerberus } from './cerberus.js'
import { Jormungandr } from './jormungandr.js'
import { Random } from 'sphere-runtime'
import { Gemini } from './gemini.js'

export function currentBossType()
{
    switch(missionTier)
    {
        // case 1: return Cerberus
        case 1: return Random.chance(.5) ? Gemini : Cerberus
        case 2: return Random.chance(.5) ? Cypher : Jormungandr
        case 3: return Poet
        default: return Poet
    }
}
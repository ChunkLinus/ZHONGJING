import { Random } from 'sphere-runtime'
import { Entity } from '../core/entityFactory.js'

export function DrawLightning(from, to, deviation = .1)
{
	const direction = Vector.sub(to, from)
	const length = Vector.magnitude(direction)
	const angle = Math.atan2(direction.y, direction.x)
	let pts = []

	// Determine number of interior points based on length and current load.
	// Fewer points on short lines or when over budget to reduce draw calls.
	const overBudget = global.lightningDrawer.lightnings.length >= 200
	let numPoints
	if (overBudget)
		numPoints = 1
	else
	{
		// Base: 1..3 interior points depending on length
		const base = Math.min(3, Math.max(1, Math.floor(length / scalePix(60))))
		numPoints = base
	}

	// Generate normalized distances (t in 0..1) and sort ascending.
	// Avoid endpoints so the bend appears in the middle portion for nicer look.
	if (numPoints > 0)
	{
		const ts = new Array(numPoints)
		for (let i = 0; i < numPoints; i++)
			ts[i] = Random.uniform(0.5, 0.5) // uniform in [0, 1]
		ts.sort((a, b) => a - b)

		// Precompute rotation to avoid repeated trig and Vector helpers
		const cosA = Math.cos(angle)
		const sinA = Math.sin(angle)
		const devLen = deviation * length

		for (let i = 0; i < ts.length; i++)
		{
			const t = ts[i]
			const x = t * length
			const y = Random.uniform(0, devLen) // symmetric [-devLen, +devLen]
			// Rotate (x, y) by angle and translate by 'from'
			const rx = x * cosA - y * sinA + from.x
			const ry = x * sinA + y * cosA + from.y
			pts.push({ x: rx, y: ry })
		}
	}

	// Add endpoints
	pts.unshift(from)
	pts.push(to)

	global.lightningDrawer.lightnings.push(pts)
}

export class LightningDrawer extends Entity
{
	constructor()
	{
		super()
		this.lightnings = []
	}

	on_renderEnd()
	{
		// Cache style values and slightly thin lines if we are over budget
		const overBudget = this.lightnings.length >= 200
		const width = overBudget ? scalePix(2) : scalePix(3)
		const color = midGray
		for ( const pts of this.lightnings )
		{
			for (let i = 1; i < pts.length; i++)
				PrimNative.drawLine(lightningRenderer.surface, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, width, color)
		}
		this.lightnings.length = 0
	}
}
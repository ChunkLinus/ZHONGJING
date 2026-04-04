import { Random } from 'sphere-runtime'

export function calcRandomInboundsDistance(normalizedStartDirection, minDistanceFromCenter, maxDistanceFromCenter) {
	// On Omen VI, cap max distance to stay within visible range (650px before fade starts)
	if (omenLevel >= 6)
		maxDistanceFromCenter = Math.min(maxDistanceFromCenter, scalePix(650))

	// Sanity check if min distance is not within bounds, return smallest possible
	let destination = Vector.add(global.screenCenter, Vector.mult(normalizedStartDirection, minDistanceFromCenter))
	if (!isInActiveBounds(destination))
	{
		return destination
	}

	do {
		let distanceFromCenter = Random.discrete(minDistanceFromCenter, maxDistanceFromCenter)
		destination = Vector.add(global.screenCenter, Vector.mult(normalizedStartDirection, distanceFromCenter))
	} while (!isInActiveBounds(destination))

	return destination
}

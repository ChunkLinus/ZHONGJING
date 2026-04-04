/**
 * Avoid Overlap - WebCola-inspired 1D constraint solver
 * Horizontal-only separation using sorted constraint propagation.
 */

/**
 * Check if two items actually overlap (both X and Y)
 */
function overlaps(a, b) {
	const aLeft = a.newCenter - a.width * 0.5
	const aRight = a.newCenter + a.width * 0.5
	const bLeft = b.newCenter - b.width * 0.5
	const bRight = b.newCenter + b.width * 0.5
	
	// Check X overlap
	if (aRight <= bLeft || bRight <= aLeft) return false
	// Check Y overlap
	if (a.bottom <= b.top || b.bottom <= a.top) return false
	return true
}

/**
 * Resolve overlaps for a list of items with Matter.js bounds.
 * 
 * @param {Array} items - Array of { bounds, priority, entity }
 * @param {Object} options - { maxOffset: number }
 * @returns {Map} Map of entity -> { x, y } offset
 */
export function resolveOverlaps(items, options = {}) {
	const maxOffset = options.maxOffset || 100
	const n = items.length
	
	// Initialize offsets
	const offsets = new Map()
	for (let i = 0; i < n; i++) {
		offsets.set(items[i].entity, { x: 0, y: 0 })
	}
	
	if (n < 2) return offsets
	
	// Create working array with computed positions
	const work = items.map(item => ({
		entity: item.entity,
		left: item.bounds.min.x,
		right: item.bounds.max.x,
		top: item.bounds.min.y,
		bottom: item.bounds.max.y,
		center: (item.bounds.min.x + item.bounds.max.x) * 0.5,
		width: item.bounds.max.x - item.bounds.min.x,
		newCenter: (item.bounds.min.x + item.bounds.max.x) * 0.5
	}))
	
	// Sort by center X position
	work.sort((a, b) => a.center - b.center)
	
	// Iterative resolution - keep resolving until no overlaps or max iterations
	for (let iter = 0; iter < 5; iter++) {
		let anyOverlap = false
		
		// Check all pairs and push apart if overlapping
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const a = work[i]
				const b = work[j]
				
				if (!overlaps(a, b)) continue
				anyOverlap = true
				
				// Calculate X overlap amount
				const aLeft = a.newCenter - a.width * 0.5
				const aRight = a.newCenter + a.width * 0.5
				const bLeft = b.newCenter - b.width * 0.5
				const bRight = b.newCenter + b.width * 0.5
				
				const overlapAmount = Math.min(aRight, bRight) - Math.max(aLeft, bLeft) + 2
				
				// Push apart: left item goes left, right item goes right
				if (a.newCenter <= b.newCenter) {
					a.newCenter -= overlapAmount * 0.5
					b.newCenter += overlapAmount * 0.5
				} else {
					b.newCenter -= overlapAmount * 0.5
					a.newCenter += overlapAmount * 0.5
				}
			}
		}
		
		if (!anyOverlap) break
	}
	
	// Calculate final offsets
	for (const item of work) {
		let offsetX = item.newCenter - item.center
		offsetX = Math.max(-maxOffset, Math.min(maxOffset, offsetX))
		offsets.set(item.entity, { x: offsetX, y: 0 })
	}
	
	return offsets
}

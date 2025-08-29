export const resourceTiers = {
    1: "Basic",
    2: "Intermediate",
    3: "Advanced",
}

// Raw resource declarations without tier (tier will be inferred from components)
const rawResources = [
    {
        name: "iron",
        label: "Iron Ore",
        components: [],
        min: 5,
        icon: "🪨",
    },
    {
        name: "coal",
        label: "Coal",
        min: 10,
        components: [],
        icon: "🪨",
    },
    {
        name: "oil",
        label: "Crude Oil",
        components: [],
        icon: "🛢️",
        min: 5,
    },
    {
        name: "steel",
        label: "Steel",
        components: ["iron", "coal"],
        icon: "🔩",
    },
    {
        name: "plastics",
        label: "Plastics",
        components: ["oil", "coal"],
        icon: "🧴",
    },
    {
        name: "consumer_goods",
        label: "Consumer Goods",
        components: ["steel", "plastics"],
        icon: "📱",
    },
]

// Build a quick lookup map
const rawMap = Object.fromEntries(rawResources.map(r => [r.name, r]))

// Detect & compute tiers recursively with memoization and cycle detection
const tierCache = {}
const visiting = new Set()
function computeTier(name) {
    if (tierCache[name]) return tierCache[name]
    const res = rawMap[name]
    if (!res) throw new Error(`Unknown resource referenced in components: ${name}`)
    if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving resource: ${name}`)
    }
    if (!res.components || res.components.length === 0) {
        tierCache[name] = 1
        return 1
    }
    visiting.add(name)
    const compTiers = res.components.map(c => computeTier(c))
    visiting.delete(name)
    const t = Math.max(...compTiers) + 1
    tierCache[name] = t
    return t
}

// Compute all tiers
rawResources.forEach(r => computeTier(r.name))

// Expand resourceTiers labels if new tiers beyond predefined exist
const maxTier = Math.max(...Object.values(tierCache))
for (let t = 4; t <= maxTier; t++) {
    if (!resourceTiers[t]) resourceTiers[t] = `Tier ${t}`
}

export const resources = rawResources.map(r => ({ ...r, tier: tierCache[r.name] }))

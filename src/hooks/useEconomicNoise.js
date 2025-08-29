import { useEffect, useRef, useCallback } from 'react'
import {useLocalStorage} from "./useWebStorage.js";

/**
 * useEconomicNoise
 * Introduces periodic random perturbations to resource values.
 * - Resources farther above their minimum are more likely to decrease.
 * - Resources near their minimum are more likely to increase.
 * - Small percentage step (2% of current value, min 1) applied per tick.
 * - Each tick only a subset (50%) of resources is considered to reduce churn.
 *
 * Signature: useEconomicNoise(byTier, values, histories, setResourceValue) -> toggleFn
 * Calling the returned function toggles the noise on/off.
 */
const useEconomicNoise = (byTier, values, histories, setResourceValue, ignoreMin, noiseInterval = 5000, paused = false) => {
  const [active, setActive] = useLocalStorage('noiseActive', false)
  const intervalRef = useRef(null)
  const dataRef = useRef({ byTier, values })
  dataRef.current = { byTier, values }

  const computeAdjustment = useCallback((res) => {
    const { min, value, name } = res

    // 40% chance no adjustment
    const rand = Math.random()
    if (rand < 0.4) return { name, next: value }

    if (ignoreMin) {
      // As the value gets farther from the min in either direction, it should be less likely to change further in that direction.
      // So we use a simple linear probability based on distance from 1 (the absolute minimum).
      const aboveMinPercentage = Math.abs(value - min) / min // e.g. 0 = at min, 1 = double min, 2 = triple min
      const pDown = 0.5 + 0.4 * aboveMinPercentage
      const rand = Math.random()
      const towardsMin = value > min ? -1 : 1
      const direction = rand < pDown ? towardsMin : -towardsMin

      let target = value + direction
      if (target < 1) target = 1
      if (target === value) return null

      return { name, next: target }
    } else {
      const aboveMinPercentage = (value - min) / min // e.g. 0 = at min, 1 = double min, 2 = triple min
      const pDown = 0.1 + 0.8 * aboveMinPercentage // 10% to 90% chance to go down
      const rand = Math.random()
      const direction = rand < pDown ? -1 : 1
      let target = value + direction
      if (target < min) target = min
      if (target === value) return null

      return {name, next: target}
    }
  }, [ignoreMin])

  const tick = useCallback(() => {
    const { byTier } = dataRef.current
    if (!byTier) return
    const resources = Object.values(byTier).flatMap(t => t.resources || [])
    if (!resources.length) return
    for (const res of resources) {
      const adj = computeAdjustment(res)
      if (adj) {
        setResourceValue(adj.name, adj.next)
      }
    }
  }, [computeAdjustment])

  useEffect(() => {
    // Always clear any existing interval before (re)starting
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!active || paused) return
    intervalRef.current = setInterval(tick, noiseInterval)
    tick() // immediate tick
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [active, tick, noiseInterval, paused])

  const toggle = useCallback(() => setActive(a => !a), [])

  return { toggle, active }
}

// Notes:
// - histories parameter is currently unused, but kept in signature for future enhancements (e.g., volatility tracking).
export default useEconomicNoise

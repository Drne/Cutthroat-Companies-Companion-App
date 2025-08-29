// This hook responsible for managing resource state in the application.
// It exposes the values/setter for resources
// It also exposes the max/min for a resource based on its tier

// the output of this hook is by tier, and will be used to render the resources in columns

import {useMemo, useState, useCallback, useEffect} from 'react'
import { resources as resourceData, resourceTiers } from '../constants/resources'
import useEconomicNoise from "./useEconomicNoise.js";
import {useLocalStorage} from "./useWebStorage.js";

// Build dependency lookup: componentName -> array of resources that depend on it
const resourceMap = Object.fromEntries(resourceData.map(r => [r.name, r]))
const dependentsMap = {}
for (const r of resourceData) {
  if (r.components) {
    for (const c of r.components) {
      if (!dependentsMap[c]) dependentsMap[c] = []
      dependentsMap[c].push(r.name)
    }
  }
}

/**
 * useResources
 * Manages resource values and exposes structured data grouped by tier.
 * min = doubled sum of current (or building) values of its components (2 * Σ component.value); if no components, min = 5.
 * Initial value defaults to min.
 *
 * Returned shape:
 * {
 *   byTier: {
 *     [tierNumber]: {
 *        tier: number,
 *        label: string,
 *        resources: [
 *          { name, label, tier, components, icon, value, setValue, min, max }
 *        ]
 *     }
 *   },
 *   values: { [resourceName]: number },
 *   histories: { [resourceName]: number[] },
 *   setResourceValue: (name, valueOrUpdater) => void,
 *   undoResourceValue: (name) => void
 * }
 */
export function useResources(config = {}) {
  const { noiseIntervalMs = 5000, paused = false } = config;
  const [ignoreMin, setIgnoreMin] = useLocalStorage('ignoreMin',false);
  const [resourceBases, setResourceBases] = useLocalStorage('resourceBases', () => { {
    // All resources have a base of 5, or what's been set in ResourceData
    const init = {}
    for (const r of resourceData) {
        init[r.name] = r.min || 5
    }
    return init
    }})

  // helper to compute dynamic min based on current (or building) values map
  const computeMin = useCallback((resource, currentValues) => {
    if (!resource.components || resource.components.length === 0) {
      return resource.min || 5
    }
    let sum = 0
    for (const c of resource.components) {
      sum += currentValues ? currentValues[c] : 0
    }
    return sum
  }, [])

  // map resource name -> value (initial = min)
  const [values, setValues] = useLocalStorage('resourceValues',{});

  // Setup inital resource values if not already present
    useEffect(() => {
        setValues(prevVals => {
            if (prevVals && Object.keys(prevVals).length === resourceData.length) return prevVals
            const newVals = { ...prevVals }
            for (const r of resourceData) {
            if (typeof newVals[r.name] !== 'number') {
                newVals[r.name] = computeMin(r, newVals)
            }
            }
            return newVals
        })
    }, [setValues, computeMin])

  // history: array of past values (including initial) for each resource
  const [histories, setHistories] = useLocalStorage('resourceHistory',() => {
    const init = {}
    const tempVals = {}
    for (const r of resourceData) {
      const v = computeMin(r, tempVals)
      tempVals[r.name] = v
      init[r.name] = [v]
    }
    return init
  })
  // stack of grouped change actions for global undo (each entry = { changes: [{name, prevValue, nextValue, cascading?}] })
  const [actionLog, setActionLog] = useLocalStorage('actionLog',[])

  // builder for fresh initial state (kept inside to use current computeMin impl)
  const buildInitial = useCallback(() => {
    const initVals = {}
    for (const r of resourceData) initVals[r.name] = computeMin(r, initVals)
    const initHist = {}
    for (const r of resourceData) initHist[r.name] = [initVals[r.name]]
    return { initVals, initHist }
  }, [computeMin])

  const getBounds = useCallback((resource) => ({
    min: computeMin(resource, values),
    // max removed
  }), [computeMin, values])

  const setResourceValue = useCallback((name, valueOrUpdater) => {
    const resource = resourceMap[name]
    if (!resource) return
    const { min } = getBounds(resource)

    const cascadeAdjustments = [] // {name, prevValue, nextValue}
    let primaryChange = null

    setValues(prevVals => {
      const prevValue = prevVals[name]
      let nextValue = typeof valueOrUpdater === 'function' ? valueOrUpdater(prevValue) : valueOrUpdater
      if (typeof nextValue === 'string' && nextValue.trim() !== '') {
        const parsed = Number(nextValue)
        if (!Number.isNaN(parsed)) nextValue = parsed
      }
      if (typeof nextValue !== 'number' || Number.isNaN(nextValue)) return prevVals
      if (!ignoreMin && nextValue < min) nextValue = min
      // if (nextValue === prevValue) return prevVals

      // Apply primary change
      const newVals = { ...prevVals, [name]: nextValue }
      primaryChange = { name, prevValue, nextValue }

      // Only cascade if value increased AND we are respecting minimums
      if (!ignoreMin && nextValue > prevValue) {
        const queue = [name]
        const visited = new Set([name])
        while (queue.length) {
          const current = queue.shift()
          const dependents = dependentsMap[current] || []
          for (const depName of dependents) {
            const depResource = resourceMap[depName]
            if (!depResource) continue
            const depMin = computeMin(depResource, newVals)
            const depPrev = newVals[depName]
            if (depPrev < depMin) {
              newVals[depName] = depMin
              cascadeAdjustments.push({ name: depName, prevValue: depPrev, nextValue: depMin })
              if (!visited.has(depName)) {
                queue.push(depName)
                visited.add(depName)
              }
            }
          }
        }
      }
      // Update histories & action log after state mutation
      if (primaryChange) {
        const grouped = [primaryChange, ...cascadeAdjustments.map(a => ({ ...a, cascading: true }))]
        setHistories(prevHist => {
          const updated = { ...prevHist }
          for (const ch of grouped) {
            const arr = updated[ch.name] || []
            updated[ch.name] = [...arr, ch.nextValue]
          }
          return updated
        })
        setActionLog(prev => [...prev, { changes: grouped }])
      }

      return newVals
    })
  }, [getBounds, setActionLog, setValues, setHistories, computeMin, ignoreMin])

  useEffect(() => {
    // if ignore min is turned off, ensure all resources meet min
    if (ignoreMin) return
    setValues(prevVals => {
      let changed = false
      const newVals = { ...prevVals }
      for (const r of resourceData) {
        const { min } = getBounds(r)
        const v = prevVals ? prevVals[r.name] : 0
        if (v < min) {
          newVals[r.name] = min
          changed = true
          // Also update history
          setHistories(prevHist => {
            const arr = prevHist[r.name] || []
            if (arr[arr.length - 1] !== min) {
              return { ...prevHist, [r.name]: [...arr, min] }
            }
            return prevHist
          })
          // Log action
          setActionLog(prev => [...prev, { changes: [{ name: r.name, prevValue: v, nextValue: min }] }])
        }
      }
      return changed ? newVals : prevVals
    })
  }, [ignoreMin]);

  const undoLastChange = useCallback(() => {
    setActionLog(prev => {
      if (!prev.length) return prev
      const newLog = prev.slice(0, -1)
      const lastGroup = prev[prev.length - 1]
      const changes = (lastGroup.changes || []).slice().reverse() // reverse to revert dependents first

      // Revert values
      setValues(vals => {
        const updated = { ...vals }
        for (const ch of changes) {
          updated[ch.name] = ch.prevValue
        }
        return updated
      })

      // Update histories robustly
      setHistories(hPrev => {
        const updated = { ...hPrev }
        // Track resources touched to avoid duplicate work
        const touched = new Set(changes.map(c => c.name))
        for (const name of touched) {
          const relevant = changes.filter(c => c.name === name)
          const lastAppliedNextValues = new Set(relevant.map(r => r.nextValue))
          let arr = updated[name] || []
          // Remove tail entries that match any of the nextValues we are undoing (could be multiple if future batching differs)
          while (arr.length && lastAppliedNextValues.has(arr[arr.length - 1])) {
            arr = arr.slice(0, -1)
          }
          updated[name] = arr
        }
        return updated
      })
      return newLog
    })
  }, [])

  const byTier = useMemo(() => {
    const tiers = {}
    for (const r of resourceData) {
      const { min } = getBounds(r)
      if (!tiers[r.tier]) {
        tiers[r.tier] = {
          tier: r.tier,
          label: resourceTiers[r.tier],
          resources: [],
        }
      }
      tiers[r.tier].resources.push({
        ...r,
        min,
        value:  values ? values[r.name] : 0,
        history: histories[r.name] || [],
        canUndo: (histories[r.name] || []).length > 1,
        setValue: (v) => setResourceValue(r.name, v),
      })
    }
    return tiers
  }, [values, histories, setResourceValue, getBounds])

  const { toggle, active} = useEconomicNoise(byTier, values, histories, setResourceValue, ignoreMin, noiseIntervalMs, paused);

  const resetResources = useCallback(() => {
    const { initVals, initHist } = buildInitial()
    setValues(initVals)
    setHistories(initHist)
    setActionLog([])
  }, [buildInitial])

  const increaseBase = useCallback((resource, baseValue) => {

  })

  return {
    byTier,
    values,
    histories,
    setResourceValue,
    undoLastChange,
    canUndoLastChange: actionLog.length > 0,
    resetResources,
    toggleNoise: toggle,
    isNoiseActive: active,
    ignoringMin: ignoreMin,
    toggleIgnoreMin: () => setIgnoreMin(i => !i),
    resourceBases,
  }
}

export default useResources;

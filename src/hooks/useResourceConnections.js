/**
 * useResourceConnections
 * Computes curved SVG connection paths between resource boxes based on their DOM positions.
 * Exposes:
 *  - containerRef: ref for the wrapping stage element
 *  - getResourceRef(name): ref callback to assign to each resource wrapper
 *  - connections: [{ from, to, path }]
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export function useResourceConnections(resourceList) {
  const containerRef = useRef(null)
  const resourceRefs = useRef({})
  const [connections, setConnections] = useState([])

  // Returns a ref callback for a given resource name
  const getResourceRef = useCallback((name) => (el) => {
    if (el) resourceRefs.current[name] = el; else delete resourceRefs.current[name]
  }, [])

  const computeConnections = useCallback(() => {
    if (!containerRef.current) return
    const containerBox = containerRef.current.getBoundingClientRect()

    // Collect bounding boxes for each tracked resource element
    const boxes = {}
    for (const [name, el] of Object.entries(resourceRefs.current)) {
      const rect = el.getBoundingClientRect()
      boxes[name] = {
        x: rect.left - containerBox.left,
        y: rect.top - containerBox.top,
        width: rect.width,
        height: rect.height,
      }
    }

    // Build bezier curves from each component to its dependent resource
    const paths = []
    for (const res of resourceList) {
      if (!res.components?.length) continue
      const targetBox = boxes[res.name]
      if (!targetBox) continue
      for (const comp of res.components) {
        const sourceBox = boxes[comp]
        if (!sourceBox) continue
        const x1 = sourceBox.x + sourceBox.width
        const y1 = sourceBox.y + sourceBox.height / 2
        const x2 = targetBox.x
        const y2 = targetBox.y + targetBox.height / 2
        const dx = Math.max(60, (x2 - x1) * 0.5)
        const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
        paths.push({ from: comp, to: res.name, path })
      }
    }
    setConnections(paths)
  }, [resourceList])

  // Recompute on mount + resize
  useEffect(() => {
    computeConnections()
    const handle = () => computeConnections()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [computeConnections])

  return { containerRef, getResourceRef, connections }
}

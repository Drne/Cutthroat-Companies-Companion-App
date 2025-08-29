import NumberFlow from '@number-flow/react'
import styled from 'styled-components'
import {useCallback, useRef, useMemo, useEffect, useState} from 'react'
import clsx from 'clsx/lite'


export const ResourceBox = ({ name, value, setValue, step = 1, min = 0, history = [], ignoreMin, resourceBase }) => {
    // Clamp now only enforces the minimum (unless ignoreMin is true)
    const clamp = useCallback((v) => {
        if (ignoreMin) return v;
        return Math.max(min, v);
    }, [min, ignoreMin])
    const inc = useCallback(() => setValue(prev => clamp((typeof prev === 'number' ? prev : value) + step)), [setValue, value, step, clamp])
    const dec = useCallback(() => setValue(prev => clamp((typeof prev === 'number' ? prev : value) - step)), [setValue, value, step, clamp])

    // direction memo removed; we now manage a transient flash direction state
    const [flashDir, setFlashDir] = useState(0) // 1 = up (green), -1 = down (red)
    useEffect(() => {
        if (history.length < 2) return
        const prev = history[history.length - 2]
        if (typeof prev !== 'number') return
        const diff = value - prev
        if (diff !== 0) {
            setFlashDir(diff > 0 ? 1 : -1)
            const t = setTimeout(() => setFlashDir(0), 1000) // hold color 1s, then fade to base
            return () => clearTimeout(t)
        }
    }, [value, history])

    const formatterRef = useRef(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }))
    const minFormatted = formatterRef.current.format(min)

    // Build sparkline graph paths from history
    const gradientIdRef = useRef(`hist-grad-${Math.random().toString(36).slice(2)}`)
    const graph = useMemo(() => {
        let h = Array.isArray(history) ? history.filter(v => typeof v === 'number' && !Number.isNaN(v)) : []
        if (h.length < 2) return null
        // only take a max of the last 30 points
        if (h.length > 20) h = h.slice(-30)
        let minV = Math.min(...h)
        let maxV = Math.max(...h)
        if (maxV === minV) maxV = minV + 1
        const range = maxV - minV
        const pts = h.map((v,i) => {
            const x = (i / (h.length - 1)) * 100
            const y = (1 - (v - minV)/range) * 100
            return [x,y]
        })
        const linePath = pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
        const areaPath = `${linePath} L100,100 L0,100 Z`
        return { linePath, areaPath }
    }, [history])

    return (
        <Card role="group" aria-label={`${name} value`}>
            <TopSection>
                <Label>{name}</Label>
                <ValueWrapper>
                     <NumberFlow
                         value={value}
                         integer
                         prefix="$"
                         className={clsx(
                             '~text-lg/2xl transition-colors',
                             flashDir !== 0 ? 'duration-300' : 'duration-long',
                             flashDir < 0 ? 'text-red-500' : flashDir > 0 ? 'text-emerald-500' : undefined
                         )}
                     />
                    <MinRow aria-label={`Minimum ${name} value ${minFormatted}`}>
                        <MinPill>
                            {!ignoreMin && 'Min '}
                            <NumberFlow
                                // style={{ width: '40px'}}
                                value={min}
                                integer
                                prefix="$"
                            />
                        </MinPill>
                    </MinRow>
                </ValueWrapper>
                <Controls>
                    <ControlButton type="button" onClick={inc} aria-label={`Increase ${name}`}>+</ControlButton>
                    <ControlButton type="button" onClick={dec} aria-label={`Decrease ${name}`}>−</ControlButton>
                </Controls>
            </TopSection>
            {graph && (
                <GraphSection aria-hidden="true">
                    <GraphSvg viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={gradientIdRef.current} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={graph.areaPath} fill={`url(#${gradientIdRef.current})`} opacity={0.25} />
                        <path d={graph.linePath} fill="none" stroke="#0f172a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
                    </GraphSvg>
                </GraphSection>
            )}
        </Card>
    )
}

// Styled Components
const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5em; /* tighter vertical rhythm */
  font-size: clamp(0.6rem, 0.55rem + 0.028125vw, 1rem);
  position: relative;
  background: linear-gradient(145deg, #ffffff, #f1f4f8);
  border: 1px solid #dfe5ec;
  border-radius: 1.25em;
  padding: 2em 1.5em 0.85em 1.5em; /* unified horizontal, reduced bottom */
  min-width: 11.25em;
  box-shadow: 0 0.25em 0.625em rgba(0,0,0,0.04), 0 0.125em 0.25em rgba(0,0,0,0.06);
  transition: box-shadow .25s, transform .25s;
  font-family: system-ui, sans-serif;
  &:hover { box-shadow: 0 0.375em 1.125em rgba(0,0,0,0.08), 0 0.1875em 0.375em rgba(0,0,0,0.08); transform: translateY(-0.125em); }
`

const TopSection = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.65em;
`

const GraphSection = styled.div`
  position: relative;
  width: 100%;
  height: 3em; /* balanced sparkline height */
  padding: 0 0.25em 0.25em 0.25em;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: flex-end;
`

const GraphSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`

const Label = styled.div`
  position: absolute;
  top: 0;
  left: .2em;
  transform: translateY(-150%);
  background: #ffffff;
  border: 1px solid #d7dee5;
  padding: 0.125em 0.75em 0.2em;
  font-size: 1em;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  border-radius: 999px;
  color: #475569;
  box-shadow: 0 0.125em 0.25em rgba(0,0,0,0.06);
  pointer-events: none;
`

const ValueWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4em;
    font-size: 3.25em; /* slightly smaller for improved balance with new spacing */
    color: #0f172a;

    .text-red-500 {
        color: #dc2626;
    }

    .text-emerald-500 {
        color: #16a34a;
    }

    .duration-300 {
        transition-duration: 300ms
    }

    .duration-long {
        transition-duration: 3000ms
    }
`

const MinRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.75em;
  font-weight: 500;
  color: #475569;
`

const MinPill = styled.span`
  background: linear-gradient(135deg, #eef2f6, #e2e8f0);
    width: max-content;
  border: 1px solid #c8d1db;
  padding: 0.15em 0.65em 0.25em;
  border-radius: 999px;
  font-size: 0.85em;
  letter-spacing: .5px;
  text-transform: uppercase;
  font-weight: 600;
  color: #334155;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
`

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5em;
`

const ControlButton = styled.button`
  width: 4em;
  height: 4em;
  border-radius: 0.7em;
  border: 1px solid #d3dae2;
  background: #ffffff;
  font-size: 1.1em;
  font-weight: 600;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #334155;
  transition: background .2s, box-shadow .2s, transform .15s;
  box-shadow: 0 0.125em 0.25em rgba(0,0,0,0.05);
  &:hover { background: #f1f5f9; }
  &:active { transform: scale(.94); background: #e2e8f0; }
  &:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
  &:disabled { opacity: .4; cursor: not-allowed; }
`

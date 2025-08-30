import React, {useMemo, useState, useEffect, useRef} from 'react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import { resources as allResources } from '../constants/resources'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import NumberFlow from "@number-flow/react";

/*
Contract Component
Props:
    - value: The (internal) value / difficulty score of the contract
    - reward: The reward for completing the contract
    - resources: A dictionary of resources required { resourceName: quantity }
    - id: Unique identifier for the contract
 */
export const Contract = ({ reward, resources, id, label, onComplete, decay, onDecay, decayTime = 15000, paused = false, currentValues }) => {
    const [confirming, setConfirming] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [decayed, setDecayed] = useState(false)
    const [progress, setProgress] = useState(0) // 0..1
    const decayCalledRef = useRef(false)

    const metaMap = useMemo(() => Object.fromEntries(allResources.map(r => [r.name, r])), [])
    const resourceEntries = useMemo(() => {
        if (!resources) return []
        return Object.entries(resources).map(([name, qty]) => ({ name, qty, meta: metaMap[name] }))
            .sort((a,b) => (a.meta?.tier||0) - (b.meta?.tier||0) || a.name.localeCompare(b.name))
    }, [resources, metaMap])

    const currentMarketValue = useMemo(() => {
        if (!currentValues) return 0
        return resourceEntries.reduce((sum, r) => sum + (currentValues[r.name] || 0) * r.qty, 0)
    }, [currentValues, resourceEntries])

    // Start / advance decay progress
    useEffect(() => {
        if (paused) return // freeze progress
        if (!decay || completed || decayed || !onDecay) return
        // Recompute decayStart so that progress resumes smoothly after pause
        const effectiveStart = performance.now() - progress * decayTime
        let frame
        const loop = (now) => {
            const elapsed = now - effectiveStart
            const p = Math.min(1, elapsed / decayTime)
            setProgress(p)
            if (p >= 1) {
                if (!decayCalledRef.current) {
                    decayCalledRef.current = true
                    setDecayed(true)
                    onDecay(id)
                }
                return
            }
            frame = requestAnimationFrame(loop)
        }
        frame = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(frame)
    }, [decay, decayTime, completed, decayed, onDecay, id, paused])

    const handleActivate = () => {
        if (!onComplete) return
        if (!confirming) {
            setConfirming(true)
        } else {
            onComplete(id)
            setConfirming(false)
            setCompleted(true)
        }
    }
    const handleKey = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleActivate()
        } else if (e.key === 'Escape') {
            setConfirming(false)
        }
    }
    const cancel = (e) => { e.stopPropagation(); setConfirming(false) }

    return (
        <Card
            layout
            role="button"
            aria-pressed={confirming}
            aria-label={`Contract ${label}${confirming ? ' confirm completion' : ''}`}
            id={`contract-${id}`}
            tabIndex={id}
            onClick={handleActivate}
            onKeyDown={handleKey}
            data-confirm={confirming || undefined}
            transition={{ duration: 1, type: 'spring', stiffness: 100, damping: 20 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', justifyContent: 'start', gap: '.2rem', width: '100%' }}>
                <Badge title="Contract type">{label}</Badge>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'nowrap', marginTop: '.1rem' }}>
                <Reward title="Reward" aria-label="Reward">
                    <RewardValue >${reward ?? 0}</RewardValue>
                </Reward>
                <MarketReward title="Market Value" aria-label="Market Value (current sum of required resources)">
                    <MarketValue>
                        <NumberFlow value={currentMarketValue ?? 0} prefix="$" />
                    </MarketValue>
                </MarketReward>
                </div>
            </div>
            {decay && !completed && !decayed && (
                <InlineProgress aria-label={`Time remaining ${(1-progress)*decayTime/1000 | 0} seconds`}>
                    <CircularProgressbar
                        value={Math.floor(progress * 100)}
                        strokeWidth={12}
                        text={`${Math.max(0, Math.ceil((1 - progress) * decayTime / 1000))}`}
                        styles={buildStyles({
                            pathColor: progress < 0.7 ? '#1d4ed8' : progress < 0.9 ? '#f59e0b' : '#dc2626',
                            trailColor: '#e2e8f0',
                            textColor: '#0f172a',
                            textSize: '34px'
                        })}
                    />
                </InlineProgress>
            )}
            <ReqRow aria-label="Required resources" role="list">
                {resourceEntries.length === 0 && <Empty>No resources</Empty>}
                {resourceEntries.map(r => {
                    const tier = r.meta?.tier || 1
                    return (
                        <ResPill role="listitem" key={r.name} data-tier={tier} title={`${r.meta?.label || r.name} (Tier ${tier})  x${r.qty}`}>
                            <Dot data-tier={tier} />
                            <span>{r.meta?.icon || '📦'}</span>
                            <abbr>{r.meta?.label || r.name}</abbr>
                            <strong>{r.qty}</strong>
                        </ResPill>
                    )
                })}
            </ReqRow>
            {confirming && (
                <ConfirmBar role="alert" aria-live="assertive" onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: '1rem' }}>Complete?</span>
                    <ConfirmButtons>
                        <ConfirmBtn type="button" onClick={(e)=>{ e.stopPropagation(); onComplete && onComplete(id); setConfirming(false) }} aria-label="Confirm contract completion">Yes</ConfirmBtn>
                        <CancelBtn type="button" onClick={cancel} aria-label="Cancel completion">No</CancelBtn>
                    </ConfirmButtons>
                </ConfirmBar>
            )}
        </Card>
    )
}

// Compact Styled components
const Card = styled(motion.div)`
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:.5rem;
  padding:.55rem .7rem;
  background:#fff;
  border:1px solid #d9e1e8;
  border-radius:.75rem;
  font-family: system-ui, sans-serif;
  font-size:12px;
  line-height:1.1;
  box-shadow:0 1px 2px rgba(0,0,0,.06);
  max-width:100%;
  cursor:pointer;
  position:relative;
  outline:none;
  &:focus-visible { box-shadow:0 0 0 2px #1d4ed8, 0 0 0 4px #bfdbfe; }
  &[data-confirm] { border-color:#047857; box-shadow:0 0 0 1px #047857, 0 2px 10px rgba(0,0,0,.25); }
`;

const Badge = styled.span`
  background:#1d4ed8;
  color:#fff;
  margin-right: 2.2rem; /* space for spinner */
  font-weight:600;
  padding:.25rem .55rem .3rem;
  border-radius:.5rem;
  font-size:.8rem;
  letter-spacing:.5px;
  text-transform:uppercase;
  white-space:nowrap;
`;

const ReqRow = styled.div`
  display:flex;
  align-items:center;
  gap:.4rem;
  flex-wrap:wrap;
`;

const ResPill = styled.span`
  display:inline-flex;
  align-items:center;
  gap:.3rem;
  background:#f8fafc;
  border:1px solid #e2e8f0;
  padding:.25rem .45rem .3rem .4rem;
  border-radius:.55rem;
  font-weight:500;
  font-size:1rem;
  letter-spacing:.3px;
  white-space:nowrap;
  abbr { text-decoration:none; }
  strong { font-size:.65rem; font-weight:700; background:#e2e8f0; padding:.1rem .35rem .2rem; border-radius:.4rem; }
  &[data-tier="2"] { background:#eff6ff; border-color:#dbeafe; }
  &[data-tier="3"] { background:#fff7ed; border-color:#ffedd5; }
  &[data-tier="4"] { background:#fefce8; border-color:#fef9c3; }
`;

const Dot = styled.i`
  width:.5rem; height:.5rem; border-radius:50%; display:block; background:#94a3b8;
  &[data-tier="2"] { background:#3b82f6; }
  &[data-tier="3"] { background:#f59e0b; }
  &[data-tier="4"] { background:#eab308; }
`;

const Reward = styled.div`
  background:#047857;
  color:#fff;
  /* Unified pill sizing */
  display:inline-flex;
  align-items:center;
  gap:.25rem;
  padding:0 .6rem; /* horizontal only */
  min-height:1.6rem; /* fixed consistent height */
  border-radius:.55rem;
  font-weight:600;
  font-size:.65rem;
  line-height:1; /* prevent extra vertical expansion */
  flex-shrink:0;
`;

const RewardValue = styled.div`
  font-weight:600; font-size:.85rem; letter-spacing:.5px;
  display:flex; align-items:center; line-height:1; /* align numeral vertically */
`;

// Distinct styling for the market value pill
const MarketReward = styled(Reward)`
  background:#7c3aed; /* violet */
  box-shadow:0 0 0 1px #6d28d9 inset;
`;
const MarketValue = styled(RewardValue)`
  color:#fff;
  .nf-root { font-size:.85rem; font-weight:600; line-height:1; display:flex; align-items:center; }
`;

const Empty = styled.span`
  font-size:.6rem; color:#64748b; font-weight:500; padding:.2rem .3rem;
`;
const ConfirmBar = styled.div`
  position:absolute;
  inset:auto .35rem .35rem .35rem;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:.5rem;
  background:#fff;
  border:1px solid #047857;
  border-radius:.55rem;
  padding:.35rem .5rem;
  font-size:.6rem;
  font-weight:600;
  color:#065f46;
  box-shadow:0 2px 6px rgba(0,0,0,.15);
`;
const ConfirmButtons = styled.div`
  display:inline-flex;
  gap:.5rem; /* increased gap for clearer separation */
`;
const ButtonBase = styled.button`
  font:inherit;
  border:1px solid #cbd5e1;
  background:#f1f5f9;
  color:#0f172a;
  padding:.45rem .9rem .5rem; /* larger tap area */
  border-radius:.55rem; /* slightly larger radius */
  cursor:pointer;
  line-height:1.1;
  font-size:.7rem; /* larger text */
  font-weight:600;
  letter-spacing:.45px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:3.25rem; /* ensure wider target */
  min-height:2.1rem; /* satisfy minimum touch height */
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
  transition: background .18s, transform .18s, box-shadow .18s;
  &:hover { background:#e2e8f0; }
  &:active { background:#cbd5e1; transform:translateY(1px); }
  &:focus-visible { outline:2px solid #1d4ed8; outline-offset:2px; }
`;
const ConfirmBtn = styled(ButtonBase)`
  background:#047857;
  border-color:#065f46;
  color:#fff;
  &:hover { background:#059669; }
  &:active { background:#047857; }
`;
const CancelBtn = styled(ButtonBase)`
  background:#f1f5f9;
`;

const InlineProgress = styled.div`
  position: absolute;
  top: .4rem;
  right: .4rem;
  width:2.1rem; height:2.1rem; display:flex; align-items:center; justify-content:center; flex-shrink:0; /* removed margin-right; spacing handled by parent gap */
  .CircularProgressbar { width:100%; height:100%; }
  .CircularProgressbar-text { font-weight:700; font-size:28px; }
`;

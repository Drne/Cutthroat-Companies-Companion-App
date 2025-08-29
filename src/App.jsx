import styled from "styled-components";
import { ResourceBox } from './components/ResourceBox.jsx'
import useResources from "./hooks/useResources.js";
import { resources as resourceList } from './constants/resources'
import { useEffect, useRef, useState, useCallback } from 'react'
import {useContracts} from "./hooks/useContracts.js";
import {Contract} from "./components/Contract.jsx";
import {AnimatePresence, LayoutGroup} from 'framer-motion'
import {SettingsPanel} from './components/SettingsPanel.jsx'
import {useLocalStorage} from "./hooks/useWebStorage.js";

function App() {
    // timing & settings state (persisted)
    const [decayTimeMs, setDecayTimeMs] = useLocalStorage('setting:decayTimeMs', 10000);
    const [noiseIntervalMs, setNoiseIntervalMs] = useLocalStorage('setting:noiseIntervalMs', 5000);
    const [contractCount, setContractCount] = useLocalStorage('setting:contractCount', 3);
    const [paused, setPaused] = useLocalStorage('setting:paused', false);
    const [minPayoutMult, setMinPayoutMult] = useLocalStorage('setting:contractRewardMin', 1);
    const [maxPayoutMult, setMaxPayoutMult] = useLocalStorage('setting:contractRewardMax', 1.4);

    const {
        byTier,
        undoLastChange,
        canUndoLastChange,
        resetResources,
        toggleNoise,
        ignoringMin,
        isNoiseActive ,
        toggleIgnoreMin,
        values,
        setResourceValue,
        resourceBases,
    } = useResources({ noiseIntervalMs, paused });
    const tierOrder = Object.keys(byTier).map(Number).sort((a,b)=>a-b)

    const { contracts, completeContract, resetContracts, onContractDecay, contractDifficulty, setContractDifficulty } = useContracts(byTier, values, setResourceValue, 50, contractCount, minPayoutMult, maxPayoutMult);

    // Refs to each resource box wrapper
    const containerRef = useRef(null)
    const resourceRefs = useRef({})

    const setResourceRef = useCallback((name, el) => {
        if (el) resourceRefs.current[name] = el; else delete resourceRefs.current[name]
    }, [])

    const [connections, setConnections] = useState([])

    const computeConnections = useCallback(() => {
        if (!containerRef.current) return
        const containerBox = containerRef.current.getBoundingClientRect()
        const boxes = {}
        Object.entries(resourceRefs.current).forEach(([name, el]) => {
            const rect = el.getBoundingClientRect()
            boxes[name] = {
                x: rect.left - containerBox.left,
                y: rect.top - containerBox.top,
                width: rect.width,
                height: rect.height,
            }
        })
        const newConns = []
        for (const res of resourceList) {
            if (!res.components || !res.components.length) continue
            const targetBox = boxes[res.name]
            if (!targetBox) continue
            for (const comp of res.components) {
                const sourceBox = boxes[comp]
                if (!sourceBox) continue
                // start at right center of source, end at left center of target
                const x1 = sourceBox.x + sourceBox.width
                const y1 = sourceBox.y + sourceBox.height / 2
                const x2 = targetBox.x
                const y2 = targetBox.y + targetBox.height / 2
                const dx = Math.max(60, (x2 - x1) * 0.5)
                const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
                newConns.push({ from: comp, to: res.name, path })
            }
        }
        setConnections(newConns)
    }, [])

    useEffect(() => {
        computeConnections()
    }, [])

    useEffect(() => {
        const onResize = () => computeConnections()
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [computeConnections])

    const [settingsTrigger, setSettingsTrigger] = useState(0)

    return (
        <AppShell>
            <OpenSettingsButton
                type="button"
                aria-label="Open settings panel"
                onClick={() => setSettingsTrigger(t => t + 1)}
            >⚙️ Settings</OpenSettingsButton>
            <SettingsPanel
                toggleNoise={toggleNoise}
                isNoiseActive={isNoiseActive}
                ignoringMin={ignoringMin}
                toggleIgnoreMin={toggleIgnoreMin}
                resetResources={() => { resetResources(); resetContracts(); }}
                undoLastChange={undoLastChange}
                canUndoLastChange={canUndoLastChange}
                contractsCount={contracts.length}
                triggerOpen={settingsTrigger}
                decayTimeMs={decayTimeMs}
                onChangeDecayTime={setDecayTimeMs}
                noiseIntervalMs={noiseIntervalMs}
                onChangeNoiseInterval={setNoiseIntervalMs}
                contractCount={contractCount}
                onChangeContractCount={setContractCount}
                paused={paused}
                onTogglePause={() => setPaused(p => !p)}
                contractDifficulty={contractDifficulty}
                onChangeContractDifficulty={setContractDifficulty}
                rewardMinMultiplier={minPayoutMult}
                rewardMaxMultiplier={maxPayoutMult}
                onChangeRewardMinMultiplier={(v)=> {
                    const clamped = Math.max(0.1, Math.min(5, v));
                    if (clamped > maxPayoutMult) setMaxPayoutMult(clamped);
                    setMinPayoutMult(clamped);
                }}
                onChangeRewardMaxMultiplier={(v)=> {
                    const clamped = Math.max(0.1, Math.min(6, v));
                    if (clamped < minPayoutMult) setMinPayoutMult(clamped);
                    setMaxPayoutMult(clamped);
                }}
            />
            <ResourceStage ref={containerRef}>
                <SvgOverlay aria-hidden="true">
                    <defs>
                        <linearGradient id="resource-conn" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#64748b"/>
                            <stop offset="100%" stopColor="#0f172a"/>
                        </linearGradient>
                    </defs>
                    {connections.map(c => (
                        <path key={c.from + '->' + c.to} d={c.path} fill="none" stroke="url(#resource-conn)" strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />
                    ))}
                </SvgOverlay>
                {tierOrder.map(tier => {
                    const tierGroup = byTier[tier]
                    if (!tierGroup) return null
                    return (
                        <ResourceColumn key={tier} aria-label={`Tier ${tierGroup.tier} ${tierGroup.label}`}> {
                            tierGroup.resources.map(r => (
                                <div key={r.name} ref={el => setResourceRef(r.name, el)}>
                                    <ResourceBox
                                        name={`${r.icon ? r.icon + ' ' : ''}${r.label}`}
                                        value={r.value}
                                        setValue={r.setValue}
                                        min={r.min}
                                        step={1}
                                        history={r.history}
                                        ignoreMin={ignoringMin}
                                        resourceBase={resourceBases[r.name]}
                                    />
                                </div>
                            ))}
                        </ResourceColumn>
                    )
                })}
            </ResourceStage>
            <ContractsWrapper>
                <LayoutGroup>
                    <AnimatePresence>
                        {contracts.map((contract, idx) => (
                            <Contract
                                key={contract.id}
                                id={contract.id}
                                {...contract}
                                paused={paused}
                                decay={idx === contracts.length - 1}
                                decayTime={decayTimeMs}
                                onDecay={() => onContractDecay(contract.id)}
                                onComplete={() => completeContract(contract.id)}
                            />
                        ))}
                    </AnimatePresence>
                </LayoutGroup>
            </ContractsWrapper>
        </AppShell>
    )
}

const AppShell = styled.div`
  display:flex;
  height:100%;
  flex-direction:column;
  position:relative;
`;

// --- Styled Layout Components ---
const ResourceColumn = styled('div')({
    display: 'flex',
    gap: '20px',
    fontSize: '24px',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: '100%',
})
const OpenSettingsButton = styled.button`
  position: absolute;
  top: 14px;
  right: 18px;
  z-index: 1;
  color:#fff;
  border:1px solid #1e40af;
  border-radius: 999px;
  font-size: 13px;
  font-weight:600;
  letter-spacing:.5px;
  padding: 10px 18px 11px;
  display:inline-flex;
  align-items:center;
  gap:.5rem;
  cursor:pointer;
  background: linear-gradient(135deg,#1d4ed8,#1e3a8a);
  box-shadow:0 4px 12px -2px rgba(0,0,0,.25),0 2px 4px rgba(0,0,0,.15);
  transition: background .25s, transform .18s, box-shadow .25s;
  &:hover { background: linear-gradient(135deg,#1d4ed8,#1e40af); }
  &:active { transform: translateY(1px); }
  &:focus-visible { outline:2px solid #fff; outline-offset:3px; }
`;

const ResourceStage = styled.main`
  flex:1;
  position:relative;
  display:flex;
  gap:40px;
  padding:70px 60px 40px; /* top padding to clear button */
  align-items:stretch;
  justify-content:space-evenly;
  overflow:auto;
`;

const SvgOverlay = styled.svg`
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  pointer-events:none;
  overflow:visible;
`;

const ContractsWrapper = styled.section`
  height:200px;
  border-top:1px solid #ccc;
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(250px,1fr));
  gap:10px;
  padding:10px;
  overflow-y:auto;
  background-color:#f9fafb;
`;

export default App;

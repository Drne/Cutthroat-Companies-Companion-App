import styled from "styled-components";
import { ResourceBox } from './components/ResourceBox.jsx'
import useResources from "./hooks/useResources.js";
import { resources as resourceList } from './constants/resources'
import { useState } from 'react'
import {useContracts} from "./hooks/useContracts.js";
import {Contract} from "./components/Contract.jsx";
import {AnimatePresence, LayoutGroup} from 'framer-motion'
import {SettingsPanel} from './components/SettingsPanel.jsx'
import {useLocalStorage} from "./hooks/useWebStorage.js";
import { useResourceConnections } from './hooks/useResourceConnections.js'

function App() {
    // timing & settings state (persisted)
    const [decayTimeMs, setDecayTimeMs] = useLocalStorage('setting:decayTimeMs', 10000);
    const [noiseIntervalMs, setNoiseIntervalMs] = useLocalStorage('setting:noiseIntervalMs', 5000);
    const [contractCount, setContractCount] = useLocalStorage('setting:contractCount', 3);
    const [paused, setPaused] = useLocalStorage('setting:paused', true);
    const [minPayoutMult, setMinPayoutMult] = useLocalStorage('setting:contractRewardMin', 1);
    const [maxPayoutMult, setMaxPayoutMult] = useLocalStorage('setting:contractRewardMax', 1.4);
    const [maxContractResources, setMaxContractResources] = useLocalStorage('setting:maxContractResources', 6);

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

    const { contracts, completeContract, resetContracts, onContractDecay, contractDifficulty, setContractDifficulty } = useContracts(values, setResourceValue, 50, contractCount, minPayoutMult, maxPayoutMult, paused, maxContractResources || Infinity);

    // Resource connection paths (encapsulated in hook for clarity)
    const { containerRef, getResourceRef, connections } = useResourceConnections(resourceList)

    // Settings panel trigger (increments to force open via effect in SettingsPanel)
    const [settingsTrigger, setSettingsTrigger] = useState(0)

    return (
        <AppShell>
            <OpenSettingsButton
                type="button"
                aria-label="Open settings panel"
                onClick={() => setSettingsTrigger(t => t + 1)}
            >⚙️</OpenSettingsButton>
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
                maxContractResources={maxContractResources}
                onChangeMaxContractResources={setMaxContractResources}
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
                                <div key={r.name} ref={getResourceRef(r.name)}>
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
                    <ContractsRow>
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
                                    currentValues={values}
                                />
                            ))}
                        </AnimatePresence>
                    </ContractsRow>
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
  position:absolute;
  top:10px; right:12px;
  z-index:1;
  display:inline-flex; align-items:center; justify-content:center;
  width:38px; height:38px;
  border-radius:10px;
  background:#ffffffcc;
  backdrop-filter: blur(4px);
  border:1px solid #cbd5e1;
  color:#475569;
  font-size:18px;
  line-height:1;
  cursor:pointer;
  padding:0;
  font-weight:600;
  transition: background .25s, color .25s, border-color .25s, transform .18s;
  box-shadow:0 2px 4px rgba(0,0,0,.08);
  &:hover { background:#f1f5f9; color:#334155; }
  &:active { transform:translateY(1px); }
  &:focus-visible { outline:2px solid #1d4ed8; outline-offset:3px; }
`;

const ResourceStage = styled.main`
  flex:1;
  position:relative;
  display:flex;
  gap:40px;
  padding:32px 60px 40px;
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
  display:flex;
  padding:10px;
  overflow-y:auto;
  background-color:#f9fafb;
`;

const ContractsRow = styled.div`
  display:flex;
  flex:1;
  gap:10px;
  width:100%;
  height:100%;
  align-items:stretch;
  & > * { flex:1 1 0; min-width:0; display:flex; }
`;

export default App;

import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import packageJSON from '../../package.json'

const version = packageJSON.version

// SettingsPanel: a compact slide-out control surface
// Props expected:
//  - toggleNoise(): void
//  - isNoiseActive: boolean
//  - ignoringMin: boolean (TRUE means min constraints ignored)
//  - toggleIgnoreMin(): void
//  - resetResources(): void
//  - undoLastChange(): void
//  - canUndoLastChange: boolean
export const SettingsPanel = ({
  toggleNoise,
  isNoiseActive,
  ignoringMin,
  toggleIgnoreMin,
  resetResources,
  undoLastChange,
  canUndoLastChange,
  triggerOpen,
  decayTimeMs,
  onChangeDecayTime,
  noiseIntervalMs,
  onChangeNoiseInterval,
  contractCount,
  onChangeContractCount,
  paused,
  onTogglePause,
  contractDifficulty,
  onChangeContractDifficulty,
  rewardMinMultiplier,
  rewardMaxMultiplier,
  onChangeRewardMinMultiplier,
  onChangeRewardMaxMultiplier,
}) => {
  const [open, setOpen] = useState(false) // default closed now
  const [confirmReset, setConfirmReset] = useState(false)

  // When triggerOpen changes (and is not undefined), force panel open
  React.useEffect(() => {
    if (triggerOpen) setOpen(true)
  }, [triggerOpen])

  const handleReset = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true)
      const t = setTimeout(()=> setConfirmReset(false), 4000)
      return () => clearTimeout(t)
    }
    resetResources && resetResources()
    setConfirmReset(false)
  }, [confirmReset, resetResources])

  return (
    <Wrapper data-open={open}>
      <ToggleButton
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        title={open ? 'Collapse settings' : 'Expand settings'}
      >
        {open ? '×' : '⚙️'}
      </ToggleButton>
      <Inner role="group" aria-label="Settings">
        <HeaderRow>
          <Title>Settings</Title>
          <StatusDots>
            <Dot aria-label={`Paused ${paused ? 'yes' : 'no'}`} data-active={paused} title={`Paused ${paused ? 'yes' : 'no'}`}>P</Dot>
            <Dot aria-label={`Noise ${isNoiseActive ? 'on' : 'off'}`} data-active={isNoiseActive && !paused} title={`Noise ${isNoiseActive ? 'on' : 'off'}`}>N</Dot>
            <Dot aria-label={`Min lock ${ignoringMin ? 'off' : 'on'}`} data-active={!ignoringMin} title={`Min enforcement ${ignoringMin ? 'disabled' : 'enabled'}`}>M</Dot>
          </StatusDots>
        </HeaderRow>
        <Controls>
          {/* Simulation State */}
          <GroupLabel>Simulation</GroupLabel>
          <Row>
            <Label>Paused</Label>
            <ActionButton
              type="button"
              aria-pressed={paused}
              onClick={onTogglePause}
              data-variant={paused ? 'on' : 'off'}
            >{paused ? 'Yes' : 'No'}</ActionButton>
          </Row>
          <Row>
            <Label>Noise</Label>
            <ActionButton
              type="button"
              aria-pressed={isNoiseActive}
              onClick={toggleNoise}
              data-variant={isNoiseActive ? 'on' : 'off'}
              disabled={paused}
            >{isNoiseActive ? 'On' : 'Off'}</ActionButton>
          </Row>
          <Row>
            <Label>Enforce Min</Label>
            <ActionButton
              type="button"
              aria-pressed={!ignoringMin}
              onClick={toggleIgnoreMin}
              data-variant={!ignoringMin ? 'on' : 'off'}
            >{ignoringMin ? 'Off' : 'On'}</ActionButton>
          </Row>
          <Divider />
          {/* Editing */}
          <GroupLabel>Editing</GroupLabel>
          <Row>
            <Label>Undo</Label>
            <ActionButton
              type="button"
              disabled={!canUndoLastChange}
              onClick={undoLastChange}
              data-variant='neutral'
            >Undo</ActionButton>
          </Row>
          <Row>
            <Label>Reset</Label>
            <ActionButton
              type="button"
              data-variant={confirmReset ? 'danger' : 'neutral'}
              onClick={handleReset}
            >{confirmReset ? 'Confirm?' : 'Reset'}</ActionButton>
          </Row>
          <Divider />
          {/* Timing */}
          <GroupLabel>Timing</GroupLabel>
          <Row>
            <Label>Decay (s)</Label>
            <StepGroup>
              <StepBtn
                type="button"
                aria-label="Decrease decay time"
                onClick={() => {
                  const cur = Math.round(decayTimeMs/1000);
                  if (cur <= 1) return;
                  onChangeDecayTime && onChangeDecayTime((cur - 1) * 1000);
                }}
                disabled={Math.round(decayTimeMs/1000) <= 1}
              >−</StepBtn>
              <NumInput
                type="number"
                min={1}
                max={600}
                value={Math.round(decayTimeMs/1000)}
                onChange={e => onChangeDecayTime && onChangeDecayTime(Math.max(1, +e.target.value) * 1000)}
                aria-label="Decay time seconds"
              />
              <StepBtn
                type="button"
                aria-label="Increase decay time"
                onClick={() => {
                  const cur = Math.round(decayTimeMs/1000);
                  if (cur >= 600) return;
                  onChangeDecayTime && onChangeDecayTime((cur + 1) * 1000);
                }}
                disabled={Math.round(decayTimeMs/1000) >= 600}
              >+</StepBtn>
            </StepGroup>
          </Row>
          <Row>
            <Label>Noise (s)</Label>
            <StepGroup>
              <StepBtn
                type="button"
                aria-label="Decrease noise interval"
                onClick={() => {
                  const cur = Math.round(noiseIntervalMs/1000);
                  if (cur <= 1) return;
                  onChangeNoiseInterval && onChangeNoiseInterval((cur - 1)*1000);
                }}
                disabled={Math.round(noiseIntervalMs/1000) <= 1}
              >−</StepBtn>
              <NumInput
                value={Math.round(noiseIntervalMs/1000)}
                onChange={e => onChangeNoiseInterval && onChangeNoiseInterval(Math.max(1, +e.target.value ?? 1) * 1000)}
                aria-label="Noise interval seconds"
              />
              <StepBtn
                type="button"
                aria-label="Increase noise interval"
                onClick={() => {
                  const cur = Math.round(noiseIntervalMs/1000);
                  if (cur >= 3600) return;
                  onChangeNoiseInterval && onChangeNoiseInterval((cur + 1)*1000);
                }}
                disabled={Math.round(noiseIntervalMs/1000) >= 3600}
              >+</StepBtn>
            </StepGroup>
          </Row>
          <Divider />
          {/* Contracts */}
            <GroupLabel>Contracts</GroupLabel>
            <Row>
              <Label>Count</Label>
              <StepGroup>
                <StepBtn
                  type="button"
                  aria-label="Decrease contract count"
                  onClick={() => {
                    const cur = contractCount;
                    if (cur <= 1) return;
                    onChangeContractCount && onChangeContractCount(cur - 1);
                  }}
                  disabled={contractCount <= 1}
                >−</StepBtn>
                <NumInput
                  type="number"
                  min={1}
                  max={12}
                  value={contractCount}
                  onChange={e => onChangeContractCount && onChangeContractCount(Math.min(12, Math.max(1, +e.target.value)))}
                  aria-label="Number of contracts"
                />
                <StepBtn
                  type="button"
                  aria-label="Increase contract count"
                  onClick={() => {
                    const cur = contractCount;
                    if (cur >= 12) return;
                    onChangeContractCount && onChangeContractCount(cur + 1);
                  }}
                  disabled={contractCount >= 12}
                >+</StepBtn>
              </StepGroup>
            </Row>
            <Row>
              <Label>Difficulty</Label>
              <StepGroup>
                <StepBtn
                  type="button"
                  aria-label="Decrease contract difficulty"
                  onClick={() => {
                    const cur = parseFloat(contractDifficulty);
                    const next = parseFloat((Math.max(0.5, cur - 0.1)).toFixed(2));
                    if (next === cur) return;
                    onChangeContractDifficulty && onChangeContractDifficulty(next);
                  }}
                  disabled={parseFloat(contractDifficulty) <= 0.5}
                >−</StepBtn>
                <NumInput
                  type="number"
                  step={0.1}
                  min={0.5}
                  max={5}
                  value={Number(contractDifficulty).toFixed(1)}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (isNaN(v)) return;
                    const clamped = Math.min(5, Math.max(0.5, v));
                    onChangeContractDifficulty && onChangeContractDifficulty(parseFloat(clamped.toFixed(2)));
                  }}
                  aria-label="Contract difficulty multiplier"
                />
                <StepBtn
                  type="button"
                  aria-label="Increase contract difficulty"
                  onClick={() => {
                    const cur = parseFloat(contractDifficulty);
                    const next = parseFloat((Math.min(5, cur + 0.1)).toFixed(2));
                    if (next === cur) return;
                    onChangeContractDifficulty && onChangeContractDifficulty(next);
                  }}
                  disabled={parseFloat(contractDifficulty) >= 5}
                >+</StepBtn>
              </StepGroup>
            </Row>
            <Row>
              <Label>Min Pay</Label>
              <StepGroup>
                <StepBtn
                  type="button"
                  aria-label="Decrease min pay multiplier"
                  onClick={() => {
                    const cur = parseFloat(rewardMinMultiplier);
                    const next = parseFloat((Math.max(0.1, cur - 0.1)).toFixed(2));
                    if (next > rewardMaxMultiplier) return;
                    if (next === cur) return;
                    onChangeRewardMinMultiplier && onChangeRewardMinMultiplier(next);
                  }}
                  disabled={parseFloat(rewardMinMultiplier) <= 0.1}
                >−</StepBtn>
                <NumInput
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={rewardMaxMultiplier}
                  value={Number(rewardMinMultiplier).toFixed(2)}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (isNaN(v)) return;
                    const clamped = Math.max(0.1, Math.min(rewardMaxMultiplier, v));
                    onChangeRewardMinMultiplier && onChangeRewardMinMultiplier(parseFloat(clamped.toFixed(2)));
                  }}
                  aria-label="Minimum reward multiplier"
                />
                <StepBtn
                  type="button"
                  aria-label="Increase min pay multiplier"
                  onClick={() => {
                    const cur = parseFloat(rewardMinMultiplier);
                    const next = parseFloat((Math.min(rewardMaxMultiplier, cur + 0.1)).toFixed(2));
                    if (next === cur) return;
                    onChangeRewardMinMultiplier && onChangeRewardMinMultiplier(next);
                  }}
                  disabled={parseFloat(rewardMinMultiplier) >= parseFloat(rewardMaxMultiplier)}
                >+</StepBtn>
              </StepGroup>
            </Row>
            <Row>
              <Label>Max Pay</Label>
              <StepGroup>
                <StepBtn
                  type="button"
                  aria-label="Decrease max pay multiplier"
                  onClick={() => {
                    const cur = parseFloat(rewardMaxMultiplier);
                    const next = parseFloat((Math.max(rewardMinMultiplier, cur - 0.1)).toFixed(2));
                    if (next === cur) return;
                    onChangeRewardMaxMultiplier && onChangeRewardMaxMultiplier(next);
                  }}
                  disabled={parseFloat(rewardMaxMultiplier) <= parseFloat(rewardMinMultiplier)}
                >−</StepBtn>
                <NumInput
                  type="number"
                  step={0.1}
                  min={rewardMinMultiplier}
                  max={6}
                  value={Number(rewardMaxMultiplier).toFixed(2)}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (isNaN(v)) return;
                    const clamped = Math.max(rewardMinMultiplier, Math.min(6, v));
                    onChangeRewardMaxMultiplier && onChangeRewardMaxMultiplier(parseFloat(clamped.toFixed(2)));
                  }}
                  aria-label="Maximum reward multiplier"
                />
                <StepBtn
                  type="button"
                  aria-label="Increase max pay multiplier"
                  onClick={() => {
                    const cur = parseFloat(rewardMaxMultiplier);
                    const next = parseFloat((Math.min(6, cur + 0.1)).toFixed(2));
                    if (next === cur) return;
                    onChangeRewardMaxMultiplier && onChangeRewardMaxMultiplier(next);
                  }}
                  disabled={parseFloat(rewardMaxMultiplier) >= 6}
                >+</StepBtn>
              </StepGroup>
            </Row>
        </Controls>
        <Footer>
          <div>
            {`V. ${version}`}
          </div>
          <div>
            Cutthroat Co.
          </div>
        </Footer>
      </Inner>
    </Wrapper>
  )
}

// Styled Components
const Wrapper = styled.aside`
  position: fixed;
  top: 0;
  right: 0; /* moved to right side */
  height: 100vh;
  width: clamp(220px, 18vw, 300px);
  transform: translateX(calc(150% - 3.25rem)); /* hide panel leaving toggle width */
  &[data-open='true'] { transform: translateX(0); }
  transition: transform .4s cubic-bezier(.6,.2,.1,1);
  z-index: 40;
  display:flex;
  align-items:stretch;
  pointer-events: none;
  @media (max-width: 720px) { width: 85vw; }
`;

const ToggleButton = styled.button`
  position: absolute;
  top: .75rem;
  left: -2.7rem; /* adjust to protrude from right-side panel */
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.85rem 0 0 0.85rem; /* mirror rounding */
  background: linear-gradient(135deg,#2563eb,#1d4ed8); /* slight direction adjust */
  color:#fff;
  border: none;
  font-size: 1.15rem;
  font-weight:600;
  cursor: pointer;
  box-shadow: 0 4px 12px -2px rgba(0,0,0,.25), 0 2px 4px rgba(0,0,0,.15);
  display:flex; align-items:center; justify-content:center;
  pointer-events: auto;
  transition: background .25s, transform .25s;
  &:hover { background: linear-gradient(135deg,#1d4ed8,#1e40af); }
  &:active { transform: translateY(2px); }
  &:focus-visible { outline:2px solid #fff; outline-offset:2px; }
`;

const Inner = styled.div`
  flex:1;
  background: linear-gradient(160deg,#ffffff,#f1f5f9 55%,#e2e8f0);
  border-left:1px solid #d1d9e1; /* moved border to left side */
  box-shadow: -4px 0 16px -4px rgba(0,0,0,.18), -2px 0 6px -2px rgba(0,0,0,.12); /* mirror shadow */
  display:flex;
  flex-direction:column;
  padding: 1rem 1.1rem 0.75rem 1.1rem;
  gap: .75rem;
  font-family: system-ui, sans-serif;
  pointer-events: auto;
`;

const HeaderRow = styled.div`
  display:flex;
  align-items:center;
  justify-content:space-between;
`;

const Title = styled.h2`
  font-size: .95rem;
  margin:0;
  letter-spacing:.5px;
  color:#0f172a;
  font-weight:700;
`;

const StatusDots = styled.div`
  display:flex;
  gap:.4rem;
`;

const Dot = styled.span`
  --c: #94a3b8;
  &[data-active='true'] { --c: #10b981; }
  background: var(--c);
  color:#fff;
  font-size:.55rem;
  width:1.25rem; height:1.25rem;
  border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-weight:600;
  box-shadow:0 2px 4px rgba(0,0,0,.2), 0 1px 2px rgba(0,0,0,.2) inset;
`;

const Controls = styled.div`
  display:flex;
  flex-direction:column;
  gap:.55rem;
`;

const Row = styled.div`
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:.75rem;
`;

const Label = styled.span`
  font-size:.7rem;
  letter-spacing:.6px;
  font-weight:600;
  color:#334155;
  text-transform:uppercase;
`;

const ActionButton = styled.button`
  --bg:#fff; --bd:#cbd5e1; --fg:#0f172a;
  &[data-variant='on'] { --bg:#047857; --bd:#065f46; --fg:#fff; }
  &[data-variant='accent'] { --bg:#2563eb; --bd:#1e40af; --fg:#fff; }
  &[data-variant='danger'] { --bg:#dc2626; --bd:#b91c1c; --fg:#fff; }
  &[data-variant='neutral'] { --bg:#f1f5f9; --bd:#cbd5e1; }
  &[data-variant='off'] { --bg:#f1f5f9; --bd:#cbd5e1; }
  position:relative;
  font:inherit;
  font-size:.65rem;
  font-weight:600;
  letter-spacing:.5px;
  padding:.45rem .85rem .5rem;
  border-radius:.65rem;
  border:1px solid var(--bd);
  background:var(--bg);
  color:var(--fg);
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:.4rem;
  min-width:3.4rem;
  justify-content:center;
  box-shadow:0 2px 4px rgba(0,0,0,.1);
  transition: background .25s, transform .18s, box-shadow .25s;
  &:hover:not(:disabled){ filter:brightness(1.05); }
  &:active:not(:disabled){ transform:translateY(1px); }
  &:disabled { opacity:.45; cursor:not-allowed; }
  &:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }
`;

const Divider = styled.div`
  height:1px;
  background:linear-gradient(to right, transparent,#cbd5e1,transparent);
  margin:.3rem 0 .55rem;
`;

const Footer = styled.div`
  margin-top:auto;
  padding-top:.4rem;
  font-size:.55rem;
  letter-spacing:.4px;
  text-transform:uppercase;
  font-weight:600;
  color:#64748b;
  display:flex;
  justify-content:space-between;
  gap:.5rem;
`;

const GroupLabel = styled.div`
  font-size:.55rem;
  font-weight:700;
  letter-spacing:.6px;
  text-transform:uppercase;
  color:#475569;
  margin-top:.25rem;
`;

const NumInput = styled.input`
  width:4.2rem;
  padding:.35rem .4rem .4rem;
  border:1px solid #cbd5e1;
  border-radius:.55rem;
  font-size:.65rem;
  font-weight:600;
  letter-spacing:.5px;
  background:#ffffff;
  color:#0f172a;
  text-align:right;
  -moz-appearance:textfield;
  &::-webkit-outer-spin-button,&::-webkit-inner-spin-button{ -webkit-appearance: none; margin:0; }
  &:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }
`;
const StepGroup = styled.div`
  display:inline-flex; align-items:center; gap:.3rem;
`;
const StepBtn = styled.button`
  width:1.9rem; height:1.9rem; display:inline-flex; align-items:center; justify-content:center;
  font-size:.9rem; font-weight:700; line-height:1; cursor:pointer;
  border:1px solid #cbd5e1; background:#f8fafc; color:#0f172a; border-radius:.55rem;
  transition: background .2s, transform .15s;
  &:hover:not(:disabled){ background:#e2e8f0; }
  &:active:not(:disabled){ transform:translateY(1px); background:#cbd5e1; }
  &:disabled{ opacity:.4; cursor:not-allowed; }
  &:focus-visible{ outline:2px solid #2563eb; outline-offset:2px; }
`;

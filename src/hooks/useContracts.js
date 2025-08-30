import {useCallback, useEffect, useState} from "react";
import { ContractLabels } from "../constants/contract-labels.js";
import { useLocalStorage } from "./useWebStorage.ts";

// Contracts are generated from the following json schema:

// type Contract = {
//     value: number, // target value of the contract in currency
//     reward: number, // reward for completing the contract in currency
//     includedTiers: number, // percentage of tiers included in the contract (1-100)
//     resourceDiversityPerTier: number, // percentage of resources per included tier (1-100)
//     resourceEvenness: number // how evenly distributed the resource quantities are (0-1, where 0 is all one resource, 1 is perfectly even)
// }

// The reward for a contract is based on the total value of the resources it requires, with bonuses for higher-tier resources and for fulfilling specialist components.
//
// const generateContractTemplate = (targetValue) => {
//     return {
//         value: targetValue,
//         reward: Math.floor(targetValue * (.8 + Math.random() * 0.7)), // base reward is 80-150% of value
//         includedTiers: Math.floor(20 + Math.random() * 80), // include 20-100% of tiers
//         resourceDiversityPerTier: Math.floor(20 + Math.random() * 80), // include 20-100% of resources per tier
//         resourceEvenness: parseFloat((Math.random()).toFixed(2)) // evenness between 0 and 1
//     }
// }

export const useContracts = (
    values,
    setResourceValue,
    startValue = 50,
    contractCount,
    rewardMinMultiplier = 1,
    rewardMaxMultiplier = 1.4,
    paused = false,
    maxResources = Infinity
) => {
    const [contracts, setContracts] = useLocalStorage('contracts', []);
    const [startTargetValue, _] = useState(startValue);
    const [currentTargetValue, setCurrentTargetValue] = useLocalStorage('currentContractTargetValue', startTargetValue); // Adjusts overall contract difficulty and rewards
    const [contractDifficulty, setContractDifficulty] = useLocalStorage('contractDifficulty', 1); // Multiplier for contract difficulty (1 = normal, >1 harder, <1 easier)

    const generateRandomContract = useCallback((targetValue, id) => {
        const scaledTarget = targetValue * contractDifficulty; // apply difficulty multiplier
        let currentValue = 0;
        const selectedResources = {};

        // Determine if this is a specialist contract (50% chance)
        const isSpecialist = Math.random() < 0.5;
        let specialistResource = null;
        if (isSpecialist) {
            // 50% for 1 resource, 50% for 2
            const numSpecialists = Math.random() < 0.5 ? 1 : 2;
            const allResources = Object.keys(values);
            const shuffled = allResources.sort(() => 0.5 - Math.random());
            specialistResource = shuffled.slice(0, Math.min(numSpecialists, maxResources)); // clamp to maxResources

            // Randomly add any of the specialist resources until we hit the target value
            while (currentValue < scaledTarget) {
                const resName = specialistResource[Math.floor(Math.random() * specialistResource.length)];
                const resValue = values[resName];
                if (resValue + currentValue > scaledTarget) break; // stop if would exceed target
                selectedResources[resName] = (selectedResources[resName] || 0) + 1;
                currentValue += resValue;
            }
        } else {
            while (currentValue < scaledTarget) {
                // Filter resources that would not exceed target AND (if distinct limit reached) are already selected
                const resourceEntries = Object.entries(values).filter(([name, val]) => val + currentValue <= scaledTarget && (Object.keys(selectedResources).length < maxResources || selectedResources[name] != null));
                if (resourceEntries.length === 0) break; // No valid resources left to add

                const [resourceName, resourceValue] = resourceEntries[Math.floor(Math.random() * resourceEntries.length)];
                selectedResources[resourceName] = (selectedResources[resourceName] || 0) + 1;
                currentValue += resourceValue;
            }
        }

        // pick a label not currently in use
        const existingLabels = new Set(contracts.map(c => c.label));
        let label;
        // pick a random label from ContractLabels
        const availableLabels = ContractLabels.filter(l => !existingLabels.has(l));
        if (availableLabels.length === 0) {
            label = `Contract ${id + 1}`;
        }
        else {
            const randLabelIndex = Math.floor(Math.random() * availableLabels.length);
            label = availableLabels[randLabelIndex];
        }
        const minMult = Math.max(0.1, Math.min(rewardMinMultiplier, rewardMaxMultiplier));
        const maxMult = Math.max(minMult, rewardMaxMultiplier);
        const reward = Math.floor(currentValue * (minMult + Math.random() * (maxMult - minMult)));
        return {
            value: currentValue,
            reward,
            resources: selectedResources,
            id,
            label,
            difficulty: contractDifficulty,
            rewardRange: { min: minMult, max: maxMult },
            maxResources
        };

    }, [values, contracts, contractDifficulty, rewardMinMultiplier, rewardMaxMultiplier, maxResources])

    const addNewContract = useCallback((targetValue, repeat = 1) => {
        const newContracts = [];
        for (let i = 0; i < repeat; i++) {
            // Generate uuid
            const id = Date.now() + Math.floor(Math.random() * 1000) + i;
            newContracts.push(generateRandomContract(targetValue, id));
        }
        setContracts(prev => [...newContracts, ...prev]);
    }, [setContracts, generateRandomContract]);

    const completeContract = useCallback((contractId) => {
        const contract = contracts.find(c => c.id === contractId);
        setContracts(prev => prev.filter(c => c.id !== contractId));
        // Increase difficulty first
        setCurrentTargetValue(prev => prev * 1.1);
        // Apply resource value decrease
        if (contract) {
            Object.entries(contract.resources).forEach(([name, qty]) => {
                setResourceValue(name, Math.max(2, Math.floor(values[name] * (1 - 0.05 * qty))));
            });
        }
    }, [contracts, setContracts, setResourceValue, values]);

    // Maintain desired contract count whenever dependencies change
    useEffect(() => {
        if (paused) return; // do not generate while paused
        if (contractCount == null) return; // guard
        if (contracts.length < contractCount) {
            const missing = contractCount - contracts.length;
            addNewContract(currentTargetValue, missing);
        } else if (contracts.length > contractCount) {
            setContracts(prev => prev.slice(0, contractCount));
        }
    }, [paused, contractCount, contracts.length, currentTargetValue, addNewContract, setContracts, contractDifficulty]);

    // If difficulty changes and there are no contracts yet, seed immediately
    useEffect(() => {
        if (paused) return;
        if (contracts.length === 0 && contractCount) addNewContract(startTargetValue, contractCount);
    }, [contractDifficulty, paused]);

    const onContractDecay = useCallback((contractId) => {
        const contract = contracts.find(c => c.id === contractId);
        setContracts(prev => prev.filter(c => c.id !== contractId));
        if (contract) {
            Object.entries(contract.resources).forEach(([name, qty]) => {
                setResourceValue(name, Math.ceil(values[name] * (1 + 0.05 * qty)));
            });
        }
    }, [contracts, setContracts, setResourceValue, values]);

    const reset = useCallback(() => {
        setContracts([]);
        setCurrentTargetValue(startTargetValue);
        if (!paused && contractCount) addNewContract(startTargetValue, contractCount);
    }, [addNewContract, startTargetValue, contractCount, setContracts, paused]);

    return { contracts, completeContract, resetContracts: reset, onContractDecay, contractDifficulty, setContractDifficulty };
}
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isFunction } from 'lodash';

type Serializer<S> = (data: S) => string;
type Deserializer<S> = (data: string) => S;

export type WebStorageConfig<S> = {
    version: string;
    primaryKey: string;
    serializer: Serializer<S>;
    deserializer: Deserializer<S>;
};

export type WebStorageConfigOptional<S> = Partial<WebStorageConfig<S>>;

type UpdateState<S> = (newState: S | ((oldState: S) => S)) => void;
type UseWebStorage<S = string> = [S, UpdateState<S>];
type StorageState<S> = {
    value: S;
    propagateToStorage: boolean;
};

function useWebStorage<S>(
    entryKey: string,
    defaultValue: S,
    storage: Storage,
    config: WebStorageConfigOptional<S> = {},
): UseWebStorage<S> {
    if (
        (config.serializer === undefined) !==
        (config.deserializer === undefined)
    ) {
        throw new Error(
            'Must provide both a serializer and deserializer or neither.',
        );
    }

    const { version, primaryKey, serializer, deserializer }: WebStorageConfig<S> =
        {
            version: config.version ?? '1.0.0',
            primaryKey: config.primaryKey ?? 'defaultKey',
            serializer: config.serializer ?? defaultSerializer,
            deserializer: config.deserializer ?? defaultDeserializer,
        };
    const storageKey = createStorageKey(primaryKey, entryKey, version);

    const [state, setState] = useState<StorageState<S>>(() => {
        const storedValue = storage.getItem(storageKey);

        // When the storedValue is null, there was no entry for it -- however a null value will be saved
        // as 'null' using the defaultSerializer, so it is possible to explicitly type S as Type | null.
        if (storedValue === null) {
            return { value: defaultValue, propagateToStorage: false };
        }

        return { value: deserializer(storedValue), propagateToStorage: false };
    });

    const createStateUpdater = useCallback(
        (propagateToStorage: boolean): UpdateState<S> => {
            return (state) => {
                if (isFunction(state)) {
                    setState((oldState) => {
                        const newState = state(oldState.value);

                        return {
                            value: newState,
                            propagateToStorage,
                        };
                    });
                } else {
                    setState({
                        value: state,
                        propagateToStorage,
                    });
                }
            };
    },
    [],
);
    const updateStateNoPropagation: UpdateState<S> = useMemo(
        () => createStateUpdater(false),
        [createStateUpdater],
    );
    const updateStateAndPropagate: UpdateState<S> = useMemo(
        () => createStateUpdater(true),
        [createStateUpdater],
    );

    const updateStorage = useCallback(
        (value: S) => {
            const serializedValue = serializer(value);
            storage.setItem(storageKey, serializedValue);
        },
        [serializer, storage, storageKey],
    );
    useEffect(() => {
        if (state.propagateToStorage) {
            updateStorage(state.value);
        }
    }, [state, updateStorage]);

    // update state if web storage values are updated directly
    const storageEventHandler = useMemo(() => {
        return createStorageEventHandler<S>(
            storage,
                storageKey,
                defaultValue,
                serializer,
                deserializer,
                updateStateNoPropagation,
                state.value,
        );
    }, [
        storage,
        storageKey,
        defaultValue,
        serializer,
        deserializer,
        updateStateNoPropagation,
        state.value,
    ]);

    useEffect(() => {
        window.addEventListener('storage', storageEventHandler, false);

        return () => {
            window.removeEventListener('storage', storageEventHandler);
        };
    }, [storageEventHandler]);

    return [state.value, updateStateAndPropagate];
}

export function createStorageEventHandler<S>(
    storage: Storage,
    storageKey: string,
    defaultValue: S,
    serializer: Serializer<S>,
    deserializer: Deserializer<S>,
    updateState: UpdateState<S>,
    currentState: S,
) {
    // These events will only fire on the windows that DON'T make the change
    return function (event: StorageEvent) {
        if (event.storageArea === storage && event.key === storageKey) {
            if (event.newValue !== serializer(currentState)) {
                // if the value is null, it means that the key was deleted from storage
                if (event.newValue === null) {
                    console.warn(
                        `Value associated with ${storageKey} has been deleted. Using default value.`,
                    );

                    updateState(defaultValue);
                } else {
                    updateState(deserializer(event.newValue));
                }
            }
        }
    };
}

export function createStorageKey(
    primaryKey: string,
    entryKey: string,
    version: string,
) {
    return `${primaryKey}:${entryKey}:${version}`;
}

export function defaultSerializer<S>(data: S) {
    // undefined is not a part of the JSON standard so we have to handle it separately
    if (data === undefined) {
        return 'undefined';
    }

    return JSON.stringify(data);
}

export function defaultDeserializer<S>(data: string) {
    try {
        // undefined is not a part of the JSON standard so we have to handle it separately
        if (data === 'undefined') {
            return undefined as S;
        }

        return JSON.parse(data) as S;
    } catch (error: unknown) {
        // if S is not an object, then it has to be a primitive
        return data as unknown as S;
    }
}

export function useLocalStorage<S>(
    entryKey: string,
    defaultValue: S,
    config?: WebStorageConfigOptional<S>,
): UseWebStorage<S> {
    return useWebStorage(entryKey, defaultValue, localStorage, config);
}

export function useSessionStorage<S>(
    entryKey: string,
    defaultValue: S,
    config?: WebStorageConfigOptional<S>,
): UseWebStorage<S> {
    return useWebStorage(entryKey, defaultValue, sessionStorage, config);
}

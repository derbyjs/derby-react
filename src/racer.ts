import type { Model, ReadonlyDeep } from 'racer';
import { useEffect, useState } from 'react';

/**
 * `useRacerState` adds a React component state variable that is synchronized
 * with data at a specific path in a Racer model.
 *
 * The Racer model's data is the source of truth for state.
 *
 * @param scopedModel a Racer model scoped to the desired path
 * @param defaultValue optional non-null default value for the state
 * @returns a tuple containing the current React state value and a setter function
 * @see https://react.dev/reference/react/useState
 * @see https://derbyjs.github.io/derby/models/paths
 *
 * @example
 * const [title, setTitle] = useRacerState(model.scope<string>('_page.title'));
 * const $counter = model.scope<number>('_page.counter');
 * const [counter] = useRacerState($counter, 0);
 * function update() {
 *   // Overwrite-type updates can be done with the React state setter
 *   setTitle('New title');
 *   // Or any type of updates can be done with the Racer model methods
 *   $counter.increment();
 * }
 */
export function useRacerState<T>(
  scopedModel: Model<T>,
  defaultValue?: T,
): [ReadonlyDeep<T>, (newValue: T) => void] {
  const modelValue = scopedModel.getDeepCopy() ?? defaultValue;
  if (defaultValue != null) {
    scopedModel.setNull(defaultValue);
  }
  // Use the model's value as the source of truth, ignoring the useState value.
  const [_stateValue, setStateValue] = useState(modelValue);

  // When Racer model value changes, update React state to trigger React re-render.
  //
  // scopedModel could be a new object on every render, so extract relevant model properties
  // that are comparable with `===` for use as useEffect dependencies.
  const rootModel = scopedModel.root;
  const modelPath = scopedModel.path();
  const modelEventContext = scopedModel._eventContext;
  useEffect(() => {
    const listenerModel = rootModel.at<T>(modelPath).eventContext(modelEventContext);
    const listener = listenerModel.on('all', '**', { useEventObjects: true }, (_event) => {
      setStateValue(listenerModel.getDeepCopy());
    });
    return () => {
      listenerModel.removeListener('all', listener);
    };
  }, [rootModel, modelPath, modelEventContext]);

  // Returned setter function that updates the Racer model value
  function setModelValue(newValue: T) {
    scopedModel.set(newValue);
  }
  return [modelValue as ReadonlyDeep<T>, setModelValue];
}

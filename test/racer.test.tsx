import { act, cleanup, render, screen } from '@testing-library/react';
import userEventLib from '@testing-library/user-event';
import racer, { Model } from 'racer';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useRacerState } from '../src/racer';

describe('useRacerState', () => {
  afterEach(() => {
    cleanup();
  });

  test('React state syncs with Racer values both ways', async () => {
    const userEvent = userEventLib.setup();
    const rootModel = racer.createModel();
    const messagePath = '_page.message';
    const counterPath = '_page.counter';
    const expectedNumListeners = 2;

    let renderCount = 0;
    function TestComponent({ model, counterDefault }: { model: Model; counterDefault: number }) {
      const [message, setMessage] = useRacerState(model.scope<string>(messagePath));
      const $counter = model.scope<number>(counterPath);
      const [counter] = useRacerState($counter, counterDefault);
      renderCount++;
      return (
        <>
          {/* State can be updated with a React state setter */}
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
          {/* State can also be updated with model methods */}
          <div data-testid="counter-value">{counter}</div>
          <button onClick={() => $counter.increment()}>Increment</button>
        </>
      );
    }

    // Spy on method used to add Racer model change listeners
    const modelOnSpy = vi.spyOn(Model.prototype, 'on');

    // Render React component with both kinds of initial state:
    // - `message` from value in Racer model
    // - `counter` with default value from React hook
    const $message = rootModel.at<string>(messagePath);
    const $counter = rootModel.at<number>(counterPath);
    $message.set('Initial message');
    render(<TestComponent model={rootModel} counterDefault={1} />);
    const input = screen.getByRole('textbox');
    const counterValueDiv = screen.getByTestId('counter-value');

    // Verify initial rendered values
    expect(input).toHaveProperty('value', 'Initial message');
    expect(counterValueDiv).toHaveProperty('textContent', '1');
    // Racer model should reflect default specified in React hook
    expect($counter.get()).toBe(1);
    // Component should only have rendered once
    expect(renderCount).toBe(1);
    // Racer model should have only two model listeners registered (one per useRacerState call)
    expect(modelOnSpy).toHaveBeenCalledTimes(expectedNumListeners);

    // Racer model -> React: Updates to model value reflect in rendered React DOM
    act(() => {
      $message.set('Racer-set message');
      $counter.increment();
    });
    expect(input).toHaveProperty('value', 'Racer-set message');
    expect(counterValueDiv).toHaveProperty('textContent', '2');
    // With two synchronous model updates, React should only have rendered one (more) time
    expect(renderCount).toBe(2);

    // React -> Racer model: React update via user input results in update to Racer model
    await userEvent.clear(input);
    await userEvent.type(input, 'User-typed message');
    const incrementButton = screen.getByRole('button', { name: 'Increment' });
    await userEvent.click(incrementButton);
    expect($message.get()).toBe('User-typed message');
    expect(counterValueDiv).toHaveProperty('textContent', '3');
    expect($counter.get()).toBe(3);

    // Racer model should only still have two listeners, even with many component re-renders
    expect(modelOnSpy).toHaveBeenCalledTimes(expectedNumListeners);
  });

  test('Racer model listener updates when React component changes useRacerState path', async () => {
    // While generally not the case, it's possible for a React component to change the path it uses
    // for a given useRacerState call.
    const userEvent = userEventLib.setup();
    const rootModel = racer.createModel();
    const messageListPath = '_page.messageList';

    function TestComponent({ model }: { model: Model }) {
      const [index, setIndex] = useState(0);
      const [message, setMessage] = useRacerState(
        model.scope<string>(messageListPath + '.' + index),
      );
      return (
        <>
          <input key={index} value={message} onChange={(e) => setMessage(e.target.value)} />
          <button onClick={() => setIndex(index + 1)}>Next message</button>
        </>
      );
    }

    const $messageList = rootModel.at<string[]>(messageListPath);
    $messageList.set(['Message A', 'Message B']);
    render(<TestComponent model={rootModel} />);
    let input = screen.getByRole('textbox');
    const nextButton = screen.getByRole('button', { name: 'Next message' });
    expect(input).toHaveProperty('value', 'Message A');

    // Change to message at index 1
    await userEvent.click(nextButton);
    input = screen.getByRole('textbox');
    expect(input).toHaveProperty('value', 'Message B');
    // Racer mutation to message 0 shouldn't affect the React component
    act(() => {
      $messageList.stringInsert(0, 0, 'A ');
    });
    expect(input).toHaveProperty('value', 'Message B');
    // Racer mutation to message 1 affects the React component
    act(() => {
      $messageList.stringInsert(1, 0, 'B ');
    });
    expect(input).toHaveProperty('value', 'B Message B');

    // Change to non-existent message at index 2, test two-way sync
    await userEvent.click(nextButton);
    input = screen.getByRole('textbox');
    expect(input).toHaveProperty('value', '');
    await userEvent.type(input, 'Typed message C');
    expect($messageList.get()).toEqual(['A Message A', 'B Message B', 'Typed message C']);
    act(() => {
      $messageList.set(2, 'Racer-set message C');
    });
    expect(input).toHaveProperty('value', 'Racer-set message C');
  });
});

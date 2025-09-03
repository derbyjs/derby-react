# @derbyjs/react-derby

`@derbyjs/react-derby` enables React components to be integrated with DerbyJS apps and/or Racer models:

- React component state that's two-way synced with Racer model data
- Derby helper to render a React component inside a Derby component, with automatic cleanup

React version requirements:

- `useRacerState` supports React versions 16 and higher.
- The Derby `renderReactComponent` helper requires React 18 and higher due to using `reactDom.createRoot`, which was introduced in React 18.

## Example

This example uses a Derby component with a directory containing index.html and index.tsx.

```html
<!-- index.html -->
<index:>
  <h2>Derby controls</h2>
  <div>
    <div>Message: <input value="{{message}}"></div>
    <div>Counter: <span>{{counter}}</span> <button on-click="model.increment('counter', 1)">Increment</button></div>
  </div>
  <h2>React controls</h2>
  <div as="reactAppContainer"></div>
```

```tsx
// index.tsx
import { Component } from 'derby';
import { renderReactComponent, useRacerState } from '@derbyjs/react-derby';
import type { Model } from 'racer';

class ReactDerbyExample extends Component {
  static view = {
    file: __dirname,
    is: 'react-derby-example',
  };

  declare reactContainer: HTMLElement;

  create() {
    renderReactComponent(this, this.reactContainer, <ReactControls model={this.model} />);
  }
}

function ReactControls({ model }: { model: Model }) {
  // useRacerState accepts a Racer model scoped to the desired value's path
  const $message = model.at<string>('message');
  const [message, setMessage] = useRacerState($message);
  const $counter = model.at<number>('counter');
  const [counter] = useRacerState($counter, 0);

  return (
    <>
      {/* State can be updated with a React state setter... */}
      <div>
        Message: <input value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      {/* ...or state can also be updated with model methods. */}
      <div>
        Counter: <span>{counter}</span>{' '}
        <button onClick={() => $counter.increment()}>Increment</button>
      </div>
    </>
  );
}
```

import type { Component } from 'derby';
import type { ReactNode } from 'react';
import { type Container, createRoot, type RootOptions } from 'react-dom/client';

/**
 * Render a React component within a Derby component.
 *
 * This function automatically handles cleanup, i.e. unmounting the React component when the
 * Derby component is destroyed.
 *
 * @param derbyComponent Derby component that should host the React component
 * @param domContainer DOM container (e.g. HTMLElement) to render the React component into
 * @param reactComponent React component to render
 *
 * @example
 * import { Component } from 'derby';
 * import { renderReactComponent } from '@derbyjs/derby-react';
 *
 * class MyDerbyComponent extends Component {
 *   // This assumes this Derby component's template has an element like:
 *   //    <div as="myReactContainer"></div>
 *   declare myReactContainer: HTMLElement;
 *
 *   create() {
 *     renderReactComponent(this, this.myReactContainer, <MyReactComponent model={this.model} />);
 *   }
 * }
 */
export function renderReactComponent(
  derbyComponent: Component,
  domContainer: Container,
  reactComponent: ReactNode,
  reactRootOptions: RootOptions,
) {
  const reactRoot = createRoot(domContainer, reactRootOptions);
  derbyComponent.on('destroy', () => {
    reactRoot.unmount();
  });
  reactRoot.render(reactComponent);
  return { reactRoot };
}

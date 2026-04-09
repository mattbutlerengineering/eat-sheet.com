import type { ComponentType, ReactNode } from 'react';

interface SpecElement {
  readonly type: string;
  readonly props?: Record<string, unknown>;
  readonly children?: string[];
}

interface Spec {
  readonly root: string;
  readonly elements: Record<string, SpecElement>;
}

type ComponentRegistry = Record<string, ComponentType<Record<string, unknown>>>;

interface RendererProps {
  readonly spec: Spec;
  readonly registry: ComponentRegistry;
}

export function Renderer({ spec, registry }: RendererProps) {
  function renderElement(id: string): ReactNode {
    const element = spec.elements[id];
    if (!element) return null;

    const Component = registry[element.type];
    if (!Component) return null;

    const children = element.children?.map(renderElement);

    return (
      <Component key={id} {...element.props}>
        {children}
      </Component>
    );
  }

  return <>{renderElement(spec.root)}</>;
}

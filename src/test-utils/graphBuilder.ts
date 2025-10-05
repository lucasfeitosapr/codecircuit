import type { ComponentBase, Connection, PinDef, PinRef } from '../types';

let idSeq = 0;
const nextId = (prefix: string) => `${prefix}-${++idSeq}`;

export function makeComponent(
  type: string,
  opts: Partial<ComponentBase> & { pins?: { input?: PinDef[]; output?: PinDef[]; [k: string]: PinDef[] | undefined } } = {}
): ComponentBase {
  const id = opts.id ?? nextId(type);
  const width = opts.width ?? 60;
  const height = opts.height ?? 30;
  const pins = opts.pins ?? { input: [], output: [] };
  return {
    id,
    type,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width,
    height,
    name: opts.name ?? id,
    status: opts.status ?? 'defined',
    pins,
    category: opts.category ?? 'frontend',
    createdAt: opts.createdAt ?? new Date(),
  };
}

export function pinRef(
  component: ComponentBase,
  pinType: 'input' | 'output' | string,
  pinIndex = 0,
  override?: Partial<PinRef>
): PinRef {
  const def = (component.pins[pinType] ?? [])[pinIndex] ?? { x: 0, y: 0 };
  const x = component.x + (def.x ?? 0);
  const y = component.y + (def.y ?? 0);
  const isInputPin = pinType === 'input';
  return {
    component,
    pinType,
    pinIndex,
    x,
    y,
    category: component.category,
    isInputPin,
    ...override,
  };
}

export function makeConnection(from: PinRef, to: PinRef, opts: Partial<Connection> = {}): Connection {
  return {
    id: opts.id ?? nextId('conn'),
    from,
    to,
    category: opts.category ?? from.category ?? 'frontend',
    createdAt: opts.createdAt ?? new Date(),
  } as Connection;
}

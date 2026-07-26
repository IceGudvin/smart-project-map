/**
 * eventBus.ts — Типизированная шина событий для layer-4-ui.
 */
const _listeners = {};
export function on(event, handler) {
    if (!_listeners[event])
        _listeners[event] = new Set();
    _listeners[event].add(handler);
    return () => off(event, handler);
}
export function off(event, handler) {
    ;
    _listeners[event]?.delete(handler);
}
export function once(event, handler) {
    const wrapper = (payload) => { handler(payload); off(event, wrapper); };
    return on(event, wrapper);
}
export function emit(event, payload) {
    const handlers = _listeners[event];
    if (!handlers)
        return;
    for (const handler of handlers) {
        try {
            handler(payload);
        }
        catch (err) {
            console.error(`[eventBus] '${event}':`, err);
        }
    }
}
export function clear(event) {
    delete _listeners[event];
}

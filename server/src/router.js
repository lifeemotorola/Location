import { ApiError } from './errors.js';

/**
 * Tiny router: exact segments plus `:param` placeholders.
 * Routes are matched in registration order, so register static paths first.
 */
export class Router {
    constructor() {
        this.routes = [];
    }

    add(method, pattern, handler) {
        this.routes.push({
            method: method.toUpperCase(),
            segments: pattern.split('/').filter(Boolean),
            handler
        });
        return this;
    }

    get(pattern, handler) { return this.add('GET', pattern, handler); }
    post(pattern, handler) { return this.add('POST', pattern, handler); }
    patch(pattern, handler) { return this.add('PATCH', pattern, handler); }
    delete(pattern, handler) { return this.add('DELETE', pattern, handler); }

    match(method, pathname) {
        const parts = pathname.split('/').filter(Boolean);
        const allowed = new Set();

        for (const route of this.routes) {
            if (route.segments.length !== parts.length) continue;

            const params = {};
            let matched = true;

            for (let i = 0; i < route.segments.length; i += 1) {
                const segment = route.segments[i];
                if (segment.startsWith(':')) {
                    params[segment.slice(1)] = decodeURIComponent(parts[i]);
                } else if (segment !== parts[i]) {
                    matched = false;
                    break;
                }
            }

            if (!matched) continue;
            if (route.method !== method.toUpperCase()) {
                allowed.add(route.method);
                continue;
            }

            return { handler: route.handler, params };
        }

        if (allowed.size > 0) {
            throw new ApiError(405, 'method_not_allowed',
                `Use ${[...allowed].join(' or ')} for this endpoint.`);
        }
        return null;
    }
}

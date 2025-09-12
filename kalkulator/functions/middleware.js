export const onRequest = async ({ request, next }) => {
    const auth = request.headers.get('Authorization') || '';
    const expectedUser = 'user';
    const expectedPass = 'Arkon2025';

    const challenge = new Response('Authentication required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Czyste Powietrze"'
        }
    });

    if (!auth.startsWith('Basic ')) {
        return challenge;
    }

    try {
        const [user, pass] = atob(auth.slice(6)).split(':');
        if (user === expectedUser && pass === expectedPass) {
            return next();
        }
    } catch (e) {
        console.error(e);
    }

    return challenge;
};
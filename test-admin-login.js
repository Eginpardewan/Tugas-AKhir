async function testLogin() {
    try {
        const fetch = require('node-fetch'); // Ensure it works for node < 18 or use native
    } catch(e) {}
    
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@tajwid.com',
                password: 'admin123',
                role: 'admin'
            })
        });

        const loginData = await loginRes.json();
        console.log('Login Response:', loginData);
    } catch(e) {
        console.error(e);
    }
}
testLogin();

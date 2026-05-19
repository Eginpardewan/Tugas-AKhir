const ethers = require('ethers');

async function testSend() {
    const address = '0x5525598B4e3B70530c3acA29f1565dD5BD5344F5';
    // This signature is invalid but will let us see the logs
    const signature = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/admin/login-web3', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address,
                signature
            })
        });

        const loginData = await loginRes.json();
        console.log('Login Response:', loginData);
    } catch(e) {
        console.log(e);
    }
}
testSend();

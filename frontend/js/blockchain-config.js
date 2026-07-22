// ============================================================
// BLOCKCHAIN CONFIG — Sepolia Testnet
// File ini di-generate otomatis oleh deployment/deploy.js
// Jalankan: npx hardhat run deployment/deploy.js --network sepolia
//
// PENTING: Gunakan MetaMask dengan jaringan Sepolia Testnet
//   Chain ID   : 11155111  (0xaa36a7)
//   Explorer   : https://sepolia.etherscan.io
// ============================================================

const BLOCKCHAIN_CONFIG = {
    // === Jaringan ===
    network: 'sepolia',
    chainId: '0xaa36a7',        // 11155111 dalam hex
    chainIdDecimal: 11155111,
    networkName: 'Sepolia Testnet',
    currencySymbol: 'ETH',

    // === Smart Contract ===
    // Isi setelah deploy: npx hardhat run deployment/deploy.js --network sepolia
    contractAddress: localStorage.getItem('tajwidNilaiContract') || '',

    // === Wallet Umum ===
    sharedWalletAddress: '0xeeF8b2583b95624285054839F25F5A50b45Cb106',

    // === Explorer ===
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerTxUrl: 'https://sepolia.etherscan.io/tx/'
};

// ============================================================
// Helper: switch ke jaringan Sepolia
// ============================================================
async function switchToSepolia() {
    if (!window.ethereum) return false;
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BLOCKCHAIN_CONFIG.chainId }]
        });
        return true;
    } catch (err) {
        if (err.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: BLOCKCHAIN_CONFIG.chainId,
                        chainName: BLOCKCHAIN_CONFIG.networkName,
                        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://rpc.sepolia.org'],
                        blockExplorerUrls: [BLOCKCHAIN_CONFIG.explorerUrl]
                    }]
                });
                return true;
            } catch (addErr) {
                console.error('Gagal menambahkan Sepolia:', addErr);
                return false;
            }
        }
        return false;
    }
}

// ============================================================
// Helper: cek apakah MetaMask sudah di Sepolia
// ============================================================
async function isOnSepoliaNetwork() {
    if (!window.ethereum) return false;
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId === BLOCKCHAIN_CONFIG.chainId;
}

// ============================================================
// Helper: pastikan di Sepolia sebelum transaksi
// ============================================================
async function ensureSepoliaNetwork() {
    const onSepolia = await isOnSepoliaNetwork();
    if (!onSepolia) {
        console.log('Switching ke Sepolia...');
        return await switchToSepolia();
    }
    return true;
}

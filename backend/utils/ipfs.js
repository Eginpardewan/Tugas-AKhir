// backend/utils/ipfs.js
const { create } = require('ipfs-http-client');

// Konfigurasi Infura IPFS
const projectId = process.env.INFURA_IPFS_PROJECT_ID || '7116824dc3774ae69d46754c2c8713b3';
const projectSecret = process.env.INFURA_IPFS_PROJECT_SECRET || '';

// Auth string untuk Infura IPFS
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

// Inisialisasi IPFS client
const ipfs = create({
    url: 'https://ipfs.infura.io:5001/api/v0',
    headers: {
        authorization: auth
    }
});

/**
 * Upload file ke IPFS
 * @param {Buffer} fileBuffer - Buffer file
 * @param {string} fileName - Nama file
 * @returns {Promise<string>} - CID
 */
async function uploadToIPFS(fileBuffer, fileName) {
    try {
        const result = await ipfs.add({
            content: fileBuffer,
            path: fileName
        });
        console.log('✅ Uploaded to IPFS:', result.cid.toString());
        return result.cid.toString();
    } catch (error) {
        console.error('❌ Error uploading to IPFS:', error);
        throw error;
    }
}

/**
 * Upload file ke IPFS dengan folder
 */
async function uploadToIPFSWithFolder(fileBuffer, folder, fileName) {
    const path = `${folder}/${Date.now()}-${fileName}`;
    const result = await ipfs.add({
        content: fileBuffer,
        path: path
    });
    return result.cid.toString();
}

/**
 * Mendapatkan URL file dari IPFS
 */
function getIPFSUrl(cid, gateway = process.env.IPFS_GATEWAY || 'https://ipfs.infura.io/ipfs/') {
    return `${gateway}${cid}`;
}

/**
 * Pin file ke IPFS (agar permanen)
 */
async function pinToIPFS(cid) {
    try {
        await ipfs.pin.add(cid);
        console.log('✅ Pinned:', cid);
    } catch (error) {
        console.error('❌ Error pinning:', error);
    }
}

module.exports = {
    uploadToIPFS,
    uploadToIPFSWithFolder,
    getIPFSUrl,
    pinToIPFS
};
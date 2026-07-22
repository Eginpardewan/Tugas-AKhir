// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SertifikatTajwid {
    struct Sertifikat {
        uint256 id;
        address pemilik;
        string namaUser;
        uint256 nilai;
        uint256 tanggalTerbit;
        string ipfsHash;
        bool isValid;
    }

    struct UjianSertifikat {
        address user;
        uint256 nilai;
        uint256 timestamp;
        bool sudahBayar;
        bool sertifikatDiberikan;
    }

    Sertifikat[] public semuaSertifikat;
    mapping(address => uint256[]) private sertifikatMilikUser;
    mapping(address => UjianSertifikat) public hasilUjianSertifikat;
    
    address public admin;
    uint256 public biayaSertifikat = 20000; // dalam wei (0.00002 ETH)
    
    event SertifikatDiterbitkan(uint256 indexed id, address indexed pemilik, uint256 nilai);
    event PembayaranDikonfirmasi(address indexed user, uint256 amount);
    event UjianSelesai(address indexed user, uint256 nilai);
    
    constructor() {
        admin = msg.sender;
    }
    
    modifier hanyaAdmin() {
        require(msg.sender == admin, "Hanya admin yang bisa melakukan aksi ini");
        _;
    }
    
    // Simpan hasil ujian sertifikat user
    function simpanHasilUjian(address _user, uint256 _nilai) external hanyaAdmin {
        require(_nilai >= 0 && _nilai <= 100, "Nilai tidak valid");
        require(!hasilUjianSertifikat[_user].sertifikatDiberikan, "User sudah memiliki sertifikat");
        
        hasilUjianSertifikat[_user] = UjianSertifikat({
            user: _user,
            nilai: _nilai,
            timestamp: block.timestamp,
            sudahBayar: false,
            sertifikatDiberikan: false
        });
        
        emit UjianSelesai(_user, _nilai);
    }
    
    // Konfirmasi pembayaran oleh admin
    function konfirmasiPembayaran(address _user) external payable hanyaAdmin {
        require(hasilUjianSertifikat[_user].user == _user, "User belum mengikuti ujian");
        require(hasilUjianSertifikat[_user].nilai >= 80, "Nilai ujian kurang dari 80");
        require(!hasilUjianSertifikat[_user].sudahBayar, "Sudah melakukan pembayaran");
        require(msg.value >= biayaSertifikat, "Biaya sertifikat kurang");
        
        hasilUjianSertifikat[_user].sudahBayar = true;
        
        emit PembayaranDikonfirmasi(_user, msg.value);
    }
    
    // Terbitkan sertifikat (setelah pembayaran)
    function terbitkanSertifikat(
        address _pemilik,
        string memory _namaUser,
        string memory _ipfsHash
    ) external hanyaAdmin returns (uint256) {
        require(hasilUjianSertifikat[_pemilik].sudahBayar, "Belum melakukan pembayaran");
        require(!hasilUjianSertifikat[_pemilik].sertifikatDiberikan, "Sertifikat sudah diberikan");
        require(_pemilik != address(0), "Alamat tidak valid");
        
        uint256 nilai = hasilUjianSertifikat[_pemilik].nilai;
        
        Sertifikat memory newSertifikat = Sertifikat({
            id: semuaSertifikat.length,
            pemilik: _pemilik,
            namaUser: _namaUser,
            nilai: nilai,
            tanggalTerbit: block.timestamp,
            ipfsHash: _ipfsHash,
            isValid: true
        });
        
        semuaSertifikat.push(newSertifikat);
        sertifikatMilikUser[_pemilik].push(semuaSertifikat.length - 1);
        
        hasilUjianSertifikat[_pemilik].sertifikatDiberikan = true;
        
        emit SertifikatDiterbitkan(semuaSertifikat.length - 1, _pemilik, nilai);
        
        return semuaSertifikat.length - 1;
    }
    
    // Dapatkan semua sertifikat
    function dapatkanSemuaSertifikat() external view returns (Sertifikat[] memory) {
        return semuaSertifikat;
    }
    
    // Dapatkan sertifikat milik user
    function dapatkanSertifikatSaya(address _user) external view returns (Sertifikat[] memory) {
        uint256[] memory ids = sertifikatMilikUser[_user];
        Sertifikat[] memory result = new Sertifikat[](ids.length);
        
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = semuaSertifikat[ids[i]];
        }
        
        return result;
    }
    
    // Dapatkan detail sertifikat berdasarkan ID
    function dapatkanSertifikatById(uint256 _id) external view returns (Sertifikat memory) {
        require(_id < semuaSertifikat.length, "Sertifikat tidak ditemukan");
        return semuaSertifikat[_id];
    }
    
    // Cek apakah user sudah lulus ujian dan bisa bayar
    function cekKelayakanSertifikat(address _user) external view returns (bool, uint256, bool) {
        UjianSertifikat memory ujian = hasilUjianSertifikat[_user];
        bool layak = (ujian.user == _user && ujian.nilai >= 80 && !ujian.sudahBayar && !ujian.sertifikatDiberikan);
        return (layak, ujian.nilai, ujian.sudahBayar);
    }
    
    // Update biaya sertifikat
    function updateBiayaSertifikat(uint256 _biayaBaru) external hanyaAdmin {
        biayaSertifikat = _biayaBaru;
    }
    
    // Tarik dana (hanya admin)
    function tarikDana() external hanyaAdmin {
        payable(admin).transfer(address(this).balance);
    }
    
    // Dapatkan saldo kontrak
    function dapatkanSaldo() external view returns (uint256) {
        return address(this).balance;
    }
}


// ============================================================
// Contract 2: TajwidMateri
// ============================================================
contract TajwidMateri {

    struct Materi {
        uint256 id;
        string judul;
        string bab;
        string konten;
        string videoUrl;
        string audioUrl;
        uint256 urutan;
        uint256 timestamp;
    }
    
    struct Soal {
        uint256 id;
        string bab;
        string pertanyaan;
        string pilihanA;
        string pilihanB;
        string pilihanC;
        string pilihanD;
        uint8 jawabanBenar; // 1=A,2=B,3=C,4=D
        uint256 poin;
    }
    
    struct NilaiUser {
        address user;
        string bab;
        uint256 nilai;
        uint256 timestamp;
        uint256 percobaanKe;
    }
    
    Materi[] public semuaMateri;
    Soal[] public semuaSoal;
    NilaiUser[] public semuaNilai;
    
    mapping(address => mapping(string => NilaiUser)) public nilaiPerBab;
    mapping(address => uint256) public totalNilaiRataRata;
    
    address public admin;
    
    event MateriDitambahkan(uint256 indexed id, string judul);
    event SoalDitambahkan(uint256 indexed id, string bab);
    event UjianDiselesaikan(address indexed user, string bab, uint256 nilai);
    
    constructor() {
        admin = msg.sender;
    }
    
    modifier hanyaAdmin() {
        require(msg.sender == admin, "Hanya admin");
        _;
    }
    
    // Tambah materi
    function tambahMateri(
        string memory _judul,
        string memory _bab,
        string memory _konten,
        string memory _videoUrl,
        string memory _audioUrl,
        uint256 _urutan
    ) external hanyaAdmin {
        semuaMateri.push(Materi({
            id: semuaMateri.length,
            judul: _judul,
            bab: _bab,
            konten: _konten,
            videoUrl: _videoUrl,
            audioUrl: _audioUrl,
            urutan: _urutan,
            timestamp: block.timestamp
        }));
        
        emit MateriDitambahkan(semuaMateri.length - 1, _judul);
    }
    
    // Tambah soal
    function tambahSoal(
        string memory _bab,
        string memory _pertanyaan,
        string memory _pilihanA,
        string memory _pilihanB,
        string memory _pilihanC,
        string memory _pilihanD,
        uint8 _jawabanBenar,
        uint256 _poin
    ) external hanyaAdmin {
        semuaSoal.push(Soal({
            id: semuaSoal.length,
            bab: _bab,
            pertanyaan: _pertanyaan,
            pilihanA: _pilihanA,
            pilihanB: _pilihanB,
            pilihanC: _pilihanC,
            pilihanD: _pilihanD,
            jawabanBenar: _jawabanBenar,
            poin: _poin
        }));
        
        emit SoalDitambahkan(semuaSoal.length - 1, _bab);
    }
    
    // Dapatkan semua materi
    function dapatkanSemuaMateri() external view returns (Materi[] memory) {
        return semuaMateri;
    }
    
    // Dapatkan materi berdasarkan bab
    function dapatkanMateriByBab(string memory _bab) external view returns (Materi[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < semuaMateri.length; i++) {
            if (keccak256(bytes(semuaMateri[i].bab)) == keccak256(bytes(_bab))) {
                count++;
            }
        }
        
        Materi[] memory result = new Materi[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < semuaMateri.length; i++) {
            if (keccak256(bytes(semuaMateri[i].bab)) == keccak256(bytes(_bab))) {
                result[index] = semuaMateri[i];
                index++;
            }
        }
        
        return result;
    }
    
    // Dapatkan soal berdasarkan bab
    function dapatkanSoalByBab(string memory _bab) external view returns (Soal[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < semuaSoal.length; i++) {
            if (keccak256(bytes(semuaSoal[i].bab)) == keccak256(bytes(_bab))) {
                count++;
            }
        }
        
        Soal[] memory result = new Soal[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < semuaSoal.length; i++) {
            if (keccak256(bytes(semuaSoal[i].bab)) == keccak256(bytes(_bab))) {
                result[index] = semuaSoal[i];
                index++;
            }
        }
        
        return result;
    }
    
    // Submit nilai ujian
    function submitNilai(
        address _user,
        string memory _bab,
        uint256 _nilai,
        uint256 _percobaanKe
    ) external hanyaAdmin {
        require(_nilai >= 0 && _nilai <= 100, "Nilai tidak valid");
        
        nilaiPerBab[_user][_bab] = NilaiUser({
            user: _user,
            bab: _bab,
            nilai: _nilai,
            timestamp: block.timestamp,
            percobaanKe: _percobaanKe
        });
        
        semuaNilai.push(NilaiUser({
            user: _user,
            bab: _bab,
            nilai: _nilai,
            timestamp: block.timestamp,
            percobaanKe: _percobaanKe
        }));
        
        // Hitung rata-rata
        uint256 totalNilai = 0;
        uint256 jumlahBab = 0;
        
        // Logic sederhana untuk hitung rata-rata
        // Di implementasi frontend nanti
        
        emit UjianDiselesaikan(_user, _bab, _nilai);
    }
    
    // Dapatkan nilai user per bab
    function dapatkanNilaiUser(address _user, string memory _bab) external view returns (uint256) {
        return nilaiPerBab[_user][_bab].nilai;
    }
    
    // Dapatkan semua nilai user
    function dapatkanSemuaNilaiUser(address _user) external view returns (NilaiUser[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < semuaNilai.length; i++) {
            if (semuaNilai[i].user == _user) {
                count++;
            }
        }
        
        NilaiUser[] memory result = new NilaiUser[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < semuaNilai.length; i++) {
            if (semuaNilai[i].user == _user) {
                result[index] = semuaNilai[i];
                index++;
            }
        }
        
        return result;
    }
}
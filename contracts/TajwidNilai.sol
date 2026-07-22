// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TajwidNilai
 * @notice Contract untuk mencatat nilai ujian per bab ke blockchain.
 *         User memanggil sendiri menggunakan wallet MetaMask mereka,
 *         sehingga nilai tercatat atas nama wallet user itu sendiri.
 */
contract TajwidNilai {

    // ============================================================
    // STRUCT & STORAGE
    // ============================================================

    struct HasilUjianBab {
        address user;
        string  babNama;
        uint256 nilai;          // 0–100
        bool    isLulus;        // true jika nilai >= 80
        uint256 percobaanKe;
        uint256 timestamp;
    }

    // Semua hasil yang pernah dicatat
    HasilUjianBab[] public semuaHasil;

    // user → babNama → index di semuaHasil (hasil terbaru)
    mapping(address => mapping(string => uint256)) private indexTerbaru;
    mapping(address => mapping(string => bool))    private sudahPernah;

    // Jumlah percobaan user per bab
    mapping(address => mapping(string => uint256)) public jumlahPercobaan;

    // ============================================================
    // EVENTS
    // ============================================================

    event NilaiBabDicatat(
        address indexed user,
        string  babNama,
        uint256 nilai,
        bool    isLulus,
        uint256 percobaanKe,
        uint256 timestamp
    );

    // ============================================================
    // FUNGSI UTAMA
    // ============================================================

    /**
     * @notice Catat nilai ujian bab ke blockchain.
     *         Dipanggil langsung oleh user menggunakan wallet mereka.
     * @param _babNama  Nama bab yang diujikan (e.g. "Hukum Nun Mati dan Tanwin")
     * @param _nilai    Nilai yang diperoleh (0–100)
     */
    function submitNilaiBab(
        string memory _babNama,
        uint256       _nilai
    ) external {
        require(_nilai <= 100, "Nilai tidak valid (0-100)");
        require(bytes(_babNama).length > 0, "Nama bab tidak boleh kosong");

        jumlahPercobaan[msg.sender][_babNama]++;
        uint256 percobaan = jumlahPercobaan[msg.sender][_babNama];
        bool lulus = _nilai >= 80;

        HasilUjianBab memory hasil = HasilUjianBab({
            user:        msg.sender,
            babNama:     _babNama,
            nilai:       _nilai,
            isLulus:     lulus,
            percobaanKe: percobaan,
            timestamp:   block.timestamp
        });

        semuaHasil.push(hasil);
        uint256 idx = semuaHasil.length - 1;

        indexTerbaru[msg.sender][_babNama] = idx;
        sudahPernah[msg.sender][_babNama]  = true;

        emit NilaiBabDicatat(
            msg.sender,
            _babNama,
            _nilai,
            lulus,
            percobaan,
            block.timestamp
        );
    }

    // ============================================================
    // FUNGSI BACA
    // ============================================================

    /**
     * @notice Ambil hasil ujian terbaru user untuk satu bab.
     */
    function getNilaiBab(address _user, string memory _babNama)
        external
        view
        returns (HasilUjianBab memory)
    {
        require(sudahPernah[_user][_babNama], "Belum ada data untuk bab ini");
        return semuaHasil[indexTerbaru[_user][_babNama]];
    }

    /**
     * @notice Ambil semua hasil ujian milik satu user.
     */
    function getSemuaHasilUser(address _user)
        external
        view
        returns (HasilUjianBab[] memory)
    {
        uint256 count = 0;
        for (uint256 i = 0; i < semuaHasil.length; i++) {
            if (semuaHasil[i].user == _user) count++;
        }

        HasilUjianBab[] memory hasil = new HasilUjianBab[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < semuaHasil.length; i++) {
            if (semuaHasil[i].user == _user) {
                hasil[idx] = semuaHasil[i];
                idx++;
            }
        }
        return hasil;
    }

    /**
     * @notice Cek apakah user sudah lulus bab tertentu.
     */
    function cekLulusBab(address _user, string memory _babNama)
        external
        view
        returns (bool)
    {
        if (!sudahPernah[_user][_babNama]) return false;
        return semuaHasil[indexTerbaru[_user][_babNama]].isLulus;
    }

    /**
     * @notice Total semua hasil yang tercatat.
     */
    function totalHasil() external view returns (uint256) {
        return semuaHasil.length;
    }
}

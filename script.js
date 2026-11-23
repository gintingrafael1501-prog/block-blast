const papanEl = document.getElementById("papan");
const pilihanEl = document.getElementById("pilihan-balok");
const skorEl = document.getElementById("skor");
const skorAkhirEl = document.getElementById("skor-akhir");
const layarGameOver = document.getElementById("layar-gameover");
const tombolReset = document.getElementById("tombol-reset");
const tombolMainLagi = document.getElementById("tombol-main-lagi");

const UKURAN = 8;
let papan = [];
let skor = 0;
let balokTersedia = [];
let indeksDipilih = null;

// Menggunakan angka biasa agar aman dan tidak terpotong
const DAFTAR_BENTUK = [
    [[1]],
    [[1, 1]],
    [[1], [1]],
    [[1, 1, 1]],
    [[1], [1], [1]],
    [[1, 1], [1, 1]],
    [[1, 0], [1, 0], [1, 1]]
];


function mulaiGame() {
    papan = [];
    for (let b = 0; b < UKURAN; b++) {
        let baris = [];
        for (let k = 0; k < UKURAN; k++) {
            baris.push(0);
        }
        papan.push(baris);
    }
    skor = 0;
    skorEl.textContent = skor;
    layarGameOver.classList.add("sembunyi");
    buatBalokBaru();
    gambarPapan();
}

function buatBalokBaru() {
    balokTersedia = [];
    for (let i = 0; i < 3; i++) {
        let acak = Math.floor(Math.random() * DAFTAR_BENTUK.length);
        balokTersedia.push(DAFTAR_BENTUK[acak]);
    }
    indeksDipilih = 0;
    gambarPilihanBalok();
    cekGameOver();
}

function gambarPapan() {
    papanEl.innerHTML = "";
    for (let b = 0; b < UKURAN; b++) {
        for (let k = 0; k < UKURAN; k++) {
            const sel = document.createElement("div");
            sel.classList.add("sel");
            if (papan[b][k] === 1) {
                sel.classList.add("terisi");
            }
            sel.addEventListener("click", function() {
                letakkanBalok(b, k);
            });
            papanEl.appendChild(sel);
        }
    }
}

function gambarPilihanBalok() {
    pilihanEl.innerHTML = "";
    for (let i = 0; i < balokTersedia.length; i++) {
        const bentuk = balokTersedia[i];
        if (bentuk === null) continue;

        const wadah = document.createElement("div");
        wadah.classList.add("wadah-bentuk");
        if (i === indeksDipilih) {
            wadah.classList.add("dipilih");
        }

        let jumlahKolom = bentuk[0].length;
        wadah.style.gridTemplateColumns = "repeat(" + jumlahKolom + ", 24px)";

        for (let b = 0; b < bentuk.length; b++) {
            for (let k = 0; k < bentuk[b].length; k++) {
                const kotak = document.createElement("div");
                kotak.classList.add("kotak-kecil");
                if (bentuk[b][k] === 1) {
                    kotak.classList.add("aktif");
                }
                wadah.appendChild(kotak);
            }
        }

        wadah.addEventListener("click", function() {
            indeksDipilih = i;
            gambarPilihanBalok();
        });

        pilihanEl.appendChild(wadah);
    }
}

function cekBisaDitaruh(bentuk, barisAwal, kolomAwal) {
    for (let b = 0; b < bentuk.length; b++) {
        for (let k = 0; k < bentuk[b].length; k++) {
            if (bentuk[b][k] === 1) {
                let targetBaris = barisAwal + b;
                let targetKolom = kolomAwal + k;

                if (targetBaris >= UKURAN || targetKolom >= UKURAN) {
                    return false;
                }
                if (papan[targetBaris][targetKolom] === 1) {
                    return false;
                }
            }
        }
    }
    return true;
}

function letakkanBalok(barisAwal, kolomAwal) {
    if (indeksDipilih === null || balokTersedia[indeksDipilih] === null) {
        return;
    }

    const bentuk = balokTersedia[indeksDipilih];

    if (cekBisaDitaruh(bentuk, barisAwal, kolomAwal)) {
        for (let b = 0; b < bentuk.length; b++) {
            for (let k = 0; k < bentuk[b].length; k++) {
                if (bentuk[b][k] === 1) {
                    papan[barisAwal + b][kolomAwal + k] = 1;
                    skor += 10;
                }
            }
        }

        balokTersedia[indeksDipilih] = null;
        indeksDipilih = null;

        for (let i = 0; i < balokTersedia.length; i++) {
            if (balokTersedia[i] !== null) {
                indeksDipilih = i;
                break;
            }
        }

        cekGarisPenuh();
        skorEl.textContent = skor;
        gambarPapan();

        let semuaHabis = true;
        for (let i = 0; i < balokTersedia.length; i++) {
            if (balokTersedia[i] !== null) {
                semuaHabis = false;
            }
        }

        if (semuaHabis) {
            buatBalokBaru();
        } else {
            gambarPilihanBalok();
            cekGameOver();
        }
    }
}

function cekGarisPenuh() {
    let barisHapus = [];
    let kolomHapus = [];

    for (let b = 0; b < UKURAN; b++) {
        let penuh = true;
        for (let k = 0; k < UKURAN; k++) {
            if (papan[b][k] === 0) {
                penuh = false;
            }
        }
        if (penuh) {
            barisHapus.push(b);
        }
    }

    for (let k = 0; k < UKURAN; k++) {
        let penuh = true;
        for (let b = 0; b < UKURAN; b++) {
            if (papan[b][k] === 0) {
                penuh = false;
            }
        }
        if (penuh) {
            kolomHapus.push(k);
        }
    }

    for (let i = 0; i < barisHapus.length; i++) {
        let b = barisHapus[i];
        for (let k = 0; k < UKURAN; k++) {
            papan[b][k] = 0;
        }
        skor += 100;
    }

    for (let i = 0; i < kolomHapus.length; i++) {
        let k = kolomHapus[i];
        for (let b = 0; b < UKURAN; b++) {
            papan[b][k] = 0;
        }
        skor += 100;
    }
}

function cekGameOver() {
    let adaLangkah = false;

    for (let i = 0; i < balokTersedia.length; i++) {
        const bentuk = balokTersedia[i];
        if (bentuk === null) continue;

        for (let b = 0; b < UKURAN; b++) {
            for (let k = 0; k < UKURAN; k++) {
                if (cekBisaDitaruh(bentuk, b, k)) {
                    adaLangkah = true;
                }
            }
        }
    }

    if (!adaLangkah) {
        skorAkhirEl.textContent = skor;
        layarGameOver.classList.remove("sembunyi");
    }
}

tombolReset.addEventListener("click", mulaiGame);
tombolMainLagi.addEventListener("click", mulaiGame);

mulaiGame();

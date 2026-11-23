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
let indeksSedangDitarik = null;

// Daftar pilihan warna cerah untuk balok
const DAFTAR_WARNA = [
    "#f38ba8", // Merah muda
    "#fab387", // Oranye
    "#f9e2af", // Kuning
    "#a6e3a1", // Hijau
    "#89b4fa", // Biru
    "#cba6f7"  // Ungu
];

// Daftar bentuk balok
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
            // 0 artinya kosong, selain 0 berisi kode warna
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
        let acakBentuk = Math.floor(Math.random() * DAFTAR_BENTUK.length);
        let acakWarna = Math.floor(Math.random() * DAFTAR_WARNA.length);
        
        balokTersedia.push({
            bentuk: DAFTAR_BENTUK[acakBentuk],
            warna: DAFTAR_WARNA[acakWarna]
        });
    }
    gambarPilihanBalok();
    cekGameOver();
}

function gambarPapan() {
    papanEl.innerHTML = "";
    for (let b = 0; b < UKURAN; b++) {
        for (let k = 0; k < UKURAN; k++) {
            const sel = document.createElement("div");
            sel.classList.add("sel");
            
            // Jika kotak berisi kode warna, tampilkan warnanya
            if (papan[b][k] !== 0) {
                sel.style.backgroundColor = papan[b][k];
            }

            // Izinkan balok dijatuhkan (drop) di atas kotak ini
            sel.addEventListener("dragover", function(event) {
                event.preventDefault();
            });

            sel.addEventListener("drop", function(event) {
                event.preventDefault();
                if (indeksSedangDitarik !== null) {
                    letakkanBalok(b, k, indeksSedangDitarik);
                }
            });

            papanEl.appendChild(sel);
        }
    }
}

function gambarPilihanBalok() {
    pilihanEl.innerHTML = "";
    for (let i = 0; i < balokTersedia.length; i++) {
        const item = balokTersedia[i];
        if (item === null) continue;

        const bentuk = item.bentuk;
        const warna = item.warna;

        const wadah = document.createElement("div");
        wadah.classList.add("wadah-bentuk");
        
        // Aktifkan fitur drag pada balok
        wadah.setAttribute("draggable", "true");

        wadah.addEventListener("dragstart", function() {
            indeksSedangDitarik = i;
        });

        wadah.addEventListener("dragend", function() {
            indeksSedangDitarik = null;
        });

        let jumlahKolom = bentuk[0].length;
        wadah.style.gridTemplateColumns = "repeat(" + jumlahKolom + ", 24px)";

        for (let b = 0; b < bentuk.length; b++) {
            for (let k = 0; k < bentuk[b].length; k++) {
                const kotak = document.createElement("div");
                kotak.classList.add("kotak-kecil");
                if (bentuk[b][k] === 1) {
                    kotak.style.backgroundColor = warna;
                }
                wadah.appendChild(kotak);
            }
        }

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
                if (papan[targetBaris][targetKolom] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

function letakkanBalok(barisAwal, kolomAwal, indeks) {
    const item = balokTersedia[indeks];
    if (item === null) return;

    const bentuk = item.bentuk;
    const warna = item.warna;

    if (cekBisaDitaruh(bentuk, barisAwal, kolomAwal)) {
        for (let b = 0; b < bentuk.length; b++) {
            for (let k = 0; k < bentuk[b].length; k++) {
                if (bentuk[b][k] === 1) {
                    papan[barisAwal + b][kolomAwal + k] = warna;
                    skor += 10;
                }
            }
        }

        balokTersedia[indeks] = null;
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
        const item = balokTersedia[i];
        if (item === null) continue;

        for (let b = 0; b < UKURAN; b++) {
            for (let k = 0; k < UKURAN; k++) {
                if (cekBisaDitaruh(item.bentuk, b, k)) {
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

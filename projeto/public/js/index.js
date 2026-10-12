function loadBg() {
    // o background
    var svg = document.getElementById("bg");

    // width e height
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    // o futuro innerHtml
    let str = "";

    for (let i = -100; i < height + 200; i += 300) {
        let d = `M -100 ${i} `

        for (let j = -100; j < width + 500; j += 600) {
            d += 'q 150 -200 300 0 q 150 200 300 0 '
        }

        str += `<path class="estrada" d="${d}"/>`
        str += `<path class="estrada_linha" d="${d}"/>`
    }

    svg.innerHTML = str
}

window.addEventListener("load", loadBg);
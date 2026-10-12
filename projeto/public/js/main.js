(() => {
    "use strict";

    const originInput = document.getElementById("origin");
    const destinationInput = document.getElementById("destination");
    const locateButton = document.getElementById("locate-button");
    const routeForm = document.getElementById("route-form");
    const searchButton = document.getElementById("search-button");
    const roleToggle = document.getElementById("role-toggle");
    const passengerLabel = document.getElementById("passenger-label");
    const driverLabel = document.getElementById("driver-label");
    const statusBox = document.getElementById("status");

    let currentPosition = null;
    let currentMarker = null;
    let destinationMarker = null;

    function setStatus(message) {
        statusBox.textContent = message;
    }

    // Posição inicial aproximada no Brasil; o mapa será atualizado após geolocalização.
    const map = L.map("map", {
        zoomControl: true
    }).setView([-15.7939, -47.8828], 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    function formatAddress(address) {
        if (!address) return "";
        return [
            address.road,
            address.house_number,
            address.suburb || address.neighbourhood,
            address.city || address.town || address.village || address.municipality,
            address.state,
            address.postcode
        ].filter(Boolean).join(", ");
    }

    async function reverseGeocode(latitude, longitude) {
        // Nominatim público: use com moderação e não faça chamadas repetidas em sequência.
        const url = new URL("https://nominatim.openstreetmap.org/reverse");
        url.search = new URLSearchParams({
            format: "jsonv2",
            lat: String(latitude),
            lon: String(longitude),
            zoom: "18",
            addressdetails: "1"
        });

        const response = await fetch(url, {
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error("O serviço de endereços não respondeu corretamente.");
        }

        const data = await response.json();
        return formatAddress(data.address) || data.display_name || "";
    }

    function showCurrentPosition(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        currentPosition = { latitude, longitude };

        const point = [latitude, longitude];
        map.setView(point, 16);

        if (currentMarker) {
            currentMarker.setLatLng(point);
        } else {
            currentMarker = L.marker(point).addTo(map);
        }
        currentMarker.bindPopup("Sua localização atual").openPopup();

        return reverseGeocode(latitude, longitude);
    }

    async function locateUser(fillOrigin = true) {
        if (!("geolocation" in navigator)) {
            setStatus("Seu navegador não oferece geolocalização.");
            return;
        }

        locateButton.disabled = true;
        setStatus("Obtendo sua localização…");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const address = await showCurrentPosition(position);
                    if (fillOrigin && address) {
                        originInput.value = address;
                    }
                    setStatus(address
                        ? "Localização encontrada. Você pode editar o endereço de partida."
                        : "Localização encontrada, mas não foi possível obter o endereço.");
                } catch (error) {
                    // A posição e o mapa continuam funcionando mesmo se o Nominatim falhar.
                    setStatus("Mapa centralizado na sua posição, mas não foi possível consultar o endereço. Tente novamente mais tarde.");
                } finally {
                    locateButton.disabled = false;
                }
            },
            (error) => {
                locateButton.disabled = false;

                const messages = {
                    1: "Permita o acesso à localização nas configurações do navegador.",
                    2: "Não foi possível determinar sua localização.",
                    3: "A solicitação de localização expirou. Tente novamente."
                };
                setStatus(messages[error.code] || "Não foi possível acessar sua localização.");
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 60000
            }
        );
    }

    async function geocodeAddress(query) {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.search = new URLSearchParams({
            q: query,
            format: "jsonv2",
            limit: "1",
            addressdetails: "1"
        });

        const response = await fetch(url, {
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error("Não foi possível consultar o endereço.");
        }

        const results = await response.json();
        if (!results.length) {
            throw new Error("Endereço não encontrado. Tente informar rua, cidade e estado.");
        }

        return results[0];
    }

    routeForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const destination = destinationInput.value.trim();
        const origin = originInput.value.trim();

        if (!origin && !destination) {
            setStatus("Informe um endereço de partida ou destino, ou use o botão de localização.");
            return;
        }

        searchButton.disabled = true;
        setStatus("Buscando endereço…");

        try {
            // Se a partida não estiver preenchida, tenta usar a localização atual.
            if (!origin && currentPosition) {
                originInput.value = `${currentPosition.latitude}, ${currentPosition.longitude}`;
            }

            if (destination) {
                const result = await geocodeAddress(destination);
                const point = [Number(result.lat), Number(result.lon)];

                if (destinationMarker) {
                    destinationMarker.setLatLng(point);
                } else {
                    destinationMarker = L.marker(point).addTo(map);
                }

                destinationMarker.bindPopup(
                    result.display_name || "Destino"
                ).openPopup();

                if (currentPosition) {
                    const bounds = L.latLngBounds(
                        [currentPosition.latitude, currentPosition.longitude],
                        point
                    );
                    map.fitBounds(bounds.pad(0.18), { maxZoom: 15 });
                } else {
                    map.setView(point, 15);
                }

                setStatus("Destino encontrado no mapa. A busca de caronas ainda será implementada.");
            } else {
                await locateUser(true);
            }
        } catch (error) {
            setStatus(error.message || "Ocorreu um erro ao buscar o endereço.");
        } finally {
            searchButton.disabled = false;
        }
    });

    locateButton.addEventListener("click", () => locateUser(true));

    roleToggle.addEventListener("change", () => {
        const isDriver = roleToggle.checked;
        passengerLabel.classList.toggle("active", !isDriver);
        driverLabel.classList.toggle("active", isDriver);
        // O toggle é apenas visual neste trabalho; a lógica de motorista/passageiro fica para depois.
        setStatus(isDriver
            ? "Modo motorista selecionado (visual; ainda sem funcionalidade)."
            : "Modo passageiro selecionado (visual; ainda sem funcionalidade).");
    });

    // Tenta obter a posição ao abrir. O navegador solicitará permissão ao usuário.
    // A página precisa estar em HTTPS ou localhost para geolocalização funcionar.
    if ("geolocation" in navigator) {
        locateUser(false);
    } else {
        setStatus("Geolocalização não está disponível neste navegador.");
    }

    // Corrige o tamanho do mapa quando o layout muda entre desktop e celular.
    window.addEventListener("resize", () => {
        map.invalidateSize();
    });
})();

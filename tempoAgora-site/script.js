document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES DE CONFIGURAÇÃO ---
    const SEARCH_MIN_CHARS = 3;
    const DEBOUNCE_DELAY = 600; // ms
    const BULLETIN_UPDATE_INTERVAL = 3 * 60 * 1000; // 3 minutos

    // --- ELEMENTOS DO DOM ---
    const grid = document.getElementById('cards-grid');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const panicModal = document.getElementById('panic-modal');
    const phoneNumberInput = document.getElementById('phone-number');
    const radarContainer = document.getElementById('radar-container');
    const forecastBrasilContainer = document.getElementById('forecast-brasil-container');
    const emptyStateContainer = document.getElementById('empty-state');
    const bulletinSection = document.getElementById('bulletin-section');
    const searchEmptyState = document.getElementById('search-empty-state');
    const mainDashboardContent = document.getElementById('main-dashboard-content');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchResultsGrid = document.getElementById('search-results-grid');
    const emergencyCarousel = document.getElementById('emergency-carousel');
    const lastUpdateTimeEl = document.getElementById('last-update-time');
    const nextUpdateCountdownEl = document.getElementById('next-update-countdown');
    const progressBar = document.getElementById('bulletin-progress-bar');
    const searchFeedback = document.getElementById('search-feedback');

    let citiesConfig = []; // Será preenchido a partir do data.json
    let emergencyServices = []; // Será preenchido a partir do data.json
    let allCitiesData = []; // Armazena dados das cidades da tela inicial
    let debounceTimer; // Timer para o input de busca
    let bulletinUpdateInterval; // Variável para o intervalo do timer do boletim

    // --- NÍVEIS DE PERIGO E SIGNIFICADO PARA SOBREVIVÊNCIA ---
    const DANGER_LEVELS = {
        'Amarelo': {
            colorClass: 'text-yellow-400',
            borderColorClass: 'border-yellow-400/60',
            bgColorClass: 'bg-yellow-500/10',
            animationClass: '',
            level: 'Perigo Potencial',
            meaning: 'Vigilância Necessária. Cuidado na prática de atividades ao ar livre. Há risco baixo, mas existente, de ocorrências como corte de energia, queda de galhos e alagamentos pontuais. Planeje o dia com cautela.'
        },
        'Laranja': {
            colorClass: 'text-orange-400',
            borderColorClass: 'border-orange-400/60',
            bgColorClass: 'bg-orange-500/10',
            animationClass: 'animate-pulse-orange',
            level: 'Perigo',
            meaning: 'Atenção Máxima. Condição meteorológica perigosa. Risco de danos moderados. Mantenha-se informado regularmente e prepare-se para possíveis interrupções em sua rotina. Considere adiar viagens e atividades não essenciais.'
        },
        'Vermelho': {
            colorClass: 'text-red-500',
            borderColorClass: 'border-red-500/60',
            bgColorClass: 'bg-red-500/10',
            animationClass: 'animate-pulse-red',
            level: 'Grande Perigo',
            meaning: 'Ação Imediata. Previsão de fenômenos meteorológicos de intensidade excepcional com grande probabilidade de danos e acidentes, incluindo risco à integridade física e à vida humana. Busque abrigo seguro imediatamente e siga as instruções das autoridades.'
        }
    };

    // Mapeamento de códigos de clima severo para os níveis de perigo
    const WEATHER_CODE_DANGER_MAP = {
        65: 'Laranja', // Chuva forte
        82: 'Laranja', // Tempestade
        95: 'Vermelho'  // Trovoada
    };

    // Prioridade dos níveis de perigo para determinar o mais alto
    const DANGER_LEVEL_PRIORITY = { 'Amarelo': 1, 'Laranja': 2, 'Vermelho': 3 };
    const SEVERE_WEATHER_CODES = Object.keys(WEATHER_CODE_DANGER_MAP).map(Number);

    // --- GERENCIAMENTO DE CIDADES FAVORITAS (localStorage) ---
    const getPinnedCities = () => JSON.parse(localStorage.getItem('pinnedCities')) || [];
    const addPinnedCity = (cityId) => {
        const pinned = getPinnedCities();
        localStorage.setItem('pinnedCities', JSON.stringify([...new Set([...pinned, cityId])]));
    };
    const removePinnedCity = (cityId) => {
        const pinned = getPinnedCities();
        localStorage.setItem('pinnedCities', JSON.stringify(pinned.filter(id => id !== cityId)));
    };

    // --- FUNÇÕES AUXILIARES E TRADUÇÃO ---
    function getConditionFromCode(code) {
        const conditions = {
            0: { condition: 'Céu limpo', icon: 'fa-sun' }, 1: { condition: 'Quase limpo', icon: 'fa-cloud-sun' }, 2: { condition: 'Parcialmente nublado', icon: 'fa-cloud-sun' }, 3: { condition: 'Nublado', icon: 'fa-cloud' }, 45: { condition: 'Nevoeiro', icon: 'fa-smog' }, 48: { condition: 'Nevoeiro com geada', icon: 'fa-smog' }, 51: { condition: 'Garoa leve', icon: 'fa-cloud-rain' }, 53: { condition: 'Garoa moderada', icon: 'fa-cloud-rain' }, 55: { condition: 'Garoa forte', icon: 'fa-cloud-showers-heavy' }, 61: { condition: 'Chuva leve', icon: 'fa-cloud-rain' }, 63: { condition: 'Chuva moderada', icon: 'fa-cloud-showers-heavy' }, 65: { condition: 'Chuva forte', icon: 'fa-cloud-showers-heavy' }, 80: { condition: 'Pancadas leves', icon: 'fa-cloud-sun-rain' }, 81: { condition: 'Pancadas moderadas', icon: 'fa-cloud-sun-rain' }, 82: { condition: 'Tempestade', icon: 'fa-poo-storm' }, 95: { condition: 'Trovoada', icon: 'fa-cloud-bolt' },
        };
        return conditions[code] || { condition: 'Desconhecido', icon: 'fa-question-circle' };
    }

    function getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalização não é suportada pelo seu navegador.'));
            } else {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            }
        });
    }

    // --- MODAL DE PÂNICO ---
    window.openPanicModal = () => {
        panicModal.classList.remove('hidden');
        panicModal.classList.add('flex');
    };

    window.closePanicModal = () => {
        panicModal.classList.add('hidden');
        panicModal.classList.remove('flex');
    };

    window.sharePanicInfo = async (method) => {
        const phoneNumber = phoneNumberInput.value;
        if (!phoneNumber) {
            alert('Por favor, insira o número de telefone.');
            return;
        }
        try {
            const location = await getCurrentLocation();
            const { latitude, longitude } = location.coords;
            const message = `Preciso de ajuda! Minha localização atual é: https://www.google.com/maps?q=${latitude},${longitude}`;
            
            if (method === 'whatsapp') {
                window.open(`https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`, '_blank');
            }
            closePanicModal();
        } catch (error) {
            alert('Não foi possível obter a localização. Verifique as permissões.');
        }
    };

    // --- COMPARTILHAMENTO WHATSAPP ---
    window.handleShareClick = (buttonElement) => {
        const { cidade, condicao, temperatura, sensacao, umidade, vento } = buttonElement.dataset;
        const weatherReport = `☀️ *Clima em ${cidade}:*\n\nCondição: *${condicao}*\nTemperatura: *${temperatura}* (Sensação: *${sensacao}*)\nUmidade: *${umidade}*\nVento: *${vento}*`;
        const contactInfo = `\n\n---\n*Desenvolvido por Valter Moraes*\n📧 E-mail: moraesvalter26@gmail.com\n📱 WhatsApp: https://wa.me/554789284337`;
        
        const message = weatherReport + contactInfo;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    };

    // --- FUNÇÕES DE TEMPLATE HTML ---
    function createCardHTML(city, index, showShareButtons = false) {
        if (!city.apiData || !city.apiData.current) return '';

        const { condition, icon } = getConditionFromCode(city.apiData.current.weather_code);
        const cropInfo = city.type === 'agricola'
            ? `<p class="text-xs text-green-600 font-medium mt-1"><i class="fa-solid fa-leaf mr-1"></i> ${city.crop}</p>`
            : '';

        const pinnedIds = getPinnedCities();
        const isPinnable = city.id < 9000;
        const isPinned = isPinnable && pinnedIds.includes(city.id);
        const pinIconClass = isPinned ? 'fa-solid' : 'fa-regular';

        const isSevere = SEVERE_WEATHER_CODES.includes(city.apiData.current.weather_code);

        const btnData = `
            data-cidade="${city.cidade}, ${city.uf}"
            data-condicao="${condition}"
            data-temperatura="${Math.round(city.apiData.current.temperature_2m)}°C"
            data-sensacao="${Math.round(city.apiData.current.apparent_temperature)}°C"
            data-umidade="${city.apiData.current.relative_humidity_2m}%"
            data-vento="${city.apiData.current.wind_speed_10m.toFixed(1)} km/h"`;

        const actionBtn = isSevere
            ? `<button class="alert-btn" onclick="handleShareClick(this)" ${btnData}><i class="fa-solid fa-triangle-exclamation"></i> Alerta</button>`
            : `<button class="share-btn" onclick="handleShareClick(this)" ${btnData}><i class="fa-brands fa-whatsapp"></i> Enviar</button>`;

        let thirdColHTML = `<p class="font-bold text-white">${Math.round(city.apiData.current.apparent_temperature)}°C</p><p>Sensação</p>`;
        if (showShareButtons) {
            thirdColHTML = `<div class="w-full">${actionBtn}</div>`;
        }

        const locationDisplay = city.uf.length > 3 ? city.cidade : `${city.cidade}, ${city.uf}`;
        const locationSub = city.uf.length > 3 ? city.uf : (city.type === 'capital' ? 'Capital' : 'Polo Agrícola');

        const tempVal = city.apiData.current.temperature_2m;
        const tempColorClass = tempVal >= 30 ? 'text-orange-400' : (tempVal <= 15 ? 'text-sky-400' : 'text-white');

        return `
            <div class="card-hover glass-card overflow-hidden flex flex-col" data-city-id="${city.id}" style="animation-delay: ${index * 100}ms;">
                <div class="relative p-4 text-white border-b ${city.type === 'agricola' ? 'border-agro-400/20' : 'border-sky-400/20'} flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="text-xl font-bold text-white">${locationDisplay}</h3>
                            <p class="text-sm text-white/70">${locationSub}</p>
                            ${cropInfo}
                        </div>
                        ${isPinnable ? `<i class="pin-icon ${pinIconClass} fa-thumbtack" aria-label="Favoritar ${city.cidade}"></i>` : ''}
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <div class="text-center"><p class="text-5xl font-bold ${tempColorClass}">${Math.round(tempVal)}°C</p><p class="font-medium">${condition}</p></div>
                        <div class="text-5xl animate-float"><i class="fa-solid ${icon}"></i></div>
                    </div>
                </div>
                <div class="p-4 bg-slate-900/20 grid grid-cols-3 text-center text-sm text-white/70">
                    <div><p class="font-bold text-white">${city.apiData.current.relative_humidity_2m}%</p><p>Umidade</p></div>
                    <div><p class="font-bold text-white">${city.apiData.current.wind_speed_10m.toFixed(1)} km/h</p><p>Vento</p></div>
                    <div class="flex flex-col items-center justify-center h-full">${thirdColHTML}</div>
                </div>
            </div>
        `;
    }

    // --- RENDERIZAÇÃO DE CARDS ---
    function renderCards(cities, targetGrid, showShareButtons = false) {
        targetGrid.innerHTML = ''; // Limpa o grid de destino
        if(searchEmptyState) searchEmptyState.classList.add('hidden'); // Garante que a mensagem de erro da busca esteja oculta

        if (cities.length === 0) {
            if (targetGrid.id === 'search-results-grid' && searchEmptyState) {
                searchEmptyState.classList.remove('hidden'); // Mostra a mensagem de erro da busca
            }
        }

        let allCardsHTML = '';
        cities.forEach((city, index) => {
            if (index > 0 && index % 4 === 0) {
                const adCardHTML = `
                    <div class="ad-card overflow-hidden flex flex-col relative rounded-xl">
                        <p class="text-[10px] text-slate-400 uppercase mb-2 tracking-widest">Publicidade Patrocinada</p>
                        <div class="w-full h-full flex flex-col items-center justify-center bg-white/50 rounded-lg p-4 text-slate-500 hover:bg-white transition-colors cursor-pointer group">
                            <i class="fa-solid fa-rectangle-ad text-3xl mb-2 text-slate-300 group-hover:text-blue-400 transition-colors"></i>
                            <p class="text-sm font-bold text-slate-600">Espaço para seu Anúncio</p>
                            <p class="text-xs text-slate-400 mt-1">Atingindo produtores rurais</p>
                        </div>
                        <a href="mailto:moraesvalter26@gmail.com" class="mt-3 text-xs text-blue-600 hover:underline font-medium">
                            <i class="fa-solid fa-bullhorn mr-1"></i> Anuncie aqui
                        </a>
                    </div>
                `;
                allCardsHTML += adCardHTML;
            }

            const cardHTML = createCardHTML(city, index, showShareButtons);
            if (cardHTML) {
                allCardsHTML += cardHTML;
            }
        });
        targetGrid.innerHTML = allCardsHTML;
    }

    // --- LÓGICA DE BUSCA (COM GEOCODING API) ---
    async function handleSearch() {
        const searchTerm = searchInput.value.trim();

        if (searchTerm.length < SEARCH_MIN_CHARS) {
            if (searchTerm.length > 0) {
                searchFeedback.textContent = 'Digite pelo menos 3 caracteres para buscar.';
            } else {
                searchFeedback.textContent = '';
                applyFilters(); // Restaura a visão principal se o campo for limpo
            }
            return;
        }

        mainDashboardContent.classList.add('hidden');
        searchResultsContainer.classList.remove('hidden');
        searchResultsGrid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16">
                <i class="fa-solid fa-satellite-dish fa-bounce text-4xl text-sky-400 mb-4"></i>
                <p class="text-slate-300 text-xl font-medium">Localizando "${searchTerm}" via satélite...</p>
            </div>
        `;

        try {
            // 1. Busca Coordenadas na Geocoding API
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=pt&format=json`;
            const geoResponse = await fetch(geoUrl);
            if (!geoResponse.ok) throw new Error(`Erro API Geocoding: ${geoResponse.status}`);
            const geoData = await geoResponse.json();

            if (!geoData.results || geoData.results.length === 0) {
                renderCards([], searchResultsGrid, true);
                return;
            }

            // 2. Para cada resultado geográfico, busca o clima
            const searchPromises = geoData.results.map(async (geoCity) => {
                const cityStruct = {
                    id: 9000 + geoCity.id, // ID alto para diferenciar de fixos
                    cidade: geoCity.name,
                    uf: geoCity.admin1 || geoCity.country_code, // Fallback
                    lat: geoCity.latitude,
                    lon: geoCity.longitude,
                    type: 'busca'
                };
                
                try {
                    const weatherData = await fetchCurrentWeatherData(cityStruct);
                    return { ...cityStruct, apiData: weatherData };
                } catch (err) {
                    return null; 
                }
            });

            const rawResults = await Promise.all(searchPromises);
            const validResults = rawResults.filter(r => r !== null);
            
            renderCards(validResults, searchResultsGrid, true);

        } catch (error) {
            console.error("Erro crítico na busca:", error);
            searchResultsGrid.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
                    <h3 class="text-xl text-white font-bold">Erro na conexão</h3>
                    <p class="text-slate-400">Não foi possível conectar ao serviço de geolocalização.</p>
                </div>
            `;
        }
    }

    // --- FILTROS ---
    async function applyFilters() {
        // Esta função agora é chamada apenas para restaurar a visão do dashboard
        mainDashboardContent.classList.remove('hidden');
        searchResultsContainer.classList.add('hidden');
        
        const activeBtn = document.querySelector('.filter-btn.active');
        const filterType = activeBtn ? activeBtn.dataset.filter : 'all';

        let filteredCities = [];
        if (filterType === 'all') {
            const highlightIds = [1, 2, 3, 5, 4]; 
            filteredCities = allCitiesData.filter(city => highlightIds.includes(city.id));
        } else if (filterType === 'pinned') {
            const pinnedIds = getPinnedCities();
            filteredCities = allCitiesData.filter(city => pinnedIds.includes(city.id));
            
            if (filteredCities.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <i class="fa-regular fa-star text-4xl text-slate-300 mb-3"></i>
                        <p class="text-slate-500">Você ainda não tem cidades favoritas.</p>
                        <p class="text-sm text-slate-400">Clique no ícone <i class="fa-solid fa-thumbtack"></i> nos cards para salvar.</p>
                    </div>`;
                return;
            }
        } else if (filterType === 'capital') {
            filteredCities = allCitiesData.filter(city => city.type === 'capital');
        } else if (filterType === 'agricola') {
            filteredCities = allCitiesData.filter(city => city.type === 'agricola');
        }

        renderCards(filteredCities, grid, true);
    }

    // --- API DE CLIMA ---
    async function fetchCurrentWeatherData(city) {
        const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,uv_index,precipitation,rain,showers,snowfall&timezone=America%2FSao_Paulo`;
        const response = await fetch(API_URL);
        if (!response.ok) {
            console.error(`Erro na API de Clima para ${city.cidade}: ${response.status}`);
            return null; // Retorna nulo para não quebrar o Promise.all
        }
        return response.json();
    }
    // --- LÓGICA DO BOLETIM NACIONAL (TIMER E GERAÇÃO) ---
    function startBulletinTimer() {
        // Limpa qualquer timer anterior para evitar múltiplos intervalos
        if (bulletinUpdateInterval) {
            clearInterval(bulletinUpdateInterval);
        }

        if (progressBar) progressBar.style.width = '100%'; // Começa cheia

        const updateDuration = BULLETIN_UPDATE_INTERVAL;
        let nextUpdateTime = Date.now() + updateDuration;

        // Atualiza a hora da última atualização
        const now = new Date();
        const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const formattedDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (lastUpdateTimeEl) {
            lastUpdateTimeEl.textContent = `${formattedTime} (${formattedDate})`;
        }

        bulletinUpdateInterval = setInterval(() => {
            const remaining = nextUpdateTime - Date.now();
            if (remaining <= 0) {
                clearInterval(bulletinUpdateInterval);
                nextUpdateCountdownEl.textContent = "Atualizando...";
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
                refreshDashboardData(); // ATUALIZADO: Chama a função de refresh de dados, sem recarregar o mapa.
                return;
            }

            const minutes = Math.floor((remaining / 1000 / 60) % 60);
            const seconds = Math.floor((remaining / 1000) % 60);

            if (nextUpdateCountdownEl) {
                nextUpdateCountdownEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            // Atualiza a barra de progresso
            if (progressBar) {
                progressBar.style.width = `${(remaining / updateDuration) * 100}%`;
            }
        }, 1000);
    }

    const regionalIcons = {
        'Nordeste': 'fa-khanda', 'Norte': 'fa-tree', 'Centro-Oeste': 'fa-tractor', 'Sudeste': 'fa-city', 'Sul': 'fa-wind'
    };

    function getUVIndexAlert(uvIndex) {
        if (uvIndex >= 11) return { level: 'Extremo', text: `Índice UV Extremo (${uvIndex}). Risco máximo! Evite exposição solar a todo custo.` };
        if (uvIndex >= 8) return { level: 'Muito Alto', text: `Índice UV Muito Alto (${uvIndex}). Proteção extra é essencial. Evite o sol das 10h às 16h.` };
        if (uvIndex >= 6) return { level: 'Alto', text: `Índice UV Alto (${uvIndex}). Use protetor solar, chapéu e óculos.` };
        return null;
    }

    function renderIntelligentBulletin(citiesData) {
        if (!citiesData || citiesData.length === 0) {
            forecastBrasilContainer.innerHTML = `<p class="text-slate-400">Dados indisponíveis.</p>`;
            return;
        }

        let hasSevereWeather = false;
        const regions = {
            'Norte': { cities: [], data: [], regionalDangerLevelKey: null, regionalDangerLevelValue: 0 },
            'Nordeste': { cities: [], data: [], regionalDangerLevelKey: null, regionalDangerLevelValue: 0 },
            'Centro-Oeste': { cities: [], data: [], regionalDangerLevelKey: null, regionalDangerLevelValue: 0 },
            'Sudeste': { cities: [], data: [], regionalDangerLevelKey: null, regionalDangerLevelValue: 0 },
            'Sul': { cities: [], data: [], regionalDangerLevelKey: null, regionalDangerLevelValue: 0 },
        };

        let highestDangerLevelKey = null;
        let highestDangerLevelValue = 0;

        citiesData.forEach(c => {
            if (c.region && regions[c.region]) {
                regions[c.region].cities.push(c.cidade);
                regions[c.region].data.push(c.apiData.current);
                if (SEVERE_WEATHER_CODES.includes(c.apiData.current.weather_code)) {
                    hasSevereWeather = true;
                    const currentCodeDangerKey = WEATHER_CODE_DANGER_MAP[c.apiData.current.weather_code];
                    if (currentCodeDangerKey) {
                        const currentDangerValue = DANGER_LEVEL_PRIORITY[currentCodeDangerKey];
                        if (currentDangerValue > highestDangerLevelValue) {
                            highestDangerLevelValue = currentDangerValue;
                            highestDangerLevelKey = currentCodeDangerKey;
                        }
                        if (currentDangerValue > regions[c.region].regionalDangerLevelValue) {
                            regions[c.region].regionalDangerLevelValue = currentDangerValue;
                            regions[c.region].regionalDangerLevelKey = currentCodeDangerKey;
                        }
                    }
                }
            }
        });

        bulletinSection.classList.remove('hidden');
        let html = '<div class="space-y-6">';

        for (const regionName in regions) {
            const regionData = regions[regionName];
            if (regionData.cities.length > 0) {
                const regionIcon = regionalIcons[regionName] || 'fa-map-marker-alt';
                const regionDangerInfo = regionData.regionalDangerLevelKey ? DANGER_LEVELS[regionData.regionalDangerLevelKey] : null;

                const temps = regionData.data.map(d => d.temperature_2m);
                const apparentTemps = regionData.data.map(d => d.apparent_temperature);
                const humidities = regionData.data.map(d => d.relative_humidity_2m);
                const uvIndexes = regionData.data.map(d => d.uv_index);

                const maxTemp = Math.round(Math.max(...temps));
                const minTemp = Math.round(Math.min(...temps));
                const peakTemp = Math.round(Math.max(...apparentTemps));
                const minHumidity = Math.min(...humidities);
                const maxUV = Math.round(Math.max(...uvIndexes));
                const uvAlert = getUVIndexAlert(maxUV);

                const hasRain = regionData.data.some(d => d.weather_code >= 51 && d.weather_code < 80);
                const hasStorm = regionData.data.some(d => d.weather_code >= 80);

                const headerColorClass = regionDangerInfo ? regionDangerInfo.colorClass : 'text-white';
                const iconColorClass = regionDangerInfo ? regionDangerInfo.colorClass : 'text-sky-300';
                const containerBgClass = regionDangerInfo ? regionDangerInfo.bgColorClass : '';
                const containerBorderClass = regionDangerInfo ? `border-t-2 ${regionDangerInfo.borderColorClass}` : 'border-t border-white/10';
                const animationClass = regionDangerInfo ? regionDangerInfo.animationClass : '';

                html += `
                    <div class="p-4 rounded-lg transition-all ${containerBgClass} ${containerBorderClass} ${animationClass}">
                        <h4 class="text-md font-bold ${headerColorClass} mb-3"><i class="fa-solid ${regionIcon} mr-2 ${iconColorClass}"></i> ${regionName}</h4>
                        <ul class="text-sm text-slate-300 space-y-2 pl-4">
                            <li><i class="fa-solid fa-temperature-high w-4 mr-1 text-slate-400"></i> <strong>Máx/Mín:</strong> ${maxTemp}°C / ${minTemp}°C (Sensação de pico: <strong>${peakTemp}°C</strong>)</li>
                            <li><i class="fa-solid fa-droplet w-4 mr-1 text-slate-400"></i> <strong>Umidade Mínima:</strong> ${minHumidity}% ${minHumidity < 30 ? '<span class="text-yellow-400 font-bold">- Risco de Fogo!</span>' : ''}</li>
                            <li><i class="fa-solid fa-cloud-sun-rain w-4 mr-1 text-slate-400"></i> 
                                <strong>Chuvas:</strong> 
                                ${hasStorm ? '<span class="text-red-400 font-bold">Tempestades e trovoadas isoladas.</span>' : (hasRain ? 'Pancadas de chuva em algumas áreas.' : 'Tempo firme predominante.')}
                            </li>
                            ${uvAlert ? `<li><i class="fa-solid fa-sun w-4 mr-1 text-yellow-300"></i> <strong class="text-yellow-300">Alerta UV (${uvAlert.level}):</strong> ${uvAlert.text}</li>` : ''}
                        </ul>
                    </div>
                `;
            }
        }

        if (hasSevereWeather && highestDangerLevelKey) {
            const dangerInfo = DANGER_LEVELS[highestDangerLevelKey];
            html += `
                <div class="mt-6 p-4 rounded-lg bg-slate-900/50 border-t-4 ${dangerInfo.borderColorClass}">
                    <h4 class="text-md font-bold ${dangerInfo.colorClass} mb-2">
                        <i class="fa-solid fa-triangle-exclamation animate-pulse"></i> ALERTA: ${dangerInfo.level.toUpperCase()}
                    </h4>
                    <p class="text-sm text-slate-300 mb-2"><strong>Significado para Sobrevivência:</strong></p>
                    <p class="text-sm text-slate-400 leading-relaxed">${dangerInfo.meaning}</p>
                </div>
            `;
        }

        html += '</div>';
        forecastBrasilContainer.innerHTML = html;
    }

    function renderEmergencyCarousel(services) {
        if (!emergencyCarousel) return;
        emergencyCarousel.innerHTML = '';

        services.forEach(service => {
            const isClickable = !isNaN(parseInt(service.number));
            const numberDisplay = isClickable
                ? `<a href="tel:${service.number}" class="text-2xl font-bold text-white hover:text-red-400 transition-colors" title="Clique para ligar">${service.number}</a>`
                : `<span class="text-xl font-bold text-slate-300">${service.number}</span>`;

            const slideHTML = `
                <div class="carousel-slide">
                    <div class="glass-card p-5 flex flex-col items-start text-white h-full">
                        <div class="flex items-center gap-4 mb-3">
                            <i class="fa-solid ${service.icon} text-3xl text-red-400 w-8 text-center"></i>
                            <div>
                                <h4 class="text-lg font-bold">${service.name}</h4>
                                ${numberDisplay}
                            </div>
                        </div>
                        <p class="text-sm text-slate-300 leading-relaxed">${service.description}</p>
                    </div>
                </div>
            `;
            emergencyCarousel.innerHTML += slideHTML;
        });
    }

    function renderRainRadar() {
        const iframeHTML = `
            <iframe width="100%" height="100%" src="https://embed.windy.com/embed2.html?lat=-14.23&lon=-51.92&zoom=4&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1&lang=pt" frameborder="0"></iframe>
        `;
        radarContainer.innerHTML = iframeHTML;
    }

    /**
     * Atualiza os dados climáticos sem recarregar componentes estáticos como o mapa.
     */
    async function refreshDashboardData(cities) {
        try {
            const promises = cities.map(async (city) => {
                const data = await fetchCurrentWeatherData(city);
                return { ...city, apiData: data };
            });
            allCitiesData = (await Promise.all(promises)).filter(c => c.apiData);

            applyFilters();
            renderIntelligentBulletin(allCitiesData);
            startBulletinTimer(); // Inicia o timer do boletim
        } catch (error) {
            console.error("Erro ao atualizar os dados do dashboard:", error);
            grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">Falha ao carregar dados iniciais.</div>`;
        }
    }

    // --- INICIALIZAÇÃO ---
    async function initializeDashboard() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('Falha ao carregar data.json');
            const data = await response.json();

            citiesConfig = data.cities;
            emergencyServices = data.emergencyServices;

            renderRainRadar(); // Renderiza o mapa apenas uma vez na carga inicial.
            renderEmergencyCarousel(emergencyServices);
            await refreshDashboardData(citiesConfig); // Carrega os dados climáticos pela primeira vez.
        } catch (error) {
            console.error("Erro fatal na inicialização:", error);
            grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">Erro ao carregar a configuração inicial do projeto. Verifique o arquivo data.json e a conexão.</div>`;
        }
    }

    // --- EVENT LISTENERS ---
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length > 0 && searchTerm.length < SEARCH_MIN_CHARS) {
            searchFeedback.textContent = 'Digite pelo menos 3 caracteres para buscar.';
        } else {
            searchFeedback.textContent = '';
        }
        debounceTimer = setTimeout(() => {
            if (searchTerm.length >= SEARCH_MIN_CHARS) {
                handleSearch();
            } else if (searchTerm.length === 0) { applyFilters(); }
        }, 600);
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (searchInput.value.length > 0) searchInput.value = ''; 
            // Correção: Usar as classes do tema escuro definidas no style.css
            filterButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            e.currentTarget.classList.add('active');
            e.currentTarget.setAttribute('aria-selected', 'true');
            applyFilters();
        });
    });

    grid.addEventListener('click', (e) => {
        if (e.target.classList.contains('pin-icon')) {
            const card = e.target.closest('.card-hover');
            const id = parseInt(card.dataset.cityId);
            const pinned = getPinnedCities();
            if (pinned.includes(id)) {
                removePinnedCity(id);
                e.target.classList.remove('fa-solid', 'text-yellow-500');
                e.target.classList.add('fa-regular', 'text-slate-400');
            } else {
                addPinnedCity(id);
                e.target.classList.remove('fa-regular', 'text-slate-400');
                e.target.classList.add('fa-solid', 'text-yellow-500', 'pinned-animation');
            }
            const activeBtn = document.querySelector('.filter-btn.active');
            if (activeBtn.dataset.filter === 'pinned') {
                applyFilters();
            }
        }
    });

    document.getElementById('close-search-btn').addEventListener('click', () => {
        searchInput.value = '';
        mainDashboardContent.classList.remove('hidden');
        searchResultsContainer.classList.add('hidden');
        if (searchFeedback) searchFeedback.textContent = '';
        if(searchEmptyState) searchEmptyState.classList.add('hidden');
    });

    // --- LÓGICA DO CARROSSEL ---
    const prevButton = document.getElementById('prev-slide');
    const nextButton = document.getElementById('next-slide');
    if (emergencyCarousel && prevButton && nextButton) {
        const emergencyCarousel = document.getElementById('emergency-carousel');
        const updateCarouselButtons = () => {
            const maxScrollLeft = emergencyCarousel.scrollWidth - emergencyCarousel.clientWidth;
            prevButton.disabled = emergencyCarousel.scrollLeft < 10;
            nextButton.disabled = emergencyCarousel.scrollLeft > maxScrollLeft - 10;
        };

        const scrollAmount = () => emergencyCarousel.querySelector('.carousel-slide').clientWidth + 24;

        prevButton.addEventListener('click', () => {
            emergencyCarousel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        });
        nextButton.addEventListener('click', () => {
            emergencyCarousel.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        });

        emergencyCarousel.addEventListener('scroll', updateCarouselButtons);
        // Chama uma vez no início para definir o estado inicial correto
        updateCarouselButtons();
    }
    
    // Inicia a aplicação
    initializeDashboard();
});

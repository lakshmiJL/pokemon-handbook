const pokemonGrid = document.getElementById('pokemon-grid');
const searchInput = document.getElementById('pokemon-search');
const searchBtn = document.getElementById('search-btn');
const typeFilter = document.getElementById('type-filter');
const loadMoreBtn = document.getElementById('load-more');
const detailModal = document.getElementById('detail-modal');
const modalContent = document.getElementById('modal-content');
const closeModal = document.querySelector('.close-modal');
const bookCover = document.getElementById('book-cover');
const enterBtn = document.getElementById('enter-btn');
const resetBtn = document.getElementById('reset-book');
const suggestionsBox = document.getElementById('suggestions');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let offset = 0;

const limit = 20;
let allPokemon = [];
let allNames = [];


const TYPE_COLORS = {
    fire: '#ff4422', water: '#3399ff', grass: '#77cc55', electric: '#ffcc33',
    ice: '#66ccff', fighting: '#bb5544', poison: '#aa5599', ground: '#ddbb55',
    flying: '#8899ff', psychic: '#ff5599', bug: '#aabb22', rock: '#bbaa66',
    ghost: '#6666bb', dragon: '#7766ee', dark: '#775544', steel: '#aaaabb',
    fairy: '#ee99ee', normal: '#aaaa99'
};

// Initialize
async function init() {
    await fetchAllNames();
    await fetchTypes();
    await fetchPokemon();
    
    enterBtn.addEventListener('click', () => {
        bookCover.classList.add('hidden');
    });

    resetBtn.addEventListener('click', () => {
        bookCover.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            fullscreenBtn.textContent = 'Exit Full Screen';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                fullscreenBtn.textContent = 'Full Screen Mode';
            }
        }
    });

    searchBtn.addEventListener('click', handleSearch);

    
    searchInput.addEventListener('input', handleInput);
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsBox.classList.remove('active');
        }
    });

    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

    loadMoreBtn.addEventListener('click', () => fetchPokemon());
    typeFilter.addEventListener('change', handleFilter);
    closeModal.addEventListener('click', () => detailModal.classList.add('hidden'));
    
    // Close modal on escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') detailModal.classList.add('hidden');
    });
}

async function fetchAllNames() {
    try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1500');
        const data = await response.json();
        allNames = data.results.map(p => p.name);
    } catch (error) {
        console.error('Error fetching names:', error);
    }
}

function handleInput() {
    const value = searchInput.value.toLowerCase().trim();
    if (value.length < 2) {
        suggestionsBox.classList.remove('active');
        return;
    }

    const filtered = allNames.filter(name => name.includes(value)).slice(0, 10);
    
    if (filtered.length > 0) {
        suggestionsBox.innerHTML = filtered.map(name => `
            <div class="suggestion-item">${name}</div>
        `).join('');
        
        suggestionsBox.classList.add('active');
        
        // Add click events to suggestions
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                searchInput.value = item.textContent;
                suggestionsBox.classList.remove('active');
                handleSearch();
            });
        });
    } else {
        suggestionsBox.classList.remove('active');
    }
}

async function fetchTypes() {

    try {
        const response = await fetch('https://pokeapi.co/api/v2/type');
        const data = await response.json();
        data.results.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name.charAt(0).toUpperCase() + type.name.slice(1);
            typeFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching types:', error);
    }
}

async function fetchPokemon() {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Scanning...';
    
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`);
        const data = await response.json();
        
        for (const p of data.results) {
            const details = await fetchPokemonDetails(p.url);
            displayPokemonCard(details);
            allPokemon.push(details);
        }
        
        offset += limit;
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More';
    } catch (error) {
        console.error('Error fetching pokemon:', error);
    }
}

async function fetchPokemonDetails(url) {
    const response = await fetch(url);
    return await response.json();
}

function displayPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.innerHTML = `
        <span class="id-badge">#${String(pokemon.id).padStart(3, '0')}</span>
        <img class="card-img" src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
        <h3 class="pokemon-name">${pokemon.name}</h3>
        <div class="type-pills">
            ${pokemon.types.map(t => `<span class="type-pill" style="background: ${TYPE_COLORS[t.type.name]}">${t.type.name}</span>`).join('')}
        </div>
    `;
    
    card.addEventListener('click', () => showDetails(pokemon));
    pokemonGrid.appendChild(card);
}

async function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return;
    
    pokemonGrid.innerHTML = '<div class="loader">Searching Neural Database...</div>';
    loadMoreBtn.style.display = 'none';
    
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
        if (!response.ok) throw new Error('Not found');
        const details = await response.json();
        pokemonGrid.innerHTML = '';
        displayPokemonCard(details);
    } catch (error) {
        pokemonGrid.innerHTML = `<div class="loader">Pokémon not found in registry.</div>`;
    }
}

async function handleFilter() {
    const type = typeFilter.value;
    if (type === 'all') {
        pokemonGrid.innerHTML = '';
        offset = 0;
        allPokemon = [];
        loadMoreBtn.style.display = 'inline-block';
        fetchPokemon();
        return;
    }
    
    pokemonGrid.innerHTML = '<div class="loader">Filtering Records...</div>';
    loadMoreBtn.style.display = 'none';
    
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
        const data = await response.json();
        pokemonGrid.innerHTML = '';
        
        // Show first 40 of this type
        const typePokemon = data.pokemon.slice(0, 40);
        for (const p of typePokemon) {
            const details = await fetchPokemonDetails(p.pokemon.url);
            displayPokemonCard(details);
        }
    } catch (error) {
        console.error('Error filtering:', error);
    }
}

async function showDetails(pokemon) {
    detailModal.classList.remove('hidden');
    modalContent.innerHTML = '<div class="loader">Accessing Encrypted Data...</div>';
    
    // Fetch species data for flavor text and evolution chain
    const speciesRes = await fetch(pokemon.species.url);
    const speciesData = await speciesRes.json();
    
    // Fetch evolution chain
    const evoRes = await fetch(speciesData.evolution_chain.url);
    const evoData = await evoRes.json();
    const evoChain = getEvoChain(evoData.chain);
    
    // Get type relations
    const relations = await getTypeRelations(pokemon.types);

    
    const flavorText = speciesData.flavor_text_entries.find(e => e.language.name === 'en')?.flavor_text || 'No data available.';

    modalContent.innerHTML = `
        <div class="detail-header">
            <img class="detail-img" src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}">
            <h2 class="pokemon-name" style="font-size: 3.5rem; margin-bottom: 5px;">${pokemon.name}</h2>
            <p class="subtitle" style="font-size: 1rem; letter-spacing: 4px; margin-bottom: 20px;">#${String(pokemon.id).padStart(3, '0')}</p>
            <div class="type-pills">
                ${pokemon.types.map(t => `<span class="type-pill" style="background: ${TYPE_COLORS[t.type.name]}; padding: 8px 25px; font-size: 0.9rem;">${t.type.name}</span>`).join('')}
            </div>
        </div>
        
        <div class="detail-body">
            <div class="stats-section">
                <h3 style="margin-bottom: 20px; color: var(--accent);">POWER LEVELS</h3>
                ${pokemon.stats.map(s => `
                    <div class="stat-row" style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">
                            <span>${s.stat.name}</span>
                            <span>${s.base_stat}</span>
                        </div>
                        <div class="stat-bar">
                            <div class="stat-fill" style="width: ${Math.min(100, (s.base_stat / 200) * 100)}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="info-section">
                <h3 style="margin-bottom: 20px; color: var(--accent);">DESCRIPTION</h3>
                <p style="color: var(--text-dim); margin-bottom: 30px; font-style: italic;">"${flavorText.replace(/\f/g, ' ')}"</p>
                
                <h3 style="margin-bottom: 15px; color: #44ff44;">STRENGTHS</h3>
                <div class="type-pills" style="justify-content: flex-start; flex-wrap: wrap; margin-bottom: 20px;">
                    ${relations.strengths.length > 0 ? relations.strengths.map(s => `<span class="type-pill" style="background: ${TYPE_COLORS[s]}; margin-bottom: 5px;">${s}</span>`).join('') : '<span style="color: var(--text-dim); font-size: 0.8rem;">None recorded</span>'}
                </div>

                <h3 style="margin-bottom: 15px; color: var(--accent);">WEAKNESSES</h3>
                <div class="type-pills" style="justify-content: flex-start; flex-wrap: wrap;">
                    ${relations.weaknesses.length > 0 ? relations.weaknesses.map(w => `<span class="type-pill" style="background: ${TYPE_COLORS[w]}; margin-bottom: 5px;">${w}</span>`).join('') : '<span style="color: var(--text-dim); font-size: 0.8rem;">None recorded</span>'}
                </div>
            </div>

            
            <div class="evolution-chain">
                <h3 style="width: 100%; text-align: center; margin-bottom: 30px; color: var(--accent); grid-column: 1/-1;">EVOLUTION SEQUENCE</h3>
                <div style="display: flex; justify-content: space-around; width: 100%; align-items: center; flex-wrap: wrap; gap: 20px;">
                ${evoChain.map((evo, index) => `
                    <div class="evo-item" style="display: flex; flex-direction: column; align-items: center; cursor: pointer;" onclick="jumpToPokemon('${evo.name}')">
                        <img class="evo-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png" alt="${evo.name}" style="width: 100px; height: 100px;">
                        <div style="background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 50px; margin-top: 10px; border: 1px solid var(--glass-border); transition: 0.3s;" class="evo-label">
                            <p style="text-transform: capitalize; font-weight: 800; font-size: 0.9rem; color: #fff;">${evo.name}</p>
                        </div>
                    </div>
                    ${index < evoChain.length - 1 ? '<div class="arrow" style="font-size: 2rem; color: var(--accent);">&rarr;</div>' : ''}
                `).join('')}

                </div>
            </div>

        </div>
    `;
}

function getEvoChain(chain) {
    const chainArr = [];
    let current = chain;
    
    while (current) {
        const id = current.species.url.split('/').filter(Boolean).pop();
        chainArr.push({ name: current.species.name, id });
        current = current.evolves_to[0];
    }
    return chainArr;
}

async function getTypeRelations(types) {
    const weaknesses = new Set();
    const strengths = new Set();
    for (const t of types) {
        const res = await fetch(t.type.url);
        const data = await res.json();
        data.damage_relations.double_damage_from.forEach(w => weaknesses.add(w.name));
        data.damage_relations.double_damage_to.forEach(s => strengths.add(s.name));
    }
    return {
        weaknesses: Array.from(weaknesses),
        strengths: Array.from(strengths)
    };
}


window.jumpToPokemon = async function(name) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
    const details = await res.json();
    showDetails(details);
}

init();


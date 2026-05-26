// ======================== 3 PROVINCES DATA ========================
const provinces = {
    north: {
        id: "north",
        name: "NORTH PLAINS",
        loyalty: 82,
        taxes: 26,
        food: 42,
        military: 22,
        temp: "-12°C",
        resource: "Grain fields",
        // Position from image: top-left area near "NORTH PLAINS" text
        top: "12%",
        left: "12%"
    },
    south: {
        id: "south",
        name: "SOUTH VALLEY",
        loyalty: 84,
        taxes: 22,
        food: 48,
        military: 24,
        temp: "-12°C",
        resource: "Fertile lowlands",
        // Middle-left area
        top: "58%",
        left: "10%"
    },
    east: {
        id: "east",
        name: "EAST PORT",
        loyalty: 76,
        taxes: 38,
        food: 16,
        military: 18,
        temp: "-15°C",
        resource: "Maritime trade",
        // Right side, near "EAST PORT"
        top: "38%",
        left: "72%"
    }
};

// Empire Resources
let empire = {
    turn: 1,
    gold: 160,
    food: 130,
    army: 85,
    approval: 72,
    religion: 58
};

let selectedProvinceId = null;
let activeEvent = null;
let processingFlag = false;

// ---------- EVENT LIBRARY ----------
const eventPool = [
    {
        id: "famine_front",
        title: "🌾 FAMINE FRONT",
        desc: "Unusual frost kills harvests across agricultural zones. Starvation looms.",
        affected: ["north", "south"],
        choices: [
            { text: "Distribute Imperial grain reserves (-45 Food, +12 Loyalty)", effect: { empire: { food: -45, approval: 6 }, state: { loyalty: 12 } } },
            { text: "Require corvée labour (-10 Loyalty, +8 Army)", effect: { empire: { army: 8, approval: -5 }, state: { loyalty: -10 } } },
            { text: "Prayers to the old gods (+12 Devotion, -8 Food)", effect: { empire: { religion: 12, food: -8 }, state: { loyalty: 5 } } }
        ]
    },
    {
        id: "bandit_swarm",
        title: "⚔️ MARAUDER INCURSION",
        desc: "Raiders plunder trade routes and ambush caravans across the region.",
        affected: ["north", "south", "east"],
        choices: [
            { text: "Deploy legions (-25 Army, +14 Loyalty, +8 Taxes)", effect: { empire: { army: -25, approval: 5 }, state: { loyalty: 14, taxes: 8 } } },
            { text: "Bribe warlords (-28 Gold, +6 Loyalty)", effect: { empire: { gold: -28 }, state: { loyalty: 6, military: 6 } } },
            { text: "Enforce curfew (-12 Approval, +5 Army)", effect: { empire: { approval: -12, army: 5 }, state: { loyalty: -8 } } }
        ]
    },
    {
        id: "port_blockade",
        title: "⛓️ NAVAL BLOCKADE",
        desc: "Hostile privateers blockade East Port. Trade stagnates and tariffs plummet.",
        affected: ["east"],
        choices: [
            { text: "Command retaliation fleet (-30 Army, +38 Gold)", effect: { empire: { army: -30, gold: 38 }, state: { loyalty: 12, taxes: 5 } } },
            { text: "Accept isolation (-40 Taxes, -18 Loyalty)", effect: { empire: { approval: -12 }, state: { taxes: -40, loyalty: -18 } } }
        ]
    },
    {
        id: "cult_uprising",
        title: "🔥 HERETICAL MOVEMENT",
        desc: "Apocalyptic cult spreads propaganda, shaking the foundations of loyalty.",
        affected: ["north", "south", "east"],
        choices: [
            { text: "Religious inquisition (-24 Devotion, +16 Approval)", effect: { empire: { religion: -24, approval: 16 }, state: { loyalty: 18 } } },
            { text: "Suppress by force (-16 Army, +10 Loyalty, -5 Approval)", effect: { empire: { army: -16, approval: -5 }, state: { loyalty: 10 } } },
            { text: "Embrace syncretism (-10 Devotion, +10 Gold, +5 Loyalty)", effect: { empire: { religion: -10, gold: 10 }, state: { loyalty: 5 } } }
        ]
    },
    {
        id: "avalanche_snow",
        title: "🏔️ BLIZZARD DISASTER",
        desc: "Heavy snowstorms destroy infrastructure in northern plains and valley.",
        affected: ["north", "south"],
        choices: [
            { text: "Emergency supplies (-18 Gold, +5 Loyalty, +8 Food)", effect: { empire: { gold: -18 }, state: { loyalty: 5, food: 8 } } },
            { text: "Abandon outposts (-22 Loyalty, -15 Taxes)", effect: { empire: { approval: -7 }, state: { loyalty: -22, taxes: -15 } } }
        ]
    }
];

function updateHUD() {
    document.getElementById("ui-turn").innerText = empire.turn;
    document.getElementById("ui-gold").innerText = Math.floor(empire.gold);
    document.getElementById("ui-food").innerText = Math.floor(empire.food);
    document.getElementById("ui-army").innerText = Math.floor(empire.army);
    document.getElementById("ui-approval").innerText = Math.floor(empire.approval);
    document.getElementById("ui-religion").innerText = Math.floor(empire.religion);
    updateProvincePodsVisual();
}

function updateProvincePodsVisual() {
    for (let [id, prov] of Object.entries(provinces)) {
        const podEl = document.getElementById(`pod-${id}`);
        if (podEl) {
            const statusSpan = podEl.querySelector('.pod-status');
            if (prov.loyalty <= 40) {
                podEl.classList.add("rebel-glint");
                if(statusSpan) { statusSpan.innerText = "⚡ REBELLION RISK"; statusSpan.className = "pod-status status-rebel"; }
            } else {
                podEl.classList.remove("rebel-glint");
                if(statusSpan) { statusSpan.innerText = "● SECURE"; statusSpan.className = "pod-status status-safe"; }
            }
        }
    }
}

// Build clickable overlays on the map image
function buildMapOverlays() {
    const container = document.getElementById("regionOverlays");
    container.innerHTML = "";
    for (let [id, data] of Object.entries(provinces)) {
        const pod = document.createElement("div");
        pod.className = "region-pod";
        pod.id = `pod-${id}`;
        pod.style.top = data.top;
        pod.style.left = data.left;
        pod.style.transform = "translate(-5%, -5%)";
        const loyalState = data.loyalty <= 40 ? "REBELLION RISK" : "SECURE";
        const statusClass = data.loyalty <= 40 ? "status-rebel" : "status-safe";
        pod.innerHTML = `
            <div class="pod-title">${data.name}</div>
            <div class="pod-status ${statusClass}">● ${loyalState}</div>
            <div class="pod-detail">💰 ${data.taxes}g  🌾 ${data.food}f  ⚔️ ${data.military}</div>
            <div class="pod-detail">🌡️ ${data.temp} | ${data.resource}</div>
        `;
        pod.onclick = (e) => {
            e.stopPropagation();
            selectProvince(id);
        };
        container.appendChild(pod);
    }
    updateProvincePodsVisual();
}

function selectProvince(provId) {
    if (processingFlag) return;
    if (selectedProvinceId === provId) return;
    selectedProvinceId = provId;
    const prov = provinces[provId];
    
    document.getElementById("regionName").innerHTML = prov.name;
    document.getElementById("regionSub").innerText = "Active directive panel";
    document.getElementById("statLoyalty").innerHTML = prov.loyalty + "%";
    document.getElementById("statTaxes").innerHTML = `+${prov.taxes}g`;
    document.getElementById("statFood").innerHTML = `+${prov.food}f`;
    document.getElementById("statMilitary").innerHTML = prov.military;
    
    const rebelAlert = document.getElementById("rebelAlert");
    if (prov.loyalty <= 40) rebelAlert.classList.remove("hidden");
    else rebelAlert.classList.add("hidden");
    
    const possibleEvents = eventPool.filter(ev => ev.affected.includes(provId));
    let crisis = possibleEvents.length ? possibleEvents[Math.floor(Math.random() * possibleEvents.length)] : eventPool[0];
    activeEvent = { ...crisis, targetProvince: provId };
    document.getElementById("eventTitle").innerHTML = crisis.title;
    document.getElementById("eventDesc").innerHTML = crisis.desc;
    
    const choicesDiv = document.getElementById("choicesContainer");
    choicesDiv.innerHTML = "";
    crisis.choices.forEach((choice, idx) => {
        const btn = document.createElement("div");
        btn.className = "choice-btn";
        btn.innerHTML = `<span>${choice.text}</span><span>▶</span>`;
        btn.onclick = () => applyDecision(choice, provId);
        choicesDiv.appendChild(btn);
    });
}

function applyDecision(choice, provId) {
    if (processingFlag) return;
    processingFlag = true;
    
    const province = provinces[provId];
    if (choice.effect.empire) {
        for (let [key, delta] of Object.entries(choice.effect.empire)) {
            if (empire[key] !== undefined) empire[key] = Math.max(0, empire[key] + delta);
        }
    }
    if (choice.effect.state) {
        for (let [key, delta] of Object.entries(choice.effect.state)) {
            if (province[key] !== undefined) province[key] = Math.max(0, province[key] + delta);
        }
    }
    province.loyalty = Math.min(100, Math.max(0, province.loyalty));
    province.taxes = Math.max(0, province.taxes);
    province.food = Math.max(0, province.food);
    province.military = Math.max(0, province.military);
    
    updateHUD();
    if (selectedProvinceId === provId) {
        document.getElementById("statLoyalty").innerHTML = province.loyalty + "%";
        document.getElementById("statTaxes").innerHTML = `+${province.taxes}g`;
        document.getElementById("statFood").innerHTML = `+${province.food}f`;
        document.getElementById("statMilitary").innerHTML = province.military;
        if (province.loyalty <= 40) document.getElementById("rebelAlert").classList.remove("hidden");
        else document.getElementById("rebelAlert").classList.add("hidden");
    }
    
    const choicesDiv = document.getElementById("choicesContainer");
    choicesDiv.innerHTML = '<div class="processing-tag">📜 Imperial decree enacted. Harvesting tributes...</div>';
    
    setTimeout(() => {
        finishTurnAndHarvest();
    }, 1200);
}

function finishTurnAndHarvest() {
    let incomeGold = 0, incomeFood = 0, rebelCount = 0;
    for (let [id, prov] of Object.entries(provinces)) {
        const isRebel = prov.loyalty <= 40;
        if (isRebel) {
            incomeGold += Math.floor(prov.taxes * 0.25);
            incomeFood += Math.floor(prov.food * 0.25);
            empire.approval = Math.max(0, empire.approval - 5);
            rebelCount++;
        } else {
            incomeGold += prov.taxes;
            incomeFood += prov.food;
        }
    }
    empire.gold += incomeGold;
    empire.food += incomeFood;
    empire.turn += 1;
    if (rebelCount === 0) empire.approval = Math.min(100, empire.approval + 2);
    else if (rebelCount >= 2) empire.approval = Math.max(0, empire.approval - 3);
    empire.approval = Math.min(100, Math.max(0, empire.approval));
    if (rebelCount > 0) empire.army = Math.max(0, empire.army - Math.floor(rebelCount * 1.2));
    
    updateHUD();
    
    let gameEnd = false, victoryFlag = false, msg = "";
    if (empire.gold <= 0) { msg = "Treasury depleted. Economy collapses."; gameEnd = true; }
    else if (empire.food <= 0) { msg = "Starvation riots consume the capital."; gameEnd = true; }
    else if (empire.army <= 0) { msg = "Imperial legions annihilated. Rebels seize the throne."; gameEnd = true; }
    else if (empire.approval <= 0) { msg = "Popular uprising overthrows the emperor."; gameEnd = true; }
    else {
        let allRebel = true;
        for (let p of Object.values(provinces)) if (p.loyalty > 40) { allRebel = false; break; }
        if (allRebel) { msg = "Every province seceded. The Mayjin Empire is no more."; gameEnd = true; }
    }
    if (!gameEnd && empire.turn >= 15 && empire.approval >= 40 && empire.army >= 15) {
        victoryFlag = true;
        msg = "You have navigated 15 turns of turmoil! The Mayjin Empire enters a golden age. VICTORY!";
        gameEnd = true;
    }
    
    if (gameEnd) {
        const modal = document.getElementById("gameOverModal");
        document.getElementById("modalTitle").innerText = victoryFlag ? "⭐ VICTORY ⭐" : "💀 EMPIRE LOST 💀";
        document.getElementById("modalTitle").style.color = victoryFlag ? "#a3ffb5" : "#ff8989";
        document.getElementById("modalMsg").innerHTML = msg + "<br><br>Restart to forge a new destiny.";
        modal.classList.remove("hidden");
        processingFlag = true;
        return;
    }
    
    selectedProvinceId = null;
    activeEvent = null;
    document.getElementById("regionName").innerHTML = "IMPERIAL CITADEL";
    document.getElementById("regionSub").innerText = "Click a province on the map";
    document.getElementById("statLoyalty").innerHTML = "—";
    document.getElementById("statTaxes").innerHTML = "—";
    document.getElementById("statFood").innerHTML = "—";
    document.getElementById("statMilitary").innerHTML = "—";
    document.getElementById("rebelAlert").classList.add("hidden");
    document.getElementById("eventTitle").innerHTML = "⚜️ IMPERIAL DECREE";
    document.getElementById("eventDesc").innerHTML = "Turn resolved. Select another region on the map.";
    document.getElementById("choicesContainer").innerHTML = "";
    processingFlag = false;
}

function init() {
    buildMapOverlays();
    updateHUD();
    selectedProvinceId = null;
    processingFlag = false;
}
init();
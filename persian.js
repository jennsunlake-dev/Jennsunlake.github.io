/* Persian browsing uses Notflix's existing session, cards, and request history. */
let persianItems = [], persianSelected = null, persianPageSizes = {movie:18,series:18};
function requestPosterUrl(req, size) {
    if (req.provider === 'persian') {
        if (/^[a-f0-9]{16}$/.test(req.catalogId || '')) return `/persian-art/${req.catalogId}.jpg`;
        try { const u = new URL(req.posterPath); if (u.protocol === 'https:' && u.hostname === 'www.irtv4u.com' && u.pathname.startsWith('/wp-content/uploads/')) return u.href; } catch {}
        return '';
    }
    return `https://image.tmdb.org/t/p/${size}${req.posterPath}`;
}
async function loadPersianCatalog() {
    if (persianItems.length) return renderPersianCatalog();
    const message = document.getElementById('persianMessage');
    message.textContent = 'Loading Persian titles…';
    try {
        const response = await fetch(`${window.apiClient.baseUrl}/api/persian/catalog`, {headers:window.apiClient._authHeaders()});
        if (window.apiClient._handleAuthError(response)) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load Persian titles.');
        persianItems = data.items;
        renderPersianCatalog();
    } catch (error) { message.textContent = error.message; }
}
function createPersianCard(item) {
        const card = document.createElement('div'); card.className = 'media-card'; card.dataset.catalogId = item.id;
        const poster = document.createElement('div'); poster.className = 'poster-wrap';
        const img = document.createElement('img'); img.className = 'media-poster'; img.loading = 'lazy'; img.alt = item.name; img.addEventListener('error',()=>{if(!img.src.endsWith('/unavailable.svg')){img.src='/persian-art/unavailable.svg';img.alt=item.name+' — cover unavailable';}}); img.src = requestPosterUrl({provider:'persian',posterPath:item.poster,catalogId:item.id}); poster.append(img);
        const body = document.createElement('div'); body.className = 'card-body';
        const title = document.createElement('div'); title.className = 'card-title'; title.textContent = item.name;
        const detail = document.createElement('div'); detail.className = 'card-year'; detail.textContent = `${item.kind === 'movie' ? 'Movie' : 'TV Show'} · ${item.editions.includes('dubbed') && item.editions.includes('subtitled') ? 'Dubbed + subtitled' : item.edition === 'other' ? 'Available edition' : item.edition === 'dubbed' ? 'Dubbed' : 'Subtitled'}`;
        const button = document.createElement('button'); button.className = 'req-btn default'; button.textContent = 'Request'; button.addEventListener('click',()=>openPersianTitle(item.id));
        const ownRequests = [...userRequests.values()].filter(r => r.provider === 'persian' && r.titleKey === `persian:${item.titleId}`);
        const latest = ownRequests.sort((a,b)=>new Date(b.updatedAt || b.timestamp)-new Date(a.updatedAt || a.timestamp))[0];
        if (latest) {
            const status = document.createElement('p'); status.className = 'card-overview';
            status.textContent = persianStatusText(latest);
            body.append(status);
            if (item.kind === 'movie' && !['error','cancelled','not_available'].includes(latest.status)) {
                button.textContent = latest.status === 'available' ? 'Available on Plex' : 'Requested';
                button.className = `req-btn ${latest.status === 'available' ? 'available' : 'pending'}`; button.disabled = true;
            } else if (item.kind !== 'movie') button.textContent = 'Request episodes';
        }
        body.prepend(title,detail); body.append(button); card.append(poster,body); return card;
}
function renderPersianCatalog() {
    if (document.getElementById('persianDialog').open) renderPersianEpisodeStatus();
    const query = document.getElementById('persianSearch').value;
    const grouped = new Map();
    for (const item of persianItems) {
        const score = PersianSearch.score(item,query);
        if (!score) continue;
        const previous = grouped.get(item.titleId);
        if (!previous || score > previous.score) grouped.set(item.titleId,{item,score});
    }
    const matched = [...grouped.values()].sort((a,b)=>b.score-a.score).map(row=>row.item);
    for (const [kind,prefix] of [['movie','persianMovies'],['series','persianTV']]) {
        const items = matched.filter(item=>item.kind===kind);
        const visible = items.slice(0,persianPageSizes[kind]);
        const grid = document.getElementById(prefix+'Grid');
        grid.replaceChildren(...visible.map(createPersianCard));
        if (!items.length) {
            const empty=document.createElement('p'); empty.className='card-overview';
            empty.textContent='No matching '+(kind==='movie'?'movies':'TV shows')+'.'; grid.append(empty);
        }
        document.getElementById(prefix+'Count').textContent=`Showing ${visible.length} of ${items.length}`;
        document.getElementById(prefix+'More').hidden=visible.length>=items.length;
    }
    const movies=matched.filter(item=>item.kind==='movie').length;
    const shows=matched.filter(item=>item.kind==='series').length;
    document.getElementById('persianMessage').textContent=`${movies} ${movies===1?'movie':'movies'} · ${shows} ${shows===1?'TV show':'TV shows'}${query.trim() ? ' matching your search' : ''}`;
}
function openPersianTitle(id, request) {
    persianSelected = persianItems.find(item => item.id === id);
    if (!persianSelected) return showToast('This Persian title is no longer listed.','error');
    const item = persianSelected;
    document.getElementById('persianTitle').textContent = item.name;
    document.getElementById('persianEditionNotice').textContent = item.editions.includes('dubbed') && item.editions.includes('subtitled') ? 'Both Persian dubbed and subtitled editions will be requested. Saved files are skipped.' : item.edition === 'other' ? 'The available source edition will be requested. Any explicitly paired dubbed/subtitled edition is included automatically.' : `The catalog currently lists ${item.edition} only. Any available paired edition is included automatically.`;
    document.getElementById('persianEpisodeFields').hidden = item.kind === 'movie';
    document.getElementById('persianScope').value = request?.scope || 'latest';
    document.getElementById('persianSeason').value = request?.season ?? 1;
    document.getElementById('persianEpisodes').value = (request?.episodes || []).join(', ');
    document.getElementById('persianFirst').value = request?.first || 1;
    document.getElementById('persianLast').value = request?.last || 1;
    updatePersianSelection();
    renderPersianEpisodeStatus();
    document.getElementById('persianRequestMessage').textContent = request?.statusMessage || '';
    document.getElementById('persianSubmit').disabled = false;
    document.getElementById('persianDialog').showModal();
}
document.getElementById('persianSearch').addEventListener('input',()=>{persianPageSizes={movie:18,series:18};renderPersianCatalog();});
document.getElementById('persianMoviesMore').addEventListener('click',()=>{persianPageSizes.movie+=18;renderPersianCatalog();});
document.getElementById('persianTVMore').addEventListener('click',()=>{persianPageSizes.series+=18;renderPersianCatalog();});
document.getElementById('persianClose').addEventListener('click',()=>document.getElementById('persianDialog').close());
document.getElementById('persianScope').addEventListener('change',updatePersianSelection);
document.getElementById('persianForm').addEventListener('submit',async event=>{
    event.preventDefault();
    if (!persianSelected || !currentUser) return;
    const button = document.getElementById('persianSubmit'); button.disabled=true;
    const message = document.getElementById('persianRequestMessage'); message.textContent='Submitting request…';
    try {
        const response = await fetch(`${window.apiClient.baseUrl}/api/requests`, {method:'POST',headers:window.apiClient._authHeaders(),body:JSON.stringify(persianSelectionBody())});
        if (window.apiClient._handleAuthError(response)) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error || 'Request failed.');
        message.textContent=data.message; await loadUserRequests(); showToast('Persian request submitted');
    } catch(error) { message.textContent=error.message; button.disabled=false; }
});

function updatePersianSelection() {
    const scope=persianSelected?.kind==='movie'?'all':document.getElementById('persianScope').value;
    for(const id of ['persianFirst','persianLast'])document.getElementById(id).disabled=scope!=='range';
    document.getElementById('persianSeason').disabled=!['range','season','episodes'].includes(scope);
    document.getElementById('persianSeason').required=['range','season','episodes'].includes(scope);
    document.getElementById('persianEpisodes').disabled=scope!=='episodes';
    document.getElementById('persianRange').hidden=scope!=='range';
    document.getElementById('persianSeasonField').hidden=!['range','season','episodes'].includes(scope);
    document.getElementById('persianEpisodesField').hidden=scope!=='episodes';
}
function persianSelectionBody() {
    const scope=persianSelected.kind==='movie'?'all':document.getElementById('persianScope').value;
    const body={provider:'persian',catalogId:persianSelected.id,scope};
    if (['season','range','episodes'].includes(scope)) {
        if (!document.getElementById('persianSeason').value.trim()) throw Error('Enter a season number.');
        body.season=Number(document.getElementById('persianSeason').value);
        if (!Number.isInteger(body.season)||body.season<0||body.season>999) throw Error('Enter a valid season number.');
    }
    if(scope==='range') {
        body.first=Number(document.getElementById('persianFirst').value);body.last=Number(document.getElementById('persianLast').value);
        if(!Number.isInteger(body.first)||!Number.isInteger(body.last)||body.first<1||body.last<body.first||body.last>99999)throw Error('Enter a valid episode range.');
    }
    if(scope==='episodes') {
        const value=document.getElementById('persianEpisodes').value.replace(/[۰-۹٠-٩]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.includes(c)?'۰۱۲۳۴۵۶۷۸۹'.indexOf(c):'٠١٢٣٤٥٦٧٨٩'.indexOf(c));
        if(!/^\s*\d+(?:\s*[,،]\s*\d+)*\s*$/.test(value))throw Error('Enter episode numbers separated by commas, such as 1, 3, 5.');
        body.episodes=[...new Set(value.split(/[,،]/).map(Number))].sort((a,b)=>a-b);
        if(body.episodes.length>500||body.episodes.some(n=>n<1||n>99999))throw Error('Choose between 1 and 500 valid episode numbers.');
    }
    return body;
}
function persianStatusText(req) {
    const percent=Math.round(Math.max(0,Math.min(1,Number(req.progress)||0))*100);
    const label=req.status==='available'?(req.mediaType==='movie'?'Available in Plex':'Requested episodes available in Plex'):({pending:'Awaiting approval',processing:'Processing',downloading:'Downloading',error:'Needs attention',cancelled:'Cancelled'}[req.status]||req.status);
    return label+(req.status==='downloading'? ' · '+percent+'%':'')+(req.statusMessage?' — '+req.statusMessage:'');
}
function renderPersianEpisodeStatus() {
    const target=document.getElementById('persianEpisodeStatus');target.replaceChildren();
    if(!persianSelected)return;
    const requests=[...userRequests.values()].filter(r=>r.provider==='persian'&&r.titleKey==='persian:'+persianSelected.titleId).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    for(const req of requests) {
        const p=document.createElement('p');p.textContent=(req.season!=null?'Season '+req.season+' · ':'')+persianStatusText(req);target.append(p);
        for(const edition of req.persianEditions||[]) {
            const details=document.createElement('details'),summary=document.createElement('summary');
            summary.textContent=edition.name+' · '+(edition.complete||0)+'/'+(edition.total||0)+' downloaded';details.append(summary);
            for(const ep of edition.episodes||[]) {
                const row=document.createElement('p');
                row.textContent=(persianSelected.kind==='movie'?'Movie':'S'+(ep.season??1)+' E'+ep.number+(ep.end&&ep.end!==ep.number?'–E'+ep.end:''))+' · '+(ep.status==='available'?'Available in Plex':ep.status==='processing'?'Updating Plex and cover art':ep.status)+(ep.status==='Downloading'?' · '+Math.round(ep.progress||0)+'%':'');
                details.append(row);
            }
            target.append(details);
        }
    }
}

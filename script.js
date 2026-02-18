/* ============================================================
    HFTree — HuggingFace Repo Tree Visualizer
    ============================================================ */

let currentData = [];
let currentSort = 'folder-az';
let currentStyle = 'classic';
let currentType = 'models';
let currentRepo = '';
let currentBranch = 'main';
let filterText = '';

const els = {
    repo: document.getElementById('repoInput'),
    branch: document.getElementById('branchInput'),
    fetchBtn: document.getElementById('fetchBtn'),
    wrapper: document.getElementById('treeWrapper'),
    empty: document.getElementById('emptyState'),
    status: document.getElementById('statusMsg'),
    lineNums: document.getElementById('lineNumbers'),
    treeContent: document.getElementById('treeContent'),
    privateBtn: document.getElementById('privateRepoBtn'),
    tokenPanel: document.getElementById('tokenSection'),
    hfToken: document.getElementById('hfToken'),
    saveToken: document.getElementById('saveTokenBtn'),
    clearToken: document.getElementById('clearTokenBtn'),
    copyAll: document.getElementById('copyAllBtn'),
    shareBtn: document.getElementById('shareBtn'),
    overlay: document.getElementById('shareOverlay'),
    shareInput: document.getElementById('shareInput'),
    copyShareBtn: document.getElementById('copyShareBtn'),
    closeOverlay: document.getElementById('closeOverlay'),
    sortBtnLabel: document.getElementById('sortBtnLabel'),
    styleBtnLabel: document.getElementById('styleBtnLabel'),
    dropdowns: document.querySelectorAll('.dropdown'),
    urlPrefix: document.getElementById('urlPrefix'),
    typeModel: document.getElementById('typeModel'),
    typeDataset: document.getElementById('typeDataset'),
    typeSpace: document.getElementById('typeSpace'),
    repoInfoCard: document.getElementById('repoInfoCard'),
    repoTypeBadge: document.getElementById('repoTypeBadge'),
    repoInfoName: document.getElementById('repoInfoName'),
    repoInfoStats: document.getElementById('repoInfoStats'),
    treeFilter: document.getElementById('treeFilter'),
};

const FEATURED = [
    { repo: 'prithivMLmods/Qwen3-VL-4B-Instruct-Unredacted-MAX', type: 'models', label: 'Qwen3-VL-4B-Instruct-Unredacted-MAX' },
    { repo: 'prithivMLmods/Qwen3-VL-abliterated-MAX-Fast', type: 'spaces', label: 'Qwen3-VL Space' },
    { repo: 'prithivMLmods/LAP2-K-Think-v1.b', type: 'datasets', label: 'LAP2-K-Think' },
];

const POPULAR_MODELS = [
    { repo: 'meta-llama/Llama-3.1-8B-Instruct', type: 'models' },
    { repo: 'mistralai/Mistral-7B-Instruct-v0.3', type: 'models' },
    { repo: 'google/gemma-2-9b-it', type: 'models' },
    { repo: 'Qwen/Qwen2.5-7B-Instruct', type: 'models' },
    { repo: 'stabilityai/stable-diffusion-xl-base-1.0', type: 'models' },
    { repo: 'openai/whisper-large-v3', type: 'models' },
    { repo: 'microsoft/Phi-3-mini-4k-instruct', type: 'models' },
    { repo: 'black-forest-labs/FLUX.1-dev', type: 'models' },
];

const POPULAR_DATASETS = [
    { repo: 'tatsu-lab/alpaca', type: 'datasets' },
    { repo: 'databricks/databricks-dolly-15k', type: 'datasets' },
    { repo: 'Open-Orca/OpenOrca', type: 'datasets' },
    { repo: 'HuggingFaceFW/fineweb', type: 'datasets' },
    { repo: 'allenai/c4', type: 'datasets' },
];

const HF_API = 'https://huggingface.co/api';

function getHeaders() {
    const t = localStorage.getItem('hft_token');
    const h = { 'Accept': 'application/json' };
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
}

function getRepoPageUrl(type, repo) {
    if (type === 'datasets') return `https://huggingface.co/datasets/${repo}`;
    if (type === 'spaces') return `https://huggingface.co/spaces/${repo}`;
    return `https://huggingface.co/${repo}`;
}

async function fetchTree(type, repo, branch, path) {
    const url = path
        ? `${HF_API}/${type}/${repo}/tree/${branch}/${path}`
        : `${HF_API}/${type}/${repo}/tree/${branch}`;
    const resp = await fetch(url, { headers: getHeaders() });
    if (!resp.ok) {
        if (resp.status === 401) throw new Error('401: Unauthorized. Check your token.');
        if (resp.status === 403) throw new Error('403: Forbidden / Rate Limited.');
        if (resp.status === 404) {
            if (branch === 'main' && !path) {
                const r2 = await fetch(`${HF_API}/${type}/${repo}/tree/master`, { headers: getHeaders() });
                if (r2.ok) return { items: await r2.json(), switchedBranch: 'master' };
            }
            throw new Error('404: Repository not found (or is private).');
        }
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    return { items: await resp.json(), switchedBranch: null };
}

async function fetchFullTree(type, repo, branch) {
    let all = [], switched = null;
    async function recurse(path) {
        const r = await fetchTree(type, repo, switched || branch, path);
        if (r.switchedBranch && !switched) switched = r.switchedBranch;
        for (const item of r.items) {
            all.push({
                path: item.path,
                type: item.type === 'directory' ? 'tree' : 'blob',
                size: item.size || 0,
                lfs: item.lfs || null,
            });
            if (item.type === 'directory') {
                try { await recurse(item.path); }
                catch (e) { console.warn(`Skip ${item.path}: ${e.message}`); }
            }
        }
    }
    await recurse('');
    return { tree: all, branch: switched || branch };
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkSavedToken();
    setupDropdowns();
    setupShareOverlay();
    buildHomepageTags();
    els.fetchBtn.addEventListener('click', loadTree);
    els.copyAll.addEventListener('click', copyFullTree);
    els.privateBtn.addEventListener('click', () => {
        els.tokenPanel.style.display = els.tokenPanel.style.display === 'none' ? 'block' : 'none';
    });
    els.saveToken.addEventListener('click', saveToken);
    els.clearToken.addEventListener('click', clearToken);
    [els.typeModel, els.typeDataset, els.typeSpace].forEach(b =>
        b.addEventListener('click', () => setType(b.dataset.type))
    );
    els.treeFilter.addEventListener('input', e => { filterText = e.target.value.trim().toLowerCase(); render(); });
    [els.repo, els.branch, els.hfToken].forEach(el =>
        el.addEventListener('keypress', e => { if (e.key === 'Enter') el === els.hfToken ? saveToken() : loadTree(); })
    );
    parseUrlHash();
});

function setType(type) {
    currentType = type;
    [els.typeModel, els.typeDataset, els.typeSpace].forEach(b => b.className = 'type-btn');
    if (type === 'models')   { els.typeModel.classList.add('active-model');     els.urlPrefix.textContent = 'hf.co/'; }
    if (type === 'datasets') { els.typeDataset.classList.add('active-dataset'); els.urlPrefix.textContent = 'hf.co/datasets/'; }
    if (type === 'spaces')   { els.typeSpace.classList.add('active-space');     els.urlPrefix.textContent = 'hf.co/spaces/'; }
}

function buildHomepageTags() {
    const f = document.getElementById('featuredCloud');
    FEATURED.forEach(i => f.appendChild(createRepoTag(i.label || i.repo, i.type, i.repo)));
    const m = document.getElementById('modelCloud');
    POPULAR_MODELS.forEach(i => m.appendChild(createRepoTag(i.repo, i.type, i.repo)));
    const d = document.getElementById('datasetCloud');
    POPULAR_DATASETS.forEach(i => d.appendChild(createRepoTag(i.repo, i.type, i.repo)));
}

function createRepoTag(label, type, repo) {
    const btn = document.createElement('button');
    btn.className = 'repo-tag';
    const tc = type === 'models' ? 'model' : type === 'datasets' ? 'dataset' : 'space';
    const tl = type === 'models' ? 'MODEL' : type === 'datasets' ? 'DATA' : 'SPACE';
    btn.innerHTML = `<span class="tag-type ${tc}">${tl}</span> ${label}`;
    btn.addEventListener('click', () => {
        setType(type); els.repo.value = repo; els.branch.value = 'main'; loadTree();
    });
    return btn;
}

function parseUrlHash() {
    const h = window.location.hash;
    if (h && h.startsWith('#')) {
        const p = h.substring(1).split('/');
        if (p.length >= 3 && ['models','datasets','spaces'].includes(p[0])) {
            setType(p[0]);
            els.repo.value = p[1] + '/' + p[2];
            els.branch.value = p[3] || 'main';
            loadTree();
        }
    }
}

async function loadTree() {
    const repo = els.repo.value.trim();
    const branch = els.branch.value.trim() || 'main';
    if (!repo.includes('/')) return showMsg("Invalid format. Use 'username/repo-name'", "error");
    currentRepo = repo; currentBranch = branch;
    filterText = ''; els.treeFilter.value = '';
    if (els.empty) els.empty.style.display = 'none';
    els.wrapper.style.display = 'none';
    els.repoInfoCard.classList.remove('visible');
    showMsg(`<span class="spinner"></span> Fetching ${currentType}/${repo} (${branch})…`, "loading");
    els.fetchBtn.disabled = true;
    try {
        const ck = `hft_${currentType}_${repo}_${branch}`;
        const ta = !!localStorage.getItem('hft_token');
        const cached = !ta ? sessionStorage.getItem(ck) : null;
        if (cached) {
            const p = JSON.parse(cached);
            currentData = p.tree; currentBranch = p.branch;
            showMsg("", "");
        } else {
            const r = await fetchFullTree(currentType, repo, branch);
            currentData = r.tree; currentBranch = r.branch;
            if (r.branch !== branch) {
                showMsg(`Branch '${branch}' not found → '${r.branch}'.`, "loading");
                els.branch.value = r.branch;
            } else showMsg("", "");
            if (!ta) try { sessionStorage.setItem(ck, JSON.stringify({ tree: currentData, branch: currentBranch })); } catch(e){}
        }
        window.location.hash = `${currentType}/${repo}/${currentBranch}`;
        document.title = `${repo} — HFTree`;
        showRepoInfo(repo, currentBranch);
        render();
        els.wrapper.style.display = 'flex';
    } catch (err) {
        console.error(err);
        const m = err.message;
        if (m.includes('401')) showMsg("Unauthorized. Check your HuggingFace token.", "error");
        else if (m.includes('403')) showMsg("Rate limited or forbidden. Try adding a token.", "error");
        else if (m.includes('404')) showMsg("Repository not found. Check name and type.", "error");
        else showMsg(m, "error");
        els.empty.style.display = 'block';
    } finally { els.fetchBtn.disabled = false; }
}

function showRepoInfo(repo, branch) {
    const tc = currentType === 'models' ? 'model' : currentType === 'datasets' ? 'dataset' : 'space';
    const tl = currentType === 'models' ? 'MODEL' : currentType === 'datasets' ? 'DATASET' : 'SPACE';
    els.repoTypeBadge.className = `repo-type-badge ${tc}`;
    els.repoTypeBadge.textContent = tl;
    els.repoInfoName.innerHTML = `<a href="${getRepoPageUrl(currentType, repo)}" target="_blank" rel="noopener">${repo}</a>`;
    const fc = currentData.filter(i => i.type === 'blob').length;
    const dc = currentData.filter(i => i.type === 'tree').length;
    const ts = currentData.reduce((a, i) => a + (i.size || 0), 0);
    els.repoInfoStats.innerHTML = `
        <span><i class="far fa-file"></i> ${fc} files</span>
        <span><i class="far fa-folder"></i> ${dc} folders</span>
        <span><i class="fas fa-weight-hanging"></i> ${formatSize(ts)}</span>
        <span><i class="fas fa-code-branch"></i> ${branch}</span>`;
    els.repoInfoCard.classList.add('visible');
}

function sortTree(data, mode) {
    const s = [...data];
    s.sort((a, b) => {
        const ad = a.type === 'tree' ? 1 : 0, bd = b.type === 'tree' ? 1 : 0;
        const an = a.path.toLowerCase(), bn = b.path.toLowerCase();
        switch (mode) {
            case 'folder-az':  if (ad !== bd) return bd - ad; return an.localeCompare(bn);
            case 'folder-za':  if (ad !== bd) return bd - ad; return bn.localeCompare(an);
            case 'alpha-az':   return an.localeCompare(bn);
            case 'alpha-za':   return bn.localeCompare(an);
            case 'size-desc':  return (b.size||0) - (a.size||0);
            case 'size-asc':   return (a.size||0) - (b.size||0);
            default: return 0;
        }
    });
    return s;
}

function render() {
    els.lineNums.innerHTML = ''; els.treeContent.innerHTML = '';
    let data = currentData;
    if (filterText) {
        const mp = new Set();
        currentData.forEach(item => {
            if (item.path.toLowerCase().includes(filterText)) {
                mp.add(item.path);
                const pts = item.path.split('/');
                for (let i = 1; i < pts.length; i++) mp.add(pts.slice(0, i).join('/'));
            }
        });
        data = currentData.filter(i => mp.has(i.path));
    }
    const sorted = sortTree(data, currentSort);
    const hier = buildVisualHierarchy(sorted);
    const fn = document.createDocumentFragment(), fl = document.createDocumentFragment();
    hier.forEach((item, idx) => {
        const n = document.createElement('div');
        n.textContent = idx + 1;
        fn.appendChild(n);
        const row = document.createElement('div');
        row.className = 'tree-line';
        row.style.animation = `fadeIn 0.1s forwards ${Math.min(idx * 2, 500)}ms`;
        row.style.opacity = '0';
        const ic = item.type === 'tree' ? 'fa-solid fa-folder' : getFileIcon(item.name);
        const tc = item.type === 'tree' ? 'folder' : 'file';
        let pre = item.prefix, nm = item.name;
        if (currentStyle === 'minimal') pre = item.indent;
        if (currentStyle === 'plus') pre = pre.replace(/└──/g, '+--').replace(/├──/g, '+--').replace(/│/g, '|');
        if (currentStyle === 'slashed') {
            if (item.type === 'tree') nm = `/${item.name}`;
            pre = item.prefix.replace(/│/g, ' ').replace(/├──/g, ' ').replace(/└──/g, ' ');
        }
        const sz = item.type === 'blob' && item.size ? `<span class="t-size">${formatSize(item.size)}</span>` : '';
        const lf = item.lfs ? `<span class="lfs-badge">LFS</span>` : '';
        let nh = nm;
        if (filterText && nm.toLowerCase().includes(filterText)) {
            const rx = new RegExp(`(${escapeRegex(filterText)})`, 'gi');
            nh = nm.replace(rx, '<mark style="background:var(--accent-light);color:var(--accent);padding:0 2px;border-radius:2px;">$1</mark>');
        }
        row.innerHTML = `<span class="t-prefix">${pre}</span><span class="t-icon"><i class="${ic}"></i></span><span class="t-name ${tc}">${nh}</span>${sz}${lf}<button class="sub-copy" data-path="${item.path}" title="Copy Path"><i class="far fa-copy"></i></button>`;
        fl.appendChild(row);
    });
    els.lineNums.appendChild(fn); els.treeContent.appendChild(fl);
    els.treeContent.onclick = e => {
        const b = e.target.closest('.sub-copy');
        if (b) handleCopy(b, b.dataset.path, true);
    };
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const nl = name.toLowerCase();
    if (nl === 'dockerfile') return 'fa-brands fa-docker';
    if (nl === 'license' || nl === 'licence') return 'fa-solid fa-scale-balanced';
    if (nl === 'readme.md' || nl === 'readme') return 'fa-solid fa-book';
    if (nl === 'requirements.txt') return 'fa-solid fa-list-check';
    if (nl === '.gitignore' || nl === '.gitattributes') return 'fa-brands fa-git-alt';
    const map = {
        py:'fa-brands fa-python', js:'fa-brands fa-js', ts:'fa-brands fa-js',
        jsx:'fa-brands fa-react', tsx:'fa-brands fa-react',
        html:'fa-brands fa-html5', css:'fa-brands fa-css3-alt',
        md:'fa-solid fa-file-lines', json:'fa-solid fa-file-code',
        yaml:'fa-solid fa-file-code', yml:'fa-solid fa-file-code', toml:'fa-solid fa-file-code',
        txt:'fa-solid fa-file-lines', csv:'fa-solid fa-file-csv',
        png:'fa-solid fa-file-image', jpg:'fa-solid fa-file-image', jpeg:'fa-solid fa-file-image',
        gif:'fa-solid fa-file-image', svg:'fa-solid fa-file-image', webp:'fa-solid fa-file-image',
        mp4:'fa-solid fa-file-video', mp3:'fa-solid fa-file-audio', wav:'fa-solid fa-file-audio',
        pdf:'fa-solid fa-file-pdf', zip:'fa-solid fa-file-zipper', tar:'fa-solid fa-file-zipper', gz:'fa-solid fa-file-zipper',
        safetensors:'fa-solid fa-cube', bin:'fa-solid fa-cube', gguf:'fa-solid fa-cube',
        pt:'fa-solid fa-cube', pth:'fa-solid fa-cube', onnx:'fa-solid fa-cube', h5:'fa-solid fa-cube',
        parquet:'fa-solid fa-database', arrow:'fa-solid fa-database',
        rs:'fa-brands fa-rust', go:'fa-brands fa-golang', java:'fa-brands fa-java',
        sh:'fa-solid fa-terminal', bash:'fa-solid fa-terminal',
    };
    return map[ext] || 'fa-regular fa-file';
}

function buildVisualHierarchy(sortedList) {
    const root = { children: [] }, map = { '': root };
    sortedList.forEach(item => { map[item.path] = { ...item, name: item.path.split('/').pop(), children: [] }; });
    sortedList.forEach(item => {
        const pts = item.path.split('/'); pts.pop();
        (map[pts.join('/')] || root).children.push(map[item.path]);
    });
    const result = [];
    function traverse(node, prefix, isLast) {
        const conn = isLast ? "└── " : "├── ";
        result.push({
            name: node.name, path: node.path, type: node.type,
            size: node.size, lfs: node.lfs,
            prefix: prefix + conn,
            indent: prefix.replace(/│   /g, '    ').replace(/├── /g, '    ').replace(/└── /g, '    ') + '    '
        });
        if (node.children && node.children.length) {
            const cp = prefix + (isLast ? "    " : "│   ");
            node.children.forEach((c, i) => traverse(c, cp, i === node.children.length - 1));
        }
    }
    root.children.forEach((c, i) => traverse(c, "", i === root.children.length - 1));
    return result;
}

function generateAsciiTree(data) {
    const sorted = sortTree(data, currentSort);
    const hier = buildVisualHierarchy(sorted);
    const lines = [`${currentRepo} (${currentBranch})`];
    hier.forEach(item => {
        let pre = item.prefix, nm = item.name;
        if (currentStyle === 'minimal') pre = item.indent;
        if (currentStyle === 'plus') pre = pre.replace(/└──/g, '+--').replace(/├──/g, '+--').replace(/│/g, '|');
        if (currentStyle === 'slashed') {
            if (item.type === 'tree') nm = `/${nm}`;
            pre = item.prefix.replace(/│/g, ' ').replace(/├──/g, ' ').replace(/└──/g, ' ');
        }
        const sz = item.type === 'blob' && item.size ? ` (${formatSize(item.size)})` : '';
        lines.push(`${pre}${nm}${sz}`);
    });
    return lines.join('\n');
}

function handleCopy(btn, text, isSub) {
    navigator.clipboard.writeText(text).then(() => {
        if (!isSub) {
            const oh = btn.innerHTML;
            btn.innerHTML = `<i class="fas fa-check"></i> Copied`;
            setTimeout(() => { btn.innerHTML = oh; }, 1500);
        } else {
            const ic = btn.querySelector('i'), oc = ic.className;
            ic.className = "fas fa-check";
            setTimeout(() => { ic.className = oc; }, 1500);
        }
    }).catch(e => console.error("Copy failed", e));
}

function copyFullTree() { handleCopy(els.copyAll, generateAsciiTree(currentData), false); }

function saveToken() {
    const t = els.hfToken.value.trim();
    if (!t) return;
    localStorage.setItem('hft_token', t);
    checkSavedToken();
    showMsg("Token saved.", "loading");
    setTimeout(() => showMsg("", ""), 1500);
}

function clearToken() {
    localStorage.removeItem('hft_token');
    els.hfToken.value = '';
    checkSavedToken();
    showMsg("Token cleared.", "loading");
    setTimeout(() => showMsg("", ""), 1500);
}

function checkSavedToken() {
    const t = localStorage.getItem('hft_token');
    if (t) {
        els.hfToken.value = t;
        els.privateBtn.innerHTML = `<i class="fas fa-lock-open"></i> Active`;
        els.privateBtn.style.color = 'var(--accent)';
        els.saveToken.style.display = 'none';
        els.clearToken.style.display = 'inline-block';
    } else {
        els.privateBtn.innerHTML = `<i class="fas fa-lock"></i> Token`;
        els.privateBtn.style.color = '';
        els.saveToken.style.display = 'inline-block';
        els.clearToken.style.display = 'none';
    }
}

function formatSize(bytes) {
    if (!bytes) return '0 B';
    const u = ['B','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

function setupDropdowns() {
    [els.sortBtnLabel, els.styleBtnLabel].forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const p = btn.parentElement;
            closeDropdowns(p); p.classList.toggle('active');
        });
    });
    document.querySelectorAll('[data-sort]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            currentSort = e.target.dataset.sort;
            els.sortBtnLabel.innerHTML = `<i class="fas fa-sort-amount-down"></i> ${e.target.innerText}`;
            closeDropdowns(); render();
        });
    });
    document.querySelectorAll('[data-style]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            currentStyle = e.target.dataset.style;
            els.styleBtnLabel.innerHTML = `<i class="fas fa-code-branch"></i> ${e.target.innerText}`;
            closeDropdowns(); render();
        });
    });
    document.addEventListener('click', () => closeDropdowns());
}

function closeDropdowns(except = null) {
    els.dropdowns.forEach(d => { if (d !== except) d.classList.remove('active'); });
}

function setupShareOverlay() {
    els.shareBtn.addEventListener('click', e => {
        e.stopPropagation();
        els.shareInput.value = window.location.href;
        els.overlay.classList.add('visible');
    });
    els.closeOverlay.addEventListener('click', () => els.overlay.classList.remove('visible'));
    els.overlay.addEventListener('click', e => { if (e.target === els.overlay) els.overlay.classList.remove('visible'); });
    els.shareInput.addEventListener('click', () => els.shareInput.select());
    els.copyShareBtn.addEventListener('click', () => handleCopy(els.copyShareBtn, els.shareInput.value, true));
}

function showMsg(text, type) {
    els.status.style.display = text ? 'block' : 'none';
    els.status.innerHTML = text;
    els.status.className = type;
}

function initTheme() {
    const s = localStorage.getItem('hft_theme') || 'light';
    document.documentElement.setAttribute('data-theme', s);
    document.getElementById('themeToggle').addEventListener('click', () => {
        const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', n);
        localStorage.setItem('hft_theme', n);
    });
}

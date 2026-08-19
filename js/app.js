const regions = {
  niigata: {
    name: 'NIIGATA / 新潟',
    desc: '눈이 녹아 만든 깨끗한 물과 좋은 쌀로 유명한 일본 대표 사케 산지',
    sake: 'Hakkaisan Shiboritate Nama',
    brewery: 'Hakkaisan Brewery',
    taste: '깔끔함 · 드라이 · 은은한 과일향',
    pairing: '사시미 · 스시 · 해산물',
    breweryLoc: 'Niigata, Japan',
    breweryText: '니가타의 깨끗한 물과 설국의 자연환경을 기반으로 깔끔한 사케를 만드는 대표적인 양조장.'
  },
  nagano: {
    name: 'NAGANO / 長野',
    desc: '고원지대의 맑은 물로 빚어지는 풍부한 아로마의 나마자케',
    sake: 'Kokuryu Nama',
    brewery: 'Kokuryu Brewery',
    taste: '풍부한 향 · 밸런스',
    pairing: '야키토리 · 전골',
    breweryLoc: 'Nagano, Japan',
    breweryText: '알프스 기후의 깨끗한 물을 쓰는 소규모 양조장.'
  },
  yamagata: {
    name: 'YAMAGATA / 山形',
    desc: '눈 덮인 산간에서 나는 신선한 쌀로 만든 부드러운 나마자케',
    sake: 'Junmai Nama',
    brewery: 'Yamagata Sake Co.',
    taste: '부드러움 · 라운드',
    pairing: '훗카이도 요리',
    breweryLoc: 'Yamagata, Japan',
    breweryText: '전통을 지키며 소량 생산으로 품질을 우선하는 양조장.'
  },
  akita: {
    name: 'AKITA / 秋田',
    desc: '추운 기후가 만들어내는 조밀한 맛의 나마자케',
    sake: 'Akita Fresh Nama',
    brewery: 'Akita Brewery',
    taste: '리치 · 고소함',
    pairing: '구이류 · 진한 요리',
    breweryLoc: 'Akita, Japan',
    breweryText: '설원 지역의 기후를 살려 단단한 맛을 내는 양조장.'
  },
  kyoto: {
    name: 'KYOTO / 京都',
    desc: '전통 도시 교토에서 만드는 세련된 풍미의 나마자케',
    sake: 'Kyoto Nama',
    brewery: 'Kyoto Sake Works',
    taste: '우아함 · 미디엄바디',
    pairing: '가이세키 · 유자향 디저트',
    breweryLoc: 'Kyoto, Japan',
    breweryText: '전통과 현대를 잇는 세련된 양조장.'
  },
  hyogo: {
    name: 'HYOGO / 兵庫',
    desc: '효고의 풍부한 쌀로 만든 균형잡힌 나마자케',
    sake: 'Hyogo Nama',
    brewery: 'Nada Brewery',
    taste: '밸런스 · 미네랄',
    pairing: '스테이크 · 피자',
    breweryLoc: 'Hyogo, Japan',
    breweryText: '효고의 전통 양조 방식으로 유명한 양조장.'
  },
  hiroshima: {
    name: 'HIROSHIMA / 広島',
    desc: '바다 가까운 풍토가 만드는 깔끔한 해산물 페어링 사케',
    sake: 'Hiroshima Nama',
    brewery: 'Setouchi Brewery',
    taste: '프레시 · 해산물과 잘어울림',
    pairing: '굴 · 해산물',
    breweryLoc: 'Hiroshima, Japan',
    breweryText: '바다와 인접한 환경에서 해산물과 잘 어울리는 사케를 생산.'
  }
};

const regionName = document.getElementById('region-name');
const regionContent = document.getElementById('region-content');

// When the page loads, replace the simplified map with the authoritative jp.svg
// and programmatically create pins anchored to prefecture elements in that SVG.
document.addEventListener('DOMContentLoaded', async () => {
  const existing = document.getElementById('jp-map');
  try {
    const res = await fetch('jp.svg');
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const newSvg = doc.querySelector('svg');
    if (newSvg) {
      newSvg.setAttribute('id', 'jp-map');
      newSvg.setAttribute('class', 'jp-map');
      newSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      // ensure standard viewBox attr exists (some SVGs use lowercase 'viewbox')
      if (!newSvg.hasAttribute('viewBox') && newSvg.hasAttribute('viewbox')) {
        newSvg.setAttribute('viewBox', newSvg.getAttribute('viewbox'));
      }
      // remove fixed width/height from the source SVG so CSS can control sizing
      newSvg.removeAttribute('width');
      newSvg.removeAttribute('height');
      // Replace the existing placeholder/simple svg if present, otherwise append
      if (existing && existing.parentNode) {
        existing.replaceWith(newSvg);
      } else {
        const wrap = document.querySelector('.map-wrap') || document.body;
        wrap.appendChild(newSvg);
      }
    }
  } catch (err) {
    console.error('Failed to load jp.svg', err);
  }

  const svg = document.getElementById('jp-map');
  if (!svg) return;

  // Compute a robust union bbox of visible child elements (exclude large background rects)
  try {
    const originalVB = (svg.getAttribute('viewBox') || '0 0 1000 846').split(/\s+/).map(Number);
    const [origX, origY, origW, origH] = originalVB;

    const candidates = svg.querySelectorAll('g#features * , path, polygon, polyline, circle, ellipse, rect, line');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    candidates.forEach(el => {
      try {
        // Skip invisible elements
        const style = window.getComputedStyle(el);
        if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) return;
        const bbox = el.getBBox();
        if (!bbox || (!bbox.width && !bbox.height)) return;
        // Heuristic: skip big rects that act as background/backdrop
        if (el.tagName && el.tagName.toLowerCase() === 'rect') {
          if (bbox.width >= origW * 0.9 && bbox.height >= origH * 0.9) return;
        }
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      } catch (err) {
        // some nodes may throw on getBBox; ignore them
      }
    });

    if (minX !== Infinity && minY !== Infinity) {
      const w = maxX - minX;
      const h = maxY - minY;
      const pad = Math.max(w, h) * 0.02; // 2% padding
      const vbX = Math.max(0, minX - pad);
      const vbY = Math.max(0, minY - pad);
      const vbW = w + pad * 2;
      const vbH = h + pad * 2;
      svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    } else {
      // Fallback: try to use features group bbox
      const featuresGroup = svg.querySelector('g#features') || svg;
      try {
        const fb = featuresGroup.getBBox();
        const pad = Math.max(fb.width, fb.height) * 0.02;
        const vbX = Math.max(0, fb.x - pad);
        const vbY = Math.max(0, fb.y - pad);
        const vbW = fb.width + pad * 2;
        const vbH = fb.height + pad * 2;
        svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      } catch (err) {
        console.warn('Could not compute SVG bbox to crop whitespace:', err);
      }
    }
  } catch (e) {
    console.warn('Error while computing union bbox for svg cropping:', e);
  }

  // Mapping from our region keys to prefecture IDs in jp.svg
  const regionPrefMap = {
    akita: 'JP05',
    yamagata: 'JP06',
    niigata: 'JP15',
    nagano: 'JP20',
    kyoto: 'JP26',
    hiroshima: 'JP34',
    hyogo: 'JP28'
  };

  // Helper to create an SVG pin at (cx,cy)
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function createPin(id, cx, cy, label) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'pin');
    g.setAttribute('data-id', id);
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-label', label || id);
    g.setAttribute('transform', `translate(${cx},${cy})`);

    const hit = document.createElementNS(SVG_NS, 'circle');
    hit.setAttribute('class', 'hit');
    hit.setAttribute('r', '20');
    hit.setAttribute('fill', 'transparent');
    g.appendChild(hit);

    const bg = document.createElementNS(SVG_NS, 'circle');
    bg.setAttribute('r', '12');
    bg.setAttribute('class', 'pin-bg');
    bg.setAttribute('fill', '#fff');
    bg.setAttribute('stroke', '#cbdff0');
    bg.setAttribute('stroke-width', '1.5');
    g.appendChild(bg);

    const core = document.createElementNS(SVG_NS, 'circle');
    core.setAttribute('r', '7');
    core.setAttribute('class', 'pin-core');
    core.setAttribute('fill', '#0b2340');
    g.appendChild(core);

    const txt = document.createElementNS(SVG_NS, 'text');
    txt.setAttribute('class', 'pin-label');
    txt.setAttribute('x', '22');
    txt.setAttribute('y', '6');
    txt.textContent = (label || id).toUpperCase();
    g.appendChild(txt);

    // Ensure there's a parent group for pins
    let pinsGroup = svg.querySelector('g.pins');
    if (!pinsGroup) {
      pinsGroup = document.createElementNS(SVG_NS, 'g');
      pinsGroup.setAttribute('class', 'pins');
      svg.appendChild(pinsGroup);
    }
    pinsGroup.appendChild(g);
    return g;
  }

  // Create pins anchored to jp.svg anchors (circle elements) or path centroids
  Object.entries(regionPrefMap).forEach(([rid, prefId]) => {
    const anchor = svg.getElementById(prefId);
    let cx = null, cy = null;
    if (anchor) {
      const tag = anchor.tagName && anchor.tagName.toLowerCase();
      if (tag === 'circle') {
        cx = parseFloat(anchor.getAttribute('cx'));
        cy = parseFloat(anchor.getAttribute('cy'));
      } else {
        // fallback to bbox centroid
        try {
          const bbox = anchor.getBBox();
          cx = bbox.x + bbox.width / 2;
          cy = bbox.y + bbox.height / 2;
        } catch (e) {
          console.warn('Could not compute bbox for', prefId, e);
        }
      }
    }
    if (cx != null && cy != null) {
      createPin(rid, cx, cy, rid);
    }
  });

  // Now wire up interactions for the dynamically created pins
  const pins = svg.querySelectorAll('.pin');
  function clearActiveLocal(){ pins.forEach(p=>p.classList.remove('active')); }
  pins.forEach(pin=>{
    const activate = ()=>{
      const id = pin.dataset.id;
      if(!id) return;
      clearActiveLocal();
      pin.classList.add('active');
      showRegion(id);
      const rc = document.getElementById('region-card');
      if(rc) rc.classList.add('visible');
      if(rc) rc.scrollIntoView({behavior:'smooth',block:'center'});
    };
    pin.addEventListener('click', activate);
    pin.addEventListener('touchstart', e=>{ e.preventDefault(); activate(); });
    pin.addEventListener('keydown', e=>{ if(e.key==='Enter') activate(); });
  });

});

function clearActive(){
  const all = document.querySelectorAll('#jp-map .pin');
  all.forEach(p=>p.classList.remove('active'));
  const rc = document.getElementById('region-card');
  if(rc) rc.classList.remove('visible');
}

function showRegion(id){
  const r = regions[id];
  if(!r) return;
  regionName.textContent = r.name;
  regionContent.innerHTML = `
    <p class="lead">${r.desc}</p>
    <strong>추천 나마자케</strong>
    <div>${r.sake}</div>
    <div class="muted">${r.brewery}</div>
    <div class="muted small">${r.taste}</div>
    <div class="muted small">추천 페어링: ${r.pairing}</div>
    <p class="muted small" style="margin-top:8px">나마자케는 일반 사케와 달리 열처리를 하지 않아 신선하고 생생한 향을 즐길 수 있습니다. 특히 겨울 신주 시즌에 다양한 나마자케가 출시됩니다.</p>
  `;
  // Brewery section removed; no brewery updates needed
  const rc = document.getElementById('region-card');
  if(rc) rc.classList.add('visible');
}

// Note: map CTA removed from hero; no direct scroll handler needed.

(() => {
  const form = document.getElementById('dealCheckForm');
  if (!form) return;
  const photoInput = document.getElementById('carPhoto');
  const preview = document.getElementById('photoPreview');
  const photoName = document.getElementById('photoName');
  let previewUrl = '';
  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  const valueOf = id => document.getElementById(id).value.trim();
  const numOf = id => valueOf(id) === '' ? null : Number(valueOf(id));
  const addNote = (list, text) => { const li = document.createElement('li'); li.textContent = text; list.appendChild(li); };

  photoInput.addEventListener('change', () => {
    const file = photoInput.files && photoInput.files[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    if (!file) { preview.hidden = true; photoName.textContent = 'No photo selected'; return; }
    if (!file.type.startsWith('image/')) { photoInput.value = ''; preview.hidden = true; photoName.textContent = 'Please choose an image file'; return; }
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;
    photoName.textContent = file.name;
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const brand = valueOf('brand');
    const model = valueOf('model');
    const asking = numOf('askingPrice');
    const low = numOf('lowPrice');
    const high = numOf('highPrice');
    const typical = numOf('typicalPrice');
    const count = numOf('compCount');
    const mrp = numOf('mrp');
    if (!brand || !model || asking === null || asking <= 0) { alert('Please enter the brand, model and a valid asking price.'); return; }
    if ([low, high, typical].some(v => v !== null && v < 0) || (low !== null && high !== null && low > high)) { alert('Please check the comparable price range. The lowest price cannot exceed the highest price.'); return; }
    if (typical !== null && low !== null && typical < low || typical !== null && high !== null && typical > high) { alert('Typical price should fall within the comparable low/high range.'); return; }

    const result = document.getElementById('dealResults');
    const badge = document.getElementById('verdictBadge');
    const notes = document.getElementById('resultNotes');
    const rarityText = document.getElementById('rarity').selectedOptions[0].text;
    const hasMarket = typical !== null || (low !== null && high !== null);
    let verdict = 'Research needed', kind = 'unknown', summary = 'There is not enough comparable market evidence to judge this price yet.';
    let differenceText = 'Not available';
    notes.innerHTML = '';

    if (typical !== null) {
      const diff = asking - typical;
      const pct = typical === 0 ? 0 : (diff / typical) * 100;
      differenceText = `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${money(Math.abs(diff))} (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`;
      if (asking <= typical * 0.90) { verdict = 'GOOD DEAL'; kind = 'good'; summary = 'The asking price is at least 10% below the typical comparable price you entered.'; }
      else if (asking <= typical * 1.10) { verdict = 'FAIR DEAL'; kind = 'fair'; summary = 'The asking price is within 10% of the typical comparable price you entered.'; }
      else { verdict = 'POTENTIALLY OVERPRICED'; kind = 'high'; summary = 'The asking price is more than 10% above the typical comparable price you entered.'; }
      addNote(notes, `Your asking price is ${pct > 0 ? 'above' : pct < 0 ? 'below' : 'equal to'} the entered typical comparison by ${Math.abs(pct).toFixed(1)}%.`);
    } else if (low !== null && high !== null) {
      if (asking < low) { verdict = 'BELOW COMPARABLE RANGE'; kind = 'good'; summary = 'The asking price is below the comparable range entered. Verify condition and authenticity carefully.'; }
      else if (asking <= high) { verdict = 'WITHIN COMPARABLE RANGE'; kind = 'fair'; summary = 'The asking price falls within the comparable range entered.'; }
      else { verdict = 'ABOVE COMPARABLE RANGE'; kind = 'high'; summary = 'The asking price is above the comparable range entered.'; }
      differenceText = asking > high ? `${money(asking - high)} above high` : asking < low ? `${money(low - asking)} below low` : 'Inside range';
    }

    if (!hasMarket) addNote(notes, 'Add a typical comparable price or a low/high market range to receive a price verdict.');
    else addNote(notes, `The comparison uses ${count === null ? 'an unspecified number of' : count} comparable listing(s) or sale(s) supplied by you.`);
    if (mrp !== null && mrp > 0) addNote(notes, `Entered MRP: ${money(mrp)}. MRP is useful context, but it does not by itself establish current collector-market value.`);
    if (mrp !== null && asking > mrp) addNote(notes, 'The asking price is above the entered MRP. For private second-hand collector sales, compare current equivalent sales too; an above-MRP price alone does not prove overpricing.');
    addNote(notes, `Rarity selection: ${rarityText}. This is your entered status, not an independently verified rarity finding.`);
    if (count === null || count < 3) addNote(notes, 'Low evidence warning: try to find at least three genuinely comparable examples, preferably completed sales.');
    addNote(notes, 'Check that the examples match the same casting, variant, scale, packaging and condition.');
    if (valueOf('condition') === 'played' || valueOf('condition') === 'damaged') addNote(notes, 'Condition may reduce value; compare against similarly worn or incomplete examples, not sealed models.');

    document.getElementById('resultTitle').textContent = `${brand} ${model}`;
    document.getElementById('resultSummary').textContent = summary;
    document.getElementById('outAsking').textContent = money(asking);
    document.getElementById('outRange').textContent = low !== null && high !== null ? `${money(low)} – ${money(high)}` : typical !== null ? `Typical ${money(typical)}` : 'Not entered';
    document.getElementById('outDifference').textContent = differenceText;
    document.getElementById('outRarity').textContent = rarityText;
    badge.textContent = verdict;
    badge.className = `dd-verdict-badge ${kind}`;

    const query = encodeURIComponent(`${brand} ${model} ${valueOf('variant')} ${valueOf('scale')} diecast price sold listings rarity` .replace(/\s+/g, ' ').trim());
    const exact = encodeURIComponent(`${brand} ${model} ${valueOf('variant')} diecast sold price` .replace(/\s+/g, ' ').trim());
    const links = document.getElementById('researchLinks');
    links.innerHTML = '';
    [
      ['Google model + rarity search', `https://www.google.com/search?q=${query}`],
      ['eBay listings search', `https://www.ebay.com/sch/i.html?_nkw=${exact}`],
      ['Completed-sale research', `https://www.google.com/search?q=${encodeURIComponent(`${brand} ${model} ${valueOf('variant')} sold completed sale diecast`)}`]
    ].forEach(([label, url]) => { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `${label} ↗`; links.appendChild(a); });

    const confidence = document.getElementById('confidenceNote');
    confidence.textContent = !hasMarket ? 'Verdict confidence: unavailable — enter comparable market prices.' : count !== null && count >= 3 ? 'Evidence note: you entered at least three comparisons. Confidence still depends on whether they are truly comparable and whether they are completed sales.' : 'Evidence note: limited comparison data. Treat this result as a rough indication, not a confirmed valuation.';
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  form.addEventListener('reset', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    preview.hidden = true;
    preview.removeAttribute('src');
    photoName.textContent = 'No photo selected';
    document.getElementById('dealResults').hidden = true;
  });
})();

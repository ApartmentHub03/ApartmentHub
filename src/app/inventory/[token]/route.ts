import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { INVENTORY_ITEMS, CATEGORIES } from "@/app/lib/inventory-items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubmittedData = {
  items: { key: string; choice: string }[];
  extras: { label: string; category: string; choice: string }[];
  notes: string;
  signature_name: string;
  signature_place: string;
  signature_date: string;
  signature_image: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const sb = supabaseAdmin();

  const { data: link } = await sb
    .from("verkoop_inventory_links")
    .select("id, dossier_id, token, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) {
    return new Response("Link niet gevonden.", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (link.status === "submitted") {
    return new Response(SUBMITTED_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (new Date(link.expires_at) < new Date()) {
    return new Response("Deze link is verlopen.", { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const { data: dossier } = await sb
    .from("verkoop_dossiers")
    .select("naam, straat, postcode, woonplaats, taal")
    .eq("id", link.dossier_id)
    .maybeSingle();

  if (!dossier) {
    return new Response("Dossier niet gevonden.", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const adres = [dossier.straat, dossier.postcode, dossier.woonplaats].filter(Boolean).join(", ");
  const verkoper = dossier.naam || "";
  const datum = new Date().toLocaleDateString("nl-NL");

  const templatePath = join(process.cwd(), "public", "inventory-template.html");
  let html: string;
  try {
    html = readFileSync(templatePath, "utf-8");
  } catch {
    return new Response("Template niet gevonden.", { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  html = html
    .replace(/\{\{ADRES\}\}/g, escapeHtmlAttr(adres))
    .replace(/\{\{VERKOPER\}\}/g, escapeHtmlAttr(verkoper))
    .replace(/\{\{DATUM\}\}/g, escapeHtmlAttr(datum));

  const submitUrl = new URL(`/inventory/${token}`, _req.url).href;

  html = html.replace("</body>", INJECTED_SCRIPT(submitUrl, token) + "</body>");

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const sb = supabaseAdmin();

  const { data: link } = await sb
    .from("verkoop_inventory_links")
    .select("id, dossier_id, token, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (link.status === "submitted") {
    return NextResponse.json({ error: "already_submitted" }, { status: 409 });
  }
  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  let body: SubmittedData;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validChoices = ["blijft", "mee", "overname", "nvt"];
  const items = (body.items || []).filter(
    (i) => i.key && validChoices.includes(i.choice)
  );
  const extras = (body.extras || [])
    .filter((e) => e.label && validChoices.includes(e.choice))
    .map((e) => ({ label: e.label, category: e.category || "Overige zaken", choice: e.choice }));
  const notes = (body.notes || "").slice(0, 5000);
  const signatureName = (body.signature_name || "").slice(0, 200);
  const signaturePlace = (body.signature_place || "").slice(0, 200);
  const signatureDate = (body.signature_date || "").slice(0, 200);
  const signatureImage = typeof body.signature_image === "string" && body.signature_image.startsWith("data:image/png;base64,")
    ? body.signature_image
    : null;

  const submittedData: SubmittedData = {
    items,
    extras,
    notes,
    signature_name: signatureName,
    signature_place: signaturePlace,
    signature_date: signatureDate,
    signature_image: signatureImage,
  };

  const { error } = await sb
    .from("verkoop_inventory_links")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_data: submittedData,
    })
    .eq("id", link.id);

  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await sb.from("verkoop_audit").insert({
    dossier_id: link.dossier_id,
    actor: "seller:inventory",
    action: "inventory_link_submitted",
    meta: { inventory_link_id: link.id, item_count: items.length, extra_count: extras.length },
  });

  return NextResponse.json({ ok: true });
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] || c));
}

function INJECTED_SCRIPT(submitUrl: string, token: string): string {
  const itemsJson = JSON.stringify(
    INVENTORY_ITEMS.map((i) => ({
      key: i.key,
      label_nl: i.label_nl,
      label_en: i.label_en,
      category_nl: i.category_nl,
      category_en: i.category_en,
    }))
  );
  const categoriesJson = JSON.stringify(CATEGORIES);

  return `
<script>
(function(){
  var ITEMS = ${itemsJson};
  var CATS = ${categoriesJson};
  var SUBMIT_URL = ${JSON.stringify(submitUrl)};
  var lang = localStorage.getItem('inv-lang') || 'nl';

  /* ---- master translation map ---- */
  var T = {
    'Onderdeel': 'Item',
    'Blijft achter': 'Stays behind',
    'Gaat mee': 'Goes with seller',
    'Ter overname': 'For takeover',
    'N.v.t.': 'N/A',
    'Blijft achter (dit komt op de gedownloade PDF)': 'Stays behind (this appears on the downloaded PDF)',
    'Gaat mee (dit komt op de gedownloade PDF)': 'Goes with seller (this appears on the downloaded PDF)',
    'Ter overname (dit komt op de gedownloade PDF)': 'For takeover (this appears on the downloaded PDF)',
    'N.v.t. (dit komt op de gedownloade PDF)': 'N/A (this appears on the downloaded PDF)',
    'Overzicht': 'Summary',
    'dit komt op de gedownloade PDF': 'this appears on the downloaded PDF',
    'Bijzonderheden / toelichting': 'Remarks / explanation',
    'Handtekening verkoper': 'Seller signature',
    'Plaats en datum': 'Place and date',
    'Opgesteld door': 'Prepared by',
    'Adres woning': 'Property address',
    'Verkoper': 'Seller',
    'Datum': 'Date',
    'ApartmentHub': 'ApartmentHub',
    'Lijst van zaken': 'List of fixtures & fittings',
    'Blijft achter (evt. tegen vergoeding)': 'Stays behind (possibly at a fee)',
    'Ter overname (evt. tegen vergoeding)': 'For takeover (possibly at a fee)',
    'N.v.t. (niet aanwezig)': 'N/A (not present)',
    'Nog niets aangevinkt': 'Nothing selected yet',
    'Onbenoemd onderdeel': 'Unnamed item',
    'Indienen': 'Submit',
    'Verzenden...': 'Sending...',
    'Bedankt!': 'Thank you!',
    'Uw lijst van zaken is verzonden naar ApartmentHub.': 'Your list of fixtures & fittings has been sent to ApartmentHub.',
    'Bijvoorbeeld welke goederen ter overname zijn, prijsafspraken of uitzonderingen.':
      'E.g. which goods are for takeover, price agreements or exceptions.',
    '+ Extra onderdeel toevoegen': '+ Add extra item',
    'Omschrijf het onderdeel...': 'Describe the item...',
    'Deze lijst van zaken maakt onderdeel uit van de koopovereenkomst. Aan onjuistheden kunnen geen rechten worden ontleend.':
      'This list of fixtures & fittings forms part of the purchase agreement. No rights can be derived from inaccuracies.',
    'Ondertekening': 'Signing',
    'Ondergetekende (verkoper) verklaart deze lijst van zaken volledig en naar waarheid te hebben ingevuld.':
      'The undersigned (seller) declares that this list of fixtures & fittings has been filled in completely and truthfully.',
    'Naam verkoper': 'Seller name',
    'Plaats': 'Place',
    'Handtekening': 'Signature',
    'Wissen': 'Clear',
    'Amsterdam': 'Amsterdam'
  };

  function tr(nlText){
    if(T[nlText]) return T[nlText];
    for(var key in T){
      if(nlText.indexOf(key) !== -1){
        return nlText.replace(key, T[key]);
      }
    }
    return null;
  }

  /* ---- tag all translatable elements with data-nl / data-en ---- */
  function tagElement(el){
    if(!el || el.dataset.nl) return;
    var text = el.textContent.trim();
    if(!text) return;
    var en = tr(text);
    if(en){
      el.dataset.nl = text;
      el.dataset.en = en;
    }
  }

  function tagAll(){
    /* item labels */
    var itemMap = {};
    ITEMS.forEach(function(i){ itemMap[i.key] = i; });
    document.querySelectorAll('input[type=radio][name^="item_"]').forEach(function(r){
      var key = r.name;
      var item = itemMap[key];
      if(!item) return;
      var td = r.closest('tr') ? r.closest('tr').querySelector('td.it') : null;
      if(td && !td.dataset.nl){
        td.dataset.nl = td.textContent.trim();
        td.dataset.en = item.label_en;
      }
    });

    /* category headers */
    var catIndex = {};
    CATS.forEach(function(c){ catIndex[c.nl] = c.en; });
    document.querySelectorAll('tr.cat td').forEach(function(td){
      if(td.dataset.nl) return;
      var mark = td.querySelector('.mark');
      var nlText = td.textContent.replace(mark ? mark.textContent : '', '').trim();
      if(catIndex[nlText]){
        td.dataset.nl = nlText;
        td.dataset.en = catIndex[nlText];
      }
    });

    /* legend chips */
    document.querySelectorAll('.chip').forEach(function(chip){
      if(chip.dataset.nl) return;
      var nlText = chip.textContent.trim();
      var en = tr(nlText);
      if(en){ chip.dataset.nl = nlText; chip.dataset.en = en; }
    });

    /* table headers */
    document.querySelectorAll('th').forEach(function(th){ tagElement(th); });

    /* field labels, section titles, total labels, headings */
    document.querySelectorAll('.fieldlbl, .sectitle, .tot .lbl, h1, h2, h3').forEach(function(el){ tagElement(el); });

    /* sectitle small */
    document.querySelectorAll('.sectitle small').forEach(function(el){ tagElement(el); });

    /* signature lines */
    document.querySelectorAll('.sign .fld').forEach(function(el){ tagElement(el); });

    /* add buttons */
    document.querySelectorAll('.addbtn').forEach(function(btn){
      if(btn.dataset.nl) return;
      var text = btn.textContent.trim();
      if(T[text]){ btn.dataset.nl = text; btn.dataset.en = T[text]; }
    });

    /* sumblock h3 + cnt */
    document.querySelectorAll('.sumblock h3').forEach(function(h3){
      if(h3.dataset.nl) return;
      var text = h3.textContent.trim();
      var en = tr(text);
      if(en){ h3.dataset.nl = text; h3.dataset.en = en; }
    });

    /* empty list items (Nog niets aangevinkt) */
    document.querySelectorAll('.sumblock li.empty').forEach(function(li){
      if(li.dataset.nl) return;
      var text = li.textContent.trim();
      if(T[text]){ li.dataset.nl = text; li.dataset.en = T[text]; }
    });

    /* textarea placeholder */
    document.querySelectorAll('textarea[name=bijzonderheden]').forEach(function(ta){
      if(ta.dataset.nlPh) return;
      var ph = ta.getAttribute('placeholder');
      if(ph && T[ph]){
        ta.dataset.nlPh = ph;
        ta.dataset.enPh = T[ph];
      }
    });

    /* extra item input placeholders */
    document.querySelectorAll('.xin').forEach(function(xin){
      if(xin.dataset.nlPh) return;
      var ph = xin.getAttribute('placeholder');
      if(ph && T[ph]){
        xin.dataset.nlPh = ph;
        xin.dataset.enPh = T[ph];
      }
    });

    /* footer */
    document.querySelectorAll('footer').forEach(function(f){ tagElement(f); });

    /* ondertekening section */
    document.querySelectorAll('.ondertitle, .onderdecl, .ofldlbl').forEach(function(el){ tagElement(el); });
    var plaatsInput = document.getElementById('onderplaats');
    if(plaatsInput && !plaatsInput.dataset.nlPh){
      var pph = plaatsInput.getAttribute('placeholder');
      if(pph && T[pph]){ plaatsInput.dataset.nlPh = pph; plaatsInput.dataset.enPh = T[pph]; }
    }
    var sigClear = document.getElementById('sigpad-clear');
    if(sigClear && !sigClear.dataset.nl){
      sigClear.dataset.nl = 'Wissen';
      sigClear.dataset.en = 'Clear';
    }

    /* submit button */
    var sb = document.getElementById('inv-submit');
    if(sb && !sb.dataset.nl){
      sb.dataset.nl = 'Indienen';
      sb.dataset.en = 'Submit';
    }
  }

  /* ---- apply language ---- */
  function applyLang(l){
    lang = l;
    localStorage.setItem('inv-lang', l);
    document.body.dataset.lang = l;

    document.querySelectorAll('[data-nl][data-en]').forEach(function(el){
      var text = l === 'en' ? el.dataset.en : el.dataset.nl;
      if(el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'){
        if(el.dataset[l === 'en' ? 'enPh' : 'nlPh']){
          el.setAttribute('placeholder', el.dataset[l === 'en' ? 'enPh' : 'nlPh']);
        }
      } else if(el.classList.contains('chip')){
        var sw = el.querySelector('.sw');
        el.textContent = '';
        if(sw) el.appendChild(sw);
        el.appendChild(document.createTextNode(text));
      } else if(el.tagName === 'H3' && el.closest('.sumblock')){
        var sw2 = el.querySelector('.sw');
        var cnt = el.querySelector('.cnt');
        el.textContent = '';
        if(sw2) el.appendChild(sw2);
        el.appendChild(document.createTextNode(' ' + text + ' '));
        if(cnt) el.appendChild(cnt);
      } else {
        el.textContent = text;
      }
    });

    /* category rows with mark */
    document.querySelectorAll('tr.cat td[data-nl]').forEach(function(td){
      var text = l === 'en' ? td.dataset.en : td.dataset.nl;
      var mark = td.querySelector('.mark');
      td.textContent = '';
      if(mark) td.appendChild(mark);
      td.appendChild(document.createTextNode(text));
    });

    /* update toggle button styles */
    var toggle = document.getElementById('lang-toggle');
    if(toggle){
      toggle.querySelectorAll('button').forEach(function(b){
        var active = b.dataset.lang === l;
        b.style.background = active ? 'var(--teal)' : '#fff';
        b.style.color = active ? '#fff' : 'var(--muted)';
      });
    }
  }

  /* translate dynamically-created text (Nog niets aangevinkt etc) */
  function applyLangDynamic(l){
    document.querySelectorAll('.sumblock li.empty').forEach(function(li){
      if(li.dataset.nl && li.dataset.en){
        li.textContent = l === 'en' ? li.dataset.en : li.dataset.nl;
      }
    });
    document.querySelectorAll('.sumblock li:not(.empty)').forEach(function(li){
      /* these have item labels, already tagged on parent td */
    });
  }

  /* ---- initial setup ---- */
  tagAll();

  /* ---- patch the template's rebuild to re-tag + re-apply lang after it runs ---- */
  if(typeof window.rebuild === 'function'){
    var origRebuild = window.rebuild;
    window.rebuild = function(){
      origRebuild.apply(this, arguments);
      tagAll();
      /* only translate dynamic text (li.empty) if lang is en */
      if(lang === 'en'){
        applyLangDynamic('en');
      }
    };
  }

  /* re-tag when extras are added (the template's addExtra inserts rows) */
  var origAddExtra = window.addExtra;
  if(typeof origAddExtra === 'function'){
    window.addExtra = function(btn){
      origAddExtra.apply(this, arguments);
      tagAll();
      if(lang === 'en'){
        applyLangDynamic('en');
      }
    };
  }

  /* also listen for change events (radio selections trigger rebuild) */
  document.addEventListener('change', function(){
    /* re-tag in case rebuild created new li.empty elements */
    tagAll();
    if(lang === 'en'){
      applyLangDynamic('en');
    }
  });

  /* apply initial language */
  setTimeout(function(){ applyLang(lang); }, 50);

  /* ---- language switcher ---- */
  var headerEl = document.querySelector('header');
  if(headerEl){
    var toggle = document.createElement('div');
    toggle.id = 'lang-toggle';
    toggle.style.cssText = 'display:flex;gap:2px;background:#e6edec;border-radius:8px;padding:2px;';
    toggle.innerHTML =
      '<button data-lang="nl" style="border:none;background:'+(lang==='nl'?'var(--teal)':'#fff')+';color:'+(lang==='nl'?'#fff':'var(--muted)')+';font-weight:700;font-size:12px;padding:4px 12px;border-radius:6px;cursor:pointer;font-family:inherit;">NL</button>' +
      '<button data-lang="en" style="border:none;background:'+(lang==='en'?'var(--teal)':'#fff')+';color:'+(lang==='en'?'#fff':'var(--muted)')+';font-weight:700;font-size:12px;padding:4px 12px;border-radius:6px;cursor:pointer;font-family:inherit;">EN</button>';
    headerEl.appendChild(toggle);
    toggle.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        applyLang(b.dataset.lang);
      });
    });
  }

  /* ---- canvas signature pad ---- */
  var canvas = document.getElementById('sigpad');
  var sigCtx = null;
  var drawing = false;
  var hasSigned = false;
  if(canvas){
    function resizeCanvas(){
      var w = canvas.offsetWidth;
      var h = window.innerWidth <= 640 ? 140 : 160;
      var dpr = window.devicePixelRatio || 1;
      var oldData = null;
      if(hasSigned){
        try { oldData = canvas.toDataURL('image/png'); } catch(e){}
      }
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.height = h + 'px';
      sigCtx = canvas.getContext('2d');
      sigCtx.scale(dpr, dpr);
      sigCtx.strokeStyle = '#12332f';
      sigCtx.lineWidth = 2;
      sigCtx.lineCap = 'round';
      sigCtx.lineJoin = 'round';
      if(oldData){
        var img = new Image();
        img.onload = function(){ sigCtx.drawImage(img, 0, 0, w, h); };
        img.src = oldData;
      }
    }
    resizeCanvas();
    window.addEventListener('resize', function(){ resizeCanvas(); });

    function getPos(e){
      var rect = canvas.getBoundingClientRect();
      var x, y;
      if(e.touches && e.touches.length){
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      return { x: x, y: y };
    }

    function startDraw(e){
      e.preventDefault();
      drawing = true;
      hasSigned = true;
      var p = getPos(e);
      sigCtx.beginPath();
      sigCtx.moveTo(p.x, p.y);
    }
    function doDraw(e){
      if(!drawing) return;
      e.preventDefault();
      var p = getPos(e);
      sigCtx.lineTo(p.x, p.y);
      sigCtx.stroke();
    }
    function endDraw(e){
      if(!drawing) return;
      e.preventDefault();
      drawing = false;
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', doDraw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', doDraw, { passive: false });
    canvas.addEventListener('touchend', endDraw, { passive: false });

    var clearBtn = document.getElementById('sigpad-clear');
    if(clearBtn){
      clearBtn.addEventListener('click', function(){
        sigCtx.clearRect(0, 0, canvas.width, canvas.height);
        hasSigned = false;
      });
    }
  }

  /* ---- inject submit button after ondertekening ---- */
  var onderGrid = document.querySelector('.ondergrid');
  if(onderGrid){
    var submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.id = 'inv-submit';
    submitBtn.dataset.nl = 'Indienen';
    submitBtn.dataset.en = 'Submit';
    submitBtn.textContent = lang === 'en' ? 'Submit' : 'Indienen';
    submitBtn.style.cssText = 'width:100%;margin-top:16px;padding:14px;background:var(--teal);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:.15s;';
    submitBtn.onmouseover = function(){ submitBtn.style.background = 'var(--teal-d)'; };
    submitBtn.onmouseout = function(){ submitBtn.style.background = 'var(--teal)'; };
    onderGrid.parentNode.insertBefore(submitBtn, onderGrid.nextSibling);
    submitBtn.addEventListener('click', submitForm);
  }

  /* ---- form submit handler ---- */
  function submitForm(){
    var items = [];
    for(var i = 1; i <= 103; i++){
      var checked = document.querySelector('input[name="item_'+i+'"]:checked');
      if(checked){
        items.push({ key: 'item_'+i, choice: checked.value });
      }
    }

    var extras = [];
    document.querySelectorAll('input[name^="extra_label_"]').forEach(function(labelInput){
      var name = labelInput.name;
      var n = name.replace('extra_label_', '');
      var label = labelInput.value.trim();
      if(!label) return;
      var cat = labelInput.dataset.cat || 'Overige zaken';
      var radio = document.querySelector('input[name="extra_'+n+'"]:checked');
      if(radio){
        extras.push({ label: label, category: cat, choice: radio.value });
      }
    });

    var notesEl = document.querySelector('textarea[name="bijzonderheden"]');
    var notes = notesEl ? notesEl.value.trim() : '';

    /* signature data */
    var sigName = '';
    var naamEl = document.getElementById('ondernaam');
    if(naamEl) sigName = naamEl.textContent.trim();
    var sigPlace = '';
    var plaatsEl = document.getElementById('onderplaats');
    if(plaatsEl) sigPlace = plaatsEl.value.trim();
    var sigDate = '';
    var datumEl = document.getElementById('onderdatum');
    if(datumEl) sigDate = datumEl.textContent.trim();
    var sigImage = null;
    if(canvas && hasSigned){
      try { sigImage = canvas.toDataURL('image/png'); } catch(e){}
    }

    var btn = document.getElementById('inv-submit');
    if(btn){ btn.disabled = true; btn.textContent = lang === 'en' ? 'Sending...' : 'Verzenden...'; }

    fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items,
        extras: extras,
        notes: notes,
        signature_name: sigName,
        signature_place: sigPlace,
        signature_date: sigDate,
        signature_image: sigImage
      })
    }).then(function(res){
      if(res.ok){
        document.querySelector('.formview').style.display = 'none';
        document.querySelector('.totals').style.display = 'none';
        var summary = document.querySelector('.summary');
        if(summary) summary.style.display = 'none';
        var notesSection = document.querySelector('.notes');
        if(notesSection) notesSection.style.display = 'none';
        var onder = document.querySelector('.ondertitle');
        if(onder) onder.style.display = 'none';
        var decl = document.querySelector('.onderdecl');
        if(decl) decl.style.display = 'none';
        var grid = document.querySelector('.ondergrid');
        if(grid) grid.style.display = 'none';
        var sign = document.querySelector('.sign');
        if(sign) sign.style.display = 'none';
        var submitBtnEl = document.getElementById('inv-submit');
        if(submitBtnEl) submitBtnEl.style.display = 'none';
        var done = document.createElement('div');
        done.style.cssText = 'text-align:center;padding:60px 20px;';
        done.innerHTML =
          '<div style="width:60px;height:60px;border-radius:50%;background:var(--teal);color:#fff;display:grid;place-items:center;font-size:28px;margin:0 auto 14px;">\\u2713</div>' +
          '<h2 style="margin:0 0 4px;font-size:20px;color:var(--dark);">' + (lang === 'en' ? 'Thank you!' : 'Bedankt!') + '</h2>' +
          '<p style="color:var(--muted);margin:0;font-size:14px;">' + (lang === 'en' ? 'Your list of fixtures & fittings has been sent to ApartmentHub.' : 'Uw lijst van zaken is verzonden naar ApartmentHub.') + '</p>';
        var bodyEl = document.querySelector('.body');
        if(bodyEl) bodyEl.appendChild(done);
      } else {
        if(btn){ btn.disabled = false; btn.textContent = lang === 'en' ? 'Submit' : 'Indienen'; }
        alert(lang === 'en' ? 'Something went wrong. Please try again.' : 'Er ging iets mis. Probeer het opnieuw.');
      }
    }).catch(function(){
      if(btn){ btn.disabled = false; btn.textContent = lang === 'en' ? 'Submit' : 'Indienen'; }
      alert(lang === 'en' ? 'Network error. Please try again.' : 'Netwerkfout. Probeer het opnieuw.');
    });
  }
})();
</script>
<style>
#lang-toggle button{font-family:inherit;}
#inv-submit:hover{background:var(--teal-d) !important;}
</style>
`;
}

const SUBMITTED_HTML = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Al ingevuld</title>
<style>body{font-family:'Inter',-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#eef1f1;color:#12332f}
.box{text-align:center;padding:40px}.check{width:60px;height:60px;border-radius:50%;background:#009B8A;color:#fff;display:grid;place-items:center;font-size:28px;margin:0 auto 14px}
h2{margin:0 0 4px;font-size:20px}p{color:#6f807c;margin:0;font-size:14px}</style></head>
<body><div class="box"><div class="check">\\u2713</div><h2>Al ingevuld</h2><p>Deze lijst van zaken is al ingevuld en verzonden.</p></div></body></html>`;
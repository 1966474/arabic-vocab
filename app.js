
let baseWords = [];
let words = [];
let showFavorites = false;
let currentDeck = [];
let currentIndex = 0;

const $ = id => document.getElementById(id);
const customWords = JSON.parse(localStorage.getItem("customWords") || "[]");
const favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
const learned = new Set(JSON.parse(localStorage.getItem("learned") || "[]"));

function keyOf(w){ return `${w.arabic}|${w.english}`; }
function persistSet(name,set){ localStorage.setItem(name, JSON.stringify([...set])); }

async function init(){
  baseWords = await fetch("data.json").then(r=>r.json());
  words = [...baseWords, ...customWords];
  for (const w of words) if (w.favorite) favorites.add(keyOf(w));
  populateCategories();
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  if (localStorage.getItem("darkMode")==="1") document.body.classList.add("dark");
}
function populateCategories(){
  const cats=[...new Set(words.map(w=>w.category).filter(Boolean))].sort();
  $("categoryFilter").innerHTML='<option value="All">All categories</option>'+cats.map(c=>`<option>${escapeHtml(c)}</option>`).join("");
}
function filtered(){
  const q=$("searchInput").value.trim().toLowerCase();
  const cat=$("categoryFilter").value;
  return words.filter(w=>{
    const match=!q || [w.arabic,w.transliteration,w.english,w.notes,w.category].join(" ").toLowerCase().includes(q);
    const catMatch=cat==="All" || w.category===cat;
    const favMatch=!showFavorites || favorites.has(keyOf(w));
    return match && catMatch && favMatch;
  });
}
function render(){
  const list=filtered();
  $("wordCount").textContent=words.length;
  $("favCount").textContent=favorites.size;
  $("learnedCount").textContent=learned.size;
  $("emptyState").classList.toggle("hidden",list.length>0);
  $("wordList").innerHTML=list.map((w,i)=>{
    const k=keyOf(w), fav=favorites.has(k), done=learned.has(k);
    return `<article class="word-card">
      <div class="word-head">
        <div style="flex:1">
          <div class="arabic">${escapeHtml(w.arabic)}</div>
          <div class="transliteration">${escapeHtml(w.transliteration||"")}</div>
        </div>
        <div class="actions">
          <button class="mini ${fav?"on":""}" onclick="toggleFavorite('${encodeURIComponent(k)}')" aria-label="Favorite">${fav?"★":"☆"}</button>
          <button class="mini ${done?"on":""}" onclick="toggleLearned('${encodeURIComponent(k)}')" aria-label="Learned">${done?"✓":"○"}</button>
          <button class="mini" onclick="speak('${encodeURIComponent(w.arabic)}')" aria-label="Speak">🔊</button>
        </div>
      </div>
      <div class="english">${escapeHtml(w.english)}</div>
      ${w.notes?`<div class="notes">${escapeHtml(w.notes)}</div>`:""}
      <div class="card-footer"><span class="badge">${escapeHtml(w.category||"Word")}</span></div>
    </article>`;
  }).join("");
}
window.toggleFavorite=(encoded)=>{
  const k=decodeURIComponent(encoded);
  favorites.has(k)?favorites.delete(k):favorites.add(k);
  persistSet("favorites",favorites); render();
};
window.toggleLearned=(encoded)=>{
  const k=decodeURIComponent(encoded);
  learned.has(k)?learned.delete(k):learned.add(k);
  persistSet("learned",learned); render();
};
window.speak=(encoded)=>{
  const text=decodeURIComponent(encoded);
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="ar-JO"; u.rate=.78;
  speechSynthesis.speak(u);
};
function escapeHtml(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

$("searchInput").addEventListener("input",render);
$("categoryFilter").addEventListener("change",render);
$("favoritesBtn").addEventListener("click",()=>{
  showFavorites=!showFavorites;
  $("favoritesBtn").classList.toggle("active",showFavorites); render();
});
$("shuffleBtn").addEventListener("click",()=>{
  words.sort(()=>Math.random()-.5); render();
});
function startStudy(){
  currentDeck=filtered().sort(()=>Math.random()-.5);
  if(!currentDeck.length) return;
  currentIndex=0;
  $("listView").classList.add("hidden");
  $("flashcard").classList.remove("hidden");
  showCard();
}
function showCard(){
  const w=currentDeck[currentIndex%currentDeck.length];
  $("cardCategory").textContent=w.category||"Word";
  $("cardArabic").textContent=w.arabic;
  $("cardTrans").textContent=w.transliteration||"";
  $("cardEnglish").textContent=w.english;
  $("cardNotes").textContent=w.notes||"";
  $("cardAnswer").classList.add("hidden");
  $("revealBtn").classList.remove("hidden");
}
$("studyBtn").addEventListener("click",startStudy);
$("navStudy").addEventListener("click",startStudy);
$("revealBtn").addEventListener("click",()=>{
  $("cardAnswer").classList.remove("hidden"); $("revealBtn").classList.add("hidden");
});
$("nextCard").addEventListener("click",()=>{currentIndex++;showCard();});
$("speakCard").addEventListener("click",()=>speak(encodeURIComponent(currentDeck[currentIndex%currentDeck.length].arabic)));
$("learnedCard").addEventListener("click",()=>{
  const w=currentDeck[currentIndex%currentDeck.length]; learned.add(keyOf(w)); persistSet("learned",learned);
  currentIndex++; showCard(); render();
});
$("closeCard").addEventListener("click",()=>{
  $("flashcard").classList.add("hidden"); $("listView").classList.remove("hidden");
});
$("themeBtn").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode",document.body.classList.contains("dark")?"1":"0");
});
const dialog=$("addDialog");
$("navAdd").addEventListener("click",()=>dialog.showModal());
$("closeDialog").addEventListener("click",()=>dialog.close());
$("addForm").addEventListener("submit",e=>{
  const fd=new FormData(e.target);
  const w=Object.fromEntries(fd.entries());
  customWords.push(w); localStorage.setItem("customWords",JSON.stringify(customWords));
  words=[...baseWords,...customWords]; populateCategories(); render(); e.target.reset(); dialog.close();
});
init();

(() => {
  const config = window.NFC_REVIEW_CONFIG || {};
  const apiUrl = config.API_URL || "";
  const code = new URLSearchParams(location.search).get("c")?.trim().toUpperCase();
  const $ = (id) => document.getElementById(id);
  const modal = $("modal");
  let card;

  function show(id) { $(id).hidden = false; }
  function hide(id) { $(id).hidden = true; }
  function popup(title, text) { $("modal-content").innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p>`; modal.showModal(); }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function validApi() { return /^https:\/\/script\.google\.com\/macros\/s\//.test(apiUrl); }
  async function request(action, payload = {}) {
    if (!validApi()) throw new Error("API belum dihubungkan. Ikuti README untuk memasang Google Apps Script.");
    const response = action === "get"
      ? await fetch(`${apiUrl}?action=get&cardId=${encodeURIComponent(payload.cardId)}`)
      : await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, ...payload }) });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Terjadi kesalahan.");
    return data;
  }
  function formatWa(number, store, rating) {
    const normalized = number.replace(/\D/g, "").replace(/^0/, "62");
    return `https://wa.me/${normalized}?text=${encodeURIComponent(`Halo ${store}, saya ingin memberi masukan privat${rating ? ` (penilaian saya: ${rating}/5)` : ""}.`)}`;
  }
  function renderReview() {
    $("store-name").textContent = card.storeName;
    $("google-review-link").href = card.reviewUrl;
    show("review");
  }
  function renderActivation() { $("activation-card-id").textContent = code; show("activation"); }
  async function initialise() {
    hide("loading");
    if (!code || !/^[A-Z0-9_-]{4,40}$/.test(code)) return show("not-found");
    try {
      const data = await request("get", { cardId: code });
      if (data.card) { card = data.card; renderReview(); } else renderActivation();
    } catch (error) { popup("Belum terhubung", error.message); renderActivation(); }
  }
  $("activation-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reviewUrl = form.get("reviewUrl").trim();
    if (!/^https:\/\//i.test(reviewUrl)) return popup("Link Google belum benar", "Tempel link HTTPS dari tombol ‘Minta ulasan’ di Google Business Profile.");
    try {
      await request("activate", { cardId: code, storeName: form.get("storeName").trim(), reviewUrl, whatsapp: form.get("whatsapp").trim(), pin: form.get("pin") });
      popup("Kartu aktif", "Kartu siap digunakan. Simpan PIN untuk perubahan di masa depan.");
      setTimeout(() => location.reload(), 350);
    } catch (error) { popup("Aktivasi gagal", error.message); }
  });
  document.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => {
    const rating = Number(button.dataset.rating);
    document.querySelectorAll("[data-rating]").forEach((star) => star.classList.toggle("active", Number(star.dataset.rating) <= rating));
    $("rating-copy").textContent = "Terima kasih. Pilih cara yang paling nyaman untuk membagikan pengalaman Anda.";
    $("whatsapp-link").href = formatWa(card.whatsapp, card.storeName, rating);
    show("feedback-actions");
  }));
  $("modal-close").addEventListener("click", () => modal.close());
  initialise();
})();

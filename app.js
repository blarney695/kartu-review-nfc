(() => {
  const config = window.NFC_REVIEW_CONFIG || {};
  const apiUrl = config.API_URL || "";
  const code = new URLSearchParams(location.search).get("c")?.trim().toUpperCase();
  const $ = (id) => document.getElementById(id);
  const modal = $("modal");
  let card;
  let selectedRating;

  function show(id) { $(id).hidden = false; }
  function hide(id) { $(id).hidden = true; }
  function popup(title, text) { $("modal-content").innerHTML = "<h2>" + escapeHtml(title) + "</h2><p>" + escapeHtml(text) + "</p>"; modal.showModal(); }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function validApi() { return apiUrl.startsWith("https://script.google.com/macros/s/"); }
  async function request(action, payload = {}) {
    if (!validApi()) throw new Error("API belum dihubungkan. Ikuti README untuk memasang Google Apps Script.");
    const response = action === "get"
      ? await fetch(apiUrl + "?action=get&cardId=" + encodeURIComponent(payload.cardId))
      : await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, ...payload }) });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Terjadi kesalahan.");
    return data;
  }
  function waUrl(number, message) {
    const normalized = number.replace(/[^0-9]/g, "").replace(/^0/, "62");
    return "https://wa.me/" + normalized + "?text=" + encodeURIComponent(message);
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
    if (!reviewUrl.startsWith("https://")) return popup("Link Google belum benar", "Tempel link HTTPS dari tombol Minta ulasan di Google Business Profile.");
    try {
      await request("activate", { cardId: code, storeName: form.get("storeName").trim(), reviewUrl, whatsapp: form.get("whatsapp").trim(), pin: form.get("pin") });
      popup("Kartu aktif", "Kartu siap digunakan. Simpan PIN untuk perubahan di masa depan.");
      setTimeout(() => location.reload(), 350);
    } catch (error) { popup("Aktivasi gagal", error.message); }
  });
  document.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => {
    const rating = Number(button.dataset.rating);
    selectedRating = rating;
    document.querySelectorAll("[data-rating]").forEach((star) => star.classList.toggle("active", Number(star.dataset.rating) <= rating));
    if (rating >= 4) {
      window.location.assign(card.reviewUrl);
      return;
    }
    $("rating-copy").textContent = "Mohon maaf atas ketidaknyamanannya. Ceritakan masukan Anda agar toko dapat memperbaikinya.";
    $("private-feedback").hidden = false;
    $("whatsapp-link").hidden = true;
    show("feedback-actions");
  }));
  $("private-feedback").addEventListener("submit", (event) => {
    event.preventDefault();
    const message = $("feedback-message").value.trim();
    if (!selectedRating || !message) return popup("Masukan belum diisi", "Tulis masukan Anda terlebih dahulu.");
    const whatsappMessage = "*MASUKAN PELANGGAN (Rating " + selectedRating + "/5 Bintang)*\n\nMasukan: " + message;
    window.location.assign(waUrl(card.whatsapp, whatsappMessage));
  });
  $("modal-close").addEventListener("click", () => modal.close());
  initialise();
})();

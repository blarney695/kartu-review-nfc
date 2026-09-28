(() => {
  const $ = (id) => document.getElementById(id);
  const apiUrl = (window.NFC_REVIEW_CONFIG || {}).API_URL || "";
  const cardId = new URLSearchParams(location.search).get("c")?.trim().toUpperCase();
  const modal = $("modal");
  const isCode = /^[A-Z0-9_-]{4,40}$/.test(cardId || "");
  const validApi = /^https:\/\/script\.google\.com\/macros\/s\//.test(apiUrl);
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  function popup(title, text) { $("modal-content").innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p>`; modal.showModal(); }
  async function request(action, payload) {
    const response = await fetch(apiUrl, { method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({action, ...payload}) });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Terjadi kesalahan.");
    return data;
  }
  async function init() {
    if (!isCode) { $("status").textContent = "Kode kartu pada link tidak valid."; return; }
    $("card-id").textContent = cardId;
    if (!validApi) { $("status").textContent = "Website belum terhubung ke backend."; return; }
    try {
      const result = await fetch(`${apiUrl}?action=get&cardId=${encodeURIComponent(cardId)}`).then(r => r.json());
      if (!result.card) { $("status").textContent = "Kartu belum diaktifkan."; return; }
      $("status").hidden = true; $("reset-form").hidden = false;
    } catch { $("status").textContent = "Koneksi backend gagal. Coba lagi nanti."; }
  }
  $("reset-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget), reviewUrl = data.get("reviewUrl").trim();
    if (!/^https:\/\//i.test(reviewUrl)) return popup("Link belum benar", "Tempel link HTTPS dari tombol ‘Minta ulasan’ di Google Business Profile.");
    try {
      await request("resetReview", {cardId, reviewUrl, pin:data.get("pin")});
      event.currentTarget.reset();
      popup("Berhasil diperbarui", "Alamat Google Review kartu ini telah diganti.");
    } catch (error) { popup("Reset gagal", error.message); }
  });
  $("modal-close").addEventListener("click", () => modal.close());
  init();
})();

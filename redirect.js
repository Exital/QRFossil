(function () {
  var status = document.getElementById("status");

  function setStatus(title, body) {
    document.title = title + " · QRFossil";
    document.body.className = "message";
    document.body.innerHTML =
      '<main><p class="brand">QRFossil</p><h1>' +
      escapeHtml(title) +
      "</h1><p>" +
      escapeHtml(body) +
      "</p></main>";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function publicBase() {
    var parts = location.pathname.split("/").filter(Boolean);
    if (parts[0] && parts[0] !== "r" && parts[0] !== "404.html") {
      return location.origin + "/" + parts[0];
    }
    return location.origin;
  }

  function slugFromLocation() {
    var params = new URLSearchParams(location.search);
    var id = params.get("id");
    if (id) return id;
    var parts = location.pathname.split("/").filter(Boolean);
    var index = parts.indexOf("r");
    if (index >= 0 && parts[index + 1]) {
      return decodeURIComponent(parts[index + 1].replace(/\.html$/i, ""));
    }
    return "";
  }

  function isHttpUrl(value) {
    try {
      var url = new URL(String(value || ""));
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (err) {
      return false;
    }
  }

  function lookup(map, slug) {
    if (!Object.prototype.hasOwnProperty.call(map, slug)) return { kind: "missing" };
    var entry = map[slug];
    if (entry && typeof entry === "object" && entry.disabled) return { kind: "disabled" };
    if (entry === false || entry === null) return { kind: "disabled" };
    if (typeof entry === "string") return { kind: "ok", url: entry };
    if (entry && typeof entry.to === "string") return { kind: "ok", url: entry.to };
    return { kind: "missing" };
  }

  var slug = slugFromLocation();
  if (!slug) {
    setStatus("QR not found", "This QRFossil address does not include a link id.");
    return;
  }

  if (status) status.textContent = "Opening QR…";

  fetch(publicBase() + "/data/redirects.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("unavailable");
      return response.json();
    })
    .then(function (map) {
      var result = lookup(map || {}, slug);
      if (result.kind === "disabled") {
        setStatus("This QR has been disabled", "This QRFossil link has been disabled by its owner.");
        return;
      }
      if (result.kind !== "ok" || !isHttpUrl(result.url)) {
        setStatus("QR not found", "No QRFossil link exists at this address.");
        return;
      }
      location.replace(result.url);
    })
    .catch(function () {
      setStatus(
        "Temporarily unavailable",
        "This QR destination could not be loaded. Try again in a moment."
      );
    });
})();

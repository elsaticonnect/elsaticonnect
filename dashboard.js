(function () {
  const supabaseClient = supabase.createClient(
    window.ELSATI_SUPABASE.url,
    window.ELSATI_SUPABASE.publishableKey
  );

  let selectedSupplierRfqId = null;

  function formatCurrency(value) {
    return `K${Number(value || 0).toLocaleString()}`;
  }

  function shortRfqCode(rfq, index) {
    return rfq.code || `RFQ-${String(index + 1).padStart(3, "0")}`;
  }

  async function getCurrentUserAndProfile() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
      return { user: null, profile: null };
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return { user: userData.user, profile: null };
    }

    return { user: userData.user, profile };
  }

  async function loadBusinessDashboard() {
    const listNode = document.getElementById("business-rfq-list");
    const form = document.getElementById("rfq-create-form");

    if (!listNode || !form) return;

    const feedback = document.getElementById("rfq-create-feedback");
    const comparisonTitle = document.getElementById("comparison-title");
    const comparisonTable = document.getElementById("business-comparison-table");
    const reportNode = document.getElementById("procurement-report");
    const activeCount = document.getElementById("active-rfq-count");
    const quoteCount = document.getElementById("quotes-received-count");

    const { user, profile } = await getCurrentUserAndProfile();

    if (!user || !profile) {
      window.location.href = "customer-signin.html";
      return;
    }

    if (profile.role !== "business") {
      await supabaseClient.auth.signOut();
      window.location.href = "signin.html";
      return;
    }

    document.getElementById("dashboard-user-name").textContent =
      profile.company_name || profile.email || "Business user";

    document.getElementById("dashboard-company-name").textContent =
      profile.company_name || "Company";

    async function loadQuotesForRfq(rfq) {
      const { data: quotes, error } = await supabaseClient
        .from("quotes")
        .select("*")
        .eq("rfq_id", rfq.id)
        .order("created_at", { ascending: false });

      if (error) {
        comparisonTable.innerHTML = `<p class="empty-state">${error.message}</p>`;
        return;
      }

      comparisonTitle.textContent = `${rfq.code || "RFQ"} · ${rfq.title}`;

      if (!quotes || quotes.length === 0) {
        comparisonTable.innerHTML = `<p class="empty-state">No quotes yet. Supplier quotations will appear here once submitted.</p>`;
        reportNode.innerHTML = `
          <div class="report-card">
            <strong>Waiting for supplier quotes</strong>
            <p>${rfq.title} is live. Verified suppliers can now view and respond to this RFQ.</p>
          </div>
        `;
        return;
      }

      comparisonTable.innerHTML = `
        <div class="comparison-row comparison-head">
          <strong>Supplier</strong>
          <strong>Price</strong>
          <strong>Delivery</strong>
          <strong>Status</strong>
        </div>
        ${quotes.map(quote => `
          <div class="comparison-row">
            <span><strong>${quote.supplier_name || "Supplier"}</strong><br><small>${quote.notes || ""}</small></span>
            <span>${formatCurrency(quote.quoted_price)}</span>
            <span>${quote.delivery_period || "-"}</span>
            <span>${quote.status || "submitted"}</span>
          </div>
        `).join("")}
      `;

      const prices = quotes.map(q => Number(q.quoted_price || 0));
      const lowest = Math.min(...prices);
      const highest = Math.max(...prices);
      const average = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
      const bestQuote = quotes.find(q => Number(q.quoted_price) === lowest);

      reportNode.innerHTML = `
        <article>
          <h3>Price comparison</h3>
          <p>Lowest quote: ${formatCurrency(lowest)}</p>
          <p>Highest quote: ${formatCurrency(highest)}</p>
          <p>Average quote: ${formatCurrency(average)}</p>
        </article>
        <article>
          <h3>Recommended supplier</h3>
          <p><strong>${bestQuote?.supplier_name || "Supplier"}</strong> currently has the lowest submitted price.</p>
        </article>
      `;
    }

    async function loadBusinessRFQs() {
      const { data: rfqs, error } = await supabaseClient
        .from("rfqs")
        .select("*")
        .eq("business_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        listNode.innerHTML = `<p class="empty-state">${error.message}</p>`;
        return;
      }

      activeCount && (activeCount.textContent = rfqs ? rfqs.length : 0);

      const { data: allQuotes } = await supabaseClient
        .from("quotes")
        .select("*");

      quoteCount && (quoteCount.textContent = allQuotes ? allQuotes.length : 0);

      if (!rfqs || rfqs.length === 0) {
        listNode.innerHTML = `<p class="empty-state">No RFQs created yet. Create your first procurement request.</p>`;
        comparisonTitle.textContent = "No RFQ selected";
        comparisonTable.innerHTML = `<p class="empty-state">Create an RFQ to begin collecting supplier quotations.</p>`;
        reportNode.innerHTML = `<p class="empty-state">Procurement reports will appear once supplier quotes have been received.</p>`;
        return;
      }

      listNode.innerHTML = rfqs
        .map((rfq, index) => `
          <button class="request-card" data-rfq-id="${rfq.id}" type="button">
            <strong>${shortRfqCode(rfq, index)}</strong>
            <span>${rfq.title}</span>
            <small>${rfq.quantity || 0} units · ${rfq.deadline || "No deadline"}</small>
            <small>Status: ${rfq.status || "open"}</small>
          </button>
        `)
        .join("");

      listNode.querySelectorAll("[data-rfq-id]").forEach(button => {
        button.addEventListener("click", function () {
          const selected = rfqs.find(rfq => rfq.id === button.dataset.rfqId);
          if (selected) loadQuotesForRfq(selected);
        });
      });

      await loadQuotesForRfq(rfqs[0]);
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const title = form.querySelector('input[name="title"]').value;
      const quantity = form.querySelector('input[name="quantity"]').value;
      const deadline = form.querySelector('input[name="deadline"]').value;
      const notes = form.querySelector('textarea[name="notes"]').value;

      feedback.textContent = "Creating RFQ...";
      feedback.className = "form-feedback";

      const { error } = await supabaseClient.from("rfqs").insert({
        code: "RFQ-" + Date.now(),
        business_id: user.id,
        business_name: profile.company_name || profile.email,
        created_by: user.id,
        created_by_company: profile.company_name || profile.email,
        title,
        quantity: Number(quantity),
        deadline,
        notes,
        status: "open"
      });

      if (error) {
        feedback.textContent = error.message;
        feedback.className = "form-feedback error";
        return;
      }

      feedback.textContent = "RFQ created successfully. Suppliers can now view it.";
      feedback.className = "form-feedback ok";

      form.reset();
      await loadBusinessRFQs();
    });

    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
        await supabaseClient.auth.signOut();
        window.location.href = "customer-signin.html";
      });
    }

    await loadBusinessRFQs();
  }

  async function loadSupplierRFQsOnly() {
    const listNode = document.getElementById("supplier-rfq-list");
    const form = document.getElementById("supplier-quote-form");
    const selectedField = document.getElementById("supplier-selected-rfq");
    const feedback = document.getElementById("supplier-quote-feedback");
    const quoteList = document.getElementById("supplier-quote-list");
    const openCount = document.getElementById("supplier-open-rfq-count");

    if (!listNode || !form) return;

    const { user, profile } = await getCurrentUserAndProfile();

    if (!user || !profile || profile.role !== "supplier") return;

    const { data: rfqs, error } = await supabaseClient
      .from("rfqs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      listNode.innerHTML = `<p class="empty-state">${error.message}</p>`;
      return;
    }

    openCount && (openCount.textContent = rfqs ? rfqs.length : 0);

    if (!rfqs || rfqs.length === 0) {
      listNode.innerHTML = `<p class="empty-state">No live RFQs available yet.</p>`;
      return;
    }

    listNode.innerHTML = rfqs
      .map((rfq, index) => `
        <article class="request-card" data-rfq-id="${rfq.id}">
          <strong>${shortRfqCode(rfq, index)}</strong>
          <p>${rfq.title}</p>
          <small>${rfq.quantity || 0} units · ${rfq.deadline || "No deadline"}</small><br>
          <span class="supplier-status-badge">OPEN</span>
        </article>
      `)
      .join("");

    document.querySelectorAll("#supplier-rfq-list .request-card").forEach(card => {
      card.addEventListener("click", function () {
        document.querySelectorAll("#supplier-rfq-list .request-card").forEach(item => {
          item.classList.remove("active");
        });

        card.classList.add("active");
        selectedSupplierRfqId = card.dataset.rfqId;

        const rfqNumber = card.querySelector("strong").textContent;
        const rfqTitle = card.querySelector("p").textContent;

        if (selectedField) selectedField.value = rfqNumber + " - " + rfqTitle;
      });
    });

    async function loadMyQuotes() {
      const { data: myQuotes, error: quotesError } = await supabaseClient
        .from("quotes")
        .select("*")
        .eq("supplier_id", user.id)
        .order("created_at", { ascending: false });

      if (!quoteList) return;

      if (quotesError) {
        quoteList.innerHTML = `<p class="empty-state">${quotesError.message}</p>`;
        return;
      }

      if (!myQuotes || myQuotes.length === 0) {
        quoteList.innerHTML = `<p class="empty-state">Submitted quotations will appear here.</p>`;
        return;
      }

      quoteList.innerHTML = `
        <div class="comparison-row comparison-head">
          <strong>RFQ</strong>
          <strong>Price</strong>
          <strong>Delivery</strong>
          <strong>Status</strong>
        </div>
        ${myQuotes.map(quote => `
          <div class="comparison-row">
            <span>${quote.rfq_id}</span>
            <span>${formatCurrency(quote.quoted_price)}</span>
            <span>${quote.delivery_period}</span>
            <span>${quote.status}</span>
          </div>
        `).join("")}
      `;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!profile.verified || profile.verification_status !== "approved") {
        feedback.textContent = "Your supplier account must be verified before submitting quotations.";
        feedback.className = "form-feedback error";
        return;
      }

      if (!selectedSupplierRfqId) {
        feedback.textContent = "Please select an RFQ first.";
        feedback.className = "form-feedback error";
        return;
      }

      const price = form.querySelector('input[name="price"]').value;
      const delivery = form.querySelector('input[name="delivery"]').value;
      const notes = form.querySelector('textarea[name="notes"]').value;

      const { error: quoteError } = await supabaseClient.from("quotes").insert({
        rfq_id: selectedSupplierRfqId,
        supplier_id: user.id,
        supplier_name: profile.company_name || profile.email,
        quoted_price: Number(price),
        delivery_period: delivery,
        notes,
        status: "submitted"
      });

      if (quoteError) {
        feedback.textContent = quoteError.message;
        feedback.className = "form-feedback error";
        return;
      }

      feedback.textContent = "Quotation submitted successfully. The business can now compare your offer.";
      feedback.className = "form-feedback ok";

      form.reset();
      selectedField.value = "";
      selectedSupplierRfqId = null;

      await loadMyQuotes();
    });

    await loadMyQuotes();
  }

  async function renderMonitor() {
    const rfqCount = document.getElementById("monitor-rfq-count");
    const rfqList = document.getElementById("monitor-rfq-list");

    if (!rfqCount || !rfqList) return;

    const { data: rfqs, error } = await supabaseClient
      .from("rfqs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      rfqList.innerHTML = `<p class="empty-state">${error.message}</p>`;
      return;
    }

    rfqCount.textContent = rfqs ? rfqs.length : 0;

    rfqList.innerHTML = rfqs && rfqs.length
      ? rfqs.map((rfq, index) => `
          <div class="monitor-row">
            <strong>${shortRfqCode(rfq, index)} · ${rfq.title}</strong>
            <span>${rfq.quantity || 0} units · ${rfq.deadline || "No deadline"} · ${rfq.status || "open"}</span>
          </div>
        `).join("")
      : `<p class="empty-state">No buyer RFQs are active yet.</p>`;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    await loadBusinessDashboard();
    await loadSupplierRFQsOnly();
    await renderMonitor();
  });
})();

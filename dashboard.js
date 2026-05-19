(function () {
  const supabaseClient = supabase.createClient(
    window.ELSATI_SUPABASE.url,
    window.ELSATI_SUPABASE.publishableKey
  );

  function formatCurrency(value) {
    return `K${Number(value).toLocaleString()}`;
  }

  function shortRfqCode(id, index) {
    if (!id) return `RFQ-${String(index + 1).padStart(3, "0")}`;
    return `RFQ-${String(index + 1).padStart(3, "0")}`;
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

    return {
      user: userData.user,
      profile: profile
    };
  }

  async function loadBusinessDashboard() {
    const listNode = document.getElementById("business-rfq-list");
    const form = document.getElementById("rfq-create-form");

    if (!listNode || !form) return;

    const feedback = document.getElementById("rfq-create-feedback");
    const comparisonTitle = document.getElementById("comparison-title");
    const comparisonTable = document.getElementById("business-comparison-table");
    const reportNode = document.getElementById("procurement-report");

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

      if (!rfqs || rfqs.length === 0) {
        listNode.innerHTML = `<p class="empty-state">No RFQs created yet. Create your first procurement request.</p>`;

        if (comparisonTitle) comparisonTitle.textContent = "No RFQ selected";
        if (comparisonTable) comparisonTable.innerHTML = `<p class="empty-state">Create an RFQ to begin collecting supplier quotations.</p>`;
        if (reportNode) reportNode.innerHTML = `<p class="empty-state">Procurement reports will appear once supplier quotes have been received.</p>`;
        return;
      }

      listNode.innerHTML = rfqs
        .map((rfq, index) => {
          const code = shortRfqCode(rfq.id, index);

          return `
            <button class="request-card" data-rfq-id="${rfq.id}" type="button">
              <strong>${code}</strong>
              <span>${rfq.title}</span>
              <small>${rfq.quantity || 0} units · ${rfq.deadline || "No deadline"}</small>
              <small>Status: ${rfq.status || "open"}</small>
            </button>
          `;
        })
        .join("");

      const firstRfq = rfqs[0];

      if (comparisonTitle) {
        comparisonTitle.textContent = `${shortRfqCode(firstRfq.id, 0)} · ${firstRfq.title}`;
      }

      if (comparisonTable) {
        comparisonTable.innerHTML = `<p class="empty-state">No quotes yet. Supplier quotations will appear here once submitted.</p>`;
      }

      if (reportNode) {
        reportNode.innerHTML = `
          <div class="report-card">
            <strong>Waiting for supplier quotes</strong>
            <p>${firstRfq.title} is live. Verified suppliers can now view and respond to this RFQ.</p>
          </div>
        `;
      }
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const title = form.querySelector('input[name="title"]').value;
      const quantity = form.querySelector('input[name="quantity"]').value;
      const deadline = form.querySelector('input[name="deadline"]').value;
      const notes = form.querySelector('textarea[name="notes"]').value;

      feedback.textContent = "Creating RFQ...";
      feedback.className = "form-feedback";

      const { error } = await supabaseClient
        .from("rfqs")
        .insert({
  code: "RFQ-" + Date.now(),
  business_id: user.id,
  business_name: profile.company_name || profile.email,
  title: title,
  quantity: Number(quantity),
  deadline: deadline,
  notes: notes,
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

    if (!listNode) return;

    const { data: rfqs, error } = await supabaseClient
      .from("rfqs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      listNode.innerHTML = `<p class="empty-state">${error.message}</p>`;
      return;
    }

    if (!rfqs || rfqs.length === 0) {
      listNode.innerHTML = `<p class="empty-state">No live RFQs available yet.</p>`;
      return;
    }

    listNode.innerHTML = rfqs
      .map((rfq, index) => {
        const code = shortRfqCode(rfq.id, index);

        return `
          <article class="request-card" data-rfq-id="${rfq.id}">
            <strong>${code}</strong>
            <p>${rfq.title}</p>
            <small>${rfq.quantity || 0} units · ${rfq.deadline || "No deadline"}</small><br>
            <span class="supplier-status-badge">OPEN</span>
          </article>
        `;
      })
      .join("");

    document.querySelectorAll("#supplier-rfq-list .request-card").forEach((card) => {
      card.addEventListener("click", function () {
        document.querySelectorAll("#supplier-rfq-list .request-card").forEach((item) => {
          item.classList.remove("active");
        });

        card.classList.add("active");

        const rfqNumber = card.querySelector("strong").textContent;
        const rfqTitle = card.querySelector("p").textContent;

        const selectedField = document.getElementById("supplier-selected-rfq");

        if (selectedField) {
          selectedField.value = rfqNumber + " - " + rfqTitle;
        }
      });
    });
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
            <strong>${shortRfqCode(rfq.id, index)} · ${rfq.title}</strong>
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

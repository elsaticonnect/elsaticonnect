(function () {
  const supabaseClient = supabase.createClient(
    window.ELSATI_SUPABASE.url,
    window.ELSATI_SUPABASE.publishableKey
  );

  let selectedSupplierRfqId = null;
  let currentBusinessRfq = null;

  function formatCurrency(value) {
    return `K${Number(value || 0).toLocaleString()}`;
  }

  function shortRfqCode(rfq, index) {
    return rfq.code || `RFQ-${String(index + 1).padStart(3, "0")}`;
  }

  async function getCurrentUserAndProfile() {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !userData.user)
      return { user: null, profile: null };

    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

    if (profileError || !profile)
      return { user: userData.user, profile: null };

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

    async function awardQuote(quoteId, rfqId) {
      const confirmed = confirm(
        "Are you sure you want to award this supplier?"
      );

      if (!confirmed) return;

      await supabaseClient
        .from("quotes")
        .update({
          awarded: false,
          status: "submitted"
        })
        .eq("rfq_id", rfqId);

      const { error } = await supabaseClient
        .from("quotes")
        .update({
          awarded: true,
          status: "awarded"
        })
        .eq("id", quoteId);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Supplier awarded successfully.");

      if (currentBusinessRfq) {
        await loadQuotesForRfq(currentBusinessRfq);
      }
    }

    async function loadQuotesForRfq(rfq) {
      currentBusinessRfq = rfq;

      const { data: quotes, error } = await supabaseClient
        .from("quotes")
        .select("*")
        .eq("rfq_id", rfq.id)
        .order("created_at", { ascending: false });

      if (error) {
        comparisonTable.innerHTML = `
          <p class="empty-state">${error.message}</p>
        `;
        return;
      }

      comparisonTitle.textContent = `${rfq.code} · ${rfq.title}`;

      if (!quotes || quotes.length === 0) {
        comparisonTable.innerHTML = `
          <p class="empty-state">
            No quotes submitted yet.
          </p>
        `;

        reportNode.innerHTML = `
          <div class="report-card">
            <strong>Waiting for supplier quotes</strong>
            <p>
              Suppliers can now submit quotations for this RFQ.
            </p>
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
          <strong>Action</strong>
        </div>

        ${quotes
          .map((quote) => {
            const isAwarded =
              quote.awarded === true ||
              quote.status === "awarded";

            return `
              <div class="comparison-row">
                <span>
                  <strong>
                    ${
                      quote.supplier_name ||
                      quote.supplier_company ||
                      "Supplier"
                    }
                  </strong>
                  <br />
                  <small>${quote.notes || ""}</small>
                </span>

                <span>
                  ${formatCurrency(
                    quote.quoted_price || quote.price
                  )}
                </span>

                <span>
                  ${
                    quote.delivery_period ||
                    quote.delivery ||
                    "-"
                  }
                </span>

                <span>
                  ${
                    isAwarded
                      ? "Awarded"
                      : quote.status || "submitted"
                  }
                </span>

                <span>
                  ${
                    isAwarded
                      ? `
                        <button
                          class="award-btn awarded-btn"
                          disabled
                        >
                          Awarded
                        </button>
                      `
                      : `
                        <button
                          class="award-btn"
                          data-award-id="${quote.id}"
                        >
                          Award Supplier
                        </button>
                      `
                  }
                </span>
              </div>
            `;
          })
          .join("")}
      `;

      comparisonTable
        .querySelectorAll("[data-award-id]")
        .forEach((button) => {
          button.addEventListener("click", async function () {
            await awardQuote(
              button.dataset.awardId,
              rfq.id
            );
          });
        });

      const prices = quotes.map((q) =>
        Number(q.quoted_price || q.price || 0)
      );

      const lowest = Math.min(...prices);
      const highest = Math.max(...prices);

      const average =
        prices.reduce((sum, p) => sum + p, 0) /
        prices.length;

      const bestQuote = quotes.find(
        (q) =>
          Number(q.quoted_price || q.price || 0) === lowest
      );

      reportNode.innerHTML = `
        <article class="report-card">
          <h3>Price comparison</h3>

          <p>
            Lowest quote:
            ${formatCurrency(lowest)}
          </p>

          <p>
            Highest quote:
            ${formatCurrency(highest)}
          </p>

          <p>
            Average quote:
            ${formatCurrency(average.toFixed(2))}
          </p>
        </article>

        <article class="report-card">
          <h3>Recommended supplier</h3>

          <p>
            <strong>
              ${
                bestQuote?.supplier_name ||
                bestQuote?.supplier_company ||
                "Supplier"
              }
            </strong>
            currently has the lowest submitted quote.
          </p>
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
        listNode.innerHTML = `
          <p class="empty-state">${error.message}</p>
        `;
        return;
      }

      if (activeCount)
        activeCount.textContent = rfqs
          ? rfqs.length
          : 0;

      const { data: allQuotes } =
        await supabaseClient
          .from("quotes")
          .select("*");

      if (quoteCount)
        quoteCount.textContent = allQuotes
          ? allQuotes.length
          : 0;

      if (!rfqs || rfqs.length === 0) {
        listNode.innerHTML = `
          <p class="empty-state">
            No RFQs created yet.
          </p>
        `;

        return;
      }

      listNode.innerHTML = rfqs
        .map(
          (rfq, index) => `
            <button
              class="request-card"
              data-rfq-id="${rfq.id}"
              type="button"
            >
              <strong>
                ${shortRfqCode(rfq, index)}
              </strong>

              <span>${rfq.title}</span>

              <small>
                ${rfq.quantity || 0} units ·
                ${rfq.deadline || "No deadline"}
              </small>

              <small>
                Status: ${rfq.status || "open"}
              </small>
            </button>
          `
        )
        .join("");

      listNode
        .querySelectorAll("[data-rfq-id]")
        .forEach((button) => {
          button.addEventListener("click", function () {
            const selected = rfqs.find(
              (rfq) => rfq.id === button.dataset.rfqId
            );

            if (selected) {
              loadQuotesForRfq(selected);
            }
          });
        });

      await loadQuotesForRfq(rfqs[0]);
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const title =
        form.querySelector('input[name="title"]').value;

      const quantity =
        form.querySelector('input[name="quantity"]').value;

      const deadline =
        form.querySelector('input[name="deadline"]').value;

      const notes =
        form.querySelector('textarea[name="notes"]').value;

      feedback.textContent = "Creating RFQ...";
      feedback.className = "form-feedback";

      const { error } = await supabaseClient
        .from("rfqs")
        .insert({
          code: "RFQ-" + Date.now(),
          business_id: user.id,
          business_name:
            profile.company_name || profile.email,
          created_by: user.id,
          created_by_company:
            profile.company_name || profile.email,
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

      feedback.textContent =
        "RFQ created successfully.";

      feedback.className = "form-feedback ok";

      form.reset();

      await loadBusinessRFQs();
    });

    await loadBusinessRFQs();
  }

  document.addEventListener(
    "DOMContentLoaded",
    async function () {
      await loadBusinessDashboard();
    }
  );
})();

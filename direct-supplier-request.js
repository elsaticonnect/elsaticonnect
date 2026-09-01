(function () {
  let client = null;
  let currentUser = null;
  let currentProfile = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setupSupabase() {
    if (
      typeof supabase === "undefined" ||
      !window.ELSATI_SUPABASE
    ) {
      return false;
    }

    client = supabase.createClient(
      window.ELSATI_SUPABASE.url,
      window.ELSATI_SUPABASE.publishableKey
    );

    return true;
  }

  async function getBusinessUser() {
    if (!client) return false;

    const { data, error } =
      await client.auth.getUser();

    if (error || !data.user) {
      return false;
    }

    currentUser = data.user;

    const { data: profile, error: profileError } =
      await client
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (profileError || !profile) {
      return false;
    }

    if (profile.role !== "business") {
      return false;
    }

    currentProfile = profile;

    return true;
  }

  function addStyles() {
    if (
      document.getElementById(
        "elsati-direct-request-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "elsati-direct-request-styles";

    style.textContent = `
      .elsati-direct-request-button {
        display: block;
        width: 100%;
        margin-top: 12px;
        padding: 11px 15px;
        border: none;
        border-radius: 10px;
        background: #102033;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .elsati-direct-request-button:hover {
        opacity: 0.88;
      }

      .elsati-direct-modal {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.58);
      }

      .elsati-direct-modal-box {
        width: min(600px, 100%);
        max-height: 90vh;
        overflow-y: auto;
        background: #ffffff;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 25px 70px rgba(0,0,0,.25);
      }

      .elsati-direct-modal-box h2 {
        margin-top: 0;
        color: #102033;
      }

      .elsati-selected-supplier {
        padding: 15px;
        margin: 18px 0;
        border-radius: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .elsati-selected-supplier strong {
        display: block;
        margin-top: 5px;
        font-size: 18px;
      }

      .elsati-direct-form label {
        display: block;
        margin-bottom: 14px;
        font-weight: 700;
      }

      .elsati-direct-form input,
      .elsati-direct-form textarea {
        display: block;
        width: 100%;
        box-sizing: border-box;
        margin-top: 6px;
        padding: 11px 13px;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        font: inherit;
      }

      .elsati-direct-form textarea {
        min-height: 100px;
        resize: vertical;
      }

      .elsati-direct-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 18px;
      }

      .elsati-direct-actions button {
        padding: 11px 18px;
        border-radius: 9px;
        cursor: pointer;
        font-weight: 700;
      }

      .elsati-direct-cancel {
        background: #ffffff;
        border: 1px solid #cbd5e1;
      }

      .elsati-direct-submit {
        background: #102033;
        color: #ffffff;
        border: none;
      }

      .elsati-direct-message {
        margin-top: 10px;
        font-weight: 700;
      }
    `;

    document.head.appendChild(style);
  }

  function openRequestForm(
    supplierId,
    supplierName,
    supplierCategory
  ) {
    const existing =
      document.getElementById(
        "elsati-direct-request-modal"
      );

    if (existing) {
      existing.remove();
    }

    const modal =
      document.createElement("div");

    modal.id =
      "elsati-direct-request-modal";

    modal.className =
      "elsati-direct-modal";

    modal.innerHTML = `
      <div class="elsati-direct-modal-box">

        <h2>
          Request a Quote
        </h2>

        <p>
          Send a procurement request directly to this verified supplier.
        </p>

        <div class="elsati-selected-supplier">

          <span>
            Requesting from:
          </span>

          <strong>
            ${escapeHtml(supplierName)}
          </strong>

          <small>
            ${escapeHtml(
              supplierCategory ||
              "General supplier"
            )}
          </small>

          <div style="
            margin-top:8px;
            color:#15803d;
            font-weight:700;
          ">
            ✓ Verified Supplier
          </div>

        </div>

        <form
          class="elsati-direct-form"
          id="elsati-direct-request-form"
        >

          <label>
            What do you need?
            <input
              name="title"
              required
              placeholder="e.g. Office tables"
            >
          </label>

          <label>
            Category
            <input
              name="category"
              placeholder="e.g. Furniture"
            >
          </label>

          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              min="1"
              required
              placeholder="e.g. 20"
            >
          </label>

          <label>
            Required by
            <input
              name="deadline"
              required
              placeholder="e.g. 15 September 2026"
            >
          </label>

          <label>
            Delivery location
            <input
              name="delivery_location"
              placeholder="e.g. Lusaka"
            >
          </label>

          <label>
            Estimated budget
            <input
              name="estimated_budget"
              type="number"
              min="0"
              placeholder="Optional"
            >
          </label>

          <label>
            Notes / specifications
            <textarea
              name="notes"
              placeholder="Add specifications or requirements..."
            ></textarea>
          </label>

          <div
            id="elsati-direct-message"
            class="elsati-direct-message"
          ></div>

          <div class="elsati-direct-actions">

            <button
              type="button"
              class="elsati-direct-cancel"
              id="elsati-direct-cancel"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="elsati-direct-submit"
              id="elsati-direct-submit"
            >
              Send Request
            </button>

          </div>

        </form>

      </div>
    `;

    document.body.appendChild(modal);

    document
      .getElementById(
        "elsati-direct-cancel"
      )
      .addEventListener(
        "click",
        function () {
          modal.remove();
        }
      );

    document
      .getElementById(
        "elsati-direct-request-form"
      )
      .addEventListener(
        "submit",
        async function (event) {

          event.preventDefault();

          const form =
            event.target;

          const message =
            document.getElementById(
              "elsati-direct-message"
            );

          const submitButton =
            document.getElementById(
              "elsati-direct-submit"
            );

          submitButton.disabled =
            true;

          submitButton.textContent =
            "Sending...";

          try {

            /*
             * Confirm supplier is still verified.
             */
            const {
              data: supplier,
              error: supplierError
            } = await client
              .from("profiles")
              .select(
                "id, company_name, verified"
              )
              .eq(
                "id",
                supplierId
              )
              .eq(
                "verified",
                true
              )
              .maybeSingle();

            if (
              supplierError ||
              !supplier
            ) {
              throw new Error(
                "This supplier is no longer verified."
              );
            }

            const title =
              form.title.value.trim();

            const quantity =
              Number(
                form.quantity.value
              );

            const deadline =
              form.deadline.value.trim();

            const category =
              form.category.value.trim() ||
              null;

            const deliveryLocation =
              form.delivery_location.value.trim() ||
              null;

            const budget =
              form.estimated_budget.value;

            const notes =
              form.notes.value.trim() ||
              null;

            /*
             * Create the direct RFQ.
             */
            const { error } =
              await client
                .from("rfqs")
                .insert({

                  code:
                    "RFQ-" +
                    Date.now(),

                  title:
                    title,

                  quantity:
                    quantity,

                  deadline:
                    deadline,

                  notes:
                    notes,

                  category:
                    category,

                  delivery_location:
                    deliveryLocation,

                  estimated_budget:
                    budget
                      ? Number(budget)
                      : null,

                  business_id:
                    currentUser.id,

                  business_name:
                    currentProfile.company_name ||
                    currentProfile.email,

                  created_by:
                    currentUser.id,

                  created_by_company:
                    currentProfile.company_name ||
                    currentProfile.email,

                  status:
                    "open",

                  supplier_profile_id:
                    supplierId
                });

            if (error) {
              throw error;
            }

            message.textContent =
              "Request sent successfully to " +
              supplierName +
              ".";

            message.style.color =
              "#15803d";

            submitButton.textContent =
              "Request Sent";

            setTimeout(
              function () {
                modal.remove();
              },
              1500
            );

          } catch (error) {

            console.error(
              "Direct supplier request:",
              error
            );

            message.textContent =
              error.message ||
              "Unable to send request.";

            message.style.color =
              "#b91c1c";

            submitButton.disabled =
              false;

            submitButton.textContent =
              "Send Request";
          }
        }
      );
  }

  /*
   * Add buttons to the EXISTING supplier
   * cards created by dashboard.js.
   */
  async function addButtonsToDirectory() {

    const directory =
      document.getElementById(
        "business-supplier-directory"
      );

    if (!directory) {
      return;
    }

    const cards =
      directory.querySelectorAll(
        ".request-card"
      );

    if (!cards.length) {
      return;
    }

    /*
     * Get the actual verified suppliers.
     */
    const {
      data: suppliers,
      error
    } = await client
      .from("profiles")
      .select(
        "id, company_name, supplier_category, verified"
      )
      .eq(
        "role",
        "supplier"
      )
      .eq(
        "verified",
        true
      )
      .order(
        "company_name",
        {
          ascending: true
        }
      );

    if (error || !suppliers) {
      console.error(
        "Unable to load suppliers:",
        error
      );

      return;
    }

    /*
     * Match the existing cards to suppliers
     * by company name.
     */
    cards.forEach(
      function (card) {

        if (
          card.querySelector(
            ".elsati-direct-request-button"
          )
        ) {
          return;
        }

        const nameElement =
          card.querySelector(
            "strong"
          );

        if (!nameElement) {
          return;
        }

        const cardName =
          nameElement.textContent
            .trim();

        const supplier =
          suppliers.find(
            function (item) {
              return (
                String(
                  item.company_name ||
                  ""
                )
                  .trim()
                  .toLowerCase() ===
                cardName
                  .toLowerCase()
              );
            }
          );

        if (!supplier) {
          return;
        }

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "elsati-direct-request-button";

        button.textContent =
          "Request a Quote";

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();
            event.stopPropagation();

            openRequestForm(
              supplier.id,
              supplier.company_name ||
                "Supplier",
              supplier.supplier_category ||
                "General supplier"
            );
          }
        );

        card.appendChild(
          button
        );
      }
    );
  }

  async function start() {

    if (!setupSupabase()) {
      return;
    }

    const loggedIn =
      await getBusinessUser();

    if (!loggedIn) {
      return;
    }

    addStyles();

    /*
     * dashboard.js may render the directory
     * slightly later, so check several times.
     */
    let attempts = 0;

    const check =
      setInterval(
        async function () {

          attempts++;

          await addButtonsToDirectory();

          const directory =
            document.getElementById(
              "business-supplier-directory"
            );

          const button =
            directory?.querySelector(
              ".elsati-direct-request-button"
            );

          if (
            button ||
            attempts >= 20
          ) {
            clearInterval(check);
          }

        },
        500
      );

    /*
     * Also watch for dashboard.js rebuilding
     * the supplier directory.
     *
     * If it rebuilds the cards, the button
     * gets added back automatically.
     */
    const directory =
      document.getElementById(
        "business-supplier-directory"
      );

    if (directory) {

      const observer =
        new MutationObserver(
          async function () {
            await addButtonsToDirectory();
          }
        );

      observer.observe(
        directory,
        {
          childList: true,
          subtree: true
        }
      );
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start
    );

  } else {

    start();

  }

})();

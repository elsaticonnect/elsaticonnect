(function () {

  let client = null;
  let currentUser = null;
  let currentProfile = null;

  /* =====================================================
     BASIC HELPERS
     ===================================================== */

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
      console.error(
        "Elsati Supabase configuration was not found."
      );

      return false;
    }

    client = supabase.createClient(
      window.ELSATI_SUPABASE.url,
      window.ELSATI_SUPABASE.publishableKey
    );

    return true;
  }


  /* =====================================================
     GET CURRENT BUSINESS USER
     ===================================================== */

  async function getBusinessUser() {

    if (!client) {
      return false;
    }

    const {
      data,
      error
    } = await client.auth.getUser();

    if (
      error ||
      !data ||
      !data.user
    ) {
      return false;
    }

    currentUser = data.user;

    const {
      data: profile,
      error: profileError
    } = await client
      .from("profiles")
      .select("*")
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return false;
    }

    if (
      profile.role !== "business"
    ) {
      return false;
    }

    currentProfile = profile;

    return true;
  }


  /* =====================================================
     STYLING
     ===================================================== */

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

      /* REQUEST A QUOTE BUTTON */

      .elsati-direct-request-button {

        display: block;

        width: 100%;

        margin-top: 14px;

        padding: 12px 18px;

        border: none;

        border-radius: 999px;

        background: #2f9e44;

        color: #ffffff;

        font-size: 14px;

        font-weight: 700;

        cursor: pointer;

        text-align: center;

        box-shadow: none;

        transition:
          background 0.2s ease,
          transform 0.2s ease;

      }


      .elsati-direct-request-button:hover {

        background: #27863a;

        transform:
          translateY(-1px);

      }


      /* MODAL BACKGROUND */

      .elsati-direct-modal {

        position: fixed;

        inset: 0;

        z-index: 99999;

        display: flex;

        align-items: center;

        justify-content: center;

        padding: 20px;

        background:
          rgba(15, 23, 42, 0.58);

      }


      /* MODAL */

      .elsati-direct-modal-box {

        width:
          min(600px, 100%);

        max-height: 90vh;

        overflow-y: auto;

        background: #ffffff;

        border-radius: 20px;

        padding: 28px;

        box-shadow:
          0 25px 70px
          rgba(0, 0, 0, 0.25);

      }


      .elsati-direct-modal-box h2 {

        margin-top: 0;

        color: #102033;

      }


      .elsati-direct-modal-box p {

        color: #64748b;

      }


      /* SELECTED SUPPLIER */

      .elsati-selected-supplier {

        padding: 16px;

        margin: 18px 0;

        border-radius: 12px;

        background: #f8fafc;

        border:
          1px solid #e2e8f0;

      }


      .elsati-selected-supplier strong {

        display: block;

        margin-top: 5px;

        font-size: 18px;

        color: #102033;

      }


      .elsati-verified-label {

        margin-top: 8px;

        color: #15803d;

        font-size: 13px;

        font-weight: 700;

      }


      /* FORM */

      .elsati-direct-form label {

        display: block;

        margin-bottom: 14px;

        color: #334155;

        font-weight: 700;

      }


      .elsati-direct-form input,

      .elsati-direct-form textarea {

        display: block;

        width: 100%;

        box-sizing: border-box;

        margin-top: 6px;

        padding: 12px 14px;

        border:
          1px solid #cbd5e1;

        border-radius: 9px;

        font: inherit;

        outline: none;

      }


      .elsati-direct-form input:focus,

      .elsati-direct-form textarea:focus {

        border-color: #2f9e44;

        box-shadow:
          0 0 0 2px
          rgba(47, 158, 68, 0.12);

      }


      .elsati-direct-form textarea {

        min-height: 110px;

        resize: vertical;

      }


      /* MESSAGE */

      .elsati-direct-message {

        margin-top: 10px;

        font-weight: 700;

      }


      /* ACTIONS */

      .elsati-direct-actions {

        display: flex;

        justify-content: flex-end;

        gap: 10px;

        margin-top: 20px;

      }


      .elsati-direct-actions button {

        padding: 12px 20px;

        border-radius: 999px;

        font-weight: 700;

        cursor: pointer;

      }


      /* CANCEL */

      .elsati-direct-cancel {

        background: #ffffff;

        border:
          1px solid #cbd5e1;

        color: #334155;

      }


      .elsati-direct-cancel:hover {

        background: #f8fafc;

      }


      /* GREEN SEND REQUEST BUTTON */

      .elsati-direct-submit {

        background: #2f9e44;

        color: #ffffff;

        border: none;

        min-width: 150px;

      }


      .elsati-direct-submit:hover {

        background: #27863a;

      }


      .elsati-direct-submit:disabled {

        opacity: 0.65;

        cursor: not-allowed;

      }


      /* MOBILE */

      @media (max-width: 600px) {

        .elsati-direct-modal-box {

          padding: 20px;

        }

        .elsati-direct-actions {

          flex-direction: column;

        }

        .elsati-direct-actions button {

          width: 100%;

        }

      }

    `;

    document.head.appendChild(style);
  }


  /* =====================================================
     OPEN REQUEST FORM
     ===================================================== */

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
          Send a procurement request directly
          to this verified supplier.
        </p>


        <div class="elsati-selected-supplier">

          <span>
            Requesting from:
          </span>

          <strong>
            ${escapeHtml(
              supplierName
            )}
          </strong>

          <small>
            ${escapeHtml(
              supplierCategory ||
              "General supplier"
            )}
          </small>

          <div class="elsati-verified-label">
            ✓ Verified Supplier
          </div>

        </div>


        <form
          id="elsati-direct-request-form"
          class="elsati-direct-form"
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


          <div
            class="elsati-direct-actions"
          >

            <button
              type="button"
              id="elsati-direct-cancel"
              class="elsati-direct-cancel"
            >
              Cancel
            </button>


            <button
              type="submit"
              id="elsati-direct-submit"
              class="elsati-direct-submit"
            >
              Send Request
            </button>

          </div>


        </form>

      </div>

    `;


    document.body.appendChild(
      modal
    );


    /* CANCEL */

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


    /* CLOSE WHEN CLICKING OUTSIDE */

    modal.addEventListener(
      "click",
      function (event) {

        if (
          event.target ===
          modal
        ) {

          modal.remove();

        }

      }
    );


    /* SUBMIT REQUEST */

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


          message.textContent =
            "Creating your request...";


          message.style.color =
            "#64748b";


          try {

            /* VERIFY SUPPLIER */

            const {
              data: supplier,
              error: supplierError
            } = await client
              .from("profiles")
              .select(
                "id, company_name, verified, supplier_category"
              )
              .eq(
                "id",
                supplierId
              )
              .eq(
                "role",
                "supplier"
              )
              .eq(
                "verified",
                true
              )
              .maybeSingle();


            if (
              supplierError
            ) {

              throw supplierError;

            }


            if (!supplier) {

              throw new Error(
                "This supplier is no longer available as a verified supplier."
              );

            }


            /* FORM VALUES */

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


            /* CREATE DIRECT RFQ */

            const {
              error
            } = await client
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


            /* SUCCESS */

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
              "Elsati direct supplier request error:",
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


  /* =====================================================
     ADD BUTTONS TO EXISTING SUPPLIER DIRECTORY
     ===================================================== */

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


    if (
      error ||
      !suppliers
    ) {

      console.error(
        "Unable to load verified suppliers:",
        error
      );

      return;

    }


    cards.forEach(
      function (card) {

        /*
         * Don't add the button twice.
         */

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


        /*
         * Find matching supplier.
         */

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


        /*
         * CREATE GREEN BUTTON
         */

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


  /* =====================================================
     START FEATURE
     ===================================================== */

  async function start() {

    if (
      !setupSupabase()
    ) {
      return;
    }


    const loggedIn =
      await getBusinessUser();


    if (!loggedIn) {
      return;
    }


    addStyles();


    /*
     * dashboard.js loads the supplier
     * directory separately.
     *
     * We therefore wait for it and
     * keep checking until the cards exist.
     */

    let attempts = 0;


    const checkDirectory =
      setInterval(
        async function () {

          attempts++;


          await addButtonsToDirectory();


          const directory =
            document.getElementById(
              "business-supplier-directory"
            );


          const button =
            directory
              ?.querySelector(
                ".elsati-direct-request-button"
              );


          if (
            button ||
            attempts >= 30
          ) {

            clearInterval(
              checkDirectory
            );

          }

        },
        500
      );


    /*
     * Watch the directory.
     *
     * If dashboard.js refreshes/rebuilds
     * the supplier cards, the Request a Quote
     * buttons will automatically be added again.
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


  /* =====================================================
     RUN
     ===================================================== */

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

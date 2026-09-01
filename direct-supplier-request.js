document.addEventListener("DOMContentLoaded", async function () {
  const directory = document.getElementById(
    "business-supplier-directory"
  );

  if (!directory) return;

  const client = supabase.createClient(
    window.ELSATI_SUPABASE.url,
    window.ELSATI_SUPABASE.publishableKey
  );

  const { data: userData } =
    await client.auth.getUser();

  if (!userData.user) return;

  const { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "business") {
    return;
  }

  const { data: suppliers, error } =
    await client
      .from("profiles")
      .select("*")
      .eq("role", "supplier")
      .eq("verified", true)
      .order("company_name", {
        ascending: true
      });

  if (error) {
    console.error(
      "Unable to load verified suppliers:",
      error
    );
    return;
  }

  if (!suppliers || suppliers.length === 0) {
    return;
  }

  directory.innerHTML = suppliers
    .map(function (supplier) {
      return `
        <article class="request-card">

          <strong>
            ${supplier.company_name || "Supplier"}
          </strong>

          <span>
            ${supplier.supplier_category || "General supplier"}
          </span>

          <small>
            Contact:
            ${supplier.contact_person || "Not provided"}
          </small>

          <small>
            ${supplier.city || "Not provided"}
            /
            ${supplier.country || "Zambia"}
          </small>

          <span class="supplier-status-badge">
            Verified
          </span>

          <button
            type="button"
            class="button button-primary direct-supplier-request"
            data-supplier-id="${supplier.id}"
            data-supplier-name="${supplier.company_name || "Supplier"}"
          >
            Request a Quote
          </button>

        </article>
      `;
    })
    .join("");

  directory
    .querySelectorAll(
      ".direct-supplier-request"
    )
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function () {

          const supplierId =
            button.dataset.supplierId;

          const supplierName =
            button.dataset.supplierName;

          showSupplierRequestForm(
            client,
            userData.user,
            profile,
            supplierId,
            supplierName
          );
        }
      );
    });
});


function showSupplierRequestForm(
  client,
  user,
  profile,
  supplierId,
  supplierName
) {

  const oldModal =
    document.getElementById(
      "direct-supplier-modal"
    );

  if (oldModal) {
    oldModal.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "direct-supplier-modal";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(15,23,42,0.55);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    z-index:99999;
  `;

  modal.innerHTML = `
    <div style="
      background:white;
      width:min(600px,100%);
      max-height:90vh;
      overflow:auto;
      border-radius:20px;
      padding:28px;
      box-shadow:0 25px 70px rgba(0,0,0,.25);
    ">

      <h2 style="margin-top:0;">
        Request a Quote
      </h2>

      <p>
        Send your request directly to:
      </p>

      <div style="
        padding:15px;
        background:#f8fafc;
        border-radius:12px;
        margin-bottom:20px;
      ">
        <strong>
          ${supplierName}
        </strong>

        <div style="
          color:#15803d;
          margin-top:6px;
          font-weight:700;
        ">
          ✓ Verified Supplier
        </div>
      </div>

      <form id="direct-supplier-form">

        <label style="display:block;margin-bottom:14px;">
          What do you need?
          <input
            name="title"
            required
            placeholder="e.g. Office tables"
            style="
              width:100%;
              box-sizing:border-box;
              padding:12px;
              margin-top:6px;
              border:1px solid #cbd5e1;
              border-radius:9px;
            "
          >
        </label>

        <label style="display:block;margin-bottom:14px;">
          Category
          <input
            name="category"
            placeholder="e.g. Furniture"
            style="
              width:100%;
              box-sizing:border-box;
              padding:12px;
              margin-top:6px;
              border:1px solid #cbd5e1;
              border-radius:9px;
            "
          >
        </label>

        <label style="display:block;margin-bottom:14px;">
          Quantity
          <input
            name="quantity"
            type="number"
            min="1"
            required
            placeholder="e.g. 20"
            style="
              width:100%;
              box-sizing:border-box;
              padding:12px;
              margin-top:6px;
              border:1px solid #cbd5e1;
              border-radius:9px;
            "
          >
        </label>

        <label style="display:block;margin-bottom:14px;">
          Required by
          <input
            name="deadline"
            required
            placeholder="e.g. 15 September 2026"
            style="
              width:100%;
              box-sizing:border-box;
              padding:12px;
              margin-top:6px;
              border:1px solid #cbd5e1;
              border-radius:9px;
            "
          >
        </label>

        <label style="display:block;margin-bottom:14px;">
          Delivery location
          <input
            name="delivery_location"
            placeholder="e.g. Lusaka"
            style="
              width:100%;
              box-sizing:border-box;
              padding:12px;
              margin-top:6px;
              border:1px solid #cbd5e1;
              border-radius:9px;
            "
          >
        </label>

        <label style="display:block;margin-bottom:14px;">
          Estimated budget
          <input
            name="estimated_budget"
            type="number"
            min="0"
            placeholder="Optional"
            style="
              width:100%;
              box-sizing:border-box;
              padding:12px;
              margin-top:6px;
              border:1px solid #cbd5e1;
              border-radius:9px;
            "
          >
        </label>

        <label style="display:block;margin-bottom:14px;">
          Notes / specifications
          <textarea
            name="notes"
            rows="4"
            placeholder="Add any specifications or requirements..."
            style="
              width:100%;
              box-sizing:border-box;
              padding:12px;
              margin-top:6px;
              border:1px solid #cbd5e1;
              border-radius:9px;
            "
          ></textarea>
        </label>

        <p id="direct-request-message"></p>

        <div style="
          display:flex;
          gap:10px;
          justify-content:flex-end;
        ">

          <button
            type="button"
            id="cancel-direct-request"
            class="button button-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            id="send-direct-request"
            class="button button-primary"
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
      "cancel-direct-request"
    )
    .addEventListener(
      "click",
      function () {
        modal.remove();
      }
    );

  document
    .getElementById(
      "direct-supplier-form"
    )
    .addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();

        const form =
          event.target;

        const message =
          document.getElementById(
            "direct-request-message"
          );

        const sendButton =
          document.getElementById(
            "send-direct-request"
          );

        sendButton.disabled =
          true;

        sendButton.textContent =
          "Sending...";

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

                user.id,

              business_name:

                profile.company_name ||
                profile.email,

              created_by:

                user.id,

              created_by_company:

                profile.company_name ||
                profile.email,

              status:

                "open",

              supplier_profile_id:

                supplierId
            });

        if (error) {

          console.error(
            "Direct request error:",
            error
          );

          message.textContent =
            error.message;

          message.style.color =
            "#b91c1c";

          sendButton.disabled =
            false;

          sendButton.textContent =
            "Send Request";

          return;
        }

        message.textContent =
          "Request sent successfully to " +
          supplierName +
          ".";

        message.style.color =
          "#15803d";

        sendButton.textContent =
          "Request Sent";

        setTimeout(
          function () {
            modal.remove();
          },
          1500
        );
      }
    );
}

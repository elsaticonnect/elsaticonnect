const RFQ_KEY = 'elsati_rfqs';
const QUOTE_KEY = 'elsati_quotes';

function readJson(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSession() {
  return JSON.parse(localStorage.getItem('elsati_active_session') || 'null');
}

function formatCurrency(value) {
  return `N$ ${Number(value).toLocaleString()}`;
}

function nextRfqCode(rfqs) {
  const highest = rfqs.reduce((max, rfq) => {
    const code = rfq.code || rfq.id || '';
    const match = String(code).match(/RFQ-(\d+)/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 23);
  return `RFQ-${String(highest + 1).padStart(3, '0')}`;
}

function normalizeRfq(record) {
  return {
    id: record.id,
    code: record.code || record.id,
    title: record.title,
    quantity: record.quantity,
    deadline: record.deadline,
    notes: record.notes,
    createdBy: record.created_by_company || record.createdBy,
    createdByUserId: record.created_by || record.createdByUserId,
    selectedQuoteId: record.selected_quote_id || record.selectedQuoteId || null,
    createdAt: record.created_at || record.createdAt || null
  };
}

function normalizeQuote(record) {
  return {
    id: record.id,
    rfqId: record.rfq_id || record.rfqId,
    supplier: record.supplier_company || record.supplier,
    supplierUserId: record.supplier_user_id || record.supplierUserId || null,
    price: Number(record.price),
    delivery: record.delivery,
    notes: record.notes,
    status: record.status || 'Under review',
    createdAt: record.created_at || record.createdAt || null
  };
}

async function createDataStore() {
  const supabase = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
  if (supabase) {
    try {
      const { error } = await supabase.from('rfqs').select('id').limit(1);
      if (!error) {
        return createSupabaseStore(supabase);
      }
    } catch (error) {
      console.warn('Supabase store unavailable, falling back to local demo mode.', error);
    }
  }

  return createLocalStore();
}

function createLocalStore() {
  function seedProcurementData() {
    if (!localStorage.getItem(RFQ_KEY)) {
      writeJson(RFQ_KEY, [
        {
          id: 'RFQ-024',
          code: 'RFQ-024',
          title: 'Office Furniture Supply',
          quantity: 180,
          deadline: '5 days',
          notes: 'Delivery to Lusaka office with compliance documents attached.',
          createdBy: 'Elsati Demo Buyer',
          createdByUserId: null,
          selectedQuoteId: null
        },
        {
          id: 'RFQ-031',
          code: 'RFQ-031',
          title: 'Printing Toners',
          quantity: 60,
          deadline: '2 days',
          notes: 'Black and color toner mix for monthly procurement plan.',
          createdBy: 'Elsati Demo Buyer',
          createdByUserId: null,
          selectedQuoteId: null
        }
      ]);
    }

    if (!localStorage.getItem(QUOTE_KEY)) {
      writeJson(QUOTE_KEY, [
        { id: 'Q-1', rfqId: 'RFQ-024', supplier: 'Alex Ltd', price: 240, delivery: '3 days', notes: 'Buyer-ready fulfillment', status: 'Under review' },
        { id: 'Q-2', rfqId: 'RFQ-024', supplier: 'Zambezi Enterprises', price: 255, delivery: '5 days', notes: 'Regional warehousing included', status: 'Under review' },
        { id: 'Q-3', rfqId: 'RFQ-024', supplier: 'ABC Supplies', price: 248, delivery: '4 days', notes: 'Fast replacement support', status: 'Under review' },
        { id: 'Q-4', rfqId: 'RFQ-031', supplier: 'Office Source', price: 199, delivery: '2 days', notes: 'Stock available immediately', status: 'Under review' }
      ]);
    }
  }

  seedProcurementData();

  return {
    mode: 'demo',
    async getRfqs() {
      return readJson(RFQ_KEY, []).map(normalizeRfq);
    },
    async getQuotes() {
      return readJson(QUOTE_KEY, []).map(normalizeQuote);
    },
    async createRfq(data, session) {
      const rfqs = readJson(RFQ_KEY, []);
      const id = nextRfqCode(rfqs);
      const next = {
        id,
        code: id,
        title: data.title,
        quantity: Number(data.quantity),
        deadline: data.deadline,
        notes: data.notes,
        createdBy: session?.company || 'Business',
        createdByUserId: session?.userId || null,
        selectedQuoteId: null
      };
      rfqs.unshift(next);
      writeJson(RFQ_KEY, rfqs);
      return normalizeRfq(next);
    },
    async upsertQuote(data, session, selectedRfqId) {
      const quotes = readJson(QUOTE_KEY, []);
      const existingIndex = quotes.findIndex(quote => quote.rfqId === selectedRfqId && quote.supplier === (session?.company || session?.name));
      const next = {
        id: existingIndex >= 0 ? quotes[existingIndex].id : `Q-${quotes.length + 1}`,
        rfqId: selectedRfqId,
        supplier: session?.company || session?.name || 'Supplier',
        supplierUserId: session?.userId || null,
        price: Number(data.price),
        delivery: data.delivery,
        notes: data.notes,
        status: 'Under review'
      };
      if (existingIndex >= 0) quotes[existingIndex] = next; else quotes.push(next);
      writeJson(QUOTE_KEY, quotes);
      return normalizeQuote(next);
    },
    async chooseQuote(rfqId, quoteId) {
      const rfqs = readJson(RFQ_KEY, []);
      const nextRfqs = rfqs.map(rfq => (rfq.id === rfqId || rfq.code === rfqId) ? { ...rfq, selectedQuoteId: quoteId } : rfq);
      writeJson(RFQ_KEY, nextRfqs);
      const quotes = readJson(QUOTE_KEY, []).map(quote => (quote.rfqId === rfqId || quote.rfqId === rfqId) ? { ...quote, status: quote.id === quoteId ? 'Awarded' : 'Not selected' } : quote);
      writeJson(QUOTE_KEY, quotes);
    }
  };
}

function createSupabaseStore(supabase) {
  return {
    mode: 'supabase',
    async getRfqs() {
      const { data, error } = await supabase.from('rfqs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeRfq);
    },
    async getQuotes() {
      const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeQuote);
    },
    async createRfq(data, session) {
      const currentRfqs = await this.getRfqs();
      const payload = {
        code: nextRfqCode(currentRfqs),
        title: data.title,
        quantity: Number(data.quantity),
        deadline: data.deadline,
        notes: data.notes,
        created_by: session.userId,
        created_by_company: session.company || 'Business'
      };
      const { data: inserted, error } = await supabase.from('rfqs').insert(payload).select().single();
      if (error) throw error;
      return normalizeRfq(inserted);
    },
    async upsertQuote(data, session, selectedRfqId) {
      const { data: existing } = await supabase
        .from('quotes')
        .select('*')
        .eq('rfq_id', selectedRfqId)
        .eq('supplier_user_id', session.userId)
        .maybeSingle();

      const payload = {
        rfq_id: selectedRfqId,
        supplier_user_id: session.userId,
        supplier_company: session.company || session.name || 'Supplier',
        price: Number(data.price),
        delivery: data.delivery,
        notes: data.notes,
        status: 'Under review'
      };

      let result;
      if (existing?.id) {
        result = await supabase.from('quotes').update(payload).eq('id', existing.id).select().single();
      } else {
        result = await supabase.from('quotes').insert(payload).select().single();
      }

      if (result.error) throw result.error;
      return normalizeQuote(result.data);
    },
    async chooseQuote(rfqId, quoteId) {
      const { error: rfqError } = await supabase.from('rfqs').update({ selected_quote_id: quoteId }).eq('id', rfqId);
      if (rfqError) throw rfqError;

      const allQuotes = await supabase.from('quotes').select('id').eq('rfq_id', rfqId);
      if (allQuotes.error) throw allQuotes.error;

      for (const quote of allQuotes.data || []) {
        const status = quote.id === quoteId ? 'Awarded' : 'Not selected';
        const { error } = await supabase.from('quotes').update({ status }).eq('id', quote.id);
        if (error) throw error;
      }
    }
  };
}

function buildRequestCard(rfq, selectedId) {
  const selectedClass = rfq.id === selectedId ? ' request-card-active' : '';
  return `
    <button class="request-card${selectedClass}" data-rfq-id="${rfq.id}" type="button">
      <strong>${rfq.code}</strong>
      <span>${rfq.title}</span>
      <small>${rfq.quantity} units � ${rfq.deadline}</small>
    </button>
  `;
}

async function businessDashboard(store) {
  const listNode = document.getElementById('business-rfq-list');
  if (!listNode) return;

  const form = document.getElementById('rfq-create-form');
  const feedback = document.getElementById('rfq-create-feedback');
  const comparisonTitle = document.getElementById('comparison-title');
  const comparisonTable = document.getElementById('business-comparison-table');
  const reportNode = document.getElementById('procurement-report');
  let selectedRfqId = readJson('elsati_selected_business_rfq', '');

  async function render() {
    try {
      const rfqs = await store.getRfqs();
      const quotes = await store.getQuotes();
      if (!rfqs.find(r => r.id === selectedRfqId) && rfqs[0]) selectedRfqId = rfqs[0].id;

      listNode.innerHTML = rfqs.length ? rfqs.map(rfq => buildRequestCard(rfq, selectedRfqId)).join('') : "<p class='empty-state'>No requests yet. Create your first RFQ to start sourcing.</p>";
      listNode.querySelectorAll('[data-rfq-id]').forEach(button => {
        button.addEventListener('click', () => {
          selectedRfqId = button.dataset.rfqId;
          writeJson('elsati_selected_business_rfq', selectedRfqId);
          render();
        });
      });

      const selectedRfq = rfqs.find(rfq => rfq.id === selectedRfqId);
      const selectedQuotes = quotes.filter(quote => quote.rfqId === selectedRfqId);

      if (!selectedRfq) {
        comparisonTitle.textContent = 'No RFQ selected';
        comparisonTable.innerHTML = "<p class='empty-state'>Create a request to begin collecting supplier quotations.</p>";
        reportNode.innerHTML = "<p class='empty-state'>Procurement reports will appear once supplier quotes have been received.</p>";
        return;
      }

      comparisonTitle.textContent = `${selectedRfq.code} � ${selectedRfq.title}`;

      if (!selectedQuotes.length) {
        comparisonTable.innerHTML = "<p class='empty-state'>No quotes yet. Suppliers will appear here once they respond.</p>";
        reportNode.innerHTML = `
          <div class='report-card'>
            <strong>Waiting for supplier quotes</strong>
            <p>${selectedRfq.title} is live. Share the request and compare responses when they arrive.</p>
          </div>
        `;
        return;
      }

      comparisonTable.innerHTML = `
        <div class='data-table'>
          <div class='table-head'><span>Supplier</span><span>Price</span><span>Delivery</span><span>Decision</span></div>
          ${selectedQuotes.map(quote => `
            <div class='table-row'>
              <span><strong>${quote.supplier}</strong><small>${quote.notes}</small></span>
              <span>${formatCurrency(quote.price)}</span>
              <span>${quote.delivery}</span>
              <span><button class='table-action ${selectedRfq.selectedQuoteId === quote.id ? 'selected' : ''}' data-quote-id='${quote.id}' type='button'>${selectedRfq.selectedQuoteId === quote.id ? 'Chosen' : 'Choose Quote'}</button></span>
            </div>
          `).join('')}
        </div>
      `;

      comparisonTable.querySelectorAll('[data-quote-id]').forEach(button => {
        button.addEventListener('click', async () => {
          await store.chooseQuote(selectedRfqId, button.dataset.quoteId);
          render();
        });
      });

      const prices = selectedQuotes.map(quote => Number(quote.price));
      const lowest = Math.min(...prices);
      const highest = Math.max(...prices);
      const average = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
      const chosen = selectedQuotes.find(quote => quote.id === selectedRfq.selectedQuoteId);

      reportNode.innerHTML = `
        <div class='report-card'>
          <strong>Price comparison</strong>
          <p>Lowest quote: ${formatCurrency(lowest)}</p>
          <p>Highest quote: ${formatCurrency(highest)}</p>
          <p>Average quote: ${formatCurrency(average)}</p>
        </div>
        <div class='report-card'>
          <strong>Decision support</strong>
          <p>${chosen ? `Selected supplier: ${chosen.supplier} at ${formatCurrency(chosen.price)} with delivery in ${chosen.delivery}.` : 'Choose a quote to lock in the preferred supplier and update procurement reporting.'}</p>
        </div>
      `;
    } catch (error) {
      comparisonTable.innerHTML = `<p class='empty-state'>${error.message}</p>`;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const session = getSession();
    try {
      const created = await store.createRfq(data, session);
      selectedRfqId = created.id;
      writeJson('elsati_selected_business_rfq', selectedRfqId);
      form.reset();
      feedback.textContent = `RFQ ${created.code} created successfully. Suppliers can now view and quote it.`;
      feedback.className = 'form-feedback ok';
      render();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = 'form-feedback error';
    }
  });

  await render();
}

async function supplierDashboard(store) {
  const listNode = document.getElementById('supplier-rfq-list');
  if (!listNode) return;

  const form = document.getElementById('supplier-quote-form');
  const feedback = document.getElementById('supplier-quote-feedback');
  const selectedField = document.getElementById('supplier-selected-rfq');
  const titleNode = document.getElementById('supplier-form-title');
  const quoteList = document.getElementById('supplier-quote-list');
  const statusSummary = document.getElementById('supplier-status-summary');
  const session = getSession();
  let selectedRfqId = readJson('elsati_selected_supplier_rfq', '');

  async function render() {
    try {
      const rfqs = await store.getRfqs();
      const quotes = await store.getQuotes();
      if (!rfqs.find(r => r.id === selectedRfqId) && rfqs[0]) selectedRfqId = rfqs[0].id;

      listNode.innerHTML = rfqs.length ? rfqs.map(rfq => buildRequestCard(rfq, selectedRfqId)).join('') : "<p class='empty-state'>No RFQs available yet. Buyer requests will appear here when businesses publish them.</p>";
      listNode.querySelectorAll('[data-rfq-id]').forEach(button => {
        button.addEventListener('click', () => {
          selectedRfqId = button.dataset.rfqId;
          writeJson('elsati_selected_supplier_rfq', selectedRfqId);
          render();
        });
      });

      const selectedRfq = rfqs.find(rfq => rfq.id === selectedRfqId);
      selectedField.value = selectedRfq ? `${selectedRfq.code} � ${selectedRfq.title}` : '';
      titleNode.textContent = selectedRfq ? `Submit your quote for ${selectedRfq.title}` : 'Select an RFQ to submit your quote';

      const myQuotes = quotes.filter(quote => quote.supplier === (session?.company || session?.name));
      quoteList.innerHTML = myQuotes.length ? `
        <div class='data-table'>
          <div class='table-head'><span>RFQ</span><span>Price</span><span>Delivery</span><span>Status</span></div>
          ${myQuotes.map(quote => `
            <div class='table-row'>
              <span><strong>${quote.rfqId}</strong><small>${quote.notes}</small></span>
              <span>${formatCurrency(quote.price)}</span>
              <span>${quote.delivery}</span>
              <span>${quote.status}</span>
            </div>
          `).join('')}
        </div>
      ` : "<p class='empty-state'>You have not submitted any quotes yet. Select an RFQ and send your first quotation.</p>";

      const awarded = myQuotes.filter(quote => quote.status === 'Awarded').length;
      const review = myQuotes.filter(quote => quote.status === 'Under review').length;
      const notSelected = myQuotes.filter(quote => quote.status === 'Not selected').length;
      statusSummary.innerHTML = `
        <div class='report-card'>
          <strong>Quote pipeline</strong>
          <p>${review} under review</p>
          <p>${awarded} awarded</p>
          <p>${notSelected} not selected</p>
        </div>
        <div class='report-card'>
          <strong>Current focus</strong>
          <p>${selectedRfq ? `Prepare a competitive response for ${selectedRfq.title} before the ${selectedRfq.deadline} deadline.` : 'Select an RFQ to view the latest buyer request.'}</p>
        </div>
      `;
    } catch (error) {
      quoteList.innerHTML = `<p class='empty-state'>${error.message}</p>`;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!selectedRfqId) {
      feedback.textContent = 'Choose an RFQ before submitting a quote.';
      feedback.className = 'form-feedback error';
      return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    try {
      await store.upsertQuote(data, session, selectedRfqId);
      form.reset();
      const rfqs = await store.getRfqs();
      const selectedRfq = rfqs.find(r => r.id === selectedRfqId);
      selectedField.value = selectedRfq ? `${selectedRfq.code} � ${selectedRfq.title}` : '';
      feedback.textContent = 'Quotation submitted successfully. The buyer can now compare your offer.';
      feedback.className = 'form-feedback ok';
      await render();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = 'form-feedback error';
    }
  });

  await render();
}

(async () => {
  const store = await createDataStore();
  await businessDashboard(store);
  await supplierDashboard(store);
  await renderMonitor(store);
})();

async function renderMonitor(store) {
  const businessCount = document.getElementById('monitor-business-count');
  const supplierCount = document.getElementById('monitor-supplier-count');
  const rfqCount = document.getElementById('monitor-rfq-count');
  const quoteCount = document.getElementById('monitor-quote-count');
  const businessList = document.getElementById('monitor-business-list');
  const supplierList = document.getElementById('monitor-supplier-list');
  const rfqList = document.getElementById('monitor-rfq-list');
  const quoteList = document.getElementById('monitor-quote-list');

  if (!businessCount || !supplierCount || !rfqCount || !quoteCount || !businessList || !supplierList || !rfqList || !quoteList) return;

  const businessUsers = JSON.parse(localStorage.getItem('elsati_business_users') || '[]');
  const supplierUsers = JSON.parse(localStorage.getItem('elsati_supplier_users') || '[]');
  const rfqs = await store.getRfqs();
  const quotes = await store.getQuotes();

  businessCount.textContent = businessUsers.length;
  supplierCount.textContent = supplierUsers.length;
  rfqCount.textContent = rfqs.length;
  quoteCount.textContent = quotes.length;

  businessList.innerHTML = businessUsers.length
    ? businessUsers.slice().reverse().map(user => `<div class='monitor-row'><strong>${user.company || user.name}</strong><span>${user.email}</span></div>`).join('')
    : "<p class='empty-state'>No business accounts registered yet.</p>";

  supplierList.innerHTML = supplierUsers.length
    ? supplierUsers.slice().reverse().map(user => `<div class='monitor-row'><strong>${user.company || user.name}</strong><span>${user.email}</span></div>`).join('')
    : "<p class='empty-state'>No supplier accounts registered yet.</p>";

  rfqList.innerHTML = rfqs.length
    ? rfqs.map(rfq => `<div class='monitor-row'><strong>${rfq.code} � ${rfq.title}</strong><span>${rfq.quantity} units � ${rfq.deadline}</span></div>`).join('')
    : "<p class='empty-state'>No buyer RFQs are active yet.</p>";

  quoteList.innerHTML = quotes.length
    ? quotes.map(quote => `<div class='monitor-row'><strong>${quote.supplier}</strong><span>${quote.rfqId} � ${formatCurrency(quote.price)} � ${quote.status}</span></div>`).join('')
    : "<p class='empty-state'>No supplier quotations have been submitted yet.</p>";
}

